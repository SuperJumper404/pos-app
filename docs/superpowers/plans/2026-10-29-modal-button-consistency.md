# Modal button consistency implementation plan

> **For agentic workers:** Use superpowers:executing-plans or focused parallel implementation for the independent file groups below.

**Goal:** Apply all nine modal-button improvements approved in the conversation on 2026-10-29.

**Architecture:** Add opt-in shared modal action and choice classes to the existing design system. Apply them to existing Vuetify controls, preserving handlers, validation, locks, printing, payment and navigation. Keep the existing payment-choice palette.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, existing MDI font and SCSS tokens. No dependency or backend changes.

**Spec:** The user approved all nine groups: discounts; receipt choices; service modes; table selection; completed Terminal payment actions; cancellations/deletions; payment order links; product customization; modal administrative forms.

## Constraints and review focus

- Reuse the current feature branch and clean checkout. No broad refactor.
- Keep all disabled/loading conditions, click handlers, values and query behavior.
- No new confirmation or financial operation. Destructive copy must name the existing action accurately.
- Selected choices require an icon/check or pressed state in addition to color.
- Controls at least 44px, text contrast 4.5:1, keyboard focus, mobile wrapping and reduced-motion support.
- Verify long labels, pending operations, percentage versus amount mode, receipt handoff and canceled-payment associations.

## Shared class contract

- `se-modal`: card with consistent footer spacing, button sizing and modal typography.
- `se-modal-actions`: opt-in footer for nested form components.
- `se-modal-action` and variants `--primary`, `--secondary`, `--success`, `--danger`, `--warning`, `--terminal`: action priority and color.
- `se-modal-icon` (optional `--warning`, `--danger`): 44px icon-only control.
- `se-modal-choice`: large choice button; variants `--green`, `--purple`, `--orange`, `--neutral`, `--compact`, `--selected` (default blue).
- `se-modal-preset`, `se-modal-preset--active`: percentage shortcuts.
- CSS is owned by the primary agent in `assets/scss/design-system.scss`; implementation groups do not edit it.

## Tasks

- [x] Add shared styles and document the modal button pattern in DESIGN.md.
- [x] Menu/detail/payout: discount toggle/presets/actions; receipts; service/table choices; detail cancellation. Preserve existing payment choices.
- [x] Terminal/history/customization components: action hierarchy, filled icons, orange unlink, navigation versus final add action.
- [x] Administrative modal forms: neutral cancel, filled primary save/add/connect action, dangerous actions red; retain all locks.
- [x] Root: table/product/category delete confirmations, order-list cancellation and other modal dismissal labels.
- [x] Run lint and relevant existing tests; no tests mirroring purely visual markup. Adapt only assertions intentionally invalidated by approved copy/icon changes.
- [x] Inspect a batched desktop/mobile browser fixture covering all nine groups, including selected/disabled/loading controls. Fix findings once, then confirm once.
- [x] Run Impeccable detector once on changed UI targets; review only newly introduced findings.
- [x] Review the final diff.

Release: commit and push feature/staging, deploy Docker staging, and confirm actual readiness; release evidence is recorded in the chat and GitHub Actions.
