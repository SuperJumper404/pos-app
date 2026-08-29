const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { sortArchivedOrdersByArchiveDate } = require('../helpers/history')

assert.deepStrictEqual(
  sortArchivedOrdersByArchiveDate([
    { id: 1, archived_at: '2026-08-22 10:15:00', created: '2026-08-22 09:00:00' },
    { id: 2, archived_at: '2026-08-22 10:20:00', created: '2026-08-22 08:00:00' },
    { id: 3, archived_at: '2026-08-22 10:10:00', created: '2026-08-22 11:00:00' },
  ]).map((order) => order.id),
  [2, 1, 3]
)

assert.deepStrictEqual(
  sortArchivedOrdersByArchiveDate([
    { id: 1, created: '2026-08-22 09:00:00' },
    { id: 3, created: '2026-08-22 11:00:00' },
    { id: 2, created: '2026-08-22 08:00:00' },
  ]).map((order) => order.id),
  [3, 1, 2]
)

const historyStoreSource = fs.readFileSync(
  path.join(__dirname, '../store/history.js'),
  'utf8'
)
assert.ok(historyStoreSource.includes('sortArchivedOrdersByArchiveDate'))
assert.ok(historyStoreSource.includes('dispatch(\'set/dataArchivedOrders\', sortedArchivedOrders)'))

console.log('history archive ordering tests passed')
