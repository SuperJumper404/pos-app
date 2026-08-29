const assert = require('assert')
const {
  getPaymentMethodOptions,
  normalizePaymentMethods,
  normalizePaymentSummary,
} = require('../helpers/paymentMethods')

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

assert.deepStrictEqual(
  normalizePaymentSummary([
    { payment: 'carte bancaire', total: 39.4 },
    { payment: 'Carte bancaire', total: 47.6 },
    { payment: 'espèces', total: 34.7 },
    { payment: 'Espèces', total: 20 },
    { payment: 'Ticket resto', total: 22.5 },
    { payment: 'ticket resto', total: 26 },
  ]),
  [
    { payment: 'Carte bancaire', total: 87 },
    { payment: 'Espèces', total: 54.7 },
    { payment: 'Ticket resto', total: 48.5 },
  ]
)

assert.deepStrictEqual(
  normalizePaymentSummary([
    { payment: 'Carte bancaire', total: 10, orders_count: 1 },
    { payment: 'carte bancaire', total: 15, orders_count: 2 },
  ]),
  [{ payment: 'Carte bancaire', total: 25, orders_count: 3 }]
)

assert.deepStrictEqual(
  normalizePaymentSummary([
    { payment: 'Cheques', total: 68.5, orders_count: 12 },
    { payment: 'Chèque', total: 78, orders_count: 4 },
  ]),
  [{ payment: 'Chèque', total: 146.5, orders_count: 16 }]
)

console.log('payment methods tests passed')
