import { Router } from 'express';
import * as controller from './students.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { updateDietarySchema } from './students.validation.js';

export const studentRoutes = Router();

// Espace élève : profil + déclarations alimentaires (spec §7).
studentRoutes.use(requireAuth, requireRole('STUDENT'));
studentRoutes.get('/me', controller.getMe);
studentRoutes.put('/me/dietary', validate(updateDietarySchema), controller.updateDietary);
