# Stripe Terminal S710 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators register Stripe S710 readers per cashier and let cashiers send aggregate table payments to their assigned reader without changing existing manual or Stripe web payments.

**Architecture:** Add an isolated server-driven Stripe Terminal subsystem in `../express-pos`, backed by location, reader, aggregate payment, and order-allocation tables. Add a focused Vuex module and extend Settings and cash-register payout in `pos-app`; Stripe web checkout remains on its current one-PaymentIntent-per-order path.

**Tech Stack:** Node.js, Express 4, Stripe Node SDK 22, MySQL/dbmate, Nuxt 2, Vue 2, Vuex, Vuetify, Node `assert` tests.

**Spec:** `docs/superpowers/specs/2026-09-26-stripe-terminal-s710-design.md`

## Global Constraints

- Use Stripe Terminal server-driven integration for S710 readers.
- Keep existing destination charges, `on_behalf_of`, connected-account transfer, and application-fee behavior.
- Do not change manual cash-register payments or Stripe Elements/QR checkout behavior.
- Determine the reader from the authenticated cashier on the server; never trust a frontend reader ID or amount.
- Store no registration code or Stripe secret in the database, response payloads, or logs.
- A reader and a cashier can each have at most one active assignment; preserve a nullable service-point assignment for future kiosks.
- Treat `payment_intent.succeeded` as the authoritative payment success event.
- Use integer cents and deterministic per-order allocations whose sum exactly equals the charged total.
- Do not add dependencies.

## Review Focus

- Two simultaneous clicks for one reader must create one Stripe charge and return the existing active session to the loser; covered in Task 4.
- Duplicate or out-of-order Terminal and PaymentIntent webhooks must finalize orders exactly once; covered in Task 5.
- Rounding a discount across several orders must allocate every cent exactly once; covered in Task 2.
- A successful payment followed by browser closure or archive failure must remain paid and must never charge again; covered in Tasks 5 and 8.
- Cross-shop, inactive-reader, inactive-cashier, and duplicate-assignment inputs must be rejected before any Stripe mutation; covered in Task 3.

---

### Task 1: Terminal Persistence Schema And Repository

**Files:**
- Create: `../express-pos/db/migrations/20260926100000_stripe_terminal.sql`
- Create: `../express-pos/src/modules/m_stripeTerminal.js`
- Create: `../express-pos/test/stripe-terminal-migration.test.js`
- Create: `../express-pos/test/stripe-terminal-module.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `buildStripeTerminalModule({ connection })` with location, reader, payment-session, allocation, locking, and reconciliation queries scoped by `shopId`.
- Produces: `findAssignedReader({ shopId, userId, forUpdate })`, `createPaymentSession(data)`, `findPaymentSession({ shopId, paymentId })`, `lockReaderAndOrders({ shopId, userId, orderIds })`, and `finalizePaymentSucceeded(data)`.

- [ ] **Step 1: Write failing migration and repository tests**

Assert that the reversible migration creates the four tables from the spec, adds `stripe_terminal_payment_id` to `orders` and `archives`, defines unique IDs and assignment indexes, and that repository SQL always scopes reader/payment/order lookup by `shopid`.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node test/stripe-terminal-migration.test.js && node test/stripe-terminal-module.test.js` from `../express-pos`.
Expected: FAIL because the migration and module do not exist.

- [ ] **Step 3: Implement the migration and repository**

Use the existing callback-to-Promise query style. `lockReaderAndOrders` must run in a caller-owned transaction, use `SELECT ... FOR UPDATE`, validate every requested order, and return `{ reader, orders, activePayment }`. `finalizePaymentSucceeded` must atomically update the session and linked orders while remaining idempotent.

- [ ] **Step 4: Run focused and backend tests**

Run: `node test/stripe-terminal-migration.test.js && node test/stripe-terminal-module.test.js && npm test`.
Expected: all pass.

- [ ] **Step 5: Commit backend persistence**

```bash
git add db/migrations/20260926100000_stripe_terminal.sql src/modules/m_stripeTerminal.js test/stripe-terminal-migration.test.js test/stripe-terminal-module.test.js package.json
git commit -m "feat: add Stripe Terminal persistence"
```

### Task 2: Terminal Amount And Stripe Parameter Domain

**Files:**
- Create: `../express-pos/src/helpers/stripeTerminal.js`
- Create: `../express-pos/test/stripe-terminal-domain.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `allocateTerminalOrderAmounts({ orders, discountType, discountValue }) -> { subtotalCents, discountCents, totalCents, allocations }`.
- Produces: `buildTerminalPaymentIntentParams({ totalCents, connectedAccountId, applicationFeeAmount, terminalPaymentId, shopId }) -> Stripe.PaymentIntentCreateParams`.
- Produces: `TERMINAL_PAYMENT_METHOD = "Carte bancaire - TPE Stripe"` and status constants.

- [ ] **Step 1: Write failing pure-domain tests**

Cover no discount, percentage discount, fixed discount, invalid/zero totals, and a three-order rounding case asserting `sum(allocations.amountCents) === totalCents`. Assert exact PaymentIntent fields: EUR, `payment_method_types: ['card_present']`, automatic capture, destination, `on_behalf_of`, fee, and metadata.

- [ ] **Step 2: Run the domain test and verify RED**

Run: `node test/stripe-terminal-domain.test.js` from `../express-pos`.
Expected: FAIL because `stripeTerminal.js` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Allocate discount proportionally using integer cents; give residual cents deterministically to allocations ordered by order ID. Reuse commission normalization from `src/helpers/stripePayment.js`, but keep Terminal parameters separate from `automatic_payment_methods` web parameters.

- [ ] **Step 4: Run focused and backend tests**

Run: `node test/stripe-terminal-domain.test.js && npm test`.
Expected: all pass.

- [ ] **Step 5: Commit the Terminal domain**

```bash
git add src/helpers/stripeTerminal.js test/stripe-terminal-domain.test.js package.json
git commit -m "feat: add Stripe Terminal payment domain"
```

### Task 3: Reader Registration And Assignment API

**Files:**
- Create: `../express-pos/src/services/stripeTerminalReaders.js`
- Create: `../express-pos/src/controllers/c_stripeTerminal.js`
- Create: `../express-pos/test/stripe-terminal-readers.test.js`
- Modify: `../express-pos/src/routers/r_stripe.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `buildStripeTerminalReaderService({ stripe, terminalStore, staffStore })` with `listReaders`, `registerReader`, `assignReader`, `setReaderActive`, `refreshReaders`, and `getCurrentReader`.
- Produces admin routes from the spec plus `GET /stripe/terminal/current-reader` for authenticated staff.
- Consumes: repository interfaces from Task 1.

- [ ] **Step 1: Write failing service/controller tests**

Test first-location creation, location reuse, one-time registration-code forwarding, S710 metadata persistence, successful cashier assignment, duplicate cashier assignment, cross-shop user, inactive user, future service-point field preservation, non-admin rejection, and inactive/current-reader responses. Assert forbidden inputs cause zero Stripe calls.

- [ ] **Step 2: Run the reader test and verify RED**

Run: `node test/stripe-terminal-readers.test.js` from `../express-pos`.
Expected: FAIL because the reader service/controller is missing.

- [ ] **Step 3: Implement reader management**

Register platform-account locations/readers without a connected-account request option. Accept `{ registrationCode, label, assignedUserId, address: { line1, postalCode, city, country: 'FR' } }`; return sanitized reader DTOs with no registration code or raw Stripe error.

- [ ] **Step 4: Run focused and backend tests**

Run: `node test/stripe-terminal-readers.test.js && npm test`.
Expected: all pass.

- [ ] **Step 5: Commit reader management**

```bash
git add src/services/stripeTerminalReaders.js src/controllers/c_stripeTerminal.js src/routers/r_stripe.js test/stripe-terminal-readers.test.js package.json
git commit -m "feat: manage Stripe Terminal readers"
```

### Task 4: Start, Poll, And Cancel Terminal Payments

**Files:**
- Create: `../express-pos/src/services/stripeTerminalPayments.js`
- Create: `../express-pos/test/stripe-terminal-payments.test.js`
- Modify: `../express-pos/src/controllers/c_stripeTerminal.js`
- Modify: `../express-pos/src/helpers/middleware/auth.js`
- Modify: `../express-pos/src/routers/r_stripe.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `buildStripeTerminalPaymentService({ stripe, terminalStore, shopStore })` with `startPayment`, `getPaymentStatus`, and `cancelPayment`.
- `startPayment({ shopId, cashierUserId, orderIds, discountType, discountValue })` returns a sanitized session DTO.
- Produces: `authorizeCashRegister = buildModuleAuthorization({ moduleKey: 'cashregister' })` on every cashier Terminal route.
- Consumes: allocation/parameter helpers from Task 2 and lock/session repository APIs from Task 1.

- [ ] **Step 1: Write failing payment lifecycle tests**

Cover aggregate amount creation, connected-account destination and fee, server-resolved reader, cash-register permission rejection, ownership and payment-state rejection, reader offline/busy, no active reader, Stripe failure cleanup, idempotent retry, and two concurrent starts producing one Stripe call and one active session.

- [ ] **Step 2: Run the payment test and verify RED**

Run: `node test/stripe-terminal-payments.test.js` from `../express-pos`.
Expected: FAIL because the payment service is missing.

- [ ] **Step 3: Implement start/status/cancel**

Create the local `creating` session before the Stripe PaymentIntent, persist its Stripe ID before calling `readers.processPaymentIntent`, and move it to `processing`. Status lookup may retrieve Stripe when local state is stale. Cancellation calls `cancelAction` first when allowed and cancels the PaymentIntent only in a cancelable state.

- [ ] **Step 4: Run focused and backend tests**

Run: `node test/stripe-terminal-payments.test.js && npm test`.
Expected: all pass.

- [ ] **Step 5: Commit payment orchestration**

```bash
git add src/services/stripeTerminalPayments.js src/controllers/c_stripeTerminal.js src/helpers/middleware/auth.js src/routers/r_stripe.js test/stripe-terminal-payments.test.js package.json
git commit -m "feat: process payments on Stripe Terminal"
```

### Task 5: Webhook Reconciliation, Archive Preservation, And Refunds

**Files:**
- Create: `../express-pos/src/services/stripeTerminalWebhooks.js`
- Create: `../express-pos/test/stripe-terminal-webhooks.test.js`
- Create: `../express-pos/test/stripe-terminal-refunds.test.js`
- Modify: `../express-pos/src/controllers/c_stripe.js`
- Modify: `../express-pos/src/controllers/c_orders.js`
- Modify: `../express-pos/src/modules/m_orders.js`
- Modify: `../express-pos/src/helpers/cashRegisterPayment.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `buildStripeTerminalWebhookHandler({ terminalStore }) -> handle(event)`.
- Produces: `refundTerminalOrder({ shopId, orderId, actorId })` as an explicit branch behind the existing refund endpoint.
- Consumes: idempotent finalization and allocation records from Task 1.

- [ ] **Step 1: Write failing reconciliation and refund tests**

Assert `payment_intent.succeeded` finalizes all linked orders once; duplicates and Terminal events arriving before/after it do not duplicate updates. Assert paid Terminal orders archive while preserving `stripe_terminal_payment_id`, a failed archive remains paid, a retry does not start payment, and per-order refund uses the allocated cents with an idempotency key.

- [ ] **Step 2: Run both tests and verify RED**

Run: `node test/stripe-terminal-webhooks.test.js && node test/stripe-terminal-refunds.test.js` from `../express-pos`.
Expected: FAIL because reconciliation branches do not exist.

- [ ] **Step 3: Implement reconciliation and compatibility branches**

Dispatch Terminal metadata events before the existing QR/web handlers. Preserve the current webhook signature verification. Extend archive/refund only when `stripe_terminal_payment_id` is present; leave all existing Stripe and manual branches byte-for-byte behaviorally equivalent.

- [ ] **Step 4: Run focused and backend tests**

Run: `node test/stripe-terminal-webhooks.test.js && node test/stripe-terminal-refunds.test.js && npm test`.
Expected: all pass.

- [ ] **Step 5: Commit reconciliation**

```bash
git add src/services/stripeTerminalWebhooks.js src/controllers/c_stripe.js src/controllers/c_orders.js src/modules/m_orders.js src/helpers/cashRegisterPayment.js test/stripe-terminal-webhooks.test.js test/stripe-terminal-refunds.test.js package.json
git commit -m "feat: reconcile Stripe Terminal payments"
```

### Task 6: Frontend Terminal Store

**Files:**
- Create: `store/stripeTerminal.js`
- Create: `helpers/stripeTerminal.js`
- Create: `test/stripe-terminal-store.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces Vuex state: `readers`, `currentReader`, `activePayment`, `loading`, `error`.
- Produces actions: `getReaders`, `registerReader`, `assignReader`, `setReaderActive`, `refreshReaders`, `getCurrentReader`, `startPayment`, `refreshPayment`, `cancelPayment`, `resetPayment`.
- Produces pure helpers `isTerminalMethod`, `isTerminalPaymentPending`, and `terminalPaymentMessage`.

- [ ] **Step 1: Write the failing store/helper contract test**

Assert exact routes and authorization usage, sanitized request payloads, normalized error fallback, stable pending/terminal statuses, and no import or mutation of `store/cart.js`.

- [ ] **Step 2: Run the frontend test and verify RED**

Run: `node test/stripe-terminal-store.test.js`.
Expected: FAIL because the module/helper does not exist.

- [ ] **Step 3: Implement the focused store and helpers**

Follow existing EasyAccess store patterns. Return DTOs or `false`, keep notifications at page-command boundaries, and keep polling timers out of Vuex state.

- [ ] **Step 4: Run focused and frontend tests**

Run: `node test/stripe-terminal-store.test.js && npm test`.
Expected: all pass.

- [ ] **Step 5: Commit the frontend data layer**

```bash
git add store/stripeTerminal.js helpers/stripeTerminal.js test/stripe-terminal-store.test.js package.json
git commit -m "feat: add Stripe Terminal frontend state"
```

### Task 7: Settings Reader Management UI

**Files:**
- Create: `components/settings/StripeTerminalReaders.vue`
- Create: `test/stripe-terminal-settings.test.js`
- Modify: `pages/settings.vue`
- Modify: `package.json`

**Interfaces:**
- Consumes: reader administration actions from Task 6 and staff list from `store/staff.js`.
- Produces: `Connecter TPE` dialog and reader list embedded below the existing Stripe Connect status.

- [ ] **Step 1: Write the failing Settings UI contract test**

Assert the button, registration-code/label/address/cashier fields, first-location defaults, active/status chips, assignment and activation actions, loading/empty/error states, admin-only rendering, and that the registration code is cleared after every attempt.

- [ ] **Step 2: Run the Settings test and verify RED**

Run: `node test/stripe-terminal-settings.test.js`.
Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the Vuetify component and page integration**

Use the existing compact Settings card style. Load readers and staff only after Stripe Connect status is ready. Disable connection until `stripeReady`; use a modal for registration and icon actions with tooltips for refresh, reassign, disable, and reactivate.

- [ ] **Step 4: Run focused tests, lint, and frontend suite**

Run: `node test/stripe-terminal-settings.test.js && npm run lint && npm test`.
Expected: tests pass and lint has zero errors; existing warnings may remain.

- [ ] **Step 5: Commit Settings management**

```bash
git add components/settings/StripeTerminalReaders.vue pages/settings.vue test/stripe-terminal-settings.test.js package.json
git commit -m "feat: connect S710 readers from settings"
```

### Task 8: Cash-Register Terminal Payment Experience

**Files:**
- Create: `components/cashregister/TerminalPaymentStatus.vue`
- Create: `test/stripe-terminal-payout.test.js`
- Modify: `pages/cashregister/payout/_id.vue`
- Modify: `helpers/cashRegister.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: current-reader/payment actions and helpers from Task 6.
- Produces: Terminal payment choice and explicit idle, starting, processing, succeeded, failed, canceled, and recovery UI states.

- [ ] **Step 1: Write the failing payout behavior test**

Assert manual methods still call the existing receipt/archive path; Terminal selection starts payment before receipt/archive; polling stops on every terminal state and component destruction; success asks for receipt then archives paid orders; failure/cancel keeps orders due; reload discovers an active session; paid-but-unarchived orders close without a second start call.

- [ ] **Step 2: Run the payout test and verify RED**

Run: `node test/stripe-terminal-payout.test.js`.
Expected: FAIL because Terminal payout states are absent.

- [ ] **Step 3: Implement the payout state machine**

Add `Carte bancaire - TPE Stripe` only when the current reader is active. Route manual selections through the untouched `requestReceiptChoice -> btnYes` path. Route Terminal selection through `startTerminalPayment`; poll by local payment ID, use a bounded interval with cleanup, and enter the existing receipt/archive flow only after `succeeded`.

- [ ] **Step 4: Run focused tests, lint, and frontend suite**

Run: `node test/stripe-terminal-payout.test.js && npm run lint && npm test`.
Expected: tests pass and lint has zero errors; existing warnings may remain.

- [ ] **Step 5: Commit the cash-register flow**

```bash
git add components/cashregister/TerminalPaymentStatus.vue pages/cashregister/payout/_id.vue helpers/cashRegister.js test/stripe-terminal-payout.test.js package.json
git commit -m "feat: send cash payments to assigned S710"
```

### Task 9: Cross-Repository Verification And Rollout Guard

**Files:**
- Create: `../express-pos/test/stripe-terminal-routes.test.js`
- Create: `test/stripe-terminal-integration.test.js`
- Modify: `../express-pos/package.json`
- Modify: `package.json`

**Interfaces:**
- Verifies all public route names and frontend/backend payload contracts from Tasks 3-8.
- Produces no new runtime API.

- [ ] **Step 1: Write failing cross-contract tests**

Assert route middleware and controller bindings, frontend route strings, start/status/cancel field names, stable error codes, `stripe_terminal` provider handling, and absence of Terminal behavior when no reader is assigned.

- [ ] **Step 2: Run cross-contract tests and verify RED where scripts are not wired**

Run: `node test/stripe-terminal-routes.test.js` from `../express-pos`, then `node test/stripe-terminal-integration.test.js` from `pos-app`.
Expected: FAIL until both package test chains include and satisfy the new contracts.

- [ ] **Step 3: Align contracts and test scripts**

Fix only mismatched names/payloads discovered by the contract tests and add every new test file to its repository's `npm test` chain. Do not add production behavior in this task.

- [ ] **Step 4: Run final verification**

Backend: `npm test` from `../express-pos`.

Frontend: `npm run lint && npm test && npm run build-local` from `pos-app`.

Expected: both test suites pass, frontend lint has zero errors, and the Nuxt local build exits 0. Validate the migration with dbmate against a disposable local database when available; if no disposable database is configured, report that verification gap explicitly.

- [ ] **Step 5: Commit contract alignment separately in each repository**

```bash
# express-pos
git add test/stripe-terminal-routes.test.js package.json
git commit -m "test: verify Stripe Terminal API contracts"

# pos-app
git add test/stripe-terminal-integration.test.js package.json
git commit -m "test: verify Stripe Terminal UI contracts"
```
