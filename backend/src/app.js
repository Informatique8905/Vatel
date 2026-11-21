import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { csrfProtection } from './middlewares/csrf.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { walletRoutes } from './modules/wallets/wallets.routes.js';
import { transactionRoutes } from './modules/transactions/transactions.routes.js';
import { menuRoutes } from './modules/menus/menus.routes.js';
import { reservationRoutes } from './modules/reservations/reservations.routes.js';
import { distributionRoutes } from './modules/distributions/distributions.routes.js';
import { notificationRoutes, pushRoutes } from './modules/notifications/notifications.routes.js';
import { linkRoutes, parentRoutes } from './modules/parents/parents.routes.js';
import { paymentRoutes } from './modules/payments/payments.routes.js';
import { withdrawalRoutes } from './modules/withdrawals/withdrawals.routes.js';
import { jekoWebhookRoutes } from './modules/webhooks/jeko.routes.js';

export const createApp = () => {
  const app = express();

  // Railway agit en reverse proxy : nécessaire pour IP réelle / rate limiting (spec §12.4)
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Logs structurés, sans secrets ni en-têtes d'auth (spec §15)
  app.use(pinoHttp({
    level: env.isProd ? 'info' : 'debug',
    redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], remove: true },
    autoLogging: { ignore: (req) => req.url === '/api/health' },
  }));

  app.use(helmet());
  // CORS strict : allowlist + credentials cookies (spec §12.3)
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  // Webhook Jeko AVANT express.json : le Buffer brut est exigé pour vérifier
  // Jeko-Signature (HMAC-SHA256 du corps brut). Hors CSRF par construction.
  app.use('/api/webhooks/jeko', express.raw({ type: 'application/json' }), jekoWebhookRoutes);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(csrfProtection);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/wallets', walletRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/menus', menuRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/distributions', distributionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api/links', linkRoutes);
  app.use('/api/parents', parentRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/withdrawals', withdrawalRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
