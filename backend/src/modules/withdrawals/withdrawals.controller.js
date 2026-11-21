import * as service from './withdrawals.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const createWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawal, replayed } = await service.createWithdrawal(req.user, req.body);
  res.status(replayed ? 200 : 201).json({ withdrawal });
});

export const listWithdrawals = asyncHandler(async (req, res) => {
  res.json(await service.listWithdrawals(req.query));
});

export const getWithdrawal = asyncHandler(async (req, res) => {
  res.json({ withdrawal: await service.getWithdrawal(req.params.id) });
});
