# Plan de continuité et de reprise (PCA/PRA)

## Objectifs

| Objectif | Cible | Justification |
|----------|-------|---------------|
| **RTO** (temps de reprise) | 4 h | Service scolaire : la distribution du lendemain doit être assurée ; l'indisponibilité hors heures de repas est tolérable |
| **RPO** (perte de données admise) | 24 h | Sauvegarde quotidienne ; les finances exigent la **vérification** des dernières écritures à la reprise |
| Disponibilité en service | 99 % (11 h–14 h) | Fenêtre critique : distribution des repas |

## Scénarios de sinistre

### S1 — Indisponibilité du backend

- Continuité : la distribution peut continuer en **plan B manuel** sur une
  liste imprimée/exportée du jour.
- Reprise : redémarrage Railway (healthcheck auto) ; vérifier `server.js`
  et `reminders.js` relancés.

### S2 — Perte de la base de données

1. Restaurer le dernier snapshot (`11-sauvegarde-restauration.md`).
2. Repointer `DATABASE_URL`, `prisma migrate deploy` si besoin.
3. **Réconciliation obligatoire** : comparer `Wallet`/`CanteenAccount` avec
   les derniers `Transaction` — écart → `ADJUSTMENT` audité.
4. Communiquer : solde possiblement différent de la dernière opération
   (fenêtre RPO).

### S3 — Fournisseur externe indisponible

- **Jeko** : recharges en `503` documenté — annoncer « recharges
  temporairement indisponibles » ; les soldes existants restent
  utilisables, la distribution n'est pas affectée.
- **Resend** : OTP HS → les comptes existants fonctionnent (JWT/refresh) ;
  seules les nouvelles inscriptions sont bloquées.
- **Cloudinary** : images en panne → le fallback assiette stylisée
  `DishPlate` couvre l'affichage.
- **VAPID** : notifications en historique, pas de push.

### S4 — Compromission

- Couper l'accès : `SUSPENDED` sur le compte, révocation des refresh tokens.
- Finances : geler les retraits, audit `Transaction`/`AuditLog`/`WebhookEvent`.
- Rotation de tous les secrets exposés.

## Responsabilités

| Rôle | Responsabilité en cas d'incident |
|------|-----------------------------------|
| Développeur backend | Diagnostic, réconciliation financière, correctif |
| Développeur frontend | Communication utilisateur (bannière), plan B affichage |
| ADMIN cantine | Basculer en distribution manuelle, informer les agents |
| Responsable projet | Décision de gel des retraits, communication, validation de la reprise |

## Procédure de reprise (checklist)

- [ ] Incident qualifié (`16-gestion-incidents.md`)
- [ ] Sauvegarde du dernier état disponible préservée
- [ ] Restauration technique effectuée
- [ ] **Réconciliation financière** : soldes vs dernières écritures
- [ ] `AuditLog`/`WebhookEvent` contrôlés (aucun événement perdu)
- [ ] Worker rappels relancé, `ScheduledReminder` orphelins purgés
- [ ] Tests `.mjs` passés sur l'environnement restauré
- [ ] Communication utilisateurs si impact visible
- [ ] Post-mortem consigné (`15-changelog.md` / `AGENTS.md`)

## Test du plan

- **Mensuel** : restauration d'un dump en environnement isolé.
- **Trimestriel** : exercice complet S2 avec réconciliation chronométrée.
- **Avant mise en production** : un exercice obligatoire.

## Prérequis à la reprise

- Accès aux secrets (`.env` sauvegardé séparément — gestionnaire de secrets).
- Accès Railway + GitHub + consoles Jeko/Resend/Cloudinary.
- Dernière sauvegarde vérifiable (restauration testée récemment).
