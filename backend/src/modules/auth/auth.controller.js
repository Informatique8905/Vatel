import * as authService from './auth.service.js';
import { asyncHandler } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { randomToken } from '../../utils/crypto.js';
import { csrfCookieOptions } from '../../middlewares/csrf.js';

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = env.refreshTokenTtlDays * 24 * 3600 * 1000;

// Session en cookies HttpOnly + SameSite=Lax (Secure en prod), spec §12.1.
// Le refresh token est scopé sur /api/auth : jamais envoyé aux autres routes.
const setSessionCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('access_token', accessToken, {
    httpOnly: true, sameSite: 'lax', secure: env.isProd, maxAge: ACCESS_MAX_AGE,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/api/auth', maxAge: REFRESH_MAX_AGE,
  });
  // Rotation du jeton CSRF à chaque nouvelle session.
  res.cookie('csrf_token', randomToken(24), csrfCookieOptions());
};

const clearSessionCookies = (res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('csrf_token');
};

export const register = asyncHandler(async (req, res) => {
  const { user, devVerificationToken } = await authService.register(req.body);
  const tokens = await authService.issueSession(user.id, user.role);
  setSessionCookies(res, tokens);
  res.status(201).json({ user, ...(devVerificationToken && { devVerificationToken }) });
});

export const login = asyncHandler(async (req, res) => {
  const { user, userId, role } = await authService.login(req.body);
  setSessionCookies(res, await authService.issueSession(userId, role));
  res.json({ user });
});

export const google = asyncHandler(async (req, res) => {
  const { user, userId, role } = await authService.googleLogin(req.body);
  setSessionCookies(res, await authService.issueSession(userId, role));
  res.json({ user });
});

export const refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.refresh(req.cookies?.refresh_token);
  setSessionCookies(res, { accessToken, refreshToken });
  res.json({ user: authService.publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refresh_token);
  clearSessionCookies(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await authService.getMe(req.user.id) });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  res.json({ message: 'Adresse e-mail vérifiée' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const token = await authService.forgotPassword(req.body.email);
  // Réponse uniforme (anti-énumération). Sans service e-mail MVP, le jeton
  // n'est renvoyé qu'en développement.
  res.json({
    message: 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé',
    ...(!env.isProd && token && { devResetToken: token }),
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  clearSessionCookies(res);
  res.json({ message: 'Mot de passe réinitialisé, veuillez vous reconnecter' });
});
