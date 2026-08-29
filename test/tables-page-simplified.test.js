const assert = require('assert')
const fs = require('fs')

const tablesPage = fs.readFileSync('pages/tables/index.vue', 'utf8')

assert.ok(
  tablesPage.includes("Ajouter une table"),
  'tables page keeps the add-table action'
)

assert.ok(
  !tablesPage.includes('tables-hero'),
  'tables page does not render the cockpit hero'
)

assert.ok(
  !tablesPage.includes('tables-summary'),
  'tables page does not render cockpit KPI cards'
)

assert.ok(
  !tablesPage.includes('tables-toolbar'),
  'tables page does not render cockpit search and filters'
)

assert.ok(
  !tablesPage.includes('QR prêt'),
  'tables page does not render the QR-ready chip'
)

assert.ok(
  !tablesPage.includes('tables-card__label'),
  'tables page does not render a redundant table label above the table name'
)
