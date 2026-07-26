const countPendingOrders = (orders) =>
  (Array.isArray(orders) ? orders : []).filter(
    (order) => Number(order && order.status) === 1
  ).length

const formatPendingOrderBadge = (count) => {
  const normalizedCount = Math.max(0, Number(count) || 0)
  return normalizedCount > 99 ? '99+' : String(normalizedCount)
}

module.exports = {
  countPendingOrders,
  formatPendingOrderBadge,
}
