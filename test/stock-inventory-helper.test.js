const assert = require('assert')
const {
  getStockStatus,
  sortShoppingListItems,
  formatEstimatedPrice,
  filterStockItems,
  isOperationalStockItem,
} = require('../helpers/stockInventory')

assert.strictEqual(getStockStatus({ current_stock: 2, minimum_stock: 6, target_stock: 20 }), 'red')
assert.strictEqual(getStockStatus({ current_stock: 12, minimum_stock: 6, target_stock: 20 }), 'orange')
assert.strictEqual(getStockStatus({ current_stock: 20, minimum_stock: 6, target_stock: 20 }), 'normal')

assert.deepStrictEqual(
  sortShoppingListItems([
    { id: 1, status_at_generation: 'orange', taken: 0, name: 'Sauce' },
    { id: 2, status_at_generation: 'red', taken: 0, name: 'Fromage' },
    { id: 3, status_at_generation: 'red', taken: 1, name: 'Pate' },
  ]).map((item) => item.id),
  [2, 1, 3]
)

assert.strictEqual(formatEstimatedPrice(null), 'Non renseigne')
assert.strictEqual(formatEstimatedPrice(7.5), '7.50 EUR')

assert.strictEqual(isOperationalStockItem({ item_type: 'ingredient', archived: 0 }), true)
assert.strictEqual(isOperationalStockItem({ item_type: 'ingredient', archived: 1 }), false)
assert.strictEqual(
  isOperationalStockItem({ item_type: 'product', archived: 0, product_archived: 0, track_stock: 1 }),
  true
)
assert.strictEqual(
  isOperationalStockItem({ item_type: 'product', archived: 0, product_archived: 0, track_stock: 0 }),
  false
)
assert.deepStrictEqual(
  filterStockItems([
    { id: 1, name: 'Fromage' },
    { id: 2, name: 'Sauce tomate' },
  ], 'tom').map((item) => item.id),
  [2]
)

console.log('stock inventory helper tests passed')
