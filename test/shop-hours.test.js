const assert = require('assert')
const {
  getDayPeriods,
  isHourInPeriods,
  normalizeShopHours,
  validPeriods,
} = require('../helpers/shopHours')

assert.deepStrictEqual(getDayPeriods({ from: 8, to: 20 }), [
  { from: 8, to: 20 },
])
assert.deepStrictEqual(
  getDayPeriods({ periods: [{ from: 8, to: 12 }, { from: 14, to: 17 }] }),
  [{ from: 8, to: 12 }, { from: 14, to: 17 }]
)
assert.strictEqual(
  validPeriods({ periods: [{ from: 8, to: 12 }, { from: 14, to: 17 }] }).length,
  2
)
assert.strictEqual(
  isHourInPeriods({ periods: [{ from: 8, to: 12 }, { from: 14, to: 17 }] }, 13),
  false
)
assert.strictEqual(
  isHourInPeriods({ periods: [{ from: 8, to: 12 }, { from: 14, to: 17 }] }, 15),
  true
)
assert.deepStrictEqual(
  normalizeShopHours([{ dayName: 'Lundi', from: 8, to: 20 }])[0].periods,
  [{ from: 8, to: 20 }]
)

console.log('shop hours tests passed')
