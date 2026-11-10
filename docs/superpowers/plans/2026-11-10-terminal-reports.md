# Terminal reports implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Include successful standalone TPE payments in sales reports and retain manual cash/card counts in immutable Z closures.

**Architecture:** Share a server-side standalone payment reader between metrics and closures. Keep sales documents separate from monetary declarations, and atomically claim standalone payments when creating a Z. Extend the existing Vuetify reports screen for X previews, count entry and historical reconciliation.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Vuetify, Express, MySQL, Node assertion tests.

**Spec:** ../specs/2026-11-10-terminal-reports-design.md

## Global Constraints

- No new dependencies, no broad refactor, preserve existing dirty work in both repositories.
- Existing archives and closed reports retain their historical values.
- Money declarations use nonnegative integer cents; blank is not zero.
- Informational payment attachments do not alter payment amounts.

## Review Focus

- Confirmation arriving during or after a closure is picked up exactly once.
- A payment with several attachments contributes its amount only once.
- Autonomous payments do not increase order counts, product quantities or order averages.
- Explicit zero is accepted; blank, negative, fractional cents and partial declarations are rejected.
- X printing cannot create a Z; historical Z printing includes the saved declaration.

### Task 1: Shared reporting data and Z persistence

**Files:** backend src/modules/m_terminalReports.js (new), src/helpers/cashReconciliation.js (new), src/helpers/cashClosure.js, src/modules/m_cashClosures.js, src/controllers/c_cashClosures.js, db/migrations/20261110120000_terminal_reports_reconciliation.sql (new), test/terminal-reports.test.js (new).

**Interfaces:** mGetStandaloneReportPayments({shopId, from?, to?, unclosed?, closedAt?, connection?}) returns one row per succeeded standalone payment. standalonePaymentSummary(payments) returns {count,total}. buildCashReconciliation(snapshot,declaration) returns cash/card expected/declared/difference cents. Closure accepts declaration and expectedLastClosureId.

- [ ] Write failing tests for standalone-only closures, shared summary, cents validation and reconciliation including courier movements.
- [ ] Run node --test test/terminal-reports.test.js and observe the missing implementation failure.
- [ ] Add reversible schema migration, shared reader and closure transaction/persistence. Claim only selected payment IDs in the transaction; stale closure IDs return 409.
- [ ] Run new tests and existing cash-closure and delivery-report tests where a disposable database is available.

### Task 2: Statistics integration

**Files:** backend src/controllers/c_orders.js, src/helpers/orderMetrics.js, test/terminal-report-metrics.test.js (new).

**Interfaces:** Metrics add standalonePaymentsCount and standalonePaymentsRevenue; totalRevenue/paymentsSummary/revenueByDayAndPayment include autonomous amounts. averageOrder and totalOrders retain order-only meaning.

- [ ] Write and run failing controller tests for mixed payments, standalone-only periods and day allocation.
- [ ] Read standalone payments through Task 1's shared reader; preserve order/product statistics.
- [ ] Run controller tests, order-metrics-revenue-series and payment-method tests.

### Task 3: Reports, declarations and printing

**Files:** frontend helpers/cashReconciliation.js (new), helpers/paymentMethods.js, store/cashClosures.js, pages/reports.vue, pages/statistics.vue, test/cash-reconciliation.test.js (new), test/reports-reconciliation.test.js (new).

**Interfaces:** closeCurrent dispatch receives {declared_cash_cents,declared_card_cents,expected_last_closure_id}. Reports use snapshot.reconciliation and standalone_terminal_summary. Parsing accepts French decimal commas and preserves explicit zero.

- [ ] Write and run failing behavioral tests for parsing, store payloads, autonomous-only closability and report actions.
- [ ] Add editable declaration fields, calculated/declared/difference display, pending errors and retries. Add X preview using the existing detail dialog and preserve historical Z display.
- [ ] Add print-only report layout and ensure X action never invokes closeCurrent.
- [ ] Run targeted tests, npm run lint and npm run build-local. Review the complete diff and record results.
