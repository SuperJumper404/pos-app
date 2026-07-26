# Commandes à emporter et actions de la modale

## Objectif

Indiquer qu'une commande nécessite un emballage grâce à un booléen « À emporter », sans changer sa table, son client ni son `customerID`. L'indicateur doit fonctionner pour les commandes créées par le personnel et par les clients mobiles, rester modifiable pendant l'édition d'une commande, survivre à l'archivage et être immédiatement visible pour la cuisine.

Ce sous-projet corrige également la superposition des actions du panier dans la modale de modification. La correction orthographique de tout le frontend constitue un second sous-projet indépendant.

## Données

Une migration backend ajoute `is_takeaway TINYINT(1) NOT NULL DEFAULT 0` aux tables `orders` et `archives`.

- `0` signifie que la commande ne nécessite pas l'indication « À emporter ».
- `1` signifie que la commande nécessite un emballage.
- La valeur ne modifie jamais `customerID`, la table, l'opérateur ou le parcours de paiement.
- Les commandes existantes prennent la valeur `0` grâce à la valeur par défaut.
- L'archivage copie cette valeur de `orders` vers `archives` avec les autres données de la commande.

## Contrat API

Les créations de commande avec et sans Stripe acceptent le champ public `is_takeaway`. Le backend normalise les valeurs booléennes autorisées et refuse une valeur ambiguë avec l'erreur de validation existante.

Le booléen normalisé fait partie de l'empreinte d'idempotence du checkout. Une même clé ne peut donc pas être rejouée avec un choix « À emporter » différent.

Le chargement d'une commande éditable expose `is_takeaway`. L'enregistrement de l'édition accepte la nouvelle valeur dans le même payload que les produits et met à jour la commande dans la transaction et sous le même verrou. Un conflit ou un échec ne doit pas enregistrer partiellement ce booléen.

Les réponses de liste, détail, suivi et historique exposent la colonne grâce aux lectures de commande existantes. La valeur est normalisée en booléen par le frontend avant affichage.

## Frontend

### Création

Le formulaire du panier affiche une `v-checkbox` « À emporter » immédiatement sous le numéro de téléphone. Elle est disponible pour le personnel et pour les clients mobiles. Sa valeur initiale est décochée.

La valeur est incluse dans :

- le payload de checkout public ;
- la signature locale du checkout ;
- la copie persistée d'une tentative de paiement ;
- la restauration après navigation ou erreur d'authentification ;
- les parcours Stripe, paiement au comptoir et commande sans Stripe.

La sélection ou désélection de la case ne change jamais la table sélectionnée.

### Modification

Pendant une session `orderEdit`, la case reste visible même si les autres champs client sont masqués. Elle est initialisée avec la valeur de la commande et peut être modifiée dans les deux sens.

Le store d'édition conserve la valeur d'origine et la valeur courante. Une différence marque la session comme modifiée, invalide une éventuelle reprise de paiement devenue obsolète et déclenche les confirmations de sortie déjà utilisées pour les changements de produits. L'enregistrement transmet `is_takeaway` avec le contenu de la commande.

Après un enregistrement réussi, la modale se ferme selon le flux existant et le détail rechargé affiche la nouvelle valeur.

## Affichage cuisine et historique

Un `v-chip` compact portant le texte « À emporter » apparaît uniquement lorsque `is_takeaway` est vrai :

- dans la liste active des commandes ;
- dans le détail d'une commande ;
- dans le suivi mobile de la commande ;
- dans la liste historique et le détail historique.

Le chip complète les informations existantes sans remplacer la table ni le statut. L'impression des tickets n'est pas modifiée dans ce sous-projet, car la demande porte sur l'interface.

## Correctif des actions de la modale

Le panneau d'actions du panier utilise une grille dédiée lorsque l'édition est intégrée :

- « Enregistrer les modifications » occupe toute la première ligne ;
- « Retour au menu » et « Annuler » partagent la seconde ligne lorsque la largeur le permet ;
- sous le seuil mobile, les trois actions s'empilent et occupent toute la largeur.

Les libellés ne sont ni tronqués ni superposés. Le comportement des actions et la page autonome `/cart` restent inchangés.

## Erreurs et compatibilité

- Une ancienne application qui omet `is_takeaway` crée une commande avec la valeur `0`.
- Une réponse historique ne contenant pas encore la propriété est affichée comme non « À emporter ».
- Les échecs Stripe, conflits d'édition et reprises de paiement suivent les mécanismes actuels.
- Aucune nouvelle dépendance frontend ou backend n'est ajoutée.
- Aucun compte utilisateur, table technique ou niveau d'accès n'est créé.

## Tests et validation

Les tests backend couvrent :

- la normalisation et la validation de `is_takeaway` ;
- sa participation à l'empreinte d'idempotence ;
- sa persistance lors des checkouts avec et sans Stripe ;
- sa mise à jour atomique pendant l'édition ;
- sa copie pendant l'archivage.

Les tests frontend couvrent :

- la valeur décochée par défaut ;
- la présence du booléen dans les payloads et signatures ;
- la restauration d'une tentative persistée ;
- l'édition dans les deux sens et l'état « modifié » ;
- l'affichage conditionnel du chip ;
- la structure responsive des actions intégrées sans modifier les navigations existantes.

La validation finale exécute les suites de tests frontend et backend, le lint ciblé des fichiers modifiés et les builds ou vérifications de syntaxe appropriés aux deux projets.
