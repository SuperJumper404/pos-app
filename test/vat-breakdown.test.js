const assert = require('assert')
const { normalizeVatBreakdown } = require('../helpers/vat')

assert.deepStrictEqual(
  normalizeVatBreakdown([
    { vat_rate: 10, total_ht: 9.09, total_vat: 0.91, total: 10 },
    { vat_rate: 5.5, total_ht: 1.99, total_vat: 0.11, total: 2.1 },
    { vat_rate: 10, total_ht: 4.55, total_vat: 0.45, total: 5 },
  ]),
  [
    { vatRate: 5.5, totalHt: 1.99, totalVat: 0.11, totalTtc: 2.1 },
    { vatRate: 10, totalHt: 13.64, totalVat: 1.36, totalTtc: 15 },
  ]
)

console.log('vat breakdown tests passed')
