const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const roles = require(path.join(root, 'helpers', 'staffRoles.js'))
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)

assert.ok(
  roles.STAFF_MODULE_KEYS.includes('borne'),
  'staff module keys must include borne'
)
assert.ok(
  roles.MODULE_OPTIONS.some(
    (item) => item.value === 'borne' && item.text === 'Borne'
  ),
  'staff module options must expose Borne'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'borne', ['borne'], false),
  true,
  'explicit borne permission must allow the kiosk module'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'orders', ['borne'], false),
  false,
  'a kiosk-only user must not access orders'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'cashregister', ['borne'], false),
  false,
  'a kiosk-only user must not access cash register'
)
assert.deepStrictEqual(
  roles
    .getAccessibleNavigationItems(roles.ACCESS.CASHIER, [
      { title: 'Borne', to: '/borne', moduleKey: 'borne' },
      { title: 'Menus', to: '/menus', moduleKey: 'orders' },
      { title: 'Commandes', to: '/orders', moduleKey: 'orders' },
      { title: 'Deconnexion', name: 'logout' },
    ], ['borne'], false)
    .map((item) => item.title),
  ['Borne', 'Deconnexion'],
  'kiosk-only navigation must expose only Borne and logout'
)
assert.match(dashboardSource, /title:\s*['"]Borne['"]/)
assert.match(dashboardSource, /to:\s*['"]\/borne['"]/)
assert.match(dashboardSource, /moduleKey:\s*['"]borne['"]/)

console.log('kiosk staff role tests passed')
