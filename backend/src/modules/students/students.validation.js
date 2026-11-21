import { z } from 'zod';

export const updateDietarySchema = z.object({
  body: z
    .object({
      // Codes du référentiel OU noms libres (allergènes personnalisés §7).
      allergens: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
      // Codes du référentiel DietaryRestriction uniquement.
      restrictions: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    })
    .strict(),
});
