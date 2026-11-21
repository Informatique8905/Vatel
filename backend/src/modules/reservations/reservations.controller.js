import * as service from './reservations.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const create = asyncHandler(async (req, res) => {
  const { reservation, replayed } = await service.create(req.user, req.body);
  res.status(replayed ? 200 : 201).json({ reservation });
});

export const list = asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query));
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
});

export const cancel = asyncHandler(async (req, res) => {
  res.json(await service.cancel(req.user, req.params.id));
});
