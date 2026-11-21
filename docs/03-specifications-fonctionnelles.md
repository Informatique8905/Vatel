# Spécifications fonctionnelles

Référence : `docs/spec.md`. Règles de gestion effectives incluant les
décisions postérieures (`AGENTS.md`).

## Rôles et permissions

| Action | STUDENT | PARENT | ADMIN |
|--------|:-------:|:------:|:-----:|
| S'inscrire | Oui (élève/employé) | Oui (page dédiée) | **Non** — créé au démarrage (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) |
| Consulter menus/créneaux | PUBLISHED uniquement | Oui (suivi enfant) | Tous statuts |
| Réserver un repas | Oui | Non | Non |
| Annuler une réservation | Oui (avant `CANCELLATION_CUTOFF_MINUTES`) | Non | Oui |
| Recharger un portefeuille | Non | Oui (enfants liés) | Non |
| Publier un menu / créer un créneau | Non | Non | Oui |
| Scanner un QR / remettre un repas | Non | Non | Oui |
| Ajustement / remboursement financier | Non | Non | Oui (audité) |
| Retrait des fonds cantine | Non | Non | Oui |

## Règles de gestion

### RG-AUTH — Authentification

- Inscription : nom, prénom, e-mail, téléphone, mot de passe (+ matricule,
  niveau, classe pour les élèves). Rôle serveur limité à `STUDENT|PARENT`.
- Vérification e-mail par code OTP à 6 chiffres (`OTP_TTL_MINUTES` = 10 min,
  `OTP_MAX_ATTEMPTS` = 5, renvoi espacé de `OTP_RESEND_COOLDOWN_SEC` = 60 s).
- Accès JWT 15 min + refresh opaque 30 j en cookie HttpOnly, avec rotation et
  détection de réutilisation. CSRF double-submit (en-tête `x-csrf-token`).
- Mot de passe oublié : jeton à usage unique (hashé, `AuthToken`).

### RG-MENU — Menus et plats

- Un `Dish` est un référentiel (nom, description, photo, ingrédients,
  allergènes, note de contamination croisée). Jamais supprimé : `archivedAt`.
- Un `MenuItem` expose un plat à une date : prix propre (`price`),
  quantité réservable, statut `DRAFT → PUBLISHED → CLOSED/ARCHIVED`.
- La quantité ne peut pas passer sous `reservedCount`.
- Les photos sont uploadées vers Cloudinary (JPEG/PNG/WebP, magic bytes,
  `UPLOAD_MAX_BYTES` = 5 Mo) — remplacement/suppression ordonnés sans
  laisser d'orphelin.

### RG-SLOT — Créneaux

- `TimeSlot` : `label` requis, horaires en minutes depuis minuit (évite les
  pièges de fuseau — Abidjan = UTC+0, tout en UTC), capacité paramétrable.
- `isOpen` ouvre/ferme le créneau ; `DELETE` interdit si des réservations
  existent (désactiver à la place). Force `force:true` requise pour passer
  la capacité sous `reservedCount`.

### RG-RES — Réservation

- Un seul repas par élève par date (limite `maxPerStudent`, défaut 1).
- Conditions au moment du clic « Réserver » : offre `PUBLISHED`, créneau
  ouvert de la même date, avant `reservationDeadline`/`RESERVATION_CUTOFF_MINUTES`.
- **Blocage allergène** : si un allergène déclaré par l'élève correspond au
  plat → `ALLERGEN_BLOCKED`, réservation impossible (déterministe).
- Transaction atomique : verrou `StudentProfile FOR UPDATE`, contrôles,
  incréments `updateMany` conditionnels `reservedCount < quantity/capacity`
  (un seul gagnant sur la dernière portion), débit `payMeal`, `CONFIRMED` +
  `qrToken` opaque non prédictible.
- `priceSnapshot` fige le prix à la réservation (l'historique ne change pas).
- Annulation : transition atomique `CONFIRMED→CANCELLED`, décrément des
  compteurs, remboursement par écriture `REVERSAL`.

### RG-DIST — Distribution

- Voie principale : scan du `qrToken` (`POST /distributions/scan`) →
  `COLLECTED`. Second scan → `409` (transition atomique + unique).
- La date scannée doit être le jour même.
- Plan B : `POST /distributions/manual` depuis la liste du créneau.
- Fin de service : les `CONFIRMED` non récupérées passent `NOT_COLLECTED` ;
  le débit est conservé ou remboursé selon `NOT_COLLECTED_REFUND` (À CONFIRMER).

### RG-WALLET — Portefeuille

- Un `Wallet` par élève (XOF entier). Modifié **uniquement** via `postEntry`
  du ledger : deltas signés par `updateMany` conditionnels (anti-découvert),
  snapshots `walletBalanceAfter`/`canteenBalanceAfter`, métadonnées de
  chaque écriture (inversibilité), idempotence par `idempotencyKey`.
- Solde faible : flag `lowBalance` si `< LOW_BALANCE_THRESHOLD_XOF` (500 XOF).

### RG-PAY — Recharge parent (Jeko)

- `POST /payments/topups` : parent lié (`ParentStudent` `APPROVED`) →
  `PaymentIntent` + contact Jeko + checkout hébergé (`redirectUrl` renvoyée).
- **Seul le webhook vérifié crédite** (`/api/webhooks/jeko`, corps brut +
  HMAC-SHA256 + `WebhookEvent` anti-rejeu). Une redirection frontend
  n'est jamais une confirmation.
- Statuts définitifs seulement : `SUCCEEDED` → crédit `TOPUP` ;
  `FAILED` → échec. `PENDING` n'entraîne aucun crédit. `TOPUP_EXPIRES_MINUTES`
  = 30 min.

### RG-WDR — Retrait cantine

- `POST /withdrawals` (ADMIN) : fonds réservés par `WITHDRAWAL`, appel
  fournisseur ; en cas d'échec les fonds sont libérés par `REVERSAL`.
- `PROCESSING` reste en attente si le résultat fournisseur est inconnu.

### RG-LINK — Liaison parent–enfant

- Un seul jeton sert de QR et de lien d'invitation (`tokenHash` SHA-256,
  `expiresAt`, usage unique). Claim par l'utilisateur authentifié de rôle
  complémentaire → **APPROVED immédiat** (décision produit).
- Révocation bilatérale ou admin, auditée ; `REVOKED` coupe tout accès.

### RG-NOTIF — Notifications

- Notification persistée + push Web Push best-effort (VAPID ; sans clés,
  historique seul — dégradation gracieuse). Jamais dans la transaction métier.
- Événements : réservation confirmée (élève + parents), échec (élève seul),
  annulation, recharge SUCCEEDED/FAILED, rappels créneau, liaison créée/révoquée.
- Rappels `ScheduledReminder` : worker `setInterval` (`REMINDER_POLL_MS`),
  claim atomique `updateMany`, récupération des claims PROCESSING > 2 min
  (crash), vérifie `status === CONFIRMED` à l'envoi, retries
  `REMINDER_MAX_ATTEMPTS`. Rappels parents : opt-in désactivé par défaut.

## Erreurs attendues

| Code | Situation |
|------|-----------|
| `400` | Validation Zod échouée (détails `issues`), champs manquants |
| `401` | Non authentifié / jeton expiré / OTP invalide |
| `403` | Rôle insuffisant (deny by default), CSRF absent |
| `404` | Ressource inexistante ou hors portée |
| `409` | Dernière portion prise, QR déjà scanné, liaison doublon, OTP verrouillé |
| `410` | Endpoint push révoqué (désactivation douce) |
| `422` | `ALLERGEN_BLOCKED`, hors délai réservation/annulation, solde insuffisant |
| `429` | Rate limit (`/api` global, `authLimiter` renforcé) |
| `503` | `JEKO_NOT_CONFIGURED` (clés absentes), VAPID absent, Google SSO absent |

## Données de démonstration

`prisma/seed.js` : `admin@cantine-vatel.demo`, `aya.konan@exemple.ci` (élève,
2 500 XOF, allergie arachide), `mme.konan@exemple.ci` (parent) — mot de passe
`VatelDemo2026!`. Plats avec et sans allergène, offres du jour, créneaux
14 h–15 h. **Fictif, jamais en production.**
