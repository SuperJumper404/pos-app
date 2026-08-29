const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const tablesStore = fs.readFileSync(path.join(root, 'store', 'tables.js'), 'utf8')
const servicePointsStorePath = path.join(root, 'store', 'servicePoints.js')

assert.strictEqual(fs.existsSync(servicePointsStorePath), true)
assert.match(tablesStore, /\/service-points\/tables/)
assert.match(tablesStore, /\.post\('\/baseurl\/api\/v1\/service-points\/tables'/)
assert.match(tablesStore, /\.delete\(`\/baseurl\/api\/v1\/service-points\/tables\/\$\{params\}`/)

const servicePointsStore = fs.readFileSync(servicePointsStorePath, 'utf8')
assert.match(servicePointsStore, /\/service-points/)
assert.match(servicePointsStore, /system_key === 'counter'/)

console.log('service points store tests passed')
