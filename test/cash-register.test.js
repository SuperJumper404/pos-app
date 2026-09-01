const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  archiveOrdersSafely,
  buildCashRegisterCustomerRows,
  getCashRegisterPaymentSummary,
  isCashRegisterOrderArchivable,
  normalizeOrderIds,
  resolveRetryDueOrderIds,
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
  getCashRegisterPaymentSummary([
    {
      id: 6,
      customer: 'Counter Bug',
      subtotal: 4,
      payment_status: 'paid',
      payment: 'Paiement au comptoir',
    },
  ]),
  {
    dueAmount: 4,
    paidAmount: 0,
    totalAmount: 4,
    dueOrderIds: [6],
    paidOrderIds: [],
    allOrderIds: [6],
    hasAmountDue: true,
    hasAlreadyPaidAmount: false,
  }
)

assert.strictEqual(
  isCashRegisterOrderArchivable({
    payment_status: 'requires_payment',
    payment_provider: 'stripe',
    stock_reservation_status: 'released',
  }),
  false
)
assert.strictEqual(
  isCashRegisterOrderArchivable({
    payment_status: 'requires_payment',
    payment_provider: 'stripe',
    stock_reservation_status: 'reserved',
  }),
  true
)
assert.deepStrictEqual(
  buildCashRegisterCustomerRows([
    {
      id: 5,
      customer: 'Expired Stripe',
      subtotal: 15,
      payment_status: 'requires_payment',
      payment_provider: 'stripe',
      stock_reservation_status: 'released',
    },
  ]),
  []
)

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

assert.deepStrictEqual(
  resolveRetryDueOrderIds({
    failedOrderIds: [2],
    fallbackDueOrderIds: [2],
    refreshedOrders: [{ id: 2, payment_status: 'paid' }],
    refreshSucceeded: true,
  }),
  { reliable: true, orderIds: [2], dueOrderIds: [] }
)
assert.deepStrictEqual(
  resolveRetryDueOrderIds({
    failedOrderIds: [2],
    fallbackDueOrderIds: [2],
    refreshedOrders: [{ id: 2, payment_status: 'unpaid' }],
    refreshSucceeded: true,
  }),
  { reliable: true, orderIds: [2], dueOrderIds: [2] }
)
assert.deepStrictEqual(
  resolveRetryDueOrderIds({
    failedOrderIds: [2],
    fallbackDueOrderIds: [2],
    refreshedOrders: [{ id: 2, payment_status: 'paid' }],
    refreshSucceeded: false,
  }),
  { reliable: false, orderIds: [2], dueOrderIds: [2] }
)
assert.deepStrictEqual(
  resolveRetryDueOrderIds({
    failedOrderIds: [2],
    fallbackDueOrderIds: [2],
    refreshedOrders: [],
    refreshSucceeded: true,
  }),
  { reliable: true, orderIds: [], dueOrderIds: [] }
)
assert.deepStrictEqual(
  resolveRetryDueOrderIds({
    failedOrderIds: [2],
    fallbackDueOrderIds: [2],
    refreshedOrders: [{ id: 99, payment_status: 'refunded' }],
    refreshSucceeded: true,
  }),
  { reliable: true, orderIds: [], dueOrderIds: [] }
)
assert.deepStrictEqual(
  resolveRetryDueOrderIds({
    failedOrderIds: [2],
    fallbackDueOrderIds: [2],
    refreshedOrders: null,
    refreshSucceeded: true,
  }),
  { reliable: false, orderIds: [2], dueOrderIds: [2] }
)
for (const malformedOrders of [
  [{ payment_status: 'paid' }],
  [{ id: 'not-an-id', payment_status: 'paid' }],
  [{ id: 2 }],
  [{ id: 2, payment_status: 'unknown' }],
  [null],
]) {
  assert.deepStrictEqual(
    resolveRetryDueOrderIds({
      failedOrderIds: [2],
      fallbackDueOrderIds: [2],
      refreshedOrders: malformedOrders,
      refreshSucceeded: true,
    }),
    { reliable: false, orderIds: [2], dueOrderIds: [2] }
  )
}
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
  assert.ok(payoutSource.includes('resolveRetryDueOrderIds'))
  assert.ok(
    payoutSource.includes(
      'this.ordersToArchive = retryDueResolution.orderIds'
    )
  )
  assert.ok(!payoutSource.includes('retryPaymentMethod'))
  assert.ok(payoutSource.includes('retryActive'))
  assert.ok(!payoutSource.includes('retryRequiresPaymentMethod'))
  assert.ok(!payoutSource.includes('paymentSummary.dueOrderIds.length'))
  assert.ok(payoutSource.includes('selectedPaymentMethod'))
  assert.ok(payoutSource.includes('paymentMethodIcon'))
  assert.ok(payoutSource.includes('discountDialog'))
  assert.ok(payoutSource.includes('applyDiscount'))
  assert.ok(payoutSource.includes('discountType: this.effectiveDiscountType'))
  assert.ok(payoutSource.includes('discountValue: this.effectiveDiscountValue'))
  assert.ok(payoutSource.includes(':disabled="loadingBtn"'))
  assert.ok(payoutSource.includes('if (this.loadingBtn) return'))
  assert.ok(payoutSource.includes("this.$route.path !== '/cashregister'"))
  assert.ok(payoutSource.includes('displayOrderNumbers'))
  assert.ok(payoutSource.includes('ordernumber'))
  assert.ok(payoutSource.includes('cashregister-payout-total__orders'))
  assert.ok(payoutSource.includes('cashregister-payout-order'))
  assert.ok(payoutSource.includes('cashregister-payout-order__numbers'))
  assert.ok(payoutSource.includes('mdi-tag-percent-outline'))
  assert.ok(payoutSource.includes('mdi-percent'))
  assert.ok(payoutSource.includes('cashregister-discount-title'))
  assert.ok(payoutSource.includes('.normalize(\'NFD\')'))
  assert.ok(payoutSource.includes("return 'mdi-cash-multiple'"))
  assert.ok(!payoutSource.includes("ordersToArchive.join(', ')"))
  assert.ok(payoutSource.includes('receiptDialog'))
  assert.ok(payoutSource.includes('@click="requestReceiptChoice"'))
  assert.ok(payoutSource.includes('confirmReceiptChoice(true)'))
  assert.ok(payoutSource.includes('confirmReceiptChoice(false)'))
  assert.ok(payoutSource.includes('buildCashierReceiptPayload'))
  assert.ok(payoutSource.includes('sendCashierReceipt'))
  assert.ok(
    payoutSource.includes("'orders/getDetailOrder'"),
    'la cloture caisse doit charger les lignes produits de la commande active avant archive'
  )
  assert.ok(
    !payoutSource.includes("'history/getAllArchivedOrders'"),
    'la cloture caisse ne doit pas attendre les donnees archivees pour imprimer'
  )
  assert.ok(
    !payoutSource.includes("'history/getDetailArchivedOrder'"),
    'la cloture caisse doit eviter le detail history encore vide juste apres archive'
  )
  assert.ok(
    payoutSource.includes('details: order.receiptDetails || []'),
    'le ticket de caisse de cloture doit recevoir les lignes produits chargees'
  )
  assert.ok(
    payoutSource.includes("receipt_review_qr_url: this.$store.get('shop/receipt_review_qr_url')"),
    'le ticket de cloture doit reprendre les informations shop du ticket history'
  )
  assert.ok(payoutSource.includes('pendingPaymentMethod'))
  const btnYesSource = payoutSource.slice(payoutSource.indexOf('async btnYes'))
  assert.ok(btnYesSource.includes('? this.pendingPaymentMethod'))
  assert.ok(btnYesSource.includes('wantsReceipt'))
  assert.ok(
    btnYesSource.indexOf('buildReceiptOrdersWithDetails') <
      btnYesSource.indexOf('archiveOrdersSafely'),
    'les details produits doivent etre charges avant archiveOrdersSafely'
  )
  assert.ok(
    btnYesSource.indexOf('this.ordersToArchive = archiveSummary.failedOrderIds') <
      btnYesSource.indexOf("dispatch('orders/getAllOrder'")
  )

  const cashRegisterSource = fs.readFileSync(
    path.join(__dirname, '../pages/cashregister/index.vue'),
    'utf8'
  )
  assert.ok(cashRegisterSource.includes('tableDisplayName(table)'))
  assert.ok(cashRegisterSource.includes('tableServicePointId(table)'))
  assert.ok(cashRegisterSource.includes('x.service_point_id'))
  assert.ok(cashRegisterSource.includes("'servicePoints/getAll'"))
  assert.ok(cashRegisterSource.includes("this.$store.get('servicePoints/items')"))
  const cashRegisterDetailSource = fs.readFileSync(
    path.join(__dirname, '../pages/cashregister/details/_id.vue'),
    'utf8'
  )
  assert.ok(cashRegisterDetailSource.includes('servicePointId: this.user.id'))
  assert.ok(!cashRegisterDetailSource.includes('userId: this.user.id'))

  const ordersStoreSource = fs.readFileSync(
    path.join(__dirname, '../store/orders.js'),
    'utf8'
  )
  assert.match(ordersStoreSource, /servicePointId=\$\{params\.servicePointId\}/)
  assert.ok(
    !cashRegisterSource.includes(
      'x.access === 2 || x.access === 0 || x.access === 3'
    )
  )
  assert.ok(cashRegisterSource.includes("table.name || table.username"))

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
