// Seed de démonstration — données CLAIREMENT FICTIVES (spec §20).
// Jamais de vraies données, jamais de secrets réels.
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'VatelDemo2026!'; // mot de passe de démo, documenté dans README

const main = async () => {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  // Compte cantine interne (singleton)
  await prisma.canteenAccount.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  // Admin créé côté serveur uniquement — jamais via l'API (spec §12.2)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cantine-vatel.demo' },
    update: {},
    create: {
      email: 'admin@cantine-vatel.demo',
      passwordHash, role: 'ADMIN',
      firstName: 'Admin', lastName: 'Cantine', emailVerifiedAt: new Date(),
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'aya.konan@exemple.ci' },
    update: {},
    create: {
      email: 'aya.konan@exemple.ci',
      passwordHash, role: 'STUDENT',
      firstName: 'Aya', lastName: 'Konan', emailVerifiedAt: new Date(),
      studentProfile: { create: { kind: 'STUDENT', grade: 'Terminale A', wallet: { create: { balance: 2500 } } } },
    },
    include: { studentProfile: { include: { wallet: true } } },
  });

  const parent = await prisma.user.upsert({
    where: { email: 'mme.konan@exemple.ci' },
    update: {},
    create: {
      email: 'mme.konan@exemple.ci',
      passwordHash, role: 'PARENT',
      firstName: 'Marie', lastName: 'Konan', emailVerifiedAt: new Date(),
    },
  });

  // Lien parent → enfant (données fictives)
  await prisma.parentStudent.upsert({
    where: {
      parentId_studentId: {
        parentId: parent.id,
        studentId: student.studentProfile.id,
      },
    },
    update: {},
    create: { parentId: parent.id, studentId: student.studentProfile.id },
  });

  // Référentiel d'allergènes courants (codes stables, noms affichables)
  const allergens = [
    ['gluten', 'Gluten'], ['peanut', 'Arachide'], ['lactose', 'Lactose'],
    ['egg', 'Œuf'], ['fish', 'Poisson'], ['soy', 'Soja'],
    ['nuts', 'Fruits à coque'], ['shellfish', 'Crustacés'], ['sesame', 'Sésame'],
  ];
  for (const [code, name] of allergens) {
    await prisma.allergen.upsert({ where: { code }, update: {}, create: { code, name } });
  }

  const restrictions = [
    ['vegetarian', 'Végétarien'], ['halal', 'Halal'], ['no_pork', 'Sans porc'],
  ];
  for (const [code, name] of restrictions) {
    await prisma.dietaryRestriction.upsert({ where: { code }, update: {}, create: { code, name } });
  }

  // --- Démo menus/réservations : plat + offre du jour + créneaux (§18) ---
  const allergenByCode = Object.fromEntries(
    (await prisma.allergen.findMany()).map((a) => [a.code, a]),
  );

  // Aya est allergique à l'arachide : permet de démontrer le blocage (§7).
  await prisma.studentAllergen.upsert({
    where: {
      studentId_allergenId: {
        studentId: student.studentProfile.id,
        allergenId: allergenByCode.peanut.id,
      },
    },
    update: {},
    create: { studentId: student.studentProfile.id, allergenId: allergenByCode.peanut.id },
  });

  const dishFish = await prisma.dish.upsert({
    where: { id: 'seed-dish-attieke-poisson' },
    update: {},
    create: {
      id: 'seed-dish-attieke-poisson',
      name: 'Attiéké poisson braisé',
      description: 'Attiéké, poisson braisé, sauce tomate et oignons.',
      ingredients: 'Attiéké, poisson capitaine, tomate, oignon, huile, épices',
      allergenInfoVerified: true,
      allergens: { create: [{ allergenId: allergenByCode.fish.id }] },
    },
  });

  const dishPeanut = await prisma.dish.upsert({
    where: { id: 'seed-dish-sauce-arachide' },
    update: {},
    create: {
      id: 'seed-dish-sauce-arachide',
      name: 'Riz sauce arachide',
      description: 'Riz blanc, sauce arachide, viande de bœuf.',
      ingredients: 'Riz, pâte d\u2019arachide, bœuf, tomate, oignon',
      crossContaminationNote: 'Traces possibles d\u2019arachide en cuisine',
      allergenInfoVerified: true,
      allergens: { create: [{ allergenId: allergenByCode.peanut.id }] },
    },
  });

  const today = new Date();
  const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  await prisma.menuItem.upsert({
    where: { dishId_date: { dishId: dishFish.id, date: day } },
    update: {},
    create: { dishId: dishFish.id, date: day, price: 500, quantity: 30, status: 'PUBLISHED' },
  });
  await prisma.menuItem.upsert({
    where: { dishId_date: { dishId: dishPeanut.id, date: day } },
    update: {},
    create: { dishId: dishPeanut.id, date: day, price: 400, quantity: 10, status: 'PUBLISHED' },
  });

  // Trois créneaux l'après-midi : compatibles avec le cutoff provisoire de
  // 120 min (À CONFIRMER §19) pour les réservations du matin même.
  for (const start of [840, 870, 900]) {
    await prisma.timeSlot.upsert({
      where: { date_startMinutes: { date: day, startMinutes: start } },
      update: {},
      create: { date: day, startMinutes: start, endMinutes: start + 30, capacity: 20 },
    });
  }

  console.log('Seed OK — comptes démo (mot de passe :', DEMO_PASSWORD, ') :');
  console.log('  admin@cantine-vatel.demo (ADMIN)');
  console.log('  aya.konan@exemple.ci   (STUDENT, solde 2500 XOF)');
  console.log('  mme.konan@exemple.ci   (PARENT, liée à Aya)');
};

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
