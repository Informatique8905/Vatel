import { prisma } from '../../database/prisma.js';
import { ApiError } from '../../utils/errors.js';

// ---------------------------------------------------------------------------
// Profil élève + déclarations alimentaires (spec §7).
// Les allergènes déclarés bloquent la réservation côté serveur
// (reservations.service.js) ; les restrictions n'affichent qu'un avertissement.
// Un nom inconnu du référentiel devient un allergène « custom-* » : il doit
// pouvoir bloquer comme les autres (l'élève le déclare réellement).
// ---------------------------------------------------------------------------

const slug = (name) =>
  `custom-${name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)}`;

const profileOf = async (user) => {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
  });
  if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Profil élève introuvable');
  return profile;
};

export const getMe = async (user) => {
  const profile = await profileOf(user);
  const [allergens, restrictions, declaredA, declaredR] = await Promise.all([
    prisma.allergen.findMany({ orderBy: { name: 'asc' } }),
    prisma.dietaryRestriction.findMany({ orderBy: { name: 'asc' } }),
    prisma.studentAllergen.findMany({ where: { studentId: profile.id }, select: { allergenId: true } }),
    prisma.studentRestriction.findMany({ where: { studentId: profile.id }, select: { restrictionId: true } }),
  ]);
  const setA = new Set(declaredA.map((d) => d.allergenId));
  const setR = new Set(declaredR.map((d) => d.restrictionId));
  return {
    profile: {
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      email: profile.user.email,
      phone: profile.user.phone,
      kind: profile.kind,
      level: profile.level,
      grade: profile.grade,
      matricule: profile.matricule,
    },
    allergens: allergens.map((a) => ({
      id: a.id, code: a.code, name: a.name,
      declared: setA.has(a.id),
      custom: a.code.startsWith('custom-'),
    })),
    restrictions: restrictions.map((r) => ({
      id: r.id, code: r.code, name: r.name, declared: setR.has(r.id),
    })),
  };
};

// Remplace l'ensemble des déclarations (sémantique PUT : état final envoyé).
// `allergens` = codes connus OU noms libres (créés en allergène custom).
// `restrictions` = codes connus uniquement (référentiel fermé).
export const updateDietary = async (user, { allergens, restrictions }) => {
  const profile = await profileOf(user);

  const [knownAllergens, knownRestrictions] = await Promise.all([
    prisma.allergen.findMany(),
    prisma.dietaryRestriction.findMany(),
  ]);

  // Résolution : code exact > nom insensible à la casse > création custom.
  const byCode = new Map(knownAllergens.map((a) => [a.code, a]));
  const byName = new Map(knownAllergens.map((a) => [a.name.toLowerCase(), a]));
  const wantedAllergenIds = [];
  for (const entry of allergens) {
    const v = entry.trim();
    const found = byCode.get(v) ?? byName.get(v.toLowerCase());
    if (found) { wantedAllergenIds.push(found.id); continue; }
    const code = slug(v);
    if (byCode.has(code)) { wantedAllergenIds.push(byCode.get(code).id); continue; }
    const created = await prisma.allergen.upsert({
      where: { code },
      update: {},
      create: { code, name: v.slice(0, 60) },
    });
    wantedAllergenIds.push(created.id);
  }

  const restrictionIds = [];
  const restByCode = new Map(knownRestrictions.map((r) => [r.code, r]));
  for (const code of restrictions) {
    const found = restByCode.get(code);
    if (!found) throw new ApiError(400, 'UNKNOWN_RESTRICTION', `Restriction inconnue : ${code}`);
    restrictionIds.push(found.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.studentAllergen.deleteMany({ where: { studentId: profile.id } });
    await tx.studentAllergen.createMany({
      data: wantedAllergenIds.map((allergenId) => ({ studentId: profile.id, allergenId })),
    });
    await tx.studentRestriction.deleteMany({ where: { studentId: profile.id } });
    await tx.studentRestriction.createMany({
      data: restrictionIds.map((restrictionId) => ({ studentId: profile.id, restrictionId })),
    });
    // Retire les allergènes custom devenus orphelins (plus déclarés nulle part).
    await tx.allergen.deleteMany({
      where: { code: { startsWith: 'custom-' }, students: { none: {} }, dishes: { none: {} } },
    });
  });

  return getMe(user);
};
