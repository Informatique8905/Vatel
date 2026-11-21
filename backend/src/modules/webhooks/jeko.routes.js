import { Router } from 'express';
import { asyncHandler } from '../../utils/errors.js';
import * as service from './jeko.service.js';

// Route montée AVANT express.json dans app.js : req.body est le Buffer brut
// exigé pour la vérification HMAC (express.raw).
export const jekoWebhookRoutes = Router();

jekoWebhookRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = await service.handleJekoWebhook({
      rawBody: req.body,
      signature: req.get('Jeko-Signature'),
      event: req.get('Jeko-Event'),
    });
    res.json({ received: true, ...result });
  }),
);
