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

  // E-mails transactionnels : Resend (codes OTP de vérification / reset)
  // Vide en dev → les codes sont renvoyés dans la réponse et logués.
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Cantine Vatel <onboarding@resend.dev>',
  otpTtlMinutes: int('OTP_TTL_MINUTES', 10),
  otpMaxAttempts: int('OTP_MAX_ATTEMPTS', 5),
  otpResendCooldownSec: int('OTP_RESEND_COOLDOWN_SEC', 60),

  // Agrégateur Jeko (spec §8.2) — Partner API documentée developer.jeko.africa
  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'jeko',
  jekoApiBaseUrl: process.env.JEKO_API_BASE_URL ?? 'https://api.jeko.africa/partner_api',
  jekoApiKey: process.env.JEKO_API_KEY ?? '',
  jekoApiKeyId: process.env.JEKO_API_KEY_ID ?? '', // second en-tête X-API-KEY-ID requis
  jekoStoreId: process.env.JEKO_STORE_ID ?? '', // storeId sur chaque opération
  jekoWebhookSecret: process.env.JEKO_WEBHOOK_SECRET ?? '',
  // URLs de retour payeur après paiement hébergé (frontend)
  paymentSuccessUrl: process.env.PAYMENT_SUCCESS_URL ?? 'http://localhost:5173/parent/recharge/succes',
  paymentErrorUrl: process.env.PAYMENT_ERROR_URL ?? 'http://localhost:5173/parent/recharge/erreur',
  topupExpiresMinutes: int('TOPUP_EXPIRES_MINUTES', 30),

  // Compte admin initial créé au démarrage (jamais via l'inscription publique).
  // ADMIN_USERNAME = adresse e-mail de connexion de l'admin.
  adminUsername: process.env.ADMIN_USERNAME ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',

  // Images des plats : Cloudinary uniquement (jamais en base ni sur disque)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  uploadMaxBytes: int('UPLOAD_MAX_BYTES', 5 * 1024 * 1024), // 5 Mo par défaut

  // Web Push (VAPID) — la clé privée ne quitte jamais le serveur.
  // Vides en dev -> push ignoré, notifications conservées en historique.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:contact@cantine-vatel.demo',

  // Liaisons parent-enfant : durée de vie d'une invitation (QR/lien)
  linkInvitationTtlHours: int('LINK_INVITATION_TTL_HOURS', 72),
};
