# Alignement du compteur de commandes

## Objectif

Afficher le compteur des commandes en attente sur la même ligne que le libellé
« Commandes », avec la couleur `primary` déjà définie par le thème.

## Conception

- Remplacer le `v-badge` flottant par un `v-chip` `x-small`.
- Conserver le compteur dans le même conteneur flex que le texte du menu.
- Utiliser `color="primary"` et un texte blanc.
- Conserver le masquage lorsque le compteur vaut zéro et le plafond `99+`.
- Ne modifier ni le calcul, ni le polling des commandes.

## Validation

- Vérifier le contrat du template du layout.
- Compiler uniquement le template de `layouts/default.vue`.
- Exécuter le lint ciblé du layout.
