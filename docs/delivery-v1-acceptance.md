# Delivery V1 Local Acceptance

Author implementation and required local command gates are complete; controller Task17 and final broad paired-branch reviews remain pending. Corrected whole frontend/backend npm commands, registered SQL, lint, isolated build and configured Node20 whole-application boot each returned native exit0. Initial failures remain recorded below. This records software preparation on disposable fixtures, not authorization or proof of live activation, supplier receipt, deployment or production data readiness.

## Tested Sources

Review bases: frontend `9d8efd9b5662ff8eb6f60035bf20df14f4fe83d5`; backend `b63e38ea385ede2f85be2dd6774c552abe36b732`. Exact tested executable pair: frontend `b795fca1931f6bbe90b82eaf58c620f68c29f995` / backend `8dbc562efb69a291a09b515b3d1ce17eb1253279`. Frontend includes controller UI wave `98bfb39db922184df3e1aa43ecdad496c2975f32` plus the approved minimal compatibility correction and focused package alias. Backend contains the seven-file Task17 manifest. Commands launched before those source commits with recorded working blobs (frontend HEAD98bfb39/backend HEADb63e38ea); the commits bind identical tested contents, not an invented command-launch HEAD. This subsequent acceptance/decisions commit changes documentation only; the final documentation HEAD is recorded in task-17-report.md without changing the tested executable pair. Controller owns the evidence subtree and reviews; worker owns these two records/package and the explicitly granted source/test hunks. Full native logs and working-content identities remain in the author report and planned retained raw archive.

## Actual HTTP And SQL Journeys

The new registered backend journey test executes actual Express routing declarations, authentication/current-account middleware, controllers, business services, transactions and disposable MySQL8.0.33. Installed provider SDKs/production transports execute against HTTP boundary doubles. No business/payment/authorization service is replaced with a success stub.

1. Guest website checkout accepts the authoritative 2600-cent products plus400-cent fee. A locally signed webhook reconciles the actual Stripe payment/stock producer. Payment leaves kitchen preparation unfinished. Actual preparation transitions and archive precede courier pickup/delivery. The durable dossier and anonymous tracking remain usable after archive; the public projection omits private instructions.
2. A fictional WhatsApp login is verified through actual challenge/session SQL and the production transport HTTP double. A saved address is renewed through the customer API and attached to a POS delivery. The original courier collects3000 cents cash. A later2800-cent physical remittance leaves200 cents due. A forbidden origin is refused; staff/client sessions retain their separate authority. An email challenge/verification also exercises its production adapter through the local HTTP double.
3. One courier picks up two ready orders before either concludes. One is manually paid on an independent TPE; the other is cash-paid, reports an issue and is physically returned by restaurant decision. A deactivated courier's attempted collection is refused without a collection row. Issue/return creates zero refunds. The restaurant explicitly confirms full original-courier and independent-card refunds; courier self-refund is refused. The original-source cash return reduces only the still-held source; external-card refund remains a restaurant declaration, providerVerified=false, with no cash movement.

R5 crosses the repeated Europe/Paris02:30 hour using distinct UTC00:30/01:30 instants. The first actual Z contains four sales/120 euros. A later register refund returns the full3000 cents after that closure and leaves the original courier's200-cent debt intact. The later period contains zero orders/revenue/VAT,2800-cent physical receipt and3000-cent register outflow. Prior persisted Z and original sale/VAT/detail/stock rows remain byte-for-byte unchanged. Same-key business and checkout replays add no sales, dossier, stock, remittance or refund. The original courier's replay after unassignment is correctly404 because current authority precedes replay. A replayed archived Stripe checkout returns409 without another provider intent.

The Task2 deferred signer issue is addressed by a lazy operation-boundary preflight: missing/short signer configuration now refuses before any geocoder call. RED observed one supplier call; GREEN observed zero. Loading legacy/disabled routers without the secret remains valid.

## Commands And Limits

Set ENV_FILE=NUL and the explicit local disposable DELIVERY_TEST_DATABASE_URL independently before every SQL command. The harness creates/drops only random smarteat_delivery_test_<nonce> schemas, never the supplied catalog or application database. Full final native exits are propagated and embedded in retained logs. Do not substitute historical prefix/suffix evidence for a successful complete command.

Actual backend PowerShell setup, repeated independently before each command in the backend worktree (the password below is solely the authorized disposable fixture):

```powershell
$env:ENV_FILE = 'NUL'
$env:DELIVERY_TEST_DATABASE_URL = 'mysql://root:local_delivery_test_only@127.0.0.1:33319/mysql'
$env:JWTKEY = 'delivery-task17-disposable-jwt'
$env:PUBLICIMAGEPATH = "$env:TEMP/task17-disposable-images"
Remove-Item Env:TASK4_TEST_FILTER,Env:TASK5_REVIEW_FILTER,Env:TASK7_FILTER,Env:TASK7_REFUND_FILTER -ErrorAction SilentlyContinue
```

Complete backend commands actually invoked with that setup: `npm.cmd test` and `npm.cmd run test:delivery:db`. Focused direct commands were `node test/delivery-journey.integration.test.js` and `node test/delivery-runtime.integration.test.js` with explicit ENV_FILE=NUL/disposable SQL URL; the journey supplies its own fixture JWT/customer/signer values and the runtime supplies only explicit disposable container variables. Narrowed signer/legacy assertion files also ran directly. Every logged command captures `$nativeExit=$LASTEXITCODE`, appends its value and exits with that value. Focused convenience scripts are `test:delivery:journey` and `test:delivery:runtime`; do not interpret their existence as an additional invocation.

| Gate | Current Result |
| --- | --- |
| Backend npm.cmd test | Corrected final whole command native0, ALL66 files in ONE invocation; initial native1 retained |
| Backend unexecuted suffix continuation | Native0, remaining30/30 files pass separately; not whole npm green |
| Backend npm.cmd run test:delivery:db | Native0, ALL17 registered files in ONE unfiltered invocation, including final strengthened journey revision |
| node test/delivery-journey.integration.test.js | Native0 before final checkout-replay strengthening; final revision covered by registered SQL command |
| node test/delivery-runtime.integration.test.js | Native0: actual node:20-alpine whole application/listener/API, Node20.20.2/MySQL8.0.33, no Nano ID bridge |
| Frontend npm.cmd test | Corrected whole command native0: original3 image-library pretests plus ALL88 registered main files in ONE invocation; initial native1/composite retained separately |
| Frontend npm.cmd run lint | Native0,0 errors/143 warnings, stale Browserslist retained |
| Frontend npm.cmd run build-local with isolated buildDir | Corrected whole build native0 on actual corrected source; initial pre-fix build separately native0; actual config loader native0 |

Final frontend PowerShell setup uses `ENV_FILE=NUL`, `ENV=local` and, for npm tests, the same disposable JWTKEY/PUBLICIMAGEPATH values above. Actual complete commands in the frontend worktree:

```powershell
$env:ENV_FILE = 'NUL'
$env:ENV = 'local'
$env:JWTKEY = 'delivery-task17-disposable-jwt'
$env:PUBLICIMAGEPATH = "$env:TEMP/task17-disposable-images"
npm.cmd test
npm.cmd run lint
npm.cmd run build-local -- --config-file .superpowers/sdd/2026-10-16-delivery-management/task-17-build.config.js --dotenv false
```

Each command independently captures/appends `nativeExit=$LASTEXITCODE` and propagates it; the list above is documentation, not a chained substitute for those recorded invocations. The approved scratch config imports unchanged actual `nuxt.config.js` and overrides ONLY buildDir to `.superpowers/sdd/2026-10-16-delivery-management/task-17-nuxt-build`. Actual Nuxt2.15.6 config-loader smoke proves frontend rootDir/ssr=false/static and the override. Existing build-local OpenSSL legacy behavior remains. No real .env load, additional UI server, live .nuxt build or stop of PID6024/port8097 occurred.

Final native0 evidence, relative to `.superpowers/sdd/2026-10-16-delivery-management/`: `task-17-backend-npm-final.log` (66 files), `task-17-backend-delivery-db.log` (17 files), `task-17-runtime-iteration2.log`, `task-17-frontend-npm-final.log` (3+88 files), `task-17-frontend-lint-final.log` and `task-17-frontend-build-final.log`. All command sessions are collected; no pending worker gate or duplicate run. F lint retains143 warnings/0errors and stale Browserslist; build retains1.34MiB/1.91MiB assets and3.26MiB entrypoint warnings. No dependency upgrade, warning cleanup or size refactor.

Initial whole backend npm native1 stopped at file36's obsolete two-argument service-point regex after35 passing files. Its remaining30-file suffix separately returned0: composite65/66 is NOT a whole pass. The first continuation launch failed1 before tests due to PowerShell quoting. Controller approved only the assertion requiring existing servicePointId/shop AND the current omitNewDeliveries privacy option; focused file0, then corrected full66-file npm0. Actual route/SQL privacy remains authoritative; no production modernization.

Initial whole frontend npm native1 had3/3 pretests and76/88 main files pass before two unaccented preparation labels failed the copy guard; the separately executed suffix had10/11 pass and the exhaustive search registry/class failure. That initial86/88 composite is NOT whole green. Controller then granted exactly the two label accents, existing dispatch se-search-field class and actual registry entry, with all assertions preserved/no global CSS edit. Focused guards each0 (`task-17-frontend-compatibility-green.log`), followed by corrected complete npm/lint/build each0. Earlier successful `task-17-frontend-build-local.log` covers pre-fix source only; the final build log covers the corrected source. Controller's original five UI/test files remain untouched by the worker.

The runtime copies only positive-allowlisted tracked JS/SQL/package/index files into an ephemeral container, with no mounts, env files, uploads, .git or host node_modules. Linux npm ci uses the existing lockfile. Actual index.js waits for its disposable database, listens and serves authenticated disabled-delivery availability and absent-channel booleans without provider/delivery secrets. It uses the already-migrated disposable helper schema, not a production compose/empty-database rollout. Its temporary container, context and schema are removed. Existing local servers/MySQL fixture/Docker context remain intact.

Raw failures remain evidence: fixture preparation transition/COUNT type/current-owner replay corrections, the HTTP double's missing secureConnect lifecycle and explicitly stopped hung child native-1, and an initial runtime-port race native1. The corrected double now supports fresh/kept-alive sockets and bounded requests. These are harness limitations/corrections, not production payment fixes or real TLS verification. Runtime npm audit reported47 inherited dependency findings; dependencies were not upgraded.

Earlier tasks retain their original exact test revisions, composite prefix/suffix results, missing embedded-native-marker qualifications and Node18 actual-dependency import-cache bridge limits. Those bridge runs do not prove unbridged production Node18 boot. Current configured Node20 whole-app evidence is separate. Preserve ALL ledger Rulings, reasons/costs and final deferred dispositions in delivery-v1-decisions.md before scratch cleanup.

## Browser And Documents

Actual controller outcomes, qualifications and stable retained artifacts: [local evidence README](delivery-v1-evidence/2026-10-18/README.md). Chrome155 headless/Playwright Core1.64.1 used fresh fictional API route-double contexts at1440x1000,390x844,320x640 and844x390 landscape. Mobile is emulated. Final document16/courier recovery8/remaining edge6/legitimate arrow navigation plus scrolled detail2 capture batches each reported native0, no assertions/page errors/horizontal page overflow; earlier mobile financial dialogs9 captures did likewise. Counts are batches with replaced filenames, not a claimed unique screenshot total. Complex stale-authority, exact-key, ambiguous-address, suspension and invalid-rule boundaries were additionally automated but NOT all browser-clicked. Cashier settings is disabled and account controls absent; not every tab disappears.

The single UI source wave98bfb39 fixes resource-scoped read recovery, missing history fulfillment prop and the detail fee-inclusive total hidden at zero discount. Main retained actual failing tests before correction; final focused courier47/47 and receipt13/13 each ran on Node22.13.1/18.20.8 native0, scoped lint0/no violations. Worker does not alter these five source/test files.

The compatibility follow-up search geometry was checked once on the actual corrected DOM at1440/390/320 pixels: native0, input widths766.65625/310/240 pixels, field within viewport, nonzero input, no horizontal overflow/pageErrors/unknownAPI. Raw `ui-search-geometry.log` and `ui-search-geometry.json` are retained with the controller reports. Representative screenshots predate this tiny follow-up; no new screenshot/detector/general-polish loop or final review approval is implied.

The [single detector JSON](delivery-v1-evidence/2026-10-18/ui-detector.json) covers29 changed Vue files: native0, primary0, advisory79 (35font/41color/3radius). Incumbent token/compact-heading debt is retained, not a zero-warning or full accessibility certification. No suppression, redesign or repeated detector.

Harness qualifications: one-hour fake JWT avoids the earlier timer overflow; Vuetify selection slots/arrows are clicked; quote/order fixtures include actual required shop/order reference fields; text matching is case-insensitive and capture starts at window top. A direct clipped-tab click caused native/Vuetify double scrolling; legitimate arrow navigation was verified. Detail uses a scrollable inner panel, whose actual scrolled capture exposes fee/VAT above the footer. Some earlier full-page dialog captures place a fixed header partway down after input auto-scroll; this is not app geometry. Interrupted/failed earlier batches are retained separately. Only expected Google/MDI static fonts were allowed externally without Referer; Stripe/provider calls were blocked/doubled. No phone/maps/OS clipboard, real payment, cloud/physical print or provider-send action occurred.

Thirteen retained representative screenshots (not a claim every complex boundary was clicked):

| State | Relative Evidence Path |
| --- | --- |
| Account desktop | [account-login-desktop.png](delivery-v1-evidence/2026-10-18/screenshots/account-login-desktop.png) |
| Address book mobile | [addresses-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/addresses-mobile.png) |
| POS quote mobile | [pos-delivery-quote-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/pos-delivery-quote-mobile.png) |
| Dispatch desktop | [dispatch-desktop.png](delivery-v1-evidence/2026-10-18/screenshots/dispatch-desktop.png) |
| Courier network recovery | [courier-network-recovered-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/courier-network-recovered-mobile.png) |
| Courier landscape | [courier-landscape.png](delivery-v1-evidence/2026-10-18/screenshots/courier-landscape.png) |
| Explicit refund | [refund-dialog-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/refund-dialog-mobile.png) |
| Terminal correction | [terminal-correction-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/terminal-correction-mobile.png) |
| History delivery receipt | [history-delivery-receipt-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/history-delivery-receipt-mobile.png) |
| Scrolled fee/VAT detail | [order-delivery-vat-mobile-scrolled.png](delivery-v1-evidence/2026-10-18/screenshots/order-delivery-vat-mobile-scrolled.png) |
| Narrow settings navigation | [settings-narrow-arrow-navigation.png](delivery-v1-evidence/2026-10-18/screenshots/settings-narrow-arrow-navigation.png) |
| Active tracking | [tracking-active-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/tracking-active-mobile.png) |
| Remittance-only Z | [reports-remittance-only-mobile.png](delivery-v1-evidence/2026-10-18/screenshots/reports-remittance-only-mobile.png) |

The native embedded PDF iframe is BLANK in headless Chrome; its visual preview is NOT validated. Task15 produced actual fictional PDFs with the existing receipt generator; both final raster PNGs were visually inspected and independently bound to hashes. Accepted stable artifacts are [paid PDF](delivery-v1-evidence/2026-10-18/pdf/delivery-paid.pdf), [paid raster](delivery-v1-evidence/2026-10-18/pdf/delivery-paid-1.png), [refunded PDF](delivery-v1-evidence/2026-10-18/pdf/delivery-refunded.pdf) and [refunded raster](delivery-v1-evidence/2026-10-18/pdf/delivery-refunded-1.png). This is actual standalone PDF visual evidence, not a passed native embedded preview, renderer-version/text-only assertion or physical printing. No extra browser PDF integration fix was introduced.

Controller owns the evidence subtree and will prepare raw-evidence.zip and sha256.json AFTER independent/final reviews to retain the newest ledger/reports/logs/screenshots. They are planned retention artifacts, not yet-present or completed checks at this author stage. Existing scratch/raw evidence is not deleted. [Decisions and evidence limits](delivery-v1-decisions.md) retain ALL current ledger Rulings/reasons/costs and historical qualifications.

## Commissioning Prerequisites

Both real email receipt/verification and real WhatsApp receipt/verification are NOT EXECUTED by the user's explicit instruction to prepare without sends. Configured channel booleans, provider HTTP acknowledgements/doubles and public documentation do not prove end-user receipt. No recipients, credentials or real sends are requested during preparation. No SMS or delivery-progress notifications are added. Any real financial-provider transaction/refund, physical/cloud printing, remote migration, staging/production deployment, push or merge is NOT EXECUTED and requires its own authorization.

Before enabling a restaurant, operations must:

1. Review/apply additive migrations through an approved rollout, retain compatible fee-aware frontend/backend versions, and back up/validate the actual environment separately. No remote migration is run by this acceptance.
2. Prove same-connection UTC SQL readiness for new delivery activation/financial periods. Audit and reconcile the historical basis of naive financial DATETIME cutoffs/archive timestamps through an approved procedure. Current UTC does not prove old records were UTC. Never automatically SET time_zone, convert history or rewrite stored snapshots. Missing/disabled delivery with no persisted financial history retains ordinary session-time Z behavior; any accepted cash/external-card/remittance/correction/refund history retains the UTC requirement even after suspension/settlement.
3. Configure server-only independent CUSTOMER_AUTH_SECRET and DELIVERY_TOKEN_SECRET plus explicit allowed origins/trusted proxies; keep provider secrets/identifiers out of Nuxt, browser state, logs and commits. Multiple OTP instances require the same SQL quota store AND auth secret. Actual TLS/proxy/origin/cookie Secure/SameSite behavior must be verified in the deployment topology; arbitrary third-party storefront domains are not assumed compatible.
4. Validate central Mailjet sender and Meta business permissions/phone/template/language and a configured supported Graph version. In later authorized commissioning, receive and verify codes on BOTH channels using consented test destinations. An approved authentication template uses the same OTP in body and copy-code button. Do not treat supplier acceptance as receipt.
5. Validate aggregate IGN egress quota: the40-per-second conservative shared budget coordinates one SQL store, not independent staging/production databases sharing an IP. Coordinate the aggregate budget before activation. Private entry instructions must never leave for geocoding. Earlier live IGN evidence covers only the documented public-address cases, not customer destinations or full coverage.
6. Configure/verify an upstream shared tracking limiter. The local30/IP/60s limiter has10000 live buckets and fail-closed saturation, but is process-local and reset/multi-worker budgets are not guaranteed. Tokens expire at the earliest stored/created+30d/current or immutable correction closure+7d ceiling. Rotation replay returns no raw URL; lost-response recovery requires a separate explicit renewal.
7. Audit/handle any outstanding historically issued legacy role-changing activation links under current active-admin authority. Current registration/first-admin bootstrap is direct/active and the in-repo legacy token creator/mailer is commented; this does not prove compatibility for old issued links. No production tokens/data were inspected here.
8. Configure each restaurant's verified origin, radius, complete fee bands, minimum/free threshold and explicit fiscal rate/policy before activation. Delivery is disabled by default. No discussed/example price or fiscal rate becomes production configuration automatically.

## Suspension And Recovery

An authorized restaurant administrator suspends new deliveries through the existing settings update with the current revision and enabled=false. Reload the authoritative settings after conflict. Suspension blocks new acceptance without erasing dossiers, accepted fee/address snapshots, engaged payment reconciliation, pickup/delivery, explicit incident/refund resolution, remittances or remaining debt. Keep a compatible fee-aware application running to complete those operations.

For an unavailable/deactivated courier, the restaurant retains missions/debt and explicitly resolves/reassigns physical custody through the existing issue workflow; no account deletion, debt transfer, automatic refund/restock or silent offline success is introduced. Count actual cash and record the actual handover; shortages remain due until an authorized source-linked, reasoned correction. Full manual refunds remain explicit restaurant confirmations with physical return source; independent TPE declarations are not Stripe confirmation.

A rollback begins by suspending new deliveries. Preserve new tables/journals and old immutable closures. Never roll back to code that charges or refunds an engaged order while ignoring its accepted delivery fee. Restore/roll forward only through an approved operations procedure after reconciling in-flight missions/payments/custody. This document does not execute deployment, destructive migration or data restoration.
