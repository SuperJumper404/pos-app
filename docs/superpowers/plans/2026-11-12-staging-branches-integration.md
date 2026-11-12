# Active branches staging integration

> **For agentic workers:** Execute in this session with separated frontend/backend ownership, then one independent whole-change review. Use checkbox tracking.

**Goal:** Commit and integrate all remaining active application branches into staging, excluding the obsolete platform administration branch at the user's explicit request.
**Architecture:** Preserve the latest staging behavior and resolve historical cherry-pick duplicates. Integrate atomic table settlements into the current paginated mixed order/TPE history.
**Tech Stack:** Existing Node/Express/MySQL, Nuxt 2/Vue 2/Vuetify. No new dependencies.
**Spec:** Existing `feat/table-settlement` behavior and tests; user requests of 12 November 2026 to commit/push/merge active branches, excluding `codex/smarteat-admin-v1`.

## Global constraints

- Staging only: do not push master or deploy either environment for this integration request.
- Preserve Wallet progress, phone-only loyalty, existing payment/financial guards, TPE tickets, tenant boundaries and pagination.
- Preserve user artwork, scratch files, original environments and platform administration worktree. No recursive cleanup.
- Historical backup/operational branches contain no pending application feature and are not release inputs.
- Secrets stay outside new commits. Preserve repository environment and Docker workflow configuration.

## Review focus

- Atomic table archival must keep delivery/loyalty/terminal attachment guards and transaction rollback.
- Mixed history must count grouped settlements once before pagination and preserve colliding IDs across entry types.
- Search, sorting, hidden archives, tenant scoping and incomplete/foreign receipts must remain safe.
- UI must retain TPE attachments, current ticket heading and existing normal order/delivery routes.
- Duplicate historical loyalty changes must not regress newer programme artwork, notification, phone or permissions fixes.

### Task 1: Backend integration

**Files:** `../express-pos/src/modules/m_orders.js`, `src/modules/m_terminalPaymentHistory.js`, existing settlement service/module/router/tests, `package.json`.
**Interfaces:** Keep `mArchiveOrder` compatibility. Expose `archiveOrderInTransaction({connection, orderId, paymentMethod, shopId, discount, operatorId, settlementId, lockedOrder})` retaining current financial rules. Mixed history adds `{entryType:'settlement',rowKey:'settlement:<id>',id,eventAt,isSettlement:true,cash_register_settlement_id,historyLabel,archivedOrders,subtotal,payment_status,status,username}` without altering the existing order/TPE entries.

- [x] Merge table settlement and remaining original loyalty branch, resolving duplicates with newer staging fixes preserved.
- [x] Verify transactional archival and mixed history using focused failing integration regressions, then make them pass.
- [x] Run full backend general/loyalty suites and original settlement tests; scan secrets; commit integration.

### Task 2: Frontend integration

**Files:** current table-settlement merge input, `helpers/history.js`, `pages/history/index.vue`, `pages/cashregister/payout/_id.vue`, related helpers/store/tests and `package.json`.
**Interfaces:** Consume the backend settlement entry above alongside unchanged `order` and `terminal_payment`. Route group tickets to `/history/settlement/<id>` and child tickets to the original archive route; preserve row identities and server pagination.

- [x] Merge table-settlement and remaining original loyalty branch, preserving current Wallet/phone/TPE behavior.
- [x] Add focused regressions for mixed types, group expansion/tickets and scoped page validation; adapt historical test harnesses to current components.
- [x] Run complete frontend general/loyalty/settlement suites and lint; validate build-sensitive Vue changes; commit integration.

### Task 3: Review and publish

- [x] Review final combined source once independently; resolve material findings and verify relevant tests.
- [x] Verify all active application refs are integrated or already present, and platform/backup/operational refs remain excluded.
- [x] Push source snapshots and integration/staging without force after checking remote ancestry. Keep master unchanged.
- [x] Record revisions, checks, exclusions and remaining practical limitations.

Evidence: [validation report](../reviews/2026-11-12-staging-branches-validation.md).
