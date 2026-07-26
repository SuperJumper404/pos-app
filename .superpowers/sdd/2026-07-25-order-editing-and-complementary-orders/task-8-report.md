# Task 8 — Catalogue, panier et étapes en mode édition

## Résultat

Le catalogue et le panier affichent maintenant une session d’édition explicite
pour la commande active. Le catalogue conserve le panier hydraté, réutilise le
wizard existant pour ajouter ou reconfigurer une ligne et maintient l’état
`dirty` sans perturber le checkout normal.

Le panier remplace son action principale par **Enregistrer les modifications**.
Un panier vide demande confirmation puis envoie bien `items: []`, ce qui annule
la commande via le backend actuel. Les erreurs de revalorisation rouvrent le
cycle de confirmation, les conflits et commandes devenues non modifiables
retournent au détail, et les réponses `payment_refresh` conservent la session
jusqu’à la confirmation ou à la reprise idempotente du paiement Stripe.

## Fichiers

- `components/orders/OrderEditBanner.vue` : bandeau commun et sortie du mode
  modification.
- `pages/menus.vue` : conservation du panier actif, synchronisation du dirty
  state et ajout/modification par le wizard existant.
- `pages/cart.vue` : enregistrement, annulation vide, erreurs métier et reprise
  du paiement.
- `store/orderEdit.js` : conservation du contexte pendant
  `payment_refresh`/`retryPayment`, nettoyage après succès terminal.
- `test/order-edit.test.js` et `test/customizations.test.js` : contrats store,
  navigation, panier vide, reprise et non-interférence avec le checkout.

## TDD et vérification

- RED : `node test/order-edit.test.js` échouait sur l’absence du bandeau et du
  mode édition dans Menus/Panier.
- RED : `node test/customizations.test.js` atteignait le checkout normal depuis
  une mutation de panier en mode édition.
- GREEN : `node test/order-edit.test.js`.
- GREEN : `node test/customizations.test.js`.
- Templates compilés isolément avec `vue-template-compiler` :
  `OrderEditBanner.vue`, `menus.vue`, `cart.vue`.
- ESLint ciblé : 0 erreur ; 6 avertissements `no-console` préexistants dans
  `pages/menus.vue`.
- `git diff --check` : succès.

## Commit

`feat: edit pending orders through cart`
