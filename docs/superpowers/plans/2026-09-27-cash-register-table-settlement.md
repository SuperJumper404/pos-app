# Cash Register Table Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an atomic, idempotent checkout for every eligible unpaid order on one table, producing one payment, one consolidated receipt, and one grouped history entry while preserving per-order refunds.

**Architecture:** Add a backend settlement aggregate that owns the grouped payment and links otherwise unchanged order archives. A dedicated service validates and locks the whole table, reuses the transactional archive primitive and existing Stripe Terminal allocation, then exposes authoritative receipt data to the Nuxt cash-register and history flows.

**Tech Stack:** Node.js, Express, mysql2, dbmate, Stripe Terminal, Nuxt 2, Vue 2, Vuex, Axios, Vuetify, SmartPrint/cloud XML, jsPDF, Node `assert` contract tests.

**Spec:** `docs/superpowers/specs/2026-09-27-cash-register-table-settlement-design.md`

## Global Constraints

- The new action is table-scoped; never combine multiple tables.
- Include only orders that were finished and unpaid when the attempt began.
- Preserve the existing selected-customer/partial checkout unchanged.
- A settlement creates one payment, one receipt, and one history row, while each order remains a separate archive and refund target.
- Settlement creation and all linked archives must commit or roll back together.
- A stable idempotency key must make retries and lost responses harmless.
- A succeeded Terminal payment must be recoverable without sending a second payment to the reader.
- Do not add a global refund action or rewrite legacy archive data.
- Do not add product dependencies; follow the existing CommonJS, Vuex and Vuetify patterns.

## Review Focus

- A duplicate idempotency key with different order IDs or payment parameters must return `409 SETTLEMENT_IDEMPOTENCY_CONFLICT`; covered in Task 3.
- A new finished order arriving after a Terminal PaymentIntent starts must not invalidate finalization of the already frozen allocation; covered in Task 3.
- A manual request that omits one currently eligible order from the table must return `409 TABLE_ORDERS_CHANGED`; covered in Task 3.
- A settlement response lost after commit must replay the stored result and must not archive or charge again; covered in Tasks 3 and 5.
- An individual refund inside a grouped settlement must remain available and must not mutate the original consolidated receipt; covered in Task 7.

---

### Task 1: Persist the settlement aggregate

**Files:**
- Create: `../express-pos/db/migrations/20260927100000_cash_register_settlements.sql`
- Create: `../express-pos/test/cash-register-settlements-migration.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: SQL table `cash_register_settlements` and nullable `archives.cash_register_settlement_id` foreign key used by Tasks 2, 3 and 7.
- Produces: unique key `(shopid, idempotency_key)` and indexes for shop/date history reads and archive membership.

- [ ] **Step 1: Write the failing migration contract test**

Create `test/cash-register-settlements-migration.test.js` asserting that the up migration defines the settlement columns from the spec, decimal money columns consistent with `archives`, the shop-scoped idempotency unique key, the archive foreign key/index, and that the down migration removes the foreign key before dropping the table.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test/cash-register-settlements-migration.test.js` from `../express-pos`.

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Add the reversible dbmate migration**

Use `cash_register_settlements.id BIGINT UNSIGNED`, `shopid`, nullable `service_point_id`, `table_reference VARCHAR(191)`, normalized `payment_method`, decimal subtotal/discount/total fields, nullable `stripe_terminal_payment_id`, `idempotency_key VARCHAR(191)`, nullable `created_by_user_id`, and microsecond timestamps. Add `archives.cash_register_settlement_id` without backfilling legacy rows.

- [ ] **Step 4: Register and run the migration test**

Add the test near the other migration contracts in `package.json`, then run:

`node test/cash-register-settlements-migration.test.js`

Expected: the contract prints its pass message and exits `0`.

- [ ] **Step 5: Commit the backend task**

```bash
git add db/migrations/20260927100000_cash_register_settlements.sql test/cash-register-settlements-migration.test.js package.json
git commit -m "feat: add cash register settlement schema"
```

### Task 2: Make order archival reusable inside a caller transaction

**Files:**
- Modify: `../express-pos/src/modules/m_orders.js`
- Modify: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Produces: `archiveOrderInTransaction({ connection, orderId, paymentMethod, shopId, discount, settlementId, lockedOrder }) -> Promise<{ archiveId, token, archive, details }>`.
- Preserves: `mArchiveOrder(id, paymentMethod, shopId, discount) -> Promise<{ affectedRows }>` and all existing controller behavior.
- Consumes: nullable `settlementId` from Task 1.

- [ ] **Step 1: Add failing archive primitive tests**

Extend the archive harness to assert that `archiveOrderInTransaction` uses the supplied connection without opening or committing a nested transaction, writes `cash_register_settlement_id`, returns the created snapshot, and restores all active/archive rows when the caller transaction rolls back. Keep the current single-order assertions unchanged.

- [ ] **Step 2: Run the focused archive contract**

Run: `node test/checkout-contract.test.js` from `../express-pos`.

Expected: FAIL because `archiveOrderInTransaction` is not exported.

- [ ] **Step 3: Extract the existing archive body**

Inside `buildOrderArchiveModule`, implement the exact interface above. Let it lock the order when `lockedOrder` is absent, preserve Terminal allocation validation and snapshot copying, add the optional settlement foreign key, and return authoritative archive/detail data. Implement `mArchiveOrder` as the existing `withTransaction` wrapper around this primitive.

- [ ] **Step 4: Run archive and payment regressions**

Run:

```bash
node test/checkout-contract.test.js
node test/stripe-payment.test.js
node test/stripe-terminal-refunds.test.js
```

Expected: all three commands exit `0`; the legacy archive return contract and Terminal refund tests remain green.

- [ ] **Step 5: Commit the backend task**

```bash
git add src/modules/m_orders.js test/checkout-contract.test.js
git commit -m "refactor: expose transactional order archival"
```

### Task 3: Create the atomic settlement domain service

**Files:**
- Create: `../express-pos/src/modules/m_cashRegisterSettlements.js`
- Create: `../express-pos/src/services/cashRegisterSettlements.js`
- Create: `../express-pos/test/cash-register-settlements.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces store factory: `buildCashRegisterSettlementModule({ connection })` with `withTransaction(work)`, `lockShop({ shopId })`, `lockOrders({ shopId, orderIds })`, `listEligibleTableOrders({ shopId, servicePointId, customerId })`, `findByIdempotencyKey({ shopId, idempotencyKey })`, `insertSettlement(data)`, `findTerminalPayment({ shopId, paymentId })`, `listTerminalAllocations({ shopId, paymentId })`, and `getSettlementReceipt({ shopId, settlementId })`.
- Produces service factory: `buildCashRegisterSettlementService({ settlementStore, archiveOrderInTransaction })`.
- Produces service methods: `createSettlement(input)` and `getSettlement({ shopId, settlementId })`.
- `createSettlement(input)` consumes `{ shopId, actorId, orderIds, paymentMethod, discountType, discountValue, idempotencyKey, terminalPaymentId }` and returns `{ id, tableReference, paymentMethod, subtotalBeforeDiscount, discountType, discountValue, discountAmount, totalAmount, terminalPaymentId, archivedOrders, vatBreakdown, idempotentReplay }`.

- [ ] **Step 1: Write the failing service tests**

Create a transaction-aware in-memory store and tests for: a successful multi-order manual settlement; deterministic order locking; proportional largest-remainder allocation with order ID tie-breaking; exact sum invariants; mixed table/shop/status rejection; manual omission of an eligible order; rollback after the second archive fails; exact idempotent replay; and conflicting reuse of a key.

- [ ] **Step 2: Add the Terminal recovery tests**

Assert that a succeeded Terminal session is accepted only when its allocations exactly match the submitted order IDs and authoritative cents; that a foreign, incomplete or unsuccessful payment is rejected; and that a newly finished order outside the already frozen allocation does not block finalization.

- [ ] **Step 3: Run the focused domain test**

Run: `node test/cash-register-settlements.test.js` from `../express-pos`.

Expected: FAIL because the module and service do not exist.

- [ ] **Step 4: Implement the store and service**

Use `DomainError` codes `SETTLEMENT_INVALID_INPUT` (400), `TABLE_ORDERS_CHANGED` (409), `SETTLEMENT_IDEMPOTENCY_CONFLICT` (409), `TERMINAL_PAYMENT_NOT_SETTLED` (409), and `SETTLEMENT_NOT_FOUND` (404). Normalize and sort unique positive order IDs, calculate all money in cents, persist decimal values only at the repository boundary, and execute parent insertion plus every `archiveOrderInTransaction` call in one `withTransaction` callback.

- [ ] **Step 5: Register and run domain regressions**

Add the test to `package.json`, then run:

```bash
node test/cash-register-settlements.test.js
node test/stripe-terminal-payments.test.js
node test/checkout-contract.test.js
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit the backend task**

```bash
git add src/modules/m_cashRegisterSettlements.js src/services/cashRegisterSettlements.js test/cash-register-settlements.test.js package.json
git commit -m "feat: add atomic table settlement service"
```

### Task 4: Expose settlement and grouped history APIs

**Files:**
- Create: `../express-pos/src/controllers/c_cashRegisterSettlements.js`
- Create: `../express-pos/src/routers/r_cashRegisterSettlements.js`
- Create: `../express-pos/test/cash-register-settlements-routes.test.js`
- Modify: `../express-pos/index.js`
- Modify: `../express-pos/src/modules/m_orders.js`
- Modify: `../express-pos/test/cash-register-settlements.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `POST /api/v1/cash-register/settlements` authenticated with the same cash-register permission used by Terminal cashier routes.
- Produces: `GET /api/v1/cash-register/settlements/:id` scoped to `req.shopid`.
- Extends: `GET /api/v1/orders/archives` rows with nullable settlement summary fields without removing legacy fields.
- Consumes: `createSettlement(input)` and `getSettlement(scope)` from Task 3.

- [ ] **Step 1: Write failing route/controller contracts**

Test authentication and cash-register authorization, integer/order-array validation, body-to-service mapping, `201` for a new settlement, `200` for an idempotent replay, sanitized domain errors, shop-scoped reads, and absence of raw SQL/Stripe details in responses.

- [ ] **Step 2: Add the grouped history query contract**

Assert that `mAllArchivedOrders(shopid)` left-joins settlements and exposes `cash_register_settlement_id`, `settlement_table_reference`, `settlement_total_amount`, `settlement_payment_method`, and `settlement_created_at`, while ungrouped legacy rows retain null settlement fields and the existing archive ordering.

- [ ] **Step 3: Run the focused API tests**

Run:

```bash
node test/cash-register-settlements-routes.test.js
node test/cash-register-settlements.test.js
node test/cash-closure.test.js
```

Expected: at least the new route test fails because the controller/router do not exist.

- [ ] **Step 4: Implement and mount the API**

Use the existing `authentication`, staff permission, and response helper patterns. Mount `r_cashRegisterSettlements` under the existing `/api/v1` prefix in `index.js`; do not change the single-order archive route.

- [ ] **Step 5: Register and run backend contracts**

Add the route test to `package.json`, then run:

```bash
node test/cash-register-settlements-routes.test.js
node test/cash-register-settlements.test.js
node test/cash-closure.test.js
node test/stripe-terminal-routes.test.js
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit the backend task**

```bash
git add src/controllers/c_cashRegisterSettlements.js src/routers/r_cashRegisterSettlements.js src/modules/m_orders.js index.js test/cash-register-settlements-routes.test.js test/cash-register-settlements.test.js package.json
git commit -m "feat: expose grouped table settlements"
```

### Task 5: Add the whole-table checkout mode to the cash register

**Files:**
- Modify: `helpers/cashRegister.js`
- Modify: `pages/cashregister/index.vue`
- Modify: `pages/cashregister/payout/_id.vue`
- Modify: `store/orders.js`
- Modify: `test/cash-register.test.js`
- Modify: `test/stripe-terminal-payout.test.js`

**Interfaces:**
- Produces helper: `buildTableSettlementCandidate(finishedOrders) -> { orderIds, dueAmount, hasEligibleOrders }`, using existing payment-status rules and excluding paid/released orders.
- Produces Vuex action: `orders/createTableSettlement(context, payload) -> Promise<{ ok, settlement?, code?, message? }>` posting to `/cash-register/settlements`.
- Route contract: `/cashregister/payout/:tableName?mode=table&orders=<ids>&settlementKey=<uuid>`; the same `settlementKey` survives query replacement and retries.
- Consumes the settlement response from Task 4 and the existing Terminal `paymentId` after success.

- [ ] **Step 1: Add failing table-candidate and page contract tests**

Assert that the helper includes all and only finished archivable unpaid orders, deduplicates numeric IDs, returns empty for paid-only tables, and that `index.vue` renders `Encaisser toute la table` independently of customer selection and routes with `mode=table`, every eligible ID, and a UUID settlement key.

- [ ] **Step 2: Add failing payout/store contracts**

Assert that table mode calls `createTableSettlement` once rather than `archiveOrdersSafely`, sends the selected payment method and global discount, passes the successful Terminal payment ID, disables submission while pending, preserves the key after a lost response, and retries archival without calling the Terminal start action again.

- [ ] **Step 3: Run the focused frontend tests**

Run:

```bash
node test/cash-register.test.js
node test/stripe-terminal-payout.test.js
```

Expected: FAIL on the missing helper/action/table-mode branches.

- [ ] **Step 4: Implement the table action and grouped finalization**

Keep the selected-customer button and legacy `btnYes` archive loop for non-table mode. In table mode, refresh orders before navigation, send one settlement request after payment choice, retain the settlement response for printing, map `TABLE_ORDERS_CHANGED` to a refresh message, and map a paid-but-unfinalized Terminal error to the existing recovery UI without clearing the attempt key or Terminal receipt orders.

- [ ] **Step 5: Run cash-register and Terminal regressions**

Run:

```bash
node test/cash-register.test.js
node test/stripe-terminal-payout.test.js
node test/stripe-terminal-store.test.js
node test/payment-status.test.js
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit the frontend task**

```bash
git add helpers/cashRegister.js pages/cashregister/index.vue pages/cashregister/payout/_id.vue store/orders.js test/cash-register.test.js test/stripe-terminal-payout.test.js
git commit -m "feat: checkout every unpaid order on a table"
```

### Task 6: Generate and print one consolidated receipt

**Files:**
- Create: `helpers/cashierSettlementReceipt.js`
- Create: `test/cash-register-settlement-receipt.test.js`
- Modify: `pages/cashregister/payout/_id.vue`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildCashierSettlementReceiptPayload(settlement, shopInfo) -> SettlementReceiptPayload`.
- Produces: `buildCashierSettlementEscPos(payload) -> string` and `buildCashierSettlementCloudXml(payload) -> string`.
- Produces: `sendCashierSettlementReceipt({ payload, smartPrint, cloudPrint }) -> Promise<PrintResult>` following the fallback/error contract of `sendCashierReceipt`.
- `SettlementReceiptPayload` contains stable ordered `orders[]`, each with order number and lines, plus global subtotal, discount, VAT groups, total and payment method.

- [ ] **Step 1: Write failing receipt helper tests**

Use a two-order fixture with customizations, mixed VAT rates and a global discount. Assert one header/table/date, one section per order in ID order, exact aggregate subtotal/discount/total, grouped VAT totals, one payment method, escaping in cloud XML, and no duplicate shop footer or review QR block.

- [ ] **Step 2: Run the receipt test**

Run: `node test/cash-register-settlement-receipt.test.js`.

Expected: FAIL because the grouped helper does not exist.

- [ ] **Step 3: Implement grouped payload and printer adapters**

Reuse formatting and transport helpers from `helpers/cashierReceipt.js` without changing its individual-order exports. Treat the backend settlement response as authoritative; do not recalculate discounts from live orders.

- [ ] **Step 4: Replace the print loop only in table mode**

In `payout/_id.vue`, call `sendCashierSettlementReceipt` once after a successful settlement when the user requested a receipt. Keep `printReceiptsForOrders` for the legacy selection flow, and let print failure leave the settlement complete with a reprint message.

- [ ] **Step 5: Register and run printing regressions**

Add the new test to `package.json`, then run:

```bash
node test/cash-register-settlement-receipt.test.js
node test/receipt-printing.test.js
node test/printing-fire-and-forget.test.js
node test/cash-register.test.js
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit the frontend task**

```bash
git add helpers/cashierSettlementReceipt.js pages/cashregister/payout/_id.vue test/cash-register-settlement-receipt.test.js package.json
git commit -m "feat: print consolidated table receipts"
```

### Task 7: Show one settlement row and a consolidated history detail

**Files:**
- Modify: `store/history.js`
- Modify: `pages/history/index.vue`
- Create: `pages/history/settlement/_id.vue`
- Create: `test/history-settlement.test.js`
- Modify: `test/history-archive-ordering.test.js`
- Modify: `test/history-ticket.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces helper/action contract in `store/history.js`: `getCashRegisterSettlement({ dispatch }, id) -> Promise<boolean>` and state getter `history/cashRegisterSettlement`.
- History normalization groups rows sharing `cash_register_settlement_id` into one display item while leaving rows with a null group ID unchanged.
- Route `/history/settlement/:id` consumes the authoritative grouped receipt returned by Task 4 and exposes links/actions for each individual archive.

- [ ] **Step 1: Write failing history normalization tests**

Assert that three linked archive rows become one `Encaissement table 12` item with the parent total/payment/date; two legacy rows remain two items; mixed grouped and legacy rows sort by settlement/archive timestamp; and no order is duplicated.

- [ ] **Step 2: Write failing detail/reprint/refund contracts**

Assert that the settlement route fetches `/cash-register/settlements/:id`, renders every archived order and line, uses the grouped receipt helper for SmartPrint/cloud/PDF reprint, links each order to its existing archive detail/refund workflow, exposes no global refund control, and does not mutate receipt totals when an order is later refunded.

- [ ] **Step 3: Run the focused history tests**

Run:

```bash
node test/history-settlement.test.js
node test/history-archive-ordering.test.js
node test/history-ticket.test.js
```

Expected: the new history test fails because grouped normalization and route do not exist; legacy tests remain useful regression guards.

- [ ] **Step 4: Implement grouped list, detail and PDF**

Follow the current history visual structure and loading/error states. Route grouped items to `/history/settlement/:id`, leave legacy items on `/history/ticket/:id`, and adapt the existing jsPDF primitives to print order sections plus authoritative global totals.

- [ ] **Step 5: Register and run history regressions**

Add the new test to `package.json`, then run:

```bash
node test/history-settlement.test.js
node test/history-archive-ordering.test.js
node test/history-ticket.test.js
node test/refund-status.test.js
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit the frontend task**

```bash
git add store/history.js pages/history/index.vue pages/history/settlement/_id.vue test/history-settlement.test.js test/history-archive-ordering.test.js test/history-ticket.test.js package.json
git commit -m "feat: add grouped settlement history"
```

### Task 8: Verify both applications and the cross-repository workflow

**Files:**
- Modify only if a verification failure identifies a defect in files already owned by Tasks 1-7.

**Interfaces:**
- Verifies the full API/UI contract from the spec; produces no new public interface.

- [ ] **Step 1: Run the complete backend suite**

Run from `../express-pos`:

```bash
npm test
```

Expected: every independent test passes. If local MySQL is unavailable, record the exact database-dependent failures separately and run all non-database settlement, archive, Terminal, route and migration tests explicitly.

- [ ] **Step 2: Run the complete frontend suite and lint**

Run from `pos-app`:

```bash
npm test
npm run lint
```

Expected: both commands exit `0`.

- [ ] **Step 3: Build the frontend**

Run: `npm run build-local` from `pos-app`.

Expected: Nuxt build exits `0` and includes the new cash-register and history settlement routes.

- [ ] **Step 4: Apply the migration and perform the manual staging matrix**

On an isolated staging database, run the migration, then verify manual cash/card and Stripe S710 checkout for a table containing eligible, paid and in-kitchen orders; one physical receipt; one history row; reprint; network-loss replay; and per-order refund access.

- [ ] **Step 5: Review the complete diffs**

Confirm that no unrelated tracked files, local `.env` files, generated chart data, `.codex-*` directories or `outputs/` content are included. Run `git diff --check` in both repositories.

- [ ] **Step 6: Commit any verification-only fixes separately**

If needed, commit narrowly in the owning repository with `fix: harden grouped table settlement`; otherwise leave both task commit series unchanged for final review.
