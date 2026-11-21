# Guide d'administration

Opérations réservées au rôle **ADMIN** — toutes auditées dans `AuditLog`.

## Compte admin

- Créé au démarrage par `bootstrap/ensureAdmin.js` depuis `ADMIN_USERNAME`
  + `ADMIN_PASSWORD` — **jamais via l'inscription** (spec §12.2).
- Idempotent : ne réécrit jamais le mot de passe ; **refuse de démarrer
  en prod** si les variables sont absentes.
- Rotation : changer `ADMIN_PASSWORD` et redémarrer ne modifie pas un compte
  existant — mise à jour via base/seed si nécessaire.

## Gestion des plats (`/api/menus/dishes`)

- **Créer** : nom, description, ingrédients, allergènes (`DishAllergen`),
  `crossContaminationNote`, `allergenInfoVerified` (à passer `true` une fois
  la fiche vérifiée).
- **Modifier** : `PATCH` — la fiche s'applique à toutes les offres futures.
- **Archiver** (`DELETE`) : jamais de suppression (spec §4) — les offres et
  réservations existantes sont conservées.
- **Photo** : `POST /dishes/:id/image` (multipart `image`, JPEG/PNG/WebP,
  5 Mo) → Cloudinary ; `DELETE` retire proprement (`photoPublicId`).

## Offres et créneaux

- **`POST /menus/items`** : plat + date + prix + quantité + statut.
  Quantité jamais < `reservedCount`.
- **`POST /menus/slots`** : `label` requis, `date` ou `dates[]` bulk,
  `startMinutes`/`endMinutes` (minutes depuis minuit), `capacity`.
- Gardes : capacité < `reservedCount` → `force:true` ; horaires sur créneau
  utilisé → `force:true` ; `DELETE` interdit si réservations → désactiver.

## Distribution

- `POST /distributions/scan` : `qrToken` → `COLLECTED` (jour même uniquement).
- `POST /distributions/manual` : plan B (panne, QR illisible).
- `GET /distributions?date&timeSlotId` : liste du créneau (préparé/en attente).
- Fin de service : les non-récupérés passent `NOT_COLLECTED` — politique de
  remboursement via `NOT_COLLECTED_REFUND` (À CONFIRMER).

## Opérations financières (sensibles)

| Opération | Route | Effet | Audit |
|-----------|-------|-------|-------|
| Ajustement | `POST /transactions/adjustment` | Correction comptable | `AuditLog` |
| Contre-écriture | `POST /transactions/:id/reversal` | Annule une écriture (originale inchangée) | `AuditLog` |
| Retrait | `POST /withdrawals` | Sortie des fonds cantine vers un compte mobile money | `AuditLog` + fonds réservés puis libérés par `REVERSAL` si échec |

**Règles** : jamais de `UPDATE` direct sur `Wallet`/`CanteenAccount` ;
toujours passer par `postEntry`. `idempotencyKey` unique obligatoire sur
les opérations rejouables.

## Liaisons parent–enfant

- `GET /links` : toutes les liaisons ; `DELETE /links/:id` : révoquer
  (auditée, `revokedAt`/`revokedById`).
- Une liaison `REVOKED` coupe immédiatement l'accès du parent aux données
  de l'enfant (portefeuille, repas).

## Signalements (`IssueReport`)

Les élèves signalent un plat depuis le menu (allergie, intolérance,
autre). Traitement : `OPEN → IN_PROGRESS → RESOLVED|DISMISSED`,
`adminNote`, `alternativeDishId` (alternative vérifiée proposée).

## Configuration d'exploitation

- Variables §19 à confirmer avec la direction :
  `RESERVATION_CUTOFF_MINUTES` (120), `CANCELLATION_CUTOFF_MINUTES` (60),
  `LOW_BALANCE_THRESHOLD_XOF` (500), `NOT_COLLECTED_REFUND` (false).
- `REMINDER_POLL_MS`, `REMINDER_MAX_ATTEMPTS` : cadence/retries du worker
  de rappels créneau.
- `UPLOAD_MAX_BYTES` : plafond d'images (défaut 5 Mo).

## Bonnes pratiques

- Ne jamais désactiver `auditLog` : les opérations sensibles doivent rester
  traçables (spec §12.4).
- Avant une intervention sur les soldes, capturer `GET /wallets/canteen`
  (recettes + passif élèves).
- Suspendre un compte : `User.status = SUSPENDED` — les réservations et
  le solde restent intacts ; l'accès est coupé.
