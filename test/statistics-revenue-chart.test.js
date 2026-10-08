const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
  buildPaymentRevenueChartConfig,
} = require('../helpers/statisticsCharts')

const chart = buildPaymentRevenueChartConfig([
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

assert.deepStrictEqual(chart.data.labels, ['1 oct.', '2 oct.', '3 oct.'])
assert.strictEqual(chart.maxTotal, 15)
assert.deepStrictEqual(chart.paymentMethods, ['Espèces', 'Stripe'])
assert.deepStrictEqual(chart.data.datasets.map((dataset) => dataset.label), [
  'Espèces',
  'Stripe',
  'Total jour',
])
assert.deepStrictEqual(chart.data.datasets.map((dataset) => dataset.type), [
  'bar',
  'bar',
  'line',
])
assert.deepStrictEqual(chart.data.datasets[0].data, [7, 0, 0])
assert.deepStrictEqual(chart.data.datasets[1].data, [5, 0, 15])
assert.deepStrictEqual(chart.data.datasets[2].data, [12, 0, 15])
assert.strictEqual(chart.data.datasets[0].stack, 'payments')
assert.strictEqual(chart.data.datasets[1].stack, 'payments')
assert.strictEqual(chart.options.scales.x.stacked, true)
assert.strictEqual(chart.options.scales.y.stacked, true)
assert.strictEqual(chart.options.plugins.tooltip.mode, 'index')

const statisticsSource = fs.readFileSync(
  path.join(__dirname, '../pages/statistics.vue'),
  'utf8'
)
assert.match(statisticsSource, /<PaymentRevenueChart/)
assert.doesNotMatch(statisticsSource, /statistics-chart__svg/)

const packageJson = require('../package.json')
assert.ok(
  packageJson.scripts.test.includes('test/statistics-revenue-chart.test.js'),
  'frontend npm test must include the statistics revenue chart contract'
)

console.log('statistics revenue chart tests passed')
