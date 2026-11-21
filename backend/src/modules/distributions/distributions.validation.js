import { z } from 'zod';
import { utcDate } from '../../utils/dates.js';

export const scanSchema = z.object({
  body: z
    .object({
      token: z.string().min(20).max(200), // contenu du QR : jeton opaque (§6)
    })
    .strict(),
});

export const manualSchema = z.object({
  body: z
    .object({
      reservationId: z.string().min(1),
    })
    .strict(),
});

export const listSchema = z.object({
  query: z
    .object({
      timeSlotId: z.string().min(1).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue YYYY-MM-DD')
        .transform(utcDate)
        .optional(),
    })
    .strict()
    .refine((q) => q.timeSlotId || q.date, { message: 'timeSlotId ou date requis' }),
});
