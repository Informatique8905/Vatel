import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/errors.js';
import { randomToken, hashToken } from '../../utils/crypto.js';
import { issueOtp, verifyOtp, assertOtpCooldown } from '../../utils/otp.js';
import { sendOtpEmail } from '../../utils/mailer.js';

const googleClient = new OAuth2Client();

const ARGON2_OPTIONS = { type: argon2.argon2id }; // spec §12.1

// Émet un code OTP et l'envoie par e-mail. En dev sans clé Resend, le code
// est renvoyé dans la réponse pour permettre les tests.
const sendOtp = async (user, type) => {
  await assertOtpCooldown(user.id, type);
  const code = await issueOtp(user.id, type);
  const { skipped } = await sendOtpEmail(user.email, code, type);
  return { sent: !skipped, devOtp: skipped && !env.isProd ? code : undefined };
};

const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  return parts.length === 1
    ? { firstName: parts[0], lastName: null }
    : { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) };
};

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  phone: u.phone ?? null,
  role: u.role,
  firstName: u.firstName,
  lastName: u.lastName,
  emailVerified: Boolean(u.emailVerifiedAt),
  kind: u.studentProfile?.kind ?? null,
});

// --- Émission de session : access JWT court + refresh token opaque tournant ---

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });

const createRefreshToken = async (userId) => {
  const raw = randomToken(48);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 3600 * 1000),
    },
  });
  return raw;
};

// --- Cas d'usage ---

export const register = async ({ firstName, lastName, email, phone, password, role, kind, matricule, level, grade }) => {
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new ApiError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet e-mail');

  if (role === 'STUDENT' && matricule) {
    const dup = await prisma.studentProfile.findUnique({ where: { matricule }, select: { id: true } });
    if (dup) throw new ApiError(409, 'MATRICULE_TAKEN', 'Ce matricule est déjà associé à un compte');
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  // Le rôle vient du schéma validé (STUDENT|PARENT uniquement) — ADMIN impossible ici.
  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role,
      firstName,
      lastName,
      // Chaque élève/employé reçoit son portefeuille interne à la création (spec §8.1)
      ...(role === 'STUDENT' && {
        studentProfile: {
          create: {
            kind: kind ?? 'STUDENT',
            matricule: matricule ?? null,
            level: level ?? null,
            grade: grade ?? null,
            wallet: { create: {} },
          },
        },
      }),
    },
    include: { studentProfile: { select: { id: true, kind: true } } },
  });

  // Code OTP de vérification envoyé par e-mail (spec §12.1).
  const otp = await sendOtp(user, 'EMAIL_VERIFICATION');
  return { user: publicUser(user), ...otp };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { studentProfile: { select: { id: true, kind: true } } },
  });
  // Message identique dans tous les cas : pas d'énumération des comptes.
  if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect');
  }
  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Ce compte est suspendu');
  }
  return { user: publicUser(user), userId: user.id, role: user.role };
};

export const googleLogin = async ({ idToken, role }) => {
  if (!env.googleClientId) {
    throw new ApiError(503, 'OAUTH_NOT_CONFIGURED', 'Connexion Google non configurée côté serveur');
  }
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Jeton Google invalide');
  }
  if (!payload?.email) throw new ApiError(401, 'INVALID_GOOGLE_TOKEN', 'Compte Google sans e-mail');

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email }] },
    include: { studentProfile: { select: { id: true, kind: true } } },
  });

  if (user) {
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
        include: { studentProfile: { select: { id: true, kind: true } } },
      });
    }
  } else {
    // Première connexion Google : rôle demandé explicitement, jamais ADMIN (spec §12.1).
    if (!role) throw new ApiError(400, 'ROLE_REQUIRED', 'Type de compte requis pour la première connexion');
    const { firstName, lastName } = splitName(payload.name ?? email.split('@')[0]);
    user = await prisma.user.create({
      data: {
        email,
        googleId: payload.sub,
        role,
        firstName,
        lastName,
        emailVerifiedAt: payload.email_verified ? new Date() : null,
        ...(role === 'STUDENT' && {
          studentProfile: { create: { kind: 'STUDENT', wallet: { create: {} } } },
        }),
      },
      include: { studentProfile: { select: { id: true, kind: true } } },
    });
  }
  if (user.status !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Ce compte est suspendu');
  return { user: publicUser(user), userId: user.id, role: user.role };
};

// --- Rotation du refresh token (spec §12.1 : invalidation des sessions) ---

export const refresh = async (rawToken) => {
  if (!rawToken) throw new ApiError(401, 'NO_REFRESH_TOKEN', 'Session absente');
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { include: { studentProfile: { select: { id: true, kind: true } } } } },
  });
  if (!stored) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Session invalide');

  // Réutilisation d'un jeton déjà révoqué = vol potentiel → on révoque TOUTES
  // les sessions de l'utilisateur par précaution.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, 'TOKEN_REUSE_DETECTED', 'Session compromise, reconnectez-vous');
  }
  if (stored.expiresAt < new Date()) {
    throw new ApiError(401, 'REFRESH_EXPIRED', 'Session expirée, reconnectez-vous');
  }

  const [newRaw] = await Promise.all([
    createRefreshToken(stored.userId),
    prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
  ]);
  return { user: stored.user, accessToken: signAccessToken(stored.user), refreshToken: newRaw };
};

export const logout = async (rawToken) => {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

// --- Vérification e-mail & réinitialisation par code OTP (spec §12.1) ---

const userByEmail = async (email) =>
  prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true } });

export const verifyEmail = async (email, code) => {
  const user = await userByEmail(email);
  // Même réponse qu'un mauvais code : pas d'énumération des comptes.
  if (!user) throw new ApiError(400, 'OTP_INVALID', 'Code incorrect');
  if (user.emailVerifiedAt) return; // idempotent
  await verifyOtp(user.id, 'EMAIL_VERIFICATION', code);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
};

// Renvoi d'un code OTP. purpose : 'verify' (e-mail non confirmé) ou 'reset'
// (mot de passe oublié). Réponse uniforme si le compte n'existe pas.
export const resendOtp = async (email, purpose) => {
  const user = await userByEmail(email);
  if (!user) return { sent: false };
  if (purpose === 'verify' && user.emailVerifiedAt) return { sent: false };
  return sendOtp(user, purpose === 'verify' ? 'EMAIL_VERIFICATION' : 'PASSWORD_RESET');
};

export const forgotPassword = async (email) => {
  const user = await userByEmail(email);
  if (!user) return { sent: false }; // anti-énumération
  return sendOtp(user, 'PASSWORD_RESET');
};

export const resetPassword = async (email, code, password) => {
  const user = await userByEmail(email);
  if (!user) throw new ApiError(400, 'OTP_INVALID', 'Code incorrect');
  await verifyOtp(user.id, 'PASSWORD_RESET', code);
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
  // Invalidation de toutes les sessions ouvertes (spec §12.1).
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

export const issueSession = async (userId, role) => {
  const accessToken = jwt.sign({ sub: userId, role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
  const refreshToken = await createRefreshToken(userId);
  return { accessToken, refreshToken };
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      studentProfile: {
        select: { id: true, kind: true, grade: true, wallet: { select: { balance: true, currency: true } } },
      },
    },
  });
  return { ...publicUser(user), studentProfile: user.studentProfile };
};
