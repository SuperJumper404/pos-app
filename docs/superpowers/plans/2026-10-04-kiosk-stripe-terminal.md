# Kiosk Stripe Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each kiosk accept card payments on its own assigned Stripe Terminal TPE, with correct fallback and ticket printing.

**Architecture:** Extend the existing Stripe Terminal subsystem to support service-point reader assignments beside cashier assignments. Add kiosk-only Terminal routes that resolve the reader from the authenticated kiosk service point, create the kiosk order, start the TPE payment, and settle or fall back to counter payment. Replace the kiosk Stripe web flow with this Terminal flow and add a local card-ticket print helper.

**Tech Stack:** Node.js, Express, Stripe Node SDK, MySQL/dbmate, Nuxt 2, Vue 2, Vuex, Vuetify, Node `assert` tests.

**Spec:** `docs/superpowers/specs/2026-10-04-kiosk-stripe-terminal-design.md`

## Global Constraints

- Each kiosk has its own TPE.
- A TPE can be actively assigned to either one cashier or one kiosk service point, never both.
- A TPE assigned to a kiosk is not available for cashier counter collection.
- On `/borne`, `Payer par carte` means Stripe Terminal only.
- The existing Stripe web/Elements payment panel is removed from the kiosk card path.
- If no active online reader is assigned to the kiosk, the card button remains visible but disabled with a clear message.
- Pay-at-counter kiosk orders print only the order ticket.
- Successful TPE kiosk orders print order ticket, cash receipt, and card ticket.
- Failed or canceled TPE kiosk orders remain payable at the counter and print the order ticket.
- Kitchen/order ticket printing happens only after the payment outcome is known.
- Do not add dependencies.
- Preserve existing cashier Terminal, Stripe web checkout, and manual counter behavior.

## Review Focus

- A reader assignment payload with both `assignedUserId` and `assignedServicePointId` must be rejected before Stripe or DB mutation; covered in Task 1.
- A service-point session must not access cashier Terminal routes and a staff session must not access kiosk Terminal routes; covered in Task 2.
- A double click on kiosk card payment must not create duplicate orders or duplicate Terminal PaymentIntents; covered in Task 2.
- TPE failure/cancel after order creation must preserve a counter-payable order and must not release it as a lost/hidden checkout; covered in Task 2.
- Kiosk success must print three tickets and kiosk failure/counter must print only one order ticket; covered in Task 5.

---

## File Structure

- `../express-pos/src/modules/m_stripeTerminal.js`: add reader lookup by service point and kiosk payment repository helpers.
- `../express-pos/src/services/stripeTerminalReaders.js`: validate cashier-or-kiosk assignment and active kiosk service points.
- `../express-pos/src/services/stripeTerminalKioskPayments.js`: new kiosk payment orchestration service.
- `../express-pos/src/controllers/c_stripeTerminal.js`: expose kiosk reader/payment controller methods with service-point authorization.
- `../express-pos/src/routers/r_stripe.js`: wire kiosk Terminal routes.
- `../express-pos/src/modules/m_checkout.js`: add a Terminal-prepared kiosk payment mode or minimal equivalent state needed by the service.
- `../express-pos/test/stripe-terminal-kiosk-assignment.test.js`: reader assignment contracts.
- `../express-pos/test/stripe-terminal-kiosk-payments.test.js`: kiosk payment lifecycle contracts.
- `../express-pos/test/stripe-terminal-kiosk-routes.test.js`: route and authorization contracts.
- `helpers/cardTicket.js`: build and send the short card ticket.
- `store/stripeTerminal.js`: add kiosk Terminal actions and DTO validation.
- `components/settings/StripeTerminalReaders.vue`: support assignment type and kiosk selection.
- `pages/borne.vue`: replace Stripe web card path with kiosk Terminal path and print ticket sets.
- `test/kiosk-card-ticket.test.js`: card-ticket helper contract.
- `test/stripe-terminal-kiosk-store.test.js`: frontend store route/payload contract.
- `test/stripe-terminal-settings.test.js`: extend settings UI contract.
- `test/kiosk-page.test.js`: extend kiosk card/payment/printing contract.
- `test/stripe-terminal-kiosk-integration.test.js`: cross-frontend contract.

### Task 1: Reader Assignment To Kiosks

**Files:**
- Modify: `../express-pos/src/modules/m_stripeTerminal.js`
- Modify: `../express-pos/src/services/stripeTerminalReaders.js`
- Modify: `../express-pos/src/controllers/c_stripeTerminal.js`
- Create: `../express-pos/test/stripe-terminal-kiosk-assignment.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `terminalStore.findAssignedReaderByServicePoint({ shopId, servicePointId, forUpdate = false }) -> reader|null`.
- Produces: `staffStore.findServicePointByIdAndShop({ id, shopId }) -> servicePoint|null` for reader service construction.
- Extends: `registerReader(input)` and `assignReader(input)` accept exactly one of `assignedUserId` or `assignedServicePointId`.
- Preserves: existing reader DTO fields `assignedUserId` and `assignedServicePointId`.

- [ ] **Step 1: Write the failing assignment test**

Create `../express-pos/test/stripe-terminal-kiosk-assignment.test.js` with assertions that:

- `registerReader` accepts `{ assignedServicePointId }` when the service point belongs to the shop, is active, and has `type = "kiosk"`;
- `assignReader` can move a reader from cashier assignment to kiosk assignment and clears `assigned_user_id`;
- payloads with both `assignedUserId` and `assignedServicePointId` throw `TERMINAL_INVALID_INPUT`;
- assigning to a table/click-collect/inactive/cross-shop service point throws `TERMINAL_INVALID_ASSIGNEE`;
- assigning a second active reader to the same kiosk throws `TERMINAL_ASSIGNMENT_CONFLICT`;
- `findAssignedReaderByServicePoint({ shopId, servicePointId })` SQL scopes by `shopid`, `assigned_service_point_id`, `is_active = 1`, and active `service_points`.

- [ ] **Step 2: Run the assignment test and verify RED**

Run from `../express-pos`: `node test/stripe-terminal-kiosk-assignment.test.js`

Expected: FAIL because kiosk assignment validation and lookup are missing.

- [ ] **Step 3: Implement repository and reader-service assignment support**

In `m_stripeTerminal.js`, add `findAssignedReaderByServicePoint({ shopId, servicePointId, forUpdate = false })`.

In `stripeTerminalReaders.js`, add service-point validation:

- exactly one assignment target must be present;
- staff target uses the existing active staff validation;
- kiosk target uses active service point validation with `type === "kiosk"`;
- assignment updates set the selected target and clear the other target.

In `c_stripeTerminal.js`, default `staffStore` gains `findServicePointByIdAndShop`.

- [ ] **Step 4: Run focused backend tests**

Run from `../express-pos`:

```bash
node test/stripe-terminal-kiosk-assignment.test.js
node test/stripe-terminal-readers.test.js
node test/stripe-terminal-routes.test.js
```

Expected: all PASS.

- [ ] **Step 5: Add the test to backend `npm test` and commit**

Add `node test/stripe-terminal-kiosk-assignment.test.js` near the existing Terminal reader tests in `../express-pos/package.json`.

Commit from `../express-pos`:

```bash
git add src/modules/m_stripeTerminal.js src/services/stripeTerminalReaders.js src/controllers/c_stripeTerminal.js test/stripe-terminal-kiosk-assignment.test.js package.json
git commit -m "feat: assign Stripe Terminal readers to kiosks"
```

### Task 2: Backend Kiosk Terminal Payment Lifecycle

**Files:**
- Create: `../express-pos/src/services/stripeTerminalKioskPayments.js`
- Modify: `../express-pos/src/modules/m_stripeTerminal.js`
- Modify: `../express-pos/src/modules/m_checkout.js`
- Modify: `../express-pos/src/controllers/c_stripeTerminal.js`
- Modify: `../express-pos/src/routers/r_stripe.js`
- Create: `../express-pos/test/stripe-terminal-kiosk-payments.test.js`
- Create: `../express-pos/test/stripe-terminal-kiosk-routes.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `buildStripeTerminalKioskPaymentService({ stripe, terminalStore, checkout, shopStore })`.
- Produces service methods:
  - `getCurrentReader({ shopId, servicePointId }) -> readerDto|null`
  - `startPayment({ shopId, servicePointId, checkoutPayload }) -> kioskPaymentDto`
  - `getPaymentStatus({ shopId, servicePointId, paymentId }) -> kioskPaymentDto`
  - `cancelPayment({ shopId, servicePointId, paymentId }) -> kioskPaymentDto`
- Produces DTO shape:
  - `{ id, orderId, orderNumber, readerId, status, amountCents, currency, orderIds, outcome, cardTicket }`
  - `outcome` is one of `pending`, `paid`, `counter`, `failed`, `canceled`.
- Consumes: `findAssignedReaderByServicePoint` from Task 1.

- [ ] **Step 1: Write the failing kiosk lifecycle test**

Create `../express-pos/test/stripe-terminal-kiosk-payments.test.js` with assertions that:

- `getCurrentReader` returns only an active reader assigned to the service point;
- `startPayment` creates/replays one kiosk order from checkout payload and starts one Terminal PaymentIntent on the assigned reader;
- no reader ID or amount from request input is trusted;
- a duplicate `client_order_token` returns the existing order/payment instead of creating a second PaymentIntent;
- `payment_intent.succeeded` reconciliation marks the order `paid`, `payment_provider = "stripe_terminal"`, and attaches `stripe_terminal_payment_id`;
- failed/canceled reader action leaves the order payable at counter with a counter-facing payment label;
- `cardTicket` contains only safe fields: `brand`, `last4`, `chargeId`, `terminalPaymentId`, `amountCents`.

- [ ] **Step 2: Write the failing kiosk route test**

Create `../express-pos/test/stripe-terminal-kiosk-routes.test.js` with assertions that:

- routes exist under `/stripe/terminal/kiosk`;
- kiosk routes require `req.sessionSubject === "service_point"`;
- staff sessions are rejected from kiosk routes with `TERMINAL_FORBIDDEN`;
- service-point sessions are rejected from existing cashier Terminal routes;
- route payload for `POST /kiosk/payments` forwards checkout/order payload but not reader ID.

- [ ] **Step 3: Run tests and verify RED**

Run from `../express-pos`:

```bash
node test/stripe-terminal-kiosk-payments.test.js
node test/stripe-terminal-kiosk-routes.test.js
```

Expected: FAIL because kiosk payment service and routes do not exist.

- [ ] **Step 4: Implement the kiosk payment service**

Create `src/services/stripeTerminalKioskPayments.js`.

Reuse existing helpers from `stripeTerminalPayments.js` where practical, but keep kiosk authorization and DTO construction separate. The service must:

- call checkout creation with a Terminal-prepared kiosk payment mode;
- resolve the reader by `{ shopId, servicePointId }`;
- create a Terminal session for the single kiosk order;
- poll/reconcile using the existing Terminal finalization path where possible;
- on failure/cancel, update the order to counter-payable and commit stock reservations;
- return sanitized `cardTicket` fields after success when the charge data is available.

- [ ] **Step 5: Add the minimal checkout state support**

In `m_checkout.js`, add the smallest payment mode needed for kiosk Terminal preparation, for example `stripe_terminal_kiosk`, that creates an order not ready for kitchen printing until the Terminal service finalizes it. Preserve existing `stripe`, `counter_pay_before:*`, and unpaid payment modes.

- [ ] **Step 6: Wire controller and routes**

In `c_stripeTerminal.js`, add kiosk handlers:

- `getKioskCurrentReader`
- `startKioskPayment`
- `getKioskPaymentStatus`
- `cancelKioskPayment`

In `r_stripe.js`, add:

- `GET /terminal/kiosk/current-reader`
- `POST /terminal/kiosk/payments`
- `GET /terminal/kiosk/payments/:id`
- `POST /terminal/kiosk/payments/:id/cancel`

- [ ] **Step 7: Run focused backend tests**

Run from `../express-pos`:

```bash
node test/stripe-terminal-kiosk-payments.test.js
node test/stripe-terminal-kiosk-routes.test.js
node test/stripe-terminal-payments.test.js
node test/checkout-contract.test.js
```

Expected: all PASS.

- [ ] **Step 8: Add tests to backend `npm test` and commit**

Add the two new kiosk Terminal tests near the existing Terminal tests in `../express-pos/package.json`.

Commit from `../express-pos`:

```bash
git add src/services/stripeTerminalKioskPayments.js src/modules/m_stripeTerminal.js src/modules/m_checkout.js src/controllers/c_stripeTerminal.js src/routers/r_stripe.js test/stripe-terminal-kiosk-payments.test.js test/stripe-terminal-kiosk-routes.test.js package.json
git commit -m "feat: process kiosk payments on Stripe Terminal"
```

### Task 3: Frontend Kiosk Terminal Store And Card Ticket Helper

**Files:**
- Modify: `store/stripeTerminal.js`
- Create: `helpers/cardTicket.js`
- Create: `test/stripe-terminal-kiosk-store.test.js`
- Create: `test/kiosk-card-ticket.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces Vuex actions:
  - `getKioskCurrentReader()`
  - `startKioskPayment(payload)`
  - `refreshKioskPayment(paymentId)`
  - `cancelKioskPayment(paymentId)`
- Produces helper functions:
  - `buildCardTicketPayload({ payment, order, shopInfo }) -> payload`
  - `sendCardTicket({ payload, smartPrint, printerIp, dispatch, fetchImplementation }) -> boolean`
- Consumes backend DTO from Task 2.

- [ ] **Step 1: Write the failing store contract test**

Create `test/stripe-terminal-kiosk-store.test.js` asserting:

- store source includes `/stripe/terminal/kiosk/current-reader`, `/kiosk/payments`, and `/kiosk/payments/:id/cancel`;
- `startKioskPayment` payload includes checkout fields and never includes `readerId` or `amountCents`;
- valid kiosk payment DTO requires `orderId`, `outcome`, and safe nullable `cardTicket`;
- unknown backend errors normalize to existing Terminal-safe messages.

- [ ] **Step 2: Write the failing card-ticket helper test**

Create `test/kiosk-card-ticket.test.js` asserting:

- `buildCardTicketPayload` outputs title `Ticket carte`, payment method `Carte bancaire - TPE Stripe`, order number, amount, brand, last4, charge ID, and local Terminal payment ID;
- full card numbers, raw Stripe payload fields, and secrets are not present in `JSON.stringify(buildCardTicketData(payload))`;
- `sendCardTicket` sends `ticketType: "carte"` through Smart Print and cloud print.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
node test/stripe-terminal-kiosk-store.test.js
node test/kiosk-card-ticket.test.js
```

Expected: FAIL because actions and helper do not exist.

- [ ] **Step 4: Implement kiosk store actions**

In `store/stripeTerminal.js`, add kiosk route actions using the same request config/error handling style as existing Terminal actions. Keep polling timers outside Vuex.

- [ ] **Step 5: Implement `helpers/cardTicket.js`**

Follow the patterns in `helpers/cashierReceipt.js` and `helpers/orderTicket.js`. Produce ESC/POS, cloud XML, and `ticketData` formats for a compact card ticket. Reuse no Stripe raw payload beyond the sanitized DTO fields.

- [ ] **Step 6: Run focused frontend tests**

Run:

```bash
node test/stripe-terminal-kiosk-store.test.js
node test/kiosk-card-ticket.test.js
node test/stripe-terminal-store.test.js
node test/receipt-printing.test.js
node test/printing-fire-and-forget.test.js
```

Expected: all PASS.

- [ ] **Step 7: Add tests to frontend `npm test` and commit**

Add both new test files to `package.json`.

Commit from `pos-app`:

```bash
git add store/stripeTerminal.js helpers/cardTicket.js test/stripe-terminal-kiosk-store.test.js test/kiosk-card-ticket.test.js package.json
git commit -m "feat: add kiosk Terminal frontend state"
```

### Task 4: Admin Reader UI For Kiosk Assignment

**Files:**
- Modify: `components/settings/StripeTerminalReaders.vue`
- Modify: `test/stripe-terminal-settings.test.js`

**Interfaces:**
- Consumes: reader DTOs with `assignedUserId` and `assignedServicePointId`.
- Consumes: service point list from existing service point store/actions.
- Produces: assignment type selector with values `cashier` and `kiosk`.

- [ ] **Step 1: Extend the failing Settings UI test**

Update `test/stripe-terminal-settings.test.js` to assert:

- registration dialog contains an assignment type control;
- `Caissier` mode submits `{ assignedUserId }` and no `assignedServicePointId`;
- `Borne` mode submits `{ assignedServicePointId }` and no `assignedUserId`;
- rows display kiosk assignment copy when `assignedServicePointId` is set;
- reassigning from kiosk to cashier clears kiosk assignment in the payload;
- inactive/non-kiosk service points are not selectable.

- [ ] **Step 2: Run the Settings test and verify RED**

Run: `node test/stripe-terminal-settings.test.js`

Expected: FAIL because the UI only supports cashier assignment.

- [ ] **Step 3: Implement assignment type controls**

In `StripeTerminalReaders.vue`:

- load service points alongside staff/readers;
- add assignment type selection in register and edit flows;
- filter service points to active `type === "kiosk"`;
- build payloads with exactly one assignment field;
- render assignment labels for cashier and kiosk readers.

- [ ] **Step 4: Run focused frontend tests and lint**

Run:

```bash
node test/stripe-terminal-settings.test.js
node test/stripe-terminal-integration.test.js
npm run lint -- --quiet
```

Expected: all PASS, or document pre-existing unrelated lint failures if any appear.

- [ ] **Step 5: Commit**

```bash
git add components/settings/StripeTerminalReaders.vue test/stripe-terminal-settings.test.js
git commit -m "feat: assign TPE readers to kiosks in settings"
```

### Task 5: Kiosk Page Terminal Flow And Ticket Sets

**Files:**
- Modify: `pages/borne.vue`
- Modify: `helpers/kioskCheckout.js`
- Modify: `test/kiosk-page.test.js`
- Modify: `test/kiosk-checkout.test.js`

**Interfaces:**
- Consumes: Task 3 Vuex actions and `helpers/cardTicket.js`.
- Produces page methods:
  - `loadKioskTerminalReader()`
  - `submitTerminalPayment()`
  - `pollKioskTerminalPayment(paymentId)`
  - `cancelTerminalPayment()`
  - `printKioskTicketSet({ outcome, orderId, payment })`

- [ ] **Step 1: Extend kiosk tests for Terminal-only card payment**

Update `test/kiosk-page.test.js` to assert:

- page uses `stripeTerminal/getKioskCurrentReader`, `stripeTerminal/startKioskPayment`, `stripeTerminal/refreshKioskPayment`, and `stripeTerminal/cancelKioskPayment`;
- page no longer imports `loadStripe`;
- page no longer references `stripePaymentElement`;
- `Payer par carte` remains in the template;
- disabled card copy references the unavailable TPE;
- success printing calls order ticket, cashier receipt, and card ticket helpers;
- failure/cancel printing calls only the order ticket helper.

- [ ] **Step 2: Extend kiosk checkout helper test**

Update `test/kiosk-checkout.test.js` to assert the Terminal kiosk payload uses a non-web payment marker such as `Carte bancaire - TPE Stripe` with `stripe: false` or a dedicated `terminal: true` flag chosen by implementation, and still includes `source: "borne"`.

- [ ] **Step 3: Run kiosk tests and verify RED**

Run:

```bash
node test/kiosk-page.test.js
node test/kiosk-checkout.test.js
```

Expected: FAIL because the page still uses Stripe web Elements.

- [ ] **Step 4: Replace the kiosk card flow**

In `pages/borne.vue`:

- remove Stripe web `loadStripe` import and element state from the kiosk card path;
- load kiosk current reader during page setup and after recoverable Terminal errors;
- keep the card button visible but disabled when no active online kiosk reader exists;
- call `startKioskPayment` with the kiosk checkout payload;
- show a Terminal waiting state while polling;
- on `outcome === "paid"`, finish with paid confirmation;
- on `outcome === "counter"`, `failed`, or `canceled`, finish with counter-payable confirmation;
- clean polling timers on reset, cancel, logout, and component destruction.

- [ ] **Step 5: Implement ticket-set printing**

In `pages/borne.vue`, implement `printKioskTicketSet({ outcome, orderId, payment })`:

- pay-at-counter: order ticket only;
- Terminal paid: order ticket, cash receipt, card ticket;
- Terminal failed/canceled/counter fallback: order ticket only.

Use service point printer settings first, then shop printer fallback.

- [ ] **Step 6: Run focused frontend tests**

Run:

```bash
node test/kiosk-page.test.js
node test/kiosk-checkout.test.js
node test/kiosk-card-ticket.test.js
node test/stripe-terminal-kiosk-store.test.js
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add pages/borne.vue helpers/kioskCheckout.js test/kiosk-page.test.js test/kiosk-checkout.test.js
git commit -m "feat: pay kiosk card orders on assigned TPE"
```

### Task 6: Cross-Repository Contract And Final Verification

**Files:**
- Create: `test/stripe-terminal-kiosk-integration.test.js`
- Modify: `package.json`
- Modify only defect fixes exposed by verification in prior files.

**Interfaces:**
- Verifies route strings, payload names, and ticket outcomes across frontend/backend contracts.
- Produces no new runtime API.

- [ ] **Step 1: Write the frontend cross-contract test**

Create `test/stripe-terminal-kiosk-integration.test.js` asserting:

- frontend route strings match `/baseurl/api/v1/stripe/terminal/kiosk/current-reader` and `/baseurl/api/v1/stripe/terminal/kiosk/payments`;
- `pages/borne.vue` does not contain `loadStripe` or `stripePaymentElement`;
- `pages/borne.vue` contains `sendCardTicket`, `sendCashierReceipt`, and `sendOrderTicket`;
- `store/stripeTerminal.js` does not send `readerId` or `amountCents` in kiosk start payloads;
- `package.json` includes all new kiosk Terminal frontend tests.

- [ ] **Step 2: Run cross-contract tests**

Run from `pos-app`:

```bash
node test/stripe-terminal-kiosk-integration.test.js
node test/stripe-terminal-integration.test.js
```

Run from `../express-pos`:

```bash
node test/stripe-terminal-kiosk-routes.test.js
node test/stripe-terminal-routes.test.js
```

Expected: all PASS.

- [ ] **Step 3: Add frontend cross-contract test to `npm test`**

Add `node test/stripe-terminal-kiosk-integration.test.js` near the existing Terminal integration test in `package.json`.

- [ ] **Step 4: Run final frontend verification**

Run from `pos-app`:

```bash
npm run lint
npm test
npm run build-local
```

Expected: all PASS.

- [ ] **Step 5: Run final backend verification**

Run from `../express-pos`:

```bash
npm test
```

Expected: PASS, or stop only at the known local MySQL `localhost:3307` infrastructure failure if it recurs after all Terminal-focused tests have passed.

- [ ] **Step 6: Commit contract alignment and fixes**

Commit from `pos-app`:

```bash
git add test/stripe-terminal-kiosk-integration.test.js package.json
git commit -m "test: verify kiosk Terminal UI contracts"
```

If backend package/test wiring changed after Task 2, commit from `../express-pos`:

```bash
git add package.json test/stripe-terminal-kiosk-routes.test.js
git commit -m "test: verify kiosk Terminal API contracts"
```
