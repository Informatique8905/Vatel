import { Router } from 'express';
import * as controller from './menus.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import * as v from './menus.validation.js';

export const menuRoutes = Router();

// Plats : gestion réservée à l'admin (composition des menus, §3.3).
menuRoutes.get('/dishes', requireAuth, requireRole('ADMIN'), controller.listDishes);
menuRoutes.post('/dishes', requireAuth, requireRole('ADMIN'), validate(v.dishCreateSchema), controller.createDish);
menuRoutes.patch('/dishes/:id', requireAuth, requireRole('ADMIN'), validate(v.dishUpdateSchema), controller.updateDish);
menuRoutes.delete('/dishes/:id', requireAuth, requireRole('ADMIN'), validate(v.dishIdSchema), controller.archiveDish);

// Offres datées : lecture par tout utilisateur connecté (portée par rôle dans
// le service — non-admin = PUBLISHED uniquement), écriture admin.
menuRoutes.get('/items', requireAuth, validate(v.menuListSchema), controller.listMenuItems);
menuRoutes.post('/items', requireAuth, requireRole('ADMIN'), validate(v.menuItemCreateSchema), controller.createMenuItem);
menuRoutes.get('/items/:id', requireAuth, validate(v.menuItemIdSchema), controller.getMenuItem);
menuRoutes.patch('/items/:id', requireAuth, requireRole('ADMIN'), validate(v.menuItemUpdateSchema), controller.updateMenuItem);

// Créneaux : lecture utile aux élèves (choix du retrait), écriture admin.
menuRoutes.get('/slots', requireAuth, requireRole('STUDENT', 'ADMIN'), validate(v.slotListSchema), controller.listSlots);
menuRoutes.post('/slots', requireAuth, requireRole('ADMIN'), validate(v.slotCreateSchema), controller.createSlot);
menuRoutes.patch('/slots/:id', requireAuth, requireRole('ADMIN'), validate(v.slotUpdateSchema), controller.updateSlot);
