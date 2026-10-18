# Delivery V1 Decisions And Evidence Limits

This tracked record preserves ALL 59 ledger Ruling lines, with their original reasons and costs (original52, six final-integration rulings and final maintenance disposition). Source: progress.md retained inside the raw evidence archive; line numbers are provenance, not live scratch links. No original decision is silently removed when a later fix supersedes its initial disposition.

## Final Disposition

All17 source gates, the broad review, one bounded fix dispatch and one scoped
re-review are complete. Final findings I1/I2 are ADDRESSED; no new blocking
finding remains. Tested code pair Ff0d57990e5c7e7afe1f3edf50f17db0ffabe0820 /
Bb2e3ede2636a5de19005ff1966a11211f4dab5a7 has complete F3+88/B66/SQL18/runtime20/
lint/build native0 evidence. Later closeout files are documentation/evidence only.
Current source-binding limitations, old failed/composite gates and all physical/
live/external exclusions remain unchanged. Below Task17 source/checklist sections
are historical snapshots, NOT pending current software gates. See acceptance
and the retained broad/scoped review reports for the complete final verdict.

## Current Dispositions

| Finding | Disposition / Reason / Remaining Cost |
| --- | --- |
| Task2 M1, missing signer discovered after geocoding | Fixed narrowly in Task17 at resolveAddress operation boundary; real codec RED1 supplier call -> GREEN0 calls; lazy disabled boot preserved. No broader provider or bootstrap rewrite. |
| Task14 M1 stale resource read banner | Controller fixed in frontend98bfb39: only the corresponding fresh successful resource read clears its own failure, preserving other reads and command errors. Focused courier47/47 on22/18; final broad F gates recorded separately. |
| Task6/7 customization/payment/archive diagnostics | Deferred baseline fixture/log hygiene; preserve actual unexpected diagnostics. No financial defect established; cost is noisier CI output. No production logging sweep. |
| Task8/9 Loaded-env and intentional fault/disposal diagnostics | Deferred bounded bootstrap/expected-diagnostic maintenance; raw evidence remains visible. Do not infer an ordinary production failure from intentional faults, or hide unexpected failures. |
| Task10 initial parallel legacy upload ECONNRESET/ENOTEMPTY | Retain actual failed runs and separate successful sequential files; unknown root cause and harness not claimed repaired. Current Task17 whole-command outcomes are separate evidence, never silent retries. |
| Task11-16 no-console/Browserslist/buffer.File notices | Deferred incumbent maintenance; no dependency/console modernization. Current Task17 F lint is native0 with0 errors/143 warnings, not a zero-warning or broad accessibility certification. |
| Task12 shell warning wrapper vs native/TAP | Retain both old artifacts; explicit native propagation distinguishes warning decoration from actual assertion/command failure. |
| Task13 absent embedded native markers | Older raw TAP37/29/27 and scoped ESLint are directly visible; author/tool native0 claim is not an embedded marker. No historical evidence upgrade or gate rerun. |
| Task14/15/16 composite and exact test-revision limits | Retain below historical triage, original source reports and raw logs. Later strengthened fixtures/fixes do not retroactively make earlier complete commands green. |
| Plain Node18 Nano ID loader failures | Existing test-only real-dependency import-cache bridge is not production/unbridged Node18 boot proof. Task17 independently boots actual configured Node20 Alpine whole application without any bridge. |
| Task17 initial whole B npm failure | Obsolete two-argument source regex; first35 files pass, file36 fails,30-file continuation passes separately. Controller approved exactly one privacy-option assertion; corrected full npm66/66 now native0. Both histories retained. |
| Task17 initial whole F npm failures | Initial whole native1 at the two copy labels, separately executed suffix native1 at the exhaustive search registry/class;86/88 composite is NOT whole green. Controller approved exactly two accents/shared search class/registry entry, focused guards0, corrected complete npm3+88/lint/build each0 on actual changed source. Prior successful build covers only pre-fix source. Bounded actual DOM search1440/390/320 native0, no second detector or general polish. |
| Task17 HTTP double hang/runtime port race | Test harness corrections only: secureConnect lifecycle for redirected Stripe sockets, bounded timeouts, synchronous Docker start before port lookup. Explicit stopped child native-1 and random-schema cleanup retained; not production RED/fix or real TLS acceptance. |
| Runtime dependency audit | npm ci summary reports47 inherited findings (3low/7moderate/31high/6critical). No independent exploitability triage, dependency upgrade or audit fix in this task; not security certification. |
| Single detector79 advisories | Contextual incumbent token/compact-heading debt accepted by controller; zero primary findings does not mean zero warnings/full accessibility. No suppression or second detector. |
| Headless native embedded PDF iframe | Blank, visual preview NOT validated. Existing actual generated Task15 PDFs/raster PNGs were independently rendered/viewed/hashchecked and retained; no browser PDF integration fix or physical print claim. |
| Live commissioning and historical data | Both real OTP receipts, provider finance/printing, historic DATETIME/activation-link audits, shared budgets/limiter, actual TLS/origin/proxy/cookie topology and deployment remain external prerequisites. No live readiness claim. |

## Task17 Before-Fix Gate And Source Binding

Tested executable pair: F `b795fca1931f6bbe90b82eaf58c620f68c29f995` / B `8dbc562efb69a291a09b515b3d1ce17eb1253279`; controller UI wave98bfb39 is included. B whole npm66 files/registered SQL17 files/configured Node20.20.2 whole-app boot on MySQL8.0.33 each native0. F whole npm3 pretests+88 files/lint/isolated build each native0. Initial/composite histories below are not retroactively upgraded. Source commits bind the same working blobs used at command launch; a later two-Markdown documentation commit changes no executable/package bytes. Full exact commands, raw log names and source limitations are in [acceptance](delivery-v1-acceptance.md) and task-17-report.md. All worker sessions are collected.

Controller actual DOM-only search geometry native0 at1440/390/320 with nonzero input/within viewport/no overflow/pageErrors/unknownAPI. Retained screenshots predate this compatibility follow-up. Controller task and broad paired-branch reviews remain pending, not final approval. Both real OTP receipts/verification remain NOT EXECUTED; the local results are not live activation readiness. Planned raw-evidence.zip/sha256.json follow those reviews; no scratch cleanup or archive-complete claim.

## Ledger Rulings (Verbatim)

Source line 88:

- Ruling: accept derived allocation-counter table as internal persistence detail - required to enforce current locked caps under MySQL trigger restrictions without mutating journals, independently reviewed - if wrong, migration/trigger maintenance and replacement work.

Source line 89:

- Ruling: accommodate exactly two existing duplicate-column migrations only in disposable DB bootstrap, preserving data backfill - enables faithful historical fixture replay without rewriting production history - if wrong, tests could diverge from a production migration path and need bootstrap correction.

Source line 100:

- Ruling: expose customer-session-scoped POST /customer/address-resolutions in Task10, reusing Task2 geocoder/proof service with shop derived from verified customer context and customer CSRF policy - account addressbook must work without staff/service-point auth or price calculation - if wrong, one small adapter endpoint/tests need removal or contract adjustment.

Source line 101:

- Ruling: create shared F/components/delivery/DeliveryAddressInput.vue in Task11 for the addressbook, then Task12 reuses/extends it rather than recreating it; inject resolver callback instead of depending on not-yet-created delivery store - avoids duplicate geocoding UI and makes account feature usable at its own task - if wrong, component ownership/wiring and focused tests need rework, no business schema change.

Source line 106:

- Ruling: Task12 adds safe authenticated GET /delivery/availability returning only enabled for the caller's shop (extend B/c_delivery.js and r_delivery.js), keeping full settings admin-only - cashier/site must know which fulfillment modes are actually available without gaining configuration access or probing invalid quotes - if wrong, one small read endpoint and frontend availability wiring need adjustment. Fees still come only from authoritative quotes, no local pricing.

Source line 111:

- Ruling: support adequately resolved unnumbered street/locality postal destinations only through explicit provider-candidate selection, preserving selected provider postal snapshot and precision; reject municipality-only results, unrelated postal locations and silently dropping a requested house number - spec requires valid usable addresses, not mandatory numbering, and no invented geographic fallback - if wrong, street/locality precision may be inadequate for some premises and that acceptance policy/fixtures will need tightening before activation. Do not automatically accept arbitrary street centroids.

Source line 112:

- Ruling: accept conservative shared current+previous-second40 quota cap - independently reviewed as within maximum, robust across shops on the same SQL store - if wrong, peak sustained geocoding capacity may be about20/s and needs a more precise rolling limiter, not per-shop budgets.

Source line 114:

- Ruling: Task9 adds public GET /customer-auth/channels returning only configured email/whatsapp booleans (including required auth-secret readiness); Task11 loads these flags before enabling channel controls - satisfies nonfunctional-channel UI rule without test sends or exposing credentials/provider IDs - if wrong, small metadata endpoint/store wiring need adjustment. Configured does not promise live supplier delivery; request errors remain explicit, no SMS fallback.

Source line 119:

- Ruling: all delivery price changes, including discounts, use explicit unpaid/pre-pickup requote/reconfirmation; legacy collect/archive/Terminal settlement reject new inline delivery discounts and settle the accepted snapshot only. Task15 disables inline payout discount for a selection containing delivery and offers allowed order-edit path (extend F/pages/cashregister/payout/_id.vue and focused payout tests) - preserves charge/VAT/minimum/free rules and avoids silently charging an unconfirmed changed total - if wrong, delivery discount UX costs an extra edit/requote step and may need a dedicated acknowledged payment-time repricing workflow. Non-delivery discount behavior remains unchanged.

Source line 123:

- Ruling: Task11 also changes F/helpers/persistedState.js and F/test/persisted-state.test.js to exclude customer,delivery,courier from serialization AND legacy-state hydration - necessary for isolated customer state and Task14 no long-lived mission/access data - if wrong, temporary UI state is reloaded rather than restored and recovery metadata may need narrower dedicated persistence. Preserve minimal unresolved checkout/mutation recovery separately; never persist full addressbooks/missions.

Source line 125:

- Ruling: extend Task3 ownership narrowly to addOrder/addDetailOrder in B/src/controllers/c_orders.js and their endpoint regressions in the existing delivery integration test - mandatory split-write protection cannot be enforced from the original eight-file ownership list, and spec already requires it - if wrong, two legacy-handler branches and their compatibility tests need adjustment; no router/archive/payment refactor authorized by this extension.

Source line 130:

- Ruling: Task7 also creates additive migration 20261016121000_delivery_cash_closures.sql with nullable cash_closures.courier_cash JSON - required immutable courier-cash summary otherwise has no persistence column in either historical or Task1 schema, and must not be squeezed into legacy payment/VAT arrays - if wrong, one small nullable column/migration and read projection need adjustment; historical closure snapshots remain untouched. Brief amended before dispatch.

Source line 142:

- Ruling: Task8 adds authorized server-owned stored-address proof renewal using existing signAddressResolution helper; Task10 customer resolver accepts mutuallyexclusive addressId variant, Task11/12 consume staff/customer variants - permanent addressbook cannot depend on expired transient proof or unnecessarily re-geocode unchanged validated postal data, and must never trust browsercoords - if wrong, one small service method/two adapters and focused UI resolver wiring need adjustment; no new table or cryptoimplementation. Wrongshop/customer IDs denied, new/changed postal destination stillgeocoded, private-only changes don'trequireprovider.

Source line 148:

- Ruling: extend Task5 ownership to m_deliveryOrders.js only for shared toDeliveryView courier/privacy/allowed-action projection - Step1 explicitly requires this shared service behavior but file list omitted its existing owner, and per-controller copied redaction would be fragile across later collection/replay paths - if wrong, one shared DTO projection and its actor/privacy tests need adjustment; no archive/financial schema change. Brief amended beforedispatch.

Source line 149:

- Ruling: Task7 also extends c_courier/r_courier with GET /courier/cash-balance for server-derived own activecourier identity - approved mobile own-balance cannot use operator /delivery routes denied by central courier guard, and original Task7 file list omitted courier adapters - if wrong, two tiny adapters/HTTP authorization tests and Task14 endpoint wiring need adjustment; no self-remit/adjust authority or new ledger. Task5 informed future route belongs owncouriernamespace, no placeholder endpoint required now.

Source line 152:

- Ruling: Task5 adds transactional issue guard in m_orders legacy manualcollection/unpaidarchivesettlement plusdelivery-only c_orders trustedstaff guards (manualfinanceadmin/cashier; no servicepoint/customer archive; paid/refundedstaffprep archive preserved), andoneexactmoduleexpectedlist update - newissue/guesttrustboundaries otherwisebypassed throughlegacyAPIwhilecourierAPIscorrect - if wrong, two narrow settlementbranches/controllerguards andfocusedtests needadjustment; no ledger/schemachange ornon-deliverychange.

Source line 153:

- Ruling: generic legacy cashier collect/archive is not an audited incident financial-resolution operation; unresolvedissue firstusesexplicitrestaurantresolveIssue/reason before newmanualsettlement, while engagedproviderreconciliation andpaid/refundedprep archivecontinue - keeps incident intervention explicit rather than unattributedpaidupdate - if wrong, V1 adds anextra resolution/resume step andmayneed dedicated auditedfinancial-resolution adapter instead; neverauto-clearincident orfakefinancialresolution.

Source line 160:

- Ruling: Task5listreturnsALLoperational(nonterminal)missions plus independentlyboundedrecentclosedhistory100 whilepreservingarrayHTTPcontract - fixes hiddenunfinishedwork without adding unused paginationUI contract - if wrong, largeactivequeuescanincreasequerycost/response andneedexplicitpaginationlater; no operationalworksilentlydropped.

Source line 161:

- Ruling: retaincurrent-active-admin requirement for legacy role-changingactivation anddocument historical-linkcompatibility aspre-releaseaudit - reviewerverifiedcurrentregisteractive/direct andfirstrestaurantbootstrapstatus1/access0, activationcreator/mailercommented, so nocurrentbootstraplockout; anonymousURLrolechangesmustnotreopen - if wrong, previouslyissuedlegacyactivationlinks(ifany) requireadminhandling/explicitproof-boundcompatibilityadapter beforedeployment. No realDB/tokenaudit performed or deploymentauthorized.

Source line 164:

- Ruling: Task13 implements small admin-only terminal-correction adapter+UI, reopeningclosed to controlledissue withjournal-derived prior context/reason/version/idempotency andimmutableaudit - approvedSpec5 requires tracedadministrative correction but originalTask5APIomittedit, and operatorUI is coherent ownerafterfinancecontracts - if wrong, onebackendcommand/route/test andadminUIaction needadjustment. No financial/stock/debt rewrite, no courierundo/clientarbitrarystate, no tokenrotation/expiryextension; missingvalidhistoryrefused. Task13brief adds Bm_dispatch/c_delivery/r_delivery/newSQLtest/package ownership beforedispatch. Full V1 coversrequirement there; Task5coredispatch gate remainsitsreviewfixscope.

Source line 173:

- Ruling: Task7 applies existing authorizeCashRegister to four legacy /reports/z routes before publishing new cash snapshots - source check found authentication alone admits public service-point tokens to read/close reports, bypassing new financial scope - if wrong, four route middleware bindings and focused fixtures need adjustment; retain normal authorized staff and avoid general permissions refactor. Task7 owns r_orders.js narrowly in addition to original files.

Source line 174:

- Ruling: Task15 explicitly whitelists public receipt shop data and removes raw receipt token/shop logging in its already-owned c_orders.orderByToken - source mGetShopInfo SELECT* includes admin_password, so new receipt integration must not carry private shop configuration into public documents - if wrong, one public receipt projection/logging boundary and compatibility tests need adjustment; existing admin DTOs and public-token receipt model remain intact.

Source line 175:

- Ruling: Task16 guards NEW-delivery reads through legacy lists/detail/edit/archive against public service-point and wrong-shop access - approved private tracking and customer scope otherwise bypassed by guessed order ID despite correct new APIs - if wrong, three narrowly owned legacy read adapters/projections and focused regressions need adjustment; preserve non-delivery public workflows, no broader legacy-platform audit or new order-history feature.

Source line 178:

- Ruling: extend Task7 test ownership to exact delivery-authorization cash.balance fixture injection and shared auth guard rejecting null/undefined DBaccess before Number normalization, with actualHTTP Z/cash regression - real ownbalance route invalidates reserved-route fixture and nullablecurrentrole otherwise turns into admin0 at new financial boundaries - if wrong, one fixture injection/guard and focused valid-role regressions need adjustment; no general auth redesign or removed assertions.

Source line 179:

- Ruling: Task7 adds one immutable full manual-delivery refund producer/journal/service and operator route for cash plus independent external-card declarations - actual existing provider refund404 cannot substantiate spec7 physical-return debt correction or manual paid cancellation; same financial source must confirm refund before custody changes - if wrong, one new service/migration and narrow cash/closure/API integration need rework; no partial refunds, provider calls, new sale/stock change or historical snapshot rewrite. Cash register vs original-courier source is explicit, source-insufficient courierreturn refused instead of invented transfer; externalcard explicitly manual/no cash. Task13 consumes reasoned restaurant-only action; Task15 consumes immutable physical outflow reporting.

Source line 187:

- Ruling: keep UTC delivery-financial prerequisite scoped to feature operations/readiness while preserving historical session-time Z for ordinary shops without new financial history - I1showsblanketUTCcheckbreaksdisabled/non-deliveryPOS; no forced timezone switch or old DATETIME reinterpretation is safe - if wrong, compatibility fence/readiness guard and focused regressions need adjustment; supporting delivery on arbitrary non-UTC histories would need an explicit clock-transition design, not an automatic data conversion. Narrowoptional m_deliverySettings ownership added for nonUTCactivation refusal; oldhistory/basis audit beforeactivation documentedexternal, no prodaccess.

Source line 195:

- Ruling: Task9 represents uncertain supplier timeout as pending and atomically promotes sent+verified/consumed ONLY after valid code/browser/purpose/expiry/attempt proof; no invented provider ack/id/sent_at, late result cannot downgrade verified or resurrect invalidated - Task8 CHECKrequires sent but permitsnullsent_at, and approvedtimeoutverificationmustwork without fake supplier delivery claim - if wrong, onechallenge-state interpretation/SQLupdate and narrow schema revision/tests may needadjustment. Task10 acceptsactualverifiedone-usecontext without requiringnonnullsupplierack. Task9/10briefsamended withactualSQL+HTTPboundaryracecoverage; no real sends.

Source line 203:

- Ruling: new personal account loads safe public restaurant endpoint into isolated customer-owned state, never existing sharedshop/users publicbootstrap actions - existing actions overwrite staff/auth/shop/cart context and would violateR4 even if newAxios401handler were isolated - if wrong, onecustomerstore/layoutloader+snapshot tests needadjustment; broaderparallelpublic/staffprincipal isolation would require an explicit transport/persistence design, not a silent globalrefactor. Existingexplicitpublic storefront principal switch is distinguished from personal login; Task12mustreportactualadditionaladapterneed beforeunownedchanges, no misleadingclaimthatlegacyparallelmodesalreadyexist.

Source line 214:

- Ruling: extend Task10 ownership ONLY to the two obsolete route-absence assertions/comments in customer-addresses.integration.test.js and customer-auth.integration.test.js - Task10 now deliberately mounts guarded routes and keeping Task8/9 stage-specific404 expectations would leave registeredSQL red despite correct401 behavior - if wrong, three guardedroute assertion expectations and comments needadjustment; preserve publicphone-search404 and allpriorauth/SQLchecks, no productionguardweakening. Rerun both actualSQLfiles22/18, no needwholebaselineagain.

Source line 218:

- Ruling: Task10 may also modify r_orders.js ONLY to place optionalcustomerattachment/CSRF on actualcheckout route after existingauthentication, removingdifferent-boundaryindexguard asappropriate - I2proves appfullpathguarddoesnotcovereveryExpressacceptedrouterspelling and route-localprotectionmust share dispatch boundary - if wrong, onecheckoutmiddlewarechain/import and scopedindexremoval/regression needadjustment; existingguest/staffauthorization and otherlegacyroutesmustremainunchanged. I1 classifier/rejectionmustseparatelycoveracceptedboundarydouble-slash andabsolute-form safely; no broadURLrewrite or globalauthrefactor.

Source line 220:

- Ruling: extend Task10 fix ownership to ONLY existing checkout-contract.test.js:2671 route-chain regex to assert existingauthentication THEN bothcustomer guards THEN orders.checkout - approvedI2route-localguardnecessarilychangesoldliteralchain, behavioralreadycoveredrealExpresswitnesses - if wrong, one source-contract assertion needsadjustment; allotherlegacyassertions preserved and no productionguardweakening. Rerunwholeaffectedlegacyfile22/18, notnpm/SQLagain.

Source line 228:

- Ruling: Task11 desktop/mobile visual acceptance is scheduled with all delivery surfaces in the controller's single Task17 batched visual-qa-matrix run; Task11 intermediate code gate uses behavioralSFC/store/lint/regression/source review and explicitlydoesNOTclaimvisualacceptance - avoids conflicting per-taskbrowserloops with establishedboundedwholeUIinspection, withoutdroppinganyaccountstate/devicecheck - if wrong, account visual/layout fixes are discoveredlater and must fit the finalfixwave rather thanbeingcompletedatTask11. Briefamended andworkerinformed; shippingstillrequiresactualbrowserQA.

Source line 230:

- Ruling: extend Task11 ownership to plugins/persistedState.client.js ONLY createPersistedState mutation filter rejecting customer/,delivery/,courier/ mutations, plus alreadyownedbehavioraltests - helperexclusionprotectscontents but currentglobalpersistoneverymutationrefreshesstaffstorageTTL andviolatesstrictR4unchangedstorageinvariant - if wrong, oneexplicitfilterandtwofocusedtestsneedadjustment; staff/cartmutationpersistence/24hserializer/hydrationandminimalcartrecoverymustremainunchanged. Assertrealpluginrawbytes+expiry unchangedfor3excludedmodules andstaff/cartstillpersist, no generalpersistence rewrite.

Source line 244:

- Ruling: extend Task12 ownership to B/src/helpers/customerCors.js ONLY explicitcookie-bearing /stripe/payment-intents/qr-table +itsCSRFpreflightclassification usingexistingTask10safeparsedpath/prefixhandling - actualnewdeliveryStripecheckoutneedscredentialedexactoriginpolicyandcurrentmiddlewaremissesroute, so existingauth+CSRFalone isinsufficientbrowserintegration - if wrong, oneexplicitroutepredicate+focusedactualHTTPregressionsneedadjustment; no wildcard/Stripewebhook/Terminal/globallegacyCORSexpansion. Preservebeareronlyoldbehavior; no realStripecall. Briefamendedbeforeedit, workersentgrant, ownTask12SQLtestalreadycoversprefixvariants.

Source line 246:

- Ruling: extend Task12 ownership ONLY B/test/stripe-terminal-readers.test.js existing route-contract test import +webstartmiddlewarearray to expect authentication,attachOptionalCustomerSession,requireCustomerCsrfIfPresent,handler - actualnewguardedwebroute intentionallychangedchain whileexistingreader/connect/webhookbindingsmustremainunchanged - if wrong, oneimport/onearrayassertionneedsadjustment; no weakeningruntimeauth/Terminaltest/harness. RunWHOLEaffectedfileboth22/18, notwholeNPMagain, then scopedpairedcommits+report.

Source line 251:

- Ruling: Task13 Remises UI must discover same-shop historical cash holders after role change via a narrow protected projection/list option within alreadyownedm_deliveryDispatch/c_delivery/r_delivery if needed, preserving ordinaryassignmentlistrole6semantics - Task7 supportsimmutableformerholdercustody but currentrole6listcannotexposeit toauthorizedcashier UI - if wrong, oneoptionalfinancial-holderquery/adapter+UIselectionregressionsneedadjustment; no newjournal, debttransfer, generalstaffaccessornewfinancialpermission. BriefamendedbeforeTask13dispatch, actualSQLpromotedholder+UIcoverage required.

Source line 271:

- Ruling: extend Task14 ownership narrowly to B/m_deliveryDispatch,c_courier,r_courier,newcourier-availability.integration.test.js,package for GET /courier/availability -> server-derived current active role6 `{courierId,available}` using existing reload/transaction guards - approved mobile screen must display current manual availability but no current read API supplies it; inventing false or performing a PATCH on mount would be incorrect - if wrong, one small read endpoint/projection plus SQL/HTTP registration needs revision; no general staff read, caller-selected account, new table or assignment behavior change. Task14 brief amended before dispatch; no implementation before Task13 gate. Visual scheduling clarified same established Task17 batch.

Source line 277:

- Ruling: accept the one-line additional B/src/helpers/deliveryAuthorization.js exact GET /courier/availability allowlist entry as necessary Task14 ownership, without broadening any other route/method - existing central guard rejects the explicitly granted current-own-availability read before its protected router (author actualSQLHTTP RED403vs200), controller inspected exact one-line diff and confirmed bounded necessity - if wrong, one explicit allowlist entry/read-route needs revision; current-account subject/role/tenant guards remain authoritative. Author surfaced proposal before edit but no separate controller approval had been recorded, so this ledger is explicit retrospective scope adjudication, not a claim of earlier approval. Brief updated before independent review.

Source line 288:

- Ruling: extend Task15 ownership narrowly to B/src/modules/m_cashClosures.js fiscal detail projection and already-owned new report SQL coverage for accepted archived fee VAT exactly once - required report/Z totals otherwise omit fee tax because closure only queries product archive details; no existing owned m_orders/orderMetrics change can supply this closure-local query - if wrong, one fiscal union/projection plus focused SQL assertions needs revision; old stored closure JSON, revenue/product counts, period/custody/refund clocks remain unchanged. Existing proposal approved before applying it, worker informed, brief amended. No general closure rewrite.

Source line 290:

- Ruling: preserve F/helpers/receiptBundle.js unchanged when its existing real passthrough and transport coverage proves the extended fee/VAT payload survives; modify-list entry does not justify a no-op production change - purpose is receipt-bundle compatibility, not mandatory churn, and current helper requires no transformation - if wrong, missing bundle contract is a review finding requiring a narrow helper/test fix. Brief clarified before independent review; reviewer must verify passthrough evidence rather than assume author claim.

Source line 293:

- Ruling: extend Task15 fix ownership narrowly to B/src/modules/m_deliveryOrders.js reviseDeliveryForOrder to preserve locked accepted complement/instructions for same verified postal/geographic address during price/items amendment; explicitly refuse unsafe changed-destination preservation rather than silently clear or carry private access details elsewhere - newly exposed edit consumer must not erase existing operational data, and current server wholesale replacement is the authoritative seam; a client-only warning cannot preserve it - if wrong, one narrow snapshot merge/refusal plus actual amendment/replay/rollback tests needs revision; no new client private-field contract, provider, signed pricing change or general address editor. Brief amended before fix dispatch. Same-address canonical comparison must be validated against actual snapshots, no inferred ownership.

Source line 295:

- Ruling: extend Task15 ownership ONLY B/test/delivery-checkout.integration.test.js proposed two fixture lines to keep original address in successful quantity/discount repricing and expected street7 - existing positivecase carries old private details to another street, contradicting explicit current I1 safety contract; dedicatednew actualHTTP/SQL cases verify changeddestination refusal/fullrollback, so safetycoverage is replaced not removed - if wrong, two fixturelines need revision plus revisit address-change contract; all financial/stock/audit/replay/paid/pickup assertions remain. Proposal read and approved BEFOREedit; WHOLE producerfile both22/18 required, no broad testrewrite.

Source line 302:

- Ruling: accept Task16 B/src/helpers/customerCors.js narrow exact tracking-token cookie/CSRF route classification under existing parsedpath/prefix semantics - authenticated customer-owner rotation requires existing personal-origin/CSRF browser policy just like checkout, and new endpoint otherwise misses it - if wrong, one explicit predicate+HTTP origin/preflight regressions needs revision; no anonymousread credential/wildcard or unrelatedroute broadening. This is retrospective adjudication of already-written hunk, not priorapproval; brief amended andworker informed beforecommit/review.

Source line 303:

- Ruling: accept Task16 B/src/modules/m_deliveryDispatch.js terminalContext narrow skip of proven tracking_rotated annotations when locating immutable terminal operational source after rotation increments dossier version - otherwise explicit private rotation makes valid adminterminalcorrection fail history check, despite no operational change - if wrong, small source-event selection/rotation SQL evidence needsrevision; mustnot inventhistory or fall back across unrelatedoperationalevents, nor extendprivacy. Existing currentadmin/reason/version/payment invariants remain. Retrospective scopeadjudication of current3linehunk, not priorgrant; brief amended beforecommit/review. Further unownedchanges requireconcreteproposal.

Source line 305:

- Ruling: accept30publicread/IP/60s,10000livebucket process-local bounded limiter with saturationfailclosed and explicit upstream sharedlimiter commissioning prerequisite - spec requires IPlimit but no distributedstore/interface; boundedlocal protection avoids new schema/coordination engine - if wrong, deployment-wide budget can be exceeded acrossworkers/restarts and requires upstreamconfiguration or a later sharedlimiter; do not claimaggregateguarantee or liveactivation readiness.

Source line 306:

- Ruling: accept idempotent tracking rotation replay returning trackingUrl:null/idempotentReplay:true with no mutation and a separate explicit new-link action after lostresponse - rawsecret mustnotpersistjournals and ordinary replay mustnotinvalidatecurrentlink; this keeps one mutation perkey without introducing new secret-reconstruction machinery - if wrong, recovery UX needs deterministicregeneration or another boundedprivatecontract; current user must explicitlyrenew, and old link remains until that action/expiry. Review mustverifyclearUI/exactauthority/noautorenew, not accept rationaleasproof.

Source line 318:

- Ruling: Task17 worker starts backend journey/runtime/examples/docs while controller owns one frontend browser/detector/fix batch; hold fullFtests/build until controller frontend-freeze signal - running build into live .nuxt or concurrent Fproduction edits would invalidate browser/test evidence and ownership - if wrong, coordination adds a short final test wait; no required checks removed. Brief amended beforedispatch, originalservers neverstopped. Only controller isolatedserver may later be coordinated for build or separatebuilddir.

Source line 319:

- Ruling: address deferredTask2M1 now in Task17 narrowly operation-boundary signerpreflight/zero-geocoder-call regression Bm_deliveryQuotes+quoteunit/existingSQLifneeded - known configuration failure currently spends supplier quota before refusing; finalcontracttriage owns this alreadyrecordedfinding, preserving lazyboot - if wrong, oneoperationguard/test needsrevision; no provider/network/bootstrap/envsecretrefactor. FrontendTask14M1resourceerrorfeedback handledonlyincontrollerUIbatch, inheriteddiagnosticnoise notscopeforglobalcleanup.

Source line 323:

- Ruling: allow Task17 B/test/delivery-runtime.integration.test.js +focusedpackagecommand asrepeatableconfiguredNode20wholeappacceptance ownedtest - requiredruntimecheck needsfilteredpositiveallowlist ephemeralDockercontext withnoenvfiles/mounts and actualserver/APIboot, notjustanuntrackedrequireprobe - if wrong, oneruntimetest/scriptneedsrevision; no productionDockerworkflow/env/originalcontainerchange. WorkeralreadywroteuncommittedtestinTask17testscope, this explicitscopeclarificationprecedescommit/review.

Source line 324:

- Ruling: accept Task17 one obsolete source assertion correction in B/test/service-point-cash-register-detail.test.js, requiring existing servicePointId/shop and current omitNewDeliveries privacy option - full npm stopped on the old two-argument regex while accepted Task16 added a privacy third argument; actual router/SQL coverage remains - if wrong, one legacy assertion requires revision; no production change or unrelated source-test modernization. Original failed full command/composite suffix retained, corrected full npm required. Brief amended before worker authorization.

Source line 328:

- Ruling: retain detector79advisories as contextual existing-style/compact-heading maintenance debt, not rewrite tokens/old receipt layouts in final QA - zero primary findings and rendered operational views remain usable; most advisories flag incumbent literal styles against design ramp - if wrong, a later scoped accessibility/design audit may require token/contrast changes; this is not a zero-warning or full accessibility certification. One detector/no suppression, original JSON retained.

Source line 329:

- Ruling: grant Task17 worker ONLY two existing French-copy label accents in suivi.vue/DeliveryDispatch.vue plus shared se-search-field class and existing exhaustive design-system search registry entry - actual full npm fails on newly introduced visible labels and missing shared search registration, not a reason to weaken guards or refactor styles; controller read exact guard/shared responsive SCSS before approval - if wrong, those three source/test hunks and bounded search geometry need revision. This is necessary full-suite compatibility after freeze, not another general visual polish wave; prior build/lint source qualification retained, full corrected npm/lint/build required, no second detector. Brief amended before worker authorization.

## Historical Deferred Lines (Verbatim)

These preserve what was deferred at its source gate. The current dispositions above supersede a finding later fixed; they do not rewrite history.

Source line 110:

- Task 2: minor (deferred): M1 signer config checked only after geocoding, can waste providerquota/send postal input when no proof can be issued. Finalwholebranchreview must triage; focused futurefix preflight at operationboundary (notboot) should prove zero providercalls.

Source line 186:

- Task 7: minor (deferred): M1 inheritedcustomization/ResultSetHeader/FLAG/archive/delete diagnostics remain in fullSQL/unitlogs. Same hygiene categoryTask6M1, no new financial/secret leak. Finalwholebranchreviewtriage fixturecapture onlyifbounded; no Task7fixscopeexpansion.

Source line 194:

- Task 8: minor (deferred): M1 newSQL TAPbootstrap printsknown Loaded env file nonexistentfixturepath unprefixed. Notsecret/failure; finalwholebranchreviewtriage narrowbootstrapcapture/TAPdiagnostics, keepunexpectedobservable. NotpartI1fixloop.

Source line 205:

- Task 6: minor (deferred): M1 retained registered SQL output includes legacy customization/ResultSetHeader/archive diagnostics (completionchain lines29/32/75). Not financial defect; finalwholebranchreviewtriage bounded capture/assert owningfixtures, no broadproductionloggingcleanup. Task6reportdisclosesnoise, nofailedassertionorwarningfound.

Source line 207:

- Task 9: minor (deferred): M1 intentional SQL fault/disposal packet-order warnings plus inherited Loadedenv bootstrap outsideTAP. All assertions/connectionhealthPASS; finalwholebranchreviewtriage narrowexpected-fixture capture/assert, preserve unexpecteddiagnostics. Not an ordinary productionfailure/secretleak.

Source line 235:

- Task 11: minor (deferred): M1 existing151lintwarnings/staleBrowserslist/no-console remain, no newfunctional/secretdefect; finalwholebranchtriage only, no warning/dependencycleanupinTask11fixloop.

Source line 269:

- Task 13: minor (deferred): M1 old Browserslist/PowerShell NativeCommandError decoration, same existing baseline. Explicit native exits retained; no dependency maintenance in fix loop. Final triage already carries Task11/12 equivalent baseline.

## Final-Triage Snapshot

Latest controller preparation/triage is preserved verbatim below. Its heading 'Local Acceptance Still Required' is a checklist from preparation, not a claim that the now-recorded complete command gates above remain pending. Controller reviews and external commissioning remain pending. Later review rulings require a new snapshot; no original decision is silently removed.

# Delivery V1 Final Triage

Current final-gate disposition, not deployment approval. Authoritative history and every Ruling/cost remain in progress.md and tracked decisions. Do not repeat completed source tasks.

## Deferred Findings For The Final Review

| Source | Finding | Required final decision |
| --- | --- | --- |
| Task2 M1 | resolveAddress can call the geocoder before discovering the missing address/quote signer configuration. | Task17 worker implemented operation-boundary signer preflight and actual zero-provider-call RED/GREEN/lazy-boot tests; final task review pending. |
| Task6/7 M1 | Inherited customization/payment/archive SQL diagnostics in retained test output. | Decide whether bounded fixture capture/assertion is warranted. Preserve unexpected diagnostics; no general production logging refactor. |
| Task8 M1 | Inherited Loaded-env diagnostic is outside TAP in the new SQL files. | Assess narrowly in test bootstrap; do not suppress all output or change secret loading. |
| Task9 M1 | Expected fault/disposal packet-order diagnostics plus the same env bootstrap noise. | Distinguish intentional fault evidence from ordinary SQL failure. Consider targeted expected-diagnostic assertions only; current assertions pass. |
| Task11 M1 | Existing no-console lint baseline and stale Browserslist notice. | Nonblocking baseline unless new evidence changes that assessment. Do not update dependencies or clean unrelated warnings. |
| Task10 test-stability limit | Initial parallel legacy upload runs failed ECONNRESET/ENOTEMPTY; identical sequential whole-file runs passed without harness/source changes. | Preserve the actual evidence and unknown cause. Do not claim the harness was repaired or silently retry the final complete suite. |
| Task12 shell evidence | A controller PowerShell redirect returned shell1 on the old Browserslist stderr warning despite TAP29/29; explicit native-code propagation then returned0 on both runtimes. | Preserve both artifacts and inspect actual native/TAP status. Do not mislabel a warning wrapper as an assertion failure or hide failures behind a blanket exit0. |
| Task13 evidence qualification | Author says round1 raw files contain nativeExit markers, but scoped reviewer found those markers absent. TAP37/29/27 and no ESLint violations are directly visible; native0 is an author/tool-session claim, not embedded artifact evidence. | Preserve qualification without rerunning merely to regenerate evidence. Final Task17 commands must record native exits explicitly. Task13 M1 is the same old Browserslist baseline, not a new blocker. |
| Task14 M1 | Successful read refresh does not clear the earlier read-failure banner; courier error is shared across resources. | Fixed F98bfb39 in one UI wave: resource-scoped read errors, freshness and command-error preservation. Actual RED/GREEN47courier tests both runtimes and browser recovery desktop/mobile; final task review pending. |
| Task14 M2 / evidence | Old Browserslist and legacy session fixture projections remain in passing logs. Some earlier Node22/SQL logs lack embedded nativeExit markers although completion/PASS groups are visible; author tool sessions claim exit0. | Preserve diagnostic/evidence limits, no broad dependency/logging refactor. Final commands record actual native exit explicitly; fixture projections are not a new secret exposure. |
| Task15 M1 / evidence | Old Browserslist plus five inherited lint warnings; affected F22 batch13/14 then narrow bundle correction, plain B18 batch7/9 then two real-nanoid-bridge successes. | Nonblocking inherited noise; preserve composite coverage and exact test-revision strengthening limits in report/manifest. Do not claim those initial whole commands passed or modernize dependencies. Independent reviewer viewed/bound both final PDF PNGs to hashes. |
| Task16 M1 | Inherited Browserslist/cart console warnings and Node18 experimental buffer.File notice remain in native0 runs. Four legacy direct Node18 loader failures were retained and separately bridged successfully. | Nonblocking maintenance noise; preserve exact native exits/current-test-revision and bridge limits, no dependency/console sweep in tracking fix. |

Append any new deferred findings from Tasks13-17 before the single final broad review. Existing Critical/Important task findings must be fixed at their own gate, not parked here.

## Local Acceptance Still Required

- Full current frontend/backend npm commands and registered actual-SQL chain with complete disposable configuration; report real whole-command status, not only historic prefix/suffix coverage.
- Frontend lint/build-local and configured Docker Node20 whole-application boot WITHOUT the Node18 test-only Nano ID bridge.
- Actual initial visual matrix, one UI wave F98bfb39 and one affected confirmation complete; see stable docs/delivery-v1-evidence/2026-10-18/README.md. All completed captures have no page overflow/JSerrors/unknownAPI; interrupted fixture/selector failures retained. Complex stale/replay/suspension/ambiguous states not all clicked, automated boundary coverage distinguished. No physical-handset claim.
- ONE final detector native0/zero primary/79 advisory, contextual debt retained by explicit ruling; no suppressed/zero-warning/a11y-certification claim.
- Task15 paid/refunded actual generated PDF/PNG artifacts independently viewed/hashchecked and approved; retained under docs evidence/pdf. Native browser PDF iframe blank in headless Chrome, visual inline preview NOT validated. No physical print.
- One final broad paired-branch review and bounded fix/re-review wave. Preserve source-task gates and exact compatible hashes.

## External Commissioning Prerequisites, Not Local Success Claims

- The user explicitly chose preparation WITHOUT actual email/WhatsApp sends. Both real channel receipt/verification checks remain NOT EXECUTED; do not request recipients/keys or operate provider accounts/templates.
- Provider configuration readiness is not supplier approval, availability or end-user receipt. Delivery notifications/SMS and real financial/printing actions are not part of this local acceptance.
- OTP instances require the same SQL quota store AND auth secret. IGN quota is shared only within its actual coordination store; independent databases sharing egress need aggregate-budget planning before activation.
- Task16 public tracking limiter is30/IP/60s, process-local with10000 live buckets/fail-closed saturation, not an aggregate restart/multi-worker budget. Configure/verify an upstream shared limiter before claiming deployment-wide throttling. Lost rotation response requires a separate explicit renewal; replay returns no raw URL and never rotates again automatically.
- Verify supported UTC session readiness and audit/reconcile the basis of historic naive financial DATETIME values BEFORE feature activation; current UTC alone does not prove historical correctness. No automatic timezone conversion.
- Audit historically issued legacy staff activation links as recorded in Task5 before release; do not inspect real tokens or production databases here.
- Verify actual deployment origins/proxy topology and TLS/SameSite cookie behavior. Do not claim arbitrary third-party storefront domains work by default.
- No merge, shared push, production migration or staging/production deployment is authorized for this feature yet. Keep the isolated branches until explicit integration instructions.

## Tooling Already Prepared

- Frontend local server: see latest progress.md runtime entry; original server processes must not be stopped. Current preview is port8097 with API configuration pointing to localhost5005, not a claim that a new backend is running.
- Ignored qa-runtime uses playwright-core1.64.1/Chrome155 ephemeral contexts; actual local Nuxt browser batch executed with fictional API doubles, never the user's profile. See stable evidence README for allowed font-only external requests and blocked providers.
- Local-only image smarteat-delivery-pdf-qa:20261018/pdftoppm25.12.0 produced Task15 independently approved raster evidence. Minimal-image Courier font issue was fixed only in artifact-local font configuration; no new app renderer/dependency.

Before deleting any plan scratch artifacts, retain the final decisions, ALL Rulings with costs and actual acceptance evidence in the tracked final record. Do not link the user to files that the cleanup will remove.

## Final Integration Rulings

The following six later rulings supplement the original52 above. They preserve
scope, costs and unexecuted limits; none is independent correctness approval.
Source: controller progress.md, current lines332/335/337-340.

Source line 332:

- Ruling: scope binary Git attributes ONLY under docs/delivery-v1-evidence/2026-10-18 for PDF/zip artifacts - valid jsPDF ASCII cross-reference lines carry significant whitespace, initial artifact git diff --check flagged them as text and autocrlf warnings threaten future checkout integrity - if wrong, only artifact rendering/diff behavior needs adjustment, no application attributes change. Actualcurrentworking/committedPDFbytesalreadyequal accepted SHA256s, no observed corruption. Artifactcommit79e6203 occurred despite whitespacecheck1 (not claimedclean); followupscopedattributes/check will distinguish validbinary evidence from source whitespace. Rawzip/manifest stillplanned afterreviews.

Source line 335:

- Ruling: defer Task17 reviewer M1 inherited diagnostics and M2 final runtime probe timeout hardening to final whole-review triage rather than reopening the source-task gate - current whole smoke passed and no application defect is established, both are nonblocking tooling/maintenance observations - if wrong, a stalled final API probe can postpone test cleanup until external termination and CI noise can obscure later failures; final broad reviewer must see both, no success is inferred for a future hung run.

Source line 337:

- Ruling: extend final fix scope to immutable register-origin manual settlement/full refund proof and accepted-unassigned restaurant logistics closure - these are already-offered ordinary V1 flows missed by courier-only source and assigned-only issue contracts, confirmed against real counter consumers and current service/FKs - if wrong, one additive financial-origin schema/producer/projection path and narrow unassigned transition/terminal-context extension need revision. Never forge courier collection/debt, infer old immutable payment proof, auto-refund/restock or broaden beyond two findings. Prefer additive register proof/refund model preserving courier FKs; exact current-authority replay, accepted fee, physical posting clock and old snapshots mandatory. final-fixes-brief prepared before dispatch.

Source line 338:

- Ruling: accept final reviewer DeclinedToJudge1-15 as explicit unexecuted/excluded/unsupported-exhaustiveness limits, NOT successful evidence - real channels/money/hardware/device/TLS/history/legacy inventory/aggregate topology/load/a11y/broad inherited security/legal-fiscal settings and excluded partial/GPS/SMS features cannot be established by authorized local scope; merge/deploy and post-review archive remain separate - if wrong, commissioning or a separately authorized domain/security/device/load audit is needed before that claim. No known application defect is excused by these exclusions; I1/I2 must be fixed. Each entry preserved verbatim in final-review.md/raw archive, no silentdrop.

Source line 339:

- Ruling: accept final fixer additive delivery_register_payments/refunds source model, retaining old courier refund/impact FKs and explicit cash/external_card/cheque/meal_voucher counter semantics - real currently-offered counter methods need truthful full return without fictitious courier; two immutable tables avoid changing populated courier identities/FKs and no unverifiable backfill - if wrong, the additive schema/trigger exclusivity and new source adapter require revision; no legal/fiscal appropriateness or provider/physical return is asserted by this software contract. Shared shop barrier/current authorization/replay/UTC/closure invariants remain independently reviewable, rationale is not proof.

Source line 340:

- Ruling: grant final fixer B/src/controllers/c_orders.js ONLY current req.id handoffs into collectDeliveryOrderPayment.operatorId and existing archiveOrder fifth argument - authoritative current register operator proof cannot reach existing real producers otherwise; controller inspected actual exact two hunks - if wrong, two callsites/optional producer signature plus focused actual-router tests need revision, not broad legacy controller changes. Worker proposed in its commentary BEFORE editing but main saw proposal after implementation; this is explicit retrospective scope adjudication, not invented prior approval. Brief amended andworker informed before commit/re-review.

## Register Origin And Unassigned Closure

The final bounded fix uses additive immutable delivery_register_payments and
delivery_register_refunds tables. Existing courier refund/impact tables and FKs
are retained. Register proof is created on the same transaction/connection as
initial POS counter_pay_before or later cashier collection/archive settlement,
using current staff identity, original commercial payment and accepted full fee.
No old paid flag is backfilled into purported evidence. New schema and application
must be commissioned together; an old paid delivery without actual proof remains
ineligible for this manual return path.

Cash returns from a register-origin payment are register outflows in the posting
UTC period. Independent card, cheque and restaurant voucher returns are explicit
matching restaurant declarations with no cash/courier debt movement or provider
verification. Unknown manual methods are refused rather than relabeled. Actual
provider/Terminal refund paths and legacy non-delivery behavior retain their
existing contracts. Partial/mixed returns are not introduced. The existing
manual_refunded_cents closure total includes all these declarations; its cash and
external-card fields retain their specific meanings.

Restaurant operators may report an accepted unassigned issue and resolve it by
resume, explicit retry with an available courier, failure or cancellation. A
courier cannot claim an unassigned mission. No assignment is invented to close
the logistics, and closure never implicitly refunds, restocks or adjusts debt.
The operator resolution choices come from the server's journal-derived origin.
Explicit admin correction accepts proven unassigned/null-courier history and
retains the earliest immutable closure ceiling for private tracking; missing
history is refused. The independent scoped re-review confirms both fixes
ADDRESSED, with no new breakage. No live/provider/deployment authority follows.

## Final Maintenance Ruling (Verbatim)

- Ruling: retain final M1 diagnostic/lint/build noise, inherited untriaged audit47 and M2 unbounded final runtime probes as explicit deferred maintenance after scoped software approval - no newly introduced blocking defect was established by full/scoped reviews and current whole commands passed; broad dependency/tooling modernization is outside two-findings fix - if wrong, CI noise or a stalled future smoke can delay diagnosis/cleanup, and inherited security exploitability requires a separately authorized audit before stronger security/live claims. No maintenance issue is represented as fixed/harmless, no OTP/provider/physical/deployment validation is inferred. All DeclinedToJudge1-15 remain individually preserved in final-review.md and earlier acceptance ruling.
