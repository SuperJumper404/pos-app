# Display Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins move products, categories, and tables up or down in their display order instead of relying on creation order.

**Architecture:** Persist order in the backend with `sort_order`: add it to products and categories, reuse existing `service_points.sort_order` for tables, and expose reorder endpoints accepting ordered ID arrays scoped to the authenticated shop. The Nuxt frontend renders up/down icon buttons and sends the new ordered IDs through Vuex actions, then refreshes the relevant list.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, Express, MySQL/dbmate, Node tests.

## Global Constraints

- Keep changes small and scoped to POS products, categories, and tables.
- Do not add dependencies.
- Preserve existing Vuex, Vuetify, and Express patterns.
- Backend updates must be scoped to `req.shopid`.
- Existing local user changes must not be reverted.

---

### Task 1: Backend Persistent Ordering

**Files:**
- Create: `../express-pos/db/migrations/20260815120000_display_order.sql`
- Modify: `../express-pos/src/modules/m_products.js`
- Modify: `../express-pos/src/controllers/c_products.js`
- Modify: `../express-pos/src/routers/r_products.js`
- Modify: `../express-pos/src/modules/m_category.js`
- Modify: `../express-pos/src/controllers/c_category.js`
- Modify: `../express-pos/src/routers/r_category.js`
- Modify: `../express-pos/src/modules/m_servicePoints.js`
- Modify: `../express-pos/src/controllers/c_servicePoints.js`
- Modify: `../express-pos/src/routers/r_servicePoints.js`
- Test: `../express-pos/test/display-order.test.js`

**Interfaces:**
- Produces: `mReorderProducts(shopId, ids)`, `mReorderCategories(shopId, ids)`, `reorderTablePoints({ shopId, ids })`.
- Produces routes: `PATCH /products/order`, `PATCH /categories/order`, `PATCH /service-points/tables/order`.

- [ ] **Step 1: Write failing tests**

```js
const assert = require("assert");
const { buildProductModule } = require("../src/modules/m_products");

const calls = [];
const connection = {
  query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("SELECT `id` FROM `products`")) return [[{ id: 3 }, { id: 1 }, { id: 2 }]];
    return [{ affectedRows: 1 }];
  },
};

await buildProductModule({ connection }).mReorderProducts(7, [3, 1, 2]);
assert.ok(calls.some((call) => call.sql.includes("sort_order")));
```

- [ ] **Step 2: Run failing test**

Run: `node test/display-order.test.js`
Expected: FAIL because reorder functions do not exist.

- [ ] **Step 3: Add migration and backend implementation**

Add nullable/default `sort_order` columns to `products` and `category`, backfill existing rows by `created/id`, order reads by `sort_order ASC, created ASC, id ASC`, and add scoped reorder methods that validate all IDs belong to the shop before updating positions `10, 20, 30...`.

- [ ] **Step 4: Run backend tests**

Run: `node test/display-order.test.js`
Expected: PASS.

### Task 2: Frontend Reorder Controls

**Files:**
- Modify: `store/products.js`
- Modify: `store/categories.js`
- Modify: `store/tables.js`
- Modify: `pages/products/index.vue`
- Modify: `pages/categories/index.vue`
- Modify: `pages/tables/index.vue`
- Test: `test/display-order-ui.test.js`

**Interfaces:**
- Consumes: backend routes from Task 1.
- Produces Vuex actions: `products/reorderProducts`, `categories/reorderCategories`, `tables/reorderTables`.

- [ ] **Step 1: Write failing UI/source test**

```js
const assert = require("assert");
const fs = require("fs");

const products = fs.readFileSync("pages/products/index.vue", "utf8");
assert.ok(products.includes("moveProduct"));
assert.ok(products.includes("mdi-arrow-up"));
assert.ok(products.includes("mdi-arrow-down"));
```

- [ ] **Step 2: Run failing test**

Run: `node test/display-order-ui.test.js`
Expected: FAIL because controls/actions do not exist.

- [ ] **Step 3: Add Vuex actions and buttons**

Add icon buttons next to row actions for each list. Disable the top item’s up button and bottom item’s down button, compute reordered ID arrays, send them to the matching Vuex action, refresh list, and show existing notification success/error patterns.

- [ ] **Step 4: Run frontend test**

Run: `node test/display-order-ui.test.js`
Expected: PASS.

### Task 3: Verification

**Files:**
- No new files unless lint/test requires a small correction.

**Interfaces:**
- Consumes all changes from Tasks 1 and 2.

- [ ] **Step 1: Run targeted backend tests**

Run: `node test/display-order.test.js`
Expected: PASS.

- [ ] **Step 2: Run targeted frontend tests**

Run: `node test/display-order-ui.test.js`
Expected: PASS.

- [ ] **Step 3: Run lint if Vue changes are stable**

Run: `npm run lint`
Expected: PASS or report pre-existing unrelated lint issues clearly.
