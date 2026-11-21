# Modèle de données

Source de vérité : `backend/prisma/schema.prisma` (Prisma 6.19.3, PostgreSQL).
24 modèles, 20 enums. Dates en UTC (Abidjan = UTC+0). Montants en `Int` XOF.

## Diagramme des relations principales

```
User ──1:1── StudentProfile ──1:1── Wallet
  │                │
  │                ├─── N:N (StudentAllergen) ─── Allergen ─── N:N (DishAllergen) ─── Dish
  │                ├─── N:N (StudentRestriction) ─ DietaryRestriction              │
  │                ├─── 1:N Reservation ───────────► MenuItem ─── N:1 ─────────────┘
  │                │        │                                        ▲
  │                │        ├──── 1:1 DistributionRecord             │
  │                │        └──── N:1 TimeSlot                       │
  │                ├─── 1:N PaymentIntent (élève crédité)            │
  │                └─── N:M ParentStudent ◄──── N:1 User (parent)    │
  │                          ▲                                     │
  └────────── LinkInvitation (claim par rôle complémentaire)       │
                                                                   │
CanteenAccount (singleton id=1)                                    │
Transaction (ledger, liens Wallet/Reservation/PaymentIntent/Withdrawal)
IssueReport (auteur → Dish / MenuItem / alternative Dish)
Notification ◄── User ; PushSubscription ◄── User
ScheduledReminder ──► Reservation + User
AuditLog (acteur User, ressource, résultat)
RefreshToken / AuthToken (OTP) ──► User
WebhookEvent (idempotence Jeko) ; JekoContact ; Withdrawal
```

## Entités

### Identité

| Modèle | Rôle | Champs / contraintes clés |
|--------|------|---------------------------|
| `User` | Compte (3 rôles) | `email` unique, `passwordHash` (null si Google), `googleId` unique, `role`, `status`, `emailVerifiedAt`, préférences notif |
| `StudentProfile` | Élève/employé | `userId` unique, `kind` (STUDENT/EMPLOYEE), `matricule` unique, `level`, `grade` |
| `ParentStudent` | Lien parent↔enfant | unique `(parentId,studentId)`, `status` (PENDING/APPROVED/REVOKED), `method`, `initiatedById`, `approvedAt`, `revokedAt`, `revokedById` |
| `LinkInvitation` | Jeton liaison | `tokenHash` unique (jamais en clair), `expiresAt`, `usedAt`/`usedById` (usage unique), `revokedAt` |
| `RefreshToken` | Session | `tokenHash` unique, `expiresAt`, `revokedAt` |
| `AuthToken` | OTP | `tokenHash` unique, `type` (EMAIL_VERIFICATION/PASSWORD_RESET), `attempts` (verrouillage), `expiresAt`, `usedAt` |

### Finances

| Modèle | Rôle | Champs / contraintes clés |
|--------|------|---------------------------|
| `Wallet` | Portefeuille élève | `studentId` unique, `balance` Int XOF, `version` (verrou optimiste) |
| `CanteenAccount` | Caisse cantine | Singleton `id=1`, `balance`, `version` |
| `Transaction` | Écriture ledger | `reference` unique, `type`, `status`, `amount` > 0, `walletBalanceAfter`/`canteenBalanceAfter` (snapshots), `reservationId`/`paymentIntentId` uniques, `idempotencyKey` unique, `metadata` (deltas) |
| `PaymentIntent` | Recharge Jeko | `reference` unique, `providerRef` unique, `redirectUrl`, `status` CREATED→PENDING→SUCCEEDED/FAILED/EXPIRED, `operator`, `payerPhone` |
| `WebhookEvent` | Anti-rejeu | `eventId` unique, `signatureOk`, `payload` Json, `status` RECEIVED/PROCESSED/FAILED/IGNORED |
| `JekoContact` | Contact fournisseur | `contactId` unique, unique `(operator,phone)` |
| `Withdrawal` | Retrait cantine | `reference` unique, `status` REQUESTED→PROCESSING→SUCCEEDED/FAILED/CANCELLED, `idempotencyKey` unique, `providerRef` unique, `fees` |

### Cantine

| Modèle | Rôle | Champs / contraintes clés |
|--------|------|---------------------------|
| `Dish` | Référentiel plat | `photoUrl` + `photoPublicId` (Cloudinary), `ingredients`, `crossContaminationNote`, `allergenInfoVerified`, `archivedAt` |
| `MenuItem` | Offre datée | `(dishId)` + `date` (`@db.Date`), `price`, `quantity`, `reservedCount`, `maxPerStudent`, `status` (DRAFT/PUBLISHED/CLOSED/ARCHIVED), `reservationDeadline` |
| `TimeSlot` | Créneau | `label` requis, unique `(date,startMinutes)`, `startMinutes`/`endMinutes`, `capacity`, `reservedCount`, `isOpen`, index `(date,isOpen)` |
| `Reservation` | Commande | `qrToken` unique opaque, `priceSnapshot`, `status` PENDING/CONFIRMED/CANCELLED/COLLECTED/NOT_COLLECTED, `idempotencyKey` unique, `confirmedAt`/`cancelledAt`/`collectedAt` |
| `DistributionRecord` | Remise repas | `reservationId` unique (un seul scan), `method` QR_SCAN/MANUAL, `collectedAt` |

### Alimentation

| Modèle | Rôle | Clés |
|--------|------|------|
| `Allergen` | Référentiel | `code` unique |
| `DietaryRestriction` | Référentiel | `code` unique |
| `StudentAllergen` | Lien élève↔allergène | PK `(studentId,allergenId)` |
| `StudentRestriction` | Lien élève↔restriction | PK `(studentId,restrictionId)` |
| `DishAllergen` | Lien plat↔allergène | PK `(dishId,allergenId)` |
| `IssueReport` | Signalement | `category`, `status` (OPEN→IN_PROGRESS→RESOLVED/DISMISSED), `alternativeDishId` |

### Notifications & audit

| Modèle | Rôle | Clés |
|--------|------|------|
| `Notification` | In-app | `dedupeKey` unique, `channel`, `status`, `payload` Json, index `(userId,status)` |
| `PushSubscription` | Web Push | `endpoint` unique, `p256dh`, `auth`, `disabledAt` (douce 404/410) |
| `ScheduledReminder` | Rappel créneau | `dedupeKey` unique (`reservationId:userId:type`), `runAt`, `status`, `attempts`, `lastError`, `updatedAt` (claims orphelins) |
| `AuditLog` | Traçabilité | `action`, `resourceType/Id`, `result`, `ip`, `metadata`, index `(actorId,createdAt)` + `(resourceType,resourceId)` |

## Règles d'intégrité

- **Suppression** : `onDelete: Cascade` seulement pour les liens purement
  techniques (profil, jetons, liens N:N) ; jamais pour les données métier
  (archivage/révocation à la place).
- **Compteurs** `reservedCount` : incrémentés uniquement par `updateMany`
  conditionnel atomique dans la transaction métier.
- **Unicités métier** : `(parentId,studentId)`, `(date,startMinutes)`,
  `(operator,phone)`, `qrToken`, `reference`, `providerRef`, `eventId`,
  `dedupeKey`, `idempotencyKey`, `reservationId` (Transaction & Distribution).
- **Horaires** en `Int` minutes depuis minuit — pas de `Time`/`Timestamp`
  pour les créneaux (évite les dérives de fuseau).

## Migrations

`prisma/migrations/` versionnées : `init`, `registration_fields`,
`otp_codes`, `jeko_contacts`, `payment_redirect_url`, `dish_photo_public_id`,
`timeslot_label`, `notifications_links`, `reminder_updated_at`.
Commande : `npx prisma migrate dev` (dev) / `migrate deploy` (prod).
