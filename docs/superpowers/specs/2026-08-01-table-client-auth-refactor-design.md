# Table Client Auth Refactor Design

## Context

The current table access flow exposes table credentials in URLs:

- `pages/tables/index.vue` builds `/login?username=<email>&password=<clearpass>` links and QR codes.
- `components/forms.vue` reads `username` and `password` query parameters and auto-submits login.
- `pages/click-and-collect/_shopId/_shopName.vue` uses the same query-string login pattern for the click-and-collect user.
- Tables are represented as `users` rows with `access === 2`.
- The backend login route compares the submitted password to `clearpass`.

This is fragile and unsafe because QR URLs leak reusable credentials through browser history, logs, screenshots, analytics, shared links, and support messages.

## Goal

Replace table QR URLs that contain email/password credentials with stable signed QR tokens, while preserving the existing table-as-user model and avoiding a database migration for this first refactor.

## Non-Goals

- Do not introduce a new table identity table.
- Do not add per-table token revocation in this refactor.
- Do not rewrite the general admin/cashier login flow.
- Do not remove `clearpass` from the database yet.
- Do not change printed QR codes automatically after they are generated.

## Chosen Approach

Use a stable signed table access token in each QR URL.

The QR URL should look like:

```text
/table-access/<signed-table-token>
```

The signed token identifies the table user without exposing its email or password. The backend verifies the token, checks the matching user still exists and is active, then returns the same kind of session payload the frontend already receives from `/login`.

The token embedded in the printed QR code must remain stable. It should not expire after a few hours, because printed QR codes cannot change. The short-lived item is the session token returned after scanning the QR.

## Token Model

### QR Token

The QR token is a signed server token generated from stable table identity data.

Minimum payload:

```json
{
  "id": 123,
  "shopid": 45,
  "access": 2,
  "purpose": "table_access"
}
```

Rules:

- The QR token must not include email or password.
- The QR token must be stable for a given table while the table id and signing key remain unchanged.
- The QR token should be signed by the backend using the existing JWT secret or a dedicated table-access secret if available.
- The QR token should either have no short expiry or a very long expiry suitable for printed QR codes.
- If the backend signing key changes, existing printed QR codes may stop working. That is acceptable for this migration-free version.

### Session Token

The backend exchanges a valid QR token for a normal frontend session token.

Rules:

- Sessions for `access === 2` must expire after 4 hours.
- Sessions for other access levels keep the current behavior unless a separate task changes them.
- When a table session expires, the frontend should clear local auth state and send the user back to scan or open the same QR URL again.
- The QR token remains unchanged and can create a fresh 4-hour table session on the next scan.

## Backend Design

Add a public endpoint dedicated to table QR access:

```text
POST /baseurl/api/v1/table-access
```

Request body:

```json
{
  "token": "<signed-table-token>"
}
```

Success response should match the existing login response shape closely enough that the frontend can reuse the same auth persistence path:

```json
{
  "data": [
    {
      "id": 123,
      "access": 2,
      "token": "<4-hour-session-jwt>",
      "shopid": 45
    }
  ],
  "message": "Connexion table reussie !"
}
```

Validation rules:

- Reject missing or invalid tokens with a 422 or 401 response.
- Reject tokens whose `purpose` is not `table_access`.
- Reject tokens whose `access` is not `2`.
- Load the user by id from the token payload.
- Reject if the user does not exist.
- Reject if the user has `status !== 1`.
- Reject if the user has `access !== 2`.
- Reject if the user `shopid` differs from the token payload.

Session JWT rules:

- For table access, sign a session JWT with `expiresIn: "4h"`.
- Include the same claims currently used by authenticated API middleware: `id`, `email`, `access`, and `shopid`.
- Update the user row with the new session token and expiry if the existing login flow requires persisted tokens.

Add a backend helper for generating table QR tokens from user records. This helper will be used by table listing responses or by the frontend if the backend exposes token generation data.

## Frontend Design

### Route

Create a route:

```text
pages/table-access/_token.vue
```

Behavior:

- Read `this.$route.params.token`.
- Dispatch a Vuex action that posts the token to `/baseurl/api/v1/table-access`.
- On success, persist auth state exactly like `users/postLogin`.
- Redirect to `/menus`.
- On failure, show a concise error and provide a way back to `/login`.

### Store

Add a Vuex action to `store/users.js`:

```js
postTableAccess({ dispatch }, token)
```

Responsibilities:

- Call `POST /baseurl/api/v1/table-access`.
- Store `idUser`, `access`, `token`, and `shopid` in `localStorage`.
- Update `users/user`.
- Set root authentication to true.
- Return `true` or `false` consistently with `postLogin`.

The duplicated auth persistence between `postLogin` and `postTableAccess` should be extracted into a small local helper inside `store/users.js`, because both actions consume the same response shape.

### Login Form

Remove automatic login from URL query credentials in `components/forms.vue`.

Specifically:

- Stop reading `this.$route.query.username`.
- Stop reading `this.$route.query.password`.
- Stop auto-submitting the login form from query parameters.

The login page should only handle human-entered login credentials.

### Table QR List

Update `pages/tables/index.vue` so QR codes and copied URLs use `/table-access/<signed-table-token>` instead of `/login?username=...&password=...`.

The page should no longer display a table password as the QR login mechanism. It may still display table identity information already returned by the API, but it must not encourage copying a password-based login URL.

If the backend adds a `table_access_token` field to table users, the frontend should use that field. If the backend returns a ready-to-use `table_access_url`, the frontend should prefer that and avoid reconstructing URL internals.

### Click And Collect

`pages/click-and-collect/_shopId/_shopName.vue` currently builds a login URL with the click-and-collect table email and clear password.

This refactor should remove that pattern too if the backend can provide a signed access token for the `access === 3` click-and-collect user. If access `3` is not ready for the new route, keep it out of scope and leave a visible follow-up note in the plan rather than mixing access rules.

## Middleware And Expiry Behavior

The frontend already clears auth state on auth errors through the Axios plugin. The implementation should verify that a 4-hour expired table session triggers the same cleanup path.

Expected behavior:

- Customer scans QR.
- Frontend exchanges stable QR token for a 4-hour access `2` session.
- Customer uses `/menus`, `/cart`, order detail routes allowed for table users.
- After 4 hours, API calls using the expired session fail auth.
- Frontend clears local auth state.
- Customer can scan or reopen the same QR URL to get a fresh 4-hour session.

The existing `middleware/auth.js` access check currently uses:

```js
store.state.users.user.access === 2 &&
store.state.users.user.access === 3
```

That condition can never be true for one user. The implementation plan should include a targeted fix so table/client users are restricted with the intended OR-style logic.

## Security Trade-Offs

This approach removes credentials from URLs but does not provide per-table revocation without changing the QR token or adding backend state.

Accepted trade-offs:

- Printed QR tokens remain stable.
- A leaked QR token can create table sessions until the signing key changes or a later revocation system is added.
- The 4-hour session limit reduces the impact of a leaked session token, not a leaked QR token.

Future hardening:

- Add a database-backed QR token or token version per table.
- Add per-table QR rotation and revocation.
- Stop storing clear passwords.
- Switch normal login password validation back to bcrypt comparison.

## Testing Strategy

Frontend tests should cover:

- Building table access URLs without email or password.
- `postTableAccess` persists auth state like `postLogin`.
- Login form no longer auto-submits query credential parameters.
- Access middleware correctly restricts access `2` and access `3` routes.

Backend tests should cover:

- Valid table QR token returns a 4-hour session.
- Invalid signature is rejected.
- Wrong purpose is rejected.
- Non-table access is rejected.
- Missing, inactive, or mismatched shop user is rejected.
- Existing `/login` behavior for admin/cashier remains unchanged except for any explicitly planned session-duration helper.

## Open Decisions

- Whether click-and-collect `access === 3` should use the same `/table-access` endpoint now or a separate follow-up route.
- Whether the QR token is generated dynamically in `/users` responses or stored/generated at table creation time. For this migration-free version, dynamic generation from user id/shop id is preferred.
