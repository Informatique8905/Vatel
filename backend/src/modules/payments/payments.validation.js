import { z } from 'zod';

const intQuery = (fallback) =>
  z
    .string()
    .regex(/^\d+$/, 'Entier positif attendu')
    .default(fallback)
    .transform(Number);

const OPERATORS = ['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'DJAMO'];

// Recharge parent -> portefeuille élève (spec §8.2).
// Montant en XOF entier ; minimum Jeko = 100 centimes = 1 XOF, on exige 100 F.
export const createTopupSchema = z.object({
  body: z
    .object({
      studentId: z.string().min(1).max(64),
      amount: z.number().int('Montant entier XOF requis').min(100).max(5_000_000),
      operator: z.enum(OPERATORS),
      idempotencyKey: z.string().min(8).max(100).optional(),
    })
    .strict(),
});

export const paymentIdSchema = z.object({
  params: z.object({ id: z.string().min(1).max(64) }).strict(),
});

export const listPaymentsSchema = z.object({
  query: z
    .object({
      page: intQuery('1'),
      pageSize: intQuery('20'),
      studentId: z.string().min(1).max(64).optional(),
    })
    .strict(),
});
