const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  archiveOrdersSafely,
  buildRetryPaymentState,
  buildCashRegisterCustomerRows,
  getCashRegisterPaymentSummary,
  normalizeOrderIds,
  summarizeArchiveResults,
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

assert.deepStrictEqual(summarizeArchiveResults([1, 2, 3], [true, false, true]), {
  successfulOrderIds: [1, 3],
  failedOrderIds: [2],
  allSucceeded: false,
})

assert.deepStrictEqual(summarizeArchiveResults(['1', 2], [true, true]), {
  successfulOrderIds: [1, 2],
  failedOrderIds: [],
  allSucceeded: true,
})

assert.deepStrictEqual(summarizeArchiveResults(['1', 2, '3'], [true]), {
  successfulOrderIds: [1],
  failedOrderIds: [2, 3],
  allSucceeded: false,
})

assert.deepStrictEqual(summarizeArchiveResults([], []), {
  successfulOrderIds: [],
  failedOrderIds: [],
  allSucceeded: false,
})

assert.deepStrictEqual(buildRetryPaymentState([2], [2, 3]), {
  retryRequiresPaymentMethod: true,
})
assert.deepStrictEqual(buildRetryPaymentState([1], [2, 3]), {
  retryRequiresPaymentMethod: false,
})
assert.deepStrictEqual(buildRetryPaymentState([1, 2], [2, 3]), {
  retryRequiresPaymentMethod: true,
})

const runAsyncAssertions = async () => {
  const attemptedOrderIds = []
  const archiveSummary = await archiveOrdersSafely(
    [1, 2, 3, 4],
    (orderId) => {
      attemptedOrderIds.push(orderId)
      if (orderId === 1) throw new Error('sync failure')
      if (orderId === 2) return Promise.reject(new Error('async failure'))
      if (orderId === 3) return false
      return true
    }
  )

  assert.deepStrictEqual(attemptedOrderIds, [1, 2, 3, 4])
  assert.deepStrictEqual(archiveSummary, {
    successfulOrderIds: [4],
    failedOrderIds: [1, 2, 3],
    allSucceeded: false,
  })

  const payoutSource = fs.readFileSync(
    path.join(__dirname, '../pages/cashregister/payout/_id.vue'),
    'utf8'
  )
  assert.ok(payoutSource.includes('archiveOrdersSafely'))
  assert.ok(!payoutSource.includes('Promise.allSettled'))
  assert.ok(payoutSource.includes('notify: false'))
  assert.ok(payoutSource.includes('this.$router.replace'))
  assert.ok(payoutSource.includes('if (!orderIds.length)'))
  assert.ok(payoutSource.includes('buildRetryPaymentState'))
  assert.ok(!payoutSource.includes('retryPaymentMethod'))
  assert.ok(payoutSource.includes('retryRequiresPaymentMethod'))
  assert.ok(payoutSource.includes('initialDueOrderIds'))
  assert.ok(payoutSource.includes('selectedPaymentMethod'))
  assert.ok(payoutSource.includes(':disabled="loadingBtn"'))
  assert.ok(payoutSource.includes('if (this.loadingBtn) return'))
  assert.ok(payoutSource.includes("this.$route.path !== '/cashregister'"))
  const btnYesSource = payoutSource.slice(payoutSource.indexOf('async btnYes'))
  assert.ok(btnYesSource.includes('? this.selectedPaymentMethod'))
  assert.ok(
    btnYesSource.indexOf('this.ordersToArchive = archiveSummary.failedOrderIds') <
      btnYesSource.indexOf("dispatch('orders/getAllOrder'")
  )

  const ordersSource = fs.readFileSync(
    path.join(__dirname, '../store/orders.js'),
    'utf8'
  )
  const archiveOrderSource = ordersSource.slice(
    ordersSource.indexOf('archiveOrder'),
    ordersSource.indexOf('refundStripeOrder')
  )
  assert.ok(archiveOrderSource.includes('error.response?.data?.message'))
  assert.ok(archiveOrderSource.includes("Impossible d'archiver la commande."))
  assert.ok(archiveOrderSource.includes('params.notify !== false'))
  assert.ok(
    archiveOrderSource.includes('skipGlobalErrorNotification: params.notify === false')
  )

  console.log('cashRegister tests passed')
}

runAsyncAssertions().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
