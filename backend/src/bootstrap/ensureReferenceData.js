import { prisma } from '../database/prisma.js';

// Référentiels allergènes / restrictions (codes stables) : nécessaires aux
// formulaires admin et élève, y compris en production où le seed ne tourne pas.
// Idempotent ; ne réécrit jamais un libellé existant.
const ALLERGENS = [
  ['gluten', 'Gluten'], ['peanut', 'Arachide'], ['lactose', 'Lactose'],
  ['egg', 'Œuf'], ['fish', 'Poisson'], ['soy', 'Soja'],
  ['nuts', 'Fruits à coque'], ['shellfish', 'Crustacés'], ['sesame', 'Sésame'],
];

const RESTRICTIONS = [
  ['vegetarian', 'Végétarien'], ['halal', 'Halal'], ['no_pork', 'Sans porc'],
];

export const ensureReferenceData = async () => {
  await prisma.allergen.createMany({
    data: ALLERGENS.map(([code, name]) => ({ code, name })),
    skipDuplicates: true,
  });
  await prisma.dietaryRestriction.createMany({
    data: RESTRICTIONS.map(([code, name]) => ({ code, name })),
    skipDuplicates: true,
  });
};
