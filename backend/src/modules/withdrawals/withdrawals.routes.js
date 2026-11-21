import { Router } from 'express';
import * as controller from './withdrawals.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import {
  createWithdrawalSchema,
  withdrawalIdSchema,
  listWithdrawalsSchema,
} from './withdrawals.validation.js';

export const withdrawalRoutes = Router();

// Retraits cantine : ADMIN uniquement (spec §8.4 — rôle habilité).
withdrawalRoutes.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createWithdrawalSchema),
  controller.createWithdrawal,
);

withdrawalRoutes.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(listWithdrawalsSchema),
  controller.listWithdrawals,
);

withdrawalRoutes.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(withdrawalIdSchema),
  controller.getWithdrawal,
);
