import { z } from 'zod';
import { utcDate } from '../../utils/dates.js';

const intQuery = (fallback) =>
  z
    .string()
    .regex(/^\d+$/, 'Entier positif attendu')
    .default(fallback)
    .transform(Number);

const dayDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue YYYY-MM-DD')
  .transform(utcDate);

export const createReservationSchema = z.object({
  body: z
    .object({
      menuItemId: z.string().min(1),
      timeSlotId: z.string().min(1),
      // Clé idempotente envoyée par le client : une répétition réseau ou un
      // double clic ne produit pas une seconde réservation (spec §9).
      idempotencyKey: z.string().min(8).max(120).optional(),
    })
    .strict(),
});

export const listReservationsSchema = z.object({
  query: z
    .object({
      page: intQuery('1'),
      pageSize: intQuery('20').refine((n) => n <= 100, 'pageSize max 100'),
      studentId: z.string().min(1).optional(),
      menuItemId: z.string().min(1).optional(),
      timeSlotId: z.string().min(1).optional(),
      date: dayDate.optional(),
      status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COLLECTED', 'NOT_COLLECTED']).optional(),
    })
    .strict(),
});

export const reservationIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }).strict(),
});
