const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../store/cart.js'), 'utf8')

assert.match(source, /service_point_id: params\.servicePointId \|\| params\.service_point_id/)
assert.match(source, /customerID: params\.customerID/)

console.log('service point selection tests passed')
