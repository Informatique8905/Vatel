# CAHIER DES CHARGES FONCTIONNEL & TECHNIQUE
## Application de gestion de cantine — Vatel

*Document de référence destiné à l'agent IA de développement*
*Version consolidée — 21 novembre 2026*

> Copie textuelle du fichier `cahier_des_charges_cantine_vatel_agent_ia.docx`.
> En cas d'ambiguïté, le .docx fait foi.

---

## 0. Instructions à l'agent IA

Tu es l'ingénieur logiciel chargé de concevoir et développer le MVP de l'application de gestion de cantine Vatel. Ce document retranscrit les décisions de cadrage et les recommandations techniques. Il doit guider l'implémentation.

- Respecte les décisions marquées **DÉCIDÉ**. Ne les remplace pas par tes préférences.
- Les éléments marqués **À CONFIRMER** ne sont pas des décisions : ne les invente pas. Isole-les en configuration ou demande une précision.
- Les **recommandations** sont des propositions d'ingénierie destinées à sécuriser le produit.
- Ne simule jamais une transaction réelle comme si elle avait réussi. Identifie clairement les données et paiements de démonstration.
- Commence par un MVP fonctionnel et démontrable. Livre, teste et documente chaque étape.

| Mention | Sens |
|---|---|
| DÉCIDÉ | Choix explicitement confirmé par l'équipe. |
| RECOMMANDATION | Mesure technique conseillée, à appliquer sauf contrainte justifiée. |
| À CONFIRMER | Information non tranchée ; aucune hypothèse ne doit être présentée comme décision. |

## 1. Contexte et objectifs

Le projet est réalisé dans le cadre du Hackathon Vatel consacré à une application de gestion de cantine. L'objectif est de proposer un outil simple pour les élèves/employés, les parents et le personnel de cantine.

- Réduire les files d'attente grâce à la réservation anticipée et à la validation rapide des repas.
- Améliorer la prévision des quantités à préparer et limiter le gaspillage.
- Rendre les menus, ingrédients, allergènes, prix et disponibilités transparents.
- Faciliter la gestion des réservations, des distributions et des recettes.
- Permettre aux parents d'alimenter le portefeuille de leur enfant et de suivre ses consommations.
- Prendre en compte les allergies et restrictions alimentaires avec des contrôles explicites.

## 2. Utilisateurs et applications

| Composant | Public | Format / rôle |
|---|---|---|
| Student App | Élèves et employés | PWA mobile-first : menus, profil alimentaire, réservation, portefeuille, QR code, historique. |
| Parent App | Parents/tuteurs | PWA mobile-first : enfants associés, recharges, suivi des consommations et alertes. |
| Admin Dashboard | Personnel habilité de la cantine | Web responsive : menus, quantités, créneaux, réservations, distribution, signalements, finances et rapports. |
| Backend API | Les trois interfaces | API commune Node.js/Express ; règles métier, autorisations, paiements et accès aux données. |

- **DÉCIDÉ** — Les trois interfaces frontend sont séparées à la racine du projet et disposent de leurs propres ressources et dépendances. Elles consomment un backend commun.
- **DÉCIDÉ** — Student App et Parent App sont des PWA pour le MVP, pas des applications natives Android/iOS. Le dashboard est une application web responsive.
- Une PWA doit être installable depuis le navigateur et adaptée au mobile. Les notifications push et fonctions hors ligne doivent être testées sur les appareils ciblés.

## 3. Parcours utilisateur

### 3.1 Élève / employé

1. Créer un compte ou se connecter par email/mot de passe ou Google.
2. Compléter son profil et déclarer ses allergies et restrictions.
3. Consulter les menus, prix, ingrédients, allergènes et disponibilités.
4. Choisir une date, un repas et un créneau encore disponible.
5. Voir le prix et son solde avant confirmation.
6. Confirmer : le portefeuille est débité au moment où la réservation est validée.
7. Recevoir une confirmation et un QR code unique lié à la réservation.
8. Présenter le QR code à la cantine pour récupérer le repas.
9. Consulter son solde, ses réservations et l'historique de ses opérations.
10. Signaler un problème relatif à un plat, même sans tenter de le réserver.

### 3.2 Parent

1. Créer un compte ou se connecter par email ou Google.
2. Accéder uniquement aux enfants associés et autorisés.
3. Choisir l'enfant, le montant et le moyen de paiement pour recharger son portefeuille.
4. Effectuer le paiement externe via l'agrégateur disponible.
5. Le portefeuille de l'enfant est crédité uniquement après confirmation serveur vérifiée du paiement.
6. Consulter solde, recharges, dépenses et repas consommés.
7. Recevoir une notification lorsque le solde passe sous un seuil configuré.

**DÉCIDÉ** — Le parent recharge le portefeuille et suit les consommations. L'élève effectue lui-même ses réservations et confirme le paiement interne avec son portefeuille. Le parent ne valide pas chaque réservation à sa place.

### 3.3 Administrateur

- Créer, modifier et publier les menus et leurs informations.
- Configurer les modes de menu, les quantités et les créneaux.
- Consulter les réservations par date, repas et créneau.
- Suivre les quantités réservées, préparées, distribuées et non récupérées.
- Scanner les QR codes et utiliser une validation manuelle de secours.
- Consulter et traiter les signalements alimentaires.
- Consulter les transactions, recettes et solde de la cantine ; initier les retraits autorisés.
- Consulter les indicateurs et l'historique des actions.

## 4. Menus et plats

- **DÉCIDÉ** — L'application doit prendre en charge deux modes configurables :
  - Mode 1 : un menu unique par jour.
  - Mode 2 : plusieurs plats par jour, chacun avec son prix et sa quantité propre.
- **DÉCIDÉ** — Pour la présentation du MVP, utiliser le mode « un menu par jour ». Le mode multi-plats doit être prévu dans la conception/configuration.
- Une offre de repas à une date donnée doit être distinguée du plat générique.

| Donnée | Contenu attendu |
|---|---|
| Plat | Nom, description, photo, ingrédients et allergènes déclarés. |
| Offre du jour | Plat proposé à une date précise, prix appliqué, quantité, disponibilité, statut de publication et limites de réservation. |
| Quantité | Nombre maximal de portions réservables ; décrémentation cohérente à la confirmation. |
| Prix | Copie du prix au moment de la réservation afin que les changements ultérieurs n'altèrent pas l'historique. |

**RECOMMANDATION** — Archiver les plats utilisés plutôt que les supprimer physiquement.

## 5. Créneaux et réservation

La réservation anticipée fonctionne avec des créneaux de retrait configurables et une capacité par créneau. L'administration doit pouvoir adapter les plages et capacités à l'organisation réelle de la cantine.

- L'élève choisit une date, une offre et un créneau encore ouvert.
- La capacité est paramétrable ; aucune capacité arbitraire ne doit être codée en dur.
- La réservation est refusée si l'offre ou le créneau est fermé ou complet.
- Le système doit empêcher tout dépassement de capacité même en cas de demandes simultanées.
- Les heures et délais de réservation/annulation doivent être configurables.

**À CONFIRMER** — Les heures exactes, l'heure limite de réservation et la politique d'annulation n'ont pas été précisées dans les échanges accessibles. Ne pas inventer ces règles.

### 5.1 États de réservation

| État proposé | Signification |
|---|---|
| PENDING | Opération en attente si un traitement asynchrone est nécessaire. |
| CONFIRMED | Réservation confirmée et payée par le portefeuille. |
| CANCELLED | Réservation annulée selon les règles autorisées. |
| COLLECTED | Repas remis à l'élève. |
| NOT_COLLECTED | Repas non récupéré à la fin du service. |

Les transitions d'état sont contrôlées par le backend, pas librement par le frontend.

## 6. Remise des repas : QR code

- **DÉCIDÉ** — Le processus principal de validation de la remise est le scan du QR code généré pour chaque réservation confirmée.
- L'élève présente le QR code associé à sa réservation.
- Le personnel le scanne depuis l'interface de distribution.
- Le backend vérifie l'existence du code, la réservation, la date, le statut confirmé et l'absence d'utilisation antérieure.
- Si les contrôles passent, la réservation devient COLLECTED ; la date/heure et l'agent de remise sont enregistrés.
- Un deuxième scan est refusé et indique que le repas a déjà été récupéré.
- **DÉCIDÉ** — Plan B : validation manuelle dans la liste des réservations du créneau, avec une action rapide si le scan ou le téléphone ne fonctionne pas.
- **RECOMMANDATION** — Le QR code contient un jeton aléatoire non prédictible, sans données personnelles lisibles. Il est vérifié côté serveur et ne peut servir qu'une seule fois.

## 7. Allergies et restrictions alimentaires

- **DÉCIDÉ** — La détection est automatique et déterministe, basée sur les données déclarées. L'IA ne décide pas si un plat est compatible.
- L'élève renseigne ses allergies et restrictions dans son profil.
- L'administrateur renseigne les ingrédients et allergènes connus de chaque plat/offre.
- L'application compare automatiquement les allergènes du plat avec le profil de l'élève, à l'affichage et avant réservation.
- En cas de correspondance, afficher une alerte explicite et bloquer la réservation.
- Si les informations sont absentes ou non vérifiées, afficher clairement qu'elles ne sont pas vérifiées ; ne jamais affirmer que le plat est compatible.
- L'absence d'allergène dans la liste déclarée ne garantit pas l'absence de risque. La cantine doit pouvoir préciser les risques de contamination croisée.
- L'élève peut signaler un problème sur un plat même sans tenter de le réserver : allergie, intolérance, restriction ou autre, avec commentaire facultatif.
- L'administration consulte les signalements, vérifie les informations et peut proposer une alternative vérifiée à l'élève.
- L'élève peut recevoir une notification lorsque le signalement est traité ou qu'une alternative est proposée.
- Un signalement n'est pas automatiquement une preuve qu'un plat est dangereux. Les signalements et profils alimentaires sont visibles uniquement par les personnes habilitées.

## 8. Portefeuilles et paiements

### 8.1 Principes retenus

- Chaque élève dispose d'un portefeuille interne.
- Le parent alimente ce portefeuille par un paiement externe.
- L'élève paie son repas en interne : le prix est débité de son portefeuille lors de la confirmation de réservation.
- Il n'est pas nécessaire de lancer un paiement Mobile Money externe à chaque repas.
- Les recettes de repas alimentent le compte/ledger interne de la cantine.
- Les soldes des élèves et les fonds de la cantine sont distingués.
- Les transactions passées sont conservées ; pas de modification/suppression silencieuse d'une écriture.

### 8.2 Recharge du portefeuille par le parent

1. Le parent choisit l'enfant, le montant et l'opérateur disponible.
2. Le backend crée une intention de paiement avec une référence unique et un statut initial.
3. Le backend initie le paiement via l'agrégateur dont l'équipe possède déjà les API.
4. L'agrégateur envoie un webhook au backend.
5. Le backend vérifie l'authenticité du webhook, la référence, le montant, la devise, le destinataire et le statut final.
6. Le portefeuille est crédité une seule fois après confirmation officielle vérifiée.
7. La redirection vers l'application ou le retour navigateur ne suffit jamais à créditer le portefeuille.
8. Le parent et l'élève sont informés du résultat.

**DÉCIDÉ** — Un fournisseur agrégateur fournit déjà les API et webhooks. L'agent doit utiliser sa documentation et ses vrais endpoints, sans les inventer.

### 8.3 Paiement interne d'un repas

La confirmation doit être cohérente et atomique : vérifier solde et disponibilité, débiter le portefeuille, enregistrer l'écriture financière et confirmer la réservation. En cas d'échec, l'ensemble doit être annulé (rollback).

### 8.4 Retrait des recettes de la cantine

- **DÉCIDÉ** — Pour un retrait, l'administrateur choisit le mode/opérateur de retrait et saisit le numéro ou compte destinataire. Les opérateurs cités pendant le cadrage sont Wave, Orange Money, MTN, Moov et Djamo, sous réserve des API réellement disponibles.
- Ne pas supposer qu'une API de collecte permet aussi les décaissements : vérifier les capacités payout de chaque opérateur.
- Vérifier le rôle, le solde disponible, le montant, les frais, les limites et le format du bénéficiaire.
- Créer une demande de retrait avec référence unique et réserver les fonds avant l'appel fournisseur.
- Finaliser uniquement après confirmation serveur fiable par webhook ou consultation de statut.
- En cas d'échec confirmé, libérer les fonds réservés ; si le résultat est inconnu, conserver le statut en attente et réconcilier.
- Conserver l'initiateur, le bénéficiaire, l'opérateur, les montants, frais, dates et statuts dans le journal d'audit.

**À CONFIRMER** — Politique d'autorisation des bénéficiaires, validation éventuelle par deux personnes, frais et plafonds par opérateur.

### 8.5 Journal financier

**RECOMMANDATION** — Utiliser un ledger/journal d'écritures comme source de vérité. Les soldes affichés doivent être réconciliables avec ce journal. Une correction se fait par écriture compensatrice, pas en modifiant l'écriture originale.

| Type d'écriture | Exemple |
|---|---|
| TOPUP | Crédit après recharge externe confirmée. |
| MEAL_PAYMENT | Débit du portefeuille élève et recette cantine. |
| WITHDRAWAL | Sortie des fonds cantine vers un bénéficiaire. |
| REVERSAL / ADJUSTMENT | Écriture corrective documentée. |

Utiliser XOF/FCFA. Stocker les montants en unités monétaires entières ou Decimal selon une convention unique ; jamais en float.

## 9. Robustesse, concurrence et idempotence

- **DÉCIDÉ** — L'application doit éviter les doubles débits et supporter les demandes simultanées.
- Idempotence backend sur paiements, webhooks, réservations et retraits : une répétition logique ne crée pas une seconde opération.
- Désactiver le bouton pendant l'envoi améliore l'UX mais ne remplace jamais les contrôles serveur.
- Utiliser les transactions PostgreSQL et contraintes/verrous adaptés pour protéger les quantités et capacités.
- Si deux élèves demandent la dernière portion simultanément, un seul obtient la réservation et le débit ; l'autre reçoit un message de disponibilité épuisée.
- Ne pas placer toute réservation dans une queue qui ralentirait inutilement la confirmation.
- Les tâches secondaires (notifications, emails, reçus, statistiques) peuvent être asynchrones.
- Pour le MVP, PostgreSQL et ses transactions suffisent ; Redis/BullMQ n'est pas obligatoire sans besoin démontré.
- Les opérations dont le résultat fournisseur est inconnu restent en attente jusqu'à réconciliation ; ne pas supposer succès ou échec.
- Les webhooks doivent être authentifiés, idempotents, journalisés et accepter les livraisons répétées.

## 10. Architecture technique retenue

| Élément | Technologie / choix |
|---|---|
| Frontends | React + JavaScript + Tailwind CSS |
| Student App | PWA |
| Parent App | PWA |
| Admin Dashboard | React web responsive |
| Backend | Node.js + Express |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Déploiement | Railway |
| Paiements | API et webhooks de l'agrégateur déjà identifié par l'équipe |

Arborescence cible à la racine :

```
cantine-vatel/  student-app/  parent-app/  admin-dashboard/  backend/  README.md
```

Chaque frontend est indépendant : package.json, pages, composants, layouts, hooks, services/API, utilitaires, styles et assets.

Organisation backend modulaire :

```
backend/
  src/
    config/
    middlewares/
    modules/
      auth/  users/  students/  parents/  menus/  reservations/  wallets/
      transactions/  payments/  withdrawals/  allergies/  distributions/
      notifications/  statistics/  stock/
    database/
    utils/
    app.js
    server.js
  prisma/
    schema.prisma
    migrations/
```

Chaque module contient, selon le besoin, routes, controller, service, validations et schémas. Prisma gère le modèle relationnel et les migrations PostgreSQL. L'agent peut regrouper des modules pour le MVP si les responsabilités restent séparées.

## 11. Modèle de données cible

Le schéma Prisma exact est à construire par l'agent. Il doit au minimum couvrir :

| Entité | Rôle / relations |
|---|---|
| User | Identité, email, mot de passe hashé, rôle, état, vérification email. |
| StudentProfile | Profil élève/employé. |
| ParentStudent | Association parent-enfant autorisée. |
| Wallet | Portefeuille interne de l'élève. |
| Dish | Plat générique, ingrédients et allergènes. |
| MenuItem | Offre datée, prix, quantité, statut et limite de réservation. |
| TimeSlot | Date, plage horaire et capacité. |
| Reservation | Élève, offre, créneau, prix snapshot, statut et QR token. |
| Transaction | Journal financier, type, montant, devise, référence, statut et initiateur. |
| PaymentIntent | Intention de recharge et référence fournisseur. |
| Withdrawal | Demande, bénéficiaire, opérateur, montant, frais, statut et référence. |
| Allergy / DietaryRestriction | Référentiel et associations au profil. |
| DishAllergen | Allergènes déclarés pour un plat/offre. |
| IssueReport | Signalement d'un élève et suivi de traitement. |
| DistributionRecord | Réservation, heure de remise et agent. |
| Notification | Destinataire, événement, canal et statut. |
| AuditLog | Acteur, action, ressource, date et résultat. |

- Un parent peut être associé à plusieurs élèves via ParentStudent.
- Un élève possède un portefeuille dans le périmètre MVP.
- Une réservation référence un élève, une offre et un créneau.
- Les références de paiement/retrait et le QR token doivent être uniques.
- Les données historiques doivent rester consultables même si un menu ou un compte est désactivé.

## 12. Authentification, rôles et sécurité

### 12.1 Authentification

- **DÉCIDÉ** — Connexion par email/mot de passe et Google.
- **RECOMMANDATION** — Hash des mots de passe avec Argon2id ou bcrypt correctement configuré.
- Prévoir vérification d'email, réinitialisation par jeton temporaire à usage unique, limitation des tentatives et invalidation des sessions concernées.
- Une connexion Google ne donne jamais le rôle ADMIN automatiquement.
- Choisir une stratégie de session sûre entre les trois frontends ; cookies HttpOnly/Secure/SameSite et protection CSRF si cookies.

### 12.2 Autorisation

- Rôles métier de base : STUDENT, PARENT, ADMIN ; permissions affinées si nécessaire.
- Refus par défaut (deny by default), moindre privilège et vérification à chaque requête.
- Un élève ne consulte/modifie que ses données.
- Un parent ne consulte que les enfants associés à son compte.
- Le rôle ADMIN ne peut pas être choisi ou modifié depuis le frontend ou un champ de requête utilisateur.
- Chaque route vérifie authentification, rôle, permission et propriété/association de la ressource.

### 12.3 Sécurité des API et données

- Inventorier et n'exposer que les routes et méthodes HTTP nécessaires ; refuser les méthodes non autorisées.
- Valider toutes les entrées avec des schémas stricts (Zod recommandé) et rejeter les champs inattendus.
- Ne jamais transmettre directement req.body à Prisma ; sélectionner explicitement les champs autorisés.
- Utiliser Prisma et ses requêtes paramétrées ; éviter les requêtes SQL brutes non sécurisées.
- Protéger contre XSS, CSRF, injections SQL/NoSQL, mass assignment, IDOR et accès horizontal/vertical non autorisé.
- Configurer Helmet, CORS avec allowlist, rate limiting, limites de taille et types de fichiers, HTTPS et messages d'erreur sûrs.
- Ne jamais exposer secrets, clés API, stack traces ou données sensibles dans les logs.
- Valider les fichiers téléversés par leur type réel et leur taille ; ne pas se fier à l'extension.
- Protéger les webhooks selon le mécanisme officiel du fournisseur et empêcher leur rejeu.

### 12.4 Sécurité des opérations financières

- Ne jamais créditer sur la seule base d'une redirection frontend.
- Tracer les actions financières et administratives sensibles dans AuditLog.
- Protéger les retraits par autorisation renforcée et contrôle du bénéficiaire.
- Séparer environnements et secrets ; utiliser variables d'environnement.
- Limiter l'accès à PostgreSQL, sauvegarder la base et contrôler les migrations.
- Configurer correctement le proxy Railway pour que les contrôles IP/rate limiting fonctionnent.

### 12.5 Tests de sécurité minimum

- Élève A tente de lire le portefeuille/réservation de B.
- Élève tente d'appeler une route ADMIN ou de s'attribuer le rôle ADMIN.
- Parent tente d'accéder à un enfant non associé.
- Accès non authentifié à une route privée.
- Entrées malformées, payload XSS, injection et mass assignment.
- Webhook faux, rejoué, retardé ou reçu plusieurs fois.
- Appels répétés de paiement/réservation avec la même clé idempotente.
- Deux réservations concurrentes pour la dernière portion.
- Appel d'une méthode HTTP non autorisée.

## 13. Notifications

Événements à prendre en charge selon les canaux disponibles :

- Recharge confirmée ou échouée : parent et élève.
- Réservation confirmée/annulée : élève.
- Solde faible : parent et éventuellement élève.
- Signalement traité ou alternative vérifiée proposée : élève concerné.
- Retrait créé, en attente, confirmé ou échoué : administrateur habilité.
- Changement de menu ou disponibilité : utilisateurs concernés selon les règles retenues.

L'envoi d'une notification ne doit pas bloquer ni annuler une transaction métier déjà validée.

## 14. Préparation, stock et statistiques

- Afficher les quantités réservées par date, offre et créneau pour aider à prévoir les préparations.
- Suivre au minimum les quantités réservées, préparées, distribuées et non récupérées.
- Permettre de définir une quantité maximale par offre.
- Prévoir un stock simplifié pour le MVP ; ne pas développer un ERP complet.
- Afficher des indicateurs de base : réservations, repas distribués/non récupérés, recettes, recharges, dépenses et solde cantine.

**À CONFIRMER** — Le détail des ingrédients en stock, fournisseurs, inventaires et seuils n'a pas été arrêté. Ne pas surdimensionner ce module.

## 15. Robustesse et exploitation

- Logs structurés avec identifiant de requête et référence métier, sans secrets ni données personnelles inutiles.
- Tracer les webhooks et les transitions de statut.
- Gérer timeouts, erreurs réseau et indisponibilités fournisseurs.
- Prévoir consultation de statut et réconciliation des paiements/retraits ambigus.
- Prévoir sauvegardes PostgreSQL et procédure de restauration.
- Ne jamais modifier directement un solde sans écriture financière correspondante.
- **RECOMMANDATION** — Ajouter une outbox transactionnelle si les traitements asynchrones deviennent critiques.

## 16. Déploiement Railway

- Déployer les services frontend/backend et PostgreSQL sur Railway selon l'organisation du projet.
- Configurer les variables d'environnement séparément pour chaque service ; aucune clé secrète dans Git.
- Utiliser le réseau privé Railway pour les communications internes lorsque possible.
- Garder des environnements distincts pour développement et démo/production.
- Exécuter les migrations Prisma de façon contrôlée ; éviter les migrations destructrices automatiques au démarrage.
- Documenter installation, variables, migrations, seed de démonstration, commandes et URLs dans README.

## 17. Priorisation MVP

| Priorité | Contenu |
|---|---|
| P0 — indispensable | Authentification et rôles ; menus ; menu unique/jour pour la démo ; créneaux ; réservation ; portefeuille et débit atomique ; recharge parent/webhook ; dashboard menus/réservations ; QR code + secours manuel ; contrôles d'accès et tests critiques. |
| P1 — si temps disponible | Profil allergies/restrictions et blocage automatique ; signalements ; suivi préparé/distribué/non récupéré ; statistiques simples ; alerte solde faible ; notifications essentielles. |
| P2 — évolutions | Mode multi-plats pleinement exploité ; stock avancé ; notation ; suggestions IA non critiques ; multilingue ; push avancé ; hors-ligne étendu ; applications natives. |

## 18. Scénarios d'acceptation et démonstration

1. Un élève se connecte et consulte le menu, le prix et la disponibilité.
2. Un élève avec un allergène déclaré est alerté et ne peut pas réserver un plat contenant cet allergène.
3. Un élève réserve dans un créneau disponible ; son portefeuille est débité une seule fois et un QR code est créé.
4. Un scan valide marque la réservation comme récupérée ; un second scan est refusé.
5. Si le scanner échoue, le personnel utilise la liste du créneau pour valider manuellement.
6. Un parent recharge le portefeuille ; le crédit n'apparaît qu'après webhook vérifié.
7. Un parent ne peut pas consulter un enfant non associé.
8. Deux élèves tentent de réserver la dernière portion : une seule réservation et un seul débit réussissent.
9. Un double clic ou une répétition réseau ne produit pas de double débit.
10. Un administrateur consulte les réservations et quantités à préparer.
11. Un retrait suit le statut réel confirmé par le fournisseur ; les fonds ne sont pas libérés sur un résultat incertain.

## 19. Points restant à confirmer — ne pas inventer

- Création et validation des comptes élèves, employés et parents : import, code d'invitation ou validation administrative.
- Méthode de preuve du lien parent-enfant.
- Horaires exactes, durée et capacité initiale des créneaux.
- Heure limite de réservation et règle d'annulation.
- Politique si un repas payé n'est pas récupéré : débit conservé, remboursement ou autre.
- Seuil de solde faible et destinataires des alertes.
- Liste exacte des opérateurs et endpoints disponibles en collecte ET en décaissement, frais et limites.
- Règles de bénéficiaires autorisés et éventuelle double validation des retraits.
- Profondeur de la gestion de stock et des rapports.
- Canaux de notification réellement disponibles dans le MVP.

## 20. Livrables attendus de l'agent

- Student PWA, Parent PWA, Admin Dashboard et backend API communs.
- Schéma Prisma, migrations PostgreSQL et données de démonstration clairement fictives.
- Endpoints documentés et règles d'autorisation testées.
- Intégration réelle ou environnement sandbox clairement identifié pour les paiements/webhooks.
- Tests des parcours critiques, paiements, concurrence et accès aux données.
- README complet, configuration sans secrets et instructions de lancement.
- Déploiement de démonstration stable et dépôt Git avec commits réguliers.

## 21. Consigne de démarrage à l'agent

Avant d'écrire le code, transforme ce cahier des charges en checklist et plan d'exécution court. Commence par les fondations et les parcours P0. Construis le modèle relationnel et les règles d'autorisation avant les écrans. Implémente les réservations et opérations financières côté serveur avec transactions, idempotence et tests de concurrence. Ne fais jamais confiance au frontend. Signale explicitement les points À CONFIRMER et tes hypothèses. Livre à chaque étape un résultat exécutable, testé et documenté.

Ce document est la référence fonctionnelle et technique du projet. En cas d'ambiguïté, respecte la légende de fiabilité et demande une décision plutôt que d'inventer une règle métier.
