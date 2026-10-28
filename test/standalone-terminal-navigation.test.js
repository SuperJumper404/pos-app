const assert = require('assert')
const Vue = require('vue')
const { component } = require('./helpers/vue-component')('layouts/default.vue', {
  listdashboard: { data: () => ({ list: [] }) }, StandaloneTerminalDialog: {},
})
const current = Vue.observable({ user: { id: 4, shopid: 7, access: 1, module_permissions: ['cashregister', 'history'] },
  reader: { id: 7, label: 'S710', isActive: true, status: 'online', assignedUserId: 4 } })
const instance = new Vue({ ...component, beforeCreate() {
  this.$store = { get: key => ({ 'users/user': current.user, 'stripeTerminal/currentReader': current.reader })[key], dispatch: () => Promise.resolve(null) }
  this.$route = Vue.observable({ path: '/history', name: 'history' })
  this.$vuetify = { breakpoint: { smAndUp: false } }
} })
assert.strictEqual(instance.showTerminalPayment, true, 'Terminal entry must remain available on mobile')
instance.$route.path = '/'
assert.strictEqual(instance.showTerminalPayment, true, 'Terminal entry must remain available on Home')
current.reader.status = 'offline'
assert.strictEqual(instance.showTerminalPayment, false)
instance.terminalRecovery = true
assert.strictEqual(instance.showTerminalPayment, true, 'A disconnected reader must not hide an unresolved attempt')
instance.$route.path = '/cart'
assert.strictEqual(instance.showTerminalPayment, false)
instance.$route.path = '/history'
current.user.module_permissions = []
assert.strictEqual(instance.showTerminalPayment, false)
instance.$destroy()
console.log('PASS toolbar terminal entry uses cashier permission, reader and recovery on desktop/mobile')
