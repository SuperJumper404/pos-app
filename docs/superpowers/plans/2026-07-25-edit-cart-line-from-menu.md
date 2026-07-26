# Edit Cart Line From Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reopen the customization wizard from a cart line in the menu and replace the entire line while preserving quantity.

**Architecture:** Reuse the existing wizard and `replaceConfiguredCartLine` helper already used on the cart page. `pages/menus.vue` tracks the edited line index, preloads its selected choices, and chooses between add and replace when the wizard confirms.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, existing Node assertion tests

## Global Constraints

- Frontend-only change; no API or database modification.
- Clicking image/name/price edits only lines with customization steps.
- Preserve the entire source-line quantity and merge identical resulting configurations.
- Quantity buttons must not open the wizard.
- Run only the targeted customization test, template compilation, and scoped lint.

---

### Task 1: Menu cart-line editing

**Files:**
- Modify: `test/customizations.test.js`
- Modify: `pages/menus.vue`

**Interfaces:**
- Consumes: `replaceConfiguredCartLine(cart, lineIndex, line)` and `ProductCustomizationWizard` v-model
- Produces: `editCartLine(lineIndex)`, `editingCartIndex`, and add-or-replace confirmation behavior

- [ ] **Step 1: Write the failing behavior test**

Extend the existing `menusVm` contract to open line index `0`, assert that current choice IDs prefill the wizard, confirm a different choice set, and assert that quantity `2`, recalculated subtotal, and merging behavior are preserved.

- [ ] **Step 2: Verify RED**

```powershell
node test/customizations.test.js
```

Expected: failure because `menus.vue` does not expose `editCartLine` or import `replaceConfiguredCartLine`.

- [ ] **Step 3: Implement the minimal menu flow**

Import `replaceConfiguredCartLine`, add `editingCartIndex`, make the product-info region clickable and keyboard accessible, initialize the wizard from the source line, replace instead of append on confirmation, and reset the edit index on close.

- [ ] **Step 4: Verify GREEN**

```powershell
node test/customizations.test.js
```

Expected: `customization frontend tests passed`.

- [ ] **Step 5: Run minimal frontend checks**

```powershell
.\node_modules\.bin\eslint.cmd --ignore-path .gitignore pages/menus.vue test/customizations.test.js
node -e "const fs=require('fs');const c=require('vue-template-compiler');const s=c.parseComponent(fs.readFileSync('pages/menus.vue','utf8'));const r=c.compile(s.template.content);if(r.errors.length)process.exit(1)"
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add pages/menus.vue test/customizations.test.js docs/superpowers/plans/2026-07-25-edit-cart-line-from-menu.md
git commit -m "feat: edit cart lines from menu"
```
