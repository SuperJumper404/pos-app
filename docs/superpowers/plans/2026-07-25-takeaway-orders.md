# Takeaway Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a simple `is_takeaway` packaging flag through checkout, Stripe, order editing, archive, and kitchen/mobile/history interfaces, while fixing overlapping actions in the embedded cart.

**Architecture:** The backend owns normalization and persistence of `is_takeaway` on `orders` and `archives`; it does not alter `customerID` or create technical users. The frontend carries the Boolean through checkout persistence and `orderEdit`, and a reusable chip renders it consistently. The embedded cart receives scoped responsive action-grid styles.

**Tech Stack:** MySQL/dbmate, Express, Node `assert`, Nuxt 2, Vue 2, Vuetify, Vuex, Axios.

## Global Constraints

- `is_takeaway` only indicates packaging; it never changes the table, client, operator, or `customerID`.
- Existing orders and omitted values default to `false`.
- The checkbox is available to kitchen/admin and mobile clients.
- Order editing may change the flag in either direction atomically with item changes.
- Add no dependency and preserve all existing Stripe and standalone `/cart` behavior.
- Preserve the unrelated existing backend modification `express-pos.code-workspace`.

---

### Task 1: Backend checkout persistence and migration

**Files:**
- Create: `../express-pos/db/migrations/20260725150000_takeaway_orders.sql`
- Modify: `../express-pos/src/modules/m_checkout.js`
- Modify: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Consumes: public request field `is_takeaway` as `true`, `false`, `1`, `0`, `"1"`, or `"0"`; omission means `false`.
- Produces: normalized `isTakeaway: boolean` in checkout input and persisted `orders.is_takeaway: 0 | 1`.
- Produces: `canonicalPayloadHash()` that distinguishes takeaway from non-takeaway payloads.

- [ ] **Step 1: Write failing checkout contracts**

Add literal hash and persistence assertions to `test/checkout-contract.test.js`:

```js
const baseCheckoutPayload = {
  customer: { id: 12, name: "Ada", phone: "0600000000", remark: null },
  expectedTotal: 10,
  clientOrderToken: "token-takeaway",
  paymentMode: "cash",
  items: [{ productId: 1, quantity: 1, selectedChoiceIds: [] }],
};
assert.notStrictEqual(
  canonicalPayloadHash({ ...baseCheckoutPayload, isTakeaway: false }),
  canonicalPayloadHash({ ...baseCheckoutPayload, isTakeaway: true }),
);
```

Extend the checkout repository harness to capture `insertOrder({ order })`, create a checkout with `isTakeaway: true`, and assert:

```js
assert.strictEqual(insertedOrder.is_takeaway, 1);
assert.strictEqual(insertedOrder.customerID, 12);
```

Add a controller request with `is_takeaway: "invalid"` and assert status `400`, code `CHECKOUT_REQUEST_INVALID`, and field `is_takeaway`.

- [ ] **Step 2: Verify RED**

Run: `node test/checkout-contract.test.js`

Expected: FAIL because takeaway does not affect the hash, validation, or inserted order.

- [ ] **Step 3: Add the reversible migration**

Create:

```sql
-- migrate:up
ALTER TABLE `orders`
  ADD COLUMN `is_takeaway` TINYINT(1) NOT NULL DEFAULT 0 AFTER `remark`;
ALTER TABLE `archives`
  ADD COLUMN `is_takeaway` TINYINT(1) NOT NULL DEFAULT 0 AFTER `remark`;

-- migrate:down
ALTER TABLE `archives` DROP COLUMN `is_takeaway`;
ALTER TABLE `orders` DROP COLUMN `is_takeaway`;
```

- [ ] **Step 4: Normalize and persist the flag**

In `m_checkout.js`, implement a strict helper:

```js
const normalizeBoolean = (value, field, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if ([true, 1, "1"].includes(value)) return true;
  if ([false, 0, "0"].includes(value)) return false;
  throw invalidRequest(field);
};
```

Map `body.is_takeaway` to `isTakeaway`, validate it, include `is_takeaway` in `canonicalPayload()`, and insert `is_takeaway: checkout.isTakeaway ? 1 : 0`. Do not change `customer.id` or `customerID`.

- [ ] **Step 5: Verify GREEN**

Run: `node test/checkout-contract.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the backend checkout slice**

```powershell
git -C ..\express-pos add -- db/migrations/20260725150000_takeaway_orders.sql src/modules/m_checkout.js test/checkout-contract.test.js
git -C ..\express-pos commit -m "feat: persist takeaway checkout flag"
```

---

### Task 2: Backend atomic order editing and archive retention

**Files:**
- Modify: `../express-pos/src/modules/m_orderEditing.js`
- Modify: `../express-pos/src/controllers/c_orderEditing.js`
- Modify: `../express-pos/test/order-editing.test.js`
- Modify: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Consumes: edit body field `is_takeaway` with the same Boolean forms as checkout.
- Produces: editable order property `order.is_takeaway` and atomic update `changes.is_takeaway: 0 | 1`.
- Preserves: archive insertion copies the matching `is_takeaway` column from the order object.

- [ ] **Step 1: Write failing edit and archive contracts**

Add `is_takeaway: 1` to the editable-order fixture in `test/order-editing.test.js` and assert:

```js
assert.strictEqual(unpaid.order.is_takeaway, true);
```

Extend the amend harness call with `isTakeaway: false` and assert its captured update:

```js
assert.strictEqual(updateCall.changes.is_takeaway, 0);
```

Build two revisions from identical items but orders with `is_takeaway: 0` and `is_takeaway: 1`, then assert they differ. Add an archive repository test that passes an order with `is_takeaway: 1` and asserts the archive object retains `is_takeaway: 1`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node test/order-editing.test.js
node test/checkout-contract.test.js
```

Expected: at least one assertion fails because edit revision/update does not model takeaway.

- [ ] **Step 3: Include takeaway in edit revision and response**

Normalize database values with `[true, 1, "1"].includes(order.is_takeaway)` when returning the editable order. Include the Boolean in `buildContentRevision(order, items)` so a concurrent packaging change invalidates an old revision.

- [ ] **Step 4: Validate the controller body**

In `c_orderEditing.js`, parse `req.body.is_takeaway` with the same accepted forms. Omission passes `undefined` for compatibility; `amendOrder` then retains the locked order's current value. An invalid value returns the controller's existing invalid-request response with `field: "is_takeaway"`. Pass the parsed result to `amendOrder` as `isTakeaway`.

- [ ] **Step 5: Update takeaway under the existing transaction lock**

After locking the order, resolve `nextIsTakeaway` from `isTakeaway` when provided or from the locked order otherwise. When `amendOrder` calls the repository update, include:

```js
changes: {
  ...existingChanges,
  is_takeaway: nextIsTakeaway ? 1 : 0,
}
```

Use the same connection, order lock, content-revision check, and rollback path as item updates. Do not issue a separate non-transactional update.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
node test/order-editing.test.js
node test/checkout-contract.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the backend edit slice**

```powershell
git -C ..\express-pos add -- src/modules/m_orderEditing.js src/controllers/c_orderEditing.js test/order-editing.test.js test/checkout-contract.test.js
git -C ..\express-pos commit -m "feat: edit and archive takeaway orders"
```

---

### Task 3: Frontend checkout and order-edit state

**Files:**
- Modify: `helpers/customizations.js`
- Modify: `helpers/orderEdit.js`
- Modify: `store/cart.js`
- Modify: `store/orderEdit.js`
- Modify: `pages/cart.vue`
- Modify: `test/customizations.test.js`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Produces: `formuser.isTakeaway: boolean`, default `false`.
- Produces: public payload `is_takeaway: boolean` and persisted attempt property of the same name.
- Produces: `orderEdit/originalTakeaway`, `orderEdit/takeaway`, and `orderEdit/setTakeaway` action.

- [ ] **Step 1: Write failing checkout payload contracts**

In `test/customizations.test.js`, assert two payload signatures differ only by `isTakeaway`, then exercise `buildOrderPayload()` with `formuser.isTakeaway: true`:

```js
assert.strictEqual(payload.isTakeaway, true);
```

Exercise the cart store public request builder and assert:

```js
assert.strictEqual(requestBody.is_takeaway, true);
assert.strictEqual(persistedAttempt.is_takeaway, true);
```

Restore a persisted attempt and assert `formuser.isTakeaway === true`.

- [ ] **Step 2: Verify checkout RED**

Run: `node test/customizations.test.js`

Expected: FAIL because the flag is absent from signatures, payloads, and restoration.

- [ ] **Step 3: Carry takeaway through checkout**

Add `isTakeaway` to `buildCheckoutPayloadSignature()` input, return `is_takeaway: params.isTakeaway === true` from the public store payload, retain it in `buildCheckoutAttemptPayload`, and restore it in `pages/cart.vue`. Add `isTakeaway: false` to `formuser` and return it from `buildOrderPayload()` without changing `selectedTable`.

- [ ] **Step 4: Add the creation checkbox**

Immediately after the phone field, add:

```vue
<v-checkbox
  v-model="formuser.isTakeaway"
  label="À emporter"
  color="primary"
  class="mt-0 mb-4"
  hide-details
/>
```

Keep the checkbox outside the `!isOrderEditActive`-only customer fields by rendering an equivalent shared checkbox for both create and edit modes.

- [ ] **Step 5: Verify checkout GREEN**

Run: `node test/customizations.test.js`

Expected: PASS.

- [ ] **Step 6: Write failing order-edit state contracts**

In `test/order-edit.test.js`, initialize an editable response with `order.is_takeaway: 1`, begin the session, and assert:

```js
assert.strictEqual(editState.originalTakeaway, true);
assert.strictEqual(editState.takeaway, true);
```

Dispatch `setTakeaway(false)` with an unchanged cart and assert `dirty === true`, `paymentRefresh === null`, and `cartToOrderEditPayload(...).is_takeaway === false`.

- [ ] **Step 7: Verify edit RED**

Run: `node test/order-edit.test.js`

Expected: FAIL because the edit store has no takeaway state or payload.

- [ ] **Step 8: Implement edit state and binding**

Add the two Boolean state fields, populate them in `startSession`, clear them in `clear`, and make dirty state equal to item changes OR `state.takeaway !== state.originalTakeaway`. Implement:

```js
setTakeaway({ dispatch, state, rootState }, value) {
  dispatch('set/takeaway', value === true)
  return dispatch('updateDirty', rootState.cart.dataCart || [])
}
```

Pass `isTakeaway: state.takeaway` into `cartToOrderEditPayload()` and have that helper emit `is_takeaway: isTakeaway === true`. In the cart, compute the checkbox value from `orderEdit/takeaway` during edits and dispatch `orderEdit/setTakeaway` on changes; outside edits bind to `formuser.isTakeaway`.

- [ ] **Step 9: Verify edit GREEN**

Run: `node test/order-edit.test.js`

Expected: PASS.

- [ ] **Step 10: Commit the frontend state slice**

```powershell
git add -- helpers/customizations.js helpers/orderEdit.js store/cart.js store/orderEdit.js pages/cart.vue test/customizations.test.js test/order-edit.test.js
git commit -m "feat: carry takeaway flag through checkout"
```

---

### Task 4: Takeaway chips and responsive modal actions

**Files:**
- Create: `components/orders/TakeawayChip.vue`
- Modify: `pages/orders/index.vue`
- Modify: `pages/orders/detail/_id.vue`
- Modify: `pages/ordersStatuses.vue`
- Modify: `pages/history/index.vue`
- Modify: `pages/history/ticket/_id.vue`
- Modify: `pages/cart.vue`
- Modify: `test/order-edit.test.js`
- Modify: `test/payment-status.test.js`

**Interfaces:**
- Produces: `<TakeawayChip :value="order.is_takeaway" />`, rendering nothing for false-like values and a compact chip for true-like values.
- Produces: `.cart-checkout-actions--embedded` grid layout scoped to embedded order editing.

- [ ] **Step 1: Write failing display contracts**

Add a small component-options loader for `TakeawayChip.vue` and assert its computed `visible` returns true for `true`, `1`, and `"1"`, and false for `false`, `0`, `"0"`, `null`, and `undefined`. Assert the relevant page sources register and render `TakeawayChip` against `is_takeaway`.

Add cart source assertions for `cart-checkout-actions--embedded`, `grid-template-areas`, and a mobile media query.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node test/order-edit.test.js
node test/payment-status.test.js
```

Expected: FAIL because the reusable chip and action-grid class do not exist.

- [ ] **Step 3: Create the reusable chip**

Create:

```vue
<template>
  <v-chip v-if="visible" x-small color="orange darken-1" dark>
    À emporter
  </v-chip>
</template>

<script>
export default {
  props: { value: { default: false } },
  computed: {
    visible() {
      return [true, 1, '1'].includes(this.value)
    },
  },
}
</script>
```

- [ ] **Step 4: Render chips in the requested interfaces**

Register the component and place it beside the order number or status in active orders, order detail, mobile status, history list, and historical detail. Do not replace or relabel the table.

- [ ] **Step 5: Fix embedded action overlap**

Bind the embedded class only when `embeddedOrderEdit && isOrderEditActive`. Use named grid areas so save spans both columns and return/cancel share the second row:

```css
.cart-checkout-actions--embedded {
  display: grid;
  gap: 12px;
  grid-template-areas: 'save save' 'menu cancel';
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.cart-checkout-actions--embedded .cart-checkout-btn {
  margin: 0 !important;
  max-width: none;
  width: 100%;
}
@media (max-width: 600px) {
  .cart-checkout-actions--embedded {
    grid-template-areas: 'save' 'menu' 'cancel';
    grid-template-columns: 1fr;
  }
}
```

Assign the corresponding area classes to the three buttons. Leave the standalone cart layout unchanged.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
node test/order-edit.test.js
node test/payment-status.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the display slice**

```powershell
git add -- components/orders/TakeawayChip.vue pages/orders/index.vue pages/orders/detail/_id.vue pages/ordersStatuses.vue pages/history/index.vue pages/history/ticket/_id.vue pages/cart.vue test/order-edit.test.js test/payment-status.test.js
git commit -m "feat: show takeaway orders across pos"
```

---

### Task 5: Cross-project verification

**Files:**
- Verify all files changed in Tasks 1–4.

**Interfaces:**
- Consumes: backend `is_takeaway` API contract and frontend Boolean state.
- Produces: two clean, tested repositories while retaining pre-existing warnings and unrelated user changes.

- [ ] **Step 1: Run backend targeted tests**

```powershell
node ..\express-pos\test\checkout-contract.test.js
node ..\express-pos\test\order-editing.test.js
```

Expected: PASS.

- [ ] **Step 2: Run the complete backend suite**

Run: `npm.cmd test` from `../express-pos`.

Expected: PASS. Also run `node --check` on each changed backend JS file.

- [ ] **Step 3: Run the complete frontend suite**

Run: `npm.cmd test` from `pos-app`.

Expected: PASS.

- [ ] **Step 4: Run scoped frontend lint**

Run ESLint against only the changed frontend JS/Vue files.

Expected: 0 errors; pre-existing warnings may remain. Record separately that global lint already has unrelated `nuxt.config.js` errors.

- [ ] **Step 5: Run the frontend build**

Run: `npm.cmd run build-local`.

Expected: Nuxt client compiles successfully.

- [ ] **Step 6: Inspect both worktrees**

```powershell
git diff --check
git status --short
git -C ..\express-pos diff --check
git -C ..\express-pos status --short
```

Expected: frontend clean after scoped commits; backend shows only committed feature work plus the pre-existing user-owned `express-pos.code-workspace` modification.
