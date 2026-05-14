# Design: prix, centimes et TVA

## Contexte

Le frontend POS est une application Nuxt 2. Le backend Express voisin stocke
actuellement plusieurs montants en entiers SQL (`int`), ce qui empêche de
conserver correctement les prix avec centimes.

Les affichages frontend sont aussi hétérogènes : certains écrans utilisent le
helper `conversiRp`, d'autres affichent directement `price` ou `total`. Le
helper actuel ne force pas deux décimales et utilise un format de séparateurs
qui n'est pas adapté aux montants en euros.

La TVA existe sous forme d'activation (`activate_tva`) mais son calcul actuel
part souvent de `TVA = total * 0.20`, ce qui surestime la TVA lorsque le total
est déjà TTC.

## Regles metier validees

- Les prix produits et supplements saisis dans l'administration sont TTC.
- Le client voit et paie toujours le total TTC.
- Le taux de TVA reste fixe a 20%.
- Si la TVA est activee, les tickets affichent le HT, la TVA incluse et le total
  TTC.
- Si la TVA est desactivee, les tickets conservent la mention de TVA non
  applicable.

## Architecture cible

### Backend

Les colonnes monetaires doivent accepter deux decimales :

- `products.price`
- `product_choice.price`
- `orders.subtotal`
- `orderdetail.price`
- `orderdetail.total`
- `archives.subtotal`
- `archivesdetail.price`
- si elles existent dans une base deja migree, les colonnes equivalentes
  historiques doivent suivre la meme logique.

Le type cible est `DECIMAL(10,2)`, afin de garder une representation stable en
base. Les controleurs backend doivent normaliser les montants entrants avec une
fonction commune qui accepte les valeurs numeriques ou chaines numeriques, puis
retourne un nombre arrondi a deux decimales pour insertion.

Les controles de presence ne doivent pas rejeter `0` uniquement parce que la
valeur est falsy. Pour les montants, il faut distinguer une valeur absente d'une
valeur numerique valide.

### Frontend

Un helper prix unique doit remplacer l'affichage heterogene des montants. Il
doit :

- parser une valeur de prix (`"10,50"`, `"10.50"`, `10.5`) ;
- arrondir a deux decimales pour les calculs de ligne et de panier ;
- afficher en format francais avec deux centimes, par exemple `10,50`;
- fournir un helper complet avec devise si utile, par exemple `10,50 €`.

Les ecrans produits, menus, panier, commandes, historique, caisse, rapports et
tickets doivent utiliser ce helper au lieu d'afficher directement les valeurs
brutes.

### Calculs panier et commande

Le panier continue de calculer :

- prix ligne = prix produit TTC + supplements TTC ;
- total ligne TTC = quantite * prix ligne ;
- total commande TTC = somme des lignes.

Chaque total doit etre arrondi a deux decimales au moment du calcul afin
d'eviter les erreurs classiques de flottants JavaScript dans l'interface.

### TVA

Quand `activate_tva` est actif :

- total TTC = total de la commande ;
- montant HT = total TTC / 1.20 ;
- TVA incluse = total TTC - montant HT.

Les tickets PDF, tickets cloud et tickets ESC/POS doivent utiliser la meme
formule. Les libelles doivent rester simples : `Sous-total HT`, `TVA (20%)` et
`TOTAL TTC`.

Quand `activate_tva` est inactif, le total reste affiche avec deux decimales et
la mention `TVA non applicable, art. 293 B du CGI` est conservee.

## Migration et compatibilite

La migration SQL doit convertir les colonnes entieres existantes vers
`DECIMAL(10,2)` sans changer les valeurs entieres deja stockees. Par exemple,
`10` devient `10.00`.

Cette etape ne convertit pas une ancienne convention en centimes, car le code
existant manipule deja les prix comme des euros (`10`, `10.5`) et non comme des
centimes (`1050`).

## Erreurs et validation

Les API de creation et modification de produits doivent refuser un prix absent
ou non numerique, mais accepter les valeurs decimales positives. Les details de
commande doivent aussi refuser les montants non numeriques.

Le frontend doit garder les champs de prix en saisie numerique simple, mais
normaliser les virgules en points avant envoi si necessaire.

## Verification

Scenario minimal a verifier :

1. Creer un produit a `10,50 €` TTC.
2. Ajouter un supplement a `0,50 €`.
3. Ajouter deux fois ce produit au panier.
4. Verifier un total TTC de `22,00 €`.
5. Avec TVA activee, verifier HT `18,33 €`, TVA `3,67 €`, total TTC `22,00 €`.
6. Verifier les memes montants sur l'affichage commande, l'historique, le PDF et
   les impressions.

## Hors scope

- Ajouter un taux de TVA configurable.
- Gerer plusieurs taux de TVA par produit.
- Reprendre les anciennes donnees qui auraient ete saisies avec une convention
  differente non documentee.
- Refactorer globalement les stores ou les pages Nuxt sans lien direct avec les
  prix et la TVA.
