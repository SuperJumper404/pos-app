const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const ordersSource = fs.readFileSync(
  path.join(root, 'pages/orders/index.vue'),
  'utf8'
)
const detailSource = fs.readFileSync(
  path.join(root, 'pages/orders/detail/_id.vue'),
  'utf8'
)
const historySource = fs.readFileSync(
  path.join(root, 'pages/history/index.vue'),
  'utf8'
)

assert.doesNotMatch(ordersSource, /value:\s*'taken_by_name'/)
assert.doesNotMatch(ordersSource, /value:\s*'prepared_by_name'/)
assert.doesNotMatch(ordersSource, /item\.taken_by_name/)
assert.doesNotMatch(ordersSource, /item\.prepared_by_name/)
assert.match(ordersSource, /value:\s*'service_point_name'/)
assert.match(ordersSource, /table:\s*order\.service_point_name/)
assert.doesNotMatch(
  detailSource,
  /order-detail-header__label">Prise par/
)
assert.doesNotMatch(
  detailSource,
  /order-detail-header__label">Preparee par/
)
assert.match(detailSource, /class="order-detail-attribution(?:\s|")/)
assert.match(detailSource, /order-detail-attribution[\s\S]*Prise par/)
assert.match(detailSource, /order-detail-attribution[\s\S]*Preparee par/)
assert.match(detailSource, /order-detail-attribution[\s\S]*prepared_by_name/)
assert(
  detailSource.indexOf('order-detail-attribution') >
    detailSource.indexOf('<VatBreakdown')
)
assert.match(historySource, /Non attribuee/)

console.log('order attribution UI tests passed')
