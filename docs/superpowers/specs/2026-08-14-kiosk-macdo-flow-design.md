# Kiosk Macdo Flow Design

## Goal

Refaire `/borne` avec un parcours tactile proche d'une borne fast-food : accueil, choix du mode, menu, panier, saisie nom, saisie numero, paiement au comptoir, confirmation.

## User Flow

1. La page affiche d'abord un ecran d'accueil avec un gros bouton `Nouvelle commande`.
2. Au clic, une modal demande `Sur place` ou `A emporter`.
3. Le menu s'affiche apres le choix :
   - categories en colonne a gauche,
   - produits au centre,
   - panier fixe en bas,
   - actions `Annuler` et `Commander`.
4. `Commander` ouvre une modal de saisie du nom avec un clavier tactile alphabetique.
5. `Suivant` ouvre une modal de saisie du numero avec un clavier tactile numerique.
6. `Suivant` ouvre l'etape paiement avec le bouton `Payer au comptoir`.
7. Apres validation, la confirmation affiche le numero de commande et propose `Nouvelle commande`.

## Architecture

La modification reste concentree dans `pages/borne.vue`.

Le checkout existant reste reutilise :

- `buildKioskCheckoutPayload`
- `cart/checkoutCounterPayBefore`
- `finishCheckout`
- impression ticket existante

La page gere un etat de parcours local avec `kioskStep` :

- `welcome`
- `mode`
- `menu`
- `name`
- `phone`
- `payment`
- `confirmation`

## UI Rules

- Le champ nom et le champ numero ne sont plus visibles dans le panier.
- Le mode `Sur place` / `A emporter` est choisi avant le menu.
- Le panier du parcours menu reste visible en bas.
- Les claviers sont des boutons tactiles larges, sans dependance externe.
- Le paiement final demandé est `Payer au comptoir`.

## Error Handling

- Si le panier est vide, `Commander` reste desactive.
- Si le nom est vide, `Suivant` dans la modal nom reste desactive.
- Si le numero est vide, `Suivant` dans la modal numero reste desactive.
- Les erreurs checkout existantes restent affichees dans l'etape paiement.
- `Annuler` abandonne la tentative en cours et revient a l'accueil.

## Testing

Les tests source de `test/kiosk-page.test.js` doivent verrouiller :

- le bouton `Nouvelle commande`,
- la modal choix mode,
- les categories laterales,
- le panier bas,
- les boutons `Annuler` / `Commander`,
- les claviers tactiles nom et numero,
- le bouton `Payer au comptoir`.
