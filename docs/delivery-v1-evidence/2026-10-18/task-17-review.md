# Task 17 Independent Review

## Spec Compliance

Spec compliant for the amended local-preparation scope. No missing, extra or misunderstood requirement that blocks this task gate was found.

- Reviewed F `9d8efd9b5662ff8eb6f60035bf20df14f4fe83d5` -> `9fc355799e1124cc257a9e647f0933aadf04389c` and B `b63e38ea385ede2f85be2dd6774c552abe36b732` -> `8dbc562efb69a291a09b515b3d1ce17eb1253279`. Read each supplied package once, in contiguous portions: frontend final package only, five commits; backend package, one commit. Read the handoff, amended brief, complete author report and installed task-reviewer template.
- The backend adds the required actual-router/SQL acceptance journeys, registers them in the full SQL command, adds the configured runtime check and names-only environment example, and narrowly fixes signer preflight plus the approved legacy privacy assertion. Evidence: B `package.json:8`, `src/modules/m_deliveryQuotes.js:33`, `test/delivery-quotes.test.js:119`, `test/service-point-cash-register-detail.test.js:16`; scratch `task-17-backend-delivery-db.log:7`, `:9`, `:12`, `:13`, `:541`, `:542`, `:543`.
- Controller UI fixes are included: resource-specific read recovery, actual history fulfillment prop and the fee-inclusive detail summary at zero discount. Worker compatibility changes retain the original guards and shared design pattern. Evidence: F `store/courier.js:74`, `:148`, `pages/history/ticket/_id.vue:28`, `pages/orders/detail/_id.vue:144`, `components/delivery/DeliveryDispatch.vue:8`, `pages/livraison/suivi.vue:41`, `test/design-system.test.js:97`.
- Acceptance separates local software completion from commissioning and preserves suspension, custody, fiscal-history, UTC-transition and legacy-link prerequisites. Evidence: F `docs/delivery-v1-acceptance.md:109`, `:123`; `docs/delivery-v1-evidence/2026-10-18/README.md:5`, `:75`, `:81`. Both real OTP receipts remain NOT EXECUTED. No live/provider/deployment claim is accepted by this gate.
- The current decisions snapshot preserves 52 rulings and the historical qualifications. The newer binary-artifact ruling refresh and raw archive/hash manifest remain explicitly controller-owned follow-up before scratch cleanup; their absence now is not a defect. Evidence: F `docs/delivery-v1-decisions.md:3`, `docs/delivery-v1-evidence/2026-10-18/README.md:81`; scratch `progress.md:332`.
- Cannot independently establish production TLS/origin/cookie behavior, actual receipts, historical production timestamps/activation links, deployment-wide budgets or activation readiness from this task diff. These are documented external prerequisites, not local successes. Evidence: F `docs/delivery-v1-acceptance.md:107`.

## Strengths

- Financial acceptance uses real producers and checks explicit register/original-courier/external-card refunds, current courier authority, archived checkout replay, unchanged stock/fiscal snapshots, a frozen prior closure and a later physical-only period. The registered final SQL run records the strengthened journey and independent refund/report regressions, rather than relying on UI doubles: scratch `task-17-backend-delivery-db.log:7`, `:13`, `:541`, `:548`, `:552`, `:557`, `:573`.
- Read recovery preserves unrelated resource failures and command uncertainty, with stale-response fencing and regressions. Actual template-fragment tests cover the history chip and zero-discount total: F `store/courier.js:74`, `:148`, `test/courier-mobile.test.js:177`, `test/delivery-receipts.test.js:69`.
- Runtime source copying is positively allowlisted, uses an ephemeral named container without mounts, and tests the actual application on Node20/MySQL8.0.33 without the Node18 bridge. Cleanup is scoped to generated resources: B `test/delivery-runtime.integration.test.js:22`, `:32`, `:66`, `:84`; scratch `task-17-runtime-iteration2.log:1`, `:29`.
- Historical failed/composite runs, inherited warnings and the blank headless PDF iframe remain honestly qualified. The scoped binary attributes fit the PDF evidence; the retained PDF/raster hashes match the independently accepted Task15 originals: F `docs/delivery-v1-evidence/2026-10-18/.gitattributes:1`, `README.md:75`; scratch `task-15-review.md:36`.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

None.

### Minor (Nice to Have)

1. **Carried diagnostic hygiene, nonblocking.** Scratch `task-17-backend-delivery-db.log:249`, `:261`, `task-17-frontend-lint-final.log:350`, and `task-17-frontend-build-final.log:67` retain packet-order/legacy output, 143 lint warnings, stale Browserslist and size warnings. They reduce signal in validation output but do not contradict the recorded native successes. Keep the existing deferred maintenance disposition; any later cleanup should capture/assert only expected fixture diagnostics and preserve unexpected failures. Runtime audit47 at `task-17-runtime-iteration2.log:12` remains disclosed inherited risk, not a newly established Task17 vulnerability or a security certification.
2. **Bound the final runtime API probes.** B `test/delivery-runtime.integration.test.js:72` and `:75` call fetch without an explicit timeout, unlike the bounded readiness request at `:60`. If an endpoint accepts a connection but stops responding, the smoke can outlast its intended readiness budget and postpone cleanup. Add an AbortSignal timeout to these two probes in a later focused tooling change. The retained successful run answers current behavior; no repro or suite rerun was necessary for this small robustness observation.

## Evidence Verification

F/B below denote the paired worktrees; scratch denotes this review directory. These were evidence reads, not new test executions.

| Required gate | Direct evidence checked |
| --- | --- |
| B complete npm, 66 registered files | `task-17-backend-npm-final.log:3`, native0 at `:888` |
| B complete SQL, 17 registered files | `task-17-backend-delivery-db.log:3`, final report PASS at `:573`, native0 at `:574` |
| Configured whole application | `task-17-runtime-iteration2.log:29`, Node20.20.2/MySQL8.0.33, final native0 at `:31`; log-follower exit at `:30` is separately qualified |
| F original image pretest and 88-file main chain | `task-17-frontend-npm-final.log:7`, `:14`, native0 at `:1070` |
| F lint | `task-17-frontend-lint-final.log:350`, 0 errors/143 warnings; native0 at `:352` |
| F corrected isolated build-local | `task-17-frontend-build-final.log:3`, native0 at `:82`; actual isolated config in `task-17-build-config.log:1` |
| Signer RED/GREEN | `task-17-signer-red.log:14`, actual1/expected0 and native1 at `:18`; GREEN native0 at `task-17-signer-green.log:6` |
| Controller courier/receipt RED/GREEN and Node18 | `ui-courier-red.log:276`, `ui-documents-red-corrected-harness.log:44`; `ui-courier-green.log:257`, `ui-documents-green.log:25`, `ui-courier-node18-final.log:257`, `ui-documents-node18-final.log:25` all final native0; courier47/47 and receipt13 PASS entries visible |
| Controller scoped lint | `ui-fix-lint-final.log:12`, native0 with Browserslist notice and no lint violations |
| Browser confirmation | `ui-confirmation-documents.log:17` (16), `ui-confirmation-courier.log:9` (8), `ui-edge-remaining.log:7` (6), `ui-confirmation-scroll.log:3` (2), `ui-dialogs-mobile.log:10` (9); each final native0, zero failures/page errors |
| Corrected search geometry | `ui-search-geometry.log:1`, `:2` and `ui-search-geometry.json:1`; 1440/390/320 widths, positive input dimensions, no overflow, empty pageErrors/unknownApi |

Read-only visual inspection of retained `courier-network-recovered-mobile.png`, `history-delivery-receipt-mobile.png` and `order-delivery-vat-mobile-scrolled.png` confirms the recovered courier state without a stale failure banner, Livraison chip, and 24-euro total with separate 4-euro fee/VAT and no zero-discount line. The history image also visibly retains the declared blank embedded PDF preview. No new browser session or PDF render was run.

Get-FileHash on the four retained PDF/PNG artifacts matched all four accepted hashes recorded at `task-15-review.md:36`: paid PDF `89125DE8B8854A8B272EC7C6AC755DF72A2D29FC84E087683FF57C3ACE993C04`; refunded PDF `CA3169BF966BE517B81E02317AEEDB302D4825BBD9E0211ABC0030F3E2AF3870`; paid PNG `A9F4DCE692EC9A95E8B2DEE7ADA410E342B8223625744AB8CB44DA819B1DE27D`; refunded PNG `FCE44AC9F76DBE8F639AE364727CF6A717EAFB509CCAF7F20D758F87C454E88B`. Committed-byte equality and current diff-check0 are supplied controller evidence; this reviewer issued no git command to regenerate them.

## Focused Context Checks

- **Lazy signer compatibility:** checked the unchanged codec in B `src/helpers/deliveryAddress.js:18`. Secret validation occurs inside sign/verify; the new preflight at the operation boundary therefore preserves lazy construction and fails before geocoder work. One focused codec check; initial guessed filename was absent, then the actual definition was located.
- **Disposable database safety:** checked B `test/helpers/deliveryDatabase.js:9`, `:48`, `:135`. It requires an explicit loopback test URL, omits the supplied catalog, generates a random schema, and guards destruction by its generated schema pattern. No database operation was executed by this reviewer.
- **Summary arithmetic integration:** checked only the unchanged computed consumers in F `pages/orders/detail/_id.vue:708`, `:893`, `:968`; they obtain the accepted charge and saved full subtotal, so the newly visible summary consumes the existing fee-inclusive values.
- **Shared error compatibility:** checked the unchanged command/error call sites around F `store/courier.js:193`, `:244`, `:301` and the freshness mutation consumers around `:93`. These call sites lie outside the changed error hunk; the purpose was to verify that recovering a read cannot erase unresolved command feedback or bypass existing mission fencing. No full changed-source reread was made. No cut-off hunk required a separate full-function reread.
- `workspace_fs` was attempted once on the paired package and denied access outside its two allowed original workspaces; shell read fallback followed the supplied worker context. No nested agents, model override, source/index/HEAD/branch mutations, suite reruns, focused repro, provider actions or remote operations occurred. Only this requested scratch report was written.

## Assessment

**Task quality: Approved.** Zero Critical, zero Important, two Minor observations. The amended task has concrete implementation and matching local evidence, including the controller UI work; its documented commissioning and post-review evidence-retention obligations remain distinct from this approval. This is the Task17 gate, not the later broad paired-branch review or live activation approval.
