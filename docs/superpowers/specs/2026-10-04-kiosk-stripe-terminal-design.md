# Kiosk Stripe Terminal Payment Design

## Goal

Let each kiosk accept card payments on its own assigned Stripe Terminal TPE.
The kiosk keeps the existing pay-at-counter option, but the card option uses
only the physical Stripe Terminal reader, not the Stripe web/Elements flow.

When the kiosk customer pays at the counter, SmartEat prints only the order
ticket. When the kiosk customer pays by card and the TPE succeeds, SmartEat
prints the order ticket, the cash receipt, and a short card ticket on the same
printer configured for the kiosk. If the TPE payment fails or is canceled, the
order remains payable at the counter and SmartEat prints the order ticket.

## Validated Decisions

- Each kiosk has its own TPE.
- A TPE can be actively assigned to either one cashier or one kiosk service
  point, never both.
- A TPE assigned to a kiosk is not available for cashier counter collection.
- On `/borne`, `Payer par carte` means Stripe Terminal only.
- The existing Stripe web/Elements payment panel is removed from the kiosk
  card path.
- If no active online reader is assigned to the kiosk, the card button remains
  visible but disabled with a clear message.
- Pay-at-counter kiosk orders print only the order ticket.
- Successful TPE kiosk orders print order ticket, cash receipt, and card ticket.
- Failed or canceled TPE kiosk orders remain payable at the counter and print
  the order ticket.
- Kitchen/order ticket printing happens only after the payment outcome is known:
  success, failure, or cancellation.

## Existing Context

The project already has two relevant subsystems:

- A kiosk page at `pages/borne.vue`, using the logged-in service point session
  as the physical kiosk identity.
- A Stripe Terminal subsystem that registers readers, stores
  `assigned_user_id` and `assigned_service_point_id`, starts payments for a
  cashier-assigned reader, reconciles `payment_intent.succeeded`, and preserves
  Terminal payment data for receipts and refunds.

The Terminal schema already reserves `assigned_service_point_id`. This feature
turns that reserved field into a first-class assignment target for kiosks.

## Architecture

Add a dedicated kiosk Terminal orchestration path instead of reusing the
cashier payout flow directly.

The kiosk flow creates or reuses a kiosk checkout order, resolves the active TPE
from the authenticated service point session, starts a Stripe Terminal payment,
and then finalizes the order based on the Terminal outcome.

The cashier Terminal flow remains scoped to cashier accounts and continues to
resolve readers from `assigned_user_id`. The kiosk flow resolves readers from
`assigned_service_point_id`.

## Reader Assignment

Reader assignment becomes polymorphic:

- `assignedUserId`: active staff/cashier assignment.
- `assignedServicePointId`: active kiosk assignment.

Exactly one target is allowed. Backend validation rejects payloads containing
both assignment fields or neither. The database check already prevents a reader
from having both fields populated, and unique active assignment indexes prevent
two active readers being assigned to the same target.

The admin reader UI shows the assignment type:

- `Caissier`: select an active staff account.
- `Borne`: select an active service point whose type is `kiosk`.

Reader list rows show labels such as `Affecte a : Caissier Lina` or
`Affecte a : Borne 1`.

## Backend API

### Admin Routes

Extend existing routes:

- `POST /stripe/terminal/readers`
- `PATCH /stripe/terminal/readers/:id/assignment`
- `GET /stripe/terminal/readers`
- `POST /stripe/terminal/readers/refresh`

Reader creation and reassignment accept exactly one of:

- `assignedUserId`
- `assignedServicePointId`

The sanitized reader DTO continues returning both nullable fields so existing
frontend contracts stay stable.

### Kiosk Routes

Add kiosk-specific Terminal routes:

- `GET /stripe/terminal/kiosk/current-reader`
- `POST /stripe/terminal/kiosk/payments`
- `GET /stripe/terminal/kiosk/payments/:id`
- `POST /stripe/terminal/kiosk/payments/:id/cancel`

These routes require `req.sessionSubject === "service_point"`. They reject
staff browser sessions, cashier sessions, and unauthenticated sessions.

The kiosk never sends a reader ID or trusted amount. The backend resolves:

- `shopId` from auth;
- `servicePointId` from the kiosk session;
- reader from active `assigned_service_point_id`;
- amount and order lines from server-side checkout/product data.

## Kiosk Payment Lifecycle

1. The customer chooses products, service mode, name, phone, and payment method.
2. For `Payer au comptoir`, the existing kiosk checkout creates a counter-payable
   order and the frontend prints the order ticket.
3. For `Payer par carte`, the kiosk calls the kiosk Terminal payment route.
4. The backend creates or replays the kiosk order using the existing checkout
   quote, idempotency, customization, stock, and service point rules.
5. The backend resolves the active reader assigned to the kiosk service point.
6. The backend creates a Terminal payment session and hands its PaymentIntent to
   the reader.
7. The kiosk locks its UI and shows a waiting state such as
   `Presentez votre carte sur le terminal`.
8. The kiosk polls the local payment session. Stripe webhooks remain the
   authoritative source for financial success.
9. On success, the order is marked `paid` with
   `payment_provider = "stripe_terminal"` and the Terminal payment reference.
10. On failure or cancellation, the order stays or becomes payable at the
    counter with a counter-facing payment label.
11. The frontend prints the required tickets for the final outcome.

## Order State Rules

Kiosk Terminal orders need a clear intermediate state so the kitchen does not
receive a ticket while payment is still uncertain.

The backend should avoid treating a just-started TPE order as ready for kitchen
printing until one of these terminal outcomes occurs:

- success: order becomes paid by Stripe Terminal;
- failed/canceled: order becomes payable at the counter.

The implementation can do this by using a dedicated Terminal-prepared payment
state or by extending the existing `requires_payment` semantics with a Terminal
provider branch. The implementation plan must choose the smallest change that
preserves existing Stripe web order behavior.

## Frontend Kiosk UX

On `/borne`:

- `Payer au comptoir` remains available when counter payment is configured.
- `Payer par carte` is shown when card payment is configured, but disabled if
  no active online TPE is assigned to this kiosk.
- Stripe web/Elements mounting is removed from the kiosk card path.
- During Terminal payment, product selection, cart edits, and navigation are
  locked.
- The customer sees a payment-in-progress screen naming the TPE or instructing
  them to use the terminal.
- Success shows the existing confirmation style with the order number.
- Failure/cancellation shows a confirmation that the order must be paid at the
  counter.

The kiosk loads its current reader with the new kiosk current-reader route, not
the cashier current-reader route.

## Printing

All kiosk tickets use the kiosk printer configuration:

- service point Smart Print/IP when present;
- shop Smart Print/IP fallback when the service point has no printer config;
- existing cloud print fallback when Smart Print is not enabled.

Printing never changes payment or order state. If printing fails, the kiosk
shows an unavailable-ticket message but does not roll back the order or payment.

### Pay At Counter

Print one order ticket through the existing order-ticket helper.

### TPE Success

Print three jobs in sequence:

1. Order ticket through the existing order-ticket helper.
2. Cash receipt through the existing cashier receipt helper.
3. Card ticket through a new focused card-ticket helper.

### TPE Failure Or Cancellation

Print one order ticket through the existing order-ticket helper, with the order
payable at the counter.

## Card Ticket

The card ticket is generated by SmartEat and printed on the same printer as the
cash receipt. It does not rely on the TPE printing its own receipt.

The helper should include only safe, receipt-oriented data:

- shop name;
- date;
- order number;
- amount;
- `Carte bancaire - TPE Stripe`;
- card brand when available;
- card last four digits when available;
- local Terminal payment ID and/or Stripe charge ID;
- `Paiement accepte`.

Stripe charge objects expose receipt and payment method details, including
`receipt_url` and `payment_method_details`, which can be used server-side or in
the sanitized payment DTO when available:
https://docs.stripe.com/api/charges/object

The card ticket must not expose secret keys, full PAN, raw Stripe errors, or
unbounded Stripe payloads.

## Error Handling

- No assigned reader: disable the card button and show card payment unavailable.
- Reader offline: disable the card button when known; if it goes offline after
  click, the payment route returns a safe Terminal error and the order becomes
  payable at the counter if it was already created.
- Reader busy: disable or reject with a safe retryable message.
- Payment failed/canceled: preserve the kiosk order as pay-at-counter and print
  the order ticket.
- Webhook success after a browser reload remains authoritative and marks the
  order paid.
- Double click or reload must not create duplicate orders or duplicate Terminal
  PaymentIntents.
- If a local HTTP request times out but Stripe later succeeds, reconciliation
  must recover and print the paid outcome when the kiosk reloads or polls.

## Security

- Admin reader management remains admin-only.
- Kiosk Terminal routes are service-point-session-only.
- Cashier Terminal routes remain staff-session-only.
- The frontend never sends reader ID, amount cents, connected account ID, fee,
  or trusted order state.
- The backend validates shop ownership for service point, reader, order, and
  Terminal payment.
- Stripe webhook signatures stay mandatory.
- Registration codes and raw Stripe errors are never persisted or returned.

## Backend Changes

- Extend reader service validation to accept kiosk service point assignments.
- Add service point lookup for active kiosk points in reader assignment.
- Add repository lookup for active reader by service point.
- Add kiosk Terminal service/controller methods for current reader, start,
  status, and cancel.
- Add order finalization/fallback behavior for Terminal success, failure, and
  cancellation.
- Add sanitized card receipt metadata to the kiosk payment status DTO when
  available.
- Preserve all existing cashier Terminal and Stripe web behavior.

## Frontend Changes

- Extend `store/stripeTerminal.js` or add focused kiosk actions for the kiosk
  routes.
- Extend `components/settings/StripeTerminalReaders.vue` to support assignment
  type and kiosk selection.
- Update `pages/borne.vue` to remove Stripe web Elements from card payment and
  call the kiosk Terminal flow.
- Add a card-ticket helper beside `helpers/cashierReceipt.js` and
  `helpers/orderTicket.js`.
- Update kiosk printing orchestration to print the correct ticket set for each
  outcome.

## Verification

Backend tests:

- reader can be assigned to a kiosk service point;
- reader cannot be assigned to both cashier and kiosk;
- duplicate active kiosk assignment is rejected;
- kiosk current-reader route requires a service point session;
- kiosk payment resolves reader from service point, not from request body;
- TPE success marks the order paid with `stripe_terminal`;
- TPE failure/cancel leaves the order payable at counter;
- double click/replay does not create duplicate orders or payments;
- cashier Terminal and Stripe web checkout regressions still pass.

Frontend tests:

- admin reader UI exposes cashier/kiosk assignment modes;
- kiosk card button disables when no active online reader exists;
- kiosk card path does not mount Stripe web Elements;
- kiosk card path starts, polls, and cancels Terminal payments through kiosk
  routes;
- pay-at-counter prints one order ticket;
- successful TPE prints order ticket, cash receipt, and card ticket;
- failed/canceled TPE prints one order ticket.

Final verification:

- frontend targeted tests;
- `npm run lint`;
- frontend `npm test`;
- frontend `npm run build-local`;
- backend targeted Terminal and checkout tests;
- backend `npm test`, noting any known local MySQL infrastructure gap if it
  recurs.

## Rollout

1. Deploy backend support while no kiosk TPE assignment exists.
2. Deploy admin reader assignment UI.
3. Assign one test kiosk to one test TPE.
4. Validate pay-at-counter, TPE success, TPE failure, cancellation, reload
   recovery, and all ticket outputs.
5. Assign remaining kiosks one by one.
