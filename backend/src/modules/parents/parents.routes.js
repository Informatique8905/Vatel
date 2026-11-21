import { Router } from 'express';
import * as controller from './links.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { claimSchema, linkIdSchema, invitationIdSchema } from './parents.validation.js';

// Liaisons parent-enfant : invitations (QR/lien = même jeton), claim, révocation.
export const linkRoutes = Router();

linkRoutes.use(requireAuth);
linkRoutes.post('/invitations', requireRole('STUDENT', 'PARENT'), controller.createInvitation);
linkRoutes.get('/invitations', requireRole('STUDENT', 'PARENT'), controller.listInvitations);
linkRoutes.delete('/invitations/:id', requireRole('STUDENT', 'PARENT'), validate(invitationIdSchema), controller.revokeInvitation);
linkRoutes.post('/claim', requireRole('STUDENT', 'PARENT'), validate(claimSchema), controller.claim);
linkRoutes.get('/', requireRole('STUDENT', 'PARENT', 'ADMIN'), controller.listMyLinks);
linkRoutes.delete('/:id', requireRole('STUDENT', 'PARENT', 'ADMIN'), validate(linkIdSchema), controller.revokeLink);

// Vue parent : enfants associés + solde (§3.2).
export const parentRoutes = Router();
parentRoutes.get('/children', requireAuth, requireRole('PARENT'), controller.listChildren);
