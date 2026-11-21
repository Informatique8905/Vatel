# Cahier des charges fonctionnel

Le cahier des charges complet est la référence fonctionnelle du projet :

- **`docs/spec.md`** — version markdown de référence (à consulter en priorité).
- **`docs/cahier_des_charges_cantine_vatel_agent_ia.docx`** — document source original.

Ce document résume le périmètre et renvoie aux sections pertinentes.

## Objet

Application de cantine scolaire : menus de la semaine, réservation de repas
payée par un portefeuille élève prépayé, rechargement par les parents via
mobile money, distribution par scan QR, gestion des allergies et signalements.

## Périmètre

### Inclus

- Authentification par e-mail + OTP (Resend) et mot de passe Argon2id (§12).
- Espace élève/employé : menus, plats, allergènes, réservation + créneau,
  ticket QR, portefeuille, historique, profil alimentaire.
- Espace parent : liaison à l'enfant, recharge Jeko, suivi des repas et dépenses.
- Espace admin : gestion des plats/menus/créneaux, distribution par scan QR
  (plan B manuel), retraits cantine, ajustements audités.
- Notifications in-app + push Web Push (réservations, recharges, rappels créneau).
- Journal financier double entrée : toute modification de solde passe par une
  `Transaction` ; corrections par écriture `REVERSAL`/`ADJUSTMENT` (§8.5).

### Hors périmètre actuel

- Paiement à la volée (tout paiement passe par le portefeuille prépayé).
- Modules prévus non implémentés : `stock`, `statistics`, `issue-reports`,
  `allergies`, `students`, `users` (répertoires en attente, `.gitkeep`).
- Service worker PWA et page notifications côté frontend.

## Contraintes clés

- Montants en **XOF entiers** (`Int` Prisma), jamais en float.
- **Idempotence** sur paiements, webhooks, réservations et retraits.
- **Deny by default** : rôles STUDENT / PARENT / ADMIN vérifiés par le backend ;
  ADMIN jamais attribuable via une requête.
- Réservation bloquée si allergène déclaré correspondant au plat (§7).
- Aucune suppression de plat : archivage uniquement (§4).
- Un seul scan QR par réservation (transition atomique + unique `reservationId`).

## Règles « À CONFIRMER » (§19) isolées en configuration

| Variable | Valeur provisoire | Rôle |
|----------|-------------------|------|
| `RESERVATION_CUTOFF_MINUTES` | 120 | Heure limite de réservation avant le service |
| `CANCELLATION_CUTOFF_MINUTES` | 60 | Délai d'annulation autorisé |
| `LOW_BALANCE_THRESHOLD_XOF` | 500 | Seuil d'alerte solde faible |
| `NOT_COLLECTED_REFUND` | false | Politique repas non récupéré |

## Décisions postérieures au cahier des charges

Consignées dans `AGENTS.md` — elles **priment** sur le cahier des charges :

- Frontend unique (`frontend/`) avec trois espaces routés au lieu de trois
  applications séparées.
- Agrégateur de paiement retenu : **Jeko** (checkout hébergé + webhook vérifié).
- PostgreSQL local sur le port **5433** (5432 occupé par un Postgres natif).
- Prisma **6.19.3** (projet JS ; Prisma 7 est TS-first).
