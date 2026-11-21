import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/errors.js';
import { randomToken, hashToken } from '../../utils/crypto.js';

const googleClient = new OAuth2Client();

const ARGON2_OPTIONS = { type: argon2.argon2id }; // spec §12.1
const EMAIL_TOKEN_TTL_MS = 24 * 3600 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // jeton temporaire à usage unique (§12.1)

const splitName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  return parts.length === 1
    ? { firstName: parts[0], lastName: null }
    : { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) };
};

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
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

export const register = async ({ fullName, email, password, role, kind }) => {
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new ApiError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet e-mail');

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
  const { firstName, lastName } = splitName(fullName);

  // Le rôle vient du schéma validé (STUDENT|PARENT uniquement) — ADMIN impossible ici.
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      // Chaque élève/employé reçoit son portefeuille interne à la création (spec §8.1)
      ...(role === 'STUDENT' && {
        studentProfile: {
          create: { kind: kind ?? 'STUDENT', wallet: { create: {} } },
        },
      }),
    },
    include: { studentProfile: { select: { id: true, kind: true } } },
  });

  const verificationToken = await createAuthToken(user.id, 'EMAIL_VERIFICATION', EMAIL_TOKEN_TTL_MS);
  // Pas de service e-mail au stade MVP : le jeton est renvoyé en dev uniquement.
  return { user: publicUser(user), devVerificationToken: env.isProd ? undefined : verificationToken };
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

// --- Vérification e-mail & réinitialisation (jetons à usage unique, §12.1) ---

const createAuthToken = async (userId, type, ttlMs) => {
  const raw = randomToken(32);
  await prisma.authToken.create({
    data: { userId, type, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return raw;
};

const consumeAuthToken = async (raw, type) => {
  const stored = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!stored || stored.type !== type || stored.usedAt || stored.expiresAt < new Date()) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Lien invalide ou expiré');
  }
  await prisma.authToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
  return stored.userId;
};

export const verifyEmail = async (raw) => {
  const userId = await consumeAuthToken(raw, 'EMAIL_VERIFICATION');
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
};

export const forgotPassword = async (email) => {
  // Réponse identique que le compte existe ou non (anti-énumération).
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;
  await prisma.authToken.updateMany({
    where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
    data: { usedAt: new Date() },
  });
  return createAuthToken(user.id, 'PASSWORD_RESET', RESET_TOKEN_TTL_MS);
};

export const resetPassword = async (raw, password) => {
  const userId = await consumeAuthToken(raw, 'PASSWORD_RESET');
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
  // Invalidation de toutes les sessions ouvertes (spec §12.1).
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
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
