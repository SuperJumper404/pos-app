# Kiosk product description implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Preserve unrelated working-tree changes.

**Goal:** Show product details before choosing kiosk options and before adding simple products.

**Architecture:** Extend the shared wizard with opt-in product details and a resolved image URL. The kiosk opens the same dialog for every product; existing confirmation builds the cart line.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, existing Node assertions and Vue server renderer.

**Spec:** `docs/superpowers/specs/2026-11-12-kiosk-product-description-design.md`

## Global constraints

- No new dependency or API change.
- Keep other wizard consumers unchanged by default.
- Preserve kiosk availability/checkout guards and customization validation.

## Review focus

- First visible step after skipped/inactive steps still shows the description.
- Long and empty descriptions, absent images and literal HTML display safely.
- Simple products require explicit confirmation; cancellation adds nothing.
- Products with no visible options have no empty summary or fictitious step.
- Header/footer remain visible while long content scrolls at narrow widths.

### Task 1: Product presentation and kiosk integration

**Files:** `components/products/ProductCustomizationWizard.vue`, `pages/borne.vue`, `test/kiosk-product-details.test.js`, `test/kiosk-page.test.js`.

**Interfaces:** Wizard props `showProductDetails: Boolean = false`, `productImage: String = ''`; existing `confirm` and `cancel` events retain their payloads.

- [x] Add behavioral rendering and cart-confirmation tests; run them and verify the expected failure.
- [x] Add opt-in presentation, expandable description and simple-product state to the wizard.
- [x] Open the existing wizard for all kiosk products, passing the resolved image URL and enabling product details.
- [x] Run focused tests, the existing npm test suite and npm run lint; report unrelated failures.
- [x] Inspect the final diff and attempt local browser verification; localhost:3000 reports ERR_CONNECTION_REFUSED.

Execution note: work in the user-selected checkout on `codex/standalone-terminal-payments`; no commit, branch switch or worktree copy is needed for this targeted change. User approved implementation with “oui vas y”.

## Verification results

- RED: new behavioral test fails because the description is absent before implementation.
- GREEN: `node test/kiosk-product-details.test.js`, `node test/kiosk-page.test.js` and `node test/customizations.test.js` pass.
- `npm run lint` exits 0 with 0 errors and 161 warnings across the existing project.
- `npm test` was run, then interrupted after the unrelated courier test failed and stopped progressing. Observed failures in `test/courier-mobile.test.js`: “mount reads current availability and balance without any availability write”; “successful refresh clears only its resource read failure, not another failed resource”; “read recovery preserves an unresolved command error through later successful reads”. No courier files were modified by this task.
- Read-only independent review found no actionable correctness issues. Real narrow-viewport layout, backend image loading and fixed-footer rendering were not visually verified because the local server is unavailable.
- `git diff --check` passes for the modified UI and kiosk test files.
