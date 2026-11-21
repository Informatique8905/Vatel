import { Router } from 'express';
import * as controller from './menus.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { dishImageUpload } from '../../middlewares/upload.js';
import * as v from './menus.validation.js';

export const menuRoutes = Router();

// Référentiel d'allergènes : utile à l'admin (fiches plats) et aux élèves.
menuRoutes.get('/allergens', requireAuth, controller.listAllergens);

// Plats : gestion réservée à l'admin (composition des menus, §3.3).
menuRoutes.get('/dishes', requireAuth, requireRole('ADMIN'), controller.listDishes);
menuRoutes.post('/dishes', requireAuth, requireRole('ADMIN'), validate(v.dishCreateSchema), controller.createDish);
menuRoutes.patch('/dishes/:id', requireAuth, requireRole('ADMIN'), validate(v.dishUpdateSchema), controller.updateDish);
menuRoutes.delete('/dishes/:id', requireAuth, requireRole('ADMIN'), validate(v.dishIdSchema), controller.archiveDish);
// Image du plat : multipart/form-data, champ "image" (JPEG/PNG/WebP).
menuRoutes.post('/dishes/:id/image', requireAuth, requireRole('ADMIN'), dishImageUpload, validate(v.dishIdSchema), controller.setDishImage);
menuRoutes.delete('/dishes/:id/image', requireAuth, requireRole('ADMIN'), validate(v.dishIdSchema), controller.removeDishImage);

// Offres datées : lecture par tout utilisateur connecté (portée par rôle dans
// le service — non-admin = PUBLISHED uniquement), écriture admin.
menuRoutes.get('/items', requireAuth, validate(v.menuListSchema), controller.listMenuItems);
menuRoutes.post('/items', requireAuth, requireRole('ADMIN'), validate(v.menuItemCreateSchema), controller.createMenuItem);
menuRoutes.get('/items/:id', requireAuth, validate(v.menuItemIdSchema), controller.getMenuItem);
menuRoutes.patch('/items/:id', requireAuth, requireRole('ADMIN'), validate(v.menuItemUpdateSchema), controller.updateMenuItem);

// Créneaux : lecture utile aux élèves (choix du retrait), écriture admin.
menuRoutes.get('/slots', requireAuth, requireRole('STUDENT', 'ADMIN'), validate(v.slotListSchema), controller.listSlots);
menuRoutes.post('/slots', requireAuth, requireRole('ADMIN'), validate(v.slotCreateSchema), controller.createSlot);
menuRoutes.get('/slots/:id', requireAuth, requireRole('STUDENT', 'ADMIN'), validate(v.slotIdSchema), controller.getSlot);
menuRoutes.patch('/slots/:id', requireAuth, requireRole('ADMIN'), validate(v.slotUpdateSchema), controller.updateSlot);
menuRoutes.post('/slots/:id/activate', requireAuth, requireRole('ADMIN'), validate(v.slotIdSchema), controller.activateSlot);
menuRoutes.post('/slots/:id/deactivate', requireAuth, requireRole('ADMIN'), validate(v.slotIdSchema), controller.deactivateSlot);
menuRoutes.delete('/slots/:id', requireAuth, requireRole('ADMIN'), validate(v.slotIdSchema), controller.deleteSlot);
