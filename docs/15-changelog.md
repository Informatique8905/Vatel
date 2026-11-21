# Journal des modifications (changelog)

Historique fonctionnel — voir `git log` pour la granularité commit.
Convention : date — type — description.

## 2026-11-22 — Merge `main` + `Alakpone` (`e3b966f`)

- **Fusion** des deux branches : backend complet + interface élève/admin
  retravaillée sur `main` unique.
- Conflits résolus : `LoginPage`/`RegisterPage` = API réelle de `main`
  + mise en page d'`Alakpone` ; `AppRoutes` = union (routes dédiées
  parent/admin + vérification e-mail + mot de passe oublié) ; `AGENTS.md`
  = union des entrées d'avancement.

## 2026-11 — Backend complet (`f2a513e`)

- **Auth** : inscription/login OTP e-mail (Resend), JWT 15 min + refresh
  rotatif 30 j (HttpOnly, détection de réutilisation), Argon2id, CSRF
  double-submit, verify-email + reset à usage unique, route Google OAuth
  (`503` sans clé).
- **Finances** : ledger double entrée `postEntry` (deltas signés
  conditionnels, snapshots, idempotence), wallets, `adjustment`/`reversal`
  audités.
- **Menus/réservations/distributions** : offres datées, anti-surréservation
  atomique, blocage allergène, `qrToken` usage unique, plan B manuel.
- **Paiements** : Jeko checkout hébergé + webhook HMAC-SHA256 anti-rejeu ;
  contacts Jeko, `redirectUrl`, réconciliation `/status`.
- **Retraits** : fonds réservés, `REVERSAL` si échec, `PROCESSING` si
  résultat inconnu.
- **Notifications** : persistées + Web Push VAPID best-effort ; worker
  `jobs/reminders.js` (claims atomiques, récupération de claims orphelins,
  rappels créneau, parents opt-in off par défaut).
- **Liaisons** : jeton unique QR/lien, `tokenHash`, APPROVED immédiat au
  claim, révocation bilatérale auditée.
- **Admin** : `ensureAdmin` bootstrap (refus de démarrer en prod sans
  variables) ; images Cloudinary (magic bytes, remplacement ordonné).
- **Pages auth frontend** : vérification e-mail, mot de passe oublié.

## 2026-11 — Frontend `Alakpone` (`030cf2c` et antérieurs)

- **Carrousel de plats** `DishOrbitCarousel` : orbite GSAP continue
  (suivi scroll + geste, snapping, inertie, interruptible), `DishPlate`
  (photo admin ou assiette stylisée en fallback), filtres par jour,
  blocage allergène, « Réserver » compact.
- **Accueil** : salutation, solde masquable, plat du jour, ruban semaine.
- **Créneau** (`SlotPage`) : extras Jus/Fruits/Dessert déplacés ici,
  sélection de créneau, totaux dynamiques, « Maintenir pour payer ».
- **Profil** : allergies + allergies personnalisées + restrictions +
  compte, layout à plat (l'accordéon a été essayé puis annulé à la
  demande de l'utilisateur).
- **Écran de lancement** : logo Vatel animé SVG inline avant React.
- **UI** : loader cv3, lazy-loading des routes, tab bar « liquide »,
  retour tactile (scale + teinte) sur les boutons, `kbr.jsx` custom
  elements (`vatel-*`).
- **Pages auth dédiées** : `/connexion/parent`, `/inscription/parent`,
  `/connexion/admin` (navigation mock en attendant le branchement).

## 2026-01 — Maquettes → frontend (commit initial `8d01752`)

- 16 maquettes reproduites (390×844 / 1440×1400), Vite + React 19 +
  Tailwind 4, trois espaces routés, interactions locales, données fictives.

## Incompatibilités / notes de migration

- Le frontend métier consomme encore `src/data/weekMenu.js` (fictif) ;
  branchement sur `/api/menus`, `/api/reservations`, `/api/wallets` prévu.
- Schéma Prisma : migrations cumulées depuis `init` — voir
  `05-modele-de-donnees.md`.
- PostgreSQL local sur **5433** (ne pas repasser en 5432).
