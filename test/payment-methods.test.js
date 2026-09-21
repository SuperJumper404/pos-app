const assert = require('assert')
const {
  getPaymentMethodOptions,
  normalizePaymentMethods,
  normalizePaymentMethod,
  normalizePaymentSummary,
} = require('../helpers/paymentMethods')

if (normalizePaymentMethod('carte bancaire', 'stripe') !== 'Stripe') {
  throw new Error('Stripe must stay distinct from card payments')
}

assert.deepStrictEqual(
  normalizePaymentMethods([
    { text: 'Carte bancaire', value: 'Carte bancaire', icon: 'mdi-credit-card-outline' },
    { text: 'Espèces', value: 'Espèces', icon: 'mdi-cash' },
  ]),
  ['Carte bancaire', 'Espèces']
)

assert.deepStrictEqual(
  getPaymentMethodOptions([
    { text: 'Ticket restaurant', value: 'Ticket restaurant', icon: 'mdi-ticket-confirmation-outline' },
  ]).map((method) => method.text),
  ['Ticket restaurant']
)

assert.deepStrictEqual(
  normalizePaymentSummary([
    { payment: 'carte bancaire', total: 39.4 },
    { payment: 'Carte bancaire', total: 47.6 },
    { payment: 'espèces', total: 34.7 },
    { payment: 'Espèces', total: 20 },
    { payment: 'Ticket restaurant', total: 22.5 },
    { payment: 'ticket resto', total: 26 },
    { payment: 'carte bancaire', payment_provider: 'stripe', total: 12 },
  ]),
  [
    { payment: 'Carte bancaire', total: 87 },
    { payment: 'Espèces', total: 54.7 },
    { payment: 'Ticket restaurant', total: 48.5 },
    { payment: 'Stripe', payment_provider: 'stripe', total: 12 },
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
