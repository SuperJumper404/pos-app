const PAID_STATUS = 'paid'

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

const isCashRegisterOrderPaid = (order = {}) =>
  order.payment_status === PAID_STATUS

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

  if (!refreshSucceeded) {
    return { reliable: false, dueOrderIds: normalizedFallbackDueOrderIds }
  }

  const refreshedOrdersById = toArray(refreshedOrders).reduce(
    (ordersById, order) => {
      const orderId = Number(order.id)
      if (Number.isFinite(orderId)) ordersById.set(orderId, order)
      return ordersById
    },
    new Map()
  )

  if (!normalizedFailedOrderIds.every((id) => refreshedOrdersById.has(id))) {
    return { reliable: false, dueOrderIds: normalizedFallbackDueOrderIds }
  }

  return {
    reliable: true,
    dueOrderIds: normalizedFailedOrderIds.filter(
      (id) => !isCashRegisterOrderPaid(refreshedOrdersById.get(id))
    ),
  }
}

const getCashRegisterPaymentSummary = (orders = []) =>
  orders.reduce(
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
  const groupedOrders = orders.reduce((groups, order) => {
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
  isCashRegisterOrderPaid,
  normalizeOrderIds,
  resolveRetryDueOrderIds,
  summarizeArchiveResults,
}
