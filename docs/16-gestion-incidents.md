# Procédure de gestion des incidents

## Gravité

| Niveau | Exemple | Temps de réaction |
|--------|---------|-------------------|
| **Critique** | Fraude/débit injustifié, fuite de données, indisponibilité totale, double crédit | Immédiat — escalade directe |
| **Majeure** | Recharges bloquées, distribution impossible en service, OTP HS | < 1 h en heures ouvrées, < 30 min en service |
| **Mineure** | Anomalie d'affichage, rappel non reçu, statistique incorrecte | < 1 jour ouvré |
| **Cosmétique** | Favicon 404, libellé fautif | Au backlog |

## Cycle de traitement

### 1. Détection

- Logs `pino` (erreurs 5xx, `FAILED`), webhooks `signatureOk=false`,
  `ScheduledReminder`/`PaymentIntent`/`Withdrawal` bloqués.
- Signalement utilisateur (élève, parent, agent de cantine).
- Voir les alertes de `12-exploitation-depannage.md`.

### 2. Qualification

- **Reproduire** : environnement, compte, heure, navigateur.
- **Isoler** : frontend / API / base / fournisseur (Jeko, Resend,
  Cloudinary, push).
- **Évaluer la gravité** : impact financier > disponibilité > confort.
- **Traçabilité** : conserver les logs, `AuditLog`, `WebhookEvent`,
  `Transaction` concernés (ne jamais modifier les écritures).

### 3. Contournement immédiat (si critique)

- Paiements douteux : geler les retraits, vérifier `WebhookEvent`.
- Compte compromis : `User.status = SUSPENDED` + révocation des refresh
  tokens (détection de réutilisation le fait automatiquement).
- Distribution en panne : basculer sur le plan B manuel.
- Base saturée : identifier la requête, `pg_stat_activity`, kill si
  nécessaire — les `updateMany` conditionnels protègent l'intégrité.

### 4. Résolution

- Correctif sur une branche, tests `.mjs` concernés relancés,
  `npm run build` frontend, QA navigateur ciblée.
- **Ne jamais** « réparer » un solde par `UPDATE` direct : passer par
  `REVERSAL`/`ADJUSTMENT` (audité, inversible).

### 5. Clôture et retour d'expérience

- Consigner : symptôme, cause racine, correctif, délai, impact dans
  `AGENTS.md` (section avancement) ou `15-changelog.md` si visible.
- Mettre à jour `12-exploitation-depannage.md` si l'incident peut se
  reproduire.
- Ajouter un cas de test si la cause n'était pas couverte.

## Escalade

| Domaine | Premier niveau | Escalade |
|---------|----------------|----------|
| Finances (soldes, recharges, retraits) | Développeur backend | + responsable projet (gel des retraits) |
| Auth / sécurité | Développeur backend | Révocation globale + notification utilisateurs |
| Frontend / UX | Développeur frontend | Responsable projet |
| Fournisseurs (Jeko, Resend, Cloudinary, push) | Support fournisseur | Contournement documenté (dégradation gracieuse) |
| Base de données | DBA / Railway | Restauration (`11-sauvegarde-restauration.md`) |

## Post-incident obligatoire (critique/majeure)

- Cause racine identifiée et corrigée (pas un contournement).
- Test de non-régression ajouté au script concerné.
- Politique §19 clarifiée si l'incident vient d'une règle À CONFIRMER.
- Réunion courte : ce qui s'est passé, comment l'éviter.
