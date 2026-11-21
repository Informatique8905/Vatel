import { z } from 'zod';
import { utcDate } from '../../utils/dates.js';

// Date 'YYYY-MM-DD' -> Date UTC minuit (champs @db.Date).
const dayDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue YYYY-MM-DD')
  .transform(utcDate);

const id = z.string().min(1);

// --- Plats génériques (spec §4 : nom, description, photo, ingrédients, allergènes) ---
export const dishCreateSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(1000).optional(),
      photoUrl: z.string().url().max(500).optional(),
      ingredients: z.string().trim().max(2000).optional(),
      crossContaminationNote: z.string().trim().max(500).optional(),
      allergenIds: z.array(id).max(30).optional(),
      allergenInfoVerified: z.boolean().optional(),
    })
    .strict(),
});

export const dishUpdateSchema = z.object({
  params: z.object({ id }).strict(),
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      photoUrl: z.string().url().max(500).nullable().optional(),
      ingredients: z.string().trim().max(2000).nullable().optional(),
      crossContaminationNote: z.string().trim().max(500).nullable().optional(),
      allergenIds: z.array(id).max(30).optional(),
      allergenInfoVerified: z.boolean().optional(),
    })
    .strict(),
});

export const dishIdSchema = z.object({
  params: z.object({ id }).strict(),
});

// --- Offres datées : prix/quantité propres, distinctes du plat (spec §4) ---
export const menuItemCreateSchema = z.object({
  body: z
    .object({
      dishId: id,
      date: dayDate,
      price: z.number().int().positive().max(1_000_000),
      quantity: z.number().int().positive().max(100_000),
      maxPerStudent: z.number().int().min(1).max(10).default(1),
      reservationDeadline: z.string().datetime().optional(), // surcharge À CONFIRMER (§19)
    })
    .strict(),
});

export const menuItemUpdateSchema = z.object({
  params: z.object({ id }).strict(),
  body: z
    .object({
      price: z.number().int().positive().max(1_000_000).optional(),
      quantity: z.number().int().positive().max(100_000).optional(),
      maxPerStudent: z.number().int().min(1).max(10).optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
      reservationDeadline: z.string().datetime().nullable().optional(),
    })
    .strict(),
});

export const menuItemIdSchema = z.object({
  params: z.object({ id }).strict(),
});

export const menuListSchema = z.object({
  query: z
    .object({
      date: dayDate.optional(),
      dishId: id.optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
    })
    .strict(),
});

// --- Créneaux configurables (spec §5 : capacité paramétrable, jamais en dur) ---
// label requis ; date unique OU dates[] (duplication de l'horaire sur N jours).
export const slotCreateSchema = z.object({
  body: z
    .object({
      label: z.string().trim().min(1).max(80),
      date: dayDate.optional(),
      dates: z.array(dayDate).min(1).max(31).optional(),
      startMinutes: z.number().int().min(0).max(1439),
      endMinutes: z.number().int().min(1).max(1440),
      capacity: z.number().int().positive().max(100_000),
      isOpen: z.boolean().optional(),
    })
    .strict()
    .refine((d) => d.endMinutes > d.startMinutes, {
      message: 'endMinutes doit être > startMinutes',
      path: ['endMinutes'],
    })
    .refine((d) => (d.date ? 1 : 0) + (d.dates ? 1 : 0) === 1, {
      message: 'Fournir "date" ou "dates" (pas les deux)',
      path: ['date'],
    }),
});

// force : décision explicite de l'admin pour passer outre les gardes
// (capacité < réservations existantes, horaires modifiés sur créneau utilisé).
export const slotUpdateSchema = z.object({
  params: z.object({ id }).strict(),
  body: z
    .object({
      label: z.string().trim().min(1).max(80).optional(),
      startMinutes: z.number().int().min(0).max(1439).optional(),
      endMinutes: z.number().int().min(1).max(1440).optional(),
      capacity: z.number().int().positive().max(100_000).optional(),
      isOpen: z.boolean().optional(),
      force: z.boolean().optional(),
    })
    .strict(),
});

export const slotIdSchema = z.object({
  params: z.object({ id }).strict(),
});

export const slotListSchema = z.object({
  query: z
    .object({
      date: dayDate.optional(),
      isOpen: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    })
    .strict(),
});
