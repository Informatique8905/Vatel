import { Router } from 'express';
import * as controller from './distributions.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { scanSchema, manualSchema, listSchema } from './distributions.validation.js';

export const distributionRoutes = Router();

// Tout le module est réservé au personnel de cantine (rôle ADMIN, §12.2).
distributionRoutes.use(requireAuth, requireRole('ADMIN'));

distributionRoutes.post('/scan', validate(scanSchema), controller.scan);
distributionRoutes.post('/manual', validate(manualSchema), controller.manual);
distributionRoutes.get('/', validate(listSchema), controller.list);
