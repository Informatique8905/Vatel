import crypto from 'node:crypto';
import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from './errors.js';

// Codes OTP à 6 chiffres (spec §12.1 : vérification e-mail & reset).
// Le code n'est JAMAIS stocké en clair : seul son hash SHA-256 va en base,
// dans AuthToken.tokenHash (même garantie que les refresh tokens).

export const generateOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

export const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Invalide les codes encore actifs puis émet un nouveau code.
// Renvoie le code en clair (il ne quitte le serveur que par e-mail).
export const issueOtp = async (userId, type) => {
  const code = generateOtp();
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hashOtp(code),
        expiresAt: new Date(Date.now() + env.otpTtlMinutes * 60 * 1000),
      },
    }),
  ]);
  return code;
};

// Vérifie un code : compte les tentatives, consomme le jeton au succès.
// Lève ApiError — le code n'est jamais renvoyé ni confirmé partiellement.
export const verifyOtp = async (userId, type, code) => {
  const token = await prisma.authToken.findFirst({
    where: { userId, type, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const fail = async (codeErr, msg, status = 400) => {
    if (token) {
      const attempts = token.attempts + 1;
      await prisma.authToken.update({
        where: { id: token.id },
        // Au-delà du max, le jeton est consommé : il faudra en redemander un.
        data: { attempts, usedAt: attempts >= env.otpMaxAttempts ? new Date() : null },
      });
    }
    throw new ApiError(status, codeErr, msg);
  };

  if (!token || token.expiresAt < new Date()) {
    await fail('OTP_EXPIRED', 'Code expiré ou inexistant — demandez un nouveau code');
  }
  if (token.attempts >= env.otpMaxAttempts) {
    await fail('OTP_LOCKED', 'Trop de tentatives — demandez un nouveau code', 429);
  }
  if (token.tokenHash !== hashOtp(code)) {
    await fail('OTP_INVALID', 'Code incorrect');
  }

  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
};

// Anti-spam interne : refuse un renvoi si le dernier code date de moins
// de OTP_RESEND_COOLDOWN_SEC (le rate limiter HTTP reste la 1re barrière).
export const assertOtpCooldown = async (userId, type) => {
  const last = await prisma.authToken.findFirst({
    where: { userId, type },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < env.otpResendCooldownSec * 1000) {
    throw new ApiError(429, 'OTP_TOO_SOON', 'Un code vient d’être envoyé — patientez avant de le redemander');
  }
};
