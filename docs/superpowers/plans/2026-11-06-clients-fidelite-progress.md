# Execution ledger — plan: 2026-11-06-clients-fidelite-unifies.md

Design and execution authorized by user: "go", 6 November 2026.

- Ruling: execute in the two existing feature-branch checkouts and preserve all previous dirty changes; do not move the user's working environment or commit unrelated work.
- Ruling: "go" authorizes the implementation following the reviewed design; use native execution with one final independent review instead of requesting another execution-method confirmation.
- Ruling: historical contacts remain readable using stable `historical:<hash>` identifiers before the separately prepared import is applied; no hidden writes on GET. After import, identifiers resolve through stored contact mappings.
- Pre-flight: Task 2 consumes projection/selection/CSV exports from Task 1; Task 3 consumes the Task 2 API envelope and retains existing loyalty mutation endpoints. No contract conflict identified.

Task 1: complete. Projection tests observed RED then GREEN; six domain tests cover matching, legacy contacts, aliases, permissions and CSV.
Task 2: code complete. Service/controller tests observed RED then GREEN; migration, audit mappings and explicit dry-run/apply CLI prepared. SQL integration test exists and skips without an explicit disposable URL. Docker Desktop engine could not start; no application DB credentials or real migration used.
Task 3: code complete. Common Vue/Vuetify directory, detail, protected corrections, cached programme and legacy redirect implemented. Store and rendered-UI tests pass. Actual local browser fixture verified directory, loyalty detail, preserved programme draft and responsive widths 1440/390 with no overflow or uncaught exception.
Task 4: complete within the approved code/local-validation scope. Fresh frontend `npm test`, backend `npm test`, frontend `npm run lint` (0 errors, existing warnings), and `npm run build-local` all exited 0 after the review fixes. Existing backend `npm run test:loyalty` also passed. MySQL integration remains explicitly not executed: no disposable database available; no application database credentials used by that check.

Final review: independent reviewer identified three material issues, each reproduced by a failing regression test before the fix.
- Fixed P1 residual-role permissions: backend staff whitelist [0,1,4,5] and frontend request guard; routes/store tests RED→GREEN.
- Fixed P2 durable aliases after hidden last archive: persisted contacts project even without visible purchases; synthetic and former numeric IDs resolve without restoring hidden purchases; service test RED→GREEN.
- Fixed P2 cancelled first programme load: initially closed detail no longer resets programme state; cached programme resumes missing draft, loading generations prevent stale completions, visible retry fallback; real Vuex/component test RED→GREEN.
- Final: Ruling: MySQL execution/concurrency remains explicitly unverified because the local Docker engine is unavailable; provide the migration/integration test and keep real DB untouched. Cost if SQL environment differs: installation must run the disposable integration check before applying the migration.
- Final: Ruling: production-volume performance not benchmarked; retain server-side projection of minimal archive columns, pagination and filtered CSV. Cost if history is exceptionally large: SQL aggregation may be needed later; no performance claims are made.
- Final: Ruling: browser screenshots use labelled fictitious data and actual Vue/Vuetify components, not a signed-in production session. Scope verified: layout and fixture interactions only; no production end-to-end claim.
- Final: Ruling: prior QR/receipt/delivery changes are outside this review and preserved; existing suites still exercise them.
- Final visual review: ship for inspected desktop/mobile directory and client detail, after settled-animation recapture. No material visual issue and no DESIGN.md/token change required. Preview contains labelled fictitious data; programme draft and membership interactions verified in an actual isolated local browser.
- Final verification logs: `.codex-tmp/unified-clients-tests.log`, `unified-clients-backend-tests.log`, `unified-clients-loyalty.log`, `unified-clients-lint.log`, `unified-clients-build.log`. Mechanical design detector returned an empty finding list. No deferred minor from the independent reviews.
- Delivery: preserve changes in the user's existing feature checkouts for review; no push, merge, application migration or import against real data.

## Docker staging publication — 6 November 2026

Subsequently authorized by the user: « met en ligne sur staging avec docker ».

- Integrated the requested changes on top of the latest `origin/staging` in separate release checkouts; retained the original working copies and unrelated staff/delivery edits.
- Preserved the newer Wallet card editor and notification composer in the unified programme, including selecting a notification recipient from a client card. Regression verified RED then GREEN.
- Frontend release: `74ecb26fe6374b73f40e4ad8ecd5cb98131ddcf6`; backend release: `766483c8f3594f5f8b3584fe299f0cd66a29c3aa`. Both pushed to staging without force.
- Fresh release checks: frontend/backend `npm test`, frontend/backend loyalty suites and frontend lint passed. Frontend generated successfully inside the staging Docker image (Node 18). A local build with shared linked dependencies was replaced by this Docker validation because its generated paths resolved into the source checkout.
- The previously deferred MySQL integration was executed successfully in an isolated temporary MySQL 8 Docker container: schema migration, concurrent/idempotent imports, tenant foreign keys, aliases and preservation of archives, identities and points. Application credentials were not used by that test.
- Staging database and environment backup saved on the server at `/home/vscodeserver/smarteat-backups/clients-20261106-214120`, with restricted permissions.
- Existing Compose deployment workflows succeeded: backend run `42299193278`, frontend run `42299227664`. Runtime hashes match the releases. Wallet certificate mounts preserved; database healthy.
- Migration `20261106120000` applied. Live authenticated directory, client detail and CSV export returned 200; unauthenticated directory returned 401. Read-only verification used a temporary short-lived token without recording it or printing customer data. No bulk historical import was applied.
- Public checks: `https://staging.smarteat.fr/clients/` returned 200; `https://api-staging.smarteat.fr/baseurl/api/v1/testapi` returned 200; public clients endpoint returned 401 as expected.
- Evidence: `.codex-tmp/staging-frontend-release-tests.log`, `staging-backend-release-tests.log`, `staging-release-loyalty.log`, `staging-backend-loyalty.log`, `staging-release-lint.log`, `staging-mysql-integration.log`, `staging-docker-build-result.log`, `staging-backup.log`, `staging-verification.log`. Temporary MySQL/build containers removed and the separate build dependency volume removed.
