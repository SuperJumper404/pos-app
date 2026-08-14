const assert = require('assert')
const {
  buildArchivedClientRows,
  buildArchivedClientsCsv,
  buildArchivedClientsMetrics,
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

const metrics = buildArchivedClientsMetrics(
  [
    ...rows.map((row) => ({ phone: row.phone })),
    { phone: '' },
    { phone: null },
  ],
  rows
)

assert.strictEqual(metrics.clientCount, 2)
assert.strictEqual(metrics.ordersWithPhone, 2)
assert.strictEqual(metrics.ordersWithoutPhone, 2)
assert.strictEqual(metrics.phoneCoverageRatio, '2 / 2')
assert.strictEqual(metrics.inactiveOver30Days, 0)
assert.strictEqual(metrics.returnRate, 50)
assert.strictEqual(metrics.returnRateLabel, '50%')

const oldRows = buildArchivedClientRows(
  [
    {
      customer: 'Dormant',
      phone: '0800000000',
      subtotal: 8,
      created: '2026-07-01T10:00:00.000Z',
    },
  ],
  new Date('2026-08-14T12:00:00.000Z')
)
assert.strictEqual(
  buildArchivedClientsMetrics([{ phone: '0800000000' }], oldRows)
    .inactiveOver30Days,
  1
)

const csv = buildArchivedClientsCsv(rows)
assert.match(csv, /Telephone;Top 3 noms;Commandes;Total depense/)
assert.match(csv, /0600000000;Alice, Bob;3;35.50;11.83;2026-08-10;Hier/)

console.log('clients tests passed')
