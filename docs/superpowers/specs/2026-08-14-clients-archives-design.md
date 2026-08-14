# Module Mes clients

## Objectif

Ajouter un nouveau module frontend `Mes clients` qui aide le restaurateur a
identifier les clients ayant laisse un numero de telephone dans les commandes
archivees.

## Source de donnees

Le module utilise uniquement les commandes archivees chargees par
`history/getAllArchivedOrders`, donc les donnees de
`history/dataArchivedOrders`. L'API existante `/baseurl/api/v1/orders/archives`
renvoie les colonnes de `archives`, dont `customer`, `phone`, `subtotal` et
`created`.

Les commandes sans telephone vide ou exploitable ne sont pas affichees dans le
module clients.

## Regroupement

Un client est identifie par son numero de telephone normalise. La normalisation
supprime les espaces et separateurs courants afin de regrouper des variantes
comme `06 00 00 00 00`, `06-00-00-00-00` et `0600000000`.

Le numero affiche reste lisible, en priorite la premiere version non vide
rencontree dans les commandes archivees.

## Colonnes

La page `/clients` affiche une table Vuetify triable et filtrable avec :

- `Telephone`
- `Top 3 noms`
- `Commandes`
- `Total depense`
- `Panier moyen`
- `Premiere commande`
- `Derniere visite`

`Derniere visite` est affichee sous forme relative en jours, par exemple
`Aujourd'hui`, `Hier` ou `Il y a 5 jours`, pas comme une date brute.

## Navigation

Ajouter une entree principale `Mes clients` dans la navigation du layout
admin/staff. Le module reutilise la permission `history`, car il repose sur les
archives de commandes et ne necessite pas une nouvelle permission dediee pour
cette premiere version.

## Comportement UI

La page suit les patterns existants des pages `orders` et `history` :

- `middleware: 'auth'`
- chargement avec `Loading`
- alerte d'erreur si le store history expose un message
- barre de recherche
- `v-data-table` avec tri
- formatage monnaie via le mixin `price`

Le tri par defaut met les clients revenus le plus recemment en haut.

## Tests

Ajouter un helper testable pour transformer une liste de commandes archivees en
lignes clients. Les tests couvrent :

- exclusion des commandes sans telephone
- regroupement des variantes d'un meme telephone
- calcul du top 3 des noms differents par frequence
- calcul du nombre de commandes
- calcul du total depense et du panier moyen
- calcul de la premiere commande et de la derniere visite
- presence du module dans la navigation principale

## Hors scope

Pas de badge VIP/regulier/nouveau. Pas de nouvelle API backend. Pas de fiche
client detaillee dans cette premiere version.
