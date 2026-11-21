import * as service from './links.service.js';
import { asyncHandler } from '../../utils/errors.js';

export const createInvitation = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createInvitation(req.user));
});

export const listInvitations = asyncHandler(async (req, res) => {
  res.json(await service.listInvitations(req.user));
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  await service.revokeInvitation(req.user, req.params.id);
  res.status(204).send();
});

export const claim = asyncHandler(async (req, res) => {
  res.status(201).json(await service.claim(req.user, req.body));
});

export const listMyLinks = asyncHandler(async (req, res) => {
  res.json(await service.listMyLinks(req.user));
});

export const revokeLink = asyncHandler(async (req, res) => {
  await service.revokeLink(req.user, req.params.id);
  res.status(204).send();
});

export const listChildren = asyncHandler(async (req, res) => {
  res.json(await service.listChildren(req.user));
});
