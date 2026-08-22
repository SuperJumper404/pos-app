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

console.log('product stock fields tests passed')
