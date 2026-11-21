import * as service from './wallets.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const myWallet = asyncHandler(async (req, res) => {
  res.json(await service.getMyWallet(req.user));
});

export const walletForStudent = asyncHandler(async (req, res) => {
  res.json(await service.getWalletForStudent(req.user, req.params.studentId));
});

export const canteenSummary = asyncHandler(async (_req, res) => {
  res.json(await service.getCanteenSummary());
});
