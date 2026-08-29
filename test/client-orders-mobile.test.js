const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../pages/ordersStatuses.vue'),
  'utf8'
)

assert.match(
  source,
  /clientServicePointId\(\)\s*\{/,
  'client orders must resolve the active service point'
)
assert.ok(
  (source.match(/servicePointId:\s*this\.clientServicePointId/g) || []).length >= 2,
  'initial loading and polling must request orders by service point'
)
assert.ok(
  !source.includes('userId: this.user.id'),
  'client orders must not use the staff user id for table sessions'
)

console.log('client orders mobile tests passed')
