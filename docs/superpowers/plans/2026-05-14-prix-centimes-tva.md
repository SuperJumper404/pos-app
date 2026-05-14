# Prix Centimes TVA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support euro prices with centimes end-to-end and compute 20% included VAT correctly from TTC totals.

**Architecture:** Store monetary values as `DECIMAL(10,2)` in MySQL, normalize API inputs in backend helpers, and centralize frontend formatting/calculation in `helpers/price.js`. Keep product/admin prices TTC and extract HT/TVA only for receipts and accounting display.

**Tech Stack:** Express, MySQL/dbmate, Nuxt 2, Vue 2, Vuetify, Vuex, Axios.

---

## File Structure

- Backend create: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/db/migrations/20260514120000_money_decimals.sql`
- Backend create: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/src/helpers/money.js`
- Backend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/src/controllers/c_products.js`
- Backend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/src/controllers/c_orders.js`
- Frontend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/helpers/price.js`
- Frontend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/menus.vue`
- Frontend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/cart.vue`
- Frontend modify: price display pages found by `rg "conversiRp|\\{\\{ .*price|\\{\\{ .*total|toFixed\\(2\\)" pages`
- Frontend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/receip.vue`
- Frontend modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/history/ticket/_id.vue`

## Task 1: Backend Money Storage

**Files:**
- Create: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/db/migrations/20260514120000_money_decimals.sql`

- [ ] **Step 1: Add migration**

Create the migration with:

```sql
-- migrate:up

ALTER TABLE `products` MODIFY COLUMN `price` DECIMAL(10,2) NOT NULL;
ALTER TABLE `product_choice` MODIFY COLUMN `price` DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE `orders` MODIFY COLUMN `subtotal` DECIMAL(10,2) NOT NULL;
ALTER TABLE `orderdetail` MODIFY COLUMN `price` DECIMAL(10,2) NOT NULL;
ALTER TABLE `orderdetail` MODIFY COLUMN `total` DECIMAL(10,2) NOT NULL;
ALTER TABLE `archives` MODIFY COLUMN `subtotal` DECIMAL(10,2) NOT NULL;
ALTER TABLE `archivesdetail` MODIFY COLUMN `price` DECIMAL(10,2) NOT NULL;
ALTER TABLE `archivesdetail` MODIFY COLUMN `total` DECIMAL(10,2) NOT NULL;

-- migrate:down

ALTER TABLE `products` MODIFY COLUMN `price` INT(10) NOT NULL;
ALTER TABLE `product_choice` MODIFY COLUMN `price` INT(11) DEFAULT 0;
ALTER TABLE `orders` MODIFY COLUMN `subtotal` INT(11) NOT NULL;
ALTER TABLE `orderdetail` MODIFY COLUMN `price` INT(11) NOT NULL;
ALTER TABLE `orderdetail` MODIFY COLUMN `total` INT(11) NOT NULL;
ALTER TABLE `archives` MODIFY COLUMN `subtotal` INT(11) NOT NULL;
ALTER TABLE `archivesdetail` MODIFY COLUMN `price` INT(11) NOT NULL;
ALTER TABLE `archivesdetail` MODIFY COLUMN `total` INT(11) NOT NULL;
```

- [ ] **Step 2: Verify migration syntax**

Run:

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos
npm run db:up:local
```

Expected: dbmate applies the new migration. If local MySQL is unavailable, record that verification is blocked by the local database.

- [ ] **Step 3: Commit backend migration**

```powershell
git add db/migrations/20260514120000_money_decimals.sql
git commit -m "db: support decimal money values"
```

## Task 2: Backend Money Normalization

**Files:**
- Create: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/src/helpers/money.js`
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/src/controllers/c_products.js`
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/express-pos/src/controllers/c_orders.js`

- [ ] **Step 1: Add backend helper**

Create `src/helpers/money.js`:

```js
const isMissing = (value) => value === undefined || value === null || value === ''

const parseMoney = (value) => {
  if (isMissing(value)) return null
  const normalized = String(value).replace(',', '.').trim()
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Number(parsed.toFixed(2))
}

const isValidMoney = (value) => parseMoney(value) !== null

module.exports = {
  isMissing,
  isValidMoney,
  parseMoney,
}
```

- [ ] **Step 2: Quick helper verification**

Run:

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos
node -e "const {parseMoney}=require('./src/helpers/money'); console.log(parseMoney('10,50'), parseMoney('0.50'), parseMoney('abc'))"
```

Expected output:

```text
10.5 0.5 null
```

- [ ] **Step 3: Normalize product price inputs**

In `src/controllers/c_products.js`, import the helper:

```js
const { isMissing, parseMoney } = require("../helpers/money");
```

In `addProduct`, after parsing `product_customization`, set:

```js
const parsedPrice = parseMoney(body.price);
if (parsedPrice !== null) {
  body.price = parsedPrice;
}
if (body.product_customization) {
  body.product_customization = body.product_customization.map((customization) => ({
    ...customization,
    items: (customization.items || []).map((item) => ({
      ...item,
      price: parseMoney(item.price) || 0,
    })),
  }));
}
```

Replace the existing bad request check with:

```js
if (
  !body.name ||
  !body.categoryid ||
  isMissing(body.price) ||
  parsedPrice === null ||
  !body.stock
) {
```

In `updateProduct`, before `mUpdateProduct(body, id)`, normalize:

```js
if (!isMissing(body.price)) {
  const parsedPrice = parseMoney(body.price);
  if (parsedPrice === null) {
    return custom(res, 400, "Bad request", {}, null);
  }
  body.price = parsedPrice;
}
```

- [ ] **Step 4: Normalize order money inputs**

In `src/controllers/c_orders.js`, import:

```js
const { isMissing, parseMoney } = require("../helpers/money");
```

In `addOrder`, compute:

```js
const subtotal = parseMoney(body.subtotal);
```

Replace the subtotal validation with:

```js
isMissing(body.subtotal) ||
subtotal === null ||
```

Set the insert data with:

```js
subtotal,
```

In `addDetailOrder`, compute:

```js
const price = parseMoney(req.body.price);
const total = parseMoney(req.body.total);
```

Replace detail validation with:

```js
if (
  !orderid ||
  !productid ||
  price === null ||
  !qty ||
  total === null ||
  !operator
) {
```

Keep `dataDetail` using normalized `price` and `total`.

- [ ] **Step 5: Run backend syntax check**

Run:

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos
node -c src/helpers/money.js
node -c src/controllers/c_products.js
node -c src/controllers/c_orders.js
```

Expected: no syntax errors.

- [ ] **Step 6: Commit backend normalization**

```powershell
git add src/helpers/money.js src/controllers/c_products.js src/controllers/c_orders.js
git commit -m "fix: normalize decimal money inputs"
```

## Task 3: Frontend Money Helper

**Files:**
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/helpers/price.js`

- [ ] **Step 1: Replace helper with parsing, rounding and display methods**

Use:

```js
const parsePrice = (value) => {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(String(value).replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const roundPrice = (value) => Math.round((parsePrice(value) + Number.EPSILON) * 100) / 100

const formatPrice = (value) =>
  roundPrice(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const price = {
  methods: {
    parsePrice,
    roundPrice,
    formatPrice,
    formatCurrency(value) {
      return `${formatPrice(value)} €`
    },
    conversiRp(value) {
      return formatPrice(value)
    },
  },
}

export { parsePrice, roundPrice, formatPrice }
export default price
```

- [ ] **Step 2: Verify helper behavior with a temporary Node transform**

Run:

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app
node -e "const fs=require('fs'); const s=fs.readFileSync('helpers/price.js','utf8').replace(/export \\{[^\\n]+\\}\\nexport default price\\n/,'module.exports={parsePrice,roundPrice,formatPrice}'); const m={exports:{}}; new Function('module','exports',s)(m,m.exports); console.log(m.exports.formatPrice('10,5'), m.exports.roundPrice(0.1+0.2))"
```

Expected output:

```text
10,50 0.3
```

- [ ] **Step 3: Commit frontend helper**

```powershell
git add helpers/price.js
git commit -m "fix: centralize euro price formatting"
```

## Task 4: Frontend Product and Cart Calculations

**Files:**
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/menus.vue`
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/cart.vue`
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/products/newproduct.vue`
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/products/edit/_id/index.vue`

- [ ] **Step 1: Format menu product, preview, cart and choice prices**

In `pages/menus.vue`, replace price display patterns:

```vue
{{ conversiRp(items.price) }} €
{{ conversiRp(previewItem.price) }} €
{{ itm.price }} €
```

with:

```vue
{{ formatCurrency(items.price) }}
{{ formatCurrency(previewItem.price) }}
{{ formatCurrency(itm.price) }}
```

Replace choice labels with `formatCurrency(choice.price)` inside template string expressions:

```js
choice.price > 0 ? `${choice.name} (+${this.formatCurrency(choice.price)})` : choice.name
```

- [ ] **Step 2: Round menu calculations**

In `submitFormItem`, compute:

```js
const customizationPrice = customizationList.reduce((acc, item) => {
  if (item && item.price) return this.roundPrice(acc + this.parsePrice(item.price))
  return acc
}, 0)
const price = this.roundPrice(this.parsePrice(this.selectedItem.price) + customizationPrice)
```

In `totalPrice`, use:

```js
this.total = this.cartItem.reduce((sum, el) => {
  return this.roundPrice(sum + this.parsePrice(el.subtotal))
}, 0)
this.$store.dispatch('cart/setTotal', this.total)
```

In quantity changes, use:

```js
item.subtotal = this.roundPrice(item.qty * this.parsePrice(item.price))
```

- [ ] **Step 3: Format cart page and normalize order payload**

In `pages/cart.vue`, replace:

```vue
{{ itm.price }} €
{{ conversiRp(total) }} €
```

with:

```vue
{{ formatCurrency(itm.price) }}
{{ formatCurrency(total) }}
```

In `paymentBtn`, send:

```js
subtotal: this.roundPrice(this.total),
```

For each detail line:

```js
price: this.roundPrice(e.price),
total: this.roundPrice(e.qty * this.parsePrice(e.price)),
```

- [ ] **Step 4: Normalize product form submit values**

In `pages/products/newproduct.vue`, import and use the helper mixin:

```js
import price from '@/helpers/price'
```

Set:

```js
mixins: [price],
```

Before `fd.append('price', ...)`, normalize:

```js
fd.append('price', this.roundPrice(this.formproduct.price))
```

When parsing customization choices, use:

```js
const price = this.roundPrice(match[2])
```

Repeat the same normalization in `pages/products/edit/_id/index.vue`.

- [ ] **Step 5: Run frontend lint**

Run:

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app
npm run lint
```

Expected: no lint errors from edited files.

- [ ] **Step 6: Commit frontend calculations**

```powershell
git add helpers/price.js pages/menus.vue pages/cart.vue pages/products/newproduct.vue pages/products/edit/_id/index.vue
git commit -m "fix: preserve centimes in product and cart flows"
```

## Task 5: Frontend Price Displays

**Files:**
- Modify files returned by:

```powershell
rg -n "conversiRp|\\{\\{ .*price \\}\\} €|\\{\\{ .*total \\}\\} €|\\{\\{ .*subtotal \\}\\} €" pages
```

- [ ] **Step 1: Replace direct displays**

For every display-only money expression, prefer:

```vue
{{ formatCurrency(value) }}
```

Keep `conversiRp(value) + ' €'` only if the file already relies on `conversiRp` and changing the template is risky, but ensure the helper now returns two decimals.

- [ ] **Step 2: Check files using price helper**

Any Vue file calling `formatCurrency`, `roundPrice`, or `parsePrice` must import:

```js
import price from '@/helpers/price'
```

and include:

```js
mixins: [price],
```

- [ ] **Step 3: Run search to catch missed raw prices**

Run:

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app
rg -n "\\{\\{ [^}]+\\.(price|total|subtotal) \\}\\} €|toLocaleString\\('id'\\)" pages helpers
```

Expected: no remaining direct raw money displays and no Indonesian locale formatter.

- [ ] **Step 4: Run lint and commit**

```powershell
npm run lint
git add pages helpers
git commit -m "fix: display euro prices with centimes"
```

## Task 6: Included VAT on Receipts

**Files:**
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/receip.vue`
- Modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/history/ticket/_id.vue`
- Optionally modify: `C:/Users/kalag/Desktop/projects/clone-pos/pos/pos-app/pages/orders/index.vue` if active printing there duplicates VAT totals.

- [ ] **Step 1: Import price helper into receipt files**

Add:

```js
import price from '@/helpers/price'
```

and:

```js
mixins: [price],
```

- [ ] **Step 2: Correct computed totals**

Use the same computed formulas in both receipt files:

```js
totalAmount() {
  return this.detailArchivedOrder.reduce(
    (sum, item) => this.roundPrice(sum + this.parsePrice(item.total)),
    0
  )
},
subtotalWithoutTva() {
  return this.roundPrice(this.totalAmount / 1.2)
},
tvaAmount() {
  return this.roundPrice(this.totalAmount - this.subtotalWithoutTva)
},
```

- [ ] **Step 3: Use frontend formatter**

Replace local `formatPrice` bodies with:

```js
formatPrice(value) {
  return this.formatCurrency(value)
}
```

Replace receipt labels:

```text
Sous-total :
TVA 20%    :
TOTAL TTC :
```

with:

```text
Sous-total HT :
TVA (20%)     :
TOTAL TTC     :
```

- [ ] **Step 4: Verify VAT math manually**

Run a quick expression:

```powershell
node -e "const total=22; const ht=Math.round((total/1.2+Number.EPSILON)*100)/100; const tva=Math.round((total-ht+Number.EPSILON)*100)/100; console.log(ht, tva)"
```

Expected:

```text
18.33 3.67
```

- [ ] **Step 5: Run lint and commit**

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app
npm run lint
git add pages/receip.vue pages/history/ticket/_id.vue pages/orders/index.vue
git commit -m "fix: compute included vat on receipts"
```

## Task 7: End-to-End Verification

**Files:**
- No planned code changes.

- [ ] **Step 1: Backend syntax verification**

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos
node -c src/helpers/money.js
node -c src/controllers/c_products.js
node -c src/controllers/c_orders.js
```

Expected: no syntax errors.

- [ ] **Step 2: Frontend lint**

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app
npm run lint
```

Expected: lint passes.

- [ ] **Step 3: Frontend build**

```powershell
cd C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app
npm run build-local
```

Expected: Nuxt build succeeds.

- [ ] **Step 4: Manual business scenario**

With local backend/database available:

1. Run backend migration.
2. Start backend.
3. Start frontend with `npm run dev`.
4. Create product `Test centimes` at `10,50`.
5. Add one choice at `0,50`.
6. Add quantity `2` to cart.
7. Confirm cart/order total is `22,00 €`.
8. With TVA active, confirm receipt shows `Sous-total HT 18,33 €`, `TVA (20%) 3,67 €`, `TOTAL TTC 22,00 €`.
9. With TVA inactive, confirm total still shows `22,00 €` and TVA non-applicable text remains.

- [ ] **Step 5: Final commit if verification required small fixes**

```powershell
git status --short
git add src/helpers/money.js src/controllers/c_products.js src/controllers/c_orders.js
git add helpers/price.js pages/menus.vue pages/cart.vue pages/products/newproduct.vue pages/products/edit/_id/index.vue
git add pages/receip.vue pages/history/ticket/_id.vue pages/orders/index.vue
git commit -m "fix: complete money verification fixes"
```

Run the `git add` commands from the matching repository only. Skip this commit
when `git status --short` shows no verification fixes.
