# TVA produit selon mode de vente

## Objectif

Permettre a un produit d'avoir deux taux de TVA :

- TVA sur place
- TVA a emporter

Le POS choisit automatiquement le bon taux selon le mode de vente de la commande. Le caissier ou le client ne choisit pas la TVA au panier.

## Regle metier

Chaque produit conserve un prix TTC unique. La TVA utilisee pour calculer HT/TVA depend de `is_takeaway` :

- `is_takeaway = false` : utiliser `vat_rate_dine_in`
- `is_takeaway = true` : utiliser `vat_rate_takeaway`

Pour les produits dont la TVA ne change pas selon le mode de vente, les deux taux seront identiques.

## Donnees

Cote backend, ajouter deux colonnes sur `products` :

- `vat_rate_dine_in DECIMAL(4,2) NOT NULL DEFAULT 10.00`
- `vat_rate_takeaway DECIMAL(4,2) NOT NULL DEFAULT 10.00`

La colonne existante `products.vat_rate` reste presente pour compatibilite. La migration initialise les deux nouvelles colonnes avec la valeur existante de `vat_rate`, afin de ne pas changer le comportement des produits deja crees.

Les lignes de commande gardent le fonctionnement actuel : le taux utilise est fige dans `orderdetail.vat_rate`, avec `unit_price_ht`, `unit_vat`, `total_ht` et `total_vat`. Les archives gardent aussi leurs snapshots TVA existants.

## Creation et edition produit

Les pages produit affichent deux champs TVA :

- TVA sur place
- TVA a emporter

Les taux autorises restent ceux deja acceptes par l'application : `5.5`, `10`, `20`. Le formulaire envoie les deux valeurs au backend.

Pour compatibilite, si une ancienne requete envoie seulement `vat_rate`, le backend peut encore l'accepter et l'utiliser comme valeur par defaut des deux nouveaux taux.

## Checkout

Le calcul de panier utilise le taux adapte au mode de vente de la commande :

- panier sur place : `vat_rate_dine_in`
- panier a emporter : `vat_rate_takeaway`

Le choix doit fonctionner pour :

- commande table QR
- commande comptoir
- click and collect
- commande payee avant
- commande payee au comptoir

## Edition de commande

Quand une commande est modifiee, le calcul TVA est refait avec le mode de vente final de la commande. Si l'utilisateur change `Sur place` vers `A emporter`, les lignes recalculees utilisent la TVA a emporter.

Les commandes deja archivees ne sont jamais recalculees.

## Reçus, historique et Ticket Z

Les reçus, l'historique, les statistiques TVA et les Tickets Z continuent de lire les snapshots dans les details de commande et d'archive. Ils n'ont pas besoin de connaitre les deux taux produit.

Cela garantit qu'une commande ancienne reste fiscalement stable meme si le taux du produit change plus tard.

## Erreurs et compatibilite

Si un taux est absent :

- `vat_rate_dine_in` retombe sur `vat_rate`
- `vat_rate_takeaway` retombe sur `vat_rate_dine_in`, puis `vat_rate`

Si un taux est invalide, le backend renvoie l'erreur existante `VAT_RATE_INVALID`.

## Tests

Ajouter ou adapter les tests pour couvrir :

- migration avec nouvelles colonnes et backfill depuis `vat_rate`
- validation backend des deux taux
- creation produit avec deux taux
- edition produit avec deux taux
- checkout sur place qui fige `vat_rate_dine_in`
- checkout a emporter qui fige `vat_rate_takeaway`
- edition de commande qui recalcule selon `is_takeaway`
- conservation des snapshots archives, reçus et Ticket Z

## Hors perimetre

Cette version ne cree pas une table generale de profils TVA. Elle ne gere pas non plus des taux par categorie, par horaire, par pays, ou par canal de vente autre que `Sur place` / `A emporter`.
