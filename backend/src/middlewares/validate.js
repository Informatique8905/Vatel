import { ApiError } from '../utils/errors.js';

// Validation Zod stricte (spec §12.3) : chaque route déclare un schéma
// { body?, query?, params? } en .strict() — les champs inattendus sont rejetés.
// req.body/query/params sont REMPLACÉS par les données parsées :
// jamais de req.body brut transmis à Prisma.
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Requête invalide', details));
  }
  if (result.data.body !== undefined) req.body = result.data.body;
  // Express 5 expose req.query en getter prototype re-parsant à chaque accès :
  // réassigner lève une erreur et muter l'objet est perdu. On définit une
  // propriété propre sur l'instance qui masque le getter (valeurs Zod parsées).
  if (result.data.query !== undefined) {
    Object.defineProperty(req, 'query', { value: result.data.query });
  }
  if (result.data.params !== undefined) req.params = result.data.params;
  next();
};
