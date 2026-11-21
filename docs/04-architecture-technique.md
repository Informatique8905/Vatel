# Dossier d'architecture technique (DAT)

## Vue d'ensemble

```
┌──────────────┐   HTTPS    ┌───────────────────────┐      ┌──────────────┐
│   Frontend   │ ─────────► │       Backend         │ ───► │ PostgreSQL   │
│ React + Vite │  REST+JWT  │ Express 5 + Prisma 6  │      │ (Docker/RW)  │
│  (PWA, 5173) │  cookies   │      (port 4000)      │      └──────────────┘
└──────────────┘            └───┬───┬───┬───┬───┬───┘
                                │   │   │   │   │
                     ┌──────────┘   │   │   │   └──────────┐
                     ▼              ▼   ▼   ▼              ▼
                  Resend         Jeko Cloudinary      Push VAPID
                  (OTP)      (paiement + webhook)   (images)   (notifications)
```

## Composants

### Frontend (`frontend/`)

- React 19 + Vite 8 + react-router-dom 7 + Tailwind 4 + GSAP — JSX pur.
- **PWA mobile-first** : 95 % des utilisateurs sur téléphone ; l'admin reste
  responsive desktop. Trois espaces routés : `/student`, `/parent`, `/admin`.
- `src/services/api.js` : client `fetch` (cookies HttpOnly, en-tête CSRF,
  messages d'erreur normalisés `apiMessage`).
- Lazy-loading des pages (`React.lazy` + `Suspense` + `PageLoader`),
  écran de lancement logo animé inline dans `index.html` (`#splash`).
- Bibliothèque UI interne `components/common/kbr.jsx` (composants custom
  elements `vatel-*` chargés depuis `public/vendor/kbr/`).
- Carrousel des plats `DishOrbitCarousel` : orbite GSAP pilotée par le
  scroll/geste (interpolation continue, snapping, inertie).
- Données de démo actuelles : `src/data/weekMenu.js` (à brancher sur l'API).

### Backend (`backend/`)

- Express 5, middlewares : `helmet`, `cors` (allowlist `CORS_ORIGIN`,
  credentials), `pino-http` (logs structurés), `express-rate-limit`,
  `express.json` 100 ko, `cookie-parser`, `csrfProtection`.
- Corps brut réservé à `/api/webhooks/jeko` (vérification HMAC).
- Structure par modules (`src/modules/<module>/{controller,service,validation,routes}.js`)
  — validation Zod stricte, jamais `req.body` direct à Prisma.
- Ledger financier `transactions/ledger.service.js` : `postEntry` atomique,
  `creditWalletTopup` / `payMeal` / `withdrawCanteen` / `reverseTransaction`.
- Worker rappels `src/jobs/reminders.js` (`setInterval`, claims atomiques
  PostgreSQL — pas de file externe).
- Bootstrap `ensureAdmin.js` : compte ADMIN depuis l'environnement avant
  `listen`, refus de démarrer en prod si absent.
- Auth : JWT access 15 min + refresh opaque rotatif en cookie HttpOnly,
  Argon2id, OTP Resend, détection de réutilisation de refresh token.

### Base de données

- PostgreSQL 17 (Docker Compose en dev, port hôte **5433**).
- Prisma 6.19.3, 24 modèles, 20 enums — migrations versionnées
  `prisma/migrations/`. Verrouillage optimiste `version` sur
  `Wallet`/`CanteenAccount`, compteurs `reservedCount` par `updateMany`
  conditionnel.

## Flux principaux

### Réservation

1. Élève → `POST /api/reservations` (idempotencyKey optionnel).
2. `$transaction` : verrou `StudentProfile`, contrôles (offre, créneau,
   deadline, allergène, limite), `updateMany` réservé < capacité,
   `payMeal` (ledger), `CONFIRMED` + `qrToken`.
3. Notification persistée + push post-commit (élève + parents liés).
4. Rappels créneau planifiés (`ScheduledReminder`).

### Recharge parent

1. Parent → `POST /api/payments/topups` → `PaymentIntent` + checkout Jeko
   (`redirectUrl` → redirection navigateur).
2. Jeko → `POST /api/webhooks/jeko` (corps brut, HMAC-SHA256,
   `WebhookEvent` anti-rejeu) → `SUCCEEDED` → crédit `TOPUP` + notifications.
3. Frontend : page succès/erreur = UX seulement, aucun crédit.

### Distribution

Scan QR → `POST /api/distributions/scan` → transition atomique
`CONFIRMED→COLLECTED` (unique `reservationId` → second scan = 409).

## Dépendances externes

| Service | Usage | Dégradation |
|---------|-------|-------------|
| PostgreSQL | Données | Bloquant |
| Resend | OTP e-mail | Inscription impossible sans clé |
| Jeko | Recharges | `503 JEKO_NOT_CONFIGURED` |
| Cloudinary | Photos plats | Plats sans photo (fallback stylisé) |
| Web Push VAPID | Notifications push | Historique in-app conservé |
| Google OAuth | Connexion Google | `503` tant que `GOOGLE_CLIENT_ID` absent |

## Hébergement cible

Railway (cahier des charges) : backend Node + PostgreSQL managé ; frontend
servi statiquement (build Vite). Variables d'environnement = `.env.example`.

## Choix techniques

- **JavaScript pur** des deux côtés (pas de TypeScript, pas de shadcn).
- **Montants `Int` XOF** partout ; Jeko en centimes (×100) uniquement à la frontière.
- **Double entrée** : aucune mutation de solde hors ledger ; corrections par
  `REVERSAL`/`ADJUSTMENT`, jamais de modification de l'originale.
- **Idempotence** : `idempotencyKey` unique, `WebhookEvent.eventId` unique,
  `ScheduledReminder.dedupeKey` unique, `reference`/`providerRef` uniques.
- **Pas de suppresseur de données** : archivage (`archivedAt`, `revokedAt`,
  `disabledAt`) plutôt que destruction.
