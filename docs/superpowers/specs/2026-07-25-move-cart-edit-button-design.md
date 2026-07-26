# Déplacement du bouton global de modification du panier

## Objectif

Séparer visuellement l’action globale « Modifier toutes les options » des petits boutons « Modifier » associés à chaque étape de personnalisation.

## Design validé

Dans `pages/cart.vue`, le bouton avec l’icône crayon quitte la zone du récapitulatif des personnalisations. Il est placé dans l’en-tête de la ligne, sous le nom et le prix du produit, avec le libellé « Modifier toutes les options ».

Le bouton reste visible uniquement pour une ligne possédant des étapes de personnalisation et continue d’appeler `editCartLine(itemIndex)` sans étape initiale, afin de rouvrir le wizard depuis sa première étape.

Les petits boutons « Modifier » de `CartCustomizationSummary` restent à côté de leur étape et continuent d’ouvrir directement l’étape correspondante. Les contrôles de quantité restent inchangés à droite.

## Portée et vérification

Aucune logique métier, API ou donnée n’est modifiée. Le contrôle ciblé vérifie la nouvelle position du bouton, la compilation du template Vue et le lint de `pages/cart.vue` avec les avertissements existants tolérés.
