# Ticket Z Cloture Caisse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Ticket Z cash closure flow: preview current period, persist a frozen closure, and show closure history in Reports.

**Architecture:** Backend owns the period calculation, aggregation, numbering, and persistence. Frontend only displays the current preview/history and asks the backend to close the current period after confirmation. Statistics remain the Ticket X equivalent.

**Tech Stack:** Express, MySQL migrations, Node assert tests, Nuxt 2, Vue 2, Vuex Easy Access, Vuetify, Axios.

## Global Constraints

- Keep changes targeted and consistent with the existing Nuxt 2/Vuetify/Vuex patterns.
- Do not add dependencies.
- Ticket Z period is from the previous `cash_closures.closed_at` for the shop until server `now`.
- If no previous Z exists, period starts at the first archived order date for the shop.
- Use archived orders as the source for V1.
- Persist payment and VAT summaries as JSON text snapshots.
- Backend must use `req.shopid`; frontend never chooses the shop.
- Empty periods must not create a Z.
- Run the smallest meaningful verification after each task.

---

## File Structure

Backend `../express-pos`:

- Create `db/migrations/20260811170000_cash_closures.sql`: table for persisted Ticket Z snapshots.
- Create `src/helpers/cashClosure.js`: pure functions for period and summary calculations.
- Create `test/cash-closure.test.js`: pure unit tests for the helper.
- Create `src/modules/m_cashClosures.js`: database reads/writes for previews, history, and close.
- Create `src/controllers/c_cashClosures.js`: Express controllers with response handling.
- Modify `src/routers/r_orders.js`: add authenticated routes under `/reports/z`.
- Modify `package.json`: include the new backend test in `npm test`.

Frontend `pos-app`:

- Create `store/cashClosures.js`: Vuex state/actions for current preview, close, history, detail.
- Create `test/cash-closures-store.test.js`: source-level store contract tests.
- Modify `pages/reports.vue`: add tabs/sections for Orders, Cloture Z, Historique Z.
- Create `test/reports-ticket-z.test.js`: source-level UI contract tests.

---

### Task 1: Backend Pure Cash Closure Calculations

**Files:**
- Create: `../express-pos/src/helpers/cashClosure.js`
- Create: `../express-pos/test/cash-closure.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `getClosurePeriodBounds({ lastClosure, archivedOrders, now })`
- Produces: `buildPaymentSummary(orders)`
- Produces: `buildVatSummary(detailRows)`
- Produces: `buildCashClosureSnapshot({ lastClosure, archivedOrders, detailRows, now })`

- [ ] **Step 1: Write the failing helper test**

Create `../express-pos/test/cash-closure.test.js`:

```js
const assert = require("assert");
const {
  buildCashClosureSnapshot,
  buildPaymentSummary,
  buildVatSummary,
  getClosurePeriodBounds,
} = require("../src/helpers/cashClosure");

const orders = [
  { id: 10, created: "2026-08-11T09:00:00.000Z", subtotal: "12.50", payment: "Carte" },
  { id: 11, created: "2026-08-11T10:00:00.000Z", subtotal: 7.5, payment: "Especes" },
  { id: 12, created: "2026-08-11T11:00:00.000Z", subtotal: null, payment: "" },
];

assert.deepStrictEqual(
  getClosurePeriodBounds({
    lastClosure: { closed_at: "2026-08-10T23:00:00.000Z" },
    archivedOrders: orders,
    now: "2026-08-11T12:00:00.000Z",
  }),
  {
    opened_at: "2026-08-10T23:00:00.000Z",
    closed_at: "2026-08-11T12:00:00.000Z",
  }
);

assert.deepStrictEqual(
  getClosurePeriodBounds({
    lastClosure: null,
    archivedOrders: orders,
    now: "2026-08-11T12:00:00.000Z",
  }),
  {
    opened_at: "2026-08-11T09:00:00.000Z",
    closed_at: "2026-08-11T12:00:00.000Z",
  }
);

assert.deepStrictEqual(buildPaymentSummary(orders), [
  { payment: "Carte", orders_count: 1, total: 12.5 },
  { payment: "Especes", orders_count: 1, total: 7.5 },
  { payment: "Autres", orders_count: 1, total: 0 },
]);

assert.deepStrictEqual(
  buildVatSummary([
    { vat_rate: "10.00", total_ht: "10.00", total_vat: "1.00", total: "11.00" },
    { vat_rate: 10, total_ht: "5.00", total_vat: "0.50", total: "5.50" },
    { vat_rate: null, total_ht: null, total_vat: null, total: "4.00" },
  ]),
  [
    { vat_rate: "10.00", total_ht: 15, total_vat: 1.5, total_ttc: 16.5 },
    { vat_rate: "Non renseignee", total_ht: 0, total_vat: 0, total_ttc: 4 },
  ]
);

assert.deepStrictEqual(
  buildCashClosureSnapshot({
    lastClosure: { closed_at: "2026-08-10T23:00:00.000Z" },
    archivedOrders: orders,
    detailRows: [{ vat_rate: "20.00", total_ht: "10.00", total_vat: "2.00", total: "12.00" }],
    now: "2026-08-11T12:00:00.000Z",
  }),
  {
    opened_at: "2026-08-10T23:00:00.000Z",
    closed_at: "2026-08-11T12:00:00.000Z",
    orders_count: 3,
    total_revenue: 20,
    payments_summary: [
      { payment: "Carte", orders_count: 1, total: 12.5 },
      { payment: "Especes", orders_count: 1, total: 7.5 },
      { payment: "Autres", orders_count: 1, total: 0 },
    ],
    vat_summary: [{ vat_rate: "20.00", total_ht: 10, total_vat: 2, total_ttc: 12 }],
  }
);

assert.deepStrictEqual(
  buildCashClosureSnapshot({
    lastClosure: null,
    archivedOrders: [],
    detailRows: [],
    now: "2026-08-11T12:00:00.000Z",
  }),
  {
    opened_at: null,
    closed_at: "2026-08-11T12:00:00.000Z",
    orders_count: 0,
    total_revenue: 0,
    payments_summary: [],
    vat_summary: [],
  }
);

console.log("cash closure helper tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run in `../express-pos`:

```bash
node test/cash-closure.test.js
```

Expected: FAIL because `../src/helpers/cashClosure` does not exist.

- [ ] **Step 3: Implement the helper**

Create `../express-pos/src/helpers/cashClosure.js`:

```js
const moneyOrZero = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const roundMoney = (value) => Number(moneyOrZero(value).toFixed(2));

const isoOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getOrderCreatedIso = (order) => isoOrNull(order && order.created);

const getClosurePeriodBounds = ({ lastClosure, archivedOrders = [], now }) => {
  const closedAt = isoOrNull(now) || new Date().toISOString();
  const previousClosedAt = isoOrNull(lastClosure && lastClosure.closed_at);
  if (previousClosedAt) {
    return { opened_at: previousClosedAt, closed_at: closedAt };
  }

  const firstArchivedOrderDate = archivedOrders
    .map(getOrderCreatedIso)
    .filter(Boolean)
    .sort()[0] || null;

  return { opened_at: firstArchivedOrderDate, closed_at: closedAt };
};

const buildPaymentSummary = (orders = []) => {
  const totals = new Map();

  orders.forEach((order) => {
    const payment = String((order && order.payment) || "").trim() || "Autres";
    const current = totals.get(payment) || { payment, orders_count: 0, total: 0 };
    current.orders_count += 1;
    current.total = roundMoney(current.total + moneyOrZero(order && order.subtotal));
    totals.set(payment, current);
  });

  return Array.from(totals.values());
};

const normalizeVatRate = (value) => {
  if (value === undefined || value === null || value === "") return "Non renseignee";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Non renseignee";
  return numeric.toFixed(2);
};

const buildVatSummary = (detailRows = []) => {
  const totals = new Map();

  detailRows.forEach((row) => {
    const vatRate = normalizeVatRate(row && row.vat_rate);
    const current = totals.get(vatRate) || {
      vat_rate: vatRate,
      total_ht: 0,
      total_vat: 0,
      total_ttc: 0,
    };
    current.total_ht = roundMoney(current.total_ht + moneyOrZero(row && row.total_ht));
    current.total_vat = roundMoney(current.total_vat + moneyOrZero(row && row.total_vat));
    current.total_ttc = roundMoney(current.total_ttc + moneyOrZero(row && row.total));
    totals.set(vatRate, current);
  });

  return Array.from(totals.values());
};

const buildCashClosureSnapshot = ({
  lastClosure,
  archivedOrders = [],
  detailRows = [],
  now,
}) => {
  const bounds = getClosurePeriodBounds({ lastClosure, archivedOrders, now });

  return {
    ...bounds,
    orders_count: archivedOrders.length,
    total_revenue: roundMoney(
      archivedOrders.reduce(
        (total, order) => total + moneyOrZero(order && order.subtotal),
        0
      )
    ),
    payments_summary: buildPaymentSummary(archivedOrders),
    vat_summary: buildVatSummary(detailRows),
  };
};

module.exports = {
  buildCashClosureSnapshot,
  buildPaymentSummary,
  buildVatSummary,
  getClosurePeriodBounds,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run in `../express-pos`:

```bash
node test/cash-closure.test.js
```

Expected: PASS and prints `cash closure helper tests passed`.

- [ ] **Step 5: Add the test to backend npm test**

Modify `../express-pos/package.json` and add this test near related order/payment tests:

```json
"test": "node test/cash-closure.test.js && ..."
```

- [ ] **Step 6: Commit**

```bash
git add src/helpers/cashClosure.js test/cash-closure.test.js package.json
git commit -m "feat: add cash closure calculations"
```

---

### Task 2: Backend Persistence, API, and Routes

**Files:**
- Create: `../express-pos/db/migrations/20260811170000_cash_closures.sql`
- Create: `../express-pos/src/modules/m_cashClosures.js`
- Create: `../express-pos/src/controllers/c_cashClosures.js`
- Modify: `../express-pos/src/routers/r_orders.js`
- Modify: `../express-pos/test/cash-closure.test.js`

**Interfaces:**
- Consumes: `buildCashClosureSnapshot({ lastClosure, archivedOrders, detailRows, now })`
- Produces: `mGetCurrentCashClosure(shopId)`
- Produces: `mCloseCurrentCashClosure({ shopId, userId })`
- Produces: `mGetCashClosures(shopId)`
- Produces: `mGetCashClosureById({ shopId, id })`

- [ ] **Step 1: Extend the failing backend test for persistence contracts**

Append to `../express-pos/test/cash-closure.test.js`:

```js
const fs = require("fs");
const path = require("path");

const migration = fs.readFileSync(
  path.join(__dirname, "../db/migrations/20260811170000_cash_closures.sql"),
  "utf8"
);
assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS `cash_closures`"));
assert.ok(migration.includes("`closure_number` INT NOT NULL"));
assert.ok(migration.includes("`payments_summary` JSON NOT NULL"));
assert.ok(migration.includes("`vat_summary` JSON NOT NULL"));

const moduleSource = fs.readFileSync(
  path.join(__dirname, "../src/modules/m_cashClosures.js"),
  "utf8"
);
assert.ok(moduleSource.includes("mGetCurrentCashClosure"));
assert.ok(moduleSource.includes("mCloseCurrentCashClosure"));
assert.ok(moduleSource.includes("FOR UPDATE"));
assert.ok(moduleSource.includes("orders_count <= 0"));
assert.ok(moduleSource.includes("La periode ne contient aucune commande a cloturer."));
assert.ok(moduleSource.includes("JSON.stringify(snapshot.payments_summary)"));
assert.ok(moduleSource.includes("JSON.stringify(snapshot.vat_summary)"));

const controllerSource = fs.readFileSync(
  path.join(__dirname, "../src/controllers/c_cashClosures.js"),
  "utf8"
);
assert.ok(controllerSource.includes("currentCashClosure"));
assert.ok(controllerSource.includes("closeCashClosure"));
assert.ok(controllerSource.includes("allCashClosures"));
assert.ok(controllerSource.includes("cashClosureById"));

const routerSource = fs.readFileSync(
  path.join(__dirname, "../src/routers/r_orders.js"),
  "utf8"
);
assert.ok(routerSource.includes('require("../controllers/c_cashClosures")'));
assert.ok(routerSource.includes('"/reports/z/current"'));
assert.ok(routerSource.includes('"/reports/z/close"'));
assert.ok(routerSource.includes('"/reports/z"'));
assert.ok(routerSource.includes('"/reports/z/:id"'));
```

- [ ] **Step 2: Run the test to verify it fails**

Run in `../express-pos`:

```bash
node test/cash-closure.test.js
```

Expected: FAIL because migration/module/controller/routes do not exist yet.

- [ ] **Step 3: Create the migration**

Create `../express-pos/db/migrations/20260811170000_cash_closures.sql`:

```sql
CREATE TABLE IF NOT EXISTS `cash_closures` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `shopid` INT NOT NULL,
  `closure_number` INT NOT NULL,
  `opened_at` DATETIME NULL,
  `closed_at` DATETIME NOT NULL,
  `closed_by_user_id` INT NULL,
  `orders_count` INT NOT NULL DEFAULT 0,
  `total_revenue` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payments_summary` JSON NOT NULL,
  `vat_summary` JSON NOT NULL,
  `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cash_closures_shop_number` (`shopid`, `closure_number`),
  KEY `idx_cash_closures_shop_closed_at` (`shopid`, `closed_at`)
);
```

- [ ] **Step 4: Create the module**

Create `../express-pos/src/modules/m_cashClosures.js`:

```js
const { conn, queryResult } = require("../config/db");
const { runInTransaction } = require("../helpers/withTransaction");
const { buildCashClosureSnapshot } = require("../helpers/cashClosure");

const parseJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const normalizeClosureRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    total_revenue: Number(row.total_revenue || 0),
    payments_summary: parseJson(row.payments_summary, []),
    vat_summary: parseJson(row.vat_summary, []),
  };
};

const getLastClosure = (shopId, connection = conn) =>
  queryResult(
    `SELECT * FROM cash_closures
     WHERE shopid = ?
     ORDER BY closed_at DESC, id DESC
     LIMIT 1`,
    [shopId],
    connection
  ).then((rows) => rows[0] || null);

const getLastClosureForUpdate = (shopId, connection) =>
  queryResult(
    `SELECT * FROM cash_closures
     WHERE shopid = ?
     ORDER BY closed_at DESC, id DESC
     LIMIT 1
     FOR UPDATE`,
    [shopId],
    connection
  ).then((rows) => rows[0] || null);

const getNextClosureNumber = (shopId, connection) =>
  queryResult(
    `SELECT COALESCE(MAX(closure_number), 0) + 1 AS next_number
     FROM cash_closures
     WHERE shopid = ?
     FOR UPDATE`,
    [shopId],
    connection
  ).then((rows) => Number(rows[0] && rows[0].next_number) || 1);

const getArchivedOrdersForPeriod = ({ shopId, openedAt, closedAt, connection = conn }) => {
  const params = [shopId];
  let dateClause = "AND archives.created <= ?";
  if (openedAt) {
    dateClause = "AND archives.created > ? AND archives.created <= ?";
    params.push(openedAt);
  }
  params.push(closedAt);

  return queryResult(
    `SELECT archives.*
     FROM archives
     WHERE archives.shopid = ?
       ${dateClause}
     ORDER BY archives.created ASC`,
    params,
    connection
  );
};

const getArchiveDetailsForOrders = ({ orderIds, connection = conn }) => {
  if (!orderIds.length) return Promise.resolve([]);
  return queryResult(
    `SELECT archivesdetail.*
     FROM archivesdetail
     WHERE archivesdetail.orderId IN (?)`,
    [orderIds],
    connection
  );
};

const buildCurrentSnapshot = async ({ shopId, now = new Date(), connection = conn }) => {
  const lastClosure = await getLastClosure(shopId, connection);
  const openedAt = lastClosure && lastClosure.closed_at ? lastClosure.closed_at : null;
  const closedAt = now;
  const archivedOrders = await getArchivedOrdersForPeriod({
    shopId,
    openedAt,
    closedAt,
    connection,
  });
  const detailRows = await getArchiveDetailsForOrders({
    orderIds: archivedOrders.map((order) => order.id),
    connection,
  });

  return buildCashClosureSnapshot({
    lastClosure,
    archivedOrders,
    detailRows,
    now: closedAt,
  });
};

const mGetCurrentCashClosure = (shopId) => buildCurrentSnapshot({ shopId });

const mCloseCurrentCashClosure = ({ shopId, userId }) =>
  runInTransaction(async (connection) => {
    await getLastClosureForUpdate(shopId, connection);
    const closureNumber = await getNextClosureNumber(shopId, connection);
    const snapshot = await buildCurrentSnapshot({
      shopId,
      now: new Date(),
      connection,
    });

    if (snapshot.orders_count <= 0) {
      const error = new Error("La periode ne contient aucune commande a cloturer.");
      error.statusCode = 400;
      throw error;
    }

    const result = await queryResult(
      `INSERT INTO cash_closures
       SET shopid = ?,
           closure_number = ?,
           opened_at = ?,
           closed_at = ?,
           closed_by_user_id = ?,
           orders_count = ?,
           total_revenue = ?,
           payments_summary = ?,
           vat_summary = ?`,
      [
        shopId,
        closureNumber,
        snapshot.opened_at ? new Date(snapshot.opened_at) : null,
        new Date(snapshot.closed_at),
        userId || null,
        snapshot.orders_count,
        snapshot.total_revenue,
        JSON.stringify(snapshot.payments_summary),
        JSON.stringify(snapshot.vat_summary),
      ],
      connection
    );

    const rows = await queryResult(
      "SELECT * FROM cash_closures WHERE id = ? AND shopid = ? LIMIT 1",
      [result.insertId, shopId],
      connection
    );
    return normalizeClosureRow(rows[0]);
  });

const mGetCashClosures = (shopId) =>
  queryResult(
    `SELECT cash_closures.*, users.username AS closed_by_name
     FROM cash_closures
     LEFT JOIN users ON users.id = cash_closures.closed_by_user_id
     WHERE cash_closures.shopid = ?
     ORDER BY cash_closures.closed_at DESC, cash_closures.id DESC`,
    [shopId]
  ).then((rows) => rows.map(normalizeClosureRow));

const mGetCashClosureById = ({ shopId, id }) =>
  queryResult(
    `SELECT cash_closures.*, users.username AS closed_by_name
     FROM cash_closures
     LEFT JOIN users ON users.id = cash_closures.closed_by_user_id
     WHERE cash_closures.shopid = ? AND cash_closures.id = ?
     LIMIT 1`,
    [shopId, id]
  ).then((rows) => normalizeClosureRow(rows[0]));

module.exports = {
  mCloseCurrentCashClosure,
  mGetCashClosureById,
  mGetCashClosures,
  mGetCurrentCashClosure,
};
```

- [ ] **Step 5: Create the controller**

Create `../express-pos/src/controllers/c_cashClosures.js`:

```js
const {
  mCloseCurrentCashClosure,
  mGetCashClosureById,
  mGetCashClosures,
  mGetCurrentCashClosure,
} = require("../modules/m_cashClosures");
const { custom } = require("../helpers/response");

exports.currentCashClosure = async (req, res) => {
  try {
    const data = await mGetCurrentCashClosure(req.shopid);
    return custom(res, 200, "Apercu Ticket Z.", null, data);
  } catch (error) {
    return custom(res, 500, "Impossible de recuperer l'apercu Ticket Z.", error.message);
  }
};

exports.closeCashClosure = async (req, res) => {
  try {
    const data = await mCloseCurrentCashClosure({
      shopId: req.shopid,
      userId: req.user && req.user.id,
    });
    return custom(res, 201, "Ticket Z cree.", null, data);
  } catch (error) {
    return custom(
      res,
      error.statusCode || 500,
      error.message || "Impossible de cloturer la caisse.",
      error.message
    );
  }
};

exports.allCashClosures = async (req, res) => {
  try {
    const data = await mGetCashClosures(req.shopid);
    return custom(res, 200, "Historique Ticket Z.", null, data);
  } catch (error) {
    return custom(res, 500, "Impossible de recuperer les Tickets Z.", error.message);
  }
};

exports.cashClosureById = async (req, res) => {
  try {
    const data = await mGetCashClosureById({
      shopId: req.shopid,
      id: req.params.id,
    });
    if (!data) return custom(res, 404, "Ticket Z introuvable.", null);
    return custom(res, 200, "Detail Ticket Z.", null, data);
  } catch (error) {
    return custom(res, 500, "Impossible de recuperer le Ticket Z.", error.message);
  }
};
```

- [ ] **Step 6: Wire routes**

Modify `../express-pos/src/routers/r_orders.js`:

```js
const cashClosures = require("../controllers/c_cashClosures");
```

Add the routes before `"/metrics"`:

```js
  .get("/reports/z/current", authentication, cashClosures.currentCashClosure)
  .post("/reports/z/close", authentication, cashClosures.closeCashClosure)
  .get("/reports/z", authentication, cashClosures.allCashClosures)
  .get("/reports/z/:id", authentication, cashClosures.cashClosureById)
```

- [ ] **Step 7: Run backend tests**

Run in `../express-pos`:

```bash
node test/cash-closure.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add db/migrations/20260811170000_cash_closures.sql src/modules/m_cashClosures.js src/controllers/c_cashClosures.js src/routers/r_orders.js test/cash-closure.test.js
git commit -m "feat: add ticket z closure api"
```

---

### Task 3: Frontend Store for Cash Closures

**Files:**
- Create: `store/cashClosures.js`
- Create: `test/cash-closures-store.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces Vuex state: `current`, `history`, `detail`, `message`
- Produces actions: `getCurrent`, `closeCurrent`, `getHistory`, `getDetail`

- [ ] **Step 1: Write the failing store source test**

Create `test/cash-closures-store.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../store/cashClosures.js'),
  'utf8'
)

assert.ok(source.includes('current: null'))
assert.ok(source.includes('history: []'))
assert.ok(source.includes('detail: null'))
assert.ok(source.includes('getCurrent'))
assert.ok(source.includes('/baseurl/api/v1/reports/z/current'))
assert.ok(source.includes('closeCurrent'))
assert.ok(source.includes('/baseurl/api/v1/reports/z/close'))
assert.ok(source.includes('getHistory'))
assert.ok(source.includes('/baseurl/api/v1/reports/z'))
assert.ok(source.includes('getDetail'))
assert.ok(source.includes('/baseurl/api/v1/reports/z/${params}'))
assert.ok(source.includes('notifications/success'))
assert.ok(source.includes('notifications/error'))

console.log('cash closures store tests passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run in `pos-app`:

```bash
node test/cash-closures-store.test.js
```

Expected: FAIL because `store/cashClosures.js` does not exist.

- [ ] **Step 3: Create the store**

Create `store/cashClosures.js`:

```js
import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

export const state = () => ({
  current: null,
  history: [],
  detail: null,
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

export const actions = {
  getCurrent({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/reports/z/current', {
        headers: authHeaders(),
      })
      .then((response) => {
        dispatch('set/current', response.data.data)
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          "Impossible de recuperer l'apercu Ticket Z."
        dispatch('set/message', message)
        dispatch('set/current', null)
        return false
      })
  },
  closeCurrent({ dispatch }) {
    return this.$axios
      .post(
        '/baseurl/api/v1/reports/z/close',
        {},
        {
          headers: authHeaders(),
        }
      )
      .then((response) => {
        dispatch('set/detail', response.data.data)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Ticket Z cree.', { root: true })
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          'Impossible de cloturer la caisse.'
        dispatch('set/message', message)
        dispatch('notifications/error', message, { root: true })
        return false
      })
  },
  getHistory({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/reports/z', {
        headers: authHeaders(),
      })
      .then((response) => {
        dispatch('set/history', response.data.data)
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          'Impossible de recuperer les Tickets Z.'
        dispatch('set/message', message)
        dispatch('set/history', [])
        return false
      })
  },
  getDetail({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/reports/z/${params}`, {
        headers: authHeaders(),
      })
      .then((response) => {
        dispatch('set/detail', response.data.data)
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          'Impossible de recuperer le Ticket Z.'
        dispatch('set/message', message)
        dispatch('set/detail', null)
        return false
      })
  },
}
```

- [ ] **Step 4: Add the test to frontend npm test**

Modify `package.json` and include:

```json
"test": "node test/cash-closures-store.test.js && ..."
```

- [ ] **Step 5: Run the store test**

Run in `pos-app`:

```bash
node test/cash-closures-store.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add store/cashClosures.js test/cash-closures-store.test.js package.json
git commit -m "feat: add ticket z store"
```

---

### Task 4: Frontend Reports Ticket Z UI

**Files:**
- Modify: `pages/reports.vue`
- Create: `test/reports-ticket-z.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes store getters: `cashClosures/current`, `cashClosures/history`, `cashClosures/detail`, `cashClosures/message`
- Consumes store actions: `cashClosures/getCurrent`, `cashClosures/closeCurrent`, `cashClosures/getHistory`, `cashClosures/getDetail`

- [ ] **Step 1: Write the failing Reports UI contract test**

Create `test/reports-ticket-z.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../pages/reports.vue'),
  'utf8'
)

assert.ok(source.includes('v-tabs'))
assert.ok(source.includes('Commandes'))
assert.ok(source.includes('Cloture Z'))
assert.ok(source.includes('Historique Z'))
assert.ok(source.includes('currentClosure'))
assert.ok(source.includes('closureHistory'))
assert.ok(source.includes('closeClosureDialog'))
assert.ok(source.includes('cashClosures/getCurrent'))
assert.ok(source.includes('cashClosures/getHistory'))
assert.ok(source.includes('cashClosures/closeCurrent'))
assert.ok(source.includes('Cloturer la caisse'))
assert.ok(source.includes('Ticket Z'))
assert.ok(source.includes('payments_summary'))
assert.ok(source.includes('vat_summary'))
assert.ok(source.includes(':disabled=\"closingClosure || !canCloseClosure\"'))

console.log('reports ticket z tests passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run in `pos-app`:

```bash
node test/reports-ticket-z.test.js
```

Expected: FAIL because `pages/reports.vue` does not contain the Z UI yet.

- [ ] **Step 3: Replace the reports page template with tabs**

Modify `pages/reports.vue`. Keep existing imports/mixins and replace the template with a Vuetify layout containing:

```vue
<template>
  <v-container>
    <v-card v-if="loadPage" outlined class="mt-5 overflow-y-auto" style="height: 350px">
      <Loading />
    </v-card>

    <v-card v-else outlined class="mt-5">
      <v-tabs v-model="activeTab" background-color="grey lighten-4">
        <v-tab class="text-none">Commandes</v-tab>
        <v-tab class="text-none">Cloture Z</v-tab>
        <v-tab class="text-none">Historique Z</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <v-tab-item>
          <!-- Move the existing search bar and order table here unchanged. -->
        </v-tab-item>

        <v-tab-item>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-card outlined>
                  <v-card-title>Ticket Z courant</v-card-title>
                  <v-card-text>
                    <div>Periode : {{ formatClosurePeriod(currentClosure) }}</div>
                    <div>Commandes : {{ currentClosure.orders_count || 0 }}</div>
                    <div>Total : {{ formatCurrency(currentClosure.total_revenue || 0) }}</div>
                  </v-card-text>
                  <v-card-actions>
                    <v-btn
                      color="primary"
                      class="text-none"
                      :loading="closingClosure"
                      :disabled="closingClosure || !canCloseClosure"
                      @click="closeClosureDialog = true"
                    >
                      Cloturer la caisse
                      <v-icon small right>mdi-lock-check</v-icon>
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card outlined>
                  <v-card-title>Paiements</v-card-title>
                  <v-simple-table dense>
                    <tbody>
                      <tr v-for="item in currentClosure.payments_summary || []" :key="item.payment">
                        <td>{{ item.payment }}</td>
                        <td class="text-right">{{ formatCurrency(item.total) }}</td>
                      </tr>
                    </tbody>
                  </v-simple-table>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card outlined>
                  <v-card-title>TVA</v-card-title>
                  <v-simple-table dense>
                    <tbody>
                      <tr v-for="item in currentClosure.vat_summary || []" :key="item.vat_rate">
                        <td>{{ item.vat_rate }}</td>
                        <td class="text-right">{{ formatCurrency(item.total_vat) }}</td>
                      </tr>
                    </tbody>
                  </v-simple-table>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-tab-item>

        <v-tab-item>
          <v-card-text>
            <v-data-table
              :headers="closureHeaders"
              :items="closureHistory"
              item-key="id"
            >
              <template #[`item.closure_number`]="{ item }">
                Ticket Z #{{ item.closure_number }}
              </template>
              <template #[`item.closed_at`]="{ item }">
                {{ formatClosureDate(item.closed_at) }}
              </template>
              <template #[`item.total_revenue`]="{ item }">
                {{ formatCurrency(item.total_revenue) }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-tab-item>
      </v-tabs-items>
    </v-card>

    <v-dialog v-model="closeClosureDialog" max-width="520">
      <v-card>
        <v-card-title>Cloturer la caisse</v-card-title>
        <v-card-text>
          Cette action va creer un Ticket Z fige pour la periode courante.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closeClosureDialog = false">
            Annuler
          </v-btn>
          <v-btn color="primary" class="text-none" :loading="closingClosure" @click="confirmCloseClosure">
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
```

Keep the original order table inside the first tab.

- [ ] **Step 4: Add script state, computed values, and methods**

Modify the `<script>` in `pages/reports.vue`:

```js
data() {
  return {
    loadPage: false,
    activeTab: 0,
    closeClosureDialog: false,
    closingClosure: false,
    closureHeaders: [
      { text: 'Numero', value: 'closure_number' },
      { text: 'Date', value: 'closed_at' },
      { text: 'Commandes', value: 'orders_count' },
      { text: 'Total', value: 'total_revenue' },
    ],
  }
},
computed: {
  dataOrders() {
    return this.$store.get('orders/dataOrders')
  },
  currentClosure() {
    return this.$store.get('cashClosures/current') || {}
  },
  closureHistory() {
    return this.$store.get('cashClosures/history') || []
  },
  canCloseClosure() {
    return Number(this.currentClosure.orders_count || 0) > 0
  },
},
mounted() {
  this.loadPage = true
  Promise.all([
    this.$store.dispatch('orders/getAllOrder'),
    this.$store.dispatch('cashClosures/getCurrent'),
    this.$store.dispatch('cashClosures/getHistory'),
  ]).finally(() => {
    this.loadPage = false
  })
},
methods: {
  searchData() {
    this.$store.dispatch('orders/getAllOrder')
  },
  formatClosureDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleString('fr-FR')
  },
  formatClosurePeriod(closure) {
    if (!closure || !closure.opened_at) return 'Aucune commande a cloturer'
    return `${this.formatClosureDate(closure.opened_at)} - ${this.formatClosureDate(closure.closed_at)}`
  },
  async confirmCloseClosure() {
    if (this.closingClosure || !this.canCloseClosure) return
    this.closingClosure = true
    const ok = await this.$store.dispatch('cashClosures/closeCurrent')
    if (ok) {
      this.closeClosureDialog = false
      await Promise.all([
        this.$store.dispatch('cashClosures/getCurrent'),
        this.$store.dispatch('cashClosures/getHistory'),
      ])
    }
    this.closingClosure = false
  },
}
```

- [ ] **Step 5: Add the UI test to frontend npm test**

Modify `package.json` and include:

```json
"test": "node test/reports-ticket-z.test.js && ..."
```

- [ ] **Step 6: Run frontend tests**

Run in `pos-app`:

```bash
node test/cash-closures-store.test.js
node test/reports-ticket-z.test.js
```

Expected: PASS.

- [ ] **Step 7: Run lint for changed frontend files**

Run in `pos-app`:

```bash
npm run lint -- --quiet
```

Expected: PASS or only unrelated pre-existing failures. If failures are in `pages/reports.vue` or `store/cashClosures.js`, fix them.

- [ ] **Step 8: Commit**

```bash
git add pages/reports.vue test/reports-ticket-z.test.js package.json
git commit -m "feat: add ticket z reports ui"
```

---

### Task 5: End-to-End Verification and Polish

**Files:**
- Review: `../express-pos/src/modules/m_cashClosures.js`
- Review: `../express-pos/src/controllers/c_cashClosures.js`
- Review: `pages/reports.vue`
- Review: `store/cashClosures.js`

**Interfaces:**
- Consumes all previous tasks.
- Produces a verified Ticket Z V1 ready for manual testing against a local database with the migration applied.

- [ ] **Step 1: Run targeted backend verification**

Run in `../express-pos`:

```bash
node test/cash-closure.test.js
```

Expected: PASS.

- [ ] **Step 2: Run targeted frontend verification**

Run in `pos-app`:

```bash
node test/cash-closures-store.test.js
node test/reports-ticket-z.test.js
```

Expected: PASS.

- [ ] **Step 3: Run broader test suites if practical**

Run in `../express-pos`:

```bash
npm test
```

Run in `pos-app`:

```bash
npm test
```

Expected: PASS. If either suite fails, record whether failures are caused by Ticket Z changes or pre-existing unrelated worktree changes.

- [ ] **Step 4: Review git diffs**

Run in both projects:

```bash
git diff --stat
git diff
```

Expected: changes are limited to Ticket Z files and intentional package test script updates.

- [ ] **Step 5: Manual smoke test**

With backend migrated and both apps running:

```bash
npm run dev
```

Open `/reports` and verify:

- Orders tab still shows the previous reports table.
- Cloture Z tab loads a current preview.
- Empty preview disables "Cloturer la caisse".
- Non-empty preview opens confirmation.
- Confirmation creates a Z and reloads history.
- Historique Z shows the created Ticket Z.

- [ ] **Step 6: Final commit if polish changes were made**

```bash
git add <changed-files>
git commit -m "chore: polish ticket z closure"
```

---

## Self-Review Notes

- Spec coverage: backend persistence, current preview, close, history, detail, frontend store, reports UI, empty-period handling, and validation are covered.
- Scope: V1 intentionally excludes cash float, manual cash counts, strict open-order blocking, advanced export, and fiscal certification.
- Type consistency: frontend store names match page usage; backend module names match controller usage and route wiring.
