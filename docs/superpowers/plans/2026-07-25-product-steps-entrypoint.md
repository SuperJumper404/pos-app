# Product Steps Entrypoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove product steps from the admin drawer and expose their management from the Products page.

**Architecture:** Preserve the existing dashboard metadata and route, but mark the customization item as hidden from admin navigation. Add a responsive `Gérer les étapes` action to the Products toolbar.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify

## Global Constraints

- Preserve `/customizations` and current customization management behavior.
- Do not change product create/edit configurators.
- Keep both toolbar actions usable on small screens.

---

### Task 1: Move the navigation entrypoint

**Files:**
- Create: `test/admin-navigation.test.js`
- Modify: `helpers/listdashboard.js`
- Modify: `pages/products/index.vue`

**Interfaces:**
- Consumes: dashboard item `routeName: customizations`
- Produces: hidden drawer item and Products toolbar navigation to `/customizations`

- [ ] Write a failing test that evaluates the dashboard list and Products component navigation method.
- [ ] Run `node test/admin-navigation.test.js` and verify RED.
- [ ] Hide the drawer item and add the responsive toolbar button.
- [ ] Run the targeted test, template compilation, and scoped lint; verify GREEN.
- [ ] Commit implementation, test, and this plan with `feat: manage product steps from products`.
