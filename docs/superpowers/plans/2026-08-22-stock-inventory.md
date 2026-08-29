# Stock Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new Stock module for products and ingredients with manual inventories, replenishments, status colors, generated shopping list, and product stock tracking switches.

**Architecture:** Add a unified backend stock inventory domain around `stock_items`, `stock_movements`, and `shopping_list_items`, while preserving existing POS product flows. Frontend uses one `store/stockInventory.js` module and a tabbed `pages/stocks/index.vue` experience, with product creation/edit forms extended for stock tracking.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex Easy Access, Axios, Express, MySQL/dbmate migrations, Node assert tests.

**Spec:** `docs/superpowers/specs/2026-08-22-stock-inventory-design.md`

## Global Constraints

- Keep changes targeted and consistent with the existing Nuxt 2/Vuetify/Express patterns.
- Do not add dependencies unless a task explicitly says so; PDF should use existing frontend dependencies if needed.
- Quantities are integers only.
- Stock statuses are `red`, `orange`, and `normal`.
- `red`: `current_stock < minimum_stock`.
- `orange`: `minimum_stock <= current_stock < target_stock`.
- `normal`: `current_stock >= target_stock`.
- Shopping list generation is explicit and replaces the current list.
- Shopping list includes every active tracked product and active ingredient with `current_stock < target_stock`.
- Product stock tracking is enabled by default for existing and new products.
- Product stock decrements when a command is validated/sent, not on cart add.
- Cancel/refund does not automatically restock.
- Module remains named `Stock` and is visible in main navigation for admins and staff with `stocks`.

---

## File Structure

Backend:

- Create `../express-pos/src/helpers/stockInventory.js`: pure stock status, integer validation, shopping list row projection, average price helpers.
- Create `../express-pos/test/stock-inventory-domain.test.js`: fast tests for pure stock rules.
- Create `../express-pos/db/migrations/20260822140000_stock_inventory.sql`: stock inventory tables and product fields.
- Create `../express-pos/test/stock-inventory-migration.test.js`: source-level migration guard test.
- Create `../express-pos/src/modules/m_stockInventory.js`: SQL access for stock items, movements, shopping list generation, and product sync.
- Create `../express-pos/src/controllers/c_stockInventory.js`: request validation and response shaping.
- Create `../express-pos/src/routers/r_stockInventory.js`: new `/stock/...` API routes.
- Modify `../express-pos/index.js`: mount the new router.
- Modify `../express-pos/src/modules/m_checkout.js`: honor `track_stock` during checkout stock decrements.
- Modify `../express-pos/src/helpers/stockRequirements.js`: ignore untracked products when product payload includes `track_stock`.
- Modify `../express-pos/src/controllers/c_products.js` and `../express-pos/src/modules/m_products.js`: accept stock tracking fields and preserve existing product behavior.
- Modify `../express-pos/package.json`: include new backend tests in `npm test`.

Frontend:

- Create `helpers/stockInventory.js`: frontend status and shopping-list sorting helpers.
- Create `store/stockInventory.js`: Vuex actions for stock inventory API.
- Replace `pages/stocks/index.vue`: tabbed Stock module.
- Create `pages/stocks/_id.vue`: stock item detail page.
- Modify `pages/products/newproduct.vue`: stock tracking switch and advanced fields.
- Modify `pages/products/edit/_id/index.vue`: same fields for existing products.
- Modify `helpers/listdashboard.js`: show Stock in main navigation.
- Modify tests under `test/`: stock inventory helpers/page/store/product form/navigation tests.
- Modify `package.json`: include new frontend tests in `npm test`.

---

### Task 1: Backend Domain Helpers

**Files:**
- Create: `../express-pos/src/helpers/stockInventory.js`
- Create: `../express-pos/test/stock-inventory-domain.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `toNonNegativeInteger(value, fieldName) -> number`
- Produces: `toPositiveInteger(value, fieldName) -> number`
- Produces: `resolveStockStatus(item) -> "red" | "orange" | "normal"`
- Produces: `buildShoppingListItem(item) -> object | null`
- Produces: `calculateAverageUnitPrice(movements) -> number | null`
- Produces: `isStockTrackedProduct(product) -> boolean`

- [ ] **Step 1: Write the failing backend helper test**

Create `../express-pos/test/stock-inventory-domain.test.js`:

```js
const assert = require("assert");
const {
  toNonNegativeInteger,
  toPositiveInteger,
  resolveStockStatus,
  buildShoppingListItem,
  calculateAverageUnitPrice,
  isStockTrackedProduct,
} = require("../src/helpers/stockInventory");

assert.strictEqual(toNonNegativeInteger("0", "stock"), 0);
assert.strictEqual(toNonNegativeInteger(4, "stock"), 4);
assert.throws(() => toNonNegativeInteger(-1, "stock"), /stock must be a non-negative integer/);
assert.throws(() => toNonNegativeInteger(1.5, "stock"), /stock must be a non-negative integer/);

assert.strictEqual(toPositiveInteger("3", "quantity"), 3);
assert.throws(() => toPositiveInteger(0, "quantity"), /quantity must be a positive integer/);

assert.strictEqual(resolveStockStatus({ current_stock: 2, minimum_stock: 6, target_stock: 20 }), "red");
assert.strictEqual(resolveStockStatus({ current_stock: 12, minimum_stock: 6, target_stock: 20 }), "orange");
assert.strictEqual(resolveStockStatus({ current_stock: 20, minimum_stock: 6, target_stock: 20 }), "normal");

assert.deepStrictEqual(buildShoppingListItem({
  id: 7,
  current_stock: 2,
  minimum_stock: 6,
  target_stock: 20,
  average_unit_price: 7.5,
}), {
  stock_item_id: 7,
  status_at_generation: "red",
  current_stock_at_generation: 2,
  target_stock_at_generation: 20,
  quantity_to_buy: 18,
  estimated_unit_price: 7.5,
  estimated_total_price: 135,
  taken: 0,
});
assert.strictEqual(buildShoppingListItem({
  id: 8,
  current_stock: 20,
  minimum_stock: 6,
  target_stock: 20,
}), null);

assert.strictEqual(calculateAverageUnitPrice([
  { quantity: 20, total_price: 140 },
  { quantity: 10, total_price: 80 },
]), 7.33);
assert.strictEqual(calculateAverageUnitPrice([]), null);

assert.strictEqual(isStockTrackedProduct({ track_stock: 1 }), true);
assert.strictEqual(isStockTrackedProduct({ track_stock: true }), true);
assert.strictEqual(isStockTrackedProduct({ track_stock: 0 }), false);

console.log("stock inventory domain tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd ../express-pos
node test/stock-inventory-domain.test.js
```

Expected: FAIL with `Cannot find module '../src/helpers/stockInventory'`.

- [ ] **Step 3: Implement the helper**

Create `../express-pos/src/helpers/stockInventory.js`:

```js
const toInteger = (value) => {
  if (value === "" || value === null || value === undefined) return NaN;
  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
};

const toNonNegativeInteger = (value, fieldName) => {
  const number = toInteger(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return number;
};

const toPositiveInteger = (value, fieldName) => {
  const number = toInteger(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return number;
};

const resolveStockStatus = (item) => {
  const current = Number(item.current_stock);
  const minimum = Number(item.minimum_stock);
  const target = Number(item.target_stock);
  if (current < minimum) return "red";
  if (current < target) return "orange";
  return "normal";
};

const moneyOrNull = (value) => (
  value === null || value === undefined ? null : Number(Number(value).toFixed(2))
);

const buildShoppingListItem = (item) => {
  const current = Number(item.current_stock);
  const target = Number(item.target_stock);
  if (current >= target) return null;

  const quantity = target - current;
  const unitPrice = moneyOrNull(item.average_unit_price);
  return {
    stock_item_id: item.id,
    status_at_generation: resolveStockStatus(item),
    current_stock_at_generation: current,
    target_stock_at_generation: target,
    quantity_to_buy: quantity,
    estimated_unit_price: unitPrice,
    estimated_total_price: unitPrice === null ? null : moneyOrNull(unitPrice * quantity),
    taken: 0,
  };
};

const calculateAverageUnitPrice = (movements) => {
  const totals = movements.reduce((acc, movement) => {
    const quantity = Number(movement.quantity || 0);
    const totalPrice = Number(movement.total_price || 0);
    if (quantity > 0 && totalPrice > 0) {
      acc.quantity += quantity;
      acc.total += totalPrice;
    }
    return acc;
  }, { quantity: 0, total: 0 });
  if (totals.quantity === 0) return null;
  return Number((totals.total / totals.quantity).toFixed(2));
};

const isStockTrackedProduct = (product) => (
  product.track_stock === undefined ||
  product.track_stock === null ||
  product.track_stock === true ||
  Number(product.track_stock) === 1
);

module.exports = {
  toNonNegativeInteger,
  toPositiveInteger,
  resolveStockStatus,
  buildShoppingListItem,
  calculateAverageUnitPrice,
  isStockTrackedProduct,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd ../express-pos
node test/stock-inventory-domain.test.js
```

Expected: PASS and `stock inventory domain tests passed`.

- [ ] **Step 5: Add the test to backend package script**

Modify `../express-pos/package.json` so `scripts.test` includes:

```text
node test/stock-inventory-domain.test.js
```

Place it after `node test/stock-requirements.test.js`.

- [ ] **Step 6: Run targeted backend tests**

Run:

```bash
cd ../express-pos
node test/stock-requirements.test.js
node test/stock-inventory-domain.test.js
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add ../express-pos/src/helpers/stockInventory.js ../express-pos/test/stock-inventory-domain.test.js ../express-pos/package.json
git commit -m "test: add stock inventory domain helpers"
```

---

### Task 2: Database Migration

**Files:**
- Create: `../express-pos/db/migrations/20260822140000_stock_inventory.sql`
- Create: `../express-pos/test/stock-inventory-migration.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces DB tables: `stock_items`, `stock_movements`, `shopping_list_items`
- Produces product fields: `track_stock`, `stock_zero_behavior`, `stock_item_id`

- [ ] **Step 1: Write the failing migration source test**

Create `../express-pos/test/stock-inventory-migration.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "db", "migrations", "20260822140000_stock_inventory.sql"),
  "utf8",
);

assert.match(migration, /CREATE TABLE `stock_items`/);
assert.match(migration, /CREATE TABLE `stock_movements`/);
assert.match(migration, /CREATE TABLE `shopping_list_items`/);
assert.match(migration, /ALTER TABLE `products`[\s\S]*`track_stock`/);
assert.match(migration, /ALTER TABLE `products`[\s\S]*`stock_zero_behavior`/);
assert.match(migration, /ALTER TABLE `products`[\s\S]*`stock_item_id`/);
assert.match(migration, /INSERT INTO `stock_items`[\s\S]*SELECT[\s\S]*'product'/);
assert.match(migration, /UPDATE `products` p[\s\S]*p\.`track_stock` = 1/);
assert.match(migration, /DROP TABLE IF EXISTS `shopping_list_items`/);
assert.match(migration, /DROP TABLE IF EXISTS `stock_movements`/);
assert.match(migration, /DROP TABLE IF EXISTS `stock_items`/);

console.log("stock inventory migration tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd ../express-pos
node test/stock-inventory-migration.test.js
```

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Create the migration**

Create `../express-pos/db/migrations/20260822140000_stock_inventory.sql`:

```sql
-- migrate:up
CREATE TABLE `stock_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_id` int NOT NULL,
  `item_type` enum('product','ingredient') NOT NULL,
  `product_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `unit` varchar(64) NOT NULL DEFAULT 'piece',
  `current_stock` int NOT NULL DEFAULT 0,
  `minimum_stock` int NOT NULL DEFAULT 0,
  `target_stock` int NOT NULL DEFAULT 0,
  `category_label` varchar(128) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `default_supplier` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `archived` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_items_product` (`product_id`),
  KEY `idx_stock_items_shop_type` (`shop_id`,`item_type`,`archived`),
  KEY `idx_stock_items_status` (`shop_id`,`archived`,`current_stock`,`target_stock`)
);

CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_id` int NOT NULL,
  `stock_item_id` int NOT NULL,
  `movement_type` enum('replenishment','inventory') NOT NULL,
  `quantity` int NOT NULL,
  `previous_stock` int NOT NULL,
  `new_stock` int NOT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_movements_item` (`stock_item_id`,`created_at`),
  KEY `idx_stock_movements_shop` (`shop_id`,`movement_type`,`created_at`)
);

CREATE TABLE `shopping_list_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_id` int NOT NULL,
  `stock_item_id` int NOT NULL,
  `status_at_generation` enum('red','orange') NOT NULL,
  `current_stock_at_generation` int NOT NULL,
  `target_stock_at_generation` int NOT NULL,
  `quantity_to_buy` int NOT NULL,
  `estimated_unit_price` decimal(10,2) DEFAULT NULL,
  `estimated_total_price` decimal(10,2) DEFAULT NULL,
  `taken` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shopping_list_shop` (`shop_id`,`taken`,`status_at_generation`),
  KEY `idx_shopping_list_item` (`stock_item_id`)
);

ALTER TABLE `products`
  ADD COLUMN `track_stock` tinyint(1) NOT NULL DEFAULT 1 AFTER `stock`,
  ADD COLUMN `stock_zero_behavior` enum('block','warn') NOT NULL DEFAULT 'block' AFTER `track_stock`,
  ADD COLUMN `stock_item_id` int DEFAULT NULL AFTER `stock_zero_behavior`;

INSERT INTO `stock_items` (
  `shop_id`, `item_type`, `product_id`, `name`, `unit`,
  `current_stock`, `minimum_stock`, `target_stock`, `created_at`, `updated_at`
)
SELECT
  `shopid`, 'product', `id`, `name`, 'piece',
  `stock`, 1, `stock`, `created`, `updated`
FROM `products`;

UPDATE `products` p
JOIN `stock_items` si ON si.`product_id` = p.`id`
SET p.`track_stock` = 1,
    p.`stock_zero_behavior` = 'block',
    p.`stock_item_id` = si.`id`;

-- migrate:down
ALTER TABLE `products`
  DROP COLUMN `stock_item_id`,
  DROP COLUMN `stock_zero_behavior`,
  DROP COLUMN `track_stock`;

DROP TABLE IF EXISTS `shopping_list_items`;
DROP TABLE IF EXISTS `stock_movements`;
DROP TABLE IF EXISTS `stock_items`;
```

- [ ] **Step 4: Run the migration test**

Run:

```bash
cd ../express-pos
node test/stock-inventory-migration.test.js
```

Expected: PASS.

- [ ] **Step 5: Add the test to backend package script**

Modify `../express-pos/package.json` so `scripts.test` includes:

```text
node test/stock-inventory-migration.test.js
```

Place it after `node test/stock-inventory-domain.test.js`.

- [ ] **Step 6: Optionally run dbmate locally**

Run only if `.env.local` exists and the local DB is available:

```bash
cd ../express-pos
npm run db:up:local
```

Expected: migration succeeds.

- [ ] **Step 7: Commit**

```bash
git add ../express-pos/db/migrations/20260822140000_stock_inventory.sql ../express-pos/test/stock-inventory-migration.test.js ../express-pos/package.json
git commit -m "feat: add stock inventory schema"
```

---

### Task 3: Backend Stock Inventory API

**Files:**
- Create: `../express-pos/src/modules/m_stockInventory.js`
- Create: `../express-pos/src/controllers/c_stockInventory.js`
- Create: `../express-pos/src/routers/r_stockInventory.js`
- Create: `../express-pos/test/stock-inventory-controller.test.js`
- Modify: `../express-pos/index.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Consumes: `buildShoppingListItem`, `calculateAverageUnitPrice`, integer helpers from Task 1
- Produces: endpoints listed in the spec under `/api/v1/stock/...`

- [ ] **Step 1: Write controller contract tests**

Create `../express-pos/test/stock-inventory-controller.test.js`:

```js
const assert = require("assert");
const {
  validateStockItemPayload,
  validateReplenishmentPayload,
  validateInventoryPayload,
  mapStockItemResponse,
} = require("../src/controllers/c_stockInventory");

assert.deepStrictEqual(validateStockItemPayload({
  name: "Fromage",
  unit: "paquet",
  current_stock: 2,
  minimum_stock: 6,
  target_stock: 20,
  category_label: "Frais",
}), {
  name: "Fromage",
  unit: "paquet",
  current_stock: 2,
  minimum_stock: 6,
  target_stock: 20,
  category_label: "Frais",
  reference: null,
  default_supplier: null,
  note: null,
});

assert.throws(() => validateStockItemPayload({
  name: "Fromage",
  unit: "paquet",
  current_stock: 2,
  minimum_stock: 6,
  target_stock: 5,
}), /Le stock cible doit etre superieur ou egal au seuil minimum/);

assert.deepStrictEqual(validateReplenishmentPayload({
  quantity: "4",
  supplier: "Metro",
  unit_price: "8",
}), {
  quantity: 4,
  supplier: "Metro",
  unit_price: 8,
  total_price: 32,
  remark: null,
});

assert.deepStrictEqual(validateInventoryPayload({ quantity: "0" }), {
  quantity: 0,
  remark: null,
});

assert.strictEqual(mapStockItemResponse({
  current_stock: 2,
  minimum_stock: 6,
  target_stock: 20,
}).status, "red");

console.log("stock inventory controller tests passed");
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run:

```bash
cd ../express-pos
node test/stock-inventory-controller.test.js
```

Expected: FAIL because `c_stockInventory.js` does not exist.

- [ ] **Step 3: Implement controller exported validators first**

Create `../express-pos/src/controllers/c_stockInventory.js` with these exported helpers at the bottom:

```js
const { custom, success, failed } = require("../helpers/response");
const stockInventory = require("../modules/m_stockInventory");
const {
  toNonNegativeInteger,
  toPositiveInteger,
  resolveStockStatus,
} = require("../helpers/stockInventory");

const optionalText = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).trim();
};

const validateStockItemPayload = (body) => {
  const name = optionalText(body.name);
  const unit = optionalText(body.unit);
  if (!name) throw new Error("Le nom est requis.");
  if (!unit) throw new Error("L'unite est requise.");
  const currentStock = toNonNegativeInteger(body.current_stock, "stock actuel");
  const minimumStock = toNonNegativeInteger(body.minimum_stock, "seuil minimum");
  const targetStock = toNonNegativeInteger(body.target_stock, "stock cible");
  if (targetStock < minimumStock) {
    throw new Error("Le stock cible doit etre superieur ou egal au seuil minimum.");
  }
  return {
    name,
    unit,
    current_stock: currentStock,
    minimum_stock: minimumStock,
    target_stock: targetStock,
    category_label: optionalText(body.category_label),
    reference: optionalText(body.reference),
    default_supplier: optionalText(body.default_supplier),
    note: optionalText(body.note),
  };
};

const validateReplenishmentPayload = (body) => {
  const quantity = toPositiveInteger(body.quantity, "quantite");
  const unitPrice = body.unit_price === undefined || body.unit_price === null || body.unit_price === ""
    ? null
    : Number(Number(body.unit_price).toFixed(2));
  const totalPrice = body.total_price === undefined || body.total_price === null || body.total_price === ""
    ? (unitPrice === null ? null : Number((unitPrice * quantity).toFixed(2)))
    : Number(Number(body.total_price).toFixed(2));
  return {
    quantity,
    supplier: optionalText(body.supplier),
    unit_price: unitPrice,
    total_price: totalPrice,
    remark: optionalText(body.remark),
  };
};

const validateInventoryPayload = (body) => ({
  quantity: toNonNegativeInteger(body.quantity, "quantite"),
  remark: optionalText(body.remark),
});

const mapStockItemResponse = (item) => ({
  ...item,
  status: resolveStockStatus(item),
});

module.exports = {
  validateStockItemPayload,
  validateReplenishmentPayload,
  validateInventoryPayload,
  mapStockItemResponse,
};
```

- [ ] **Step 4: Run controller tests**

Run:

```bash
cd ../express-pos
node test/stock-inventory-controller.test.js
```

Expected: PASS.

- [ ] **Step 5: Implement module SQL functions**

Create `../express-pos/src/modules/m_stockInventory.js` with this interface:

```js
const conn = require("../config/db");
const { buildShoppingListItem, calculateAverageUnitPrice } = require("../helpers/stockInventory");

const query = (sql, params = []) => new Promise((resolve, reject) => {
  conn.query(sql, params, (error, result) => {
    if (error) reject(new Error(error));
    else resolve(result);
  });
});

const rows = (sql, params = []) => query(sql, params);

const listItems = async (shopId) => rows(`
  SELECT si.*,
    (
      SELECT ROUND(SUM(sm.total_price) / SUM(sm.quantity), 2)
      FROM stock_movements sm
      WHERE sm.stock_item_id = si.id
        AND sm.movement_type = 'replenishment'
        AND sm.quantity > 0
        AND sm.total_price IS NOT NULL
        AND sm.total_price > 0
    ) AS average_unit_price
  FROM stock_items si
  WHERE si.shop_id = ?
  ORDER BY si.item_type ASC, si.name ASC
`, [shopId]);

const detailItem = async ({ shopId, id }) => {
  const found = await rows("SELECT * FROM stock_items WHERE shop_id = ? AND id = ?", [shopId, id]);
  return found[0] || null;
};

const listMovements = ({ shopId, stockItemId }) => rows(`
  SELECT sm.*, users.username
  FROM stock_movements sm
  LEFT JOIN users ON users.id = sm.operator_id
  WHERE sm.shop_id = ? AND sm.stock_item_id = ?
  ORDER BY sm.created_at DESC, sm.id DESC
`, [shopId, stockItemId]);

const createIngredient = async ({ shopId, data }) => query("INSERT INTO stock_items SET ?", {
  shop_id: shopId,
  item_type: "ingredient",
  ...data,
});

const updateItem = async ({ shopId, id, data }) => query(
  "UPDATE stock_items SET ? WHERE shop_id = ? AND id = ?",
  [data, shopId, id],
);

const insertMovement = async ({ shopId, stockItemId, movement }) => query("INSERT INTO stock_movements SET ?", {
  shop_id: shopId,
  stock_item_id: stockItemId,
  ...movement,
});

const updateStock = async ({ shopId, id, newStock }) => query(
  "UPDATE stock_items SET current_stock = ? WHERE shop_id = ? AND id = ?",
  [newStock, shopId, id],
);

const syncProductStock = async ({ stockItemId, newStock }) => query(
  "UPDATE products SET stock = ? WHERE stock_item_id = ?",
  [newStock, stockItemId],
);

const clearShoppingList = async (shopId) => query(
  "DELETE FROM shopping_list_items WHERE shop_id = ?",
  [shopId],
);

const insertShoppingListItem = async ({ shopId, item }) => query("INSERT INTO shopping_list_items SET ?", {
  shop_id: shopId,
  ...item,
});

const listShoppingList = async (shopId) => rows(`
  SELECT sli.*, si.name, si.unit, si.item_type, si.default_supplier
  FROM shopping_list_items sli
  JOIN stock_items si ON si.id = sli.stock_item_id
  WHERE sli.shop_id = ?
  ORDER BY sli.taken ASC,
    FIELD(sli.status_at_generation, 'red', 'orange'),
    si.name ASC
`, [shopId]);

const setShoppingListTaken = async ({ shopId, id, taken }) => query(
  "UPDATE shopping_list_items SET taken = ? WHERE shop_id = ? AND id = ?",
  [taken ? 1 : 0, shopId, id],
);

const generateShoppingList = async (shopId) => {
  const items = await listItems(shopId);
  await clearShoppingList(shopId);
  const projected = items.map(buildShoppingListItem).filter(Boolean);
  for (const item of projected) {
    await insertShoppingListItem({ shopId, item });
  }
  return listShoppingList(shopId);
};

module.exports = {
  listItems,
  detailItem,
  listMovements,
  createIngredient,
  updateItem,
  insertMovement,
  updateStock,
  syncProductStock,
  generateShoppingList,
  listShoppingList,
  setShoppingListTaken,
  calculateAverageUnitPrice,
};
```

- [ ] **Step 6: Add route handlers to the controller**

Extend `c_stockInventory.js` above `module.exports` with:

```js
const shopIdFromReq = (req) => req.shopid || req.body.shop_id || req.query.shop_id;
const operatorIdFromReq = (req) => req.userId || req.body.operator_id || null;

const listItems = async (req, res) => {
  try {
    const items = await stockInventory.listItems(shopIdFromReq(req));
    success(res, "Articles de stock recuperes.", null, items.map(mapStockItemResponse));
  } catch (error) {
    failed(res, "Erreur serveur.", error.message);
  }
};

const createIngredient = async (req, res) => {
  try {
    const data = validateStockItemPayload(req.body);
    await stockInventory.createIngredient({ shopId: shopIdFromReq(req), data });
    success(res, "Ingredient cree avec succes.", null, null);
  } catch (error) {
    custom(res, 400, error.message, {}, null);
  }
};

const updateItem = async (req, res) => {
  try {
    const data = validateStockItemPayload(req.body);
    await stockInventory.updateItem({ shopId: shopIdFromReq(req), id: req.params.id, data });
    success(res, "Article de stock mis a jour.", null, null);
  } catch (error) {
    custom(res, 400, error.message, {}, null);
  }
};

const detailItem = async (req, res) => {
  try {
    const item = await stockInventory.detailItem({ shopId: shopIdFromReq(req), id: req.params.id });
    if (!item) return custom(res, 404, "Article introuvable.", null, []);
    const movements = await stockInventory.listMovements({ shopId: shopIdFromReq(req), stockItemId: req.params.id });
    return success(res, "Article de stock recupere.", null, {
      item: mapStockItemResponse(item),
      movements,
    });
  } catch (error) {
    return failed(res, "Erreur serveur.", error.message);
  }
};

const replenishItem = async (req, res) => {
  try {
    const shopId = shopIdFromReq(req);
    const item = await stockInventory.detailItem({ shopId, id: req.params.id });
    if (!item) return custom(res, 404, "Article introuvable.", null, []);
    const payload = validateReplenishmentPayload(req.body);
    const previousStock = Number(item.current_stock);
    const newStock = previousStock + payload.quantity;
    await stockInventory.insertMovement({
      shopId,
      stockItemId: req.params.id,
      movement: {
        movement_type: "replenishment",
        quantity: payload.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        supplier: payload.supplier,
        unit_price: payload.unit_price,
        total_price: payload.total_price,
        remark: payload.remark,
        operator_id: operatorIdFromReq(req),
      },
    });
    await stockInventory.updateStock({ shopId, id: req.params.id, newStock });
    if (item.item_type === "product") {
      await stockInventory.syncProductStock({ stockItemId: req.params.id, newStock });
    }
    return success(res, "Stock reapprovisionne avec succes.", null, null);
  } catch (error) {
    return custom(res, 400, error.message, {}, null);
  }
};

const inventoryItem = async (req, res) => {
  try {
    const shopId = shopIdFromReq(req);
    const item = await stockInventory.detailItem({ shopId, id: req.params.id });
    if (!item) return custom(res, 404, "Article introuvable.", null, []);
    const payload = validateInventoryPayload(req.body);
    const previousStock = Number(item.current_stock);
    await stockInventory.insertMovement({
      shopId,
      stockItemId: req.params.id,
      movement: {
        movement_type: "inventory",
        quantity: payload.quantity,
        previous_stock: previousStock,
        new_stock: payload.quantity,
        remark: payload.remark,
        operator_id: operatorIdFromReq(req),
      },
    });
    await stockInventory.updateStock({ shopId, id: req.params.id, newStock: payload.quantity });
    if (item.item_type === "product") {
      await stockInventory.syncProductStock({ stockItemId: req.params.id, newStock: payload.quantity });
    }
    return success(res, "Inventaire enregistre.", null, null);
  } catch (error) {
    return custom(res, 400, error.message, {}, null);
  }
};

const generateShoppingList = async (req, res) => {
  try {
    const list = await stockInventory.generateShoppingList(shopIdFromReq(req));
    success(res, "Liste de courses generee.", null, list);
  } catch (error) {
    failed(res, "Erreur serveur.", error.message);
  }
};

const listShoppingList = async (req, res) => {
  try {
    const list = await stockInventory.listShoppingList(shopIdFromReq(req));
    success(res, "Liste de courses recuperee.", null, list);
  } catch (error) {
    failed(res, "Erreur serveur.", error.message);
  }
};

const setShoppingListTaken = async (req, res) => {
  try {
    await stockInventory.setShoppingListTaken({
      shopId: shopIdFromReq(req),
      id: req.params.id,
      taken: Boolean(req.body.taken),
    });
    success(res, "Ligne de course mise a jour.", null, null);
  } catch (error) {
    failed(res, "Erreur serveur.", error.message);
  }
};
```

Then export those names in the existing `module.exports` object.

- [ ] **Step 7: Create the router**

Create `../express-pos/src/routers/r_stockInventory.js`:

```js
const stockInventory = require("../controllers/c_stockInventory");
const { authentication, authAdmin } = require("../helpers/middleware/auth");
const express = require("express");

const routers = express.Router();

routers
  .get("/stock/items", authentication, stockInventory.listItems)
  .post("/stock/ingredients", authentication, authAdmin, stockInventory.createIngredient)
  .get("/stock/items/:id", authentication, stockInventory.detailItem)
  .patch("/stock/items/:id", authentication, authAdmin, stockInventory.updateItem)
  .post("/stock/items/:id/replenishments", authentication, stockInventory.replenishItem)
  .post("/stock/items/:id/inventories", authentication, stockInventory.inventoryItem)
  .post("/stock/shopping-list/generate", authentication, stockInventory.generateShoppingList)
  .get("/stock/shopping-list", authentication, stockInventory.listShoppingList)
  .patch("/stock/shopping-list/:id/taken", authentication, stockInventory.setShoppingListTaken);

module.exports = routers;
```

- [ ] **Step 8: Mount the router**

Modify `../express-pos/index.js`:

```js
const routerStockInventory = require("./src/routers/r_stockInventory");
```

Add after the legacy stock router mount:

```js
app.use(`${prefix}`, routerStockInventory);
```

- [ ] **Step 9: Run targeted backend tests**

Run:

```bash
cd ../express-pos
node test/stock-inventory-domain.test.js
node test/stock-inventory-controller.test.js
```

Expected: both pass.

- [ ] **Step 10: Add the controller test to backend package script**

Modify `../express-pos/package.json` so `scripts.test` includes:

```text
node test/stock-inventory-controller.test.js
```

Place it after `node test/stock-inventory-migration.test.js`.

- [ ] **Step 11: Commit**

```bash
git add ../express-pos/src/modules/m_stockInventory.js ../express-pos/src/controllers/c_stockInventory.js ../express-pos/src/routers/r_stockInventory.js ../express-pos/index.js ../express-pos/test/stock-inventory-controller.test.js ../express-pos/package.json
git commit -m "feat: add stock inventory api"
```

---

### Task 4: Product Stock Tracking And Checkout Integration

**Files:**
- Modify: `../express-pos/src/helpers/stockRequirements.js`
- Modify: `../express-pos/test/stock-requirements.test.js`
- Modify: `../express-pos/src/modules/m_checkout.js`
- Modify: `../express-pos/src/controllers/c_products.js`
- Modify: `../express-pos/src/modules/m_products.js`
- Create: `../express-pos/test/product-stock-tracking.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Consumes: `isStockTrackedProduct(product)` from Task 1
- Produces: checkout only decrements tracked products
- Produces: product create/update accepts `track_stock`, `stock_zero_behavior`, `minimum_stock`, `target_stock`, `stock_unit`

- [ ] **Step 1: Extend stock requirement tests**

Append to `../express-pos/test/stock-requirements.test.js`:

```js
const untrackedRequirements = buildStockRequirements([{
  product: { id: 1, track_stock: 0 },
  quantity: 2,
  selectedChoices: [{ choice_type: "linked_product", linked_product_id: 2, linked_product_track_stock: 0 }],
}]);
assert.deepStrictEqual([...untrackedRequirements.entries()], []);

const mixedRequirements = buildStockRequirements([{
  product: { id: 1, track_stock: 1 },
  quantity: 2,
  selectedChoices: [
    { choice_type: "linked_product", linked_product_id: 2, linked_product_track_stock: 0 },
    { choice_type: "linked_product", linked_product_id: 3, linked_product_track_stock: 1 },
  ],
}]);
assert.deepStrictEqual([...mixedRequirements.entries()], [[1, 2], [3, 2]]);
```

- [ ] **Step 2: Run stock requirement test to verify it fails**

Run:

```bash
cd ../express-pos
node test/stock-requirements.test.js
```

Expected: FAIL because untracked products are still included.

- [ ] **Step 3: Update stock requirement helper**

Modify `../express-pos/src/helpers/stockRequirements.js`:

```js
const { isStockTrackedProduct } = require("./stockInventory");

const buildStockRequirements = (items) => {
  const requirements = new Map();
  const add = (productId, quantity) => {
    requirements.set(productId, (requirements.get(productId) || 0) + quantity);
  };

  for (const item of items) {
    if (isStockTrackedProduct(item.product)) add(item.product.id, item.quantity);
    for (const choice of item.selectedChoices) {
      if (
        choice.choice_type === "linked_product" &&
        isStockTrackedProduct({ track_stock: choice.linked_product_track_stock })
      ) {
        add(choice.linked_product_id, item.quantity);
      }
    }
  }

  return requirements;
};

module.exports = {
  buildStockRequirements,
};
```

- [ ] **Step 4: Run stock requirement tests**

Run:

```bash
cd ../express-pos
node test/stock-requirements.test.js
node test/stock-inventory-domain.test.js
```

Expected: PASS.

- [ ] **Step 5: Ensure checkout selects track_stock**

Modify `../express-pos/src/modules/m_checkout.js` product SELECT blocks to include `track_stock`. At the locked stock query, change:

```sql
SELECT id, shopid, stock
```

to:

```sql
SELECT id, shopid, stock, track_stock
```

Find the product loading query used to build checkout items. It currently selects product availability columns such as:

```sql
stock, archived, is_hidden
```

Change that select list to include:

```sql
stock, track_stock, archived, is_hidden
```

Find the linked-product customization choice query. It currently joins `products linked_product ON linked_product.id = choice.linked_product_id`. Add this selected column:

```sql
linked_product.track_stock AS linked_product_track_stock
```

When mapping selected choices into checkout items, preserve that property:

```js
linked_product_track_stock: choice.linked_product_track_stock,
```

- [ ] **Step 6: Add product tracking contract test**

Create `../express-pos/test/product-stock-tracking.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const checkoutSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "modules", "m_checkout.js"),
  "utf8",
);
const productsControllerSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "controllers", "c_products.js"),
  "utf8",
);

assert.match(checkoutSource, /SELECT id, shopid, stock, track_stock/);
assert.match(checkoutSource, /linked_product\.track_stock AS linked_product_track_stock/);
assert.match(productsControllerSource, /track_stock/);
assert.match(productsControllerSource, /stock_zero_behavior/);

console.log("product stock tracking tests passed");
```

- [ ] **Step 7: Accept product stock fields in product controller/module**

Modify product normalization in `../express-pos/src/controllers/c_products.js` so create/update accepts:

```js
if (body.track_stock === undefined) body.track_stock = 1;
body.track_stock = Number(body.track_stock) === 0 ? 0 : 1;
body.stock_zero_behavior = body.stock_zero_behavior === "warn" ? "warn" : "block";
body.stock_unit = body.stock_unit || "piece";
body.minimum_stock = body.minimum_stock === undefined ? 1 : Number(body.minimum_stock);
body.target_stock = body.target_stock === undefined ? Number(body.stock || 0) : Number(body.target_stock);
```

When `track_stock` is `1`, keep requiring `stock`. When `track_stock` is `0`, set product stock to `0` if the payload omits stock.

In `../express-pos/src/modules/m_products.js`, add a local helper near the existing product helpers:

```js
const upsertProductStockItem = async (connection, productId, data) => {
  const products = await queryRows(connection, "SELECT * FROM products WHERE id = ?", [productId]);
  const product = products[0];
  if (!product) return;

  const stockItemData = {
    shop_id: product.shopid,
    item_type: "product",
    product_id: productId,
    name: product.name,
    unit: data.stock_unit || "piece",
    current_stock: Number(product.stock || 0),
    minimum_stock: Number(data.minimum_stock || 1),
    target_stock: Number(data.target_stock || product.stock || 0),
    archived: product.archived || 0,
  };

  if (product.stock_item_id) {
    await queryRows(connection, "UPDATE stock_items SET ? WHERE id = ?", [
      stockItemData,
      product.stock_item_id,
    ]);
    return;
  }

  const result = await queryRows(connection, "INSERT INTO stock_items SET ?", stockItemData);
  await queryRows(connection, "UPDATE products SET stock_item_id = ? WHERE id = ?", [
    result.insertId,
    productId,
  ]);
};
```

Call it after product creation:

```js
await upsertProductStockItem(connection, result.insertId, data);
```

Call it after product update:

```js
await upsertProductStockItem(connection, id, data);
```

When inserting/updating `products`, remove stock-inventory-only payload fields before `INSERT INTO products SET ?` or `UPDATE products SET ?`:

```js
delete productData.stock_unit;
delete productData.minimum_stock;
delete productData.target_stock;
```

- [ ] **Step 8: Run targeted backend tests**

Run:

```bash
cd ../express-pos
node test/stock-requirements.test.js
node test/product-stock-tracking.test.js
```

Expected: PASS.

- [ ] **Step 9: Add product tracking test to package script**

Modify `../express-pos/package.json` so `scripts.test` includes:

```text
node test/product-stock-tracking.test.js
```

Place it after `node test/stock-inventory-controller.test.js`.

- [ ] **Step 10: Commit**

```bash
git add ../express-pos/src/helpers/stockRequirements.js ../express-pos/test/stock-requirements.test.js ../express-pos/src/modules/m_checkout.js ../express-pos/src/controllers/c_products.js ../express-pos/src/modules/m_products.js ../express-pos/test/product-stock-tracking.test.js ../express-pos/package.json
git commit -m "feat: respect product stock tracking"
```

---

### Task 5: Frontend Stock Inventory Store And Helpers

**Files:**
- Create: `helpers/stockInventory.js`
- Create: `store/stockInventory.js`
- Create: `test/stock-inventory-helper.test.js`
- Create: `test/stock-inventory-store.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `getStockStatus(item) -> string`
- Produces: `sortShoppingListItems(items) -> array`
- Produces Vuex actions: `getItems`, `createIngredient`, `updateItem`, `getItemDetail`, `replenishItem`, `inventoryItem`, `generateShoppingList`, `getShoppingList`, `setShoppingListTaken`

- [ ] **Step 1: Write helper test**

Create `test/stock-inventory-helper.test.js`:

```js
const assert = require('assert')
const {
  getStockStatus,
  sortShoppingListItems,
  formatEstimatedPrice,
} = require('../helpers/stockInventory')

assert.strictEqual(getStockStatus({ current_stock: 2, minimum_stock: 6, target_stock: 20 }), 'red')
assert.strictEqual(getStockStatus({ current_stock: 12, minimum_stock: 6, target_stock: 20 }), 'orange')
assert.strictEqual(getStockStatus({ current_stock: 20, minimum_stock: 6, target_stock: 20 }), 'normal')

assert.deepStrictEqual(
  sortShoppingListItems([
    { id: 1, status_at_generation: 'orange', taken: 0, name: 'Sauce' },
    { id: 2, status_at_generation: 'red', taken: 0, name: 'Fromage' },
    { id: 3, status_at_generation: 'red', taken: 1, name: 'Pate' },
  ]).map((item) => item.id),
  [2, 1, 3]
)

assert.strictEqual(formatEstimatedPrice(null), 'Non renseigne')
assert.strictEqual(formatEstimatedPrice(7.5), '7.50 EUR')

console.log('stock inventory helper tests passed')
```

- [ ] **Step 2: Run helper test to verify it fails**

Run:

```bash
node test/stock-inventory-helper.test.js
```

Expected: FAIL because `helpers/stockInventory.js` does not exist.

- [ ] **Step 3: Implement frontend helper**

Create `helpers/stockInventory.js`:

```js
const getStockStatus = (item) => {
  const current = Number(item.current_stock)
  const minimum = Number(item.minimum_stock)
  const target = Number(item.target_stock)
  if (current < minimum) return 'red'
  if (current < target) return 'orange'
  return 'normal'
}

const statusRank = {
  red: 0,
  orange: 1,
  normal: 2,
}

const sortShoppingListItems = (items = []) =>
  [...items].sort((a, b) => {
    if (Number(a.taken) !== Number(b.taken)) return Number(a.taken) - Number(b.taken)
    const statusDelta =
      (statusRank[a.status_at_generation] || 9) -
      (statusRank[b.status_at_generation] || 9)
    if (statusDelta !== 0) return statusDelta
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

const formatEstimatedPrice = (value) => {
  if (value === null || value === undefined || value === '') return 'Non renseigne'
  return `${Number(value).toFixed(2)} EUR`
}

module.exports = {
  getStockStatus,
  sortShoppingListItems,
  formatEstimatedPrice,
}
```

- [ ] **Step 4: Write store source test**

Create `test/stock-inventory-store.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '..', 'store', 'stockInventory.js'), 'utf8')

assert.match(source, /dataItems/)
assert.match(source, /shoppingList/)
assert.match(source, /getItems/)
assert.match(source, /\/baseurl\/api\/v1\/stock\/items/)
assert.match(source, /createIngredient/)
assert.match(source, /\/baseurl\/api\/v1\/stock\/ingredients/)
assert.match(source, /replenishItem/)
assert.match(source, /\/replenishments/)
assert.match(source, /inventoryItem/)
assert.match(source, /\/inventories/)
assert.match(source, /generateShoppingList/)
assert.match(source, /\/baseurl\/api\/v1\/stock\/shopping-list\/generate/)
assert.match(source, /setShoppingListTaken/)

console.log('stock inventory store tests passed')
```

- [ ] **Step 5: Run store test to verify it fails**

Run:

```bash
node test/stock-inventory-store.test.js
```

Expected: FAIL because `store/stockInventory.js` does not exist.

- [ ] **Step 6: Implement store module**

Create `store/stockInventory.js` following existing Vuex Easy Access style:

```js
import EasyAccess, { defaultMutations } from 'vuex-easy-access'

export const state = () => ({
  dataItems: [],
  detailItem: null,
  movements: [],
  shoppingList: [],
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const errorMessage = (error, fallback) =>
  (error &&
    error.response &&
    error.response.data &&
    error.response.data.message) ||
  fallback

export const actions = {
  getItems({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/stock/items', { headers: authHeaders() })
      .then((response) => {
        dispatch('set/dataItems', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de charger le stock.'))
        dispatch('set/dataItems', [])
        return false
      })
  },
  createIngredient({ dispatch }, data) {
    return this.$axios
      .post('/baseurl/api/v1/stock/ingredients', data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Ingredient cree avec succes.', { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de creer l'ingredient."))
        return false
      })
  },
  updateItem({ dispatch }, { id, data }) {
    return this.$axios
      .patch(`/baseurl/api/v1/stock/items/${id}`, data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de modifier l'article."))
        return false
      })
  },
  getItemDetail({ dispatch }, id) {
    return this.$axios
      .get(`/baseurl/api/v1/stock/items/${id}`, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/detailItem', response.data.data.item)
        dispatch('set/movements', response.data.data.movements || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de charger l'article."))
        return false
      })
  },
  replenishItem({ dispatch }, { id, data }) {
    return this.$axios
      .post(`/baseurl/api/v1/stock/items/${id}/replenishments`, data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Stock reapprovisionne.', { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de reapprovisionner.'))
        return false
      })
  },
  inventoryItem({ dispatch }, { id, data }) {
    return this.$axios
      .post(`/baseurl/api/v1/stock/items/${id}/inventories`, data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible d'enregistrer l'inventaire."))
        return false
      })
  },
  generateShoppingList({ dispatch }) {
    return this.$axios
      .post('/baseurl/api/v1/stock/shopping-list/generate', {}, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/shoppingList', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de generer la liste de courses.'))
        return false
      })
  },
  getShoppingList({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/stock/shopping-list', { headers: authHeaders() })
      .then((response) => {
        dispatch('set/shoppingList', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de charger la liste de courses.'))
        dispatch('set/shoppingList', [])
        return false
      })
  },
  setShoppingListTaken({ dispatch }, { id, taken }) {
    return this.$axios
      .patch(`/baseurl/api/v1/stock/shopping-list/${id}/taken`, { taken }, { headers: authHeaders() })
      .then(() => true)
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de mettre a jour la ligne.'))
        return false
      })
  },
}
```

- [ ] **Step 7: Run frontend targeted tests**

Run:

```bash
node test/stock-inventory-helper.test.js
node test/stock-inventory-store.test.js
```

Expected: PASS.

- [ ] **Step 8: Add tests to frontend package script**

Modify `package.json` so `scripts.test` includes:

```text
node test/stock-inventory-helper.test.js && node test/stock-inventory-store.test.js
```

Place them near existing stock/navigation tests.

- [ ] **Step 9: Commit**

```bash
git add helpers/stockInventory.js store/stockInventory.js test/stock-inventory-helper.test.js test/stock-inventory-store.test.js package.json
git commit -m "feat: add stock inventory frontend store"
```

---

### Task 6: Frontend Stock Module Screens

**Files:**
- Replace: `pages/stocks/index.vue`
- Create: `pages/stocks/_id.vue`
- Create: `test/stock-inventory-page.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `stockInventory` store actions from Task 5
- Consumes: `getStockStatus`, `sortShoppingListItems`, `formatEstimatedPrice`
- Produces: tabbed Stock UI with products, ingredients, stock statuses, generated shopping list, and inventory entry points

- [ ] **Step 1: Write page source test**

Create `test/stock-inventory-page.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'stocks', 'index.vue'), 'utf8')
const detailSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'stocks', '_id.vue'), 'utf8')

assert.match(indexSource, /v-tabs/)
assert.match(indexSource, /Produits/)
assert.match(indexSource, /Ingredients/)
assert.match(indexSource, /Stocks bas/)
assert.match(indexSource, /Liste de courses/)
assert.match(indexSource, /Inventaire/)
assert.match(indexSource, /generateShoppingList/)
assert.match(indexSource, /setShoppingListTaken/)
assert.match(indexSource, /replenishItem/)
assert.match(indexSource, /inventoryItem/)
assert.match(indexSource, /Pris/)
assert.match(indexSource, /Reapprovisionner/)
assert.match(indexSource, /Non renseigne/)
assert.match(detailSource, /movements/)
assert.match(detailSource, /replenishment/)
assert.match(detailSource, /inventory/)

console.log('stock inventory page tests passed')
```

- [ ] **Step 2: Run page test to verify it fails**

Run:

```bash
node test/stock-inventory-page.test.js
```

Expected: FAIL because the current stock page is still the legacy movement table and detail page does not exist.

- [ ] **Step 3: Replace stock index page**

Replace `pages/stocks/index.vue` with a Vuetify tabbed page. Required script shape:

```js
import {
  getStockStatus,
  sortShoppingListItems,
  formatEstimatedPrice,
} from '@/helpers/stockInventory'

export default {
  middleware: 'auth',
  data: () => ({
    activeTab: 0,
    search: '',
    loading: false,
    ingredientDialog: false,
    replenishDialog: false,
    inventoryDialog: false,
    selectedItem: null,
    ingredientForm: {
      name: '',
      unit: 'piece',
      current_stock: 0,
      minimum_stock: 1,
      target_stock: 1,
      category_label: '',
      reference: '',
      default_supplier: '',
      note: '',
    },
    replenishForm: {
      quantity: 1,
      supplier: '',
      unit_price: '',
      total_price: '',
      remark: '',
    },
    inventoryForm: {
      quantity: 0,
      remark: '',
    },
  }),
  computed: {
    items() {
      return this.$store.get('stockInventory/dataItems') || []
    },
    products() {
      return this.items.filter((item) => item.item_type === 'product')
    },
    ingredients() {
      return this.items.filter((item) => item.item_type === 'ingredient')
    },
    lowItems() {
      return this.filteredItems.filter((item) => getStockStatus(item) !== 'normal')
    },
    shoppingList() {
      return sortShoppingListItems(this.$store.get('stockInventory/shoppingList') || [])
    },
    filteredItems() {
      const term = this.search.trim().toLowerCase()
      if (!term) return this.items
      return this.items.filter((item) =>
        String(item.name || '').toLowerCase().includes(term)
      )
    },
  },
  mounted() {
    this.loadStock()
  },
  methods: {
    getStockStatus,
    formatEstimatedPrice,
    async loadStock() {
      this.loading = true
      await Promise.all([
        this.$store.dispatch('stockInventory/getItems'),
        this.$store.dispatch('stockInventory/getShoppingList'),
      ])
      this.loading = false
    },
    async generateShoppingList() {
      await this.$store.dispatch('stockInventory/generateShoppingList')
    },
    async toggleTaken(item) {
      await this.$store.dispatch('stockInventory/setShoppingListTaken', {
        id: item.id,
        taken: !Number(item.taken),
      })
      await this.$store.dispatch('stockInventory/getShoppingList')
    },
    openReplenish(item) {
      this.selectedItem = item
      this.replenishForm = {
        quantity: item.quantity_to_buy || 1,
        supplier: item.default_supplier || '',
        unit_price: item.estimated_unit_price || item.average_unit_price || '',
        total_price: item.estimated_total_price || '',
        remark: '',
      }
      this.replenishDialog = true
    },
    async replenishItem() {
      await this.$store.dispatch('stockInventory/replenishItem', {
        id: this.selectedItem.stock_item_id || this.selectedItem.id,
        data: this.replenishForm,
      })
      this.replenishDialog = false
      await this.loadStock()
    },
    openInventory(item) {
      this.selectedItem = item
      this.inventoryForm = { quantity: item.current_stock, remark: '' }
      this.inventoryDialog = true
    },
    async inventoryItem() {
      await this.$store.dispatch('stockInventory/inventoryItem', {
        id: this.selectedItem.id,
        data: this.inventoryForm,
      })
      this.inventoryDialog = false
      await this.loadStock()
    },
  },
}
```

Template must include:

```vue
<v-tabs v-model="activeTab">
  <v-tab>Produits</v-tab>
  <v-tab>Ingredients</v-tab>
  <v-tab>Stocks bas</v-tab>
  <v-tab>Liste de courses</v-tab>
  <v-tab>Inventaire</v-tab>
</v-tabs>
```

Add dialogs for ingredient creation, replenishment, and inventory using Vuetify `v-dialog`, `v-text-field`, `v-combobox`, `v-textarea`, and buttons.

- [ ] **Step 4: Create stock detail page**

Create `pages/stocks/_id.vue` with:

```vue
<template>
  <v-container>
    <Loading v-if="loading" />
    <div v-else-if="item">
      <v-card outlined class="mb-4">
        <v-card-title>{{ item.name }}</v-card-title>
        <v-card-text>
          <div>Stock: {{ item.current_stock }} {{ item.unit }}</div>
          <div>Seuil minimum: {{ item.minimum_stock }}</div>
          <div>Stock cible: {{ item.target_stock }}</div>
          <div>Prix moyen: {{ formatEstimatedPrice(item.average_unit_price) }}</div>
        </v-card-text>
      </v-card>
      <v-data-table :headers="headers" :items="movements">
        <template #[`item.movement_type`]="{ item: movement }">
          <span>{{ movement.movement_type === 'replenishment' ? 'Reapprovisionnement' : 'Inventaire' }}</span>
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'
import { formatEstimatedPrice } from '@/helpers/stockInventory'

export default {
  components: { Loading },
  middleware: 'auth',
  data: () => ({
    loading: false,
    headers: [
      { text: 'Date', value: 'created_at' },
      { text: 'Type', value: 'movement_type' },
      { text: 'Quantite', value: 'quantity' },
      { text: 'Stock avant', value: 'previous_stock' },
      { text: 'Stock apres', value: 'new_stock' },
      { text: 'Fournisseur', value: 'supplier' },
      { text: 'Prix unitaire', value: 'unit_price' },
      { text: 'Prix total', value: 'total_price' },
    ],
  }),
  computed: {
    item() {
      return this.$store.get('stockInventory/detailItem')
    },
    movements() {
      return this.$store.get('stockInventory/movements') || []
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    formatEstimatedPrice,
    async load() {
      this.loading = true
      await this.$store.dispatch('stockInventory/getItemDetail', this.$route.params.id)
      this.loading = false
    },
  },
}
</script>
```

- [ ] **Step 5: Run page test**

Run:

```bash
node test/stock-inventory-page.test.js
```

Expected: PASS.

- [ ] **Step 6: Add page test to frontend package script**

Modify `package.json` so `scripts.test` includes:

```text
node test/stock-inventory-page.test.js
```

- [ ] **Step 7: Commit**

```bash
git add pages/stocks/index.vue pages/stocks/_id.vue test/stock-inventory-page.test.js package.json
git commit -m "feat: build stock inventory page"
```

---

### Task 7: Product Forms And Navigation

**Files:**
- Modify: `pages/products/newproduct.vue`
- Modify: `pages/products/edit/_id/index.vue`
- Modify: `helpers/listdashboard.js`
- Modify: `test/admin-navigation.test.js`
- Create: `test/product-stock-fields.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: backend product fields from Task 4
- Produces: product create/update payload fields `track_stock`, `stock_zero_behavior`, `minimum_stock`, `target_stock`, `stock_unit`

- [ ] **Step 1: Update navigation test expectation**

Modify `test/admin-navigation.test.js` by replacing the Stock hidden assertion with:

```js
assert.match(
  dashboardSource,
  /title:\s*['"]Stocks['"][\s\S]*?routeName:\s*['"]stocks['"][\s\S]*?to:\s*['"]\/stocks['"][\s\S]*?moduleKey:\s*['"]stocks['"]/,
  'Stock doit apparaitre dans le menu principal pour les utilisateurs autorises'
)
assert.doesNotMatch(
  dashboardSource,
  /routeName:\s*['"]stocks['"][\s\S]*?hiddenFromMainNavigation:\s*true/,
  'Stock ne doit plus etre masque de la navigation principale'
)
```

- [ ] **Step 2: Write product stock fields source test**

Create `test/product-stock-fields.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const newProduct = fs.readFileSync(path.join(__dirname, '..', 'pages', 'products', 'newproduct.vue'), 'utf8')
const editProduct = fs.readFileSync(path.join(__dirname, '..', 'pages', 'products', 'edit', '_id', 'index.vue'), 'utf8')

for (const source of [newProduct, editProduct]) {
  assert.match(source, /track_stock/)
  assert.match(source, /Suivre le stock/)
  assert.match(source, /stock_zero_behavior/)
  assert.match(source, /minimum_stock/)
  assert.match(source, /target_stock/)
  assert.match(source, /stock_unit/)
}

console.log('product stock fields tests passed')
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
node test/admin-navigation.test.js
node test/product-stock-fields.test.js
```

Expected: FAIL because Stock is still hidden and product forms lack new fields.

- [ ] **Step 4: Show Stock in navigation**

Modify the `Stocks` item in `helpers/listdashboard.js` by removing:

```js
hiddenFromMainNavigation: true,
```

Keep:

```js
moduleKey: 'stocks',
```

- [ ] **Step 5: Extend new product form data and template**

In `pages/products/newproduct.vue`, add to `formproduct`:

```js
track_stock: true,
stock_zero_behavior: 'block',
minimum_stock: 1,
target_stock: 1,
stock_unit: 'piece',
```

Add this section near the existing Stock field:

```vue
<v-switch
  v-model="formproduct.track_stock"
  label="Suivre le stock"
/>
<div v-if="formproduct.track_stock">
  <v-text-field
    v-model="formproduct.stock"
    label="Stock actuel"
    type="number"
    :rules="[(v) => v !== '' || 'Stock actuel requis']"
    required
  />
  <v-text-field
    v-model="formproduct.minimum_stock"
    label="Seuil minimum"
    type="number"
    :rules="[(v) => v !== '' || 'Seuil minimum requis']"
    required
  />
  <v-text-field
    v-model="formproduct.target_stock"
    label="Stock cible"
    type="number"
    :rules="[(v) => v !== '' || 'Stock cible requis']"
    required
  />
  <v-combobox
    v-model="formproduct.stock_unit"
    :items="['piece', 'paquet', 'bouteille', 'carton', 'bac']"
    label="Unite"
    :rules="[(v) => !!v || 'Unite requise']"
    required
  />
  <v-select
    v-model="formproduct.stock_zero_behavior"
    :items="[
      { text: 'Bloquer a zero', value: 'block' },
      { text: 'Autoriser avec alerte', value: 'warn' },
    ]"
    label="A stock zero"
    required
  />
</div>
```

Append to `FormData`:

```js
fd.append('track_stock', this.formproduct.track_stock ? 1 : 0)
fd.append('stock_zero_behavior', this.formproduct.stock_zero_behavior)
fd.append('minimum_stock', this.formproduct.minimum_stock)
fd.append('target_stock', this.formproduct.target_stock)
fd.append('stock_unit', this.formproduct.stock_unit)
```

- [ ] **Step 6: Extend edit product form similarly**

In `pages/products/edit/_id/index.vue`, add the same fields to `formeditproduct`, load them from `product`, and append them in `buildProductPayload()`:

```js
track_stock: Number(product.track_stock) !== 0,
stock_zero_behavior: product.stock_zero_behavior || 'block',
minimum_stock: product.minimum_stock || 1,
target_stock: product.target_stock || product.stock || 1,
stock_unit: product.stock_unit || 'piece',
```

In `buildProductPayload()`, include:

```js
track_stock: this.formeditproduct.track_stock ? 1 : 0,
stock_zero_behavior: this.formeditproduct.stock_zero_behavior,
minimum_stock: this.formeditproduct.minimum_stock,
target_stock: this.formeditproduct.target_stock,
stock_unit: this.formeditproduct.stock_unit,
```

- [ ] **Step 7: Run frontend targeted tests**

Run:

```bash
node test/admin-navigation.test.js
node test/product-stock-fields.test.js
```

Expected: PASS.

- [ ] **Step 8: Add product stock fields test to package script**

Modify `package.json` so `scripts.test` includes:

```text
node test/product-stock-fields.test.js
```

- [ ] **Step 9: Commit**

```bash
git add helpers/listdashboard.js pages/products/newproduct.vue pages/products/edit/_id/index.vue test/admin-navigation.test.js test/product-stock-fields.test.js package.json
git commit -m "feat: expose stock tracking in products"
```

---

### Task 8: Final Verification

**Files:**
- Review all files changed by Tasks 1-7.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified implementation ready for manual QA.

- [ ] **Step 1: Run backend targeted tests**

Run:

```bash
cd ../express-pos
node test/stock-inventory-domain.test.js
node test/stock-inventory-migration.test.js
node test/stock-inventory-controller.test.js
node test/stock-requirements.test.js
node test/product-stock-tracking.test.js
```

Expected: all pass.

- [ ] **Step 2: Run frontend targeted tests**

Run:

```bash
node test/stock-inventory-helper.test.js
node test/stock-inventory-store.test.js
node test/stock-inventory-page.test.js
node test/product-stock-fields.test.js
node test/admin-navigation.test.js
```

Expected: all pass.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing unrelated lint failures. If failures are in changed files, fix them before continuing.

- [ ] **Step 4: Run backend full test script when time allows**

Run:

```bash
cd ../express-pos
npm test
```

Expected: PASS.

- [ ] **Step 5: Run frontend full test script when time allows**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Manual browser QA**

Start backend and frontend if local env is ready:

```bash
cd ../express-pos
npm run startAndWatch
```

In another terminal:

```bash
npm run dev
```

Manual scenario:

1. Open `/stocks`.
2. Create ingredient `Fromage`, unit `paquet`, stock `0`, minimum `6`, target `20`.
3. Replenish `20` with supplier `Metro` and unit price `7`.
4. Open the detail page and verify the movement appears.
5. Inventory `2`.
6. Generate shopping list.
7. Verify `Fromage` is red and quantity to buy is `18`.
8. Mark it `Pris`; verify it is grayed/barred and moved down.
9. Replenish from the shopping list with quantity `18`.
10. Regenerate shopping list and verify `Fromage` disappears.
11. Create/edit a product with `Suivre le stock` disabled and verify stock fields are hidden.
12. Create/edit a product with `Suivre le stock` enabled and verify stock fields are required.

- [ ] **Step 7: Commit final fixes**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix: stabilize stock inventory module"
```

If no fixes were needed, do not create an empty commit.
