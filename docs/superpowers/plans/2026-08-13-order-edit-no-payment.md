# Edition de commande sans encaissement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent any Express payment flow from being visible or executable while an existing order is being edited.

**Architecture:** `orderEdit/active` remains the single source of truth. `pages/menus.vue` will hide the Express workspace in edit mode and guard its payment entry points; `pages/cart.vue` will continue routing edit sessions to `orderEdit/save`; no backend or payment API changes are needed.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex Easy Access, Node assertion tests.

## Global Constraints

- An active order edit may only modify products, quantities, and customizations.
- The existing order detail remains the only payment entry point after saving.
- Preserve normal Express checkout behavior when `orderEdit/active` is false.
- Keep changes targeted to the edit and Express boundaries.

---

### Task 1: Add regression coverage

**Files:**
- Modify: `test/order-edit.test.js`
- Modify: `package.json`

- [ ] **Step 1: Add assertions for the edit-only Express boundary**

Assert that the menu template gates Express rendering with `!isOrderEditActive`,
that Express payment methods contain an edit-mode guard, and that the cart keeps
`saveOrderEdit` as the primary action in edit mode.

- [ ] **Step 2: Run the focused test and verify it fails**

Run `node test/order-edit.test.js`.
Expected: FAIL because the current Express template and methods do not contain
the new edit-mode guards.

### Task 2: Block Express during order edit

**Files:**
- Modify: `pages/menus.vue`

- [ ] **Step 1: Hide the Express workspace in edit mode**

Change the Express workspace and its Express-only checkout controls so they only
render when `isLargeProductView && !isOrderEditActive`.

- [ ] **Step 2: Guard Express payment methods**

Make `openExpressPaymentDialog`, `submitExpressPayment`, and
`submitExpressPayLater` return immediately when `isOrderEditActive` is true.
Keep the existing guards for loading and invalid carts.

- [ ] **Step 3: Run the focused test and verify it passes**

Run `node test/order-edit.test.js`.
Expected: PASS.

### Task 3: Verify edit checkout isolation

**Files:**
- Modify: `test/order-edit.test.js` only if an assertion needs to match the
  final template contract.

- [ ] **Step 1: Run the frontend test suite**

Run `npm.cmd test` from `pos-app`.
Expected: all tests pass, including order edit, checkout, discount, and
printing tests.

- [ ] **Step 2: Run targeted ESLint and build**

Run `.\node_modules\.bin\eslint.cmd --no-ignore --no-color --format compact pages/menus.vue pages/cart.vue test/order-edit.test.js`, then `npm.cmd run build-local`.
Expected: no ESLint errors and a successful Nuxt client compilation.

- [ ] **Step 3: Check the diff**

Run `git diff --check` and verify only the planned edit-mode guards and test
contract changed.
