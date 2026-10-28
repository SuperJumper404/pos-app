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
const validHistoryEntry = item => Boolean(item && positiveId(item.id) &&
  typeof item.eventAt === 'string' && Number.isFinite(Date.parse(item.eventAt)) &&
  (item.entryType === 'order' ? item.rowKey === `order:${item.id}`
    : item.entryType === 'terminal_payment' && item.rowKey === `terminal-payment:${item.id}` &&
      validStandalonePayment(item.terminalPayment) && item.terminalPayment.id === item.id))
const validHistoryPage = result => Boolean(result && Number.isSafeInteger(result.total) && result.total >= 0 &&
  Array.isArray(result.items) && result.items.every(validHistoryEntry) && result.total >= result.items.length &&
  new Set(result.items.map(item => item.rowKey)).size === result.items.length)

module.exports = {
  sortArchivedOrdersByArchiveDate,
  validHistoryPage,
}
