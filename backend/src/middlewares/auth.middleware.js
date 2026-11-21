import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { ApiError, asyncHandler } from '../utils/errors.js';

// Deny by default (spec §12.2) : toute route privée passe par requireAuth.
// L'utilisateur est rechargé à chaque requête : un compte SUSPENDED est
// bloqué immédiatement, même avec un access token encore valide.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token =
    req.cookies?.access_token ??
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentification requise');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Session expirée ou invalide');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      notifySlotReminders: true,
      notifyChildReminders: true,
      studentProfile: { select: { id: true, kind: true } },
    },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'ACCOUNT_INACTIVE', 'Compte inactif ou inexistant');
  }
  req.user = user;
  next();
});

// Vérification du rôle à chaque requête (moindre privilège, spec §12.2).
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'UNAUTHENTICATED', 'Authentification requise'));
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Accès refusé'));
  }
  next();
};
