# Protected Staff PIN Consultation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated administrator reveal a staff PIN after reload without storing plaintext credentials in SQL or browser persistence.

**Architecture:** Keep bcrypt for login. Store a separate AES-256-GCM encrypted copy bound to the shop, credential kind and login identifier. A same-shop administrator-only GET endpoint returns a PIN on demand with no-store headers; ordinary lists and sessions never contain PINs or ciphertext. The frontend holds revealed PINs only in component memory and clears them when hidden, unmounted or the actor changes.

**Tech Stack:** Existing Express, Node crypto, MySQL/dbmate, Nuxt 2, Vue 2, Vuetify and Vuex. No new dependency.

**Spec:** Approved chat design: permanent admin consultation with encrypted storage; existing hash-only staff credentials require one explicit regeneration. Kiosks already have bcrypt hashes but currently also store plaintext; changing kiosk storage is awaiting the user's separate choice.

## Global Constraints
- Preserve unrelated dirty delivery and home work; work in the main local checkouts used for testing.
- Never print actual PINs, encryption keys or complete environment files.
- Keep authentication hash-based; never decrypt a PIN to authenticate.
- Keep primary-administrator credential restrictions and tenant boundaries.
- Do not reset existing staff PINs automatically or deploy to staging/production.
- Configure an independent server-only encryption key, never reuse a public or JWT key.

## Review Focus
- Cross-shop, non-admin, inactive or stale sessions cannot reveal credentials.
- Missing/wrong keys, altered ciphertext or swapped credential contexts fail closed without modifying a PIN.
- Legacy hashes continue to authenticate and are explicitly reported as non-revealable.
- Late HTTP responses cannot display a PIN after a staff/shop/session change or row replacement.
- Lists, login sessions, Vuex persistence, logs and HTTP caches never retain revealed PINs.

### Task 1: Backend Vault and Staff API
**Files:** `../express-pos/src/helpers/pinVault.js`, `src/controllers/c_users.js`, `src/modules/m_users.js`, `src/routers/r_users.js`, new db migration and `test/pin-vault.test.js`, `test/staff-pin-visibility.test.js`.
**Interfaces:** `encryptPin(pin, { kind, shopId, loginId })`, `decryptPin(ciphertext, context)`. `GET /user/:id/staff-credentials` returns `{staff_login_id, staff_pin, needs_regeneration}`; PATCH remains explicit regeneration.
- [x] Write and run failing crypto tests: round trip, leading zeroes, random IV, tampering, invalid/missing key and swapped tenant/kind/login context.
- [x] Implement authenticated encryption using a 32-byte base64 server key and bounded versioned envelope.
- [x] Write and run failing API tests for same-shop admin, denial, legacy PINs, no-store headers and unchanged bcrypt login.
- [x] Add encrypted column, write it together with the bcrypt hash at creation/regeneration, and expose only through the protected endpoint.
- [x] Run backend targeted tests, then the canonical backend suite.

### Task 2: Staff UI
**Files:** `pages/staff/index.vue`, `store/staff.js`, optional focused PIN-cell component, `test/staff-credentials-page.test.js` and behavioral regression tests.
**Interfaces:** `staff/readCredentials({id})` returns a transient DTO, never commits secrets. Eye toggles reveal/hide without regenerating a PIN.
- [x] Write failing behavior tests for on-demand reveal/hide, legacy marker, actor changes, stale responses and double-click protection.
- [x] Add masked PIN column and accessible eye buttons, preserving the existing explicit regeneration dialog.
- [x] Keep all secrets out of Vuex state/persistence, clear local data on hide, close, session changes and teardown.
- [x] Run targeted tests and ESLint.
- [x] Complete the final canonical frontend suite.
- [ ] Verify desktop/mobile browser presentation. Attempted local startup; browser timed out before a usable staff screen. Temporary front/backend processes stopped after the attempt; no real PINs displayed or reset.

### Task 3: Local Setup and Final Verification
**Files:** Backend configuration documentation and a narrowly scoped local migration/configuration helper if required.
- [x] Generate a local server-only key without printing it; do not overwrite a configured key.
- [x] Verify Docker-local DB target and take a protected backup before applying schema migrations.
- [x] Do not regenerate real accounts or reveal their PINs during tests; use isolated fixtures.
- [x] Review auth, secret handling and compatibility; document local status and production configuration requirements in backend `docs/staff-pin-vault.md`.

## Review Rulings and Evidence

- Fresh reviewer found three concrete issues. All were reproduced with RED tests, fixed and rerun GREEN: revoked session token, query-only route change, and pending generation response after staff-list replacement.
- Only the new consultation endpoint requires the live persisted session token. Existing authentication behavior elsewhere is unchanged; the authentication lookup now also selects the token for this guard.
- Regeneration refreshes the staff list when its dialog is closed, so an unrelated list replacement can always invalidate an outstanding response without reviving a PIN.
- Backend canonical suite passed after these fixes; targeted frontend suite has five behavior cases and targeted ESLint passes with no errors/warnings (apart from the external Browserslist freshness notice).
- Final frontend canonical `npm test` passed as well. Full outputs are preserved in ignored frontend `.superpowers/staff-pin-tests-final.log` and backend `backups/staff-pin-backend-tests-final.log`.
- The Docker-local migration preserved all existing row counts and a digest of every staff login ID/hash. Its verified backup and local setup helper are under ignored, ACL-restricted backend `backups/staff-pin-20261024/`.
- Kiosk storage is intentionally unchanged because approval for that optional extension has not arrived. No staging/production configuration, deployment, commit or push was performed.

### Optional Kiosk Extension
Only after user approval: use the same vault with `kind: kiosk`, replace kiosk plaintext storage with ciphertext, migrate existing plaintext without changing login hashes/PINs, and use the same on-demand admin UI. Preserve kiosk login and PIN verification contracts. Migration must be explicit and refuse to erase plaintext until its encrypted copy verifies.
