import { Router } from 'express';
import * as controller from './notifications.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as v from './notifications.validation.js';

export const notificationRoutes = Router();
export const pushRoutes = Router();

// Historique et préférences : chaque utilisateur ne voit que ses données.
notificationRoutes.use(requireAuth);
notificationRoutes.get('/', validate(v.listNotificationsSchema), controller.list);
notificationRoutes.post('/read-all', controller.markAllRead);
notificationRoutes.post('/:id/read', validate(v.notificationIdSchema), controller.markRead);
notificationRoutes.get('/preferences', controller.getPreferences);
notificationRoutes.patch('/preferences', validate(v.preferencesSchema), controller.updatePreferences);

// Abonnements Web Push (multi-appareils, spec §4).
pushRoutes.use(requireAuth);
pushRoutes.get('/vapid-key', controller.vapidKey);
pushRoutes.post('/subscriptions', validate(v.subscribeSchema), controller.subscribe);
pushRoutes.delete('/subscriptions', validate(v.unsubscribeSchema), controller.unsubscribe);
pushRoutes.post('/fcm-tokens', validate(v.fcmTokenSchema), controller.registerFcmToken);
pushRoutes.delete('/fcm-tokens', validate(v.fcmTokenDeleteSchema), controller.unregisterFcmToken);
