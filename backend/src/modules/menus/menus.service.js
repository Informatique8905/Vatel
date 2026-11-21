import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';
import * as cloudinary from '../integrations/cloudinary/cloudinary.service.js';

// ---------------------------------------------------------------------------
// Menus, plats et créneaux (spec §4, §5).
// - Dish : plat générique (ingrédients, allergènes déclarés).
// - MenuItem : offre datée avec prix/quantité propres — jamais de suppression
//   physique, archivage uniquement (§4).
// - TimeSlot : créneau de retrait à capacité paramétrable (§5).
// Lecture élève : uniquement les offres PUBLISHED et créneaux ouverts, avec
// drapeau allergène calculé sur son profil déclaré (§7).
// ---------------------------------------------------------------------------

const dishInclude = { allergens: { include: { allergen: true } } };

const publicDish = (d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  photoUrl: d.photoUrl,
  ingredients: d.ingredients,
  crossContaminationNote: d.crossContaminationNote,
  allergenInfoVerified: d.allergenInfoVerified, // false = infos non confirmées (§7)
  allergens: d.allergens.map((da) => ({ id: da.allergen.id, code: da.allergen.code, name: da.allergen.name })),
  archived: Boolean(d.archivedAt),
  createdAt: d.createdAt,
});

const publicMenuItem = (item, { studentAllergenIds } = {}) => {
  const dishAllergens = item.dish.allergens.map((da) => ({
    id: da.allergen.id,
    code: da.allergen.code,
    name: da.allergen.name,
  }));
  // Correspondance déterministe déclarés vs profil élève (§7) : jamais
  // d'affirmation de compatibilité si les infos ne sont pas vérifiées.
  const matchedAllergens = studentAllergenIds
    ? dishAllergens.filter((a) => studentAllergenIds.has(a.id))
    : [];
  return {
    id: item.id,
    date: item.date,
    price: item.price,
    currency: 'XOF',
    quantity: item.quantity,
    remaining: Math.max(0, item.quantity - item.reservedCount),
    maxPerStudent: item.maxPerStudent,
    status: item.status,
    reservationDeadline: item.reservationDeadline,
    dish: publicDish(item.dish),
    ...(studentAllergenIds && {
      allergenAlert: matchedAllergens.length > 0,
      matchedAllergens,
    }),
  };
};

const publicSlot = (s) => ({
  id: s.id,
  label: s.label,
  date: s.date,
  startMinutes: s.startMinutes,
  endMinutes: s.endMinutes,
  capacity: s.capacity,
  reservedCount: s.reservedCount,
  remaining: Math.max(0, s.capacity - s.reservedCount),
  isOpen: s.isOpen,
  status: s.isOpen ? 'active' : 'inactive',
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

// --- Plats (admin) ---

const replaceAllergens = async (tx, dishId, allergenIds) => {
  if (!allergenIds) return;
  const count = await tx.allergen.count({ where: { id: { in: allergenIds } } });
  if (count !== allergenIds.length) {
    throw new ApiError(400, 'BAD_ALLERGENS', 'Un ou plusieurs allergènes sont inconnus');
  }
  await tx.dishAllergen.deleteMany({ where: { dishId } });
  await tx.dishAllergen.createMany({
    data: allergenIds.map((allergenId) => ({ dishId, allergenId })),
  });
};

export const createDish = async ({ allergenIds, ...data }) => {
  const dish = await prisma.$transaction(async (tx) => {
    const created = await tx.dish.create({ data });
    await replaceAllergens(tx, created.id, allergenIds);
    return tx.dish.findUniqueOrThrow({ where: { id: created.id }, include: dishInclude });
  });
  return { dish: publicDish(dish) };
};

// Référentiel d'allergènes : partagé admin (fiches plats) et élèves.
export const listAllergens = async () => ({
  allergens: (await prisma.allergen.findMany({ orderBy: { name: 'asc' } }))
    .map((a) => ({ id: a.id, code: a.code, name: a.name })),
});

export const listDishes = async ({ includeArchived = false } = {}) => {
  const dishes = await prisma.dish.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { name: 'asc' },
    include: dishInclude,
  });
  return { dishes: dishes.map(publicDish) };
};

export const updateDish = async (id, { allergenIds, ...data }) => {
  const exists = await prisma.dish.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Plat introuvable');
  const dish = await prisma.$transaction(async (tx) => {
    await tx.dish.update({ where: { id }, data });
    await replaceAllergens(tx, id, allergenIds);
    return tx.dish.findUniqueOrThrow({ where: { id }, include: dishInclude });
  });
  return { dish: publicDish(dish) };
};

// Archivage plutôt que suppression (spec §4) : l'historique reste consultable.
export const archiveDish = async (id) => {
  const exists = await prisma.dish.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Plat introuvable');
  await prisma.dish.update({ where: { id }, data: { archivedAt: new Date() } });
  return { archived: true };
};

// --- Offres datées ---

// Allergènes déclarés de l'élève connecté (pour le drapeau d'alerte §7).
const studentAllergenIds = async (user) => {
  if (user.role !== 'STUDENT' || !user.studentProfile?.id) return null;
  const rows = await prisma.studentAllergen.findMany({
    where: { studentId: user.studentProfile.id },
    select: { allergenId: true },
  });
  return new Set(rows.map((r) => r.allergenId));
};

export const listMenuItems = async (user, { date, dishId, status }) => {
  const where = {
    ...(date && { date }),
    ...(dishId && { dishId }),
    // Élèves/parents : seules les offres publiées sont visibles (§4).
    ...(user.role === 'ADMIN' ? (status && { status }) : { status: 'PUBLISHED' }),
  };
  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ date: 'asc' }],
    include: { dish: { include: dishInclude } },
  });
  const allergenIds = await studentAllergenIds(user);
  return { items: items.map((i) => publicMenuItem(i, { studentAllergenIds: allergenIds })) };
};

export const getMenuItem = async (user, id) => {
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { dish: { include: dishInclude } },
  });
  if (!item || (user.role !== 'ADMIN' && item.status !== 'PUBLISHED')) {
    throw new ApiError(404, 'NOT_FOUND', 'Offre introuvable');
  }
  const allergenIds = await studentAllergenIds(user);
  return { item: publicMenuItem(item, { studentAllergenIds: allergenIds }) };
};

export const createMenuItem = async (data) => {
  const dish = await prisma.dish.findUnique({ where: { id: data.dishId }, select: { id: true, archivedAt: true } });
  if (!dish || dish.archivedAt) throw new ApiError(404, 'NOT_FOUND', 'Plat introuvable ou archivé');
  const item = await prisma.menuItem.create({
    data,
    include: { dish: { include: dishInclude } },
  });
  return { item: publicMenuItem(item) };
};

export const updateMenuItem = async (id, data) => {
  const exists = await prisma.menuItem.findUnique({
    where: { id },
    select: { id: true, reservedCount: true },
  });
  if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Offre introuvable');
  // Une quantité ne peut pas passer sous les réservations déjà confirmées.
  if (data.quantity !== undefined && data.quantity < exists.reservedCount) {
    throw new ApiError(409, 'QUANTITY_BELOW_RESERVED', `Quantité inférieure aux ${exists.reservedCount} réservations existantes`);
  }
  const item = await prisma.menuItem.update({
    where: { id },
    data,
    include: { dish: { include: dishInclude } },
  });
  return { item: publicMenuItem(item) };
};

// --- Créneaux ---

export const listSlots = async (user, { date, isOpen }) => {
  const slots = await prisma.timeSlot.findMany({
    where: {
      ...(date && { date }),
      // Non-admin : uniquement les créneaux ouverts.
      ...(user.role === 'ADMIN' ? (isOpen !== undefined && { isOpen }) : { isOpen: true }),
    },
    orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
  });
  return { slots: slots.map(publicSlot) };
};

export const getSlot = async (user, id) => {
  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  // Un créneau fermé est invisible côté élève (anti-énumération).
  if (!slot || (user.role !== 'ADMIN' && !slot.isOpen)) {
    throw new ApiError(404, 'NOT_FOUND', 'Créneau introuvable');
  }
  return { slot: publicSlot(slot) };
};

// Création simple (date) ou en série (dates[] — même horaire/capacité/libellé
// dupliqués ; skipDuplicates sur @@unique([date, startMinutes])).
export const createSlot = async ({ date, dates, ...data }) => {
  const days = dates ?? [date];
  const { count } = await prisma.timeSlot.createMany({
    data: days.map((d) => ({ ...data, date: d })),
    skipDuplicates: true,
  });
  const slots = await prisma.timeSlot.findMany({
    where: { date: { in: days }, startMinutes: data.startMinutes },
    orderBy: { date: 'asc' },
  });
  return { slots: slots.map(publicSlot), created: count, skipped: days.length - count };
};

// Gardes sur un créneau déjà utilisé (spec §5) :
// - horaires modifiés avec des réservations -> 409 sauf force explicite ;
// - capacité < réservations confirmées -> 409 sauf force (aucune annulation
//   automatique : le créneau devient simplement complet).
export const updateSlot = async (id, { force = false, ...data }) => {
  const slot = await prisma.timeSlot.findUnique({ where: { id } });
  if (!slot) throw new ApiError(404, 'NOT_FOUND', 'Créneau introuvable');

  const nextStart = data.startMinutes ?? slot.startMinutes;
  const nextEnd = data.endMinutes ?? slot.endMinutes;
  if (nextEnd <= nextStart) {
    throw new ApiError(422, 'BAD_HOURS', 'endMinutes doit être > startMinutes');
  }
  const timesChanged = nextStart !== slot.startMinutes || nextEnd !== slot.endMinutes;
  if (timesChanged && slot.reservedCount > 0 && !force) {
    throw new ApiError(409, 'SLOT_HAS_RESERVATIONS',
      `Modification des horaires refusée : ${slot.reservedCount} réservation(s) existante(s)`,
      { reservedCount: slot.reservedCount, requiresForce: true });
  }
  if (data.capacity !== undefined && data.capacity < slot.reservedCount && !force) {
    throw new ApiError(409, 'CAPACITY_BELOW_RESERVED',
      `Capacité ${data.capacity} inférieure aux ${slot.reservedCount} réservations existantes`,
      { reservedCount: slot.reservedCount, requestedCapacity: data.capacity, requiresForce: true });
  }

  try {
    const updated = await prisma.timeSlot.update({ where: { id }, data });
    return { slot: publicSlot(updated) };
  } catch (err) {
    if (err?.code === 'P2002') {
      throw new ApiError(409, 'SLOT_CONFLICT', 'Un créneau existe déjà à cette date et cette heure de début');
    }
    throw err;
  }
};

export const setSlotOpen = async (id, isOpen) => {
  const exists = await prisma.timeSlot.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Créneau introuvable');
  const slot = await prisma.timeSlot.update({ where: { id }, data: { isOpen } });
  return { slot: publicSlot(slot) };
};

// Suppression réelle autorisée seulement sans AUCUNE réservation (même annulée
// = historique à conserver, spec §4/§5) ; sinon désactivation.
export const deleteSlot = async (id) => {
  const slot = await prisma.timeSlot.findUnique({
    where: { id },
    select: { id: true, _count: { select: { reservations: true } } },
  });
  if (!slot) throw new ApiError(404, 'NOT_FOUND', 'Créneau introuvable');
  if (slot._count.reservations > 0) {
    throw new ApiError(409, 'SLOT_HAS_RESERVATIONS',
      `Suppression impossible : ${slot._count.reservations} réservation(s) rattachée(s) — désactiver le créneau à la place`,
      { reservations: slot._count.reservations });
  }
  await prisma.timeSlot.delete({ where: { id } });
};

// --- Image du plat (Cloudinary) ---------------------------------------------
// PostgreSQL et Cloudinary ne forment pas une transaction : on ordonne les
// étapes pour ne jamais perdre l'image existante ni laisser d'orphelin.
// Remplacement : upload nouvelle -> update DB -> suppression de l'ancienne
// (best-effort, après confirmation en base).

export const setDishImage = async (id, file) => {
  if (!file?.buffer?.length) {
    throw new ApiError(400, 'IMAGE_REQUIRED', 'Fichier image requis (champ "image")');
  }
  const realType = cloudinary.sniffImageType(file.buffer);
  if (!realType) {
    throw new ApiError(415, 'BAD_IMAGE_TYPE', 'Le fichier n’est pas une image JPEG, PNG ou WebP valide');
  }
  const dish = await prisma.dish.findUnique({
    where: { id },
    select: { id: true, archivedAt: true, photoPublicId: true },
  });
  if (!dish || dish.archivedAt) throw new ApiError(404, 'NOT_FOUND', 'Plat introuvable ou archivé');

  const uploaded = await cloudinary.uploadImage(file.buffer);
  let updated;
  try {
    updated = await prisma.dish.update({
      where: { id },
      data: uploaded,
      include: dishInclude,
    });
  } catch (err) {
    // La base a refusé : la nouvelle image ne doit pas rester orpheline.
    await cloudinary.destroyImage(uploaded.photoPublicId);
    throw err;
  }
  // L'ancienne image est remplacée : suppression Cloudinary après succès DB.
  if (dish.photoPublicId) await cloudinary.destroyImage(dish.photoPublicId);
  return { dish: publicDish(updated) };
};

export const removeDishImage = async (id) => {
  const dish = await prisma.dish.findUnique({
    where: { id },
    select: { id: true, photoPublicId: true },
  });
  if (!dish) throw new ApiError(404, 'NOT_FOUND', 'Plat introuvable');
  const oldPublicId = dish.photoPublicId;
  const updated = await prisma.dish.update({
    where: { id },
    data: { photoUrl: null, photoPublicId: null },
    include: dishInclude,
  });
  await cloudinary.destroyImage(oldPublicId);
  return { dish: publicDish(updated) };
};
