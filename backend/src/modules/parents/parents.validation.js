import { z } from 'zod';

export const claimSchema = z.object({
  body: z
    .object({
      token: z.string().min(20).max(200), // jeton opaque du QR/lien — jamais un id
      // Transport utilisé : informatif (même jeton pour QR et lien).
      method: z.enum(['QR_CODE', 'INVITATION_LINK']).default('INVITATION_LINK'),
    })
    .strict(),
});

export const linkIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }).strict(),
});

export const invitationIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }).strict(),
});
