# Pending Orders Sidebar Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show administrators a live sidebar badge containing the number of orders still waiting for treatment.

**Architecture:** A small pure helper counts `status = 1` orders and formats the badge. The default layout derives the value from Vuex, refreshes orders every 15 seconds outside `/orders`, and cleans up its interval.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Vuetify

## Global Constraints

- Count only orders whose numeric status equals `1`.
- Hide zero and cap visual content at `99+`.
- Do not duplicate polling while `/orders` is active.
- Do not poll for non-admin users.

---

### Task 1: Count and refresh pending orders

**Files:**
- Create: `helpers/orderNotifications.js`
- Create: `test/order-notifications.test.js`
- Modify: `layouts/default.vue`

**Interfaces:**
- Produces: `countPendingOrders(orders)` and `formatPendingOrderBadge(count)`
- Consumes: `orders/dataOrders` and `orders/getAllOrder`

- [ ] Write failing pure-helper and layout-method tests for count, cap, admin polling, `/orders` skip, and cleanup.
- [ ] Run `node test/order-notifications.test.js` and verify RED.
- [ ] Implement the helper, badge template, computed values, interval refresh, and cleanup.
- [ ] Run the targeted test, layout template compilation, and scoped lint; verify GREEN.
- [ ] Commit implementation, test, and this plan with `feat: show pending orders badge`.
