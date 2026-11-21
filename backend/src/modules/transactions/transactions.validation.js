import { z } from 'zod';

// Paramètres de requête arrivent en chaîne : regex + transform plutôt que
// z.coerce (comportement explicite, compatible zod v4).
const intQuery = (fallback) =>
  z
    .string()
    .regex(/^\d+$/, 'Entier positif attendu')
    .default(fallback)
    .transform(Number);

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Date ISO attendue',
}).transform((v) => new Date(v));

const TRANSACTION_TYPES = ['TOPUP', 'MEAL_PAYMENT', 'WITHDRAWAL', 'REVERSAL', 'ADJUSTMENT'];
const TRANSACTION_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];

export const listTransactionsSchema = z.object({
  query: z
    .object({
      page: intQuery('1'),
      pageSize: intQuery('20').refine((n) => n <= 100, 'pageSize max 100'),
      type: z.enum(TRANSACTION_TYPES).optional(),
      status: z.enum(TRANSACTION_STATUSES).optional(),
      studentId: z.string().min(1).optional(), // id de StudentProfile
      from: isoDate.optional(),
      to: isoDate.optional(),
    })
    .strict(),
});

export const transactionIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }).strict(),
});

export const adjustmentSchema = z.object({
  body: z
    .object({
      studentId: z.string().min(1), // id de StudentProfile
      amount: z.number().int().positive().max(10_000_000),
      direction: z.enum(['CREDIT', 'DEBIT']),
      reason: z.string().trim().min(3).max(500), // correction documentée (§8.5)
    })
    .strict(),
});

export const reversalSchema = z.object({
  params: z.object({ id: z.string().min(1) }).strict(),
  body: z
    .object({
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
});
