import { z } from 'zod';

const intQuery = (fallback) =>
  z
    .string()
    .regex(/^\d+$/, 'Entier positif attendu')
    .default(fallback)
    .transform(Number);

const OPERATORS = ['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'DJAMO'];
const phoneRegex = /^\+?[0-9]{8,15}$/;

// Minimums décaissement Jeko (doc) : 5 XOF Mobile Money, sauf Moov = 100 XOF.
const minForOperator = (operator) => (operator === 'MOOV_MONEY' ? 100 : 5);

export const createWithdrawalSchema = z.object({
  body: z
    .object({
      amount: z.number().int('Montant entier XOF requis').positive(),
      operator: z.enum(OPERATORS),
      beneficiaryPhone: z.string().regex(phoneRegex, 'Numéro bénéficiaire invalide (+225…, 8-15 chiffres)'),
      beneficiaryName: z.string().min(1).max(100).optional(),
      idempotencyKey: z.string().min(8).max(100).optional(),
    })
    .strict()
    .superRefine((v, ctx) => {
      const min = minForOperator(v.operator);
      if (v.amount < min) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `Minimum ${min} F pour cet opérateur`,
        });
      }
    }),
});

export const withdrawalIdSchema = z.object({
  params: z.object({ id: z.string().min(1).max(64) }).strict(),
});

export const listWithdrawalsSchema = z.object({
  query: z
    .object({
      page: intQuery('1'),
      pageSize: intQuery('20'),
      status: z.enum(['REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
    })
    .strict(),
});
