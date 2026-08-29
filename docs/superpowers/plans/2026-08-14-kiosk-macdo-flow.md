# Kiosk Macdo Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `/borne` into a touch-first kiosk journey with welcome, sale-mode choice, menu, cart, virtual keyboard name/phone entry, counter payment, and confirmation.

**Architecture:** Keep the implementation scoped to `pages/borne.vue`, reusing existing checkout helpers and store actions. Add local step state and small local keyboard helpers instead of introducing dependencies.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, existing kiosk checkout helpers.

## Global Constraints

- Do not add a dependency.
- Keep checkout submission on `cart/checkoutCounterPayBefore`.
- Preserve `source: 'borne'` and `servicePointId` in the payload.
- Keep categories derived from loaded products.
- Keep frontend copy in French.

---

### Task 1: Kiosk Flow Contract

**Files:**
- Modify: `test/kiosk-page.test.js`

**Interfaces:**
- Consumes: `pages/borne.vue` source text.
- Produces: assertions that later implementation must satisfy.

- [ ] **Step 1: Write failing assertions**

Add assertions for:

```js
assert.match(pageSource, /kioskStep/)
assert.match(pageSource, /startNewOrder/)
assert.match(pageSource, /chooseSaleMode/)
assert.match(pageSource, /openCustomerNameStep/)
assert.match(pageSource, /openCustomerPhoneStep/)
assert.match(pageSource, /appendKeyboardValue/)
assert.match(pageSource, /keyboardTarget/)
assert.match(pageSource, /kiosk-welcome/)
assert.match(pageSource, /kiosk-mode-dialog/)
assert.match(pageSource, /kiosk-name-dialog/)
assert.match(pageSource, /kiosk-phone-dialog/)
assert.match(pageSource, /kiosk-side-categories/)
assert.match(pageSource, /kiosk-bottom-cart/)
assert.match(pageSource, /Commander/)
assert.match(pageSource, /Annuler/)
assert.match(pageSource, /Payer au comptoir/)
assert.doesNotMatch(pageSource, /v-model\.trim="customer"[\s\S]*label="Votre nom"/)
assert.doesNotMatch(pageSource, /v-model\.trim="phone"[\s\S]*label="Votre numero"/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-page.test.js`

Expected: FAIL because `kioskStep` and modal-specific classes do not exist.

- [ ] **Step 3: Implement page flow**

Modify `pages/borne.vue`:

- Add welcome screen controlled by `kioskStep === 'welcome'`.
- Add mode dialog controlled by `kioskStep === 'mode'`.
- Show menu only from `menu`, `name`, `phone`, `payment`, `confirmation` steps.
- Move cart to bottom.
- Add name dialog and phone dialog.
- Add methods:
  - `startNewOrder()`
  - `chooseSaleMode(mode)`
  - `openCustomerNameStep()`
  - `openCustomerPhoneStep()`
  - `openPaymentStep()`
  - `appendKeyboardValue(value)`
  - `backspaceKeyboardValue()`
  - `clearKeyboardValue()`
  - `cancelOrder()`
- Update counter submit to be triggered from the payment step.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/kiosk-page.test.js`

Expected: PASS.

---

### Task 2: Regression Verification

**Files:**
- Modify: `package.json`
- Test: existing frontend tests

**Interfaces:**
- Consumes: `test/kiosk-page.test.js`
- Produces: full frontend validation.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
node test/kiosk-page.test.js
node test/kiosk-checkout.test.js
node test/kiosk-final-fixes.test.js
```

Expected: all pass.

- [ ] **Step 2: Run full frontend tests**

Run: `npm.cmd test`

Expected: all pass.

- [ ] **Step 3: Run lint**

Run: `npm.cmd run lint -- --quiet`

Expected: 0 errors; existing warnings are acceptable.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-14-kiosk-macdo-flow-design.md docs/superpowers/plans/2026-08-14-kiosk-macdo-flow.md test/kiosk-page.test.js pages/borne.vue
git commit -m "feat: add tactile kiosk order flow"
```
