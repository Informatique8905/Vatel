import { Router } from 'express';
import * as controller from './wallets.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { z } from 'zod';

export const walletRoutes = Router();

const studentIdSchema = z.object({
  params: z.object({ studentId: z.string().min(1) }).strict(), // id de StudentProfile
});

walletRoutes.get('/me', requireAuth, requireRole('STUDENT'), controller.myWallet);

walletRoutes.get('/canteen', requireAuth, requireRole('ADMIN'), controller.canteenSummary);

// /canteen déclaré avant /:studentId pour ne pas être capturé par le paramètre.
walletRoutes.get(
  '/:studentId',
  requireAuth,
  requireRole('PARENT', 'ADMIN'),
  validate(studentIdSchema),
  controller.walletForStudent,
);
