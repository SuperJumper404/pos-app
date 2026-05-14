# Global Notifications API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize API error responses and add global toast notifications across the POS frontend.

**Architecture:** Keep the backend helper API stable while correcting HTTP status behavior and response shape. Add a small frontend Vuex notification module plus a single layout-mounted notification component, then wire the main mutation actions to explicit success toasts.

**Tech Stack:** Express, Nuxt 2, Vue 2, Vuex Easy Access, Vuetify, Axios.

---

## File Structure

- `../express-pos/src/helpers/response.js`: canonical API response helper.
- `../express-pos/src/helpers/middleware/auth.js`: JSON auth/role failures with correct status codes.
- `../express-pos/src/controllers/*.js`: replace missing/incorrect HTTP codes for main controllers.
- `store/notifications.js`: global notification queue.
- `components/AppNotifications.vue`: Vuetify snackbar renderer.
- `layouts/default.vue`: mount global notification renderer.
- `plugins/axios.js`: global backend error handling and auth cleanup.
- Existing frontend stores: explicit success/error notifications for priority actions.

## Tasks

### Task 1: Backend Response Contract

- [ ] Update `src/helpers/response.js` so `custom`, `success`, and `failed` return a stable `success` flag and set HTTP status codes.
- [ ] Update auth middleware to return JSON for expired tokens and use `403` for role denials.
- [ ] Fix controller calls that pass a message string where `custom` expects a numeric code.
- [ ] Convert broad unexpected errors to `failed(res, message, error.message, 500)`.

### Task 2: Frontend Notification Foundation

- [ ] Create `store/notifications.js` with queue actions and easy-access mutations.
- [ ] Create `components/AppNotifications.vue` using `v-snackbar` and Vuetify colors.
- [ ] Mount `<AppNotifications />` once in `layouts/default.vue`.
- [ ] Update `plugins/axios.js` to show backend error messages globally and clear auth on `401`.

### Task 3: Priority Action Notifications

- [ ] Wire user store actions for register/login/logout.
- [ ] Wire product and category create/update/delete actions.
- [ ] Wire order status/delete/archive actions.
- [ ] Wire cart order actions and printing submission.

### Task 4: Verification

- [ ] Run backend syntax checks for modified backend files.
- [ ] Run frontend lint.
- [ ] Summarize any existing unrelated lint failures without hiding them.
