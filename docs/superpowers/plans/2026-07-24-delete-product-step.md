# Delete Product Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent product-step deletion action that detaches every affected product, deletes choices and images, and preserves historical order snapshots.

**Architecture:** The existing authenticated DELETE endpoint becomes an atomic hard delete implemented in the customization module. The admin page adds a separate destructive confirmation dialog while retaining the existing deactivate/reactivate flow.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Vuetify, Express, MySQL

## Global Constraints

- Keep the existing deactivate/reactivate behavior.
- Deleting a step automatically removes it from all products in the same shop.
- Do not modify order or archive snapshot rows.
- Preserve the user-owned backend `README.md` and `express-pos.code-workspace` changes.
- Run only the targeted customization tests requested by the user.

---

### Task 1: Backend permanent deletion

**Files:**
- Modify: `../express-pos/test/checkout-contract.test.js`
- Modify: `../express-pos/src/modules/m_customizations.js`
- Modify: `../express-pos/src/controllers/c_customizations.js`

**Interfaces:**
- Consumes: `DELETE /customization-steps/:id`, `withTransaction`, shop ownership
- Produces: `deleteCustomizationStep({ shopId, stepId, connection? }) -> { affectedRows, images }`

- [ ] **Step 1: Write a failing targeted contract test**

Add assertions proving that deletion selects the owned step and choice images, deletes product-choice links, product-step links, choices, then the step, and returns the image names without touching snapshot tables.

- [ ] **Step 2: Run the backend contract test and verify RED**

```powershell
node test/checkout-contract.test.js
```

Expected: failure because `deleteCustomizationStep` still issues `UPDATE customization_steps SET active = 0`.

- [ ] **Step 3: Implement the minimal transaction and controller cleanup**

Use `withTransaction` unless a connection is supplied. Verify ownership inside the transaction, collect simple-choice image filenames, execute the four child-to-parent DELETE statements, return `{ affectedRows: 1, images }`, change the success copy to `Étape de personnalisation supprimée.`, and call the existing best-effort file removal for each returned image.

- [ ] **Step 4: Run the backend contract test and verify GREEN**

```powershell
node test/checkout-contract.test.js
```

Expected: `customization and checkout contracts passed`.

- [ ] **Step 5: Commit the backend change without unrelated files**

```powershell
git add src/modules/m_customizations.js src/controllers/c_customizations.js test/checkout-contract.test.js
git commit -m "feat: permanently delete customization steps"
```

### Task 2: Frontend permanent-delete dialog

**Files:**
- Modify: `test/customizations.test.js`
- Modify: `pages/customizations/index.vue`

**Interfaces:**
- Consumes: `customizations/deleteStep`, `selectedStepProducts`
- Produces: separate `stepDeleteDialog`, `stepToDeleteId`, request/cancel/confirm methods

- [ ] **Step 1: Write a failing targeted UI contract test**

Add source-level assertions for the `Supprimer définitivement` action, its separate dialog, explicit `stepToDeleteId`, duplicate-submit guard, impacted-product list, success cleanup, and failure target preservation.

- [ ] **Step 2: Run the frontend customization test and verify RED**

```powershell
node test/customizations.test.js
```

Expected: failure because the permanent-delete UI does not exist.

- [ ] **Step 3: Implement the minimal Vuetify UI**

Add an error-colored delete button, a persistent confirmation dialog with the selected step name and affected products, and request/cancel/confirm methods. Close and clear the dialog only after the Vuex action succeeds.

- [ ] **Step 4: Run the frontend customization test and verify GREEN**

```powershell
node test/customizations.test.js
```

Expected: `customization frontend tests passed`.

- [ ] **Step 5: Run a scoped lint and commit**

```powershell
.\node_modules\.bin\eslint.cmd --ignore-path .gitignore pages/customizations/index.vue test/customizations.test.js
git add pages/customizations/index.vue test/customizations.test.js docs/superpowers/plans/2026-07-24-delete-product-step.md
git commit -m "feat: delete product steps from administration"
```

### Task 3: Minimal handoff verification

**Files:**
- Verify only

**Interfaces:**
- Consumes: both feature commits
- Produces: runnable targeted evidence for manual application testing

- [ ] **Step 1: Re-run the two targeted tests**

```powershell
node test/customizations.test.js
node ../express-pos/test/checkout-contract.test.js
```

Expected: both scripts exit 0.

- [ ] **Step 2: Check diffs and working trees**

```powershell
git diff --check
git status --short
git -C ../express-pos diff --check
git -C ../express-pos status --short
```

Expected: frontend clean; backend contains only the pre-existing `README.md` modification and untracked `express-pos.code-workspace`.
