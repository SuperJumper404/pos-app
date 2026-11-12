# Apple Wallet progress implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline in this session, followed by one fresh whole-change review. Steps use checkbox syntax for tracking.

**Goal:** Simplify Apple Wallet to points, reward and a real progress bar over preserved restaurant artwork.
**Architecture:** Apple-only progress metadata and bounded PNG composition in the backend; matching illustrative admin preview in Nuxt/Vue. Stable pass identity and unchanged loyalty rules.
**Tech Stack:** Node 20, pngjs 7.0.0, OpenSSL, Nuxt 2/Vue 2/Vuetify.
**Spec:** `docs/superpowers/specs/2026-11-12-wallet-progress-design.md`

## Global Constraints

- Preserve published source images, card identity/token/QR/number and Google Wallet behavior.
- No test members, points, rewards, campaigns, SMS/APNs or forced mass refresh.
- Work in the existing isolated frontend/backend worktrees; keep user `output/imagegen/` untouched.
- Shared node_modules junctions must remain untouched: lock-only dependency update and isolated local dependency prefix.
- Match approved graphic-in-banner direction; Apple controls final device layout.

## Review Focus

- Reserved points and goal transitions must not misrepresent redeemable rewards.
- Corrupt or oversized PNG metadata must be bounded before allocation.
- Transparent/RGB artwork and all three scales must preserve source pixels above the footer.
- No duplicate field keys, lost QR/serial/token or modified Google payload.
- Empty/expired rewards, long names and contrast must remain understandable in preview and pass.

### Task 1: Apple pass fields, progress and PNG composition

**Files:** backend `src/services/loyaltyWallet.js`, new `src/services/loyaltyWalletProgress.js`, `package.json`, `package-lock.json`; tests `test/loyalty-wallet-progress.test.js`, `test/loyalty-wallet-signing.test.js`.
**Interfaces:** consumes reward configuration and available points; produces `payload.appleProgress` (value, max, ratio, rewardName) or null and `renderWalletProgress({images,progress,backgroundColor})` returning three strip PNG buffers.

- [x] Add failing tests for 20/30, reservations, multiple/expired/invalid/no rewards and completed goals; generated field layout and stable barcode/identity.
- [x] Add failing pixel tests for source preservation, ratios, alpha, scales, no banner and bounded invalid input.
- [x] Implement metadata, one bounded PNG renderer and locked pure-JS dependency; keep Google fields unchanged. Move points into header, remove next/card auxiliary duplication, retain usable offer at back.
- [x] Run new tests, actual OpenSSL signing and full backend general/loyalty suites. Expected: zero failures.
- [x] Commit backend changes; record base/head and RED/GREEN evidence.

### Task 2: Matching preview, review and Docker rollout

**Files:** frontend `components/loyalty/LoyaltyCardEditor.vue`, new `helpers/loyaltyWalletPreview.js`, tests in `test/loyalty-admin.test.js`; design/plan and validation report.
**Interfaces:** consumes programme rewards/artwork and colors; produces explicitly illustrative matching header/banner/reward preview, with no changes to save/upload APIs.

- [x] Add failing preview tests for a configured goal, expiry, no goal, matching ratio and preservation of image/import paths.
- [x] Implement preview composition and numeric reward; no new configuration controls or invented rewards.
- [x] Run frontend general/loyalty suites, lint and one detector pass. Expected: zero test/lint errors; review existing warnings separately.
- [x] Render bounded empty/partial/complete examples and perform one batched inspection; one fix/confirmation round if required.
- [x] Obtain one fresh read-only review of both repositories. Address Important/Critical findings in one verified fix pass.
- [x] Merge/push with current staging/master heads preserved; run existing Docker workflows on staging then production. Verify actual public builds and signed pass layout with fake repository/network disabled; no SQL writes or messages.
- [x] Record workflow IDs, actual revisions, private backups, physical-iPhone limitation and remaining findings; restore any temporary operations workflow.

Evidence and rollout details: [validation report](../reviews/2026-11-12-wallet-progress-validation.md).
