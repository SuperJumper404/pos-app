# Accès aux étapes produit depuis la page Produits

## Objectif

Retirer l’entrée « Étapes produits » du menu latéral et regrouper l’accès au catalogue de personnalisation avec la gestion des produits.

## Navigation

L’entrée `customizations` reste dans `helpers/listdashboard.js` pour fournir son titre et son icône aux pages concernées, mais elle n’est plus marquée comme entrée administrateur visible. Sa route `/customizations` et son écran actuel restent inchangés.

La barre d’actions de `pages/products/index.vue` affiche deux actions :

- « Ajouter un produit », comportement existant ;
- « Gérer les étapes », avec une icône de liste, qui navigue vers `/customizations`.

Les écrans de création et de modification d’un produit continuent d’utiliser `ProductStepConfigurator` pour associer les étapes de la bibliothèque au produit.

## Responsive et accessibilité

Les deux boutons peuvent revenir à la ligne sur les petites largeurs sans se chevaucher. Les libellés restent textuels afin que la destination soit explicite.

## Portée et vérification

Aucune route, API ou structure de données n’est modifiée. Le test ciblé vérifie que l’entrée n’est plus visible dans la navigation administrateur et que le bouton Produits conserve l’accès à `/customizations`. Le template Produits est compilé et les fichiers touchés sont lintés.
