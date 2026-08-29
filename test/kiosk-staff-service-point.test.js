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

assert.doesNotMatch(staffPage, /servicePoints\/getAll/)
assert.doesNotMatch(staffPage, /kioskServicePoints/)
assert.doesNotMatch(staffPage, /showKioskServicePointField/)
assert.doesNotMatch(staffPage, /label="Borne associ/)
assert.doesNotMatch(staffPage, /createKioskServicePoint/)
assert.doesNotMatch(staffPage, /Créer une borne/)
assert.doesNotMatch(staffPage, /CrÃ©er une borne/)
assert.match(staffStore, /service_point_id:\s*params\.service_point_id/)
assert.match(servicePointsStore, /createKiosk/)
assert.match(servicePointsStore, /\/service-points\/kiosks/)

console.log('kiosk staff service point tests passed')
