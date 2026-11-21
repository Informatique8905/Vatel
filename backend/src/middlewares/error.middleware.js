import { ApiError } from '../utils/errors.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) =>
  next(new ApiError(404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.path}`));

// Messages d'erreur sûrs (spec §12.3) : aucun détail interne exposé en prod.
export const errorHandler = (err, req, res, _next) => {
  // Erreur métier normalisée
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Contrainte unique Prisma (email, référence, token…)
  if (err?.code === 'P2002') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Conflit : une valeur unique existe déjà' },
    });
  }
  // Enregistrement introuvable Prisma
  if (err?.code === 'P2025') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ressource introuvable' },
    });
  }
  // Corps JSON malformé
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      error: { code: 'BAD_JSON', message: 'Corps JSON invalide' },
    });
  }

  req.log?.error({ err }, 'Erreur non gérée');
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Erreur interne du serveur',
      ...(env.isProd ? {} : { stack: err?.stack?.split('\n').slice(0, 3) }),
    },
  });
};
