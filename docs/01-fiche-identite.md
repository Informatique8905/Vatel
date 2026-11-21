# Fiche d'identité — Cantine Vatel

| Champ | Valeur |
|-------|--------|
| Nom | Cantine Vatel (`cantine-vatel`) |
| Version | 1.0.0 (branche `main`, commit `e3b966f`) |
| Type | Application web mobile-first (PWA) + API REST |
| Objectif | Digitaliser la cantine scolaire : consultation des menus, réservation de repas avec paiement par portefeuille prépayé, recharges parent→élève via agrégateur de paiement (Jeko), distribution par scan QR, gestion des allergies |
| Propriétaire | Vatel — école hôtelière (projet interne, dépôt privé `github.com/Informatique8905/Vatel`) |
| Mainteneur | Équipe projet (agent IA Devin + développeur) |

## Utilisateurs

| Rôle | Description | Accès |
|------|-------------|-------|
| `STUDENT` | Élève **ou** employé (`StudentKind` distingue les deux) | Consulter les menus, réserver, choisir un créneau, gérer son solde, déclarer ses allergies |
| `PARENT` | Parent lié à un ou plusieurs enfants | Recharger le portefeuille de ses enfants, consulter repas/réservations/dépenses |
| `ADMIN` | Personnel de cantine | Publier menus/créneaux, scanner les QR, statistiques, retraits cantine, ajustements financiers audités. Jamais créé via l'inscription |

## Environnements

| Environnement | Localisation | Usage |
|---------------|--------------|-------|
| Développement | `localhost:5173` (Vite) + `localhost:4000` (Express) + PostgreSQL Docker `localhost:5433` | Travail courant |
| Production | Railway (cible définie dans le cahier des charges) | À déployer |

## Technologies

- **Frontend** : React 19.3.1, Vite 8.3.8, react-router-dom 7.18.5, Tailwind CSS 4.3.5, GSAP 3.15.1 — JavaScript/JSX, PWA mobile-first.
- **Backend** : Node.js, Express 5, Prisma 6.19.3 (JS pur), PostgreSQL 17, Zod, argon2, jsonwebtoken, web-push, multer, Cloudinary.
- **Intégrations** : Jeko (paiement mobile money : Wave, Orange, MTN, Moov, Djamo), Resend (e-mails OTP), Cloudinary (images des plats), Web Push VAPID.
- **Dev** : Docker Compose (Postgres), `node --env-file` (pas de dotenv runtime), scripts de tests `.mjs`.

## Références

- Cahier des charges : `docs/spec.md` (+ `.docx` source).
- Règles projet et journal d'avancement : `AGENTS.md`.
