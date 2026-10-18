# Delivery V1 Local Evidence

## Boundaries

Browser target: `http://127.0.0.1:8097`, isolated Nuxt worktree. Chrome 155
headless / Playwright Core 1.64.1, fresh contexts with fictional API route
doubles. Viewports: desktop 1440x1000, mobile 390x844, narrow 320x640,
courier landscape 844x390. Mobile is emulated, not a physical handset.
These screenshots prove rendered client states, not backend authorization,
supplier delivery, actual cookie deployment or financial settlement.
Actual router/SQL/runtime checks are documented in `../../delivery-v1-acceptance.md`.

Only expected static Google/MDI fonts were permitted externally, without a
Referer. Stripe/provider calls were blocked or doubled. No real message,
payment/refund, physical print, call, map navigation or OS clipboard action.
Names, contacts, addresses and PRIVATE_QA markers are fictional fixtures.

## UI Result

One initial inspection matrix, one source fix wave, one affected confirmation
round. Production fix: `98bfb39` (paired backend source recorded in acceptance).
The three observed defects were reproduced by failing tests before correction:

- Courier read failure cleared only after the corresponding successful fresh
  read, without hiding another resource failure or unresolved command error.
- History delivery header now receives the fulfillment type.
- Delivery order detail shows the fee-inclusive total with zero discount.

Final focused tests: courier 47/47 and receipt 13/13 under Node 22.13.1 and
18.20.8, native exit 0; scoped ESLint native 0, no violations. Complete final
commands and source identities belong to the acceptance record.

The later complete npm command exposed two unaccented preparation labels and
the dispatch search missing the incumbent shared class/exhaustive registry.
Those minimal compatibility changes followed existing failing guards, without
weakening them or changing global CSS. The screenshots predate that follow-up;
an actual DOM-only check of the corrected search at1440/390/320 pixels passes
native0, no overflow/page errors/unknown API, input widths766.66/310/240 pixels.
No new detector or general screenshot/polish round. Corrected complete command
results and final source identities are recorded separately in acceptance.

Final browser document batch: 16 captures; courier recovery: 8 captures;
remaining account-link/cashier/terminal/narrow states: 6 captures; legitimate
narrow-tab navigation and scrolled detail: 2 captures. Each completed batch
reported native 0, no failed text assertions, page errors or horizontal page overflow.
The earlier mobile financial-dialog batch had 9 captures with the same result.
Earlier interrupted batches and assertion failures are retained, not presented
as complete passing runs. Latest screenshots replace earlier same-name captures.

Coverage includes account login/pending/failed/unconfigured/link, address book
and edit, POS quote/reconfirmation, site guest/saved selection, dispatch/detail,
couriers, partial/stale remittance, explicit manual-refund dialog/result, UTC
settings refusal, courier manual-card/issue/network recovery, tracking/expiry,
fee/VAT detail/history and remittance-only Z. Complex stale-authority, exact-key
recovery, ambiguous address, suspension and invalid-rule boundaries additionally
have automated component/HTTP/SQL coverage; not every such boundary was clicked
in a browser. Cashier settings tab is disabled and account-management controls
are absent, not a claim that all tabs disappear.

## Detector And Qualifications

The detector ran once on 29 changed Vue files: native 0, zero primary findings,
79 advisory (35 typography, 41 colors, 3 radii). This is not a zero-warning audit.
Advisories reflect compact delivery headings and incumbent POS styles against
the documented ramp/tokens. No design-system rewrite, suppression or repeated
detector run. Existing style debt remains outside this bounded feature pass.

Harness corrections: one-hour fake JWT avoids browser timer overflow; Vuetify
selection slots/arrows are clicked rather than readonly/clipped inputs; quote
fixture includes the actual shop ID; order fixture includes ordernumber; text
checks are case-insensitive; screenshots start at window scroll top. Direct
automation of a clipped tab caused native/Vuetify double scrolling; legitimate
arrow navigation shows the selected narrow tab. Detail has a scrollable inner
panel; the scrolled capture proves fee/VAT reachability above its footer.

The native embedded PDF iframe is blank in headless Chrome: its visual preview
is NOT validated. The actual generated paid/refunded PDFs were independently
raster-rendered and inspected at Task15; those PDF/PNG files are retained here.
Some old full-page dialog captures place a fixed header partway down the image
after input auto-scroll; do not treat that screenshot artifact as app geometry.

## Final Review And Retention

All17 task gates and the broad review/one fix dispatch/one scoped re-review
are complete. Final I1/I2 are ADDRESSED, no new blocking finding. Final tested
code is Ff0d57990e5c7e7afe1f3edf50f17db0ffabe0820 and
Bb2e3ede2636a5de19005ff1966a11211f4dab5a7; fullF3+88/B66/SQL18/runtime20/
lint/build native0 evidence is in final-fixes-report.md. Original images remain
BEFORE-fix visuals, not new screenshots of the register/unassigned controls;
actual compiled Vue/Vuex tests and final build cover those small changed views.

The verified raw-evidence.zip retains1253 files: plan ledger, all task/review
reports, raw command logs, browser reports/screenshots and actual PDF artifacts.
Every entry was SHA256-compared to its original before scratch cleanup, zero
mismatches; all59 Rulings/reasons/costs are also preserved in tracked decisions.
retention-check.json records the archive verification; sha256.json binds all
retained evidence files. No node_modules, build output, real env files or git
metadata is included. Direct final reports are retained beside this README.
No merge/push/deploy or real OTP receipt is part of this completion.

Closeout exception: tool policy rejected recursive plan-scratch deletion and
background preview restart. No bypass was attempted. Scratch is still present;
the controller-owned Nuxt was stopped for log retention and8097 is not running.
Original servers/worktrees are preserved. Archive verification refers to its
timestamped frozen originals; this later runtime outcome is recorded here.
