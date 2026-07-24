# Product Customization Steps and Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build shared, image-backed product customization steps with simple and linked-product choices, a guided ordering wizard, server-authoritative pricing, transactional stock handling, and lossless migration of the customization data that still exists.

**Architecture:** Add an additive normalized MySQL model and a shop-scoped customization API in `express-pos`. Route all new order creation through one transactional checkout service that snapshots selections and reserves parent/linked stock; expose resolved configurations to a focused Nuxt/Vuetify administration UI and a reusable wizard. Keep legacy product customization reads/writes behind a temporary adapter until the V2 frontend is deployed.

**Tech Stack:** MySQL/dbmate, Node.js/CommonJS, Express 4, mysql2, multer, Nuxt 2, Vue 2, Vuetify, Vuex Easy Access, Axios, Node `assert` tests.

## Global Constraints

- Preserve Nuxt 2, Vue 2, Vuetify, Vuex and the existing CommonJS backend style.
- Do not add runtime dependencies; `mysql2`, `multer`, `uuid`, Vuetify and the existing cropper are sufficient.
- Store money as `DECIMAL(10,2)` and normalize values through the existing money/price helpers.
- Accept choice images only as JPEG, PNG or WebP, with a maximum size of 5 Mo.
- A simple choice has no independent stock; a stock-managed option must be a linked product.
- A linked product contributes one stock unit per selected parent unit and never launches its own customization wizard recursively.
- Decrement/reserve both the parent product stock and linked-product stock.
- The assistant is used on all ordering paths: cashier, QR/table, click-and-collect and kiosk; confirm each path reaches the shared `menus.vue`/`cart.vue` integration before removing the old dialog.
- Enforce authentication, admin authorization for writes, and same-shop ownership on every reference.
- Keep the first migration additive; do not drop legacy customization or historical order tables.
- Keep legacy compatibility temporary and isolated; the V2 schema is the only canonical write model.
- Implement behavior test-first, run the smallest relevant tests after every change, and commit each task separately.

---

## File and Responsibility Map

### Backend files to create

- `../express-pos/src/config/databaseOptions.js` — one shared database option object.
- `../express-pos/src/config/dbPool.js` — promise-based pool used by new transactional modules.
- `../express-pos/src/helpers/withTransaction.js` — acquire, commit, rollback and release one pool connection.
- `../express-pos/src/helpers/domainError.js` — structured HTTP/domain errors.
- `../express-pos/src/helpers/customizationRules.js` — pure selection, pricing and availability rules.
- `../express-pos/src/helpers/stockRequirements.js` — aggregate parent and linked stock quantities.
- `../express-pos/src/helpers/middleware/customizationChoiceImages.js` — 5 Mo JPEG/PNG/WebP upload.
- `../express-pos/src/modules/m_customizations.js` — V2 catalog queries, product configuration replacement and legacy projection.
- `../express-pos/src/controllers/c_customizations.js` — customization request validation and responses.
- `../express-pos/src/routers/r_customizations.js` — customization routes.
- `../express-pos/src/modules/m_checkout.js` — quote, idempotent order creation, snapshots and reservations.
- `../express-pos/src/helpers/reservationLifecycle.js` — pure reservation transition rules.
- `../express-pos/scripts/verify-customization-v2.js` — read-only migration checks.
- `../express-pos/docs/customization-v2-rollout.md` — environment, migration and rollback runbook.
- `../express-pos/test/transaction-helper.test.js`
- `../express-pos/test/customization-rules.test.js`
- `../express-pos/test/stock-requirements.test.js`
- `../express-pos/test/reservation-lifecycle.test.js`
- `../express-pos/test/customization-migration.test.js`
- `../express-pos/test/checkout-contract.test.js`
- `../express-pos/db/migrations/20260724120000_customization_steps_v2.sql`

### Backend files to modify

- `../express-pos/src/config/db.js` — consume shared database options without changing the legacy query interface.
- `../express-pos/index.js` — mount routes and serve the choice-image directory.
- `../express-pos/src/routers/r_products.js`
- `../express-pos/src/controllers/c_products.js`
- `../express-pos/src/modules/m_products.js` — batch V2 projection and legacy adapter.
- `../express-pos/src/routers/r_orders.js`
- `../express-pos/src/controllers/c_orders.js`
- `../express-pos/src/modules/m_orders.js` — snapshot reads and archive copy.
- `../express-pos/src/controllers/c_stripe.js`
- `../express-pos/src/modules/m_payments.js` — delegate stock transitions to reservation lifecycle.
- `../express-pos/src/helpers/env.js` — `STRIPE_STOCK_RESERVATION_MINUTES`, default 15.
- `../express-pos/package.json` — include new test files in `npm test`.

### Frontend files to create

- `helpers/customizations.js` — wizard validation, price preview, signatures and payload mapping.
- `test/customizations.test.js`
- `store/customizations.js` — library CRUD and product configuration calls.
- `pages/customizations/index.vue` — admin library page.
- `components/customizations/StepEditor.vue`
- `components/customizations/ChoiceEditor.vue`
- `components/customizations/ProductStepConfigurator.vue`
- `components/products/CustomizationChoiceCard.vue`
- `components/products/ProductCustomizationWizard.vue`
- `components/products/CartCustomizationSummary.vue`

### Frontend files to modify

- `package.json` — add a dependency-free `npm test` command covering all Node tests.
- `components/ImageCropper.vue` — unique input id and square-choice support.
- `helpers/listdashboard.js` — admin navigation entry.
- `store/products.js` — V2 product payloads/configuration.
- `store/cart.js` — transactional checkout action and structured error return.
- `pages/products/newproduct.vue`
- `pages/products/edit/_id/index.vue`
- `pages/menus.vue` — reusable wizard and configuration-aware cart lines.
- `pages/cart.vue` — edit configuration, V2 checkout payload and targeted recovery.
- `pages/orders/detail/_id.vue`
- `pages/history/index.vue`
- `pages/cashregister/details/_id.vue` — group snapshot choices by step.

---

### Task 1: Add a Safe Transaction Foundation

**Files:**
- Create: `../express-pos/src/config/databaseOptions.js`
- Create: `../express-pos/src/config/dbPool.js`
- Create: `../express-pos/src/helpers/withTransaction.js`
- Create: `../express-pos/test/transaction-helper.test.js`
- Modify: `../express-pos/src/config/db.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `withTransaction(work)` where `work(connection)` receives one mysql2 promise connection.
- Produces: `databaseOptions`, consumed by both legacy `db.js` and `dbPool.js`.

- [ ] **Step 1: Write the failing transaction-helper test**

```js
const assert = require("assert");
const { createTransactionRunner } = require("../src/helpers/withTransaction");

const calls = [];
const connection = {
  beginTransaction: async () => calls.push("begin"),
  commit: async () => calls.push("commit"),
  rollback: async () => calls.push("rollback"),
  release: () => calls.push("release"),
};
const pool = { getConnection: async () => connection };

(async () => {
  const run = createTransactionRunner(pool);
  const value = await run(async (conn) => {
    assert.strictEqual(conn, connection);
    return 42;
  });
  assert.strictEqual(value, 42);
  assert.deepStrictEqual(calls, ["begin", "commit", "release"]);

  calls.length = 0;
  await assert.rejects(() => run(async () => { throw new Error("boom"); }), /boom/);
  assert.deepStrictEqual(calls, ["begin", "rollback", "release"]);
  console.log("transaction helper tests passed");
})();
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `node test/transaction-helper.test.js` from `../express-pos`
Expected: FAIL with `Cannot find module '../src/helpers/withTransaction'`.

- [ ] **Step 3: Implement shared options, pool and transaction runner**

```js
// src/helpers/withTransaction.js
const pool = require("../config/dbPool");

const createTransactionRunner = (sourcePool) => async (work) => {
  const connection = await sourcePool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createTransactionRunner,
  withTransaction: createTransactionRunner(pool),
};
```

`databaseOptions.js` must export the existing host, port, user, password and database values. `db.js` must continue exporting a callback-compatible `mysql2.createConnection(databaseOptions)`. `dbPool.js` must export `mysql2/promise.createPool({ ...databaseOptions, connectionLimit: 10 })`.

- [ ] **Step 4: Run focused and existing backend tests**

Run: `node test/transaction-helper.test.js && npm test`
Expected: `transaction helper tests passed` and the existing three suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/config/databaseOptions.js src/config/dbPool.js src/config/db.js src/helpers/withTransaction.js test/transaction-helper.test.js package.json
git commit -m "refactor: add transactional database pool"
```

### Task 2: Define Pure Customization and Stock Rules

**Files:**
- Create: `../express-pos/src/helpers/domainError.js`
- Create: `../express-pos/src/helpers/customizationRules.js`
- Create: `../express-pos/src/helpers/stockRequirements.js`
- Create: `../express-pos/test/customization-rules.test.js`
- Create: `../express-pos/test/stock-requirements.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `validateConfiguredItem({ product, steps, selectedChoiceIds })` returning `{ selectedChoices, unitPrice }` or throwing `DomainError`.
- Produces: `buildStockRequirements(items)` returning `Map<number, number>`.
- `selectedChoices` use `product_step_choice_id`, `step_id`, `step_name`, `choice_type`, `choice_name`, `extra_price`, `linked_product_id`.

- [ ] **Step 1: Write failing rule tests**

```js
const assert = require("assert");
const { validateConfiguredItem } = require("../src/helpers/customizationRules");

const product = { id: 10, price: 8 };
const steps = [{
  product_step_id: 20,
  name: "Boisson",
  minimum_choices: 1,
  maximum_choices: 1,
  available: true,
  choices: [
    { product_step_choice_id: 30, available: true, extra_price: 0.5, choice_type: "linked_product", choice_name: "Cola", linked_product_id: 2 },
    { product_step_choice_id: 31, available: false, extra_price: 0, choice_type: "linked_product", choice_name: "Eau", linked_product_id: 3 },
  ],
}];

assert.deepStrictEqual(
  validateConfiguredItem({ product, steps, selectedChoiceIds: [30] }).unitPrice,
  8.5,
);
assert.throws(
  () => validateConfiguredItem({ product, steps, selectedChoiceIds: [] }),
  (error) => error.code === "CUSTOMIZATION_MIN_NOT_MET" && error.product_step_id === 20,
);
assert.throws(
  () => validateConfiguredItem({ product, steps, selectedChoiceIds: [31] }),
  (error) => error.code === "CUSTOMIZATION_STEP_UNAVAILABLE",
);
assert.throws(
  () => validateConfiguredItem({ product, steps, selectedChoiceIds: [30, 30] }),
  (error) => error.code === "CUSTOMIZATION_CHOICE_NOT_ALLOWED",
);
console.log("customization rule tests passed");
```

`stock-requirements.test.js` must assert that two parent units plus a selected linked product produce `{ parentId: 2, linkedId: 2 }`, and that the same linked product selected in two contextual choices aggregates to four units.

- [ ] **Step 2: Run both tests and confirm they fail because the helpers do not exist**

Run: `node test/customization-rules.test.js && node test/stock-requirements.test.js`
Expected: FAIL on the first missing module.

- [ ] **Step 3: Implement structured errors and pure rules**

```js
class DomainError extends Error {
  constructor(status, code, message, context = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, context);
  }
}

const buildStockRequirements = (items) => {
  const requirements = new Map();
  const add = (productId, quantity) =>
    requirements.set(productId, (requirements.get(productId) || 0) + quantity);
  for (const item of items) {
    add(item.product.id, item.quantity);
    for (const choice of item.selectedChoices) {
      if (choice.choice_type === "linked_product") {
        add(choice.linked_product_id, item.quantity);
      }
    }
  }
  return requirements;
};
```

`validateConfiguredItem` must reject foreign ids, duplicates, inactive/unavailable steps, unavailable choices, and min/max violations before summing `product.price + selected extra_price` with `parseMoney` and two-decimal rounding.

- [ ] **Step 4: Run focused tests and the backend suite**

Run: `node test/customization-rules.test.js && node test/stock-requirements.test.js && npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/domainError.js src/helpers/customizationRules.js src/helpers/stockRequirements.js test/customization-rules.test.js test/stock-requirements.test.js package.json
git commit -m "feat: define customization business rules"
```

### Task 3: Add and Verify the Additive V2 Migration

**Files:**
- Create: `../express-pos/db/migrations/20260724120000_customization_steps_v2.sql`
- Create: `../express-pos/scripts/verify-customization-v2.js`
- Create: `../express-pos/test/customization-migration.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces the seven V2 tables plus nullable `orders.client_order_token` and `orders.client_order_payload_hash`.
- Preserves explicit old ids when mapping old groups/choices so migration joins are deterministic.

- [ ] **Step 1: Write the failing migration contract test**

The test reads the SQL file and asserts that it contains every required table, unique key and migration source table:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const sql = fs.readFileSync(
  path.join(__dirname, "../db/migrations/20260724120000_customization_steps_v2.sql"),
  "utf8",
);
for (const token of [
  "CREATE TABLE `customization_steps`",
  "CREATE TABLE `customization_step_choices`",
  "CREATE TABLE `product_customization_steps`",
  "CREATE TABLE `product_customization_step_choices`",
  "CREATE TABLE `orderdetail_customization_snapshots`",
  "CREATE TABLE `archivesdetail_customization_snapshots`",
  "CREATE TABLE `order_stock_reservations`",
  "client_order_token",
  "client_order_payload_hash",
  "FROM product_customization",
  "FROM product_choice",
]) assert.ok(sql.includes(token), token);
console.log("customization migration contract passed");
```

- [ ] **Step 2: Run the contract and confirm the missing-file failure**

Run: `node test/customization-migration.test.js`
Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Write the full migration**

The `migrate:up` section must create exactly these columns:

```sql
CREATE TABLE `customization_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL,
  `updated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`), KEY `idx_customization_steps_shop_active` (`shop_id`,`active`)
);
```

Create the other six tables with these exact columns and indexes:

```sql
CREATE TABLE `customization_step_choices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `step_id` int NOT NULL,
  `choice_type` enum('simple','linked_product') NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `linked_product_id` int DEFAULT NULL,
  `default_position` int NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL,
  `updated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customization_choices_step_active` (`step_id`,`active`),
  KEY `idx_customization_choices_linked_product` (`linked_product_id`)
);

CREATE TABLE `product_customization_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `step_id` int NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `minimum_choices` int NOT NULL DEFAULT 0,
  `maximum_choices` int NOT NULL DEFAULT 1,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created` datetime NOT NULL,
  `updated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_customization_step` (`product_id`,`step_id`),
  KEY `idx_product_customization_steps_order` (`product_id`,`active`,`position`)
);

CREATE TABLE `product_customization_step_choices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_customization_step_id` int NOT NULL,
  `step_choice_id` int NOT NULL,
  `extra_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `position` int NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_step_choice` (`product_customization_step_id`,`step_choice_id`),
  KEY `idx_product_step_choices_order` (`product_customization_step_id`,`active`,`position`)
);

CREATE TABLE `orderdetail_customization_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderdetail_id` int NOT NULL,
  `product_customization_step_id` int DEFAULT NULL,
  `product_customization_step_choice_id` int DEFAULT NULL,
  `step_name` varchar(255) NOT NULL,
  `step_position` int NOT NULL,
  `choice_type` enum('simple','linked_product') NOT NULL,
  `choice_name` varchar(255) NOT NULL,
  `choice_position` int NOT NULL,
  `unit_extra_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `linked_product_id` int DEFAULT NULL,
  `created` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_orderdetail_customization_snapshots` (`orderdetail_id`,`step_position`,`choice_position`)
);

CREATE TABLE `archivesdetail_customization_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `archivesdetail_id` int NOT NULL,
  `product_customization_step_id` int DEFAULT NULL,
  `product_customization_step_choice_id` int DEFAULT NULL,
  `step_name` varchar(255) NOT NULL,
  `step_position` int NOT NULL,
  `choice_type` enum('simple','linked_product') NOT NULL,
  `choice_name` varchar(255) NOT NULL,
  `choice_position` int NOT NULL,
  `unit_extra_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `linked_product_id` int DEFAULT NULL,
  `created` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_archivesdetail_customization_snapshots` (`archivesdetail_id`,`step_position`,`choice_position`)
);

CREATE TABLE `order_stock_reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `status` enum('reserved','committed','released') NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created` datetime NOT NULL,
  `updated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_stock_reservation` (`order_id`,`product_id`),
  KEY `idx_order_stock_reservations_expiry` (`status`,`expires_at`)
);

ALTER TABLE `orders`
  ADD COLUMN `client_order_token` varchar(64) DEFAULT NULL,
  ADD COLUMN `client_order_payload_hash` varchar(64) DEFAULT NULL,
  ADD UNIQUE KEY `uq_orders_shop_client_token` (`shopid`,`client_order_token`);
```

The database migration deliberately leaves cross-table validation to the transactional service so it remains compatible with the project’s existing non-FK schema and migration engine.

Migration inserts must:

- copy `product_customization.id` to both the new step id and product-step id;
- derive `shop_id` by joining `products`;
- map `mandatory` to minimum 0/1;
- map a valid `limit_choice`, otherwise `GREATEST(choice_count, 1)`;
- copy `product_choice.id` to both shared and contextual choice ids;
- copy old choice price to contextual `extra_price`;
- backfill active order snapshots where the old choice still resolves;
- never synthesize missing archive selections.

The `migrate:down` section drops only the unique order index, the two new order columns and the seven V2 tables, in reverse dependency order.

- [ ] **Step 4: Add the read-only verification script**

`scripts/verify-customization-v2.js` must query and print old/new group counts, old/new choice counts, invalid min/max rows, missing product associations and unresolved active-order selections. It exits non-zero when counts differ or invalid associations exist.

Run locally after migration:

```powershell
npm run db:up:local
node scripts/verify-customization-v2.js
```

Expected: all count deltas are zero; unresolved archive selections are reported as informational only.

- [ ] **Step 5: Run migration contract and backend tests**

Run: `node test/customization-migration.test.js && npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add db/migrations/20260724120000_customization_steps_v2.sql scripts/verify-customization-v2.js test/customization-migration.test.js package.json
git commit -m "feat: add customization v2 schema migration"
```

### Task 4: Implement the Shop-Scoped Customization Catalog Module

**Files:**
- Create: `../express-pos/src/modules/m_customizations.js`
- Create: `../express-pos/test/checkout-contract.test.js` (catalog portion first)
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `listCustomizationSteps(shopId, connection?)`.
- Produces: `getResolvedProductConfigurations({ shopId, productIds, connection? })` returning a `Map` keyed by product id.
- Produces: CRUD methods and `replaceProductConfiguration({ shopId, productId, steps, connection? })`.

- [ ] **Step 1: Write a failing repository contract test with an injected fake query function**

```js
const assert = require("assert");
const { groupResolvedConfigurationRows } = require("../src/modules/m_customizations");

const grouped = groupResolvedConfigurationRows([{
  product_id: 1, product_step_id: 10, step_id: 20, step_name: "Boissons",
  minimum_choices: 1, maximum_choices: 1, step_position: 2,
  product_step_choice_id: 30, step_choice_id: 40, choice_type: "simple",
  simple_name: "Eau", simple_image: "eau.webp", linked_name: null,
  linked_image: null, linked_stock: null, linked_archived: null,
  extra_price: "0.50", choice_position: 1, choice_active: 1,
}]);
assert.strictEqual(grouped.get(1)[0].choices[0].name, "Eau");
assert.strictEqual(grouped.get(1)[0].choices[0].available, true);
console.log("customization catalog grouping passed");
```

- [ ] **Step 2: Run the test and confirm the missing export failure**

Run: `node test/checkout-contract.test.js`
Expected: FAIL because `groupResolvedConfigurationRows` does not exist.

- [ ] **Step 3: Implement catalog grouping and persistence**

Use parameterized SQL only. The resolved batch query must select all product ids in one `IN (?)` query and join shared steps, contextual choices, simple images and linked products. Availability rules must match the spec: linked `is_hidden` does not disable component use; archived or stock zero does.

`replaceProductConfiguration` must validate same-shop step/choice ownership and replace associations inside the caller transaction. It must reject duplicate steps, duplicate choices, min/max errors and self-linked products with `DomainError`.

`groupResolvedConfigurationRows` must compute `available_choice_count` after all active/stock rules. A step is unavailable when that count is below `minimum_choices`; the resolved product exposes `customization_available: false` plus the blocking `product_step_id` and reason whenever any required step cannot be completed.

- [ ] **Step 4: Run focused and full backend tests**

Run: `node test/checkout-contract.test.js && npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/m_customizations.js test/checkout-contract.test.js package.json
git commit -m "feat: add customization catalog persistence"
```

### Task 5: Expose Customization CRUD and Image Upload APIs

**Files:**
- Create: `../express-pos/src/helpers/middleware/customizationChoiceImages.js`
- Create: `../express-pos/src/controllers/c_customizations.js`
- Create: `../express-pos/src/routers/r_customizations.js`
- Modify: `../express-pos/index.js`

**Interfaces:**
- Consumes all catalog methods from Task 4.
- Produces the exact `/api/v1/customization-steps` and `/api/v1/customization-choices/:id` routes from the spec.
- Serves `/api/v1/imgcustomizations/:filename` from `<PUBLICIMAGEPATH>/customization-choices`.

- [ ] **Step 1: Extend the contract test with route and upload-policy assertions**

Read the router and middleware source with `fs.readFileSync`, then assert these exact tokens:

```js
const routerSource = fs.readFileSync(require.resolve("../src/routers/r_customizations"), "utf8");
const uploadSource = fs.readFileSync(
  require.resolve("../src/helpers/middleware/customizationChoiceImages"),
  "utf8",
);
for (const route of [
  '"/customization-steps"',
  '"/customization-steps/:id"',
  '"/customization-steps/:id/choices"',
  '"/customization-choices/:id"',
]) assert.ok(routerSource.includes(route), route);
for (const policy of [
  "5 * 1024 * 1024",
  '"image/jpeg"',
  '"image/png"',
  '"image/webp"',
]) assert.ok(uploadSource.includes(policy), policy);
```

- [ ] **Step 2: Run the contract test and verify it fails on missing files**

Run: `node test/checkout-contract.test.js`
Expected: FAIL with the first missing route/middleware assertion.

- [ ] **Step 3: Implement middleware, controller and router**

The image middleware must use a generated filename independent of the original name and cleanly return French 400 messages for size/type errors. Controller errors must serialize:

```js
return custom(res, error.status || 500, error.message, null, {
  code: error.code || "INTERNAL_ERROR",
  product_id: error.product_id || null,
  product_step_id: error.product_step_id || null,
  choice_id: error.choice_id || null,
});
```

Delete actions set `active = 0`. On replacement failure remove the new file; after successful commit remove the old file best-effort.

- [ ] **Step 4: Mount and verify**

Modify `index.js` to create the image directory, mount `r_customizations`, and serve it statically. Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/middleware/customizationChoiceImages.js src/controllers/c_customizations.js src/routers/r_customizations.js index.js test/checkout-contract.test.js
git commit -m "feat: expose customization catalog api"
```

### Task 6: Integrate V2 Configuration into Product APIs and Legacy Projection

**Files:**
- Modify: `../express-pos/src/routers/r_products.js`
- Modify: `../express-pos/src/controllers/c_products.js`
- Modify: `../express-pos/src/modules/m_products.js`
- Modify: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Product responses expose both canonical `customization_steps` and temporary `product_customization` projection.
- Product create accepts serialized `customization_config`; product update uses `PUT /products/:id/customization-config`.

- [ ] **Step 1: Add failing projection tests**

Assert that converting one resolved V2 step to legacy returns:

```js
{
  name: "Boissons",
  description: "Choisissez",
  limit_choice: 1,
  mandatory: true,
  items: [{ id: 30, name: "Cola", price: 0.5 }],
}
```

- [ ] **Step 2: Run and confirm the missing legacy projection export**

Run: `node test/checkout-contract.test.js`
Expected: FAIL on `projectLegacyCustomizations`.

- [ ] **Step 3: Replace per-product detail queries with batch aggregation**

`mAllProduct(shopId)` must fetch products once, call `getResolvedProductConfigurations` once, and attach arrays from the returned map. `mDetailProduct` uses the same formatter for one id. Do not retain the current `Promise.all(products.map(mDetailProduct))` N+1 pattern.

Legacy writes received as `product_customization` must be translated into dedicated V2 steps for that product, not written back into old tables. V2 creation/configuration must run inside one transaction.

- [ ] **Step 4: Run tests and manually inspect response shape**

Run: `npm test`
Then call authenticated local `GET /api/v1/products` and confirm every product has `customization_steps` and `product_customization` arrays.

- [ ] **Step 5: Commit**

```bash
git add src/routers/r_products.js src/controllers/c_products.js src/modules/m_products.js test/checkout-contract.test.js
git commit -m "feat: expose customization v2 on products"
```

### Task 7: Build Idempotent Transactional Checkout and Reservations

**Files:**
- Create: `../express-pos/src/helpers/reservationLifecycle.js`
- Create: `../express-pos/src/modules/m_checkout.js`
- Create: `../express-pos/test/reservation-lifecycle.test.js`
- Modify: `../express-pos/test/checkout-contract.test.js`
- Modify: `../express-pos/src/routers/r_orders.js`
- Modify: `../express-pos/src/controllers/c_orders.js`
- Modify: `../express-pos/index.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `createCheckout({ shopId, actorId, customer, items, expectedTotal, clientOrderToken, paymentMode })`.
- Produces: `finalizeReservations({ orderId, status, operator, connection? })` and `releaseExpiredReservations()`.
- New route: `POST /api/v1/orders/checkout`.

- [ ] **Step 1: Write failing reservation-state tests**

```js
const assert = require("assert");
const { nextReservationStatus } = require("../src/helpers/reservationLifecycle");
assert.strictEqual(nextReservationStatus("reserved", "commit"), "committed");
assert.strictEqual(nextReservationStatus("reserved", "release"), "released");
assert.throws(() => nextReservationStatus("committed", "release"), /transition/i);
assert.strictEqual(nextReservationStatus("committed", "commit"), "committed");
console.log("reservation lifecycle tests passed");
```

Extend checkout contract tests with idempotent replay, same-token/different-payload rejection, repricing rejection before writes, and a fake transaction that rolls back after an injected snapshot error.

- [ ] **Step 2: Run tests and confirm missing checkout/lifecycle modules**

Run: `node test/reservation-lifecycle.test.js && node test/checkout-contract.test.js`
Expected: FAIL on missing modules.

- [ ] **Step 3: Implement quote and checkout transaction**

Within `withTransaction`:

1. hash a canonical payload for idempotency comparison;
2. read the existing `(shopid, client_order_token)` row and replay it when the stored `client_order_payload_hash` matches;
3. resolve product configurations and call Task 2 rules;
4. reject repricing before insert/update;
5. insert the order with token and hash as the idempotency claim;
6. release expired reservations idempotently before creating new reservations;
7. aggregate requirements and `SELECT ... FOR UPDATE` products ordered by id;
8. reject insufficient stock with `409` context;
9. decrement available stock;
10. insert details, customization snapshots and reservation rows;
11. immediately commit reservation status/movements for non-Stripe, or leave Stripe as `reserved` with expiration.

Canonicalization must sort object keys and item/choice ids while preserving meaningful quantities, then hash with SHA-256. The claim is the first write and occurs only after the reprice check. Any later stock or snapshot failure rolls it back with the transaction. Catch a unique-key race on `(shopid, client_order_token)` outside the failed transaction, reread the winning order, and return a replay only when its stored hash matches; otherwise throw `409 IDEMPOTENCY_KEY_REUSED`.

Return `{ orderId, total, idempotent_replay, payment_status }`.

- [ ] **Step 4: Add controller and route**

Map frontend snake_case payload fields explicitly. Return structured `DomainError` data without exposing SQL messages. Keep old `/orders` and `/detailorder` routes marked legacy; the new frontend must not call them. In `index.js`, run `releaseExpiredReservations()` every 60 seconds with an `unref()` timer and log failures without stopping the API; the same routine is already called synchronously before each new reservation.

- [ ] **Step 5: Run focused and full tests**

Run: `node test/reservation-lifecycle.test.js && node test/checkout-contract.test.js && npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/reservationLifecycle.js src/modules/m_checkout.js src/routers/r_orders.js src/controllers/c_orders.js index.js test/reservation-lifecycle.test.js test/checkout-contract.test.js package.json
git commit -m "feat: add transactional customization checkout"
```

### Task 8: Unify Stripe Stock Lifecycle and Archive Snapshots

**Files:**
- Modify: `../express-pos/src/helpers/env.js`
- Modify: `../express-pos/src/controllers/c_stripe.js`
- Modify: `../express-pos/src/modules/m_payments.js`
- Modify: `../express-pos/src/modules/m_orders.js`
- Modify: `../express-pos/test/stripe-payment.test.js`
- Modify: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Stripe pending orders call `createCheckout(... paymentMode: "stripe")`.
- Webhook success/counter calls `finalizeReservations(... status: "committed")`.
- Failure/cancel/expiry calls `finalizeReservations(... status: "released")`.
- Archived detail responses expose grouped `customizationList` from snapshots.

- [ ] **Step 1: Add failing Stripe and archive contract tests**

Add assertions that success commits without decrementing `products.stock` a second time, cancellation releases once, repeated webhooks are idempotent, and archive copy preserves `step_name`, `choice_name`, `unit_extra_price`.

- [ ] **Step 2: Run the tests and confirm current double-path behavior fails expectations**

Run: `node test/stripe-payment.test.js && node test/checkout-contract.test.js`
Expected: at least one new lifecycle assertion fails.

- [ ] **Step 3: Delegate Stripe order creation and transitions**

Remove direct product stock decrements from `markPaymentSucceeded` and `markStripeOrderPayAtCounter`. Call the shared reservation service instead. Set `STRIPE_STOCK_RESERVATION_MINUTES` through `env.js` with `15` as default. If PaymentIntent creation fails after the pending order transaction, release reservations and mark the provisional order canceled.

- [ ] **Step 4: Copy/read snapshots during archive**

`mArchiveOrder` must insert archive details, capture each new archive detail id, and copy matching active snapshots before deleting active rows. Detail queries must map snapshot rows to:

```js
customizationList: [{
  step_name: "Boisson",
  name: "Cola",
  price: 0.5,
  product_choice_id: null,
}]
```

Legacy active orders continue using `orders_customization` fallback; already archived legacy rows remain unchanged.

- [ ] **Step 5: Run all backend tests**

Run: `npm test`
Expected: all existing and new tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/env.js src/controllers/c_stripe.js src/modules/m_payments.js src/modules/m_orders.js test/stripe-payment.test.js test/checkout-contract.test.js
git commit -m "feat: unify stripe reservations and snapshots"
```

### Task 9: Add Frontend Pure Helpers and Tests

**Files:**
- Create: `helpers/customizations.js`
- Create: `test/customizations.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateStep(step, selectedIds)`.
- Produces: `calculatePreviewUnitPrice(product, selectedIds)`.
- Produces: `buildConfigurationSignature(productId, selectedIds)`.
- Produces: `mergeConfiguredCartLine(cart, line)`.
- Produces: `buildCheckoutItems(cart)`.

- [ ] **Step 1: Write failing helper tests**

```js
const assert = require('assert')
const {
  validateStep,
  buildConfigurationSignature,
  mergeConfiguredCartLine,
  buildCheckoutItems,
} = require('../helpers/customizations')

const step = { product_step_id: 10, minimum_choices: 1, maximum_choices: 2 }
assert.deepStrictEqual(validateStep(step, [30]), { valid: true, reason: null })
assert.strictEqual(validateStep(step, []).reason, 'minimum')
assert.strictEqual(validateStep(step, [1, 2, 3]).reason, 'maximum')
assert.strictEqual(buildConfigurationSignature(5, [30, 10]), '5:10,30')

const merged = mergeConfiguredCartLine([], {
  id: 5, qty: 1, selectedChoiceIds: [30, 10], price: 9, subtotal: 9,
})
const mergedTwice = mergeConfiguredCartLine(merged, {
  id: 5, qty: 1, selectedChoiceIds: [10, 30], price: 9, subtotal: 9,
})
assert.strictEqual(mergedTwice[0].qty, 2)

assert.deepStrictEqual(buildCheckoutItems(mergedTwice), [{
  product_id: 5,
  quantity: 2,
  selected_product_step_choice_ids: [10, 30],
}])
console.log('customization frontend tests passed')
```

- [ ] **Step 2: Run and confirm missing module**

Run: `node test/customizations.test.js`
Expected: FAIL with missing helper.

- [ ] **Step 3: Implement helpers using existing price functions**

Keep signatures deterministic by numeric sort and deduplication. `mergeConfiguredCartLine` must return a new array, sum quantities/subtotals for equal signatures, and keep different signatures separate. `calculatePreviewUnitPrice` uses resolved contextual choices only.

- [ ] **Step 4: Add and run the dependency-free frontend test script**

Add an `npm test` script that executes every existing `test/*.test.js` file plus `customizations.test.js` in a fixed order.

Run: `npm test && npm run lint`
Expected: all Node tests pass and ESLint reports no errors.

- [ ] **Step 5: Commit**

```bash
git add helpers/customizations.js test/customizations.test.js package.json
git commit -m "feat: add frontend customization helpers"
```

### Task 10: Build the Admin Library Store and UI

**Files:**
- Create: `store/customizations.js`
- Create: `pages/customizations/index.vue`
- Create: `components/customizations/StepEditor.vue`
- Create: `components/customizations/ChoiceEditor.vue`
- Modify: `components/ImageCropper.vue`
- Modify: `helpers/listdashboard.js`

**Interfaces:**
- Store actions: `getSteps`, `createStep`, `updateStep`, `deleteStep`, `createChoice`, `updateChoice`, `deleteChoice`.
- `StepEditor` emits `save` with `{ name, description, active }`.
- `ChoiceEditor` emits `save` as FormData with `choice_type`, `name`/`linked_product_id`, `image`.

- [ ] **Step 1: Add a failing unique-id test for ImageCropper**

Add `createComponentInputId(prefix, vueUid)` to `helpers/customizations.js` and assert deterministic uniqueness:

```js
assert.strictEqual(createComponentInputId('image-cropper', 12), 'image-cropper-12')
assert.notStrictEqual(
  createComponentInputId('image-cropper', 12),
  createComponentInputId('image-cropper', 13),
)
```

Run `node test/customizations.test.js`; expected FAIL before the export exists.

- [ ] **Step 2: Implement unique ImageCropper inputs**

Import `createComponentInputId` and expose `inputId` as a computed value based on `this._uid`. Replace the hard-coded `imageCropperInput` id and inline `onclick` with `:id="inputId"` and `@click="$refs.fileInput.$el.querySelector('input').click()"`. Preserve `ratio` and use `:ratio="1"` in `ChoiceEditor`.

- [ ] **Step 3: Implement Vuex CRUD actions**

Follow `store/products.js`: Bearer header, boolean result, response messages and global notifications. Never mutate a linked product into a simple choice or vice versa in-place; send the selected type explicitly.

- [ ] **Step 4: Implement the admin page/components**

The page must show a left list of steps, selected-step editor, three-column choice cards, linked-product selector, simple image cropper, deactivate confirmation, and up/down order controls. Add navigation:

```js
{
  icon: 'mdi-format-list-numbered',
  title: 'Étapes produits',
  routeName: 'customizations',
  to: '/customizations',
  isAdmin: true,
}
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run lint && npm run build-local`
Expected: tests/lint pass and Nuxt build exits 0.

- [ ] **Step 6: Commit**

```bash
git add store/customizations.js pages/customizations/index.vue components/customizations/StepEditor.vue components/customizations/ChoiceEditor.vue components/ImageCropper.vue helpers/listdashboard.js test/customizations.test.js
git commit -m "feat: add customization library administration"
```

### Task 11: Add Product Step Configuration to Create/Edit Forms

**Files:**
- Create: `components/customizations/ProductStepConfigurator.vue`
- Modify: `pages/products/newproduct.vue`
- Modify: `pages/products/edit/_id/index.vue`
- Modify: `store/products.js`
- Modify: `test/customizations.test.js`

**Interfaces:**
- Vue 2 v-model value: ordered array `{ step_id, position, minimum_choices, maximum_choices, active, choices[] }`.
- Choice item: `{ step_choice_id, position, extra_price, active }`.

- [ ] **Step 1: Add failing serializer tests**

Add `serializeProductCustomizationConfig(config)` tests asserting numeric min/max/position, two-decimal prices, no duplicate steps/choices and stable order. Run `npm test`; expected FAIL before export exists.

- [ ] **Step 2: Implement the configurator**

Use a Vuetify dialog to attach existing steps, up/down buttons for order, integer fields for min/max, switches for choices and price fields for contextual supplements. Emit a cloned array on every change. Show validation text when `minimum > maximum` or active choices are fewer than minimum.

- [ ] **Step 3: Integrate product creation**

Replace the old inline `product_customization` editor. Append `customization_config` JSON to the existing FormData alongside the product image. Disable submit while configurator errors exist.

- [ ] **Step 4: Integrate product editing**

Hydrate from `detailProduct[0].customization_steps`, save through `PUT /products/:id/customization-config`, and keep product/image updates from navigating away before configuration save completes.

- [ ] **Step 5: Verify**

Run: `npm test && npm run lint && npm run build-local`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add components/customizations/ProductStepConfigurator.vue pages/products/newproduct.vue pages/products/edit/_id/index.vue store/products.js helpers/customizations.js test/customizations.test.js
git commit -m "feat: configure shared steps on products"
```

### Task 12: Build the Guided Product Customization Wizard

**Files:**
- Create: `components/products/CustomizationChoiceCard.vue`
- Create: `components/products/ProductCustomizationWizard.vue`
- Create: `components/products/CartCustomizationSummary.vue`
- Modify: `test/customizations.test.js`

**Interfaces:**
- `ProductCustomizationWizard` props: `product`, `value` (selected contextual ids), `initialStepId`.
- Emits: `input`, `confirm({ selectedChoiceIds, unitPrice, selections })`, `cancel`.
- `CustomizationChoiceCard` emits `toggle(choiceId)` and never mutates props.

- [ ] **Step 1: Add failing wizard-state helper tests**

Add pure functions `nextVisibleStepIndex(steps, currentIndex)` and `findStepIndexById(steps, productStepId)`. Assert optional empty steps are skipped and required unavailable steps are returned as blocking.

- [ ] **Step 2: Implement choice and summary components**

Choice cards show resolved image, name, `Inclus` or formatted supplement, selected border and visible `Indisponible`. Summary groups selections by `step_name` and displays total preview.

- [ ] **Step 3: Implement wizard state machine**

The template must include progress, current/total step, running price, card grid, Back/Continue, and final summary. For max 1, toggling replaces the step selection. For max >1, toggling adds/removes until max. Continue remains disabled below minimum. `initialStepId` opens the requested error/edit step.

- [ ] **Step 4: Verify helpers and build**

Run: `npm test && npm run lint && npm run build-local`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add components/products/CustomizationChoiceCard.vue components/products/ProductCustomizationWizard.vue components/products/CartCustomizationSummary.vue helpers/customizations.js test/customizations.test.js
git commit -m "feat: add guided product customization wizard"
```

### Task 13: Integrate Wizard, Configuration-Aware Cart and Editing

**Files:**
- Modify: `pages/menus.vue`
- Modify: `pages/cart.vue`
- Modify: `store/cart.js`
- Modify: `test/customizations.test.js`

**Interfaces:**
- Cart line keeps `configurationSignature`, `selectedChoiceIds`, `selections`, preview `price`, `qty`, `subtotal`.
- `store/cart.checkoutOrder` returns `{ ok, data, error }`, never only a boolean.

- [ ] **Step 1: Add failing cart edit/merge tests**

Test that editing a two-quantity line into the same signature as another line adds quantities and removes the edited line; editing to a different signature preserves two lines.

- [ ] **Step 2: Replace the inline customization dialog in `menus.vue`**

Open `ProductCustomizationWizard` whenever `customization_steps.length > 0`. Products without steps retain direct add. Disable products with `customization_available === false`; display backend reason. Use `mergeConfiguredCartLine` for every add.

- [ ] **Step 3: Add cart editing in `cart.vue`**

Render `CartCustomizationSummary`, add `Modifier`, reopen the wizard with selected ids, and replace/merge the edited line on confirm. Quantity changes recalculate subtotal from preview unit price.

- [ ] **Step 4: Implement V2 checkout payload/action**

Import `v4` from the existing `uuid` dependency (`import { v4 as uuidv4 } from 'uuid'`). Generate one UUID `client_order_token` per checkout attempt and persist it until success/final failure. Send:

```js
{
  client_order_token: token,
  expected_total: roundPrice(total),
  customer,
  customerID: selectedTable,
  payment,
  remark,
  phone,
  items: buildCheckoutItems(dataCart),
}
```

Non-Stripe uses `/api/v1/orders/checkout`. Stripe keeps its endpoint but sends the same item shape and token.

- [ ] **Step 5: Implement targeted error recovery**

On `ORDER_REPRICE_REQUIRED`, update the preview quote and ask for confirmation without creating an order. On step/choice/stock errors, locate the cart line by `product_id`, open its wizard at `product_step_id`, preserve other selections and show the backend message.

- [ ] **Step 6: Verify**

Run: `npm test && npm run lint && npm run build-local`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add pages/menus.vue pages/cart.vue store/cart.js helpers/customizations.js test/customizations.test.js
git commit -m "feat: use customization wizard in ordering"
```

### Task 14: Display Snapshot Groups in Order and History Views

**Files:**
- Modify: `pages/orders/detail/_id.vue`
- Modify: `pages/history/index.vue`
- Modify: `pages/cashregister/details/_id.vue`
- Modify: `test/customizations.test.js`

**Interfaces:**
- Produces: `groupCustomizationSelections(selections)` returning ordered `{ stepName, choices[] }[]`.

- [ ] **Step 1: Add failing grouping tests**

Provide shuffled snapshots from two steps and assert ordering by `step_position`, then `choice_position`, with legacy entries grouped under `Personnalisation`.

- [ ] **Step 2: Implement grouping helper and views**

All three views display the step label once and choice chips underneath, with contextual price when non-zero. Continue accepting legacy `customizationList` entries that only have `name` and `price`.

- [ ] **Step 3: Verify**

Run: `npm test && npm run lint && npm run build-local`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add helpers/customizations.js test/customizations.test.js pages/orders/detail/_id.vue pages/history/index.vue pages/cashregister/details/_id.vue
git commit -m "feat: display customization snapshots by step"
```

### Task 15: Cross-Repository Verification and Staging Readiness

**Files:**
- Create: `../express-pos/docs/customization-v2-rollout.md`
- Create: `docs/superpowers/plans/2026-07-24-product-customization-staging-checklist.md`

**Interfaces:**
- Produces exact environment/migration/rollback instructions and a manual acceptance record.

- [ ] **Step 1: Run the full backend verification**

From `../express-pos`:

```powershell
npm test
npm run db:up:local
node scripts/verify-customization-v2.js
```

Expected: all tests pass, migration succeeds, old/new count deltas are zero, no invalid association is reported.

- [ ] **Step 2: Run the full frontend verification**

From `pos-app`:

```powershell
npm test
npm run lint
npm run build-local
```

Expected: tests pass, ESLint has zero errors, Nuxt build exits 0.

- [ ] **Step 3: Execute the manual matrix on local/staging**

Record pass/fail for: admin library, simple image upload, linked product, product create/edit, min/max, required step in rupture, two different configurations, identical-line merge, edit/merge, counter checkout, Stripe success/cancel/expiry, concurrent last-stock attempt, active detail, archive and ticket, mobile/tablet/desktop.

- [ ] **Step 4: Document deployment order and rollback limits**

The backend rollout document must cover `STRIPE_STOCK_RESERVATION_MINUTES=15`, the image directory, migration command, verifier, rollback boundary and the frontend’s V2 dependency. The staging checklist must require: backup → migration → verifier → backend → legacy smoke → frontend → V2 smoke. It must explicitly state that already-missing legacy archive selections cannot be reconstructed.

- [ ] **Step 5: Commit the documentation after inspecting both diffs**

Run `git status --short` and `git diff --check` in both repositories. Confirm no unrelated user files are staged.

```bash
git add docs/customization-v2-rollout.md
git commit -m "docs: document customization v2 rollout"
```

```bash
git add docs/superpowers/plans/2026-07-24-product-customization-staging-checklist.md
git commit -m "docs: add customization staging checklist"
```

---

## Final Acceptance Gate

Do not remove the legacy adapter or old tables in this implementation plan. After the staging checklist passes and production is observed, create a separate design/plan for removing legacy writes, the `product_customization` projection and old tables.

Before declaring implementation complete, verify every criterion in `docs/superpowers/specs/2026-07-24-product-customization-steps-images-design.md` against a task result and attach fresh command output for backend tests, migration verification, frontend tests, lint and build.
