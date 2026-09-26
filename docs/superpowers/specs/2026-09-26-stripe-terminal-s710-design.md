# Stripe Terminal S710 Design

## Goal

Add Stripe Terminal S710 support to SmartEat without changing the existing
Stripe web checkout or manual cash-register payment flows.

An administrator can register multiple S710 readers from Settings and assign
each active reader to one cashier account. The data model also supports a
future assignment to kiosk service points. When a cashier selects
`Carte bancaire - TPE Stripe` and clicks `Encaisser`, SmartEat sends the
server-calculated amount to that cashier's reader. Orders are marked paid only
after Stripe confirms the PaymentIntent.

## Existing Constraints

- SmartEat already creates Express connected accounts and uses destination
  charges with `on_behalf_of`, `transfer_data.destination`, and an application
  fee.
- The cash-register payout can settle several orders in one operation and can
  apply a global discount distributed across those orders.
- Manual payment methods archive orders immediately today.
- Existing Stripe web payments use one PaymentIntent per order and must remain
  unchanged.
- Cashier identities are `users` records authenticated through the staff login.
- Kiosks are represented by `service_points` and can be supported later without
  changing the reader schema.

## Chosen Architecture

Use a Stripe Terminal server-driven integration. Readers, locations, and
Terminal PaymentIntents are created on the SmartEat platform account. Payments
remain destination charges to the restaurant's existing connected account.

The Terminal code is isolated from the existing QR/web Stripe flow. It reuses
shared amount and commission rules where appropriate, but has its own state
machine, persistence, routes, and tests.

## Data Model

### `stripe_terminal_locations`

One location per restaurant:

- `id`
- `shopid` (unique)
- `stripe_location_id` (unique)
- `display_name`
- `address_line1`
- `postal_code`
- `city`
- `country` (initially `FR`)
- timestamps

The first reader registration creates the Stripe location. Later readers reuse
it. Administrators can update the stored address through the connection dialog;
the backend synchronizes the Stripe Location before registering a new reader.

### `stripe_terminal_readers`

- `id`
- `shopid`
- `terminal_location_id`
- `stripe_reader_id` (unique)
- `serial_number`
- `device_type`
- `label`
- `status`
- `assigned_user_id` nullable
- `assigned_service_point_id` nullable
- `is_active`
- timestamps

Exactly one assignment target is allowed. The first release writes
`assigned_user_id`; `assigned_service_point_id` is reserved for the later kiosk
integration. Active assignments are one-to-one: a reader has one target and a
cashier has at most one active reader.

### `stripe_terminal_payments`

Represents one customer card presentation, which can settle multiple orders:

- `id`
- `shopid`
- `terminal_reader_id`
- `cashier_user_id`
- `stripe_payment_intent_id` (unique)
- `stripe_charge_id` nullable
- `idempotency_key` (unique)
- `amount_cents`
- `application_fee_amount`
- `currency`
- `discount_type` and `discount_value`
- `status`: `creating`, `processing`, `succeeded`, `failed`, `canceled`
- failure code/message
- timestamps

### `stripe_terminal_payment_orders`

Links an aggregate Terminal payment to each order:

- `terminal_payment_id`
- `order_id`
- `amount_cents` allocated to the order after discount
- unique pair `(terminal_payment_id, order_id)`

The allocation makes partial, per-order refunds deterministic even though one
PaymentIntent paid several orders.

Orders and archives receive a nullable `stripe_terminal_payment_id`. Terminal
payments do not reuse the existing one-PaymentIntent-per-order payment record,
which prevents changing assumptions in the QR/web Stripe reconciliation code.

## Reader Registration And Management

The Stripe Connect section in Settings gains a `Connecter TPE` button and a
reader list.

The connection dialog asks for:

- the one-time registration code shown by the S710;
- a reader label;
- the cashier account to assign;
- address, postal code, and city when creating or updating the restaurant
  Terminal location.

Only administrators can register, reassign, reactivate, or deactivate readers.
The registration code is sent once to the backend and is never persisted or
returned. Deactivation is local and preserves the Stripe reader registration so
it can be reactivated or reassigned without factory-resetting the device.

The list displays label, serial number, device type, Stripe status, assignment,
and active state. Reader refreshes query Stripe server-side and update the local
status without exposing Stripe credentials.

## Cash-Register Flow

The existing manual methods remain unchanged. A dedicated
`Carte bancaire - TPE Stripe` choice is available only when:

- Stripe Connect charges are enabled for the restaurant;
- the authenticated cashier has an active assigned reader;
- the reader is available for a new action.

On `Encaisser`:

1. The frontend sends order IDs and discount inputs, never a trusted amount or
   reader ID.
2. The backend authenticates the cashier, resolves their assigned reader, and
   locks the reader and selected orders.
3. The backend reloads eligible orders, validates shop ownership and payment
   state, recalculates discounts, total, allocations, and commission, and
   rejects empty or already-paid selections.
4. It creates a Terminal payment record and a destination-charge PaymentIntent
   with `payment_method_types: ['card_present']`, EUR, automatic capture,
   `on_behalf_of`, `transfer_data.destination`, and `application_fee_amount`.
5. It calls `processPaymentIntent` for the assigned S710 and changes the local
   session to `processing`.
6. The frontend switches the payout dialog to a stable waiting state showing
   the reader label and amount. It polls the local payment status as a fallback
   to real-time webhook processing.
7. `payment_intent.succeeded` is the authoritative financial success event.
   In one database transaction, the backend finalizes the Terminal payment and
   marks every linked order paid with provider `stripe_terminal`.
8. The frontend offers receipt printing and runs the existing archive flow.
   Archive logic preserves the confirmed Terminal payment data.

If the browser closes, webhook processing still marks the orders paid. They stay
visible as paid and can be closed later without creating another charge. If
archiving partially fails, retries archive only the remaining paid orders.

## API Surface

Administrative routes:

- `GET /stripe/terminal/readers`
- `POST /stripe/terminal/readers`
- `PATCH /stripe/terminal/readers/:id/assignment`
- `PATCH /stripe/terminal/readers/:id/status`
- `POST /stripe/terminal/readers/refresh`

Cashier routes:

- `GET /stripe/terminal/current-reader`
- `POST /stripe/terminal/payments`
- `GET /stripe/terminal/payments/:id`
- `POST /stripe/terminal/payments/:id/cancel`

All reader and payment lookup queries include `shopid`. The payment creation
route resolves the reader from the authenticated user and never accepts a
frontend-selected reader ID.

## State And Error Handling

- A transaction and reader row lock prevent concurrent payment creation.
- Local and Stripe idempotency keys prevent double charges after retries.
- Only one `creating` or `processing` payment is allowed per reader.
- `terminal.reader.action_succeeded`, `action_failed`, and `action_updated`
  update operational state and diagnostics.
- `payment_intent.succeeded`, `payment_failed`, and `canceled` determine the
  financial state. Webhook handlers are idempotent.
- A declined card keeps the same PaymentIntent reusable when Stripe allows it.
- Cancellation calls `cancel_action` when possible and then cancels the
  PaymentIntent if it is still cancelable. Authorization-in-progress errors are
  shown as a wait state, not treated as cancellation success.
- Reader busy, offline, timeout, ownership mismatch, invalid order state, and
  delayed webhook conditions return stable application error codes.
- A status check retrieves Stripe state server-side when local state is still
  processing, then applies the same idempotent reconciliation path.

## Refunds

The existing refund entry point gains a Terminal branch. It uses the order's
allocation from `stripe_terminal_payment_orders` and creates a partial refund on
the aggregate PaymentIntent. Repeated refund requests use an idempotency key per
order and refund generation. Existing QR/web Stripe refunds remain unchanged.

## Security

- Reader management requires administrator access.
- Payment creation requires an authenticated staff user with cash-register
  permission.
- Shop, cashier, reader, connected account, and every order are checked for the
  same tenant.
- Amounts, discounts, fees, assignments, and payment state are authoritative on
  the server.
- Stripe webhook signatures remain mandatory.
- Secret keys, registration codes, and raw Stripe errors are never exposed to
  the browser or logs.

## Frontend Changes

- Extend the Stripe Connect card in `pages/settings.vue` with reader management.
- Add a focused Vuex module or actions for reader administration and Terminal
  payment status; do not add Terminal state to the cart Stripe Elements flow.
- Extend `pages/cashregister/payout/_id.vue` with the Terminal method and
  explicit waiting, success, failure, cancellation, and recovery states.
- Preserve all existing manual payment and receipt behavior when Terminal is not
  selected.

## Backend Changes

- Add reversible database migrations for locations, readers, payment sessions,
  order allocations, and order/archive references.
- Add a dedicated Terminal controller/service/module instead of expanding the
  already large web-payment controller.
- Add Terminal routes under the existing Stripe router.
- Extend webhook dispatch with isolated Terminal handlers.
- Extend archive and refund behavior only through explicit
  `stripe_terminal_payment_id` branches.

## Verification

Automated coverage includes:

- migrations and query ownership filters;
- reader registration, duplicate assignment, reactivation, and permissions;
- amount, discount allocation, application fee, and idempotency calculations;
- multiple orders paid by one PaymentIntent;
- reader busy/offline, refusal, cancellation, timeout, and delayed webhook;
- duplicate and out-of-order webhook delivery;
- browser closure and payment success followed by archive failure;
- partial refund allocation;
- frontend Settings and payout state contracts;
- regression coverage for manual cash-register payments and Stripe web checkout.

Stripe simulated readers are used for integration testing. Automated tests never
start live payments.

## Rollout

1. Deploy migrations and backend routes with no reader configured. Existing
   behavior remains unchanged.
2. Deploy the Settings reader-management UI.
3. Register and test one S710 in Stripe test mode with a test cashier.
4. Enable the Terminal payment option only for cashiers with an active reader.
5. Validate a live low-value payment, cancellation, refusal, receipt, archive,
   and refund before registering the remaining readers.
