# Registre des risques

Échelle : Probabilité × Impact (Faible/Moyen/Élevé/Critique).

| # | Risque | Prob. | Impact | Mesures de réduction | Responsable |
|---|--------|:-----:|:------:|----------------------|-------------|
| R1 | Débit sans service (réservation payée, repas non servi / bug ledger) | Moyen | **Critique** | Ledger atomique + snapshots ; `REVERSAL`/`ADJUSTMENT` audités ; tests 189 cas financiers | Backend |
| R2 | Double crédit ou crédit non vérifié | Moyen | **Critique** | Webhook seul créditant, HMAC-SHA256, `WebhookEvent` anti-rejeu ; frontend jamais source de vérité | Backend |
| R3 | Surréservation | Faible | Élevé | `updateMany` conditionnel + verrou `FOR UPDATE` ; test de course couvert | Backend |
| R4 | Fraude au QR (replay, partage) | Moyen | Élevé | `qrToken` opaque, usage unique, transition atomique, date du jour | Backend |
| R5 | Compromission d'un compte admin | Faible | Critique | Argon2id, création serveur seule, audit de toutes les opérations sensibles | Backend |
| R6 | Allergène mal déclaré par la cantine → blocage ou risque santé | Moyen | Élevé | `allergenInfoVerified`, `crossContaminationNote`, signalement élève, alternative vérifiée | ADMIN cantine |
| R7 | Fuite de données personnelles (enfants, finances) | Moyen | Critique | deny-by-default + portée par rôle, helmet, cookies HttpOnly, logs sans corps, pas de secrets en Git | Backend |
| R8 | Indisponibilité Jeko/Resend/Cloudinary | Élevé | Moyen | Dégradation gracieuse (`503` documentée, historique notifs conservé) ; monitoring webhooks | Backend |
| R9 | Perte de données PostgreSQL | Faible | Critique | Sauvegardes auto Railway + tests de restauration (`11-…`) | Infra |
| R10 | Règle §19 mal choisie (cutoff, remboursement non récupéré) | Moyen | Moyen | Isolées en `.env`, à confirmer avec la direction avant prod | Produit |
| R11 | Worker rappels silencieusement arrêté | Moyen | Faible | Claims atomiques + récupération orphelins + métrique PENDING | Backend |
| R12 | Push VAPID mal configuré | Moyen | Faible | Notification in-app toujours persistée ; `503` explicite | Backend |
| R13 | Frontend PWA cache obsolète après déploiement | Élevé | Faible | Versionner les chunks ; conseiller hard refresh (cas déjà observé) | Frontend |
| R14 | Secrets dans Git / logs | Faible | Critique | `.env` ignoré, `.env.example` factice, pino sans corps sensibles | Tous |
| R15 | Injection / XSS / CSRF | Faible | Élevé | Zod+Prisma, React échappe, helmet, double-submit CSRF | Backend |
| R16 | Volume de données (croissance `Transaction`, `AuditLog`, `Notification`) | Moyen | Moyen | Index en place ; archivage/purge à planifier en prod | Backend |
| R17 | Montants en float | Faible | Critique | `Int` XOF partout ; Jeko en centimes à la frontière seulement | Backend |
| R18 | Absence de PWA service worker | — | Moyen | Hors scope actuel ; à auditer avant activation | Frontend |

## Risques liés aux dépendances

- **Railway** : hébergement cible — prévoir sauvegarde externe (R9).
- **Jeko** : agrégateur unique — la réconciliation `/status` couvre les
  interruptions courtes ; diversifier ultérieurement si critique.
- **Resend** : e-mails OTP — prévoir un expéditeur de secours ou un délai
  de grâce si indisponible.

## Suivi

- Revue du registre : à chaque incident post-mortem et avant chaque
  version majeure.
- Un risque dont la mesure est « À CONFIRMER » reste ouvert tant que la
  décision produit n'est pas prise.
