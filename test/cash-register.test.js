const assert = require('assert')
const {
  buildCashRegisterCustomerRows,
  getCashRegisterPaymentSummary,
  normalizeOrderIds,
} = require('../helpers/cashRegister')

const orders = [
  {
    id: 1,
    customer: 'Alice',
    subtotal: 12,
    payment_status: 'paid',
    payment_provider: 'stripe',
    payment: 'Apple Pay',
  },
  {
    id: 2,
    customer: 'Alice',
    subtotal: 8,
    payment_status: 'unpaid',
    payment: 'Paiement au comptoir',
  },
  {
    id: 3,
    customer: 'Bob',
    subtotal: 5,
    payment_status: 'requires_payment',
    payment_provider: 'stripe',
    payment: 'Stripe',
  },
]

assert.deepStrictEqual(getCashRegisterPaymentSummary(orders), {
  dueAmount: 13,
  paidAmount: 12,
  totalAmount: 25,
  dueOrderIds: [2, 3],
  paidOrderIds: [1],
  allOrderIds: [1, 2, 3],
  hasAmountDue: true,
  hasAlreadyPaidAmount: true,
})

assert.deepStrictEqual(buildCashRegisterCustomerRows(orders), [
  {
    customer: 'Alice',
    sum_amount: 8,
    paid_amount: 12,
    total_amount: 20,
    ids: [1, 2],
    dueOrderIds: [2],
    paidOrderIds: [1],
    hasAmountDue: true,
    hasAlreadyPaidAmount: true,
  },
  {
    customer: 'Bob',
    sum_amount: 5,
    paid_amount: 0,
    total_amount: 5,
    ids: [3],
    dueOrderIds: [3],
    paidOrderIds: [],
    hasAmountDue: true,
    hasAlreadyPaidAmount: false,
  },
])

assert.deepStrictEqual(
  buildCashRegisterCustomerRows([
    {
      id: 4,
      customer: 'Charlie',
      subtotal: 9,
      payment_status: 'paid',
      payment_provider: 'stripe',
      payment: 'Carte',
    },
  ]),
  [
    {
      customer: 'Charlie',
      sum_amount: 0,
      paid_amount: 9,
      total_amount: 9,
      ids: [4],
      dueOrderIds: [],
      paidOrderIds: [4],
      hasAmountDue: false,
      hasAlreadyPaidAmount: true,
    },
  ]
)

assert.deepStrictEqual(normalizeOrderIds(['1', 2, 'bad', null]), [1, 2])
assert.deepStrictEqual(normalizeOrderIds('7'), [7])
assert.deepStrictEqual(normalizeOrderIds(undefined), [])

console.log('cashRegister tests passed')
