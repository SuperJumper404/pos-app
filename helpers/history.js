const parseArchiveSortDate = (order = {}) => {
  const value = order.archived_at || order.archivedAt || order.created
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const sortArchivedOrdersByArchiveDate = (orders = []) =>
  [...orders].sort((a, b) => {
    const dateDiff = parseArchiveSortDate(b) - parseArchiveSortDate(a)
    if (dateDiff !== 0) return dateDiff
    return (Number(b.id) || 0) - (Number(a.id) || 0)
  })

const { positiveId, validStandalonePayment } = require('./standaloneTerminal')
const validArchiveAmount = value => (typeof value === 'number' ||
  (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value))) && Number.isFinite(Number(value))
const validSettlementEntry = item => item.isSettlement === true &&
  item.rowKey === `settlement:${item.id}` && item.cash_register_settlement_id === item.id &&
  typeof item.historyLabel === 'string' && item.historyLabel.trim().length > 0 &&
  typeof item.subtotal === 'number' && Number.isFinite(item.subtotal) && item.subtotal >= 0 &&
  item.payment_status === 'paid' && item.status === 3 &&
  Array.isArray(item.archivedOrders) && item.archivedOrders.length > 0 &&
  item.archivedOrders.every(order => order && positiveId(order.id) &&
    order.cash_register_settlement_id === item.id && validArchiveAmount(order.subtotal)) &&
  new Set(item.archivedOrders.map(order => order.id)).size === item.archivedOrders.length
const validHistoryEntry = item => Boolean(item && positiveId(item.id) &&
  typeof item.eventAt === 'string' && Number.isFinite(Date.parse(item.eventAt)) &&
  (item.entryType === 'order' ? item.rowKey === `order:${item.id}`
    : item.entryType === 'settlement' ? validSettlementEntry(item)
    : item.entryType === 'terminal_payment' && item.rowKey === `terminal-payment:${item.id}` &&
      validStandalonePayment(item.terminalPayment) && item.terminalPayment.id === item.id))
const validHistoryPage = result => Boolean(result && Number.isSafeInteger(result.total) && result.total >= 0 &&
  Array.isArray(result.items) && result.items.every(validHistoryEntry) && result.total >= result.items.length &&
  new Set(result.items.map(item => item.rowKey)).size === result.items.length)
const hasSettlementId = (value) =>
  value !== null && value !== undefined && value !== ''

const normalizeArchivedHistory = (orders = []) => {
  const settlementItems = new Map()
  const legacyItems = []

  orders.forEach((order) => {
    const settlementId = order.cash_register_settlement_id
    if (!hasSettlementId(settlementId)) {
      legacyItems.push({
        ...order,
        historyKey: `archive-${order.id}`,
        isSettlement: false,
      })
      return
    }

    if (!settlementItems.has(String(settlementId))) {
      const tableReference = order.settlement_table_reference || order.username || ''
      settlementItems.set(String(settlementId), {
        ...order,
        id: Number(settlementId) || settlementId,
        historyKey: `settlement-${settlementId}`,
        isSettlement: true,
        historyLabel: `Encaissement table ${tableReference}`,
        ordernumber: `Encaissement table ${tableReference}`,
        username: tableReference,
        subtotal: order.settlement_total_amount,
        payment: order.settlement_payment_method,
        used_payment_method: order.settlement_payment_method,
        payment_status: 'paid',
        status: 3,
        created: order.settlement_created_at || order.archived_at || order.created,
        archived_at: order.settlement_created_at || order.archived_at,
        archivedOrders: [],
      })
    }

    const item = settlementItems.get(String(settlementId))
    if (!item.archivedOrders.some((archivedOrder) => String(archivedOrder.id) === String(order.id))) {
      item.archivedOrders.push(order)
    }
  })

  return sortArchivedOrdersByArchiveDate([
    ...settlementItems.values(),
    ...legacyItems,
  ])
}

module.exports = {
  normalizeArchivedHistory,
  sortArchivedOrdersByArchiveDate,
  validHistoryPage,
}
