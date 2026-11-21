import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';

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
  date: s.date,
  startMinutes: s.startMinutes,
  endMinutes: s.endMinutes,
  capacity: s.capacity,
  remaining: Math.max(0, s.capacity - s.reservedCount),
  isOpen: s.isOpen,
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

export const createSlot = async (data) => {
  const slot = await prisma.timeSlot.create({ data });
  return { slot: publicSlot(slot) };
};

export const updateSlot = async (id, data) => {
  const exists = await prisma.timeSlot.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, 'NOT_FOUND', 'Créneau introuvable');
  const slot = await prisma.timeSlot.update({ where: { id }, data });
  return { slot: publicSlot(slot) };
};
