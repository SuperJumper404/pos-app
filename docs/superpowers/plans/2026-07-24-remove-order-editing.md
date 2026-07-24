# Remove Order Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the complete order-editing feature from the frontend and backend while preserving product customization steps, supplements, and images.

**Architecture:** Revert only the contiguous commits introduced for order editing in each repository. Keep the earlier product-customization history intact, preserve unrelated backend working-tree files, then verify that edit routes, UI entry points, state, helpers, tests, and the Stripe replacement migration are absent.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Vuetify, Express, MySQL migrations, Git

## Global Constraints

- Preserve all product customization, product-step, supplement, and image functionality.
- Preserve backend `README.md` changes and the untracked `express-pos.code-workspace` file.
- Do not rewrite branch history; record the removal with new revert commits.
- Do not start local servers.

---

### Task 1: Remove frontend order editing

**Files:**
- Remove: `helpers/orderEdit.js`
- Remove: `store/orderEdit.js`
- Remove: `components/orders/OrderEditBanner.vue`
- Remove: `test/order-edit.test.js`
- Restore: `pages/orders/detail/_id.vue`
- Restore: `pages/cart.vue`
- Restore: `pages/menus.vue`
- Restore: `store/orders.js`
- Restore: `store/products.js`
- Restore: `store/users.js`
- Restore: `plugins/axios.js`
- Restore: `package.json`
- Restore: `test/customizations.test.js`
- Remove: order-editing design and implementation documents introduced after commit `4875d7e`

**Interfaces:**
- Consumes: frontend commit boundary `4875d7e`
- Produces: frontend with no order-edit session, detail action, banner, or cart update flow

- [ ] **Step 1: Apply the inverse of the frontend order-editing commits without rewriting history**

```powershell
git revert --no-commit 4875d7e..HEAD
```

- [ ] **Step 2: Verify the staged removal contains no customization implementation rollback**

```powershell
git diff --name-status
git diff --check
```

Expected: only order-editing files and integrations change; `git diff --check` exits 0.

- [ ] **Step 3: Run the frontend checks**

```powershell
npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Commit the frontend removal**

```powershell
git add -A
git commit -m "revert: remove order editing"
```

### Task 2: Remove backend order editing

**Files:**
- Remove: `src/controllers/c_orderEditing.js`
- Remove: `src/modules/m_orderEditing.js`
- Remove: `src/modules/m_orderTransitions.js`
- Remove: `src/modules/m_orderQuote.js`
- Remove: `test/order-editing.test.js`
- Remove: `db/migrations/20260724220000_add_stripe_replacement_attempt.sql`
- Restore: `src/controllers/c_orders.js`
- Restore: `src/controllers/c_stripe.js`
- Restore: `src/modules/m_checkout.js`
- Restore: `src/modules/m_orders.js`
- Restore: `src/modules/m_payments.js`
- Restore: `src/routers/r_orders.js`
- Restore: `src/routers/r_stripe.js`
- Restore: `test/checkout-contract.test.js`
- Restore: `test/customization-migration.test.js`
- Restore: `test/stripe-payment.test.js`
- Restore: `package.json`

**Interfaces:**
- Consumes: backend commit boundary `80b2d58`
- Produces: backend with no order-edit read/update endpoints or Stripe payment-regeneration endpoint

- [ ] **Step 1: Apply the inverse of the backend order-editing commits without rewriting history**

```powershell
git -C ../express-pos revert --no-commit 80b2d58..HEAD
```

- [ ] **Step 2: Confirm unrelated backend files remain untouched**

```powershell
git -C ../express-pos status --short
git -C ../express-pos diff --check
```

Expected: the pre-existing `README.md` modification and `express-pos.code-workspace` remain present and uncommitted; `git diff --check` exits 0.

- [ ] **Step 3: Run the backend tests**

```powershell
npm test
```

Expected: exit 0.

- [ ] **Step 4: Commit only the backend feature removal**

```powershell
git add package.json src db/migrations test
git commit -m "revert: remove order editing"
```

### Task 3: Cross-repository verification

**Files:**
- Verify only; no additional files expected

**Interfaces:**
- Consumes: both removal commits
- Produces: evidence that customization remains and order editing is absent

- [ ] **Step 1: Search both repositories for removed order-editing contracts**

```powershell
rg "orderEdit|Modifier la commande|regenerate|c_orderEditing|m_orderEditing" . ../express-pos
```

Expected: no implementation references for order editing.

- [ ] **Step 2: Verify product customization implementation still exists**

```powershell
rg "product_step|selected_product_step_choice_ids|customization" . ../express-pos/src ../express-pos/db/migrations
```

Expected: product-step, supplement, image, and customization references remain.

- [ ] **Step 3: Inspect final repository status and recent history**

```powershell
git status --short
git log -3 --oneline
git -C ../express-pos status --short
git -C ../express-pos log -3 --oneline
```

Expected: frontend contains only this plan if not included in the removal commit; backend retains only the user's unrelated `README.md` and workspace-file changes.
