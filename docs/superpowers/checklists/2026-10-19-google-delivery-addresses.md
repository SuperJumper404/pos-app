# Google Delivery Addresses: Release Checklist

## Scope

- Approved design and implementation plan: 2026-10-19.
- Isolated paired `feat/delivery-v1` worktrees; no staging/production writes, push or deployment.
- Backend Google key remains in encrypted local environment files, outside code commits.
- Browser preview uses only fixture credentials, simulated Places and in-memory address/settings data.

## Verification

- Backend `npm test`: passed, including Google provider, HTTP authorization, CORS and legacy tests.
- Google provider: 7 tests passed, including Mailjet-patched HTTP transport, 5s production timeout, bounded bytes, no retry, tenant cache isolation, 15min deletion, coalescing and 1000-entry eviction.
- Google SQL journey: passed actual checkout, amendment, assignment, register settlement/archive, pickup, delivery, public tracking and closed-courier privacy.
- Google SQL storage: passed reference-only origins/books, NULL coordinate constraints and immutable journal guards.
- Full backend `npm run test:delivery:db`: passed on the isolated Docker MySQL instance, including legacy migrations, payments, courier custody, refunds, corrections and reports.
- Frontend `npm test` and `npm run test:delivery`: passed.
- Frontend `npm run lint`: zero errors, 143 existing warnings. Changed-file lint: zero errors, one existing console warning.
- Frontend `npm run build-local`: passed with existing OpenSSL option. Existing Browserslist and large-bundle warnings remain.
- No Google API-key pattern found in the generated client bundle; no provider key in screenshots or fixtures.
- Independent whole-branch review: two Important findings reproduced and fixed with RED/GREEN tests; no Critical or Minor finding. A further private-only edit/provider-outage contract check was also fixed in the same pass.
- Final post-fix frontend `npm test`, `npm run lint` and `npm run build-local`: all exit 0; checkout 43/43 and customer-account 28/28. Lint retains 143 existing warnings and zero errors. No re-review was dispatched.
- The dedicated MySQL fixture container was stopped after the full SQL suite passed; no other container was stopped or removed.
- Actual browser SHA-256 proof sanitization smoke test: passed, including signature-before-payload state.

## Browser Recipe

Local preview: `http://127.0.0.1:8098`, fixture API: `http://127.0.0.1:8099`.

- Actual shared input mounted through actual checkout, customer book and restaurant settings, with real Vuex modules/API adapters.
- Desktop 1440x900 and mobile 390x844: suggestions, keyboard selection, wrapping, visible attribution PNG and no horizontal overflow checked.
- Search `60 rue Francois 1er`; select the suggestion; confirm the 24 EUR fixture quote.
- Change the address text: accepted proof and quote are invalidated and the new input remains visible.
- Search `erreur de recette`: simulated provider failure, French error and explicit retry.
- Private instructions do not repeat Details. SAVE reuses a fresh selected proof.
- Book rows hydrate only when visible; successful address addition and reference-only restaurant origin save checked.
- Browser bootstrap initially used a non-admin fixture for settings; corrected to admin before the recipe. No new application console error observed after correction; unrelated wallet-extension warnings ignored.
- After review fixes: select an existing Google book entry without typing; its postal address and 24 EUR quote remain valid. Editing its text clears the old proof/quote and retains the new query.
- Captures and runnable preview are local ignored artifacts, not production assets.
- Runtime/captures: `.superpowers/google-address-preview-20261020/`. Preview binds only to loopback; no production session is used.

## Retention and Recovery

- Google GPS is temporary server memory only, never written to deliveries, book/origin snapshots or nested journal results.
- SQL recipe compares persisted financial/stock/revision evidence byte-for-byte before and after cache expiry/provider outage.
- Existing IGN data and financial journals are not rewritten.
- Browser-persisted Google checkout attempts replace signed GPS proofs in payload and signature with SHA-256 digests. Live retries keep their exact original body.
- Digests only recover an already accepted checkout with matching actor/shop/request/secret. They cannot create an order. An attempt absent from the server after reload remains locked for explicit reconciliation.
- Revision replay continues after commercial archive without repricing or contacting Google.
- Private-only changes to an existing Google book entry use an authorized metadata PATCH, not another provider resolution; they remain saveable during provider outage. Legacy save behavior is preserved.

## Decisions and Residual Risks

- workspace_fs refused linked worktrees: use shell reads at verified bases. Risk: stale-copy edits, mitigated by Git base checks.
- Reuse existing isolated worktrees and dependencies. Risk: toolchain drift, checked by baseline and full verification.
- Stored-book transactions without new Autocomplete provenance retain references only. Risk: extra Details reads and no frozen historical postal text; accepted money stays immutable.
- Keep the structured legacy component resolver contract while binding Google in all real parents. Risk: legacy callers need explicit suggester binding for autocomplete.
- Clear postal/private drafts on scope changes. Cost: re-entry after switching shop, rather than cross-context reuse.
- Share the visible-address queue with two active reads. Risk: delayed display under load, not extra persistence.
- Persist checkout proof digests for recovery only. Cost: an unaccepted attempt after reload needs explicit reconciliation, never automatic creation with digests.
- Restrict the static search-style detector to parsed field attributes. Risk: unusual field syntax could evade the static detector.
- Update the old HTTPS test boundary to the shipped options-object overload. Risk: fixture fidelity; real transport is separately exercised after Mailjet bootstrap.
- Keep the local preview outside disposable plan scratch. Risk: preview may require restart; runtime paths/PIDs were verified before moving.
- Start read-only review while independent long suites finish, with product commits frozen. Risk: late failures require a tested fix before readiness.
- Reviewer model is inherited under tool restrictions. Risk: capability cannot be explicitly selected, while context remains independent.
- Live Google acceptance/private activation settings are not reviewed or tested. Risk: external account/key configuration can still block rollout; owner validation is required.
- Test actual Vuetify creation and prop synchronization in an isolated child process with a memory-DOM boundary. Risk: not a full DOM test; actual Chrome stored-address selection and edits were separately checked.

## Before Activation

- Apply backend migration `20261019120000_delivery_google_references.sql` before releasing code that reads its columns.
- Verify Places API (New) enabled, billing, API/IP restrictions, provider quotas and actual credentials in each target environment.
- Verify delivery signing configuration, customer CORS origins and normal session/CSRF settings remain valid.
- Provide publicly accessible terms and privacy notices that satisfy Google's requirements. Their URLs and legal text require owner validation before activation.
- Google-reference rollback intentionally refuses to discard data; deploy a compatible application rather than attempting a destructive schema rollback.
- Real-provider recipe, if later authorized: one public address only, announced in advance. No real Google request was needed for this implementation.
- Push and Docker rollout require a separate explicit deployment step.

Official references: [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies), [Autocomplete New](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Details New](https://developers.google.com/maps/documentation/places/web-service/place-details).
