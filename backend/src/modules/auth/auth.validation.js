import { z } from 'zod';

// Schémas stricts : tout champ non déclaré est rejeté (spec §12.3).
// Le rôle est limité à STUDENT | PARENT : ADMIN n'est jamais attribuable
// via une requête utilisateur (spec §12.2 + décision AGENTS.md).

const password = z
  .string()
  .min(8, 'Mot de passe : 8 caractères minimum')
  .max(128);

const registerRole = z.enum(['STUDENT', 'PARENT']);

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'Numéro de téléphone invalide (8 à 15 chiffres)');

const studentField = (max = 40) => z.string().trim().min(1).max(max);

export const registerSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1).max(60),
      lastName: z.string().trim().min(1).max(60),
      email: z.string().trim().toLowerCase().email().max(255),
      phone,
      password,
      role: registerRole,
      kind: z.enum(['STUDENT', 'EMPLOYEE']).optional(), // élève ou employé (spec §2)
      // Obligatoires pour un compte élève : matricule, niveau, classe.
      matricule: studentField(30).optional(),
      level: studentField(30).optional(),
      grade: studentField(30).optional(),
    })
    .strict()
    .superRefine((v, ctx) => {
      if (v.role !== 'STUDENT') return;
      for (const f of ['matricule', 'level', 'grade']) {
        if (!v[f]) ctx.addIssue({ code: 'custom', path: [f], message: 'Champ requis pour un compte élève' });
      }
    }),
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

const otpCode = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, 'Code à 6 chiffres attendu');

const email = z.string().trim().toLowerCase().email().max(255);

export const verifyEmailSchema = z.object({
  body: z.object({ email, code: otpCode }).strict(),
});

export const resendOtpSchema = z.object({
  body: z
    .object({ email, purpose: z.enum(['verify', 'reset']) })
    .strict(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email }).strict(),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      email,
      code: otpCode,
      password,
    })
    .strict(),
});
