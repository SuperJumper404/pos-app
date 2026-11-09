# Client phone resolution implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Find/create a restaurant customer profile when a valid phone is typed, show existing points, retain internal order attribution and publish both apps with Docker.

**Architecture:** A shared transactional phone resolver reuses `customers` and the directory phone binding. Internal `customer_profile_id` on orders/archives stays separate from authenticated `customer_account_id`. Lookup creates no loyalty membership or login session; existing payment hooks credit an existing member after confirmed payment.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios; Express, mysql2, MySQL 8, existing libphonenumber helpers; Docker Compose/GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-09-client-par-telephone-design.md` (approved).

## Global constraints

- A new number creates a profile only; no automatic card, points, marketing consent, verified identity or personal session.
- Same-shop canonical matching; conflicting candidates remain ambiguous. Reuse confirmed manual mappings and imported aliases.
- No automatic point spending; existing enrollment/reward/Stripe/Terminal safeguards stay intact. TPE wait remains 60 seconds.
- QR responses expose only lookup status, normalized phone and available points; staff receives the minimal profile and loyalty summary. No public order DTO enrichment.
- Only cashier non-delivery checkout and `service_point/table_qr` receive new internal attribution. Preserve kiosk, delivery and verified account ownership boundaries.
- Phone change clears old visible points and QR loyalty/reward context immediately. Stale replies cannot win after phone, shop, identity or lifecycle changes.
- Hide redundant Fidélité and respect AGENTS hidden Categories/Étapes/Stock main navigation rule. Keep legacy redirects and Wallet tools.
- No new app dependency, broad refactor, historical bulk import, secret output, or unrelated original-checkout edits.

## Review focus

1. Concurrent national/international variants must create one contact: Task 1 SQL integration.
2. Existing unverified profiles and imported aliases must be reused without acquiring login privileges: Tasks 1/2 tests.
3. Old QR loyalty context must not survive phone changes or an in-flight response: Task 3 deferred tests.
4. Replayed checkout and public/foreign-shop order detail must preserve ownership and privacy: Task 2 tests.
5. Existing member credit happens once after payment; profile-only has no membership and no point ledger: Tasks 1/2 integration.

## Task 1 — canonical phone service, API and additive schema

**Backend root:** `C:/Users/kalag/.codex/deployments/clients-staging-20261106/express-pos` (frontend sibling junction points here).

**Files:** create `src/modules/m_customerPhone.js`, `src/controllers/c_customerPhone.js`, `db/migrations/20261109120000_customer_phone_profiles.sql`, `test/customer-phone-profiles.test.js`, `test/customer-phone-profiles.integration.test.js`; modify `src/routers/r_customers.js`, `src/modules/m_clientDirectory.js` and narrowly related directory tests.

**Produces:** `buildCustomerPhoneService({ repository?, runInTransaction? })` with `resolve({shopId,phone,countryCode='FR',name='',connection?})` returning `{status:'resolved'|'ambiguous',phone,created,customer,loyalty}`; customer `{id,shopId,name,phone,email}`, loyalty null or `{id,cardNumber,balance,reserved,available}`. Invalid input throws `CUSTOMER_PHONE_INVALID` 422. `resolveForCheckout(scope)` returns null for invalid/ambiguous phones, otherwise the same resolved result; database failures propagate. `getSummary({shopId,customerId,connection?})` reads `{customer,loyalty}` or null without writes.

**API:** `POST /baseurl/api/v1/clients/resolve-phone`, authenticated staff or active table QR. Accept only `{phone,countryCode?,name?}`. Staff roles 0/1/4/5 need orders or cashregister permission; QR requires valid table credential, origin and existing quotas. Full staff response follows service DTO. QR returns `{status,phone,created,profilePresent,loyalty:null|{available}}`, omitting customer identity, QR/card secrets, history and sessions. Cache-Control no-store.

**Schema:** add nullable bigint unsigned `customer_profile_id` with shop-scoped customer FK/index to orders and archives; allow directory `match_kind='phone'` via constraint replacement. Reuse the existing normalized phone hash binding and audit only changes. Preserve imports/manual mappings and canonical aliases. Down migration retains contacts and safely translates `phone` bindings to a legacy supported kind before restoring the constraint.

- [ ] Add failing normalization, reuse, ambiguity, permissions/QR redaction, no-card/no-identity/no-consent tests; observe RED.
- [ ] Implement the shared resolver, transactional Shop→customer lock order and mapping/audit; include existing contact phones plus verified local/global and membership phone sources.
- [ ] Update directory projection to prefer explicit authenticated owner then internal profile owner, including protected linked-order detection.
- [ ] Run new unit tests and directory suites GREEN. SQL test covers concurrent import-free resolution, migration round trip, shop isolation, aliases and no loyalty writes.
- [ ] Report scoped changed files and proof for review; coordinator owns package scripts and commits.

## Task 2 — checkout attribution, enrollment reuse and staff order summary

**Files:** modify `src/modules/m_checkout.js`, `src/modules/m_loyalty.js`, `src/modules/m_orders.js`, `src/controllers/c_orders.js`; create `test/customer-phone-checkout.test.js`, `test/customer-phone-order-detail.test.js` and expand relevant loyalty/checkout tests as needed. Do not edit Task 1 files.

**Consumes:** Task 1 service methods and schema. Inject the resolver into module builders consistent with existing repository/loyalty injection patterns; resolve in the existing connection rather than nesting a transaction.

**Produces:** new orders/archives carry `customer_profile_id`; authorized staff `/detailorder/:id` first/all rows expose `clientProfile:{customer,loyalty}`. Add only to same-shop staff response, never shared public-token hydration. Existing `customer_account_id` remains authoritative for personal access. Existing verified context with a different resolved profile produces `CUSTOMER_PHONE_CONTEXT_CHANGED` 409, not replacement.

**Loyalty:** `enrollPhone` reuses a unique profile from Task 1 before creating its explicitly requested membership. Add internal profile attachment/settlement that verifies the order's profile ID and reuses existing member/payment hooks; don't create membership or change kiosk member-only ownership behavior.

- [ ] Add failing cashier/QR immediate/profile-only/paid-member/replay/ambiguity/context mismatch tests and staff vs public/foreign detail tests; observe RED.
- [ ] Resolve after existing checkout replay and caller eligibility checks, before order insertion; staff is authorized order taker and non-delivery, QR is active table QR. Do not trust posted profile IDs or introduce personal sessions.
- [ ] Persist/archive internal link and attach an existing member for accumulation; preserve explicit reward use, idempotent payment events, paid/refunded locks and kiosk assertions.
- [ ] Fix explicit enrollment profile reuse and add current read-only minimal staff detail enrichment.
- [ ] Run targeted checkout/loyalty/customer identity/archive tests GREEN; report scoped diff and proof for review.

## Task 3 — automatic phone UI and navigation

**Frontend root:** `C:/Users/kalag/.codex/worktrees/clients-staging-frontend/pos-app`.

**Files:** create `store/clientPhone.js`, a small shared phone input helper if needed, and focused runtime tests; modify `pages/menus.vue`, `pages/cart.vue`, `pages/orders/detail/_id.vue`, `components/loyalty/LoyaltyCheckout.vue` only as necessary, `helpers/persistedState.js`, `helpers/listdashboard.js`, relevant navigation/phone/checkout tests. Coordinator owns package.json.

**Consumes:** Task 1 POST contract and Task 2 `clientProfile`. `clientPhone/resolve({phone,name?})`, `clientPhone/reset` hold separate transient state `{result,busy,error,epoch,sequence,owner,phone}`. Use existing authenticated API transports; preserve global account and staff session behavior.

- [ ] Add RED runtime tests for known member, profile-only zero points, invalid/cleared/rapid changed phone, shop/user change, ignored late response, QR context/reward clearing, staff-only detail and hidden navigation.
- [ ] Debounce valid complete input 400ms; immediately reset stale state on every phone edit. No request for incomplete input. Only autofill blank cashier name; don't overwrite an entered value.
- [ ] Menu caisse inherits menus.vue: show a compact X points disponibles line near the existing phone. QR uses its existing phone input for automatic profile lookup, with existing voluntary loyalty/reward controls retained. Avoid duplicate visible point counts.
- [ ] Display staff-only profile, card state and current points in order details including paid orders; public/QR never receives that summary. Hide Fidélité and Stock from shared main navigation; preserve legacy routes/internal product access.
- [ ] Exclude clientPhone from persisted state, clean up timers/requests on scope/lifecycle changes, and preserve frozen payment attempt recovery.
- [ ] Run focused runtime/client/loyalty/nav tests and lint GREEN; provide desktop/mobile evidence or fixture instructions for coordinator's bounded visual check.

## Task 4 — integrated verification and release preparation

**Owner:** coordinator. **Files:** both package.json test scripts, deployment/validation workflows only where needed, progress ledger and install guide.

- [ ] Add new tests to appropriate scripts. Run full frontend/backend suites, loyalty suites and frontend lint after integrating scoped reviews.
- [ ] Run MySQL integration in a local disposable Docker/CI service if the local engine or private network is unavailable; never use application credentials for tests.
- [ ] Generate frontend with Node 18 Docker and verify desktop/mobile UI in one batched pass, one correction pass only if needed. Preserve established design.
- [ ] Independent whole-feature review, resolve material findings and verify fixes. Commit reviewed frontend/backend changes without scratch files/secrets.

## Task 5 — Docker staging and production

- [ ] Publish to staging with normal pushes and existing Docker workflows, preserve Wallet wrapper/configuration. Verify runtime hashes/schema/API, automatic resolution with disposable fixtures and public DTO privacy.
- [ ] Fetch master/staging for both repositories; preserve production changes and use a normal fast-forward/merge, never force-push.
- [ ] Before production mutation, make a secure DB/environment rollback backup and preserve Wallet volumes/certificates. Extend existing production workflow if necessary to provide backup/readiness/schema checks when direct SSH is unavailable.
- [ ] Publish backend then frontend with Docker production workflows, wait for actual readiness, verify public endpoints, runtime versions/migrations and no unintended membership/identity creation. No bulk historical import.
- [ ] Record commit/run IDs, backup location and precise validation scope. Report production URL and any real remaining limitation.
