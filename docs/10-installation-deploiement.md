# Guide d'installation et de déploiement

## Prérequis

- Node.js 20+ (supporte `node --env-file`)
- Docker + Docker Compose (PostgreSQL en dev)
- npm

## Installation en développement

```bash
git clone https://github.com/Informatique8905/Vatel.git cantine-vatel
cd cantine-vatel
```

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # renseigner les variables
npm run db:up               # PostgreSQL Docker sur localhost:5433
npm run prisma:migrate      # migrations + client généré
npm run prisma:seed         # données de démo (ayant @exemple.ci, VatelDemo2026!)
npm run dev                 # API sur http://localhost:4000
```

> **Port 5433** : un PostgreSQL natif occupe déjà 5432 sur la machine de dev.
> Ne pas repasser en 5432 (`docker-compose.yml` expose 5433→5432).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxy/cors → :4000)
```

Ouvrir `http://localhost:5173` — écran de lancement logo animé puis
`/connexion`. Comptes de démo : `admin@cantine-vatel.demo`,
`aya.konan@exemple.ci`, `mme.konan@exemple.ci` — `VatelDemo2026!`.

## Variables d'environnement (`backend/.env`)

Référence complète : `backend/.env.example`. Groupements :

| Groupe | Variables | Obligatoire |
|--------|-----------|-------------|
| Serveur | `PORT`, `NODE_ENV`, `CORS_ORIGIN` | Oui |
| Base | `DATABASE_URL` | Oui |
| Auth | `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`, secrets JWT, `GOOGLE_CLIENT_ID` | Oui / optionnel Google |
| Jeko | `PAYMENT_PROVIDER`, `JEKO_API_BASE_URL`, `JEKO_STORE_ID`, `JEKO_API_KEY*`, `JEKO_WEBHOOK_SECRET`, `PAYMENT_SUCCESS_URL`, `PAYMENT_ERROR_URL`, `TOPUP_EXPIRES_MINUTES` | Recharges (sinon `503`) |
| OTP | `RESEND_API_KEY`, `EMAIL_FROM`, `OTP_*` | Inscription (Resend) |
| Admin | `ADMIN_USERNAME`, `ADMIN_PASSWORD` | **Oui en prod** (démarrage refusé sinon) |
| Cloudinary | `CLOUDINARY_*`, `UPLOAD_MAX_BYTES` | Images plats |
| Push | `VAPID_*` (`npx web-push generate-vapid-keys`) | Push (sinon historique) |
| Métier §19 | `RESERVATION_CUTOFF_MINUTES`, `CANCELLATION_CUTOFF_MINUTES`, `LOW_BALANCE_THRESHOLD_XOF`, `NOT_COLLECTED_REFUND` | Valeurs provisoires |
| Worker | `REMINDER_POLL_MS`, `REMINDER_MAX_ATTEMPTS` | Rappels créneau |

## Déploiement production (Railway)

1. **Base** : créer un service PostgreSQL Railway ; récupérer `DATABASE_URL`.
2. **Backend** : nouveau service Node, racine `backend/` — build
   `npm install && npm run prisma:generate`, démarrage `npm start`.
   Variables : tout `.env.example` (valeurs de prod ; `NODE_ENV=production`).
3. **Migrations** : `npx prisma migrate deploy` à la release (hook Railway
   ou commande manuelle). Seed **uniquement** en démo, jamais en prod.
4. **Frontend** : `cd frontend && npm run build` → servir `dist/` (Railway
   static ou CDN). `CORS_ORIGIN` = URL exacte du frontend.
5. **Webhooks** : configurer chez Jeko l'URL `https://<api>/api/webhooks/jeko`
   et renseigner `JEKO_WEBHOOK_SECRET`. `PAYMENT_SUCCESS_URL`/`ERROR_URL`
   → pages frontend de succès/erreur.
6. **Admin** : `ADMIN_USERNAME` + `ADMIN_PASSWORD` — le bootstrap crée le
   compte avant `listen` (idempotent).

## Vérifications post-déploiement

- `GET /api/health` (ou une route non-auth) répond `200`.
- Login d'un compte de test → cookie posé, `/api/auth/me` OK.
- Test webhook : envoi d'un événement Jeko signé → `WebhookEvent` `PROCESSED`.
- `npm run db:logs` / logs Railway : pas d'erreur Prisma ni `ensureAdmin`.
- Frontend : splash → connexion → navigation entre espaces.

## Arrêt / maintenance

- Dev : `npm run db:down` (les données persistent dans le volume
  `vatel_pgdata`).
- Prod : scale à 1 réplica avant `migrate deploy` pour éviter les migrations
  concurrentes ; worker `reminders.js` tourne dans le process backend.
