# Manuel utilisateur

Application mobile-first : ouvrez l'URL sur téléphone. Trois espaces :
**élève/employé**, **parent**, **administrateur**.

## Élève / employé

### Connexion et inscription

1. `/connexion` — e-mail + mot de passe → « Se connecter ».
   « Mot de passe oublié ? » → code par e-mail → nouveau mot de passe.
2. `/inscription` — « Je suis : Élève / Employé », nom, prénom, e-mail,
   téléphone (+ matricule, niveau, classe pour un élève), mot de passe.
   → écran **Vérification** : saisir le code à 6 chiffres reçu par e-mail.
3. Les parents ont leur page dédiée : « Et vous, parent ? → Espace parent ».

### Accueil (`/student`)

- Salutation + **solde** (œil = masquer/afficher) + bouton recharger.
- « Plat du jour » avec photo et places restantes → **Réserver**.
- Ruban « Cette semaine » → menu complet.
- Historique des dernières réservations.

### Menu de la semaine (`/student/menu`)

- Filtre par jour (Lun → Ven). Carrousel en orbite : **faites glisser
  l'écran** (ou la molette) pour faire défiler les plats — l'assiette
  suivante arrive en direct, le snap cale sur le plat le plus proche.
- Chaque plat : photo (ou assiette stylisée), nom, prix, note, allergènes,
  onglets **Aperçu / Ingrédients**, places restantes.
- **Réserver · prix** (compact) ; **Signaler** un plat ; si un allergène
  déclaré correspond → bouton « Indisponible » + bannière rouge.

### Réserver et créneau (`/student/creneau`)

1. Plat choisi affiché + **« Compléter le plateau »** : puces cochables
   Jus / Fruits / Dessert (prix unitaire affiché).
2. **Ordre de passage** : créneaux horaires — les complets sont grisés.
3. Récap : repas + suppléments + **solde après** recalculé en direct.
4. **« Maintenir pour payer X F · heure »** — appui long jusqu'à validation
   (évite les clics accidentels) → ticket.

### Ticket (`/student/ticket`)

QR unique + récap (plat, créneau, suppléments, total). Présentez le QR
à la cantine — un seul scan possible ; second scan refusé.

### Portefeuille (`/student/solde`)

Solde, « Demander une recharge » (envoie une demande au parent),
historique des transactions (débit repas, crédit recharge, remboursements).

### Profil (`/student/profil`)

Allergies déclarées + ajout d'allergie personnalisée (bloque les plats
concernés), restrictions alimentaires, compte (e-mail, déconnexion).

## Parent

### Connexion

`/connexion/parent` → espace dédié (`/parent`). Inscription :
`/inscription/parent`.

### Lier un enfant

Invitations par QR ou lien (`/api/links`) : l'enfant ou le parent crée un
jeton, l'autre le scanne/le consomme → liaison `APPROVED` immédiate.

### Recharger (`/parent/recharge`)

Montant → choix de l'enfant → opérateur mobile money → redirection vers le
checkout Jeko. Retour sur page succès/erreur — **le solde n'est crédité
qu'après confirmation de Jeko** (peut prendre quelques instants ; le statut
se rafraîchit par « Vérifier le statut »).

### Repas (`/parent/repas`)

Sélecteur d'enfant → statistiques (servis, non récupérés, dépensé) +
liste des repas du mois avec statuts (Réservé, Servi, Non récupéré).

## Administrateur

`/connexion/admin` → `/admin` :

- **Menus** : créer/modifier/archiver plats et offres, **ajouter les photos**
  (elles deviennent visibles partout : carrousel élève, fiche plat).
- **Créneaux** : créer par date ou en masse, capacité, ouvrir/fermer,
  supprimer si sans réservation.
- **Commandes / Production** : listes par créneau, prévisions.
- **Scan** : scanner le QR élève → repas remis (`COLLECTED`) ; plan B
  « validation manuelle » depuis la liste.

## Erreurs fréquentes

| Message | Signification |
|---------|---------------|
| « Indisponible » sur un plat | Allergène déclaré → réservation bloquée |
| « Solde insuffisant » | Recharger le portefeuille d'abord |
| « Créneau complet » | Choisir un autre créneau |
| « Hors délai » | Réservation/annulation trop tardive |
| « Code invalide » | OTP expiré ou faux → renvoyer un code |
| 404 favicon | Bénin — aucune action |
