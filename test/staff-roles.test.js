const assert = require('assert')
const {
  ROLE_OPTIONS,
  canAccessModule,
  getAccessibleNavigationItems,
  getRoleLabel,
  isStaffAccess,
  isTableQrAccess,
} = require('../helpers/staffRoles')

assert.deepStrictEqual(
  ROLE_OPTIONS.map((role) => role.value),
  [0, 1, 4, 5],
  'the staff form must only offer application roles'
)
assert.strictEqual(getRoleLabel(4), 'Serveur')
assert.strictEqual(isStaffAccess(5), true)
assert.strictEqual(isStaffAccess(3), false)
assert.strictEqual(isTableQrAccess(2), true)
assert.strictEqual(isTableQrAccess(4), false)
assert.strictEqual(canAccessModule(1, 'cashregister'), true)
assert.strictEqual(canAccessModule(1, 'staff'), false)
assert.strictEqual(canAccessModule(4, 'cart'), true)
assert.strictEqual(canAccessModule(5, 'orders'), true)
assert.strictEqual(canAccessModule(5, 'menus'), false)
assert.deepStrictEqual(
  getAccessibleNavigationItems(1, [
    { title: 'Menus', to: '/menus', moduleKey: 'menus' },
    { title: 'Commandes', to: '/orders', moduleKey: 'orders' },
    { title: 'Caisse', to: '/cashregister', moduleKey: 'cashregister' },
    { title: 'Equipe', to: '/staff', moduleKey: 'staff' },
    { title: 'Deconnexion', name: 'logout' },
  ]).map((item) => item.title),
  ['Menus', 'Commandes', 'Caisse', 'Deconnexion'],
  'a cashier must only receive its modules and logout in the sidebar'
)

console.log('staff role tests passed')
