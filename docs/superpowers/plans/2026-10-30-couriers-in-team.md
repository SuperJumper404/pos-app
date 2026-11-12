# Courier Management in Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Centralize courier creation, credentials, activation and availability in Equipe; remove the Livreurs tab from Livraison.

**Architecture:** Preserve existing staff accounts and role 6. Reuse `delivery/operatorLoad({resource:'couriers'})` and `delivery/operatorAvailability({courierId,available})` for availability and mission counts. Treat a failed confirmation reload as unknown availability. Keep staff PINs transient and encrypted; no authentication or database changes.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Vuetify, existing Node behavioral tests.

**Spec:** User request in chat: create couriers from team management and remove their delivery tab. Existing courier-management capabilities move with them.

## Evidence

- Staging diagnostic account `Test diagnostic livraison 30-10` was created successfully, disabled, after explicit user confirmation. No existing account or PIN was changed.
- Effective staging PIN key works; encrypted column and migration exist; 52 server migrations are applied with none pending.
- Staging courier PIN checks: one readable new account and one legacy hash-only account. The existing account displays `PIN a regenerer`; its current login PIN remains usable.
- Do not invent a backend fix or weaken encryption for an error not reproduced. Keep the disabled diagnostic account unchanged and report it.

## Constraints and Review Focus

- Work on the current clean branch; do not switch branches, commit, push or deploy unless requested.
- Equipe remains administrator-only. Livraison keeps courier data for assignment and cash management, without rendering the courier-management tab.
- Preserve creation success even if the availability directory cannot load.
- Unknown availability must not display a false available/unavailable state.
- Clear courier directory context and ignore late replies after session/shop changes or page teardown.
- Never reset a real PIN, expose PINs in persistence, or output server secrets.

## Task 1: Team UI and Delivery Navigation

Files: `pages/staff/index.vue`, `pages/livraison/index.vue`, `store/delivery.js`, `test/staff-pin-visibility.test.js`, `test/delivery-operator.test.js`.

- [x] Add RED tests for the courier shortcut, role-6 creation and masked credentials, availability loading/updating and stale-response denial.
- [x] Change navigation tests to require only Commandes, Remises d'especes and Reglages, with correct cash/settings panels.
- [x] Add an accessible courier creation shortcut to Equipe and preserve generic staff creation.
- [x] Display courier availability and mission counts in team rows using the existing scoped delivery store; preserve disabled/error/unknown states.
- [x] Remove the delivery courier tab and component mounting while retaining assignment data loads.
- [x] Run targeted tests and ESLint, then the full frontend suite.
- [x] Run the design detector once; verify rendered UI locally when possible without modifying staging accounts.
- [x] Report actual reproduction result, local changes and any validation limits.

## Verification notes

- All 54 targeted staff/operator tests pass; touched Vue/JS files pass ESLint. Final full `npm test` (including pretest) exited 0 after the confirmation fix; log: `.superpowers/couriers-team-20261030-tests.log`.
- A bounded independent review identified a successful availability PATCH followed by a failed directory GET. Added failing regressions first, then changed the store to return unknown confirmation and the team page to hide stale availability and offer Actualiser.
- Design detector: no blocking findings; one advisory concerns an unchanged 18px delivery card title outside this change.
- Local visual QA used the actual staff SFC and installed Vue/Vuetify with fictional in-memory records, without any server access. Checked the courier shortcut and role preset, desktop layout and 390px mobile layout; inactive courier availability is disabled. This is component QA, not a full local API/database end-to-end test.
- Staging proof: `.superpowers/courier-staging-diagnostic-20261030.jpg`. Local component captures: `.superpowers/couriers-team-local-20261030.jpg` and `.superpowers/couriers-team-mobile-20261030.jpg` (ignored diagnostic artifacts).
- Diagnostic preview server stopped and temporary tab closed; browser viewport restored. Staging tab retained for the user. Changes remain local and uncommitted; no deployment performed.
