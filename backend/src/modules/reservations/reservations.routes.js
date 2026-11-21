import { Router } from 'express';
import * as controller from './reservations.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import {
  createReservationSchema,
  listReservationsSchema,
  reservationIdSchema,
} from './reservations.validation.js';

export const reservationRoutes = Router();

// L'élève effectue lui-même ses réservations (§3.2 DÉCIDÉ).
reservationRoutes.post(
  '/',
  requireAuth,
  requireRole('STUDENT'),
  validate(createReservationSchema),
  controller.create,
);

// Lecture : portée par rôle dans le service (deny by default, §12.2).
reservationRoutes.get(
  '/',
  requireAuth,
  requireRole('STUDENT', 'PARENT', 'ADMIN'),
  validate(listReservationsSchema),
  controller.list,
);

reservationRoutes.get(
  '/:id',
  requireAuth,
  requireRole('STUDENT', 'PARENT', 'ADMIN'),
  validate(reservationIdSchema),
  controller.getById,
);

// Annulation : élève propriétaire ou admin, dans le délai configuré (§19).
reservationRoutes.post(
  '/:id/cancel',
  requireAuth,
  requireRole('STUDENT', 'ADMIN'),
  validate(reservationIdSchema),
  controller.cancel,
);
