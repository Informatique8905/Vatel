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

## État d'avancement

- 2026-01 — **Frontend livré (interfaces seules)** : les 16 maquettes de
  `Maquettes Cantine Vatel-project/` sont reproduites dans `frontend/`
  (Vite + React 19 + Tailwind v4 + react-router-dom 7.18.5). Comparaison
  par captures d'écran : identiques aux maquettes, aux mêmes viewports
  (390×844 mobile, 1440×1400 admin). Aucun backend, aucune logique métier ;
  les interactions sont locales (choix de créneau, montant, opérateur,
  bascule allergènes, onglets admin…). Données fictives de maquette.
  `npm run build` OK. Prochaine étape : backend (spec §12+).
- 2026-11 — Tab bar « liquide » animée : `frontend/src/components/common/LiquidTabBar.jsx`
  remplace `TabBar` dans `StudentLayout` et `ParentLayout` (même prop `items`,
  plus `index`/`onChange`/`colors`/`config`). Écran de démo : route `/demo`
  (`pages/common/TabBarDemoPage.jsx`). Physique pure dans `computeFrame`,
  animation interruptible via `requestAnimationFrame`.
- 2026-11 — Loader unique « three-body » : `components/common/Loader.jsx`
  (`Loader` + `PageLoader`, marine #072A5D). Toutes les pages sont en
  `React.lazy` ; `Suspense` dans chaque layout (`PageLoader`) + fallback
  racine dans `AppRoutes`. Même loader en statique dans `index.html`
  (affiché avant le montage React).
- 2026-11 — Refonte accueil + menu élève : `components/common/DishOrbitCarousel.jsx`
  (adaptation JSX du modèle « dish-orbit-carousel » 21st.dev, MIT — GSAP +
  ScrollTrigger, orbite d'assiettes, titre 2 graisses, swipe/pager/clavier,
  boucle) sur `/student/menu` + « La semaine en résumé ». Données fictives
  dans `data/weekMenu.js` (champ `image` null → photo ajoutée par l'admin
  plus tard). `components/common/DishPlate.jsx` = visuel unique : photo ou
  assiette de remplacement teintée (`accent`), réutilisé accueil + listes.
  Plat allergène : bannière rouge + « Indisponible » (réservation bloquée) ;
  « non vérifiés » : bandeau jaune. Accueil : salutation, carte solde marine
  avec masquage, plat du jour avec visuel, ruban « Cette semaine ».
  Moteur continu : position flottante (scroll + glisser + flèches) suivie
  par interpolation exponentielle dans `gsap.ticker` (aucun re-render par
  frame, styles écrits directement), calage ScrollTrigger `snap`, inertie
  du glisser ; réglages `PER_DISH`, `SPACING`, `FOLLOW` en tête de fichier. Overlay de 10 s réservé aux actions :
  `useActionLoader`/`LoadingOverlay` (`ACTION_LOAD_MS = 10_000`) sur
  connexion, inscription, paiement → ticket (`SlotPage`), recharge
  (`TopUpPage`).
