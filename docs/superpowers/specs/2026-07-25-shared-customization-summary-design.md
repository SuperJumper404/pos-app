# Résumé partagé des personnalisations

## Objectif

Afficher les choix d'une ligne de commande de la même manière dans le panier et dans le détail d'une commande, tout en conservant les actions d'édition uniquement dans le panier.

## Architecture

Créer `components/products/CustomizationSummary.vue` comme composant de présentation partagé. Il consomme une liste de groupes normalisés ayant la forme suivante :

```js
{
  stepName: String,
  choices: Array
}
```

Chaque choix peut fournir `choice_name` ou `name`, `extra_price` ou `unit_extra_price`, ainsi qu'un identifiant d'étape pour l'action d'édition.

Le composant existant `CartCustomizationSummary.vue` est supprimé après migration de ses deux consommateurs actuels.

## Modes d'affichage

Le composant partagé expose :

- `groups`: groupes normalisés à afficher ;
- `editable`: affiche les actions « Modifier » par étape lorsqu'il vaut `true` ;
- `showTotal`: affiche le séparateur et le prix total lorsqu'il vaut `true` ;
- `unitPrice`: montant du produit utilisé uniquement lorsque `showTotal` vaut `true`.

Dans le panier, `editable` et `showTotal` valent `true`. Dans `pages/orders/detail/_id.vue`, ils restent à `false` afin d'obtenir un résumé en lecture seule sans répéter le prix de la ligne.

## Données

Le regroupement est centralisé dans `helpers/customizations.js`. Le panier transforme ses sélections courantes en groupes avec ce helper. Le détail de commande continue d'accepter les différents formats historiques (`customization_selections`, `customizationSnapshots`, `customizationList`) avant de les transmettre au même helper.

Le composant ne connaît pas les formats API historiques et ne modifie aucune donnée : il affiche uniquement les groupes reçus.

## Présentation

- Titre de l'étape en gras.
- Choix sous forme de chips `small` et `outlined`.
- Supplément affiché sous la forme `(+1,50 €)` lorsqu'il est non nul.
- Retour à la ligne naturel sur mobile.
- Message « Aucune option sélectionnée. » uniquement lorsque le consommateur rend explicitement le composant avec une liste vide.

## Comportement

Dans le panier, le clic sur « Modifier » émet `edit` avec l'identifiant de l'étape, comme aujourd'hui. Dans le détail de commande, aucune action interactive n'est rendue.

La modification ne change ni la logique de commande, ni les calculs de prix, ni le contrat API.

## Validation

- Test du regroupement commun des sélections.
- Test statique des deux modes et de la suppression de `CartCustomizationSummary.vue`.
- Suite frontend complète.
- ESLint ciblé sur les fichiers modifiés.
- Build Nuxt si les imports ou la compilation des composants l'exigent.
