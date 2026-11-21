// Configuration centralisée — valeurs lues depuis les variables d'environnement.
// Aucun secret en dur ici : tout vient de .env (jamais committé, spec §12.4).

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
};

const int = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: int('PORT', 4000),

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL'),

  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtlDays: int('REFRESH_TOKEN_TTL_DAYS', 30),

  // Connexion Google (spec §12.1 DÉCIDÉ) — vide = endpoint désactivé
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  // Agrégateur Jeko (spec §8.2) — rempli lors du module payments
  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'jeko',
  jekoApiBaseUrl: process.env.JEKO_API_BASE_URL ?? '',
  jekoApiKey: process.env.JEKO_API_KEY ?? '',
  jekoWebhookSecret: process.env.JEKO_WEBHOOK_SECRET ?? '',
};
