# Mobile Cart Add Feedback Design

## Objective

When a user adds a product to the cart from the menu, show a clear lightweight confirmation so mobile users understand the action succeeded.

## Selected Approach

Use a Vuetify snackbar in `pages/menus.vue`.

The snackbar appears after a successful add:

- simple product added from the menu grid;
- simple product added from product preview;
- customized product added after wizard confirmation.

It does not appear when the product cannot be added, such as kitchen closed, unavailable customization, or no stock.

## UX

Message:

```txt
Produit ajouté au panier
```

Include a cart icon and a short action:

```txt
Voir le panier
```

The action uses the existing `openCart()` method. In embedded order edit mode, this keeps the existing behavior and emits `show-cart`.

## Scope

In scope:

- add snackbar state to the menu page;
- trigger it only after successful add operations;
- add focused regression coverage.

Out of scope:

- floating cart badge;
- button animation;
- cart drawer redesign;
- changes to checkout behavior.

## Verification

Run:

```txt
node test/customizations.test.js
npm.cmd test
npm.cmd run build-local
```

