# Référentiel de sécurité

Référence : `docs/spec.md` §12. Implémentation : `backend/src/middlewares/`,
`modules/auth`, `modules/webhooks`, `bootstrap/ensureAdmin.js`.

## Authentification

- **Mot de passe** : hachage Argon2id ; jamais loggé ni retourné.
- **Jetons** : access JWT 15 min + refresh opaque 30 j en cookies **HttpOnly**
  (`SameSite`, `Secure` en prod). Rotation du refresh ; **détection de
  réutilisation** → révocation de la session entière.
- **OTP e-mail** : 6 chiffres, hashé SHA-256 en base (`tokenHash` —
  jamais en clair), TTL 10 min, 5 tentatives max (verrouillage), cooldown
  renvoi 60 s, usage unique.
- **Jetons secondaires** : reset mot de passe et invitations de liaison
  hashés, expirés, à usage unique.
- **CSRF** : double-submit (`x-csrf-token`) sur les mutations.
- **Google OAuth** : route prête, désactivée (`503`) tant que
  `GOOGLE_CLIENT_ID` est absent.

## Autorisations

- **Deny by default** : `requireAuth` + `requireRole(...)` sur chaque route ;
  portée supplémentaire dans les services (un élève ne voit que ses
  réservations ; un parent, celles de ses enfants liés APPROVED).
- **ADMIN jamais attribuable** via une requête : `role` serveur limité à
  `STUDENT|PARENT` à l'inscription ; le compte admin est créé au démarrage
  depuis `ADMIN_USERNAME`/`ADMIN_PASSWORD` (refus de démarrer en prod si
  absents — `ensureAdmin.js`, idempotent, ne réécrit jamais le mot de passe).
- Les routes frontend par rôle sont un confort UX, jamais une protection.

## Secrets

- Aucun secret dans Git : `.env` ignoré, `.env.example` avec valeurs
  factices/commentaires uniquement.
- Secrets requis : `DATABASE_URL`, Argon2/JWT secrets, Resend API key,
  `JEKO_*` (API key, store id, `JEKO_WEBHOOK_SECRET`), Cloudinary,
  VAPID privée, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`.
- VAPID : clé **publique** exposée par `/api/push/vapid-key` ; la privée
  reste serveur.

## Validation et entrées

- **Zod** strict sur corps + query — `req.body` n'est jamais passé tel quel
  à Prisma. `middlewares/validate.js` injecte les valeurs normalisées
  (Express 5 : `req.query` en getter → `Object.defineProperty`).
- Upload d'images : `multer` mémoire, vérification des **magic bytes**
  JPEG/PNG/WebP, plafond `UPLOAD_MAX_BYTES` = 5 Mo, extension dérivée du
  type réel (pas du nom de fichier).
- `express.json({ limit: '100kb' })` ; corps brut réservé au webhook Jeko
  (signature vérifiée sur les octets exacts).
- `helmet`, `cors` allowlist (`CORS_ORIGIN`, credentials), `express-rate-limit`
  global `/api` + `authLimiter` renforcé sur register/login/OTP/reset.

## Journalisation et audit

- `pino-http` : logs structurés de toutes les requêtes (sans corps sensibles).
- `AuditLog` : opérations sensibles (retraits, ajustements, reversals,
  révocations de liaison) — acteur, action, ressource, résultat
  (SUCCESS/DENIED/FAILURE), IP, métadonnées.
- `Transaction` : snapshots `walletBalanceAfter`/`canteenBalanceAfter` +
  deltas en `metadata` — chaque écriture est auditable et inversible.
- `WebhookEvent` : chaque notification Jeko persistée (`signatureOk`,
  payload, statut) — traçabilité + anti-rejeu.

## Vulnérabilités traitées

| Risque | Contre-mesure |
|--------|---------------|
| Injection | Prisma + Zod partout |
| XSS / clickjacking | `helmet`, React échappe, cookies HttpOnly |
| CSRF | double-submit `x-csrf-token` + SameSite |
| Vol de session | refresh rotatif + détection réutilisation + révocation |
| Brute force OTP | `attempts` + verrouillage + cooldown + rate limit |
| Rejeu webhook | `WebhookEvent.eventId` unique + HMAC-SHA256 + `signatureOk` |
| Double réservation / surréservation | verrou `FOR UPDATE` + `updateMany` conditionnel |
| Double paiement | `idempotencyKey` unique ; seul le webhook crédite |
| Double scan QR | transition atomique + unique `reservationId` |
| Énumération d'emails | réponses neutres sur `forgot-password`/`register` |
| Fuite de données financières | portée par rôle côté service ; pas de solde en clair dans les logs |

## Points de vigilance restants

- Secrets Jeko/Resend/Cloudinary à provisionner en production (non encore
  fournis — dégradation gracieuse `503` documentée).
- `NOT_COLLECTED_REFUND` : politique métier encore À CONFIRMER.
- Service worker PWA : à auditer avant activation (cache des données
  sensibles, invalidation à la déconnexion).
