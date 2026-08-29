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

module.exports = {
  sortArchivedOrdersByArchiveDate,
}
