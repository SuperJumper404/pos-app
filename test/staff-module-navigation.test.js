const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const roles = require(path.join(root, 'helpers', 'staffRoles.js'))
const usersStore = fs.readFileSync(path.join(root, 'store', 'users.js'), 'utf8')

assert.strictEqual(
  typeof roles.getRoleModuleDefaults,
  'function',
  'role permission presets must be available'
)
assert.deepStrictEqual(roles.getRoleModuleDefaults(roles.ACCESS.CASHIER), [
  'orders',
  'cashregister',
  'history',
])
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'cashregister', ['orders'], false),
  false,
  'an explicit permission list must override the role preset'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.ADMIN, 'staff', ['orders'], false),
  false,
  'a created admin must not receive Staff access'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.ADMIN, 'staff', [], true),
  true,
  'the primary administrator must retain Staff access'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'menus', ['orders'], false),
  true,
  'the orders permission must include menu navigation'
)
assert.match(usersStore, /module_permissions/)
assert.match(usersStore, /is_primary_admin/)

console.log('staff module navigation tests passed')
