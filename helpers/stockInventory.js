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

const isOperationalStockItem = (item) => {
  if (!item || Number(item.archived) === 1) return false
  if (item.item_type === 'ingredient') return true
  return (
    item.item_type === 'product' &&
    Number(item.product_archived || 0) === 0 &&
    Number(item.track_stock) === 1
  )
}

const filterStockItems = (items = [], search = '') => {
  const term = String(search || '').trim().toLowerCase()
  if (!term) return [...items]
  return items.filter((item) =>
    String(item.name || '').toLowerCase().includes(term)
  )
}

module.exports = {
  getStockStatus,
  sortShoppingListItems,
  formatEstimatedPrice,
  filterStockItems,
  isOperationalStockItem,
}
