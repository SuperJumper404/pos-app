# Staff PIN Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff sign in at the POS with a generated global ID and a four-digit PIN, while admins retain e-mail and password login.

**Architecture:** Add nullable credential columns on `users`, generate IDs in a dedicated backend helper, and extend the existing login endpoint with an ID/PIN branch. The Staff page creates and resets credentials; the login form lets a person select staff or admin access.

**Tech Stack:** Express 4, MySQL/dbmate, bcrypt, jsonwebtoken, Nuxt 2, Vue 2, Vuetify, Vuex Easy Access, Node assert tests.

## Global Constraints

- `staff_login_id` has six uppercase characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` and is globally unique.
- `staff_pin_hash` contains a bcrypt hash of exactly four decimal digits; no PIN is stored or returned.
- Staff roles are access `0`, `1`, `4`, and `5`; accounts `2` and `3` never receive these credentials.
- Staff e-mail is optional and can be duplicated.
- E-mail/password login remains for active admins only. ID/PIN works for every active staff role.
- Keep the user-requested UI-only module access policy; do not add route authorization beyond existing authentication.
- New source and UI copy use ASCII.

---

### Task 1: Schema and credential helper

**Files:**
- Create: `../express-pos/db/migrations/20260811130000_staff_login_credentials.sql`
- Create: `../express-pos/src/helpers/staffCredentials.js`
- Create: `../express-pos/test/staff-credentials.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Export `createStaffLoginId()`, `normalizeStaffLoginId(value)`, `isValidStaffPin(value)`, `hashStaffPin(pin)`, and `verifyStaffPin(pin, hash)`.
- Add `users.staff_login_id`, `users.staff_pin_hash`, and index `users_staff_login_id_unique`.

- [ ] **Step 1: Write the failing test**
Create `test/staff-credentials.test.js`. It imports the helper, asserts generated IDs match `/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/`, asserts `normalizeStaffLoginId(' ab-cd2 ') === 'ABCD2'`, and accepts only four decimal PIN digits. It reads the migration and requires both nullable columns and the unique index.

- [ ] **Step 2: Run the test to verify it fails**
Run `node test/staff-credentials.test.js` in `../express-pos`.
Expected: FAIL because the helper and migration do not exist.

- [ ] **Step 3: Add the migration**
Create the up migration: `ALTER TABLE users ADD COLUMN staff_login_id VARCHAR(6) NULL, ADD COLUMN staff_pin_hash VARCHAR(255) NULL, ADD UNIQUE INDEX users_staff_login_id_unique (staff_login_id);`. The down migration drops the index, PIN hash, then ID column.

- [ ] **Step 4: Add the helper**
Use `nanoid.customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)`. Normalize by uppercasing then removing non-alphanumeric characters. Validate PINs with `/^\d{4}$/`. Hash and compare PINs with bcrypt cost `10`.

- [ ] **Step 5: Verify and commit**
Run `node test/staff-credentials.test.js`. Add it to the backend test script. Stage the migration, helper, test, and package manifest, then commit `feat: add staff login credentials schema`.

### Task 2: API provisioning and two login paths

**Files:**
- Modify: `../express-pos/src/modules/m_users.js`
- Modify: `../express-pos/src/controllers/c_users.js`
- Modify: `../express-pos/src/routers/r_users.js`
- Create: `../express-pos/test/staff-login-contract.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Consume Task 1 helper functions.
- Accept `{ staff_login_id, pin }` on `POST /api/v1/login`.
- Add `PATCH /api/v1/user/:id/staff-credentials` accepting `{ pin, regenerate_login_id }` and returning `{ staff_login_id }`.

- [ ] **Step 1: Write the failing API contract test**
Create `test/staff-login-contract.test.js`. Read the controller, module, and router source. Assert the router registers `patch('/user/:id/staff-credentials', authentication, setStaffCredentials)` before the generic patch route; the controller uses `verifyStaffPin` and `regenerate_login_id`; the repository uses parameterized `WHERE staff_login_id = ?`; and list SQL no longer uses `SELECT * FROM users WHERE shopid = ?`. Assert safe list output includes `staff_login_id` but excludes `password`, `clearpass`, and `staff_pin_hash`, and the e-mail branch checks admin access `0`.

- [ ] **Step 2: Run the test to verify it fails**
Run `node test/staff-login-contract.test.js` in `../express-pos`.
Expected: FAIL because the new endpoint, lookup, and safe projection are absent.

- [ ] **Step 3: Add focused repository methods**
In `m_users.js`, add parameterized lookups for e-mail, `staff_login_id`, and `{ id, shopid }`. Replace wildcard projections in `mGetAllUser` and `mDetailUser` with public columns that include `staff_login_id` but exclude password, PIN hash, and session fields. Keep `mDetailUserWithSecretFields` for the existing QR token flow only.

- [ ] **Step 4: Create and reset credentials safely**
In `c_users.js`, recognize staff access values `[0, 1, 4, 5]`. On staff `/register`, require a valid PIN, allow empty or duplicate e-mail, generate an ID, hash the PIN, and retry a unique-index collision up to five times. Store a generated internal password hash for non-admin staff because the schema currently requires a password. For an admin, persist an e-mail password hash only when a password was supplied. Return `{ staff_login_id }` only.

- [ ] **Step 5: Add credential reset endpoint**
Implement `setStaffCredentials(req, res)`: find the user by request ID and `req.shopid`, reject non-staff targets and invalid PINs, replace the ID only when `regenerate_login_id` is true, hash the PIN, and update only `staff_login_id`, `staff_pin_hash`, and `updated`. Return the current/new ID, never the PIN or hash.

- [ ] **Step 6: Implement login dispatch**
For an ID payload, normalize then find by ID, require active staff access, and use `verifyStaffPin`. For an e-mail payload, require exactly one active admin and use `bcrypt.compare` against the existing password hash. Keep the JWT and response payload shape consumed by `store/users.js`. For failures return `Identifiant ou code incorrect.` for unknown IDs, bad PIN, duplicate e-mail, bad password, inactive accounts, and non-admin e-mail login.

- [ ] **Step 7: Verify and commit**
Run `node test/staff-credentials.test.js`, `node test/staff-login-contract.test.js`, then `npm.cmd test` in `../express-pos`. Add the contract test to the package script. Stage modified API files, tests, and package manifest, then commit `feat: support staff PIN login`.

### Task 3: Staff credential management UI

**Files:**
- Modify: `store/staff.js`
- Modify: `pages/staff/index.vue`
- Modify: `test/staff-page.test.js`
- Create: `test/staff-credentials-page.test.js`
- Modify: `package.json`

**Interfaces:**
- Consume Task 2 creation response and credential endpoint.
- Export `staff/provisionCredentials({ id, pin, regenerateLoginId })`.

- [ ] **Step 1: Write failing frontend tests**
Create `test/staff-credentials-page.test.js`. It requires an `ID caisse` column using `staff_login_id`, a `form.pin` binding, the label `PIN a 4 chiffres`, a `regenerateLoginId` flow, store action `provisionCredentials`, and `staff-credentials` endpoint use. Extend `test/staff-page.test.js` to require `pin` in staff creation and to reject mandatory staff e-mail/legacy-password requirements.

- [ ] **Step 2: Run the tests to verify they fail**
Run `node test/staff-credentials-page.test.js` and `node test/staff-page.test.js`.
Expected: FAIL because the credentials controls and store action are absent.

- [ ] **Step 3: Add the Vuex action**
In `store/staff.js`, add `provisionCredentials({ id, pin, regenerateLoginId })`. PATCH `/baseurl/api/v1/user/${id}/staff-credentials` with `{ pin, regenerate_login_id: regenerateLoginId }`, use `authHeaders()`, return `response.data.data`, and reuse existing error notification behavior.

- [ ] **Step 4: Change Staff / Equipe**
Add `pin` to `emptyForm`, validate it with `/^\d{4}$/`, and render `PIN a 4 chiffres` during creation. Make e-mail optional by accepting empty or valid values. Remove the generic password input; show optional `Mot de passe e-mail` only when the chosen role is Admin. Add `ID caisse` to headers and render `A creer` if it is missing. Add tooltipped icon actions that open a credentials dialog and request ID regeneration. The dialog sends a new PIN through the store action and displays only the returned ID. On creation, send `pin` plus optional e-mail/admin password and show the returned ID before closing.

- [ ] **Step 5: Verify and commit**
Run the two Staff tests and `npm.cmd run lint`. Register the new test in `package.json`. Stage the store, page, tests, and manifest, then commit `feat: manage staff POS credentials`.

### Task 4: ID/PIN mode on the login screen

**Files:**
- Modify: `components/forms.vue`
- Modify: `test/login-query-credentials.test.js`
- Create: `test/staff-pin-login-form.test.js`
- Modify: `package.json`

**Interfaces:**
- Consume existing `users/postLogin(params)` and its token persistence.
- Submit `{ staff_login_id, pin }` in staff mode and `{ email, password }` in admin mode.

- [ ] **Step 1: Write the failing form test**
Create `test/staff-pin-login-form.test.js`. It asserts `Connexion caisse`, `Connexion admin`, `staff_login_id`, `PIN a 4 chiffres`, and a `postLogin` path with `staff_login_id`. It also rejects route query use for username, password, or PIN.

- [ ] **Step 2: Run the test to verify it fails**
Run `node test/staff-pin-login-form.test.js`.
Expected: FAIL because mode selection and the staff payload do not exist.

- [ ] **Step 3: Implement the two-mode form**
In `components/forms.vue`, add `loginMode: 'staff'` and add `staff_login_id` plus `pin` to form data. For login only, render a compact Vuetify mode control with `Connexion caisse` and `Connexion admin`. Staff mode shows ID caisse and PIN fields. Admin mode preserves e-mail and password. Dispatch exactly `{ staff_login_id, pin }` or `{ email, password }`; do not alter registration or URL credential protections.

- [ ] **Step 4: Verify and commit**
Run `node test/staff-pin-login-form.test.js`, `node test/login-query-credentials.test.js`, and `npm.cmd test`. Register the test in `package.json`. Stage the form, tests, and manifest, then commit `feat: add staff PIN login form`.

### Task 5: Local migration and full verification

**Files:**
- Modify: no source files expected

**Interfaces:**
- Consume Tasks 1 through 4 and the local `.env.local` database.

- [ ] **Step 1: Apply migration**
Run `npm.cmd run db:up:local` in `../express-pos`. Expected result: migration `20260811130000_staff_login_credentials.sql` applies once.

- [ ] **Step 2: Run automated validation**
Run backend `npm.cmd test`, frontend `npm.cmd test`, frontend `npm.cmd run lint`, and frontend `npm.cmd run build-local`. Expected result: both test suites pass, lint has no errors, and Nuxt builds.

- [ ] **Step 3: Verify user flow**
Sign in as an admin with e-mail/password. Create a Caissier with blank e-mail and PIN `1234`; record the generated ID. Sign out, choose `Connexion caisse`, and sign in with the ID/PIN. Confirm the cashier menu is restricted and a counter order can be created. Confirm a wrong PIN and disabled account fail. Return as admin, reset the PIN and regenerate the ID, then confirm only the new pair works.

- [ ] **Step 4: Report clean status**
Run `git status --short` in both repositories. Report migration result, validation, manual flow, and commit IDs.
