const PAID_STATUS = 'paid'
const CASH_REGISTER_PAYMENT_STATUSES = new Set([
  PAID_STATUS,
  'unpaid',
  'requires_payment',
])

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null) return []
  return [value]
}

const normalizeOrderIds = (value) =>
  toArray(value)
    .filter((id) => id !== undefined && id !== null && id !== '')
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))

const terminalOrderSignature = (ids) => Array.isArray(ids) && ids.length > 0 &&
  ids.every((id) => Number.isSafeInteger(id) && id > 0) && new Set(ids).size === ids.length
  ? ids.slice().sort((a, b) => a - b).join(',') : null

const matchesCashRegisterTerminalAttempt = (attempt, orderIds) => Boolean(attempt &&
  terminalOrderSignature(attempt.orderIds) &&
  terminalOrderSignature(attempt.orderIds) === terminalOrderSignature(orderIds))

const terminalAttemptKey = (attempt) => {
  const signature = attempt && terminalOrderSignature(attempt.orderIds)
  if (!signature) return null
  if (attempt.paymentId != null && (!Number.isSafeInteger(attempt.paymentId) || attempt.paymentId <= 0)) return null
  return `${attempt.paymentId || 'pending'}:${signature}`
}

const terminalRecoveryCollection = (stored) => {
  const records = {}
  const entries = stored && stored.version === 2 && stored.records && typeof stored.records === 'object'
    ? Object.values(stored.records) : [stored]
  entries.forEach((attempt) => {
    const key = terminalAttemptKey(attempt)
    if (key) records[key] = attempt
  })
  return { version: 2, records }
}

const terminalReceiptSnapshot = (orders, payment) => {
  const { hasSettledTerminalAllocations } = require('./stripeTerminal')
  if (!hasSettledTerminalAllocations(payment)) return []
  return orders.filter((order) => payment.orderIds.includes(Number(order.id))).map((order) => {
    const allocation = payment.allocations.find((a) => a.orderId === Number(order.id))
    const baseCents = Math.round(Number(order.subtotal) * 100)
    const discount = Math.max(0, baseCents - allocation.amountCents) / 100
    return { ...order, subtotal: allocation.amountCents / 100,
      subtotal_before_discount: baseCents / 100, discount_type: discount ? 'amount' : 'none',
      discount_value: discount, discount_amount: discount, payment_status: 'paid',
      payment_provider: 'stripe_terminal', payment: 'Carte bancaire - TPE Stripe',
      stripe_terminal_payment_id: payment.id }
  })
}

const cashRegisterTerminalPayload = ({ orderIds, discountType, discountValue }) => ({
  orderIds: normalizeOrderIds(orderIds),
  ...(discountType != null && {
    discountType,
    discountValue: discountType === 'amount'
      ? Math.round(Number(discountValue) * 100)
      : Number(discountValue) || 0,
  }),
})

const summarizeArchiveResults = (orderIds, results = []) => {
  const normalizedOrderIds = normalizeOrderIds(orderIds)
  const successfulOrderIds = []
  const failedOrderIds = []

  normalizedOrderIds.forEach((orderId, index) => {
    const wasArchived = Boolean(results[index])
    if (wasArchived) {
      successfulOrderIds.push(orderId)
    } else {
      failedOrderIds.push(orderId)
    }
  })

  return {
    successfulOrderIds,
    failedOrderIds,
    allSucceeded:
      normalizedOrderIds.length > 0 && failedOrderIds.length === 0,
  }
}

const archiveOrdersSafely = (orderIds, archiveOrder) =>
  Promise.all(
    normalizeOrderIds(orderIds).map((orderId) =>
      Promise.resolve()
        .then(() => archiveOrder(orderId))
        .then((value) => Boolean(value))
        .catch(() => false)
    )
  ).then((results) => summarizeArchiveResults(orderIds, results))

const toAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

const isTemporaryCounterPayment = (order = {}) => {
  const payment = String(order.payment || order.used_payment_method || '')
    .trim()
    .toLowerCase()
  return payment.includes('comptoir') || payment.includes('encaisser')
}

const isCashRegisterOrderPaid = (order = {}) =>
  order.payment_status === PAID_STATUS && !isTemporaryCounterPayment(order)

const isReleasedStripeOrder = (order = {}) =>
  order.payment_status === 'requires_payment' &&
  order.payment_provider === 'stripe' &&
  order.stock_reservation_status === 'released'

const isCashRegisterOrderArchivable = (order = {}) =>
  !isReleasedStripeOrder(order)

const resolveRetryDueOrderIds = ({
  failedOrderIds,
  fallbackDueOrderIds,
  refreshedOrders,
  refreshSucceeded,
}) => {
  const normalizedFailedOrderIds = normalizeOrderIds(failedOrderIds)
  const failedOrderIdsSet = new Set(normalizedFailedOrderIds)
  const normalizedFallbackDueOrderIds = normalizeOrderIds(
    fallbackDueOrderIds
  ).filter((id) => failedOrderIdsSet.has(id))
  const fallback = {
    reliable: false,
    orderIds: normalizedFailedOrderIds,
    dueOrderIds: normalizedFallbackDueOrderIds,
  }

  if (!refreshSucceeded || !Array.isArray(refreshedOrders)) return fallback
  const hasReliableOrders = refreshedOrders.every((order) => {
    if (!order || typeof order !== 'object' || Array.isArray(order)) return false

    const orderId = Number(order.id)
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return false
    if (!failedOrderIdsSet.has(orderId)) return true

    return CASH_REGISTER_PAYMENT_STATUSES.has(order.payment_status)
  })
  if (!hasReliableOrders) return fallback

  const refreshedOrdersById = refreshedOrders.reduce(
    (ordersById, order) => {
      const orderId = Number(order.id)
      if (Number.isFinite(orderId)) ordersById.set(orderId, order)
      return ordersById
    },
    new Map()
  )

  const orderIds = normalizedFailedOrderIds.filter((id) =>
    refreshedOrdersById.has(id)
  )

  return {
    reliable: true,
    orderIds,
    dueOrderIds: orderIds.filter(
      (id) => !isCashRegisterOrderPaid(refreshedOrdersById.get(id))
    ),
  }
}

const getCashRegisterPaymentSummary = (orders = []) =>
  orders.filter(isCashRegisterOrderArchivable).reduce(
    (summary, order) => {
      const amount = toAmount(order.subtotal)
      const orderId = Number(order.id)
      const hasOrderId = Number.isFinite(orderId)

      summary.totalAmount += amount

      if (isCashRegisterOrderPaid(order)) {
        summary.paidAmount += amount
        if (hasOrderId) summary.paidOrderIds.push(orderId)
      } else {
        summary.dueAmount += amount
        if (hasOrderId) summary.dueOrderIds.push(orderId)
      }

      if (hasOrderId) summary.allOrderIds.push(orderId)
      summary.hasAmountDue = summary.dueAmount > 0
      summary.hasAlreadyPaidAmount = summary.paidAmount > 0

      return summary
    },
    {
      dueAmount: 0,
      paidAmount: 0,
      totalAmount: 0,
      dueOrderIds: [],
      paidOrderIds: [],
      allOrderIds: [],
      hasAmountDue: false,
      hasAlreadyPaidAmount: false,
    }
  )

const buildCashRegisterCustomerRows = (orders = []) => {
  const groupedOrders = orders.filter(isCashRegisterOrderArchivable).reduce((groups, order) => {
    const customer = order.customer || 'Client'
    if (!groups[customer]) groups[customer] = []
    groups[customer].push(order)
    return groups
  }, {})

  return Object.entries(groupedOrders).map(([customer, customerOrders]) => {
    const summary = getCashRegisterPaymentSummary(customerOrders)
    return {
      customer,
      sum_amount: summary.dueAmount,
      paid_amount: summary.paidAmount,
      total_amount: summary.totalAmount,
      ids: summary.allOrderIds,
      dueOrderIds: summary.dueOrderIds,
      paidOrderIds: summary.paidOrderIds,
      hasAmountDue: summary.hasAmountDue,
      hasAlreadyPaidAmount: summary.hasAlreadyPaidAmount,
    }
  })
}

module.exports = {
  archiveOrdersSafely,
  buildCashRegisterCustomerRows,
  getCashRegisterPaymentSummary,
  isCashRegisterOrderArchivable,
  isCashRegisterOrderPaid,
  normalizeOrderIds,
  matchesCashRegisterTerminalAttempt,
  cashRegisterTerminalPayload,
  terminalAttemptKey,
  terminalRecoveryCollection,
  terminalReceiptSnapshot,
  resolveRetryDueOrderIds,
  summarizeArchiveResults,
}
