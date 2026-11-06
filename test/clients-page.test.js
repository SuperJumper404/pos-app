const assert = require('assert/strict')
const { component } = require('./helpers/vue-component')('pages/clients.vue', { ClientDirectory: {}, LoyaltyProgram: {} })
assert.equal(component.middleware, 'auth')
const admin = { isAdmin: true, tab: 0 }
component.watch['$route.query.tab'].handler.call(admin, 'programme')
assert.equal(admin.tab, 1)
const staff = { isAdmin: false, tab: 0 }
component.watch['$route.query.tab'].handler.call(staff, 'programme')
assert.equal(staff.tab, 0)
component.watch['$route.query.tab'].handler.call(admin, undefined)
assert.equal(admin.tab, 0)
