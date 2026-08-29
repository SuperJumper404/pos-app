# Mes Clients Archives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `Mes clients` frontend module that summarizes archived orders by customer phone number.

**Architecture:** Add a focused helper that converts archived orders into client table rows, then consume it from a Nuxt page. Add the route to the existing dashboard list and reuse `history` permissions for access.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, Node assertion tests.

## Global Constraints

- Use only archived orders from `history/getAllArchivedOrders` and `history/dataArchivedOrders`.
- Exclude archived orders without a usable `phone`.
- Group clients by normalized phone number.
- Display `Derniere visite` as a relative day label, not a raw date.
- Do not add badges.
- Do not add backend API changes or dependencies.
- Keep changes small and consistent with existing Vuetify pages.

---

### Task 1: Archived Client Aggregation Helper

**Files:**
- Create: `helpers/clients.js`
- Create: `test/clients.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizeClientPhone(phone: unknown): string`
- Produces: `buildArchivedClientRows(orders: Array<object>, now?: Date): Array<object>`
- Produces rows with `phoneKey`, `phone`, `topNames`, `orderCount`, `totalSpent`, `averageSpent`, `firstOrderAt`, `lastOrderAt`, `lastVisitDays`, `lastVisitLabel`, and `searchText`.

- [ ] **Step 1: Write the failing test**

```javascript
const assert = require('assert')
const {
  buildArchivedClientRows,
  normalizeClientPhone,
} = require('../helpers/clients')

assert.strictEqual(normalizeClientPhone('06 00-00.00.00'), '0600000000')

const rows = buildArchivedClientRows(
  [
    {
      customer: 'Alice',
      phone: '06 00 00 00 00',
      subtotal: '10.50',
      created: '2026-08-10T10:00:00.000Z',
    },
    {
      customer: 'Alice',
      phone: '0600000000',
      subtotal: 20,
      created: '2026-08-12T10:00:00.000Z',
    },
    {
      customer: 'Bob',
      phone: '06-00-00-00-00',
      subtotal: 5,
      created: '2026-08-13T10:00:00.000Z',
    },
    {
      customer: 'Charlie',
      phone: '0700000000',
      subtotal: 12,
      created: '2026-08-14T10:00:00.000Z',
    },
    {
      customer: 'Sans tel',
      phone: '',
      subtotal: 99,
      created: '2026-08-14T10:00:00.000Z',
    },
  ],
  new Date('2026-08-14T12:00:00.000Z')
)

assert.strictEqual(rows.length, 2)
assert.strictEqual(rows[0].phoneKey, '0700000000')
assert.strictEqual(rows[0].lastVisitLabel, "Aujourd'hui")

const grouped = rows.find((row) => row.phoneKey === '0600000000')
assert.deepStrictEqual(grouped.topNames, ['Alice', 'Bob'])
assert.strictEqual(grouped.orderCount, 3)
assert.strictEqual(grouped.totalSpent, 35.5)
assert.strictEqual(grouped.averageSpent, 11.83)
assert.strictEqual(grouped.firstOrderAt, '2026-08-10T10:00:00.000Z')
assert.strictEqual(grouped.lastOrderAt, '2026-08-13T10:00:00.000Z')
assert.strictEqual(grouped.lastVisitDays, 1)
assert.strictEqual(grouped.lastVisitLabel, 'Hier')
assert.match(grouped.searchText, /Alice/)
assert.match(grouped.searchText, /Bob/)

console.log('clients tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/clients.test.js`
Expected: FAIL because `../helpers/clients` does not exist.

- [ ] **Step 3: Write minimal implementation**

```javascript
const normalizeClientPhone = (phone) =>
  String(phone == null ? '' : phone).replace(/[^\d+]/g, '').trim()

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100

const dayDiff = (from, to) => {
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.max(0, Math.floor((endDay - startDay) / 86400000))
}

const lastVisitLabel = (days) => {
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return `Il y a ${days} jours`
}

const buildArchivedClientRows = (orders, now = new Date()) => {
  const groups = {}

  ;(Array.isArray(orders) ? orders : []).forEach((order) => {
    const phoneKey = normalizeClientPhone(order && order.phone)
    if (!phoneKey) return

    if (!groups[phoneKey]) {
      groups[phoneKey] = {
        phoneKey,
        phone: String(order.phone).trim(),
        names: {},
        orderCount: 0,
        totalSpent: 0,
        firstOrderAt: null,
        lastOrderAt: null,
      }
    }

    const group = groups[phoneKey]
    const name = String((order && order.customer) || '').trim()
    if (name) group.names[name] = (group.names[name] || 0) + 1
    group.orderCount += 1
    group.totalSpent = roundMoney(group.totalSpent + Number(order.subtotal || 0))

    const created = new Date(order.created)
    if (!Number.isNaN(created.getTime())) {
      const iso = created.toISOString()
      if (!group.firstOrderAt || iso < group.firstOrderAt) group.firstOrderAt = iso
      if (!group.lastOrderAt || iso > group.lastOrderAt) group.lastOrderAt = iso
    }
  })

  return Object.values(groups)
    .map((group) => {
      const topNames = Object.entries(group.names)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([name]) => name)
      const lastVisitDays =
        group.lastOrderAt == null ? null : dayDiff(group.lastOrderAt, now)

      return {
        ...group,
        topNames,
        averageSpent: roundMoney(group.totalSpent / group.orderCount),
        lastVisitDays,
        lastVisitLabel:
          lastVisitDays == null ? '-' : lastVisitLabel(lastVisitDays),
        searchText: [group.phone, group.phoneKey, ...topNames].join(' '),
      }
    })
    .sort((a, b) => String(b.lastOrderAt || '').localeCompare(a.lastOrderAt || ''))
}

module.exports = {
  buildArchivedClientRows,
  normalizeClientPhone,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/clients.test.js`
Expected: PASS with `clients tests passed`.

- [ ] **Step 5: Add test to package script**

Insert `node test/clients.test.js &&` into `package.json` `scripts.test`.

### Task 2: Clients Page

**Files:**
- Create: `pages/clients.vue`
- Test: `test/clients-page.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildArchivedClientRows(orders, now)` from `helpers/clients.js`.
- Consumes: `history/getAllArchivedOrders`, `history/dataArchivedOrders`, and `history/message`.

- [ ] **Step 1: Write the failing page test**

```javascript
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'pages', 'clients.vue'), 'utf8')

assert.match(source, /middleware:\s*['"]auth['"]/)
assert.match(source, /history\/getAllArchivedOrders/)
assert.match(source, /buildArchivedClientRows/)
assert.match(source, /value:\s*['"]phone['"]/)
assert.match(source, /value:\s*['"]topNames['"]/)
assert.match(source, /value:\s*['"]orderCount['"]/)
assert.match(source, /value:\s*['"]totalSpent['"]/)
assert.match(source, /value:\s*['"]averageSpent['"]/)
assert.match(source, /value:\s*['"]firstOrderAt['"]/)
assert.match(source, /value:\s*['"]lastVisitDays['"]/)
assert.match(source, /formatCurrency\(item\.totalSpent\)/)
assert.match(source, /formatCurrency\(item\.averageSpent\)/)
assert.match(source, /item\.lastVisitLabel/)

console.log('clients page tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/clients-page.test.js`
Expected: FAIL because `pages/clients.vue` does not exist.

- [ ] **Step 3: Create the page**

Create a Vuetify page with:
- `middleware: 'auth'`
- imports for `Loading`, `price`, `moment`, and `buildArchivedClientRows`
- `loadPage`, `errMsg`, and `searchFilter` data
- headers for the seven required columns
- computed `archivedOrders`, `message`, and `clientRows`
- `mounted()` dispatching `history/getAllArchivedOrders`
- methods `formatDate(date)` and `customFilter(value, search, item)` using `item.searchText`
- templates for top names chips, money columns, first order date, and last visit label

- [ ] **Step 4: Run page test to verify it passes**

Run: `node test/clients-page.test.js`
Expected: PASS with `clients page tests passed`.

- [ ] **Step 5: Add test to package script**

Insert `node test/clients-page.test.js &&` into `package.json` `scripts.test`.

### Task 3: Navigation

**Files:**
- Modify: `helpers/listdashboard.js`
- Modify: `helpers/staffRoles.js`
- Test: `test/admin-navigation.test.js`
- Test: `test/staff-roles.test.js`

**Interfaces:**
- Produces a navigation entry `{ icon: 'mdi-account-multiple', title: 'Mes clients', routeName: 'clients', to: '/clients', moduleKey: 'clients', isAdmin: true }`.
- Maps `clients` to the existing permission key `history`.
- Adds `clients` to legacy admin access.

- [ ] **Step 1: Add failing navigation assertions**

Add assertions that `helpers/listdashboard.js` contains a `Mes clients` route and that `helpers/staffRoles.js` maps `clients` to `history`.

- [ ] **Step 2: Run navigation tests to verify failure**

Run: `node test/admin-navigation.test.js`
Expected: FAIL because `clients` navigation is not present.

- [ ] **Step 3: Implement navigation**

Add the Clients item near Historique in `helpers/listdashboard.js`. Add `clients` to `LEGACY_MODULES_BY_ACCESS[ACCESS.ADMIN]` and `MODULE_PERMISSION_BY_NAV_KEY.clients = 'history'` in `helpers/staffRoles.js`.

- [ ] **Step 4: Run navigation tests**

Run: `node test/admin-navigation.test.js && node test/staff-roles.test.js`
Expected: PASS.

### Task 4: Final Verification

**Files:**
- Modify: none unless verification reveals an issue.

- [ ] **Step 1: Run focused tests**

Run: `node test/clients.test.js && node test/clients-page.test.js && node test/admin-navigation.test.js && node test/staff-roles.test.js`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS or report existing unrelated lint failures with exact output.

- [ ] **Step 3: Check git diff**

Run: `git diff -- helpers/clients.js pages/clients.vue helpers/listdashboard.js helpers/staffRoles.js test/clients.test.js test/clients-page.test.js test/admin-navigation.test.js test/staff-roles.test.js package.json`
Expected: only intended module clients changes.
