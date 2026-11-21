# Dossier de conformité et protection des données

Application traitant des données d'**élèves** (souvent mineurs) : le
respect de la vie privée est une exigence, pas une option. Référence :
réglementation ivoirienne + bonnes pratiques RGPD applicables par
analogie.

## Finalités du traitement

| Finalité | Données | Base |
|----------|---------|------|
| Gestion des repas et réservations | Identité, profil élève, historique repas | Exécution du service de cantine |
| Portefeuille prépayé | Soldes, transactions, recharges | Obligation comptable + service |
| Liaison parent–enfant | Lien familial, consentement implicite au claim | Relation contractuelle |
| Allergies et restrictions | **Données de santé** — allergènes déclarés | Consentement explicite, protection de la santé |
| Notifications | E-mail, endpoint push | Consentement (opt-in révocable) |
| Sécurité et audit | `AuditLog` (acteur, action, IP, horodatage) | Intérêt légitime |

## Données collectées

| Catégorie | Champs | Sensible ? |
|-----------|--------|:----------:|
| Identité | nom, prénom, e-mail, téléphone, matricule, niveau, classe | Non |
| Santé | `StudentAllergen`, `StudentRestriction`, signalements `IssueReport` | **Oui** |
| Financières | soldes, `Transaction`, `PaymentIntent`, `Withdrawal` | Oui (financier) |
| Techniques | `RefreshToken`, `PushSubscription`, `AuthToken` (hashés), IP dans `AuditLog` | Non |
| Photos de plats | Cloudinary — **pas de photos d'élèves** | Non |

## Durées de conservation (proposition — à confirmer)

| Donnée | Durée proposée |
|--------|----------------|
| Compte actif | Durée de la scolarité/emploi |
| Transactions, réservations, audit | 5 ans (obligations comptables) |
| OTP, jetons | Expirés automatiquement (10 min–30 j) |
| Push subscriptions | Jusqu'à désabonnement (`disabledAt`) |
| Logs applicatifs | 30 jours |
| Notifications | 1 an |
| Données d'un compte révoqué | Liaison `REVOKED` conservée pour audit — données nominatives anonymisables |

## Mesures de protection

- **Chiffrement** : TLS en transit (à forcer en production — `Secure` cookies),
  hashage Argon2id des mots de passe, SHA-256 de tous les jetons (jamais en clair).
- **Minimisation** : seules les données nécessaires à la cantine sont
  collectées ; pas de géolocalisation, pas de cookies tiers.
- **Accès** : deny-by-default, portée par rôle (un parent ne voit que ses
  enfants liés APPROVED ; un élève, ses seules données).
- **Audit** : `AuditLog` sur les opérations sensibles ; aucune suppression
  de trace (archivage/révocation horodatée).
- **Sous-traitants** : Jeko (paiement), Resend (e-mail), Cloudinary
  (images), Railway (hébergement), Web Push (notifications) — vérifier les
  clauses de protection de données de chacun ; localisation UE si exigée.
- **Pas de profilage publicitaire, pas de revente.**

## Droits des personnes

| Droit | Réponse proposée |
|-------|------------------|
| Accès | Consulter son profil et son historique dans l'application |
| Rectification | Modifier ses informations (allergies, téléphone) |
| Suppression | Demande à l'administrateur → désactivation + anonymisation des données nominatives ; **les écritures financières sont conservées** (obligation comptable, pseudonymisées si possible) |
| Opposition / retrait du consentement | Révoquer la liaison parent–enfant, se désabonner du push, retirer ses allergies (attention : plus de blocage allergène) |
| Portabilité | Export des données personnelles sur demande |

## Points à confirmer avant mise en production

- [ ] Politique de confidentialité rédigée et affichée (données d'enfants).
- [ ] Consentement explicite pour les données de santé (allergies).
- [ ] Durées de conservation actées avec la direction.
- [ ] Clauses sous-traitants (Jeko, Resend, Cloudinary, Railway) vérifiées.
- [ ] Registre des traitements tenu à jour.
- [ ] Procédure de notification de violation de données définie.
