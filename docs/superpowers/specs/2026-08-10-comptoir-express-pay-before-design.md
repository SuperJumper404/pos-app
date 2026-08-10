# Comptoir Express Pay Before Design

## Goal

Add an admin counter flow that lets staff build an order quickly, take payment at the counter before sending it, print or hand over the receipt, and keep the order in the existing kitchen queue as "En attente".

## Existing Flows To Preserve

- QR client Stripe pay before order remains the Stripe checkout flow and keeps using `/stripe/payment-intents/qr-table`.
- QR client pay at counter remains a pay-after flow and keeps creating unpaid orders for later cash-register checkout.
- Existing menu, cart, customization, checkout, order list, kitchen validation, cash register, and printing logic must remain the source of truth.

## Proposed UX

Add a new admin page named "Comptoir express" in the side navigation.

The first screen is the usable ordering surface:

- Left/top area: category tabs or chips and a dense product grid for fast navigation.
- Right/bottom area: live basket with quantity controls, customer name, takeaway toggle, payment method selector, total, cancel, and "Encaisser et envoyer".
- Product customization uses the existing product customization wizard.
- After submission, the basket clears and the user stays on the express page for the next customer.

## Payment And Order State

The new counter flow submits through the existing checkout path, with a distinct payment mode for counter pay-before. Backend checkout must recognize that mode as already paid at the counter while keeping `status = 1`.

Expected order result:

- `payment`: selected counter payment method, labelled as counter pay-before.
- `payment_status`: `paid`.
- `payment_provider`: `counter`.
- `status`: `1` ("En attente").

This keeps the kitchen workflow unchanged: staff still validate the order from "En attente" to "En preparation".

## Architecture

- Add a helper for counter checkout labels and payload normalization.
- Extend backend checkout payment-mode handling only for the new counter pay-before mode.
- Add a Vuex action that wraps existing `cart/checkoutOrder` behavior for a paid counter order.
- Add an admin page that reuses product/category data, cart helpers, customization helpers, and checkout state.
- Add the page to the existing admin navigation list.

## Error Handling

- Kitchen closed blocks new express orders the same way as the existing menu/cart flow.
- Empty basket disables submit.
- Backend checkout errors reuse the existing checkout error messages.
- On success, show the standard notification and reset cart state.

## Tests

- Unit test the new counter payment helper.
- Unit test backend checkout payment status mapping for the counter pay-before payment mode.
- Add a navigation test assertion for the new admin page.
- Run the existing frontend test suite and the smallest useful backend test or targeted Node assertion available.
