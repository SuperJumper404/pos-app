# Global Notifications And API Responses Design

## Goal

Make backend responses coherent and useful, then display consistent global toast notifications in the Nuxt POS frontend for user actions and backend failures.

## Backend Response Contract

All API helpers return JSON with the same top-level shape:

```json
{
  "code": 200,
  "success": true,
  "message": "Human readable message",
  "pagination": null,
  "data": {}
}
```

Errors use real HTTP status codes and keep a stable JSON body:

```json
{
  "code": 400,
  "success": false,
  "message": "Human readable error",
  "pagination": null,
  "data": null,
  "error": "Technical detail when available"
}
```

The existing `custom`, `success`, and `failed` helpers remain available so controllers can migrate without a broad API rewrite. `failed` will accept an optional HTTP status code and default to `500`.

## Backend Scope

Normalize the broad controller surface that currently drives the frontend:

- Users and auth middleware.
- Products.
- Categories.
- Orders and archived orders.
- Stocks.
- Shop.
- Printing.

Use `400` for invalid requests, `401` for missing or expired authentication, `403` for authenticated users without the required role, `404` for missing resources, `422` for validation/business conflicts, and `500` for unexpected server errors.

## Frontend Notification Architecture

Add a Vuex module `notifications` with actions for `success`, `error`, `warning`, `info`, `push`, `remove`, and `clear`. Add one global component in `layouts/default.vue`, so all pages can show notifications without duplicating snackbar markup.

Axios error handling in `plugins/axios.js` becomes the global safety net:

- Use backend `message` when present.
- Fall back to a local French message based on HTTP status.
- On `401`, clear local auth state, show a session-expired toast, and redirect to `/login`.
- Avoid duplicate toasts when an individual store action already handles a user-facing success message.

## Priority User Actions

Add explicit success/error notifications for the main flows:

- Register, login, logout.
- Product create/update/delete.
- Category create/update/delete.
- Order validate/finish/cancel/delete/archive.
- Cart order creation and order detail creation.
- Printing job submission.

Read-only list/detail fetches should generally not show success toasts. They may show errors through Axios/global handling.

## Validation

Run the smallest reliable checks available:

- Backend syntax check with `node --check` on modified backend files.
- Frontend lint with `npm run lint` if practical.
- Build only if lint passes or if changes affect Nuxt registration/build behavior.
