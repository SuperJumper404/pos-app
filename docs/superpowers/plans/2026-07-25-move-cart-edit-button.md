# Move Cart Edit Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the global cart-line edit action below product price and separate it from per-step edit actions.

**Architecture:** Relocate the existing button in `pages/cart.vue` without changing its handler. Keep `CartCustomizationSummary` responsible for per-step edits.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify

## Global Constraints

- No behavior or API change.
- Keep `editCartLine(itemIndex)` for the global action.
- Keep `editCartLine(itemIndex, stepId)` for per-step actions.

---

### Task 1: Relocate the global edit action

**Files:**
- Modify: `test/customizations.test.js`
- Modify: `pages/cart.vue`

**Interfaces:**
- Consumes: existing `editCartLine`
- Produces: header action labelled `Modifier toutes les options`

- [ ] Add a failing cart component contract that distinguishes the global label from step edit actions.
- [ ] Run `node test/customizations.test.js` and verify RED.
- [ ] Move the button below product price and remove it from `.cart-summary-customizations`.
- [ ] Run the targeted test and template compilation; verify GREEN.
- [ ] Commit `pages/cart.vue`, the test, and this plan with `feat: move cart customization action`.
