# Product Takeaway VAT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product-level dine-in and takeaway VAT rates and automatically snapshot the correct rate on orders, receipts, order details, archives, and Ticket Z.

**Architecture:** Products carry two VAT configuration fields: `vat_rate_dine_in` and `vat_rate_takeaway`. Checkout and order editing resolve the applicable product VAT from `is_takeaway`, then keep using existing immutable snapshots in `orderdetail` and `archivesdetail`. Existing receipt, detail, history, and Ticket Z ventilation continue to read snapshots, with small UI checks to ensure mixed VAT tickets remain visible.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, Express, MySQL, dbmate migrations, Node test scripts.

## Global Constraints

- Keep `products.vat_rate` for compatibility.
- Initialize new VAT fields from existing `products.vat_rate`.
- Allowed VAT rates remain `5.5`, `10`, and `20`.
- The POS chooses VAT automatically from `is_takeaway`.
- Existing archived orders must not be recalculated.
- Receipts, history, details, and Ticket Z must continue using `orderdetail` / `archivesdetail` snapshots.
- No new dependency.

---

### Task 1: Backend VAT Model And Resolver

**Files:**
- Modify: `../express-pos/db/migrations/20260812130000_product_takeaway_vat.sql`
- Modify: `../express-pos/src/helpers/vat.js`
- Modify: `../express-pos/src/controllers/c_products.js`
- Test: `../express-pos/test/vat.test.js`
- Test: `../express-pos/test/vat-migration.test.js`
- Test: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Produces: `resolveProductVatRate(product, isTakeaway)` returning a number.
- Produces: product rows with `vat_rate_dine_in` and `vat_rate_takeaway`.
- Consumes: existing `normalizeVatRate(value, fallback)`.

- [ ] **Step 1: Write failing VAT helper tests**

Add to `../express-pos/test/vat.test.js`:

```js
const { resolveProductVatRate } = require("../src/helpers/vat");

assert.strictEqual(
  resolveProductVatRate({ vat_rate: 10, vat_rate_dine_in: 10, vat_rate_takeaway: 5.5 }, false),
  10,
);
assert.strictEqual(
  resolveProductVatRate({ vat_rate: 10, vat_rate_dine_in: 10, vat_rate_takeaway: 5.5 }, true),
  5.5,
);
assert.strictEqual(resolveProductVatRate({ vat_rate: 20 }, false), 20);
assert.strictEqual(resolveProductVatRate({ vat_rate: 20 }, true), 20);
```

- [ ] **Step 2: Write failing migration contract**

Add to `../express-pos/test/vat-migration.test.js`:

```js
const productTakeawayVatMigration = fs.readFileSync(
  path.join(__dirname, "../db/migrations/20260812130000_product_takeaway_vat.sql"),
  "utf8",
);
assert.ok(productTakeawayVatMigration.includes("ADD COLUMN `vat_rate_dine_in` DECIMAL(4,2) NOT NULL DEFAULT 10.00"));
assert.ok(productTakeawayVatMigration.includes("ADD COLUMN `vat_rate_takeaway` DECIMAL(4,2) NOT NULL DEFAULT 10.00"));
assert.ok(productTakeawayVatMigration.includes("`vat_rate_dine_in` = `vat_rate`"));
assert.ok(productTakeawayVatMigration.includes("`vat_rate_takeaway` = `vat_rate`"));
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
node test/vat.test.js
node test/vat-migration.test.js
```

Expected: `resolveProductVatRate` missing and migration file missing.

- [ ] **Step 4: Add migration**

Create `../express-pos/db/migrations/20260812130000_product_takeaway_vat.sql`:

```sql
-- migrate:up

ALTER TABLE `products`
  ADD COLUMN `vat_rate_dine_in` DECIMAL(4,2) NOT NULL DEFAULT 10.00 AFTER `vat_rate`,
  ADD COLUMN `vat_rate_takeaway` DECIMAL(4,2) NOT NULL DEFAULT 10.00 AFTER `vat_rate_dine_in`;

UPDATE `products`
SET
  `vat_rate_dine_in` = `vat_rate`,
  `vat_rate_takeaway` = `vat_rate`;

-- migrate:down

ALTER TABLE `products`
  DROP COLUMN `vat_rate_takeaway`,
  DROP COLUMN `vat_rate_dine_in`;
```

- [ ] **Step 5: Add resolver helper**

Modify `../express-pos/src/helpers/vat.js`:

```js
const resolveProductVatRate = (product = {}, isTakeaway = false) => {
  const fallback = product.vat_rate === undefined ? 10 : product.vat_rate;
  const dineInRate = normalizeVatRate(product.vat_rate_dine_in, fallback);
  const takeawayRate = normalizeVatRate(product.vat_rate_takeaway, dineInRate);
  return isTakeaway ? takeawayRate : dineInRate;
};
```

Export it in `module.exports`.

- [ ] **Step 6: Accept both product VAT fields**

Modify `../express-pos/src/controllers/c_products.js` inside VAT normalization:

```js
const hasLegacyVat = Object.prototype.hasOwnProperty.call(body, "vat_rate");
const hasDineInVat = Object.prototype.hasOwnProperty.call(body, "vat_rate_dine_in");
const hasTakeawayVat = Object.prototype.hasOwnProperty.call(body, "vat_rate_takeaway");

if (creation || hasLegacyVat || hasDineInVat || hasTakeawayVat) {
  const legacyVat = normalizeVatRate(body.vat_rate, 10);
  body.vat_rate = legacyVat;
  body.vat_rate_dine_in = normalizeVatRate(body.vat_rate_dine_in, legacyVat);
  body.vat_rate_takeaway = normalizeVatRate(body.vat_rate_takeaway, body.vat_rate_dine_in);
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
node test/vat.test.js
node test/vat-migration.test.js
node test/checkout-contract.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit backend model**

```bash
git -C ../express-pos add db/migrations/20260812130000_product_takeaway_vat.sql src/helpers/vat.js src/controllers/c_products.js test/vat.test.js test/vat-migration.test.js test/checkout-contract.test.js
git -C ../express-pos commit -m "feat: add product takeaway vat fields"
```

---

### Task 2: Checkout And Order Editing VAT Selection

**Files:**
- Modify: `../express-pos/src/modules/m_orderQuote.js`
- Modify: `../express-pos/src/modules/m_orderEditing.js`
- Test: `../express-pos/test/checkout-contract.test.js`
- Test: `../express-pos/test/order-editing.test.js`

**Interfaces:**
- Consumes: `resolveProductVatRate(product, isTakeaway)`.
- Produces: `orderdetail.vat_rate` snapshots using dine-in or takeaway rate according to final `is_takeaway`.

- [ ] **Step 1: Write failing checkout tests**

Add checkout contract assertions where quote/order detail snapshots are tested:

```js
assert.deepStrictEqual(
  buildVatSnapshot({ unitPrice: 10, quantity: 1, vatRate: 5.5 }),
  { vatRate: 5.5, unitPriceHt: 9.48, unitVat: 0.52, totalHt: 9.48, totalVat: 0.52 },
);
```

In the checkout harness product fixture, set:

```js
vat_rate: 10,
vat_rate_dine_in: 10,
vat_rate_takeaway: 5.5,
```

Add an assertion for takeaway checkout:

```js
assert.strictEqual(harness.getState().orderDetails[0].vat_rate, 5.5);
```

- [ ] **Step 2: Write failing order edit test**

In `../express-pos/test/order-editing.test.js`, add a fixture product with `vat_rate_dine_in: 10` and `vat_rate_takeaway: 5.5`, then assert after editing `isTakeaway: true`:

```js
assert.strictEqual(harness.getState().details[0].vat_rate, 5.5);
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
node test/checkout-contract.test.js
node test/order-editing.test.js
```

Expected: VAT remains legacy `vat_rate`.

- [ ] **Step 4: Select VAT in checkout quote**

Modify `../express-pos/src/modules/m_orderQuote.js`:

```js
const { buildVatSnapshot, resolveProductVatRate } = require("../helpers/vat");
```

Select product columns:

```sql
SELECT id, shopid, name, price, vat_rate, vat_rate_dine_in, vat_rate_takeaway, stock, archived, is_hidden
```

Change quote signature to accept `isTakeaway`:

```js
quoteOrderItems: async ({ shopId, items, isTakeaway = false, connection }) => {
```

Use:

```js
vatRate: resolveProductVatRate(product, isTakeaway),
```

- [ ] **Step 5: Pass `isTakeaway` from checkout**

Modify `../express-pos/src/modules/m_checkout.js` where `quoteOrderItems` is called:

```js
const quote = await quoteOrderItems({
  shopId: checkout.shopId,
  items: checkout.items,
  isTakeaway: checkout.isTakeaway,
  connection,
});
```

- [ ] **Step 6: Pass `isTakeaway` from order editing**

Modify `../express-pos/src/modules/m_orderEditing.js` where quote/recalculation happens:

```js
const quote = await quoteOrderItems({
  shopId,
  items,
  isTakeaway: nextIsTakeaway,
  connection,
});
```

- [ ] **Step 7: Run tests**

Run:

```bash
node test/checkout-contract.test.js
node test/order-editing.test.js
node test/vat.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit checkout VAT selection**

```bash
git -C ../express-pos add src/modules/m_orderQuote.js src/modules/m_checkout.js src/modules/m_orderEditing.js test/checkout-contract.test.js test/order-editing.test.js
git -C ../express-pos commit -m "feat: resolve vat by sale mode"
```

---

### Task 3: Product UI VAT Fields

**Files:**
- Modify: `pages/products/newproduct.vue`
- Modify: `pages/products/edit/_id/index.vue`
- Test: `test/vat-breakdown.test.js`
- Test: `test/customizations.test.js`

**Interfaces:**
- Produces form payload keys `vat_rate_dine_in` and `vat_rate_takeaway`.
- Consumes backend validation from Task 1.

- [ ] **Step 1: Write failing frontend product tests**

Add to `test/vat-breakdown.test.js`:

```js
const fs = require('fs')
const path = require('path')

const newProductSource = fs.readFileSync(
  path.join(__dirname, '../pages/products/newproduct.vue'),
  'utf8'
)
const editProductSource = fs.readFileSync(
  path.join(__dirname, '../pages/products/edit/_id/index.vue'),
  'utf8'
)

for (const source of [newProductSource, editProductSource]) {
  assert.ok(source.includes('vat_rate_dine_in'))
  assert.ok(source.includes('vat_rate_takeaway'))
  assert.ok(source.includes('TVA sur place'))
  assert.ok(source.includes('TVA à emporter'))
}
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
node test/vat-breakdown.test.js
```

Expected: missing fields.

- [ ] **Step 3: Update new product form**

Replace the single VAT radio group in `pages/products/newproduct.vue` with two groups:

```vue
<v-radio-group v-model="formproduct.vat_rate_dine_in" label="TVA sur place" row>
  <v-radio label="5,5 %" :value="5.5"></v-radio>
  <v-radio label="10 %" :value="10"></v-radio>
  <v-radio label="20 %" :value="20"></v-radio>
</v-radio-group>
<v-radio-group v-model="formproduct.vat_rate_takeaway" label="TVA à emporter" row>
  <v-radio label="5,5 %" :value="5.5"></v-radio>
  <v-radio label="10 %" :value="10"></v-radio>
  <v-radio label="20 %" :value="20"></v-radio>
</v-radio-group>
```

Set data defaults:

```js
vat_rate: 10,
vat_rate_dine_in: 10,
vat_rate_takeaway: 10,
```

Append payload:

```js
fd.append('vat_rate', this.formproduct.vat_rate_dine_in)
fd.append('vat_rate_dine_in', this.formproduct.vat_rate_dine_in)
fd.append('vat_rate_takeaway', this.formproduct.vat_rate_takeaway)
```

- [ ] **Step 4: Update edit product form**

Apply the same two radio groups to `pages/products/edit/_id/index.vue`.

On load:

```js
vat_rate: Number(product.vat_rate || 10),
vat_rate_dine_in: Number(product.vat_rate_dine_in || product.vat_rate || 10),
vat_rate_takeaway: Number(product.vat_rate_takeaway || product.vat_rate_dine_in || product.vat_rate || 10),
```

In payload:

```js
vat_rate: this.formeditproduct.vat_rate_dine_in,
vat_rate_dine_in: this.formeditproduct.vat_rate_dine_in,
vat_rate_takeaway: this.formeditproduct.vat_rate_takeaway,
```

- [ ] **Step 5: Run frontend tests**

Run:

```bash
node test/vat-breakdown.test.js
node test/customizations.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit product UI**

```bash
git add pages/products/newproduct.vue pages/products/edit/_id/index.vue test/vat-breakdown.test.js test/customizations.test.js
git commit -m "feat: configure product vat by sale mode"
```

---

### Task 4: Ventilation TVA Visibility In Details And Receipts

**Files:**
- Inspect: `components/orders/VatBreakdown.vue`
- Inspect: `pages/orders/detail/_id.vue`
- Inspect: `pages/history/index.vue`
- Inspect: `pages/receip.vue`
- Inspect: `pages/history/ticket/_id.vue`
- Test: `test/vat-breakdown.test.js`
- Test: `test/receipt-printing.test.js`
- Test: `test/history-ticket.test.js`

**Interfaces:**
- Consumes existing snapshot arrays containing `vat_rate`, `total_ht`, `total_vat`, `total`.
- Produces UI/receipt output grouped by each VAT rate present in a single order/ticket.

- [ ] **Step 1: Add mixed VAT frontend tests**

Extend `test/vat-breakdown.test.js`:

```js
assert.deepStrictEqual(
  normalizeVatBreakdown([
    { vat_rate: 10, total_ht: 9.09, total_vat: 0.91, total: 10 },
    { vat_rate: 5.5, total_ht: 9.48, total_vat: 0.52, total: 10 },
    { vat_rate: 10, total_ht: 4.55, total_vat: 0.45, total: 5 },
  ]),
  [
    { vatRate: 5.5, totalHt: 9.48, totalVat: 0.52, totalTtc: 10 },
    { vatRate: 10, totalHt: 13.64, totalVat: 1.36, totalTtc: 15 },
  ]
)
```

- [ ] **Step 2: Confirm detail pages use VAT breakdown**

Assert source contains:

```js
assert.ok(fs.readFileSync(path.join(__dirname, '../pages/orders/detail/_id.vue'), 'utf8').includes('<VatBreakdown'))
assert.ok(fs.readFileSync(path.join(__dirname, '../pages/history/index.vue'), 'utf8').includes('<VatBreakdown'))
```

- [ ] **Step 3: Confirm receipts loop over all VAT rates**

Assert source contains:

```js
assert.ok(fs.readFileSync(path.join(__dirname, '../pages/receip.vue'), 'utf8').includes('this.vatBreakdown.forEach'))
assert.ok(fs.readFileSync(path.join(__dirname, '../pages/history/ticket/_id.vue'), 'utf8').includes('this.vatBreakdown.forEach'))
```

- [ ] **Step 4: Run tests**

Run:

```bash
node test/vat-breakdown.test.js
node test/receipt-printing.test.js
node test/history-ticket.test.js
```

Expected: PASS if existing snapshot-based display is complete. If a page lacks `<VatBreakdown>`, add it next to existing order totals using the shared component.

- [ ] **Step 5: Commit visibility checks**

```bash
git add components/orders/VatBreakdown.vue pages/orders/detail/_id.vue pages/history/index.vue pages/receip.vue pages/history/ticket/_id.vue test/vat-breakdown.test.js test/receipt-printing.test.js test/history-ticket.test.js
git commit -m "test: cover mixed vat breakdown display"
```

---

### Task 5: End-To-End Verification

**Files:**
- Verify: frontend and backend touched files.

**Interfaces:**
- Consumes all previous tasks.
- Produces validated feature ready for manual testing.

- [ ] **Step 1: Run backend focused tests**

```bash
node test/vat.test.js
node test/vat-migration.test.js
node test/checkout-contract.test.js
node test/order-editing.test.js
node test/cash-closure.test.js
```

- [ ] **Step 2: Run frontend focused tests**

```bash
node test/vat-breakdown.test.js
node test/receipt-printing.test.js
node test/history-ticket.test.js
node test/reports-ticket-z.test.js
```

- [ ] **Step 3: Run full suites if the machine has enough memory**

```bash
npm test
```

Run once in `../express-pos` and once in `pos-app`.

- [ ] **Step 4: Manual verification**

Create or edit a product:

- TVA sur place: `10`
- TVA a emporter: `5.5`

Create one sur-place order and one takeaway order. Confirm:

- order detail ventilation shows `10 %` for sur place
- takeaway receipt shows `5,5 %`
- a mixed ticket groups each VAT rate separately
- Ticket Z groups totals by snapshot VAT rate

- [ ] **Step 5: Commit final verification notes if needed**

Only commit additional files if verification required code/test updates.

```bash
git status --short
```

Expected: no unintended file changes are staged.
