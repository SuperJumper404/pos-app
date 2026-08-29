const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const roles = require(path.join(root, 'helpers', 'staffRoles.js'))
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)

assert.strictEqual(
  roles.STAFF_MODULE_KEYS.includes('borne'),
  false,
  'staff module keys must not include borne anymore'
)
assert.strictEqual(
  roles.MODULE_OPTIONS.some((item) => item.value === 'borne'),
  false,
  'staff module options must not expose Borne anymore'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'borne', ['borne'], false),
  false,
  'explicit staff permissions must not allow the kiosk route anymore'
)
assert.match(dashboardSource, /title:\s*'Bornes'/)
assert.match(dashboardSource, /to:\s*'\/bornes'/)
assert.match(dashboardSource, /moduleKey:\s*'settings'/)

console.log('kiosk staff role tests passed')
