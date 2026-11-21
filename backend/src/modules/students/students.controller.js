import * as service from './students.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const getMe = asyncHandler(async (req, res) => {
  res.json(await service.getMe(req.user));
});

export const updateDietary = asyncHandler(async (req, res) => {
  res.json(await service.updateDietary(req.user, req.body));
});
