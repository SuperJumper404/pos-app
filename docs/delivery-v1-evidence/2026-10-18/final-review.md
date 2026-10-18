# DeliveryV1 Final Broad Paired-Branch Review

## Scope And Method

Single final whole-feature reviewer after all 17 approved task gates. This is an integration assessment, not a replacement Task17 gate or a repetition of the individual gates.

- F: `6f694519d0db9ee631fe9d85550af71165dac293` -> `9fc355799e1124cc257a9e647f0933aadf04389c`.
- B: `9bd0a1ed9ea8dcb30bc77f1d9c997790d902b8a9` -> `8dbc562efb69a291a09b515b3d1ce17eb1253279`.
- F denotes the isolated `delivery-v1/pos-app` worktree; B denotes its sibling `express-pos`. Scratch denotes this `.superpowers/sdd/2026-10-16-delivery-management` directory.
- Read both supplied full contextual packages through EOF in manageable contiguous passes, recovering output truncations with narrow reads: 81 frontend files and 85 backend files. Read the handoff, installed requesting-code-review instructions/template, spec, master plan/common contracts, tracked decisions/acceptance/evidence README, latest final triage, and Task17 independent report. Considered all 52 tracked rulings plus current ledger Rulings53/54; their rationale was not treated as correctness evidence.
- Focused caller checks addressed two named doubts: alternate refunds for register-origin delivery payments, and alternate cancellation paths before courier assignment. Checked the legacy refund controller/payment lookup, delete/archive caller and preparation transition guard. No unrelated source audit or second reviewer.
- `workspace_fs` denied access to the isolated worktrees; terminal read fallback used. No suite reruns, repro execution, browser session, external action, model override, or source/index/HEAD changes. Only the authorized scratch checkpoint and this report were written. Final read-only checks confirmed both exact heads and empty `git status --short` outputs.

## Strengths

- The commercial chain remains authoritative across preparation, payment and archive. Durable delivery identity and accepted fee/fiscal snapshots survive active-order removal; BIGINT projections preserve exact string identifiers. Product totals, delivery fees and full totals are carried into documents and closures without inventing stock-consuming fee products.
- The implementation takes uncertainty seriously: exact checkout bodies/keys and original guest versus verified-customer contexts survive lost responses; repricing requires confirmation. Frontend generation/session/shop guards prevent late responses from republishing private tracking links or stale mission details.
- Courier authority is checked against current accounts and mission ownership before replay; role6 cannot inherit broad legacy access from stale JWT claims. Personal customer transports, cookie/CSRF/origin controls and independent identities are separated from staff identity and historic phone matches.
- Original-holder cash custody survives reassignment, disablement and role changes. Source-linked remittances, explicit physical return declarations, shop-first locking and post-lock UTC clocks distinguish a sale from a later drawer movement. Prior closure snapshots and earliest terminal privacy anchors are preserved.
- Tests go beyond superficial mocks: actual Vue/Vuex/template consumers, HTTP authorization boundaries, SQL locking/rollback, archive continuity, and the registered cross-feature journey exercise real producers. The documentation honestly separates browser doubles, actual SQL/runtime evidence, physical actions and live commissioning.

## Issues

### Critical (Must Fix)

None established.

### Important (Should Fix)

1. **Register-origin manual delivery payments cannot be fully refunded.** Primary location: `B/src/modules/m_deliveryRefunds.js:71`; source restriction at `:15`, eligibility at `B/src/modules/m_deliveryDispatch.js:287`, and collection-only refund FK at `B/db/migrations/20261016122000_delivery_manual_refunds.sql:28`.

   The POS explicitly offers counter settlement (`F/pages/cart.vue:265`, payload at `:1631`). `counter_pay_before` creates a paid order (`B/src/modules/m_checkout.js:121`); later cashier collection also only updates the commercial payment fields (`B/src/modules/m_orders.js:1331`, `:1342`). Neither produces a courier `delivery_payment_collections` source. The new manual refund service requires exactly that source and rejects without it; its `register` option means the register returns a *courier-collected* sale, not a sale originally paid at the register. The legacy Stripe path is not an alternative: its lookup requires matching provider payment records (`B/src/modules/m_payments.js:148`), with only a Terminal fallback and otherwise404 (`B/src/controllers/c_stripe.js:932`, `:957`).

   Concrete integration sequence: create a delivery and encash cash at the POS, then customer cancellation or a necessary paid-address correction requires refund/recreation. Dispatch offers a refund for paid missions (`F/components/delivery/DeliveryDispatch.vue:137`) but eligibility is false and confirmation cannot proceed. The same gap applies after later manual cashier collection/archive settlement. This leaves the order paid and prevents an audited full return, including the accepted delivery fee. It conflicts with spec6 paid-change recovery and spec7's explicit financial resolution, and with the manual-paid-cancellation rationale in `F/docs/delivery-v1-decisions.md:133` (ledger source179).

   Fix the financial source contract to support register-origin manual settlements and their full refunds, with an immutable origin/payment proof, current operator authorization, exact replay, and explicit cash versus independent-card semantics. Do not fabricate a courier collection, debt, provider confirmation or physical transfer. Ensure physical register refunds appear in the correct later closure period without rewriting prior sales/VAT snapshots. The schema restriction means this needs more than enabling the dialog.

   Focused acceptance: real POS `counter_pay_before:cash` producer and later cashier manual settlement, active and archived, fee-inclusive full return, same-key lost-response recovery, different-key duplicate refusal, no courier debt change, correct register cash outflow period and frozen old closure. Include any other manual counter method that remains offered. Existing refund/journey tests start from courier collections and do not answer this case (`B/test/delivery-refunds.integration.test.js:33`, `B/test/delivery-journey.integration.test.js:257`).

2. **An accepted unassigned delivery has no restaurant cancellation/failure path.** Primary location: `B/src/modules/m_deliveryDispatch.js:219`; the next guard also excludes unassigned issue origins at `:230`. UI/API action projection: `B/src/modules/m_deliveryOrders.js:68`.

   For `unassigned`, the restaurant only gets `assign`. `reportIssue` accepts only assigned/in-transit; cancellation/failure are only `resolveIssue` actions, which require an issue originating from those same states. Assignment requires an active available courier (`B/src/modules/m_deliveryDispatch.js:170`). Legacy preparation cancellation is explicitly refused (`B/src/modules/m_orderTransitions.js:81`); legacy delete invokes hidden archive (`B/src/controllers/c_orders.js:299`), which delivery archive refuses (`B/src/modules/m_orders.js:434`). Ordinary archive does not close logistics.

   Concrete integration sequence: an accepted order is still unassigned and the customer cancels, the restaurant cannot fulfill it, or a returned parcel has been reset to unassigned. With no available courier there is no supported way to close the logistics dossier. With one available, staff must create a fictitious assignment merely to report an issue and cancel. A refund does not close logistics either. This is an ordinary restaurant workflow, not a request for GPS, automated dispatch or automatic refunds; spec5's restaurant cancellation and reasonable operational expectations apply before assignment too. Current cancellation tests first assign a courier and therefore miss it.

   Provide a reasoned, versioned, idempotent restaurant-only cancellation/issue-resolution path from accepted unassigned state, without requiring a fabricated courier or transfer. Keep financial resolution and stock effects explicit and separate. Update allowed actions and operator UI together; preserve current authority-before-replay, suspension behavior and terminal privacy rules.

   Focused acceptance: accepted unpaid and prepaid unassigned missions, zero available couriers, plus returned-to-unassigned state; authorized cancellation and retry/replay, stale-version/current-role denials, no courier assignment/debt, no implicit refund/restock, accurate tracking and operational-list closure. This and finding1 can share the single bounded integration fix dispatch, but they are distinct defects.

### Minor (Nice To Have, Retained)

1. **Task17 M1 diagnostic/maintenance debt remains deferred.** `scratch/task-17-backend-delivery-db.log:249` and `:261`, `task-17-frontend-lint-final.log:350`, `task-17-frontend-build-final.log:67`: packet-order/legacy output, 143 lint warnings, stale Browserslist and build-size warnings reduce diagnostic signal. Retain the existing disposition; later cleanup should assert only expected fixture diagnostics and not suppress unexpected failures. The disclosed runtime audit47 (3low/7moderate/31high/6critical) at `task-17-runtime-iteration2.log:12` is inherited, untriaged security maintenance risk, not proof of a newly introduced exploit or security certification. Ruling54 is preserved, not reopened as a task-gate failure.

2. **Task17 M2 final runtime probes remain unbounded.** `B/test/delivery-runtime.integration.test.js:72` and `:75` lack the explicit request timeout used at `:60`. A connected but stalled endpoint can postpone smoke completion/cleanup beyond the readiness budget. Add bounded abort signals in the later focused tooling change already retained under Ruling54. The recorded successful run is not contradicted; no rerun/repro was needed to identify this robustness limitation.

## Concrete Integration Checks

These are review/evidence checks, not newly executed tests. No claim is made that this reviewer freshly ran the suites.

| Integration boundary | What was checked and result |
| --- | --- |
| Quote -> checkout -> payment | Server price reload, integer discount/minimum/free-threshold arithmetic, signed postal proof and quote expiry, settings revision, explicit fiscal policy and exact uncertain-attempt recovery. Accepted snapshots are not silently repriced. |
| Customer -> checkout/tracking | Independent verified subject, same-browser challenge, strict purpose and expiry, SQL-coordinated OTP quotas, optional session/CSRF attachment, original guest context recovery, hash-only tracking and explicit authorized renewal. No account/phone inference claims old orders. |
| Courier -> legacy and new APIs | Current active role6 and own mission checked before reads/mutations/replays; legacy API deny boundary, reassignment privacy, closed replay projection and resource-specific frontend freshness/error recovery. |
| Checkout -> kitchen -> archive -> delivery | One commercial order and stock chain, separate preparation/payment/logistics, ready pickup and archived customization/fee continuity. Assignment and archive overlap are explicitly covered by retained SQL tests. Preassignment cancellation remains finding2. |
| Payment -> refund | Stripe/Terminal active/archive links and fee-inclusive accepted totals inspected; courier cash/card manual returns are transactional and explicitly declared. Register-origin manual payment support remains finding1. |
| Collection -> custody -> remittance | Debt follows original collector, not current assignee; inactive/promoted holders remain discoverable/remittable. FIFO allocations, source caps, self-authorization guards, full courier-return capacity and independent-card no-cash behavior are tested. |
| Sales -> Z and later physical periods | Shop barrier, post-lock microsecond UTC clock, sale versus physical period, fee VAT exactly once, zero-order later closure, frozen prior JSON and source identity. Strengthened journey checks repeated local DST hour as distinct UTC instants. Historical production time basis remains an external prerequisite. |
| Corrections -> privacy | Admin-only terminal correction derives physical context from immutable journal, never rewrites payment/stock, and cannot extend the earliest closure privacy ceiling. Tracking read/rotation and stale frontend responses preserve those boundaries. |
| Receipts/navigation -> compatibility | Shared server financials, fee/VAT and refunded receipt rendering; delivery fulfillment precedence; existing Vuetify/Vuex patterns. Categories/Product Steps/Stock do not reappear in main navigation/home. Embedded browser PDF preview is not visually passed. |

### Retained Command Evidence

Read Task17's independent evidence analysis and directly inspected final raw command tails/config. All listed native exits are recorded evidence, not new executions:

- B complete npm: 66 registered files, `task-17-backend-npm-final.log:888` native0.
- B complete delivery SQL: 17 registered files, final report PASS/native0 at `task-17-backend-delivery-db.log:573`/`:574`, including the strengthened actual-router journey and refund/report producers.
- Actual configured application: Node20.20.2/MySQL8.0.33 at `task-17-runtime-iteration2.log:29`, outer native0 at `:31`; log-follower stop is separately identified at `:30`. Positive source allowlist, no mounts, no Node18 NanoID bridge.
- F image pretests3 plus main88: `task-17-frontend-npm-final.log:1070` native0. Retained acceptance binds execution to F `b795fca1931f6bbe90b82eaf58c620f68c29f995`; later reviewed F commits are documentation/evidence changes.
- F lint: `task-17-frontend-lint-final.log:350` 0errors/143warnings; native0 at `:352`.
- F isolated build: `task-17-frontend-build-final.log:82` native0; `task-17-build-config.log:1` records the scratch buildDir, original root, ssrfalse/static configuration.

The independent Task17 report retains the desktop/mobile/narrow/landscape fictional-browser matrix, affected UI confirmation, later1440/390/320 DOM geometry, detector0 primary/79 advisory, and independently rendered/viewed/hash-bound paid/refunded PDF/PNG evidence. This broad review read that evidence and its qualifications; it did not repeat the browser/PDF work or claim new visual inspection. Old Node18 bridge/composite/native-marker qualifications remain historical, not expanded runtime support.

## Recommendations

- Address both Important findings in the permitted single bounded fix dispatch. Preserve current financial provenance, authorization and lock ordering; verify the focused scenarios above rather than reopening all 17 gates. Scope the one re-review to the fixes and their actual integration consequences.
- Keep M1/M2 explicitly deferred, with the inherited audit risk visible. Do not convert recorded local success into live security/provider/device certification.
- Controller should refresh tracked decisions with Rulings53/54 and finalize raw zip/hash retention after this review, while originals remain present. This agreed sequencing is not a missing-evidence defect now; do not delete originals before finalization/verification.

## Declined To Judge

All considered behaviors set aside or not independently established by this review are listed here for explicit executor adjudication, before the verdict:

1. Real email receipt, verification and provider approval: NOT EXECUTED by explicit instruction; local SDK/HTTP-double evidence cannot prove real delivery, deliverability or recipient experience. Email is not live-ready.
2. Real WhatsApp receipt, verification/template approval and provider account readiness: NOT EXECUTED by the same explicit instruction; fictional local transport evidence is not real receipt. WhatsApp is not live-ready.
3. Real provider financial transactions/webhooks, connected Terminal hardware, external TPE execution and actual cash movement: prohibited; judged software reconciliation/declaration semantics only, not physical/provider completion.
4. Physical printing and native device calls/maps navigation/clipboard behavior: prohibited; local rendering/handler contracts do not establish hardware, OS permissions or actual destination behavior.
5. Physical handset/browser interoperability and embedded native PDF preview: retained browser work uses desktop emulation, and headless embedded PDF is explicitly blank/not visually validated. Standalone PDF evidence is a different claim.
6. Production TLS, cookie/site topology, origin allowlists and trusted proxies: no production environment access authorized; local middleware contracts do not validate deployed configuration.
7. Production historic naive-DATETIME basis, timezone/DST conversion and preexisting cash-closure data audit: no original environment/remote database access; commissioning must audit actual history. No automatic historical conversion is endorsed. A suspected suspended/prepaid UTC interaction was considered, but no concrete source/evidence mismatch was established; it is not asserted as a defect.
8. Previously issued legacy staff activation/access links and production credential inventory: no live inventory permitted; the documented audit remains a commissioning prerequisite, not proof that historical links are safe.
9. Deployment-wide aggregate IGN egress budgets, upstream shared tracking limiter and multi-instance production configuration: topology is unavailable. SQL-coordinated quotas and process-local tracking limits were inspected; the latter is not represented as a shared global limiter.
10. Production load/capacity, exhaustive concurrency schedules, soak/reliability and crash-infrastructure behavior: no load campaign or repeated loops authorized. Existing finite real-lock/rollback tests support their specific schedules, not throughput or exhaustive guarantees.
11. Formal accessibility certification or a new visual-polish/device matrix: outside this final integration pass; detector advisories and prior UI evidence are retained, not silently converted into certification.
12. Broad inherited dependency vulnerability exploitability, unrelated legacy API/security debt, framework/toolchain modernization and global lint cleanup: no broad maintenance/security audit commissioned. Audit47/M1 are disclosed risks; no finding claims these are remediated or harmless.
13. Legal/fiscal appropriateness of a restaurant's VAT rate, retention policy or production fee configuration: software snapshot/arithmetic judged; jurisdictional advice and actual configured policy require authorized domain/commissioning validation.
14. Partial/mixed payments, deposits and partial refunds; GPS/ETA/route optimization, marketplaces, delivery-confirmation OTP, SMS/progress notifications and remote Terminal control: explicitly excluded V1 features. Neither Important finding relies on adding these features.
15. Merge/push/remote migration/deploy/activation, and final archive/hash existence before its agreed post-review creation: not performed or authorized here. Retention sequencing is controller-owned; original raw evidence was still present during review.

No other considered behavior was silently dismissed as out of scope. The two Important findings were judged despite task approvals and any absence of a specifically enumerated edge case.

## Assessment

**Technical software assessment: WITH FIXES.** Zero Critical findings, two Important integration defects, and the two retained nonblocking Minor observations. The paired implementation has strong transactional/privacy foundations and substantial qualified local evidence, but these exact heads are not yet software-ready for the complete offered DeliveryV1 workflow until register-origin manual refunds and preassignment restaurant cancellation are resolved and scoped verification is reviewed.

**Merge/deploy authorization: none.** This technical verdict neither authorizes integration nor deployment/activation. Even after the fixes, explicit user/controller authorization and the documented commissioning/retention prerequisites remain separate. Both real email and WhatsApp remain NOT EXECUTED and not live-ready.
