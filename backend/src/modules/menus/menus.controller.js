import * as service from './menus.service.js';
import { asyncHandler } from '../../utils/errors.js';

// --- Plats ---
export const listDishes = asyncHandler(async (_req, res) => {
  res.json(await service.listDishes({ includeArchived: true }));
});

export const createDish = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createDish(req.body));
});

export const updateDish = asyncHandler(async (req, res) => {
  res.json(await service.updateDish(req.params.id, req.body));
});

export const archiveDish = asyncHandler(async (req, res) => {
  await service.archiveDish(req.params.id);
  res.status(204).send();
});

// --- Offres datées ---
export const listMenuItems = asyncHandler(async (req, res) => {
  res.json(await service.listMenuItems(req.user, req.query));
});

export const getMenuItem = asyncHandler(async (req, res) => {
  res.json(await service.getMenuItem(req.user, req.params.id));
});

export const createMenuItem = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createMenuItem(req.body));
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  res.json(await service.updateMenuItem(req.params.id, req.body));
});

// --- Créneaux ---
export const listSlots = asyncHandler(async (req, res) => {
  res.json(await service.listSlots(req.user, req.query));
});

export const createSlot = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createSlot(req.body));
});

export const updateSlot = asyncHandler(async (req, res) => {
  res.json(await service.updateSlot(req.params.id, req.body));
});
