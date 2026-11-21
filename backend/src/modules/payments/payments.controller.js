import * as service from './payments.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const createTopup = asyncHandler(async (req, res) => {
  const { intent, replayed } = await service.createTopup(req.user, req.body);
  res.status(replayed ? 200 : 201).json({ payment: intent });
});

export const listTopups = asyncHandler(async (req, res) => {
  res.json(await service.listTopups(req.user, req.query));
});

export const getTopup = asyncHandler(async (req, res) => {
  res.json({ payment: await service.getTopup(req.user, req.params.id) });
});

// Interroge Jeko pour trancher un PENDING (pas de webhook sur échec de pay-in).
export const reconcileTopup = asyncHandler(async (req, res) => {
  res.json({ payment: await service.reconcileTopup(req.user, req.params.id) });
});
