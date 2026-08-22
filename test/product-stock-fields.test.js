const assert = require('assert')
const fs = require('fs')
const path = require('path')

const newProduct = fs.readFileSync(path.join(__dirname, '..', 'pages', 'products', 'newproduct.vue'), 'utf8')
const editProduct = fs.readFileSync(path.join(__dirname, '..', 'pages', 'products', 'edit', '_id', 'index.vue'), 'utf8')

for (const source of [newProduct, editProduct]) {
  assert.match(source, /track_stock/)
  assert.match(source, /Suivre le stock/)
  assert.match(source, /stock_zero_behavior/)
  assert.match(source, /minimum_stock/)
  assert.match(source, /target_stock/)
  assert.match(source, /stock_unit/)
}

assert.match(
  newProduct,
  /if \(this\.formproduct\.track_stock\) \{[\s\S]*fd\.append\('stock'/
)
assert.match(editProduct, /product\.minimum_stock \?\? 1/)
assert.match(editProduct, /product\.target_stock \?\? product\.stock \?\? 1/)
assert.match(editProduct, /if \(this\.formeditproduct\.track_stock\) \{/)

console.log('product stock fields tests passed')
