# Plan de tests et cas de tests

## Approche

- **Tests backend** : scripts `.mjs` exécutés contre une base de test
  (`node --env-file=.env scripts/<script>.mjs`) — scénarios bout-en-bout
  sur les services et routes réelles. Voir `backend/scripts/` et
  `backend/test-links-notifications.mjs`.
- **Frontend** : vérification par captures navigateur (browser automation)
  aux viewports maquettes (390×844 mobile, 1440×1400 admin) + `npm run build`.
- **Non couvert pour l'instant** : tests unitaires frontend automatisés,
  tests de charge.

## Scripts existants

| Script | Portée | Cas |
|--------|--------|-----|
| `scripts/test-financial.mjs` | Wallets, ledger, réservations, paiements Jeko, webhooks, retraits | 189 cas |
| `scripts/test-slots.mjs` | Créneaux et concurrence | 26 cas dont **course sur la dernière place** |
| `scripts/test-admin-images.mjs` | Upload/remplacement/suppression d'images de plats | 99 cas |
| `test-links-notifications.mjs` | Liaisons parent–enfant, notifications, worker rappels | 69 cas |

## Scénarios fonctionnels (checklist)

### Authentification

- [ ] Inscription élève (tous champs) → OTP → e-mail vérifié → login
- [ ] Inscription parent → redirection `/verification` → espace parent
- [ ] Mot de passe oublié → reset → nouveau login OK, ancien KO
- [ ] Refresh expiré → rotation ; refresh réutilisé → session révoquée
- [ ] Login avec mauvais mot de passe → 401 neutre

### Menus et réservation

- [ ] Élève voit uniquement les offres `PUBLISHED`
- [ ] Plat allergène → `allergenAlert` + blocage `ALLERGEN_BLOCKED`
- [ ] Réservation OK → `CONFIRMED`, solde débité, qrToken émis,
      `reservedCount` +1
- [ ] Dernière portion : 2 réservations simultanées → 1 seule `CONFIRMED`
- [ ] Hors délai (`RESERVATION_CUTOFF_MINUTES`) → refus
- [ ] `idempotencyKey` rejouée → même réservation, pas de doublon
- [ ] Annulation dans le délai → `CANCELLED` + `REVERSAL` + compteurs −1
- [ ] Annulation hors délai → refus

### Distribution

- [ ] Scan valide le jour J → `COLLECTED`
- [ ] Second scan → `409`
- [ ] Scan d'une réservation annulée / d'un autre jour → refus
- [ ] Plan B manuel → `COLLECTED` avec `DistributionRecord` `MANUAL`

### Recharges (Jeko)

- [ ] `topups` → `PaymentIntent` + `redirectUrl` retournée
- [ ] Webhook signé `SUCCEEDED` → crédit `TOPUP`, notification
- [ ] Webhook `PENDING` → aucun crédit
- [ ] Webhook rejoué (même `eventId`) → `IGNORED`, pas de double crédit
- [ ] Webhook signature invalide → refus, `signatureOk=false` persisté
- [ ] Sans clés Jeko → `503 JEKO_NOT_CONFIGURED`

### Finances admin

- [ ] `adjustment` → écriture tracée dans `AuditLog`
- [ ] `reversal` → contre-écriture, originale inchangée
- [ ] Retrait → `WITHDRAWAL` réservé ; échec fournisseur → `REVERSAL`
- [ ] Solde jamais négatif (anti-découvert par `updateMany` conditionnel)

### Liaisons

- [ ] Jeton créé → claim par rôle complémentaire → `APPROVED`
- [ ] Jeton expiré / déjà utilisé / révoqué → refus
- [ ] Révocation → accès parent coupé immédiatement
- [ ] Parent lié voit wallet + repas de l'enfant ; non lié → 403/404

### Notifications

- [ ] Réservation confirmée → notif élève + parents APPROVED
- [ ] Échec réservation → notif élève seul (« aucun montant débité »)
- [ ] Rappel créneau émis à `runAt` si `CONFIRMED` ; `CANCELLED` si annulée
- [ ] Sans VAPID → notification en historique, pas d'erreur

## Tests négatifs transverses

- Corps malformé / champs manquants → `400` (détails Zod)
- Rôle insuffisant → `403` ; non authentifié → `401`
- CSRF absent sur mutation → `403`
- Solde insuffisant → refus sans écriture
- Quantité/capacité sous `reservedCount` → refus (sauf `force:true`)
- Rate limit → `429`

## Régression

Relancer les 4 scripts `.mjs` + `npm run build` frontend + QA navigateur
(accueil, menu carrousel, créneau+extras, solde, `/parent/repas`,
connexion) avant toute mise en production. Voir `09-rapport-validation.md`.
