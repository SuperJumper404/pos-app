const assert = require('assert')
const fs = require('fs')
const path = require('path')
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

assert.deepStrictEqual(
  normalizeVatBreakdown([
    { vat_rate: 10, total_ht: 9.09, total_vat: 0.91, total: 10 },
    { vat_rate: 5.5, total_ht: 9.48, total_vat: 0.52, total: 10 },
    { vat_rate: 10, total_ht: 4.55, total_vat: 0.45, total: 5 },
  ]),
  [
    { vatRate: 5.5, totalHt: 9.48, totalVat: 0.52, totalTtc: 10 },
    { vatRate: 10, totalHt: 13.64, totalVat: 1.36, totalTtc: 15 },
  ]
)

const newProductSource = fs.readFileSync(
  path.join(__dirname, '../pages/products/newproduct.vue'),
  'utf8'
)
const editProductSource = fs.readFileSync(
  path.join(__dirname, '../pages/products/edit/_id/index.vue'),
  'utf8'
)
const orderDetailSource = fs.readFileSync(
  path.join(__dirname, '../pages/orders/detail/_id.vue'),
  'utf8'
)
const historySource = fs.readFileSync(
  path.join(__dirname, '../pages/history/index.vue'),
  'utf8'
)
const receiptSource = fs.readFileSync(
  path.join(__dirname, '../pages/receip.vue'),
  'utf8'
)
const historyTicketSource = fs.readFileSync(
  path.join(__dirname, '../pages/history/ticket/_id.vue'),
  'utf8'
)
const settingsSource = fs.readFileSync(
  path.join(__dirname, '../pages/settings.vue'),
  'utf8'
)
const paymentMethodsSource = fs.readFileSync(
  path.join(__dirname, '../helpers/paymentMethods.js'),
  'utf8'
)
const {
  getPaymentMethodOptions,
  normalizePaymentMethods,
} = require('../helpers/paymentMethods')

for (const source of [newProductSource, editProductSource]) {
  assert.ok(source.includes('vat_rate_dine_in'))
  assert.ok(source.includes('vat_rate_takeaway'))
  assert.ok(source.includes('TVA sur place'))
  assert.ok(source.includes('TVA à emporter'))
}

assert.ok(orderDetailSource.includes('<VatBreakdown'))
assert.ok(historySource.includes('<VatBreakdown'))
assert.ok(receiptSource.includes('this.vatBreakdown.forEach'))
assert.ok(historyTicketSource.includes('this.vatBreakdown.forEach'))
assert.ok(settingsSource.includes('PAYMENT_METHOD_OPTIONS'))
assert.ok(paymentMethodsSource.includes('Ticket resto'))
assert.deepStrictEqual(
  normalizePaymentMethods([
    { text: 'Carte bancaire', value: 'Carte bancaire', icon: 'mdi-credit-card-outline' },
    { text: 'Espèces', value: 'Espèces', icon: 'mdi-cash' },
  ]),
  ['Carte bancaire', 'Espèces']
)
assert.deepStrictEqual(
  getPaymentMethodOptions([
    { text: 'Ticket resto', value: 'Ticket resto', icon: 'mdi-ticket-confirmation-outline' },
  ]).map((method) => method.text),
  ['Ticket resto']
)

console.log('vat breakdown tests passed')
