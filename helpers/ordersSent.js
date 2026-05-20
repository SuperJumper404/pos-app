const isSameDay = (date1, date2) => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const filterTodayOrderEntries = (entries, today = Date.now()) => {
  if (!Array.isArray(entries)) return []

  return entries.filter((order) => order && isSameDay(order.date, today))
}

const appendOrderSentEntry = (entries, insertId, today = Date.now()) => {
  const currentEntries = Array.isArray(entries) ? entries : []

  if (
    currentEntries.some((order) => String(order.insertId) === String(insertId))
  ) {
    return currentEntries
  }

  return [...currentEntries, { insertId, date: today }]
}

const getOrderIds = (entries) => {
  if (!Array.isArray(entries)) return []

  return entries
    .filter(
      (order) =>
        order && order.insertId !== undefined && order.insertId !== null
    )
    .map((order) => order.insertId)
}

module.exports = {
  appendOrderSentEntry,
  filterTodayOrderEntries,
  getOrderIds,
}
