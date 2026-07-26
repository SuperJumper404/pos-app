# Badge des commandes en attente dans le menu latéral

## Objectif

Afficher en permanence aux administrateurs le nombre de commandes arrivées mais pas encore traitées.

## Définition du compteur

Une commande non traitée est une commande dont `status` vaut `1` (« En attente »). Le compteur est dérivé de `orders/dataOrders`, sans état « lu/non lu » supplémentaire.

Le badge rouge apparaît sur l’entrée « Commandes » lorsque le compteur est supérieur à zéro. Il est masqué lorsque le compteur vaut zéro. Le contenu est plafonné visuellement à `99+` afin de préserver la largeur du menu.

## Actualisation

Le layout administrateur charge les commandes à son montage et les actualise toutes les 15 secondes lorsque la route courante n’est pas la page `/orders`. La page Commandes conserve son polling existant ; le layout ne lance donc pas une seconde requête pendant que cette page est active.

Le timer du layout est détruit avec le composant. Les utilisateurs non administrateurs ne déclenchent pas ce polling.

Le compteur diminue automatiquement lorsque le store reçoit une liste où une commande a quitté le statut `1`, notamment après validation, annulation ou suppression.

## Architecture

`layouts/default.vue` calcule `pendingOrderCount` depuis `orders/dataOrders`, affiche le badge uniquement pour l’élément dont `routeName` vaut `orders`, et gère le polling administratif. L’action Vuex existante `orders/getAllOrder` reste l’unique accès réseau.

## Erreurs et vérification

En cas d’échec de chargement, le store existant retourne une liste vide et le badge disparaît ; aucune notification supplémentaire n’est créée. Les tests ciblés vérifient le filtrage `status = 1`, le plafonnement, la visibilité du badge, l’absence de double polling sur `/orders` et le nettoyage du timer.
