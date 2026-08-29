# Staff / Equipe Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a shop administrator manage staff roles, show each role its permitted navigation modules, and record who took and prepared every order.

**Architecture:** A shared frontend role helper controls the drawer and staff form while the existing `users` records remain the source of truth. The backend stores immutable order-attribution snapshots on active orders and copies them to archives; authenticated user identity is resolved server-side for checkout and the first preparation transition.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex Easy Access, Node.js, Express, MySQL/dbmate, Node `assert` tests.

## Global Constraints

- Keep `access` values `0` Admin, `1` Caissier, `2` Table QR, and `3` Click-and-Collect unchanged; add `4` Serveur and `5` Cuisine.
- Do not add backend route authorization for roles; only hide unauthorized frontend navigation modules.
- `Staff / Equipe` contains only access values `0`, `1`, `4`, and `5`; `Tables` contains only `2`.
- Record `Prise par` automatically for staff checkout creators and `Preparee par` automatically on the first `En attente` to `En preparation` transition.
- Preserve staff names in order history after an account is deleted by saving name snapshots alongside user ids.
- Do not add dependencies or refactor unrelated user/table flows.

---

### Task 1: Persist order attribution on active and archived orders

**Files:**
- Create: `../express-pos/db/migrations/20260811120000_staff_order_attribution.sql`
- Modify: `../express-pos/src/modules/m_orders.js:154-176,247-266`
- Create: `../express-pos/test/order-attribution.test.js`
- Modify: `../express-pos/package.json:7`

**Interfaces:**
- Consumes: existing `orders` and `archives` records and `ARCHIVE_ORDER_FIELDS`.
- Produces: nullable `taken_by_user_id`, `taken_by_name`, `prepared_by_user_id`, and `prepared_by_name` fields on both record types; `pickArchiveOrderFields(order)` copies all four fields.

- [ ] **Step 1: Write the failing migration and archive-copy contract test**

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { pickArchiveOrderFields } = require('../src/modules/m_orders')

const migration = fs.readFileSync(
  path.join(__dirname, '../db/migrations/20260811120000_staff_order_attribution.sql'),
  'utf8'
)
for (const table of ['orders', 'archives']) {
  assert.match(migration, new RegExp(`ALTER TABLE \\`${table}\\``))
}
for (const field of ['taken_by_user_id', 'taken_by_name', 'prepared_by_user_id', 'prepared_by_name']) {
  assert.ok(migration.includes(field), field)
}
assert.deepStrictEqual(pickArchiveOrderFields({
  shopid: 7,
  taken_by_user_id: 9,
  taken_by_name: 'Amina',
  prepared_by_user_id: 11,
  prepared_by_name: 'Leo',
}), {
  shopid: 7,
  taken_by_user_id: 9,
  taken_by_name: 'Amina',
  prepared_by_user_id: 11,
  prepared_by_name: 'Leo',
})
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `node test/order-attribution.test.js` from `../express-pos`.

Expected: failure because the migration and archive fields do not exist.

- [ ] **Step 3: Add the migration and archive field list**

```sql
-- migrate:up
ALTER TABLE `orders`
  ADD COLUMN `taken_by_user_id` INT(11) NULL AFTER `operator`,
  ADD COLUMN `taken_by_name` VARCHAR(255) NULL AFTER `taken_by_user_id`,
  ADD COLUMN `prepared_by_user_id` INT(11) NULL AFTER `taken_by_name`,
  ADD COLUMN `prepared_by_name` VARCHAR(255) NULL AFTER `prepared_by_user_id`,
  ADD INDEX `idx_orders_taken_by_user_id` (`taken_by_user_id`),
  ADD INDEX `idx_orders_prepared_by_user_id` (`prepared_by_user_id`);

ALTER TABLE `archives`
  ADD COLUMN `taken_by_user_id` INT(11) NULL AFTER `operator`,
  ADD COLUMN `taken_by_name` VARCHAR(255) NULL AFTER `taken_by_user_id`,
  ADD COLUMN `prepared_by_user_id` INT(11) NULL AFTER `taken_by_name`,
  ADD COLUMN `prepared_by_name` VARCHAR(255) NULL AFTER `prepared_by_user_id`;

-- migrate:down
ALTER TABLE `archives`
  DROP COLUMN `prepared_by_name`, DROP COLUMN `prepared_by_user_id`,
  DROP COLUMN `taken_by_name`, DROP COLUMN `taken_by_user_id`;
ALTER TABLE `orders`
  DROP INDEX `idx_orders_prepared_by_user_id`, DROP INDEX `idx_orders_taken_by_user_id`,
  DROP COLUMN `prepared_by_name`, DROP COLUMN `prepared_by_user_id`,
  DROP COLUMN `taken_by_name`, DROP COLUMN `taken_by_user_id`;
```

Extend `ARCHIVE_ORDER_FIELDS` with the four names immediately after `operator`, export `pickArchiveOrderFields` for the contract test, and append `node test/order-attribution.test.js` to the backend `test` script.

- [ ] **Step 4: Run the focused test and backend test suite**

Run: `node test/order-attribution.test.js` and `npm test` from `../express-pos`.

Expected: both commands exit with code `0`.

- [ ] **Step 5: Commit**

```bash
git -C ../express-pos add db/migrations/20260811120000_staff_order_attribution.sql src/modules/m_orders.js test/order-attribution.test.js package.json
git -C ../express-pos commit -m "feat: preserve order staff attribution"
```

### Task 2: Record the authenticated staff member at checkout and preparation

**Files:**
- Create: `../express-pos/src/helpers/staffAccess.js`
- Modify: `../express-pos/src/modules/m_checkout.js:203-275,634-675`
- Modify: `../express-pos/src/modules/m_orderTransitions.js:18-76`
- Modify: `../express-pos/test/order-attribution.test.js`

**Interfaces:**
- Produces `isStaffAccess(access)` and `isOrderTakerAccess(access)`.
- Extends `buildCheckoutModule(...).createCheckout(input)` to resolve the actor in the transaction and insert the four `taken_by_*` values only for access `0`, `1`, or `4`.
- Extends `buildOrderTransitionModule(...).transitionOrderStatus({ orderId, shopId, nextStatus, operator })` to set `prepared_by_*` only on the first `PENDING -> PREPARING` transition.

- [ ] **Step 1: Add failing in-memory repository assertions**

```js
const { isStaffAccess, isOrderTakerAccess } = require('../src/helpers/staffAccess')
assert.strictEqual(isStaffAccess(5), true)
assert.strictEqual(isStaffAccess(2), false)
assert.strictEqual(isOrderTakerAccess(4), true)
assert.strictEqual(isOrderTakerAccess(5), false)

assert.strictEqual(insertedOrder.taken_by_user_id, 9)
assert.strictEqual(insertedOrder.taken_by_name, 'Amina')
assert.strictEqual(updatedStatus.prepared_by_user_id, 11)
assert.strictEqual(updatedStatus.prepared_by_name, 'Leo')
assert.strictEqual(secondPreparationUpdate.prepared_by_name, 'Leo')
```

Build the checkout harness with an actor lookup returning `{ id: 9, shopid: 7, username: 'Amina', access: 1 }`; build the transition harness with `{ id: 11, shopid: 7, username: 'Leo', access: 5 }`. Add a Table QR actor (`access: 2`) case that asserts the inserted `taken_by_*` values are `null`.

- [ ] **Step 2: Run the attribution test to verify it fails**

Run: `node test/order-attribution.test.js` from `../express-pos`.

Expected: imports and saved attribution fields are missing.

- [ ] **Step 3: Implement the focused actor resolution and snapshots**

```js
// src/helpers/staffAccess.js
const STAFF_ACCESS_VALUES = new Set([0, 1, 4, 5])
const ORDER_TAKER_ACCESS_VALUES = new Set([0, 1, 4])
const isStaffAccess = (access) => STAFF_ACCESS_VALUES.has(Number(access))
const isOrderTakerAccess = (access) => ORDER_TAKER_ACCESS_VALUES.has(Number(access))
module.exports = { isStaffAccess, isOrderTakerAccess }
```

In `m_checkout.js`, add a repository method that reads `id`, `shopid`, `username`, and `access` from `users` by authenticated id and shop id inside the checkout transaction. Set `taken_by_user_id` and `taken_by_name` from that record only when `isOrderTakerAccess(actor.access)` is true; otherwise set both to `null`.

In `m_orderTransitions.js`, add the same scoped actor lookup. When the locked order is pending and `nextStatus` is preparing, pass this immutable snapshot to `updateStatus`; its SQL must keep existing values with `COALESCE(prepared_by_user_id, ?)` and `COALESCE(prepared_by_name, ?)`. Other transitions pass `null` so preparation is never overwritten. Leave legacy `operator` behavior unchanged.

- [ ] **Step 4: Run focused and full backend tests**

Run: `node test/order-attribution.test.js` and `npm test` from `../express-pos`.

Expected: the new checkout, Table QR, first-preparation, and non-overwrite cases pass along with existing tests.

- [ ] **Step 5: Commit**

```bash
git -C ../express-pos add src/helpers/staffAccess.js src/modules/m_checkout.js src/modules/m_orderTransitions.js test/order-attribution.test.js
git -C ../express-pos commit -m "feat: attribute checkout and preparation staff"
```

### Task 3: Define frontend roles and render role-specific navigation

**Files:**
- Create: `helpers/staffRoles.js`
- Modify: `helpers/listdashboard.js`
- Modify: `layouts/default.vue`
- Create: `test/staff-roles.test.js`
- Modify: `package.json:7`

**Interfaces:**
- Produces `ROLE_OPTIONS`, `isStaffAccess(access)`, `isTableQrAccess(access)`, `getRoleLabel(access)`, and `canAccessModule(access, moduleKey)` from `helpers/staffRoles.js`.
- Each sidebar entry with a `to` route receives a `moduleKey`; `layouts/default.vue` renders only `canAccessModule(userAccess, item.moduleKey)` entries for staff users.

- [ ] **Step 1: Write the failing role matrix test**

```js
const assert = require('assert')
const {
  ROLE_OPTIONS,
  canAccessModule,
  isStaffAccess,
  isTableQrAccess,
} = require('../helpers/staffRoles')

assert.deepStrictEqual(ROLE_OPTIONS.map((role) => role.value), [0, 1, 4, 5])
assert.strictEqual(isStaffAccess(0), true)
assert.strictEqual(isStaffAccess(3), false)
assert.strictEqual(isTableQrAccess(2), true)
assert.strictEqual(isTableQrAccess(4), false)
assert.strictEqual(canAccessModule(1, 'cashregister'), true)
assert.strictEqual(canAccessModule(1, 'staff'), false)
assert.strictEqual(canAccessModule(4, 'cart'), true)
assert.strictEqual(canAccessModule(5, 'orders'), true)
assert.strictEqual(canAccessModule(5, 'menus'), false)
```

Also assert the layout source calls `isStaffAccess(this.userAccess)` for the drawer and `canAccessModule` for the sidebar and app-bar shortcuts.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test/staff-roles.test.js` from `pos-app`.

Expected: failure because the role helper and role-aware layout do not exist.

- [ ] **Step 3: Implement the helper and navigation matrix**

```js
const MODULES = {
  0: new Set(['home', 'products', 'menus', 'orders', 'cashregister', 'history', 'tables', 'settings', 'website', 'staff']),
  1: new Set(['menus', 'orders', 'cashregister', 'history']),
  2: new Set(['menus', 'cart']),
  3: new Set(['menus', 'cart']),
  4: new Set(['menus', 'orders', 'cart']),
  5: new Set(['orders']),
}
const canAccessModule = (access, moduleKey) => Boolean(MODULES[Number(access)] && MODULES[Number(access)].has(moduleKey))
```

Add the `Staff / Equipe` sidebar item with `moduleKey: 'staff'`. Keep hidden route metadata in `listdashboard.js` for page titles, but filter only navigable `to` items. Replace the `access === 0` drawer and app-bar conditions with the helper so Admin, Caissier, Serveur, and Cuisine receive a drawer, while Table QR and Click-and-Collect retain their client interface. Guard the Orders and Cart app-bar icons with their exact module keys.

- [ ] **Step 4: Run focused frontend tests and lint**

Run: `node test/staff-roles.test.js`, `node test/admin-navigation.test.js`, and `npm run lint` from `pos-app`.

Expected: all commands exit with code `0`.

- [ ] **Step 5: Commit**

```bash
git add helpers/staffRoles.js helpers/listdashboard.js layouts/default.vue test/staff-roles.test.js package.json
git commit -m "feat: show navigation by staff role"
```

### Task 4: Add Staff / Equipe management and keep Tables filtered

**Files:**
- Create: `store/staff.js`
- Create: `pages/staff/index.vue`
- Modify: `pages/tables/index.vue:133-136`
- Create: `test/staff-page.test.js`
- Modify: `package.json:7`

**Interfaces:**
- Produces Vuex actions `staff/getAll`, `staff/create`, `staff/update`, and `staff/remove` using `/users`, `/register`, `/user/:id`, and `/user/:id` respectively.
- `pages/staff/index.vue` consumes `ROLE_OPTIONS` and shows only access values `0`, `1`, `4`, and `5`.
- `pages/tables/index.vue` continues to show only records whose normalized access value is `2`.

- [ ] **Step 1: Write the failing page/store contract test**

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const page = fs.readFileSync(path.join(root, 'pages/staff/index.vue'), 'utf8')
const store = fs.readFileSync(path.join(root, 'store/staff.js'), 'utf8')
const tables = fs.readFileSync(path.join(root, 'pages/tables/index.vue'), 'utf8')

assert.match(page, /Staff\s*\/\s*(?:Equipe|Équipe)/)
assert.match(page, /ROLE_OPTIONS/)
assert.match(page, /v-model="form\.access"/)
assert.match(store, /getAll[\s\S]*?\/users/)
assert.match(store, /create[\s\S]*?\/register/)
assert.match(store, /update[\s\S]*?\/user\/\$\{id\}/)
assert.match(store, /remove[\s\S]*?\/user\/\$\{id\}/)
assert.match(tables, /Number\(x\.access\)\s*===\s*2/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test/staff-page.test.js` from `pos-app`.

Expected: failure because the staff store and page are absent.

- [ ] **Step 3: Implement the store and page**

`store/staff.js` uses the existing bearer token pattern and returns booleans after updating its `data` state. The page uses one dense Vuetify table/list and a dialog form, without nested cards:

```js
const emptyForm = () => ({
  id: null,
  username: '',
  email: '',
  phone: '',
  password: '',
  access: null,
  status: 1,
})

const staffUsers = (users) => users.filter((user) => [0, 1, 4, 5].includes(Number(user.access)))
```

Create requires name, email, password, and access. Editing updates name, phone, access, and active status through the existing patch endpoint; it does not rewrite a password. Provide explicit controls for edit, activate/deactivate, and delete, refresh the list after each successful operation, and use the existing notification store for successes/errors. Replace the Table filter with `Number(x.access) === 2` to avoid string/number mismatches.

- [ ] **Step 4: Run focused frontend tests and lint**

Run: `node test/staff-page.test.js`, `node test/staff-roles.test.js`, and `npm run lint` from `pos-app`.

Expected: all commands exit with code `0`.

- [ ] **Step 5: Commit**

```bash
git add store/staff.js pages/staff/index.vue pages/tables/index.vue test/staff-page.test.js package.json
git commit -m "feat: manage shop staff accounts"
```

### Task 5: Show attributions in active orders, detail, and history

**Files:**
- Modify: `pages/orders/index.vue`
- Modify: `pages/orders/detail/_id.vue`
- Modify: `pages/history/index.vue`
- Create: `test/order-attribution-ui.test.js`
- Modify: `package.json:7`

**Interfaces:**
- Consumes the four persisted attribution fields returned by existing order and archive endpoints.
- Produces `Prise par` and `Preparee par` labels with `Non attribuee` fallbacks in active orders, order detail, and archived history.

- [ ] **Step 1: Write the failing UI contract test**

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
for (const file of ['pages/orders/index.vue', 'pages/orders/detail/_id.vue', 'pages/history/index.vue']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  assert.match(source, /Prise par/)
  assert.match(source, /Preparee par/)
  assert.match(source, /Non attribuee/)
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test/order-attribution-ui.test.js` from `pos-app`.

Expected: failure because none of the three views render attribution labels.

- [ ] **Step 3: Implement readable attribution fields**

Use the existing Vuetify table slots and detail layout. Add two headers and slots to active orders and history:

```vue
<template #[`item.taken_by_name`]="{ item }">
  {{ item.taken_by_name || 'Non attribuee' }}
</template>
<template #[`item.prepared_by_name`]="{ item }">
  {{ item.prepared_by_name || 'Non attribuee' }}
</template>
```

Add the same two label/value pairs to the order detail metadata area. Do not infer names from the current users list; always render the persisted snapshot sent with the order or archive.

- [ ] **Step 4: Run focused frontend tests and full frontend suite**

Run: `node test/order-attribution-ui.test.js` and `npm test` from `pos-app`.

Expected: the new display contract and existing frontend tests exit with code `0`.

- [ ] **Step 5: Commit**

```bash
git add pages/orders/index.vue pages/orders/detail/_id.vue pages/history/index.vue test/order-attribution-ui.test.js package.json
git commit -m "feat: display order staff attribution"
```

### Task 6: Verify the completed feature across both workspaces

**Files:**
- Modify: none.

**Interfaces:**
- Consumes the completed backend migration, role helper, staff page, and order attribution displays.
- Produces evidence that the two applications build and the key user flows work.

- [ ] **Step 1: Run static and automated checks**

Run: `npm test` from `../express-pos`, then `npm test` and `npm run lint` from `pos-app`.

Expected: every command exits with code `0`.

- [ ] **Step 2: Apply the backend migration in the configured local environment**

Run: `npm run db:up:local` from `../express-pos`.

Expected: dbmate applies `20260811120000_staff_order_attribution.sql` without error.

- [ ] **Step 3: Perform the focused browser check**

Start the existing local frontend and verify: an Admin sees `Staff / Equipe`; creation of Caissier, Serveur, Cuisine, and Admin works; Tables excludes staff; a fresh login for each staff role exposes only the documented drawer modules; a counter order shows its taker; and moving it to preparation shows its preparer in active commands and history after archiving.

- [ ] **Step 4: Confirm clean worktrees after verification**

Run: `git status --short` from `pos-app` and `git -C ../express-pos status --short`.

Expected: no uncommitted changes in either repository.
