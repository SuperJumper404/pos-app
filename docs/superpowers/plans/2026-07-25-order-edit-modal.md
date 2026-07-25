# Order Edit Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the kitchen/admin order-edit workflow above the order detail in a full-screen modal while preserving the existing menu, cart, API, pricing, payment, and mobile-client behavior.

**Architecture:** Add a focused `OrderEditModal` coordinator that mounts the existing menu and cart pages as embedded components and translates their navigation into events. The order detail still owns edit-session startup and stale-request protection; embedded page props only replace route transitions, while standalone `/menus` and `/cart` behavior remains unchanged.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify `v-dialog`, Vuex, Node `assert` contract tests, ESLint.

## Global Constraints

- Only kitchen/admin access `0` may open the order-edit modal.
- Mobile client accesses `2` and `3` keep the existing new/complementary-order flow and cannot modify an order.
- Do not change API endpoints, price calculations, Stripe handling, or order-edit payload formats.
- Keep `/menus` and `/cart` working as standalone routes.
- Add no dependency and avoid unrelated refactoring.

---

### Task 1: Kitchen-only modal entry and coordinator

**Files:**
- Modify: `helpers/orderEdit.js`
- Create: `components/orders/OrderEditModal.vue`
- Modify: `pages/orders/detail/_id.vue`
- Test: `test/order-edit.test.js`

**Interfaces:**
- Produces: `canUseOrderEditModal(access, order): boolean` from `helpers/orderEdit.js`.
- Produces: `<OrderEditModal :value :order-number @input @completed>`; `value` controls visibility and `completed(orderId)` reports that the detail must reload.
- Consumes: existing `orderEdit/active`, `orderEdit/dirty`, `orderEdit/paymentRefresh`, and `orderEdit/cancel` Vuex contracts.

- [ ] **Step 1: Write failing access and structure contracts**

Extend the helper import and assertions in `test/order-edit.test.js`:

```js
const {
  canEditOrder,
  canStartComplementaryOrder,
  canUseOrderEditModal,
  editableOrderToCart,
  cartToOrderEditPayload,
  isOrderEditDirty,
} = require('../helpers/orderEdit')

assert.strictEqual(canUseOrderEditModal(0, editable.order), true)
assert.strictEqual(canUseOrderEditModal(2, editable.order), false)
assert.strictEqual(canUseOrderEditModal(3, editable.order), false)
assert.strictEqual(
  canUseOrderEditModal(0, { ...editable.order, status: 2 }),
  false
)

const modalPath = '../components/orders/OrderEditModal.vue'
assert.doesNotThrow(() => require.resolve(modalPath))
const modalSource = fs.readFileSync(require.resolve(modalPath), 'utf8')
assert.ok(modalSource.includes('<v-dialog'))
assert.ok(modalSource.includes('fullscreen'))
assert.ok(modalSource.includes("step === 'menu'"))
assert.ok(modalSource.includes("step === 'cart'"))
assert.ok(modalSource.includes("orderEdit/cancel"))

assert.ok(detailSource.includes('<OrderEditModal'))
assert.ok(detailSource.includes('canOpenOrderEditModal'))
assert.ok(detailSource.includes('this.orderEditDialog = true'))
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node test/order-edit.test.js`

Expected: FAIL because `canUseOrderEditModal` and `OrderEditModal.vue` do not exist.

- [ ] **Step 3: Implement the access helper**

Add to `helpers/orderEdit.js` and export it:

```js
const canUseOrderEditModal = (access, order = {}) =>
  Number(access) === 0 && canEditOrder(order)
```

- [ ] **Step 4: Create the modal coordinator**

Create `components/orders/OrderEditModal.vue` with these concrete responsibilities:

```vue
<template>
  <v-dialog :value="value" fullscreen persistent @input="$emit('input', $event)">
    <v-card>
      <v-toolbar dark color="primary">
        <v-btn icon @click="requestClose"><v-icon>mdi-close</v-icon></v-btn>
        <v-toolbar-title>
          Modification de la commande #{{ orderNumber }}
        </v-toolbar-title>
      </v-toolbar>
      <MenusPage
        v-if="step === 'menu'"
        embedded-order-edit
        @show-cart="step = 'cart'"
        @request-close="requestClose"
      />
      <CartPage
        v-else-if="step === 'cart'"
        embedded-order-edit
        @show-menu="step = 'menu'"
        @request-close="requestClose"
        @edit-complete="completeEdit"
      />
    </v-card>
  </v-dialog>
</template>
```

Use `value: Boolean` and `orderNumber: String` props, reset `step` to `menu` whenever `value` becomes true, and implement:

```js
async requestClose() {
  const unsafe =
    this.$store.get('orderEdit/dirty') === true ||
    Boolean(this.$store.get('orderEdit/paymentRefresh'))
  if (unsafe && !window.confirm('Quitter sans terminer la modification ?')) {
    return
  }
  await this.$store.dispatch('orderEdit/cancel')
  this.$emit('input', false)
},
completeEdit(orderId) {
  this.$emit('input', false)
  this.$emit('completed', orderId)
}
```

- [ ] **Step 5: Wire the modal into the detail page**

Import/register `OrderEditModal`, add `orderEditDialog: false`, expose `userAccess` from `users/user.access` with a `localStorage` fallback, and compute:

```js
canOpenOrderEditModal() {
  return canUseOrderEditModal(this.userAccess, this.orderSummary || {})
}
```

Use `canOpenOrderEditModal && !loadPage` for the edit button, recheck it in `requestOrderEdit()` and `startOrderEdit()`, then replace only the successful edit navigation with:

```js
this.orderEditDialog = true
```

Keep `this.$router.push('/menus')` in `startComplementaryOrder()`. Mount the modal with:

```vue
<OrderEditModal
  v-model="orderEditDialog"
  :order-number="String(orderSummary && orderSummary.ordernumber || '')"
  @completed="handleOrderEditCompleted"
/>
```

`handleOrderEditCompleted()` calls `loadOrderDetail(this.id)` so the underlying detail refreshes.

- [ ] **Step 6: Run the targeted test and verify GREEN**

Run: `node test/order-edit.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the kitchen-only modal entry**

```powershell
git add -- helpers/orderEdit.js components/orders/OrderEditModal.vue pages/orders/detail/_id.vue test/order-edit.test.js
git commit -m "feat: open kitchen order edits in modal"
```

---

### Task 2: Embedded menu navigation

**Files:**
- Modify: `pages/menus.vue`
- Test: `test/order-edit.test.js`

**Interfaces:**
- Consumes: Boolean prop `embeddedOrderEdit` supplied by `OrderEditModal`.
- Produces: `show-cart` when the embedded edit advances and `request-close` when its edit banner cancels.
- Preserves: standalone route navigation to `/cart` and order detail.

- [ ] **Step 1: Write failing menu behavior contracts**

After `menusOptions` is loaded in `test/order-edit.test.js`, add executable method checks:

```js
const embeddedMenuEvents = []
const embeddedMenuRoutes = []
const embeddedMenuVm = {
  embeddedOrderEdit: true,
  isOrderEditActive: true,
  $emit: (...args) => embeddedMenuEvents.push(args),
  $router: { push: (path) => embeddedMenuRoutes.push(path) },
}
menusOptions.methods.openCart.call(embeddedMenuVm)
assert.deepStrictEqual(embeddedMenuEvents, [['show-cart']])
assert.deepStrictEqual(embeddedMenuRoutes, [])

const standaloneMenuRoutes = []
menusOptions.methods.openCart.call({
  embeddedOrderEdit: false,
  isOrderEditActive: true,
  $emit() {},
  $router: { push: (path) => standaloneMenuRoutes.push(path) },
})
assert.deepStrictEqual(standaloneMenuRoutes, ['/cart'])
```

Also assert `menusOptions.props.embeddedOrderEdit` exists.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node test/order-edit.test.js`

Expected: FAIL because `embeddedOrderEdit` and `openCart` are missing.

- [ ] **Step 3: Add the embedded menu contract**

Add the prop:

```js
props: {
  embeddedOrderEdit: {
    type: Boolean,
    default: false,
  },
},
```

Add the shared navigation method:

```js
openCart() {
  if (this.embeddedOrderEdit && this.isOrderEditActive) {
    this.$emit('show-cart')
    return
  }
  this.$router.push('/cart')
},
```

Replace both edit-compatible `/cart` pushes in `btnOrder()` with `this.openCart()`. At the start of the active-edit branch in `btnCancel()`, emit `request-close` and return when embedded; otherwise preserve the existing confirmation, store cancellation, and detail navigation.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node test/order-edit.test.js`

Expected: PASS, including existing mounted-cart and route-leave contracts.

- [ ] **Step 5: Commit the embedded menu behavior**

```powershell
git add -- pages/menus.vue test/order-edit.test.js
git commit -m "feat: navigate embedded order menu in modal"
```

---

### Task 3: Embedded cart navigation and completion

**Files:**
- Modify: `pages/cart.vue`
- Modify: `components/orders/OrderEditModal.vue`
- Test: `test/order-edit.test.js`

**Interfaces:**
- Consumes: Boolean prop `embeddedOrderEdit` supplied by `OrderEditModal`.
- Produces: `show-menu`, `request-close`, and `edit-complete(orderId)`.
- Preserves: standalone route navigation to `/menus` and `/orders/detail/:id`.

- [ ] **Step 1: Write failing cart navigation contracts**

After `cartOptions` is loaded in `test/order-edit.test.js`, add:

```js
const embeddedCartEvents = []
const embeddedCartRoutes = []
const embeddedCartVm = {
  embeddedOrderEdit: true,
  $emit: (...args) => embeddedCartEvents.push(args),
  $router: { push: (path) => embeddedCartRoutes.push(path) },
}
cartOptions.methods.showOrderEditMenu.call(embeddedCartVm)
cartOptions.methods.finishOrderEdit.call(embeddedCartVm, 42)
assert.deepStrictEqual(embeddedCartEvents, [
  ['show-menu'],
  ['edit-complete', 42],
])
assert.deepStrictEqual(embeddedCartRoutes, [])

const standaloneCartRoutes = []
const standaloneCartVm = {
  embeddedOrderEdit: false,
  $emit() {},
  $router: { push: (path) => standaloneCartRoutes.push(path) },
}
cartOptions.methods.showOrderEditMenu.call(standaloneCartVm)
cartOptions.methods.finishOrderEdit.call(standaloneCartVm, 42)
assert.deepStrictEqual(standaloneCartRoutes, [
  '/menus',
  '/orders/detail/42',
])
```

Also assert `cartOptions.props.embeddedOrderEdit` exists and the modal source listens for `@edit-complete`, `@show-menu`, and `@request-close`.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node test/order-edit.test.js`

Expected: FAIL because the embedded cart prop and navigation methods are missing.

- [ ] **Step 3: Add cart embedded-mode methods**

Add the same Boolean `embeddedOrderEdit` prop contract used by the menu, then add:

```js
showOrderEditMenu() {
  if (this.embeddedOrderEdit && this.isOrderEditActive) {
    this.$emit('show-menu')
    return
  }
  this.$router.push('/menus')
},
finishOrderEdit(orderId) {
  if (this.embeddedOrderEdit) {
    this.$emit('edit-complete', orderId)
    return
  }
  this.$router.push(`/orders/detail/${orderId}`)
},
```

Replace the cart template's direct « Retourner au menu » route call with `showOrderEditMenu`. Replace every order-edit terminal navigation to `/orders/detail/${orderId}`—successful save, non-editable/conflict cleanup, successful edited Stripe confirmation, and edit cancellation—with `finishOrderEdit(orderId)`. In `btnCancel()`, emit `request-close` immediately for an embedded active edit so `OrderEditModal` owns the single confirmation and cleanup path.

- [ ] **Step 4: Keep payment-refresh behavior inside the modal**

Do not call `finishOrderEdit` when `saveOrderEdit()` returns `payment_refresh === 'succeeded'` or `payment_refresh === 'required'`. Preserve the current mounted Stripe payment element, retry, reprice, and error flows so the dialog stays open until the edit actually completes or is cancelled.

- [ ] **Step 5: Run the targeted test and verify GREEN**

Run: `node test/order-edit.test.js`

Expected: PASS, including the existing save, retry-payment, reprice, and route-leave contracts.

- [ ] **Step 6: Commit the embedded cart behavior**

```powershell
git add -- pages/cart.vue components/orders/OrderEditModal.vue test/order-edit.test.js
git commit -m "feat: complete order edits inside modal"
```

---

### Task 4: Regression and quality verification

**Files:**
- Verify: `components/orders/OrderEditModal.vue`
- Verify: `pages/orders/detail/_id.vue`
- Verify: `pages/menus.vue`
- Verify: `pages/cart.vue`
- Verify: `helpers/orderEdit.js`
- Verify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: all contracts from Tasks 1–3.
- Produces: a lint-clean, regression-tested feature with no new dependency.

- [ ] **Step 1: Run the complete frontend test suite**

Run: `npm test`

Expected: every Node contract-test file exits successfully.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors in the changed Vue/JS files.

- [ ] **Step 3: Run the local production build**

Run: `npm run build-local`

Expected: Nuxt build completes successfully with the existing OpenSSL legacy-provider setting.

- [ ] **Step 4: Inspect the final diff**

Run:

```powershell
git diff --check
git status --short
git diff HEAD~3 -- helpers/orderEdit.js components/orders/OrderEditModal.vue pages/orders/detail/_id.vue pages/menus.vue pages/cart.vue test/order-edit.test.js
```

Expected: no whitespace errors; only the scoped modal, embedded navigation, access helper, and tests are present.

- [ ] **Step 5: Commit any verification-only correction**

If lint or build required a source correction, stage only the corrected scoped files and commit:

```powershell
git add -- helpers/orderEdit.js components/orders/OrderEditModal.vue pages/orders/detail/_id.vue pages/menus.vue pages/cart.vue test/order-edit.test.js
git commit -m "fix: finalize order edit modal integration"
```

If no correction was needed, do not create an empty commit.
