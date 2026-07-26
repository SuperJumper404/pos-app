# Édition d’une ligne du panier depuis le menu

## Objectif

Permettre à l’utilisateur de rouvrir les étapes de personnalisation d’un produit déjà présent dans le panier latéral de la page menu, afin de corriger un oubli avant de passer commande.

## Interaction

La zone contenant l’image, le nom et le prix d’une ligne personnalisable devient cliquable et accessible au clavier. Les boutons de quantité `+` et `−` conservent leur comportement et ne déclenchent pas l’édition.

Au clic, le wizard de personnalisation existant s’ouvre à la première étape. Les choix actuels de la ligne sont préselectionnés. Une annulation ferme le wizard sans modifier le panier.

Les lignes sans étape de personnalisation ne déclenchent pas le wizard.

## Mise à jour de la ligne

La confirmation remplace toute la ligne ciblée :

- la quantité existante est conservée ;
- les choix, suppléments, prix unitaire et sous-total sont recalculés ;
- le sous-total correspond au nouveau prix unitaire multiplié par la quantité ;
- si une ligne ayant désormais la même configuration existe déjà, les deux lignes sont fusionnées ;
- le total et le nombre d’articles du panier sont recalculés puis synchronisés avec Vuex.

## Architecture

`pages/menus.vue` reçoit un index de ligne en cours d’édition, initialise le wizard avec `selectedChoiceIds`, et distingue la confirmation d’une création de celle d’une édition.

L’édition réutilise `replaceConfiguredCartLine` dans `helpers/customizations.js`, déjà utilisé par `pages/cart.vue`. Aucun changement backend, base de données ou API n’est nécessaire.

La fermeture du wizard remet à zéro le produit sélectionné, les choix et l’index d’édition pour éviter qu’une prochaine personnalisation ne modifie la mauvaise ligne.

## Gestion des cas limites

- Un index absent ou devenu invalide ne modifie pas le panier.
- Une ligne sans configuration ne s’ouvre pas en édition.
- La quantité est lue depuis la ligne source et reste inchangée.
- Les clics sur les contrôles de quantité ne remontent pas vers la zone d’édition.

## Vérification ciblée

Les tests frontend couvrent le remplacement d’une ligne avec conservation de quantité, la fusion avec une configuration existante et le branchement du panier latéral au wizard prérempli. Un lint ciblé et une compilation du template `pages/menus.vue` complètent la vérification minimale.
