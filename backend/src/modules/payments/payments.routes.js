import { Router } from 'express';
import * as controller from './payments.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import {
  createTopupSchema,
  paymentIdSchema,
  listPaymentsSchema,
} from './payments.validation.js';

export const paymentRoutes = Router();

// Recharge parent -> enfant lié (spec §8.2). Seul un PARENT initie.
paymentRoutes.post(
  '/topups',
  requireAuth,
  requireRole('PARENT'),
  validate(createTopupSchema),
  controller.createTopup,
);

paymentRoutes.get('/', requireAuth, validate(listPaymentsSchema), controller.listTopups);
paymentRoutes.get('/:id', requireAuth, validate(paymentIdSchema), controller.getTopup);
paymentRoutes.get('/:id/status', requireAuth, validate(paymentIdSchema), controller.reconcileTopup);
