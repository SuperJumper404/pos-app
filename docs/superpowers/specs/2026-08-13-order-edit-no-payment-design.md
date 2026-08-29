# Edition de commande sans encaissement

Date : 2026-08-13

## Probleme

La modification d'une commande ouvre une modale qui reutilise `MenusPage`.
Cette page contient aussi la Vue express et son bouton d'encaissement. Pendant
une edition, l'interface peut donc melanger le panier de la commande existante
avec le checkout d'une nouvelle commande.

Le risque principal est qu'un operateur pense encaisser la commande modifiee
alors que le checkout Express cree une nouvelle commande.

## Regle metier

Quand `orderEdit/active === true`, le parcours est strictement limite a :

1. modifier les produits, quantites et personnalisations ;
2. enregistrer les modifications ;
3. annuler l'edition.

Aucun paiement, encaissement ou checkout Express ne doit etre declenchable
pendant cette session.

## Parcours cible

### Debut de modification

- Le bouton `Modifier` initialise `orderEdit` comme actuellement.
- La modale affiche le catalogue classique et le panier de la commande.
- La Vue express est masquee ou desactivee en mode edition.
- Le bouton d'action du panier est `Enregistrer les modifications`.
- Le bouton de paiement Express n'est jamais affiche.

### Enregistrement

- Le serveur recalcule le contenu et le nouveau total.
- La commande conserve son id, son client, sa table et son contexte de
  paiement.
- La modale se ferme apres succes.
- Le detail de commande est recharge.
- Le bouton `Encaisser` du detail utilise alors le nouveau total, si la
  commande est toujours encaissable.

### Annulation

- Les changements locaux sont abandonnes avec confirmation si le panier est
  modifie.
- La commande serveur reste inchangee.
- La modale se ferme et le detail est conserve.

## Garde-fous frontend

- `pages/menus.vue` ne rend pas la zone Express lorsque `isOrderEditActive`
  est vrai.
- Les methodes `openExpressPaymentDialog`, `submitExpressPayment` et
  `submitExpressPayLater` refusent toute execution en mode edition, meme si
  elles sont appelees programmatiquement.
- Le checkout normal dans `pages/cart.vue` reste remplace par `saveOrderEdit`
  lorsque le store `orderEdit` est actif.
- Le detail commande reste le seul endroit autorise a encaisser apres la
  fermeture de la modale.

## Architecture

Le store `orderEdit` reste la source de verite du mode edition. Il n'y a pas
de nouveau type de paiement ni de nouvelle route backend. La correction est
limitee aux controles de rendu et aux gardes des actions Express, afin de
preserver le checkout normal hors edition.

## Tests

Les tests verifieront que :

- la zone Express est masquee en mode edition ;
- les actions Express refusent l'execution en mode edition ;
- le panier conserve `Enregistrer les modifications` comme action principale ;
- le detail reste le point d'entree de l'encaissement apres sauvegarde ;
- le checkout Express fonctionne toujours hors edition.
