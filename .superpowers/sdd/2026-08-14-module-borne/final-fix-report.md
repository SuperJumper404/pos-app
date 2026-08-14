# Module Borne Final Fix Report

## Status

DONE_WITH_CONCERNS

## Findings Addressed

1. **Service point contract:** Backend staff sessions now return the shop's active system counter as `service_point_id`. The kiosk consumes `users/user.service_point_id` only and shows a blocking configuration error when it is absent.
2. **Customization pricing and repricing:** Kiosk cart lines now use the wizard confirmation payload (`unitPrice`, normalized choice IDs, selections, and customization snapshots). `ORDER_REPRICE_REQUIRED` applies the server quote and requires an explicit payment retry.
3. **Prepared Stripe lifecycle:** Product, quantity, identity, and sale-mode controls lock while a prepared Stripe order exists. Cancel, logout, route leave, mount failure, and reset use `cart/cancelStripeCheckout`, `cart/abandonCheckout`, or `cart/completeCheckout` as appropriate.
4. **Stripe redirects:** In-session success requires `paymentIntent.status === 'succeeded'`. Redirect returns restore the persisted cart attempt and only finish after the refetched order is authoritatively `paid`; pending or missing references remain visibly unresolved.
5. **Customer order number:** Checkout refetches the created order and prefers `ordernumber`/`orderNumber` over the database ID before displaying confirmation.
6. **Payment configuration:** `qr_payment_mode` is interpreted through `isCounterPaymentAllowed` and `isStripePaymentRequired`, exposing only the configured kiosk payment flow.
7. **Availability:** Archived, hidden, out-of-stock, and customization-unavailable products are not selectable. Kitchen closure disables catalog selection and checkout.
8. **Permission protection:** `/borne` now requires the `borne` module permission for staff, while primary admins retain access and client roles are redirected to `/menus`.

## Files And Commits

### Frontend (`pos-app/.worktrees/module-borne`)

- Commit `3010e5d` (`fix: complete kiosk checkout safeguards`)
- Report-only follow-up commit contains this file.
- Changed: `helpers/kioskAccess.js`, `helpers/kioskCheckout.js`, `middleware/auth.js`, `package.json`, `pages/borne.vue`, `test/kiosk-auth-middleware.test.js`, `test/kiosk-checkout.test.js`, `test/kiosk-page.test.js`, `test/kiosk-final-fixes.test.js`, and this report.

### Backend (`express-pos`)

- Commit `379b86e` (`fix: assign counter to staff sessions`)
- Changed only: `src/modules/m_users.js`, `test/staff-login-contract.test.js`.
- Pre-existing unrelated backend modifications were not staged or committed.

## Tests Run

- Targeted frontend regression loop:
  - Command: `$tests = @('test/kiosk-staff-roles.test.js','test/kiosk-auth-middleware.test.js','test/kiosk-checkout.test.js','test/kiosk-page.test.js','test/kiosk-final-fixes.test.js','test/customizations.test.js','test/checkout-access.test.js','test/auth-middleware.test.js'); foreach ($test in $tests) { node $test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }`
  - Result: PASS, 8 scripts.
- Frontend full suite:
  - Command: `npm.cmd test`
  - Result: PASS.
- Frontend lint:
  - Command: `npm.cmd run lint -- --quiet`
  - Result: PASS, 0 errors and 136 existing warnings.
- Frontend build:
  - Command: `npm.cmd run build-local`
  - First result: timed out after 124 seconds without an emitted compile error.
  - Retry result: PASS in 50.1 seconds; Nuxt client compiled successfully. Existing Browserslist and bundle-size warnings remain.
- Targeted backend contracts:
  - Command: `node test/staff-login-contract.test.js; node test/service-point-session-auth.test.js; node test/checkout-contract.test.js`
  - Result: PASS, 3 scripts.
- Backend full suite:
  - Command: `npm.cmd test`
  - Result: PASS.

## Residual Risks And Limitations

- The current data model has no per-user or per-device service-point assignment. Staff sessions are authoritatively assigned to the shop's single active system counter; a shop that needs multiple kiosk destinations requires a future schema and administration flow.
- Redirect recovery depends on the existing persisted Vuex checkout attempt (24-hour TTL) and the order remaining available from `orders/getAllOrder`. If either reference is unavailable, the kiosk deliberately blocks a success claim and directs the customer to the counter.
- No live browser session with real staff credentials, printer hardware, or Stripe redirect payment method was available. Automated contract tests and the Nuxt build cover the implemented paths, but those external integrations still need staging validation.
