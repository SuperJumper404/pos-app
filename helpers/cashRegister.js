const PAID_STATUS = 'paid'
const { calculateDiscount } = require('./discount')
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

const receiptCents = (value) => value == null ? NaN : Math.round(Number(value) * 100)
const nonnegativeCents = (value) => Number.isSafeInteger(value) && value >= 0

const terminalTaxFields = (source, amountCents) => {
  const ht = receiptCents(source.total_ht ?? source.totalHt)
  const vat = receiptCents(source.total_vat ?? source.totalVat)
  const rate = source.vat_rate ?? source.vatRate
  let numerator
  let denominator
  if (nonnegativeCents(ht) && nonnegativeCents(vat) && Number.isSafeInteger(ht + vat)) {
    numerator = ht
    denominator = ht + vat
  } else if (rate != null && Number.isFinite(Number(rate)) && Number(rate) >= 0) {
    numerator = 10000
    denominator = 10000 + Math.round(Number(rate) * 100)
  } else return {}
  const totalHt = denominator > 0
    ? Number((BigInt(amountCents) * BigInt(numerator) + BigInt(denominator) / 2n) / BigInt(denominator)) : 0
  return { total_ht: totalHt / 100, total_vat: (amountCents - totalHt) / 100 }
}

const terminalReceiptWithDetails = (order, details) => {
  const source = Array.isArray(details) ? details : []
  const amountCents = receiptCents(order.subtotal)
  const weights = source.map((line) => receiptCents(line.total))
  const gross = weights.reduce((sum, value) => sum + value, 0)
  if (!source.length || !nonnegativeCents(amountCents) || !weights.every(nonnegativeCents) ||
    !Number.isSafeInteger(gross) || gross <= 0) return { ...order, receiptDetails: source.slice() }

  // Largest remainders preserve the paid total; line IDs break equal-cent ties.
  const shares = weights.map((weight, index) => {
    const product = BigInt(amountCents) * BigInt(weight)
    return { index, cents: Number(product / BigInt(gross)), remainder: product % BigInt(gross),
      id: Number(source[index].orderDetailsId ?? source[index].id) || index }
  })
  const ranked = shares.slice().sort((a, b) => a.remainder === b.remainder
    ? a.id - b.id || a.index - b.index : a.remainder > b.remainder ? -1 : 1)
  const remaining = amountCents - shares.reduce((sum, share) => sum + share.cents, 0)
  for (let i = 0; i < remaining; i++) ranked[i].cents += 1
  const receiptDetails = source.map((line, index) => {
    const tax = terminalTaxFields(line, shares[index].cents)
    const qty = Number(line.qty) > 0 ? Number(line.qty) : 1
    return { ...line, total: shares[index].cents / 100, ...tax,
      ...(tax.total_ht != null && { unit_price_ht: Math.round(tax.total_ht * 100 / qty) / 100,
        unit_vat: Math.round(tax.total_vat * 100 / qty) / 100 }) }
  })
  const totals = receiptDetails.every((line) => nonnegativeCents(receiptCents(line.total_ht)) && nonnegativeCents(receiptCents(line.total_vat)))
    ? { total_ht: receiptDetails.reduce((sum, line) => sum + receiptCents(line.total_ht), 0) / 100,
        total_vat: receiptDetails.reduce((sum, line) => sum + receiptCents(line.total_vat), 0) / 100 } : {}
  return { ...order, ...totals, receiptDetails }
}

const terminalReceiptSnapshot = (orders, payment) => {
  const { hasSettledTerminalAllocations } = require('./stripeTerminal')
  if (!hasSettledTerminalAllocations(payment)) return []
  return orders.filter((order) => payment.orderIds.includes(Number(order.id))).map((order) => {
    const allocation = payment.allocations.find((a) => a.orderId === Number(order.id))
    const baseCents = Math.round(Number(order.subtotal) * 100)
    const discount = Math.max(0, baseCents - allocation.amountCents) / 100
    return { ...order, ...terminalTaxFields(order, allocation.amountCents), subtotal: allocation.amountCents / 100,
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

const terminalAttemptTotalCents = (attempt, subtotal) => {
  const type = attempt.discountType ?? 'none'
  const value = Number(attempt.discountValue ?? 0)
  if (!['none', 'percent', 'amount'].includes(type) || !Number.isFinite(value) || value < 0 ||
    (type === 'percent' && value > 100) || (type === 'amount' && !Number.isSafeInteger(value)) ||
    !Number.isFinite(Number(subtotal))) return null
  const discount = calculateDiscount({ subtotal, type, value: type === 'amount' ? value / 100 : value })
  const total = receiptCents(discount.total)
  return nonnegativeCents(total) ? total : null
}

const hasTerminalAttemptIdentity = (attempt) =>
  [attempt.paymentId, attempt.sessionId].some((id) => Number.isSafeInteger(id) && id > 0) ||
  [attempt.paymentIntentId, attempt.stripePaymentIntentId, attempt.stripe_payment_intent_id]
    .some((id) => typeof id === 'string' && /^pi_[a-zA-Z0-9_]+$/.test(id)) ||
  (Number.isSafeInteger(attempt.validatedAmountCents) && attempt.validatedAmountCents >= 50)

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
  terminalReceiptWithDetails,
  terminalAttemptTotalCents,
  hasTerminalAttemptIdentity,
  resolveRetryDueOrderIds,
  summarizeArchiveResults,
}
