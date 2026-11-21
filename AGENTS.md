# AGENTS.md — cantine-vatel

## Document de référence

Le cahier des charges est la référence fonctionnelle et technique du projet. **À lire avant toute tâche de développement** :

- `docs/spec.md` — copie markdown complète du cahier des charges.
- `docs/cahier_des_charges_cantine_vatel_agent_ia.docx` — document source.

Les décisions listées ci-dessous dans « Décisions postérieures » **priment** sur le cahier des charges.

## Décisions postérieures au cahier des charges

### 2026-11-21 — Frontend unique (remplace les sections 2 et 10 pour le frontend)

- Le projet ne contient plus 3 frontends (`student-app`, `parent-app`, `admin-dashboard`) mais **2 projets à la racine** : `frontend/` et `backend/`.
- `frontend/` est une seule application React + JS + Tailwind (PWA, mobile-first pour les espaces élève/parent, responsive pour l'admin) avec trois espaces routés :
  - `/admin` — espace administrateur (personnel de cantine).
  - `/student` — espace élèves **et** employés.
  - `/parent` — espace parents.
- À l'inscription, l'utilisateur choisit son type de compte : **élève/employé** ou **parent**, puis il est redirigé vers l'espace correspondant.
- Le rôle **ADMIN n'est jamais proposé à l'inscription** (cf. §12.2) : les comptes admin sont créés côté serveur ; `/admin` n'est accessible qu'à un utilisateur dont le rôle ADMIN est vérifié par le backend.
- Le rôle choisi à l'inscription est validé côté serveur (valeurs autorisées : STUDENT, PARENT). La protection des routes frontend n'est qu'un confort UX : chaque route API reste vérifiée par le backend.
- **Backend inchangé** : structure du §10 conservée.

## Structure du projet

```
cantine-vatel/
├── README.md
├── AGENTS.md
├── docs/            cahier des charges (spec.md + .docx)
├── frontend/
│   ├── public/
│   └── src/
│       ├── pages/       auth/ admin/ student/ parent/
│       ├── layouts/     auth/ admin/ student/ parent/
│       ├── components/  common/ admin/ student/ parent/
│       ├── routes/      routage et gardes par rôle
│       ├── context/     état d'authentification
│       ├── hooks/  services/  utils/  styles/  assets/
└── backend/
    ├── src/  config/ middlewares/ modules/(15 modules) database/ utils/ app.js server.js
    └── prisma/  schema.prisma  migrations/
```

## Règles clés (extrait du cahier des charges)

- Respecter les mentions **DÉCIDÉ** ; ne pas inventer les **À CONFIRMER** (§19) : les isoler en configuration ou demander.
- Stack : React + JS + Tailwind, Node.js/Express, PostgreSQL, Prisma, Railway.
- Montants en XOF, en entiers ou Decimal, jamais en float.
- Ne jamais passer `req.body` directement à Prisma ; validation stricte (Zod recommandé).
- Idempotence sur paiements, webhooks, réservations et retraits.
- Seul un webhook vérifié crédite un portefeuille, jamais une redirection frontend.
- Aucun solde modifié sans écriture dans le journal financier (Transaction).
- Rôles STUDENT, PARENT, ADMIN ; deny by default ; ADMIN jamais attribuable via une requête.
- Aucun secret dans Git ; données de démonstration clairement fictives.

### 2026-11-21 — Backend : fondations posées

- **Agrégateur de paiement : Jeko** (§8.2) — endpoints réels à intégrer depuis la doc officielle au moment du module `payments/`.
- **Prisma 6.19.3** (et non 7) : le projet backend est en JavaScript pur ; Prisma 7 supprime `prisma-client-js` (client TS-first). `package.json#prisma` est déprécié en v6 mais fonctionnel — migrer vers `prisma.config.ts` si besoin.
- **PostgreSQL en Docker** (`backend/docker-compose.yml`) exposé sur **localhost:5433** : un PostgreSQL 18 natif occupe déjà 5432 sur la machine de dev. Ne pas repasser en 5432.
- **Montants XOF en `Int`** (unités entières) partout — convention unique du §8.5.
- **Anti-surréservation** : compteurs `reservedCount` sur `MenuItem` et `TimeSlot`, à incrémenter via `updateMany` conditionnel atomique dans la transaction de réservation.
- **Règles À CONFIRMER (§19)** isolées dans `.env` : `RESERVATION_CUTOFF_MINUTES`, `CANCELLATION_CUTOFF_MINUTES`, `LOW_BALANCE_THRESHOLD_XOF`, `NOT_COLLECTED_REFUND`. `ParentStudent.status` = `APPROVED` par défaut en attendant la politique de validation du lien.
- Migration `init` appliquée ; client généré. Compteurs/verrous : `Wallet.version`, `CanteenAccount.version` (verrouillage optimiste).

## État d'avancement

- 2026-01 — **Frontend livré (interfaces seules)** : les 16 maquettes de
  `Maquettes Cantine Vatel-project/` sont reproduites dans `frontend/`
  (Vite + React 19 + Tailwind v4 + react-router-dom 7.18.5). Comparaison
  par captures d'écran : identiques aux maquettes, aux mêmes viewports
  (390×844 mobile, 1440×1400 admin). Aucun backend, aucune logique métier ;
  les interactions sont locales (choix de créneau, montant, opérateur,
  bascule allergènes, onglets admin…). Données fictives de maquette.
  `npm run build` OK. Prochaine étape : backend (spec §12+).
- 2026-11-21 — **Backend : schéma Prisma complet migré** (21 modèles,
  migration `init`), dépendances installées, Postgres Docker up.
- 2026-11-21 — **Module `auth` livré et testé** (17 cas passés) : register
  (rôle STUDENT|PARENT validé Zod), login Argon2id, access JWT 15 min +
  refresh opaque 30 j en cookies HttpOnly avec rotation et détection de
  réutilisation, CSRF double-submit (en-tête `x-csrf-token`), verify-email
  et reset mot de passe à usage unique, `/api/auth/google` prêt (503 tant
  que `GOOGLE_CLIENT_ID` absent). Seed : `admin@cantine-vatel.demo`,
  `aya.konan@exemple.ci` (élève, 2500 XOF), `mme.konan@exemple.ci`
  (parent), mdp `VatelDemo2026!`.
- 2026-11-21 — **Modules `wallets` + `transactions` livrés et testés**
  (28 cas passés). Ledger (`transactions/ledger.service.js`) : `postEntry()`
  dans une `prisma.$transaction`, deltas signés sur `Wallet`/`CanteenAccount`
  via `updateMany` conditionnels atomiques (anti-découvert/anti-course),
  snapshots `walletBalanceAfter`/`canteenBalanceAfter`, deltas persistés en
  `metadata` (chaque écriture inversible), idempotence par `idempotencyKey`,
  helpers `creditWalletTopup` / `payMeal` / `withdrawCanteen` /
  `reverseTransaction` prêts pour payments, réservations et retraits.
  Routes : `GET /api/wallets/me` (STUDENT, flag `lowBalance`),
  `GET /api/wallets/canteen` (ADMIN : recettes + passif élèves),
  `GET /api/wallets/:studentId` (PARENT lié APPROVED / ADMIN) ;
  `GET /api/transactions` (portée par rôle, filtres type/status/dates,
  pagination), `GET /api/transactions/:id`, `POST …/adjustment` et
  `POST …/:id/reversal` (ADMIN, audités dans `AuditLog`). Correctif
  `middlewares/validate.js` : Express 5 expose `req.query` en getter —
  `Object.defineProperty` sur l'instance pour injecter les valeurs Zod.
- 2026-11-21 — **Modules `menus` + `reservations` + `distributions` livrés
  et testés** (40 cas passés, boucle P0 complète §18). `menus/` : CRUD
  plats (archivage, jamais de suppression §4), offres datées (garde
  `quantity >= reservedCount`), créneaux configurables ; lecture élève =
  `PUBLISHED`/ouverts seuls + `allergenAlert`/`matchedAllergens` calculés
  sur le profil déclaré (§7). `reservations/` : confirmation atomique dans
  une seule `$transaction` — verrou ligne `StudentProfile FOR UPDATE`
  (sérialise les doubles demandes du même élève sous READ COMMITTED),
  contrôles (offre publiée, créneau ouvert, même date, deadline config
  `RESERVATION_CUTOFF_MINUTES`, blocage allergène déterministe
  `ALLERGEN_BLOCKED`, limite `maxPerStudent`), compteurs `reservedCount`
  incrémentés par `updateMany` conditionnels (un seul gagnant sur la
  dernière portion, §18.8), débit `payMeal` puis `CONFIRMED` + `qrToken`
  opaque. Annulation : transition atomique `CONFIRMED->CANCELLED`,
  décrément des compteurs, remboursement par écriture `REVERSAL` (§8.5).
  `distributions/` (ADMIN) : `POST /scan` (qrToken → `COLLECTED`, second
  scan 409 via transition atomique + unique `reservationId`, date du jour
  vérifiée), `POST /manual` plan B, `GET /` liste du créneau/jour. Dates :
  tout en UTC (Abidjan = UTC+0), `utils/dates.js`. Seed enrichi : plats
  poisson/arachide, 2 offres du jour, 3 créneaux 14h-15h, allergie
  arachide déclarée pour Aya. Prochaine étape : `payments/` (recharge
  parent via agrégateur Jeko + webhook vérifié §8.2) puis
  `students/parents` (liens, allergies), `notifications`, `withdrawals`,
  `statistics`.
- 2026-11 — Écran de lancement : logo Vatel animé (SVG + keyframes CSS,
  ~4,8 s, issu de « Animation du logo Vatel – écran de lancement ») inline
  dans `index.html` (`#splash`, visible avant React) ; `main.jsx` le retire
  en fondu vers ~3 s (fin du reflet). Le loader cv3 reste pour les Suspense.
