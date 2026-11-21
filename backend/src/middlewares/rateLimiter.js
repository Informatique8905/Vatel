import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Limitation des tentatives (spec §12.1, §12.3).
// trust proxy configuré dans app.js pour que l'IP réelle fonctionne derrière Railway.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 300 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes, réessayez plus tard' } },
});

// Strict sur les endpoints sensibles : brute-force mot de passe, reset, OAuth.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 20 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ne pénalise pas un usage normal
  message: { error: { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez plus tard' } },
});
