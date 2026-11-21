import * as service from './notifications.service.js';
import * as push from './push.service.js';
import { asyncHandler } from '../../utils/errors.js';
import { env } from '../../config/env.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, {
    page: req.query.page,
    pageSize: req.query.pageSize,
    unreadOnly: req.query.unread === true,
  }));
});

export const markRead = asyncHandler(async (req, res) => {
  await service.markRead(req.user, req.params.id);
  res.json({ message: 'Notification marquée comme lue' });
});

export const markAllRead = asyncHandler(async (req, res) => {
  res.json(await service.markAllRead(req.user));
});

export const getPreferences = asyncHandler(async (req, res) => {
  res.json(service.getPreferences(req.user));
});

export const updatePreferences = asyncHandler(async (req, res) => {
  res.json(await service.updatePreferences(req.user, req.body));
});

// Clé publique VAPID exposée au frontend pour s'abonner — jamais la privée.
export const vapidKey = asyncHandler(async (_req, res) => {
  push.requirePushConfigured();
  res.json({ publicKey: env.vapidPublicKey });
});

export const subscribe = asyncHandler(async (req, res) => {
  res.status(201).json(await push.subscribe(req.user.id, req.body));
});

export const unsubscribe = asyncHandler(async (req, res) => {
  await push.unsubscribe(req.user.id, req.body);
  res.status(204).send();
});
