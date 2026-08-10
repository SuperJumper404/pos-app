# Comptoir Express Pay Before Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast admin counter ordering mode where the order is paid before being sent, then appears as "En attente" for kitchen validation.

**Architecture:** Reuse the existing checkout pipeline and cart/customization helpers. Add a small payment-mode extension so counter pay-before orders are marked paid without changing kitchen status.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, Node-based tests.

## Global Constraints

- Work on branch `codex/quick-counter-pay-before`.
- Do not duplicate core cart, checkout, customization, order status, or printing logic.
- Keep QR Stripe pay-before and QR pay-after flows unchanged.
- Counter pay-before orders must be `payment_status = paid` and `status = 1`.
- Keep UI consistent with existing Vuetify admin pages.

---

### Task 1: Counter Payment Mode Contract

**Files:**
- Create: `helpers/counterCheckout.js`
- Test: `test/counter-checkout.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `COUNTER_PAY_BEFORE_MODE`, `buildCounterPayBeforePayment(method)`, `isCounterPayBeforePaymentMode(mode)`, `getCounterPayBeforeMethod(mode)`.

- [ ] Write failing tests for the counter payment helper.
- [ ] Run `node test/counter-checkout.test.js` and confirm it fails because the helper does not exist.
- [ ] Implement `helpers/counterCheckout.js`.
- [ ] Add the test to `npm test`.
- [ ] Run `node test/counter-checkout.test.js` and confirm it passes.

### Task 2: Backend Checkout Paid Counter Mapping

**Files:**
- Modify: `../express-pos/src/modules/m_checkout.js`
- Test: `../express-pos/test/counter-checkout-payment-mode.test.js` if backend tests exist, otherwise add a small exported helper test in frontend workspace that reads the shared mode semantics.

**Interfaces:**
- Consumes: payment mode prefix `counter_pay_before:`.
- Produces: checkout-created order fields `payment_status: "paid"`, `payment_provider: "counter"`, `status: 1`.

- [ ] Write a failing backend/payment-mode test for `counter_pay_before:Espèces`.
- [ ] Run the targeted test and confirm it fails with unpaid/current behavior.
- [ ] Extract or add minimal payment-mode resolution in `m_checkout.js`.
- [ ] Run the targeted test and confirm it passes.

### Task 3: Store Action For Express Counter Checkout

**Files:**
- Modify: `store/cart.js`
- Test: `test/counter-checkout-store.test.js`

**Interfaces:**
- Consumes: `buildCounterPayBeforePayment(method)`.
- Produces: `cart/checkoutCounterPayBefore(params)` returning the same `{ ok, data, error }` shape as `checkoutOrder`.

- [ ] Write a failing test for the new Vuex action behavior using a stubbed `checkoutOrder`.
- [ ] Run `node test/counter-checkout-store.test.js` and confirm it fails.
- [ ] Implement `checkoutCounterPayBefore`.
- [ ] Add the test to `npm test`.
- [ ] Run the targeted test and confirm it passes.

### Task 4: Comptoir Express Page

**Files:**
- Create: `pages/comptoir-express.vue`
- Modify: `helpers/listdashboard.js`
- Modify: `test/admin-navigation.test.js`

**Interfaces:**
- Consumes: `products/getProducts`, `categories/getCategories`, `shop/getShopInfo`, `cart/checkoutCounterPayBefore`.
- Produces: route `/comptoir-express` and navigation item title `Comptoir express`.

- [ ] Extend the navigation test to expect `/comptoir-express`.
- [ ] Run `node test/admin-navigation.test.js` and confirm it fails.
- [ ] Create the page using existing Vuetify and cart/customization patterns.
- [ ] Add the navigation item.
- [ ] Run the navigation test and confirm it passes.

### Task 5: Verification

**Files:**
- All touched files.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Inspect `git diff --check`.
- [ ] Review that Stripe QR and pay-after code paths were not changed beyond shared helper-safe additions.
