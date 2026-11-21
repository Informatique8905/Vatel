import { z } from 'zod';

// Schémas stricts : tout champ non déclaré est rejeté (spec §12.3).
// Le rôle est limité à STUDENT | PARENT : ADMIN n'est jamais attribuable
// via une requête utilisateur (spec §12.2 + décision AGENTS.md).

const password = z
  .string()
  .min(8, 'Mot de passe : 8 caractères minimum')
  .max(128);

const registerRole = z.enum(['STUDENT', 'PARENT']);

export const registerSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email().max(255),
      password,
      role: registerRole,
      kind: z.enum(['STUDENT', 'EMPLOYEE']).optional(), // élève ou employé (spec §2)
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().toLowerCase().email().max(255),
      password: z.string().min(1).max(128),
    })
    .strict(),
});

export const googleSchema = z.object({
  body: z
    .object({
      idToken: z.string().min(10),
      role: registerRole.optional(), // requis seulement à la première connexion
    })
    .strict(),
});

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(20) }).strict(),
});

export const forgotPasswordSchema = z.object({
  body: z
    .object({ email: z.string().trim().toLowerCase().email().max(255) })
    .strict(),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(20),
      password,
    })
    .strict(),
});
