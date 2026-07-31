# Mobile Cart Add Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a lightweight snackbar confirmation when a menu product is successfully added to the cart.

**Architecture:** Keep the behavior inside `pages/menus.vue`, where add-to-cart actions already live. Add local snackbar state and one helper method, then call it after successful simple-product adds and customization confirmations. Reuse the existing `openCart()` method for the snackbar action.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Node-based regression tests.

## Global Constraints

- Use Vuetify `v-snackbar`.
- Message is `Produit ajouté au panier`.
- Action is `Voir le panier`.
- Do not show the snackbar for blocked adds: kitchen closed, unavailable customization, or no stock.
- Do not introduce a floating cart badge, button animation, cart drawer redesign, or checkout behavior changes.

---

### Task 1: Add Snackbar Regression Coverage

**Files:**
- Modify: `test/customizations.test.js`

**Interfaces:**
- Consumes: `menusOptions.methods.addToCart`, `menusOptions.methods.confirmCustomization`.
- Produces: Regression assertions that require `showCartAddFeedback()` to be called only after successful adds.

- [ ] **Step 1: Add failing assertions**

Add a `cartFeedbackEvents` array and a `showCartAddFeedback()` spy to the existing `menusVm` fixture:

```js
const cartFeedbackEvents = []
const menusVm = {
  // existing fixture fields
  showCartAddFeedback(product) {
    cartFeedbackEvents.push(product && product.name)
  },
}
```

Assert that:

```js
assert.deepStrictEqual(cartFeedbackEvents, ['Menu'])
```

after `confirmCustomization()` succeeds, and assert `['Menu', 'Produit simple', 'Produit simple']` after two successful simple adds.

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/customizations.test.js`

Expected: FAIL because `showCartAddFeedback()` is not called by `menus.vue`.

### Task 2: Implement Snackbar State And Calls

**Files:**
- Modify: `pages/menus.vue`

**Interfaces:**
- Consumes: existing `openCart()`, `addToCart(params)`, and `confirmCustomization(customization)`.
- Produces: `cartAddSnackbar`, `cartAddSnackbarText`, and `showCartAddFeedback(product)` local component state/method.

- [ ] **Step 1: Add template snackbar**

Add a second `v-snackbar` near the existing kitchen snackbar:

```vue
<v-snackbar v-model="cartAddSnackbar" color="success" timeout="2200" bottom>
  <v-icon left>mdi-cart-check</v-icon>
  {{ cartAddSnackbarText }}
  <template #action="{ attrs }">
    <v-btn text v-bind="attrs" @click="openCart">Voir le panier</v-btn>
  </template>
</v-snackbar>
```

- [ ] **Step 2: Add local state**

Add to `data()`:

```js
cartAddSnackbar: false,
cartAddSnackbarText: 'Produit ajouté au panier',
```

- [ ] **Step 3: Add helper method**

Add to `methods`:

```js
showCartAddFeedback() {
  this.cartAddSnackbarText = 'Produit ajouté au panier'
  this.cartAddSnackbar = true
}
```

- [ ] **Step 4: Trigger after successful adds**

Call `this.showCartAddFeedback(line)` after `confirmCustomization()` updates totals, and call `this.showCartAddFeedback(params)` after a simple product add updates totals.

- [ ] **Step 5: Run targeted test**

Run: `node test/customizations.test.js`

Expected: PASS.

### Task 3: Final Verification And Commit

**Files:**
- Modify only if verification finds an issue.

- [ ] **Step 1: Run full tests**

Run: `npm.cmd test`

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm.cmd run build-local`

Expected: PASS with only existing Browserslist/bundle-size warnings.

- [ ] **Step 3: Commit**

```bash
git add pages/menus.vue test/customizations.test.js docs/superpowers/plans/2026-07-31-mobile-cart-add-feedback-implementation.md
git commit -m "feat: add menu cart feedback snackbar"
```

## Self-Review

- Spec coverage: snackbar, copy, action, successful add triggers, blocked add exclusions, and verification are covered.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: component state and method names are defined before use.

