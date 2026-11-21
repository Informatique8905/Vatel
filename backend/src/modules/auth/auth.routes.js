import { Router } from 'express';
import * as controller from './auth.controller.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  googleSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';

export const authRoutes = Router();

// Inscription : rôle STUDENT|PARENT uniquement (spec §12.2)
authRoutes.post('/register', authLimiter, validate(registerSchema), controller.register);
authRoutes.post('/login', authLimiter, validate(loginSchema), controller.login);
authRoutes.post('/google', authLimiter, validate(googleSchema), controller.google);
authRoutes.post('/refresh', controller.refresh);
authRoutes.post('/logout', controller.logout);
authRoutes.get('/me', requireAuth, controller.me);
authRoutes.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
authRoutes.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
authRoutes.post('/reset-password', authLimiter, validate(resetPasswordSchema), controller.resetPassword);
