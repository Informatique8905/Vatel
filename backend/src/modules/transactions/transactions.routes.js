import { Router } from 'express';
import * as controller from './transactions.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import {
  listTransactionsSchema,
  transactionIdSchema,
  adjustmentSchema,
  reversalSchema,
} from './transactions.validation.js';

export const transactionRoutes = Router();

// Lecture : portée résolue par rôle dans le service (§12.2, deny by default).
transactionRoutes.get(
  '/',
  requireAuth,
  requireRole('STUDENT', 'PARENT', 'ADMIN'),
  validate(listTransactionsSchema),
  controller.list,
);

// Corrections financières : réservées à l'admin et auditées (§8.5, §12.4).
transactionRoutes.post(
  '/adjustment',
  requireAuth,
  requireRole('ADMIN'),
  validate(adjustmentSchema),
  controller.adjust,
);

transactionRoutes.get(
  '/:id',
  requireAuth,
  requireRole('STUDENT', 'PARENT', 'ADMIN'),
  validate(transactionIdSchema),
  controller.getById,
);

transactionRoutes.post(
  '/:id/reversal',
  requireAuth,
  requireRole('ADMIN'),
  validate(reversalSchema),
  controller.reverse,
);
