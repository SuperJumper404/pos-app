const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const staffPage = fs.readFileSync(
  path.join(root, 'pages', 'staff', 'index.vue'),
  'utf8'
)
const staffStore = fs.readFileSync(path.join(root, 'store', 'staff.js'), 'utf8')
const servicePointsStore = fs.readFileSync(
  path.join(root, 'store', 'servicePoints.js'),
  'utf8'
)

assert.match(staffPage, /servicePoints\/getAll/)
assert.match(staffPage, /kioskServicePoints/)
assert.match(staffPage, /showKioskServicePointField/)
assert.match(staffPage, /form\.service_point_id/)
assert.match(staffPage, /label="Borne associée"/)
assert.match(staffPage, /createKioskServicePoint/)
assert.match(staffStore, /service_point_id:\s*params\.service_point_id/)
assert.match(servicePointsStore, /createKiosk/)
assert.match(servicePointsStore, /\/service-points\/kiosks/)

console.log('kiosk staff service point tests passed')
