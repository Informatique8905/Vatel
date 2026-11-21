# Documentation des API

Base : `http://localhost:4000/api` (dev). JSON `application/json`, corps
limité à 100 ko. Préfixe commun `/api` — voir `backend/src/app.js`.

## Authentification

- **JWT access** (15 min) + **refresh opaque** (30 j) en **cookies HttpOnly**
  (`SameSite` + `Secure` en prod). Rotation du refresh à chaque appel ;
  réutilisation détectée → révocation de la session.
- **CSRF double-submit** : en-tête `x-csrf-token` requis sur les mutations
  (cookie CSRF non HttpOnly lu par le frontend).
- Rôles : `STUDENT`, `PARENT`, `ADMIN` — `requireRole` vérifie le JWT.

## Format des réponses

- Succès : `200`/`201` + corps JSON (objet ou `{ data, pagination }`).
- Erreur : `{ "error": { "code": "…", "message": "…" } }` + statut HTTP.
- Validation Zod : `400` avec détails `issues`.

## Routes

### Auth — `/api/auth` (`authLimiter` renforcé sur les routes sensibles)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/register` | — | Inscription (nom, prénom, e-mail, tel, mot de passe ; `role` STUDENT\|PARENT) |
| POST | `/login` | — | Connexion → cookies JWT |
| POST | `/google` | — | Connexion Google (`503` si `GOOGLE_CLIENT_ID` absent) |
| POST | `/refresh` | cookie refresh | Rotation access+refresh |
| POST | `/logout` | — | Révocation de la session |
| GET | `/me` | JWT | Utilisateur courant |
| POST | `/verify-email` | — | Code OTP 6 chiffres |
| POST | `/resend-otp` | — | Renvoi OTP (cooldown 60 s) |
| POST | `/forgot-password` | — | Demande de reset |
| POST | `/reset-password` | — | Nouveau mot de passe via jeton |

### Wallets — `/api/wallets`

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/me` | STUDENT | Mon portefeuille + flag `lowBalance` |
| GET | `/canteen` | ADMIN | Recettes + passif élèves |
| GET | `/:studentId` | PARENT lié APPROVED / ADMIN | Portefeuille d'un élève |

### Transactions — `/api/transactions`

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/` | tous | Historique (portée par rôle, filtres type/status/dates, pagination) |
| POST | `/adjustment` | ADMIN | Correction comptable (auditée) |
| GET | `/:id` | tous | Détail d'une écriture |
| POST | `/:id/reversal` | ADMIN | Contre-écriture `REVERSAL` (originale jamais modifiée) |

### Menus — `/api/menus`

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/dishes` | ADMIN | Liste des plats |
| POST | `/dishes` | ADMIN | Créer un plat |
| PATCH | `/dishes/:id` | ADMIN | Modifier un plat |
| DELETE | `/dishes/:id` | ADMIN | **Archiver** (jamais supprimer) |
| POST | `/dishes/:id/image` | ADMIN | Photo Cloudinary (multipart champ `image`, JPEG/PNG/WebP, 5 Mo) |
| DELETE | `/dishes/:id/image` | ADMIN | Retirer la photo |
| GET | `/items` | tous | Offres datées (élèves : `PUBLISHED` + `allergenAlert`/`matchedAllergens`) |
| POST | `/items` | ADMIN | Publier une offre |
| GET | `/items/:id` | tous | Détail d'une offre |
| PATCH | `/items/:id` | ADMIN | Modifier (quantité ≥ `reservedCount`) |
| GET | `/slots` | STUDENT / ADMIN | Créneaux (`?date=YYYY-MM-DD`) |
| POST | `/slots` | ADMIN | Créer (`date` ou `dates[]` bulk) |
| GET | `/slots/:id` | STUDENT / ADMIN | Détail créneau |
| PATCH | `/slots/:id` | ADMIN | Modifier (horaires/capacité, gardes) |
| POST | `/slots/:id/activate` `/deactivate` | ADMIN | Ouvrir / fermer |
| DELETE | `/slots/:id` | ADMIN | Supprimer si sans réservation (sinon `409` → désactiver) |

### Réservations — `/api/reservations`

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/` | STUDENT | Réserver (`menuItemId`, `timeSlotId`, `idempotencyKey` optionnel) |
| GET | `/` | tous | Liste (portée par rôle) |
| GET | `/:id` | tous | Détail (propriétaire / parent lié / admin) |
| POST | `/:id/cancel` | STUDENT / ADMIN | Annuler dans le délai |

### Distribution — `/api/distributions` (ADMIN)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/scan` | `qrToken` → `COLLECTED` (date du jour, second scan `409`) |
| POST | `/manual` | Plan B : remise manuelle depuis la liste |
| GET | `/` | Liste du créneau/jour |

### Paiements — `/api/payments`

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/topups` | PARENT | Initier une recharge (`studentId`, `amount`, `operator`, `payerPhone`) → `redirectUrl` Jeko |
| GET | `/` | tous | Mes recharges |
| GET | `/:id` | tous | Détail |
| GET | `/:id/status` | tous | Réconciliation du statut |

### Webhook Jeko — `/api/webhooks/jeko` (corps brut, non authentifié)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/` | En-têtes `Jeko-Signature` + `Jeko-Event` ; HMAC-SHA256 `JEKO_WEBHOOK_SECRET` ; `WebhookEvent` anti-rejeu ; `SUCCEEDED`→crédit `TOPUP` |

### Retraits — `/api/withdrawals` (ADMIN)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/` | Retrait cantine (`operator`, `beneficiary`, `amount`, `idempotencyKey`) |
| GET | `/` | Liste |
| GET | `/:id` | Détail |

### Notifications — `/api/notifications`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Mes notifications |
| POST | `/read-all` | Tout marquer lu |
| POST | `/:id/read` | Marquer lu |
| GET / PATCH | `/preferences` | Préférences (rappels créneau, rappels enfants) |

### Push — `/api/push`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/vapid-key` | Clé publique VAPID (`503` sans config) |
| POST | `/subscriptions` | Abonnement (`endpoint`, `p256dh`, `auth`) |
| DELETE | `/subscriptions` | Désabonnement |

### Liaisons parent–enfant — `/api/links` + `/api/parents`

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/links/invitations` | STUDENT / PARENT | Créer un jeton (QR ou lien) |
| GET | `/links/invitations` | STUDENT / PARENT | Mes invitations |
| DELETE | `/links/invitations/:id` | STUDENT / PARENT | Révoquer une invitation |
| POST | `/links/claim` | STUDENT / PARENT | Consommer un jeton → `APPROVED` |
| GET | `/links` | tous | Mes liaisons |
| DELETE | `/links/:id` | tous / ADMIN | Révoquer |
| GET | `/parents/children` | PARENT | Mes enfants liés |

## Exemples

```bash
# Connexion
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"aya.konan@exemple.ci","password":"VatelDemo2026!"}'

# Réserver (CSRF requis)
curl -b cookies.txt -X POST http://localhost:4000/api/reservations \
  -H 'content-type: application/json' -H "x-csrf-token: $CSRF" \
  -d '{"menuItemId":"…","timeSlotId":"…","idempotencyKey":"cli-001"}'

# Recharger (parent)
curl -b cookies.txt -X POST http://localhost:4000/api/payments/topups \
  -H 'content-type: application/json' -H "x-csrf-token: $CSRF" \
  -d '{"studentId":"…","amount":5000,"operator":"WAVE","payerPhone":"+225…"}'
```
