const getStockStatus = (item) => {
  const current = Number(item.current_stock)
  const minimum = Number(item.minimum_stock)
  const target = Number(item.target_stock)
  if (current < minimum) return 'red'
  if (current < target) return 'orange'
  return 'normal'
}

const statusRank = {
  red: 0,
  orange: 1,
  normal: 2,
}

const sortShoppingListItems = (items = []) =>
  [...items].sort((a, b) => {
    if (Number(a.taken) !== Number(b.taken)) return Number(a.taken) - Number(b.taken)
    const statusDelta =
      (statusRank[a.status_at_generation] ?? 9) -
      (statusRank[b.status_at_generation] ?? 9)
    if (statusDelta !== 0) return statusDelta
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

const formatEstimatedPrice = (value) => {
  if (value === null || value === undefined || value === '') return 'Non renseigne'
  return `${Number(value).toFixed(2)} EUR`
}

module.exports = {
  getStockStatus,
  sortShoppingListItems,
  formatEstimatedPrice,
}
