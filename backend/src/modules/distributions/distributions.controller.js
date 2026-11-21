import * as service from './distributions.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const scan = asyncHandler(async (req, res) => {
  res.json(await service.scan(req.user, req.body));
});

export const manual = asyncHandler(async (req, res) => {
  res.json(await service.manual(req.user, req.body));
});

export const list = asyncHandler(async (req, res) => {
  res.json(await service.listForDistribution(req.query));
});
