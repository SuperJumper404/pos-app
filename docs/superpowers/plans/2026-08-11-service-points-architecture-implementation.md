# Service Points Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate staff accounts from shared order destinations so every shop has a shared default Comptoir, a shared Click & Collect point, and real tables.

**Architecture:** Add a backend `service_points` domain owned by a shop. Orders and archives reference a service point and an immutable origin (`pos`, `web`, or `table_qr`), while the existing staff attribution fields retain who took and prepared the order. Replace every use of table-as-user with service-point APIs and signed service-point sessions for QR and web checkout.

**Tech Stack:** Node.js, Express, MySQL SQL migrations, JWT, Nuxt 2, Vue 2, Vuex, Vuetify, Axios, Node assertion tests.

## Global Constraints

- Work in the existing `codex/quick-counter-pay-before` branch; the user explicitly chose this branch instead of a worktree.
- Do not add dependencies.
- `users` represents people only: primary admin and staff roles 0, 1, 4, and 5.
- `service_points` represents destinations only: `counter`, `click_collect`, and `table`.
- Seed each shop with immutable system points `counter` (Comptoir) and `click_collect` (Click & Collect).
- Internal POS checkout defaults to Comptoir and may select any active point in the current shop.
- Web checkout always resolves to the current shop's Click & Collect point; QR checkout always resolves to the signed table point. These public flows never accept a client-selected point.
- Keep `taken_by_*` and `prepared_by_*` independent of `service_point_id`.
- Migrate legacy records when deterministically possible; reset the local database only if migration execution cannot complete.
- Use `npm.cmd` for npm commands on Windows.

---

## File Structure

### Backend: `express-pos`

- Create: `db/migrations/20260812100000_service_points_foundation.sql` - service-points table, seed data, legacy conversion, and order/archive backfill.
- Create: `db/migrations/20260812110000_remove_legacy_table_users.sql` - remove legacy `customerID` after application code uses service points, then remove virtual table and Click & Collect users.
- Create: `src/helpers/servicePointAccessToken.js` - sign and verify scoped public access tokens for table QR sessions.
- Create: `src/modules/m_servicePoints.js` - isolated data access for points, system-point lookup, and migration-safe list queries.
- Create: `src/controllers/c_servicePoints.js` - CRUD for real tables, staff list endpoint, and public Click & Collect session endpoint.
- Create: `src/routers/r_servicePoints.js` - routes for service points.
- Modify: `src/modules/m_shop.js` - initialize one real admin and two system service points transactionally.
- Modify: `src/controllers/c_shop.js` - expose Click & Collect public session data from the system point, not users.
- Modify: `src/helpers/middleware/auth.js` - attach a service-point session separately from a staff session.
- Modify: `src/controllers/c_users.js` and `src/modules/m_users.js` - remove table-account creation and table-account session lookup while retaining staff login.
- Modify: `src/modules/m_checkout.js` - validate and persist service point and source during checkout.
- Modify: `src/controllers/c_orders.js`, `src/modules/m_orders.js`, `src/modules/m_orderTransitions.js`, `src/modules/m_payments.js` - return, archive, and display service-point fields without using `customerID`.
- Modify: `src/routers/r_users.js`, `src/routers/r_orders.js`, `src/routers/r_shop.js` - replace legacy table endpoints with service-point endpoints and public source-specific checkout paths.
- Create/Modify tests: `test/service-points-migration.test.js`, `test/service-points-controller.test.js`, `test/service-point-access-token.test.js`, `test/checkout-contract.test.js`, `test/table-access-controller.test.js`, `test/order-attribution.test.js`.

### Frontend: `pos-app`

- Modify: `store/tables.js` - consume service-point APIs and expose real tables separately from the shared destination list.
- Create: `store/servicePoints.js` - load active selectable points and default Comptoir for POS screens.
- Modify: `store/users.js` - persist `service_point_id` and `session_subject` only for public QR/web sessions; never represent a point as a user.
- Modify: `helpers/tableIdentity.js` - build URLs from service-point signed tokens, with no generated table email or password.
- Modify: `pages/tables/index.vue`, `pages/tables/newtable.vue`, `pages/tables/delete/_id.vue` - manage only real table points and QR URLs.
- Modify: `pages/table-access/_token.vue`, `pages/click-and-collect/_shopId/_shopName.vue` - establish source-specific public sessions.
- Modify: `pages/menus.vue`, `pages/cart.vue`, `store/cart.js`, `helpers/customizations.js` - use `service_point_id`; default POS to Comptoir and keep web/QR points immutable.
- Modify: `pages/cashregister/index.vue`, `pages/orders/index.vue`, `pages/orders/detail/_id.vue`, `pages/history/index.vue`, `pages/history/ticket/_id.vue`, `helpers/cashierReceipt.js` - render service-point name instead of joining the old user/table identity.
- Create/Modify tests: `test/service-points-store.test.js`, `test/service-point-selection.test.js`, `test/table-identity.test.js`, `test/table-access-auth.test.js`, `test/counter-checkout.test.js`, `test/order-attribution-ui.test.js`.

## Interfaces

```js
// src/modules/m_servicePoints.js
const SERVICE_POINT_TYPES = Object.freeze({
  COUNTER: 'counter',
  CLICK_COLLECT: 'click_collect',
  TABLE: 'table',
})

// Staff-facing result
// { id, shopid, name, type, system_key, is_active, sort_order, public_access_version }
listServicePoints({ shopId, activeOnly })
findServicePoint({ servicePointId, shopId })
findSystemPoint({ shopId, systemKey })
createTablePoint({ shopId, name })
updateTablePoint({ servicePointId, shopId, name, isActive })
deleteTablePoint({ servicePointId, shopId })
```

```js
// src/helpers/servicePointAccessToken.js
signServicePointAccessToken({ servicePointId, shopId, source, version })
verifyServicePointAccessToken(token)

// Valid source claims
// table QR: { source: 'table_qr', servicePointId: <table point> }
// web:      { source: 'web', servicePointId: <Click & Collect point> }
```

```js
// Checkout payload accepted from an authenticated staff session
{
  service_point_id: number | undefined,
  customer: string,
  phone: string,
  payment: string,
  remark: string,
  is_takeaway: boolean,
  items: Array,
  client_order_token: string,
}

// Persisted fields
// orders.service_point_id, orders.order_source
// archives.service_point_id, archives.order_source
```

## Tasks

### Task 1: Add the service-points schema and migrate legacy data

**Files:**
- Create: `express-pos/db/migrations/20260812100000_service_points_foundation.sql`
- Create: `express-pos/test/service-points-migration.test.js`
- Modify: `express-pos/package.json`

**Consumes:** Existing `shop`, `users`, `orders`, and `archives` rows where `customerID` refers to a virtual user.

**Produces:** `service_points`, populated `service_point_id` and `order_source` on orders and archives, and a deterministic mapping for all legacy destination users.

- [ ] **Step 1: Write failing migration contract tests**

```js
assert.match(sql, /CREATE TABLE `service_points`/)
assert.match(sql, /UNIQUE KEY `uq_service_points_shop_system` \(`shopid`, `system_key`\)/)
assert.match(sql, /ADD COLUMN `service_point_id` INT\(11\) NULL/)
assert.match(sql, /ADD COLUMN `order_source` VARCHAR\(32\) NOT NULL DEFAULT 'pos'/)
assert.match(sql, /INSERT INTO service_points[\s\S]*'counter'/)
assert.match(sql, /INSERT INTO service_points[\s\S]*'click_collect'/)
assert.match(sql, /UPDATE orders[\s\S]*service_point_id/)
assert.match(sql, /UPDATE archives[\s\S]*service_point_id/)
```

- [ ] **Step 2: Run the migration contract test to verify it fails**

Run: `node test/service-points-migration.test.js`

Expected: FAIL because the migration and contract are absent.

- [ ] **Step 3: Implement the additive migration**

Create `service_points` with `shopid`, `name`, `type`, nullable `system_key`, `is_system`, `is_active`, `sort_order`, `public_access_version`, `created`, and `updated`. Add unique `(shopid, system_key)`, index `(shopid, type, is_active, sort_order)`, plus nullable `service_point_id` and non-null `order_source` to both orders tables.

Use SQL inserts and updates in this exact order:

```sql
-- System points first, exactly one per shop.
INSERT IGNORE INTO service_points (shopid, name, type, system_key, is_system, is_active, sort_order, public_access_version, created)
SELECT id, 'Comptoir', 'counter', 'counter', 1, 1, 0, 1, NOW() FROM shop;

-- Convert access 3 before backfilling Click & Collect orders.
INSERT IGNORE INTO service_points (shopid, name, type, system_key, is_system, is_active, sort_order, public_access_version, created)
SELECT shopid, 'Click & Collect', 'click_collect', 'click_collect', 1, 1, 1, 1, NOW()
FROM users WHERE access = 3;

-- Convert every access 2 legacy table to a real table point and retain the old id temporarily.
INSERT INTO service_points (shopid, name, type, is_system, is_active, sort_order, legacy_user_id, public_access_version, created)
SELECT shopid, username, 'table', 0, status = 1, id, id, 1, created
FROM users WHERE access = 2;
```

Add a temporary nullable `legacy_user_id` column and unique index to perform deterministic joins. Backfill each `orders` and `archives` row by joining `customerID` to that legacy id; map legacy access 3 to the Click & Collect point and every remaining destination to Comptoir. Set `order_source` to `table_qr` for legacy table rows, `web` for legacy Click & Collect rows, and `pos` otherwise. Keep `customerID` until Task 5 has migrated all readers and writers.

- [ ] **Step 4: Run the migration contract test to verify it passes**

Run: `node test/service-points-migration.test.js`

Expected: PASS.

- [ ] **Step 5: Apply migration locally and inspect the result without exposing credentials**

Run: `npm.cmd run db:up:local`

Then query only counts and point types per shop. Expected: each shop has one counter, one Click & Collect point, and one table point for every former access-2 user.

- [ ] **Step 6: Commit the additive schema**

```bash
git add db/migrations/20260812100000_service_points_foundation.sql test/service-points-migration.test.js package.json
git commit -m "feat: add service point schema"
```

### Task 2: Implement the service-points backend domain and table management API

**Files:**
- Create: `express-pos/src/modules/m_servicePoints.js`
- Create: `express-pos/src/controllers/c_servicePoints.js`
- Create: `express-pos/src/routers/r_servicePoints.js`
- Modify: `express-pos/src/index.js` or the central router registration file that mounts `r_users.js`
- Create: `express-pos/test/service-points-controller.test.js`
- Modify: `express-pos/package.json`

**Consumes:** `service_points` from Task 1 and authenticated `req.shopid`.

**Produces:** Staff-facing point list and table-only create/update/delete operations.

- [ ] **Step 1: Write failing controller tests**

```js
await createTable({ shopid: 8, body: { name: 'Table 8' } }, response)
assert.deepStrictEqual(created, {
  shopId: 8,
  name: 'Table 8',
  type: 'table',
})

await deletePoint({ shopid: 8, params: { id: 2 } }, response)
assert.strictEqual(response.statusCode, 422) // system point

await listPoints({ shopid: 8 }, response)
assert.deepStrictEqual(response.payload.data.map((point) => point.name), [
  'Comptoir', 'Click & Collect', 'Table 8',
])
```

- [ ] **Step 2: Run controller test to verify it fails**

Run: `node test/service-points-controller.test.js`

Expected: FAIL because the module, controller, and routes do not exist.

- [ ] **Step 3: Implement repository, controller, and routes**

Use these endpoints:

```text
GET    /service-points                 authenticated -> active points for current shop
GET    /service-points/tables          authenticated -> table points for current shop
POST   /service-points/tables          authenticated + authAdmin -> create { name }
PATCH  /service-points/tables/:id      authenticated + authAdmin -> update name/is_active
DELETE /service-points/tables/:id      authenticated + authAdmin -> delete only type=table
```

The delete and update repository methods must include `shopid` in their `WHERE` clause. Controller validation rejects blank names, a non-table id, and attempts to modify system points with a 422 response.

- [ ] **Step 4: Run controller test to verify it passes**

Run: `node test/service-points-controller.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the service-points API**

```bash
git add src/modules/m_servicePoints.js src/controllers/c_servicePoints.js src/routers/r_servicePoints.js src/index.js test/service-points-controller.test.js package.json
git commit -m "feat: manage service points"
```

### Task 3: Refactor shop initialization and public service-point sessions

**Files:**
- Create: `express-pos/src/helpers/servicePointAccessToken.js`
- Modify: `express-pos/src/modules/m_shop.js`
- Modify: `express-pos/src/controllers/c_shop.js`
- Modify: `express-pos/src/helpers/middleware/auth.js`
- Modify: `express-pos/src/controllers/c_users.js`
- Modify: `express-pos/src/routers/r_shop.js`
- Modify: `express-pos/src/routers/r_users.js`
- Create: `express-pos/test/service-point-access-token.test.js`
- Modify: `express-pos/test/table-access-controller.test.js`

**Consumes:** Service-point lookups from Task 2 and JWT environment configuration.

**Produces:** New shops with a human admin plus two system points, and public sessions that carry a service point rather than a fake user.

- [ ] **Step 1: Write failing token and initialization tests**

```js
const token = signServicePointAccessToken({
  servicePointId: 41,
  shopId: 8,
  source: 'table_qr',
  version: 1,
})
assert.deepStrictEqual(verifyServicePointAccessToken(token), {
  servicePointId: 41,
  shopId: 8,
  source: 'table_qr',
  version: 1,
})

assert.deepStrictEqual(initializationCalls.map((call) => call.kind), [
  'shop', 'admin-user', 'counter-point', 'click-collect-point', 'admin-link',
])
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node test/service-point-access-token.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-access-controller.test.js`

Expected: FAIL because sessions still resolve `users` rows.

- [ ] **Step 3: Implement source-specific sessions**

Replace the `Comptoir` and Click & Collect user inserts in `mCreateAndInitializeShop` with one primary admin user named `Administrateur`, then insert the two system points in the same transaction. Preserve `shop.admin_user` as the inserted admin id.

Make `POST /table-access` verify a signed token for a `table` service point and return a JWT session containing:

```js
{
  subject_type: 'service_point',
  service_point_id: point.id,
  shopid: point.shopid,
  source: 'table_qr',
  access: 2,
}
```

Add `POST /shopInfo/click-and-collect/:shopid/session` as a public endpoint. It resolves the current shop's system Click & Collect point and returns the equivalent source `web` session. The browser never receives an email, password, or user id for this point.

Extend `authentication` so both staff and service-point JWT claims set `req.shopid`; service-point claims additionally set `req.servicePointId`, `req.orderSource`, and `req.userId = null`. Keep `authAdmin` restricted to a true staff admin session.

- [ ] **Step 4: Run token and table-access tests to verify they pass**

Run: `node test/service-point-access-token.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-access-controller.test.js`

Expected: PASS.

- [ ] **Step 5: Commit initialization and public sessions**

```bash
git add src/helpers/servicePointAccessToken.js src/modules/m_shop.js src/controllers/c_shop.js src/helpers/middleware/auth.js src/controllers/c_users.js src/routers/r_shop.js src/routers/r_users.js test/service-point-access-token.test.js test/table-access-controller.test.js
git commit -m "feat: create public service point sessions"
```

### Task 4: Persist service point and order source through checkout and history

**Files:**
- Modify: `express-pos/src/modules/m_checkout.js`
- Modify: `express-pos/src/controllers/c_orders.js`
- Modify: `express-pos/src/modules/m_orders.js`
- Modify: `express-pos/src/modules/m_orderTransitions.js`
- Modify: `express-pos/src/modules/m_payments.js`
- Modify: `express-pos/src/controllers/c_stripe.js`
- Modify: `express-pos/test/checkout-contract.test.js`
- Modify: `express-pos/test/table-access-controller.test.js`
- Modify: `express-pos/test/order-attribution.test.js`

**Consumes:** `req.servicePointId`, `req.orderSource`, and service-point repository functions.

**Produces:** All new orders and archives contain `service_point_id`, `service_point_name`, and `order_source`; staff attribution remains unchanged.

- [ ] **Step 1: Write failing checkout tests**

```js
await checkout.createCheckout(posInputWithoutPoint)
assert.strictEqual(insertedOrder.service_point_id, counterPoint.id)
assert.strictEqual(insertedOrder.order_source, 'pos')

await checkout.createCheckout({ ...webInput, service_point_id: otherTable.id })
assert.strictEqual(insertedOrder.service_point_id, clickCollectPoint.id)
assert.strictEqual(insertedOrder.order_source, 'web')

await checkout.createCheckout({ ...qrInput, service_point_id: counterPoint.id })
assert.strictEqual(insertedOrder.service_point_id, qrTablePoint.id)
assert.strictEqual(insertedOrder.order_source, 'table_qr')
assert.strictEqual(insertedOrder.taken_by_user_id, null)
```

- [ ] **Step 2: Run checkout tests to verify they fail**

Run: `node test/checkout-contract.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/order-attribution.test.js`

Expected: FAIL because checkout persists `customerID` and treats the session identity as the destination.

- [ ] **Step 3: Implement authoritative point resolution**

Add a `resolveCheckoutServicePoint` helper inside `m_checkout.js` with these exact rules:

```js
if (session.subject_type === 'service_point' && session.source === 'table_qr') {
  return { id: session.servicePointId, source: 'table_qr' }
}
if (session.subject_type === 'service_point' && session.source === 'web') {
  return findSystemPoint({ shopId: session.shopid, systemKey: 'click_collect' })
}
return requestedServicePointId
  ? findActiveServicePoint({ shopId: session.shopid, servicePointId: requestedServicePointId })
  : findSystemPoint({ shopId: session.shopid, systemKey: 'counter' })
```

Reject a missing, inactive, or cross-shop requested point with a 422 `SERVICE_POINT_INVALID` error. Replace order writes and archive copies to use `service_point_id` and `order_source`. Update list/detail queries with an inner or left join to `service_points` and expose `service_point_name`; do not join `users` for table names. Keep the existing `operator` only as legacy staff context and preserve `taken_by_*`/`prepared_by_*` behavior.

- [ ] **Step 4: Run checkout and attribution tests to verify they pass**

Run: `node test/checkout-contract.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-access-controller.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/order-attribution.test.js`

Expected: PASS.

- [ ] **Step 5: Commit checkout persistence**

```bash
git add src/modules/m_checkout.js src/controllers/c_orders.js src/modules/m_orders.js src/modules/m_orderTransitions.js src/modules/m_payments.js src/controllers/c_stripe.js test/checkout-contract.test.js test/table-access-controller.test.js test/order-attribution.test.js
git commit -m "feat: attach orders to service points"
```

### Task 5: Remove virtual table users and retire `customerID`

**Files:**
- Create: `express-pos/db/migrations/20260812110000_remove_legacy_table_users.sql`
- Modify: `express-pos/src/modules/m_users.js`
- Modify: `express-pos/src/controllers/c_users.js`
- Modify: `express-pos/test/service-points-migration.test.js`

**Consumes:** Service point reads and writes from Tasks 1-4.

**Produces:** A `users` table that contains only real people and no remaining application reads or writes of `customerID`.

- [ ] **Step 1: Extend the failing migration test**

```js
assert.match(cleanupSql, /DELETE FROM users WHERE access IN \(2, 3\)/)
assert.match(cleanupSql, /ALTER TABLE orders[\s\S]*DROP COLUMN customerID/)
assert.match(cleanupSql, /ALTER TABLE archives[\s\S]*DROP COLUMN customerID/)
assert.doesNotMatch(usersModuleSource, /access === 2|access === 3/)
```

- [ ] **Step 2: Run migration test to verify it fails**

Run: `node test/service-points-migration.test.js`

Expected: FAIL because legacy user code and columns remain.

- [ ] **Step 3: Implement cleanup migration and remove legacy user branches**

The migration must assert that no `orders.service_point_id` or `archives.service_point_id` is null before deleting legacy `users.access IN (2, 3)`. Rename an existing primary-admin username of exactly `Comptoir` to `Administrateur`, delete the virtual users, remove temporary `legacy_user_id`, then drop both `customerID` columns. Remove `tableAccess` and virtual-table projections from user controllers/modules; staff list queries must return only roles 0, 1, 4, and 5.

- [ ] **Step 4: Run migration test and full backend suite**

Run: `node test/service-points-migration.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd test`

Expected: PASS.

- [ ] **Step 5: Commit legacy cleanup**

```bash
git add db/migrations/20260812110000_remove_legacy_table_users.sql src/modules/m_users.js src/controllers/c_users.js test/service-points-migration.test.js
git commit -m "refactor: remove virtual table users"
```

### Task 6: Replace frontend table-user workflows with service points

**Files:**
- Create: `pos-app/store/servicePoints.js`
- Modify: `pos-app/store/tables.js`
- Modify: `pos-app/store/users.js`
- Modify: `pos-app/helpers/tableIdentity.js`
- Modify: `pos-app/pages/tables/index.vue`
- Modify: `pos-app/pages/tables/newtable.vue`
- Modify: `pos-app/pages/tables/delete/_id.vue`
- Modify: `pos-app/pages/table-access/_token.vue`
- Modify: `pos-app/pages/click-and-collect/_shopId/_shopName.vue`
- Modify: `pos-app/store/shop.js`
- Create: `pos-app/test/service-points-store.test.js`
- Modify: `pos-app/test/table-identity.test.js`
- Modify: `pos-app/test/table-access-auth.test.js`

**Consumes:** `/service-points`, `/service-points/tables`, table QR sessions, and the public Click & Collect session endpoint.

**Produces:** A table screen with real tables only, plus a shared destination list containing Comptoir, Click & Collect, and tables.

- [ ] **Step 1: Write failing frontend store and identity tests**

```js
assert.match(servicePointsStore, /GET.*service-points/)
assert.match(tableStore, /GET.*service-points\/tables/)
assert.doesNotMatch(newTablePage, /password|clearpass|buildStableTableEmail/)
assert.match(tableAccessPage, /service_point_id/)
assert.match(clickCollectPage, /click-and-collect.*session/)
```

- [ ] **Step 2: Run frontend tests to verify they fail**

Run: `node test/service-points-store.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-identity.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-access-auth.test.js`

Expected: FAIL because the client still creates and authenticates table users.

- [ ] **Step 3: Implement point stores and public session persistence**

`store/servicePoints.js` exposes `getActive`, `getTables`, `createTable`, `updateTable`, and `removeTable`. Its `defaultPoint` getter returns the `system_key === 'counter'` item. `store/tables.js` becomes a thin compatibility facade over `servicePoints/getTables` until every caller is moved.

Remove table email and password fields from `pages/tables/newtable.vue`; submit only `{ name }`. In the tables list, render QR controls only for type `table` and use the server-provided signed token. In `store/users.js`, public sessions persist `session_subject: 'service_point'`, `service_point_id`, and `order_source`; they do not set a staff `idUser`.

Make the Click & Collect page request its public session endpoint after loading shop information. Remove `shop.clickAndCollectTable`, its old email, and every search for an access-3 user.

- [ ] **Step 4: Run frontend tests to verify they pass**

Run: `node test/service-points-store.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-identity.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/table-access-auth.test.js`

Expected: PASS.

- [ ] **Step 5: Commit frontend service-point infrastructure**

```bash
git add store/servicePoints.js store/tables.js store/users.js helpers/tableIdentity.js pages/tables pages/table-access pages/click-and-collect store/shop.js test/service-points-store.test.js test/table-identity.test.js test/table-access-auth.test.js
git commit -m "refactor: manage tables as service points"
```

### Task 7: Update checkout selection and all destination displays

**Files:**
- Modify: `pos-app/pages/menus.vue`
- Modify: `pos-app/pages/cart.vue`
- Modify: `pos-app/store/cart.js`
- Modify: `pos-app/helpers/customizations.js`
- Modify: `pos-app/pages/cashregister/index.vue`
- Modify: `pos-app/pages/orders/index.vue`
- Modify: `pos-app/pages/orders/detail/_id.vue`
- Modify: `pos-app/pages/history/index.vue`
- Modify: `pos-app/pages/history/ticket/_id.vue`
- Modify: `pos-app/helpers/cashierReceipt.js`
- Create: `pos-app/test/service-point-selection.test.js`
- Modify: `pos-app/test/counter-checkout.test.js`
- Modify: `pos-app/test/order-attribution-ui.test.js`
- Modify: `pos-app/package.json`

**Consumes:** `servicePoints/defaultPoint`, checkout service-point contract, and `service_point_name` returned on orders and archives.

**Produces:** POS orders default to Comptoir, staff can select every active point, and every order display identifies the point separately from staff attribution.

- [ ] **Step 1: Write failing selection and display tests**

```js
assert.match(menusPage, /expressSelectedServicePoint.*defaultPoint/)
assert.doesNotMatch(menusPage, /localStorage\.getItem\('idUser'\)/)
assert.match(cartStore, /service_point_id/)
assert.doesNotMatch(cartStore, /customerID/)
assert.match(cashRegisterPage, /service_point_id === point\.id/)
assert.match(historyPage, /service_point_name/)
assert.match(receiptHelper, /service_point_name/)
```

- [ ] **Step 2: Run frontend tests to verify they fail**

Run: `node test/service-point-selection.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/counter-checkout.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/order-attribution-ui.test.js`

Expected: FAIL because current flows use `customerID` and default to `idUser`.

- [ ] **Step 3: Implement source-aware selection and display**

Replace `selectedTable`, `expressSelectedTable`, and all `customerID` payload fields with `selectedServicePointId` / `service_point_id`. For a staff session, initialize the selection from `servicePoints/defaultPoint`; render all active points using their name and type. For a public web or QR session, render the resolved point as read-only and omit the point chooser.

Update checkout signatures and cart recovery payloads to include `service_point_id`. Group cash-register cards by `service_point_id`, render `service_point_name` in orders/history/detail/receipt, and keep `taken_by_name` and `prepared_by_name` in their existing dedicated columns.

- [ ] **Step 4: Run selection tests and complete frontend validation**

Run: `node test/service-point-selection.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run build-local`

Expected: all tests pass, lint has no errors, and the Nuxt build completes.

- [ ] **Step 5: Run complete backend validation**

Run: `npm.cmd test`

Working directory: `C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos`

Expected: PASS.

- [ ] **Step 6: Commit UI and checkout refactor**

```bash
git add pages/menus.vue pages/cart.vue store/cart.js helpers/customizations.js pages/cashregister/index.vue pages/orders pages/history helpers/cashierReceipt.js test/service-point-selection.test.js test/counter-checkout.test.js test/order-attribution-ui.test.js package.json
git commit -m "feat: select shared service points at checkout"
```

## Self-Review

### Spec coverage

- Users are separated from destinations in Tasks 1, 3, and 5.
- Comptoir and Click & Collect system points are seeded in Tasks 1 and 3.
- Real tables are created as points in Tasks 1, 2, and 6.
- POS default selection, website immutability, and QR immutability are covered in Tasks 3, 4, and 7.
- Existing data migration and the reset fallback are covered in Tasks 1 and 5.
- Orders, archives, staff attribution, cash register, history, and receipts are covered in Tasks 4 and 7.

### Placeholder scan

The plan contains no unfinished markers or deferred implementation steps.

### Type consistency

The plan consistently uses `service_point_id` in request payloads and storage, `service_point_id` / `order_source` in persistence, and `service_point_name` in read models. Public sessions use `service_point_id`, `source`, and `subject_type: 'service_point'` throughout.
