const assert = require('assert')

const {
  buildPaymentRevenueChart,
} = require('../helpers/statisticsCharts')

const chart = buildPaymentRevenueChart([
  {
    date: '2026-10-01',
    total: 12,
    payments: {
      'Espèces': 7,
      Stripe: 5,
    },
  },
  {
    date: '2026-10-02',
    total: 0,
    payments: {},
  },
  {
    date: '2026-10-03',
    total: 15,
    payments: {
      Stripe: 15,
    },
  },
])

assert.deepStrictEqual(chart.methods, ['Espèces', 'Stripe'])
assert.strictEqual(chart.maxTotal, 15)
assert.deepStrictEqual(chart.labels, ['1 oct.', '2 oct.', '3 oct.'])
assert.deepStrictEqual(chart.rows[0].segments, [
  { method: 'Espèces', amount: 7, y: 42.666666666667, height: 37.333333333333 },
  { method: 'Stripe', amount: 5, y: 16, height: 26.666666666667 },
])
assert.deepStrictEqual(chart.rows[1].segments, [])
assert.deepStrictEqual(chart.linePoints, [
  { x: 10, y: 16 },
  { x: 50, y: 80 },
  { x: 90, y: 0 },
])

const packageJson = require('../package.json')
assert.ok(
  packageJson.scripts.test.includes('test/statistics-revenue-chart.test.js'),
  'frontend npm test must include the statistics revenue chart contract'
)

console.log('statistics revenue chart tests passed')
