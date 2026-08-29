# Staff Module Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create PIN-only staff accounts with generated one-time credentials and editable module permissions that control visible application navigation.

**Architecture:** The backend stores a nullable JSON permission list on `users`, generates staff PINs server-side, and returns safe session/list data with a primary-admin flag. The frontend persists those permissions in the session, extends the existing role helper with role presets and permission-aware checks, then uses that helper to filter navigation and drive the Staff permission checkboxes.

**Tech Stack:** Express, MySQL, bcrypt, Nuxt 2, Vue 2, Vuetify, Vuex, Node assert tests.

## Global Constraints

- Keep the primary administrator on email/password with unrestricted access.
- Created Staff users have no email, password, or phone input; they use a generated six-character ID and random four-digit PIN.
- Show a generated PIN only immediately after create/reset, behind an eye toggle.
- Keep Staff and Reglages exclusive to the primary administrator.
- Hide navigation only; do not add module route enforcement in the backend.
- Preserve unrelated dirty frontend navigation changes and the backend VS Code setting.

---

### Task 1: Add staff PIN and module-permission persistence

**Files:**
- Create: `../express-pos/db/migrations/20260811140000_staff_module_permissions.sql`
- Create: `../express-pos/src/helpers/staffPermissions.js`
- Modify: `../express-pos/src/helpers/staffCredentials.js`
- Test: `../express-pos/test/staff-module-permissions.test.js`
- Test: `../express-pos/test/staff-credentials.test.js`

**Interfaces:**
- Produces `createStaffPin(): string`, a four-digit PIN.
- Produces `STAFF_MODULE_KEYS`, `getDefaultModulePermissions(access)`, and `normalizeModulePermissions(value, access)`.
- Adds nullable `module_permissions TEXT` to `users`; values are JSON arrays of module keys.

- [ ] **Step 1: Write failing backend tests**

```js
assert.match(createStaffPin(), /^\d{4}$/)
assert.deepStrictEqual(
  getDefaultModulePermissions(ACCESS.CASHIER),
  ['orders', 'cashregister', 'history']
)
assert.deepStrictEqual(
  normalizeModulePermissions(['orders', 'invalid', 'orders'], ACCESS.SERVER),
  ['orders']
)
assert.match(migration, /module_permissions TEXT NULL/)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node test/staff-module-permissions.test.js`

Expected: failure because the permission helper, random PIN creator, and migration do not exist.

- [ ] **Step 3: Implement the helpers and migration**

```js
const createStaffPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0')
const normalizeModulePermissions = (value, access) => {
  const source = Array.isArray(value) ? value : getDefaultModulePermissions(access)
  return [...new Set(source.filter((key) => STAFF_MODULE_KEYS.includes(key)))]
}
```

Use `TEXT NULL` so existing rows fall back to their role preset. Do not add PIN or permission secrets to public queries.

- [ ] **Step 4: Run the backend helper tests**

Run: `node test/staff-credentials.test.js && node test/staff-module-permissions.test.js`

Expected: both commands pass.

- [ ] **Step 5: Commit the isolated backend persistence change**

```powershell
git -C ..\express-pos add db/migrations/20260811140000_staff_module_permissions.sql src/helpers/staffCredentials.js src/helpers/staffPermissions.js test/staff-credentials.test.js test/staff-module-permissions.test.js
git -C ..\express-pos commit -m "feat: add staff module permissions"
```

### Task 2: Generate credentials and expose safe session permissions

**Files:**
- Modify: `../express-pos/src/controllers/c_users.js`
- Modify: `../express-pos/src/modules/m_users.js`
- Test: `../express-pos/test/staff-module-permissions.test.js`
- Test: `../express-pos/test/staff-login-contract.test.js`

**Interfaces:**
- `POST /register` creates any Staff role from `{ username, access, module_permissions?, status? }`.
- Create response data is `{ staff_login_id, staff_pin }` once only.
- `PATCH /user/:id/staff-credentials` needs no PIN body and returns `{ staff_login_id, staff_pin }` while preserving an existing ID.
- Safe list/detail/session rows expose `module_permissions` and `is_primary_admin`, never `staff_pin_hash` or a raw PIN.

- [ ] **Step 1: Write failing controller contract tests**

```js
assert.match(controller, /createStaffPin/)
assert.match(controller, /module_permissions/)
assert.match(controller, /staff_pin:\s*staffPin/)
assert.doesNotMatch(moduleSource, /staff_pin_hash.*mSessionUser/)
assert.match(moduleSource, /is_primary_admin/)
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `node test/staff-login-contract.test.js`

Expected: failure because create/reset currently require a submitted PIN and session queries lack permissions and primary-admin state.

- [ ] **Step 3: Implement creation, reset, and safe queries**

```js
const staffPin = createStaffPin()
data.staff_pin_hash = await hashStaffPin(staffPin)
data.module_permissions = JSON.stringify(
  normalizeModulePermissions(body.module_permissions, access)
)
```

Use `shop.admin_user = users.id` to derive `is_primary_admin` in Staff list/detail/session queries. Reject credential reset for the primary administrator. Keep an existing `staff_login_id` unchanged on PIN reset.

- [ ] **Step 4: Run focused backend tests**

Run: `node test/staff-login-contract.test.js && node test/staff-module-permissions.test.js && node test/admin-email-login.test.js && node test/admin-legacy-password-login.test.js`

Expected: all commands pass.

- [ ] **Step 5: Apply the local database migration and commit**

```powershell
npm.cmd run db:up:local
git -C ..\express-pos add src/controllers/c_users.js src/modules/m_users.js test/staff-login-contract.test.js test/staff-module-permissions.test.js
git -C ..\express-pos commit -m "feat: generate staff credentials"
```

### Task 3: Make frontend navigation permission-aware

**Files:**
- Modify: `helpers/staffRoles.js`
- Modify: `helpers/listdashboard.js`
- Modify: `store/users.js`
- Modify: `layouts/default.vue`
- Create: `test/staff-module-navigation.test.js`
- Modify: `package.json`

**Interfaces:**
- `getRoleModuleDefaults(access): string[]` returns the Staff preset.
- `canAccessModule(access, moduleKey, modulePermissions, isPrimaryAdmin): boolean` uses explicit permissions when supplied, role defaults otherwise, and lets only primary admins access `staff`/`settings`.
- `getAccessibleNavigationItems(access, items, modulePermissions, isPrimaryAdmin)` filters the sidebar.
- The persisted user session includes `module_permissions` and `is_primary_admin`.

- [ ] **Step 1: Write failing navigation tests**

```js
assert.strictEqual(
  canAccessModule(ACCESS.CASHIER, 'cashregister', ['orders'], false),
  false
)
assert.strictEqual(
  canAccessModule(ACCESS.ADMIN, 'staff', ['orders'], false),
  false
)
assert.strictEqual(
  canAccessModule(ACCESS.ADMIN, 'staff', [], true),
  true
)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test/staff-module-navigation.test.js`

Expected: failure because the helper only accepts role access today.

- [ ] **Step 3: Implement permission mapping and session persistence**

Map `orders` to the existing `orders`, `cart`, and `menus` navigation keys, and map `catalog` to product-management keys. Add the missing `moduleKey` values for stock and reports navigation items. Persist parsed permission arrays in local storage and Vuex with the other session fields.

- [ ] **Step 4: Use the session permissions in the layout**

Pass `module_permissions` and `is_primary_admin` into sidebar and app-bar permission checks. Preserve the user’s floating-home-button changes in `layouts/default.vue`.

- [ ] **Step 5: Run frontend permission tests and commit**

Run: `node test/staff-roles.test.js && node test/staff-module-navigation.test.js && node test/persisted-state.test.js`

```powershell
git add helpers/staffRoles.js helpers/listdashboard.js store/users.js layouts/default.vue test/staff-module-navigation.test.js package.json
git commit -m "feat: filter staff navigation by permissions"
```

### Task 4: Simplify Staff management and one-time credential display

**Files:**
- Modify: `pages/staff/index.vue`
- Modify: `store/staff.js`
- Modify: `test/staff-page.test.js`
- Modify: `test/staff-credentials-page.test.js`
- Create: `test/staff-module-permissions-page.test.js`
- Modify: `package.json`

**Interfaces:**
- Staff create payload is `{ username, access, status, module_permissions }`.
- Staff update payload includes `username`, `access`, `status`, and `module_permissions` only.
- Credential reset dispatch sends no chosen PIN and receives a one-time `{ staff_login_id, staff_pin }` payload.

- [ ] **Step 1: Write failing Staff UI tests**

```js
assert.doesNotMatch(page, /label="E-mail"/)
assert.doesNotMatch(page, /label="Mot de passe e-mail"/)
assert.match(page, /v-checkbox[\s\S]*module_permissions/)
assert.match(page, /mdi-eye/)
assert.match(page, /staff_pin/)
assert.doesNotMatch(page, /regenerateLoginId/)
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run: `node test/staff-page.test.js && node test/staff-credentials-page.test.js && node test/staff-module-permissions-page.test.js`

Expected: failure because the form still requests email and PIN, and reset still accepts a manual PIN/ID regeneration.

- [ ] **Step 3: Implement the Staff form and preset behavior**

Use a `v-select` role control with `@change="applyRolePreset"` and a compact `v-checkbox` group. Remove email, phone, password, and manual PIN controls. Keep only name, role, permissions, and active state. Exclude the primary administrator from the editable Staff collection.

- [ ] **Step 4: Implement read-only credentials and PIN eye controls**

Display the returned ID as `readonly`. Show the returned PIN only in the post-create/reset dialog with `:type="showPin ? 'text' : 'password'"` and `@click:append="showPin = !showPin"`. The reset dialog triggers server generation; it never asks an administrator to type a PIN.

- [ ] **Step 5: Run the full frontend checks and commit**

Run: `npm.cmd test && npm.cmd run lint`

```powershell
git add pages/staff/index.vue store/staff.js test/staff-page.test.js test/staff-credentials-page.test.js test/staff-module-permissions-page.test.js package.json
git commit -m "feat: manage staff permissions"
```

### Task 5: Verify both applications together

**Files:**
- Verify only: `../express-pos` and the frontend workspace

**Interfaces:**
- A generated Staff user can sign in using the displayed ID/PIN and sees only checked module navigation.
- A primary administrator signs in with email/password and sees Staff and Reglages.

- [ ] **Step 1: Run the complete backend test suite**

Run: `npm.cmd test` from `../express-pos`

Expected: exit code 0.

- [ ] **Step 2: Run the complete frontend test suite and lint**

Run: `npm.cmd test` and `npm.cmd run lint` from `pos-app`

Expected: exit code 0, with only pre-existing lint warnings if any.

- [ ] **Step 3: Verify the local application flow**

Start the backend and frontend if needed. Create a Staff user as a cashier, record the one-time ID/PIN dialog, sign in with those credentials, and confirm that only Commandes, Tiroir-caisse, and Historique appear. Confirm that the primary administrator still sees Equipe and Reglages.

- [ ] **Step 4: Inspect final diffs and report commits**

Run: `git diff --check` and `git status --short` in both repositories. Do not stage the pre-existing floating home button work or `.vscode/settings.json` unless the user explicitly asks.
