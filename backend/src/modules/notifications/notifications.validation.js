import { z } from 'zod';

const intQuery = (fallback) =>
  z
    .string()
    .regex(/^\d+$/, 'Entier positif attendu')
    .default(fallback)
    .transform(Number);

export const listNotificationsSchema = z.object({
  query: z
    .object({
      page: intQuery('1'),
      pageSize: intQuery('20').refine((n) => n <= 100, 'pageSize max 100'),
      unread: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    })
    .strict(),
});

export const notificationIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }).strict(),
});

export const preferencesSchema = z.object({
  body: z
    .object({
      notifySlotReminders: z.boolean().optional(),
      notifyChildReminders: z.boolean().optional(),
    })
    .strict()
    .refine((b) => b.notifySlotReminders !== undefined || b.notifyChildReminders !== undefined, {
      message: 'Au moins une préférence requise',
    }),
});

// Format standard PushSubscription du Web Push API.
export const subscribeSchema = z.object({
  body: z
    .object({
      endpoint: z.string().url().max(1000),
      expirationTime: z.number().nullable().optional(),
      keys: z.object({
        p256dh: z.string().min(1).max(500),
        auth: z.string().min(1).max(500),
      }).strict(),
      userAgent: z.string().max(300).optional(),
    })
    .strict(),
});

export const unsubscribeSchema = z.object({
  body: z.object({ endpoint: z.string().url().max(1000) }).strict(),
});
