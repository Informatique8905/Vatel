import * as service from './transactions.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query));
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
});

export const adjust = asyncHandler(async (req, res) => {
  const { transaction } = await service.createAdjustment(req.user, req.body);
  res.status(201).json({ transaction });
});

export const reverse = asyncHandler(async (req, res) => {
  const { transaction } = await service.createReversal(req.user, {
    id: req.params.id,
    reason: req.body.reason,
  });
  res.status(201).json({ transaction });
});
