import { randomToken } from '../utils/crypto.js';
import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Chemins exclus : les webhooks serveur-à-serveur n'ont pas de cookies (spec §9).
const isExempt = (req) => req.path.startsWith('/api/webhooks');

// Protection CSRF par double-submit cookie (spec §12.1 : "protection CSRF si cookies") :
// - un cookie non-HttpOnly `csrf_token` est émis dès la première requête ;
// - toute requête mutante doit renvoyer sa valeur dans l'en-tête `x-csrf-token`.
// Combiné à SameSite=Lax + CORS allowlist, un site tiers ne peut pas forger de requête.
export const csrfProtection = (req, res, next) => {
  const cookieToken = req.cookies?.csrf_token;
  if (!cookieToken) {
    res.cookie('csrf_token', randomToken(24), {
      httpOnly: false,
      sameSite: 'lax',
      secure: env.isProd,
      maxAge: 30 * 24 * 3600 * 1000,
    });
    return next();
  }
  if (SAFE_METHODS.has(req.method) || isExempt(req)) return next();
  if (req.headers['x-csrf-token'] === cookieToken) return next();
  next(new ApiError(403, 'CSRF', 'Jeton CSRF manquant ou invalide'));
};

export const csrfCookieOptions = () => ({
  httpOnly: false,
  sameSite: 'lax',
  secure: env.isProd,
  maxAge: 30 * 24 * 3600 * 1000,
});
