/* eslint-disable no-console, vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
class MemoryNode {
  constructor(tag, type = 1, text = '') { this.tagName = tag && tag.toUpperCase(); this.nodeType = type; this.data = text; this.childNodes = []; this.parentNode = null; this.attrs = {}; this.style = { setProperty() {} } }
  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) { if (node.parentNode) node.parentNode.removeChild(node); const index = before ? this.childNodes.indexOf(before) : -1; if (index < 0) this.childNodes.push(node); else this.childNodes.splice(index, 0, node); node.parentNode = this; return node }
  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node }
  setAttribute(key, value) { this.attrs[key] = value }
  removeAttribute(key) { delete this.attrs[key] }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key) }
  getAttribute(key) { return this.attrs[key] || null }
  addEventListener() {}
  removeEventListener() {}
  get nextSibling() { return this.parentNode && this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this) + 1] }
  get textContent() { return this.nodeType === 1 ? this.childNodes.map(node => node.textContent).join('') : this.data }
  set textContent(value) { this.childNodes = []; this.data = value }
}
global.window = { navigator: { userAgent: 'node-operator-test' }, addEventListener() {}, removeEventListener() {} }
global.document = { createElement: tag => new MemoryNode(tag), createElementNS: (ns, tag) => new MemoryNode(tag),
  createTextNode: text => new MemoryNode(null, 3, text), createComment: text => new MemoryNode(null, 8, text), createEvent: () => ({ timeStamp: Date.now() }) }
const Vue = require('vue')
const Vuex = require('vuex')
const compiler = require('vue-template-compiler')
const settle = require('axios/lib/core/settle')
Vue.use(Vuex)
Vue.config.productionTip = false
Vue.config.devtools = false
const bearerFixture = `fixture.${Buffer.from(JSON.stringify({ exp: 4070908800 })).toString('base64url')}.fixture`
global.localStorage = { getItem: key => key === 'token' ? bearerFixture : null }
const root = path.resolve(__dirname, '..')
const copy = value => JSON.parse(JSON.stringify(value))
function load(relative) {
  const filename = path.join(root, relative)
  let source = fs.readFileSync(filename, 'utf8')
  if (relative.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [])
    source = sfc.script.content
  }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require', 'crypto', 'process'])(module, module.exports,
    name => name.startsWith('@/') ? load(name.slice(2) + (path.extname(name) ? '' : '.js'))
      : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name), require('crypto').webcrypto, process)
  return module.exports
}
const admin = { id: 14, shopid: 7, access: 0, status: 1, session_subject: 'staff', module_permissions: ['delivery'] }
const cashier = { ...admin, id: 10, access: 1 }
const courier = { ...admin, id: 11, access: 6, is_primary_admin: true, module_permissions: ['delivery', 'staff', 'settings'] }
const mission = (version = 2, courierId = 11) => ({ id: '9007199254740993', shopId: 7, version, courierId,
  deliveryStatus: 'assigned', preparationStatus: 3, paymentStatus: 'paid', acceptanceStatus: 'accepted', remainingDueCents: 0,
  orderReference: 'TEST-1', financials: { grand_total: 12.50 }, allowedActions: ['assign', 'reportIssue'] })
const settings = () => ({ shopId: 7, revision: 3, enabled: true, origin: { latitude: 48.8, longitude: 2.3 }, maxDistanceMeters: 3000,
  minimumItemsCents: 0, freeDeliveryEnabled: false, freeDeliveryThresholdCents: null,
  fiscalPolicy: { mode: 'configured_rate', vatRate: 5.5 }, bands: [{ upToMeters: 3000, feeCents: 400 }] })
const balance = (version = 4, remainingDueCents = 1250) => ({ courierId: 11, shopId: 7, version, remainingDueCents,
  collectedCents: 1250, receivedCents: 0, discrepancyCents: 0, surplusCents: 0,
  collections: [{ collectionId: '9007199254740995', remainingDueCents, collectedCents: 1250 }], remittances: [], adjustments: [], refunds: [] })
function fixture(user = admin, reply = () => null) {
  const delivery = load('store/delivery.js')
  const calls = []
  const store = new Vuex.Store({ state: { authenticated: true }, modules: {
    delivery: { ...delivery, state: delivery.state() }, users: { namespaced: true, state: { user: copy(user) } },
    customer: { namespaced: true, state: { session: { customerId: '8' }, addresses: ['personal'] } },
  } })
  store.$deliveryApi = delivery.buildDeliveryApi({ baseURL: 'http://fixture.invalid', adapter: async config => {
    const call = { method: config.method, path: config.url.replace('/baseurl/api/v1', ''), body: config.data && JSON.parse(config.data), params: config.params, credentials: config.withCredentials }
    calls.push(call)
    let response = await reply(call)
    if (!response) response = { data: call.path === '/deliveries' ? [mission()] : call.path.endsWith('/cash-balance') ? balance()
      : call.path.endsWith('/refund-eligibility') ? { eligible: true, method: 'cash', amountCents: 1250, originalCourierId: 11, returnSources: ['register', 'courier'] }
        : call.path === '/delivery/couriers' ? [{ id: 11, username: 'Former holder', status: 0 }]
          : call.path === '/delivery/settings' ? settings() : mission() }
    if (response.lost) throw new Error('Lost response')
    return new Promise((resolve, reject) => settle(resolve, reject, { config, status: response.status || 200, headers: {},
      data: JSON.stringify({ success: !response.status, data: response.data, error: response.code, message: response.message || 'Fixture response' }) }))
  } })
  const dispatch = (name, payload) => store.dispatch(`delivery/${name}`, payload)
  const component = (name, propsData = {}) => new Vue({ ...load(`components/delivery/${name}.vue`).default, store, propsData })
  return { store, calls, dispatch, component }
}

function mountedComponent(f, name) {
  const file = `components/delivery/${name}.vue`
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8')).template.content
  const compiled = compiler.compile(source)
  const leaf = { functional: true, render(h, ctx) {
    const children = [...(ctx.children || [])]
    if (ctx.scopedSlots.activator) children.push(...[].concat(ctx.scopedSlots.activator({ on: {}, attrs: {} })))
    if (ctx.data.attrs && ctx.data.attrs.items && ctx.data.attrs.headers) {
      for (const row of ctx.data.attrs.items) for (const header of ctx.data.attrs.headers) {
        const slot = ctx.scopedSlots[`item.${header.value}`]
        children.push(...[].concat(slot ? slot({ item: row }) : h('span', String(row[header.value] || ''))))
      }
    }
    return h('div', ctx.data, children)
  } }
  const options = load(file).default
  const components = Object.fromEntries([...new Set(source.match(/v-[a-z-]+/g))].map(tag => [tag, leaf]))
  return new Vue({ ...options, components: { ...options.components, ...components }, store: f.store,
    render: vm.compileFunction(compiled.render, []), staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])) }).$mount()
}

test('operator role gate denies courier and forged primary flags; one Delivery entry and hidden internal modules', () => {
  const roles = load('helpers/staffRoles.js')
  assert.equal(roles.canAccessModule(6, 'delivery', ['delivery'], true), false)
  for (const module of ['staff', 'settings', 'orders', 'cashregister']) assert.equal(roles.canAccessModule(6, module, [module], true), false)
  for (const access of [2, 3, 4, 5, null]) assert.equal(roles.canAccessModule(access, 'delivery', ['delivery'], true), false)
  assert.equal(roles.canOperateDelivery(admin), true)
  assert.equal(roles.canOperateDelivery(cashier), true)
  assert.equal(roles.canOperateDelivery({ ...cashier, module_permissions: [] }), false)
  assert.equal(roles.canOperateDelivery(courier), false)
  assert.equal(roles.canAccessModule(1, 'settings', ['settings'], true), false)
  assert.equal(roles.canAccessModule(1, 'staff', ['staff'], true), false)
  const list = roles.getAccessibleNavigationItems(0, [{ to: '/stocks', moduleKey: 'stocks' }, { to: '/categories', moduleKey: 'categories' },
    { to: '/customizations', moduleKey: 'customizations' }], null, true)
  assert.deepEqual(list, [])
  const page = load('pages/livraison/index.vue').default
  const layout = load('layouts/default.vue').default
  const entries = layout.computed.navigationItems.call({ userAccess: 0, list: [], modulePermissions: null, isPrimaryAdmin: true })
  assert.equal(entries.filter(item => item.to === '/livraison').length, 1)
  assert.deepEqual(new Vue({ ...page, store: fixture().store }).tabs.map(tab => tab.text), ['Commandes', 'Livreurs', "Remises d'especes", 'Reglages'])
})

test('middleware denies operator/settings/accounts for courier regardless stored flags, and cashier accounts/settings', async () => {
  const guard = load('middleware/delivery.js').default
  for (const route of ['/livraison', '/settings', '/staff']) {
    let destination
    await guard({ store: { state: { authenticated: true, users: { user: courier } } }, route: { path: route }, redirect: path => { destination = path } })
    assert.equal(destination, '/login')
  }
  for (const route of ['/staff', '/settings']) {
    let destination
    await guard({ store: { state: { authenticated: true, users: { user: cashier } } }, route: { path: route }, redirect: path => { destination = path } })
    assert.ok(destination)
  }
})

test('actual Vue/Vuex HTTP assignment conflict rereads authority, requires confirmation and never optimistically changes', async () => {
  let conflict = true
  const f = fixture(admin, call => {
    if (call.path.endsWith('/assign')) return conflict ? { status: 409, code: 'DELIVERY_VERSION_CONFLICT' } : { data: mission(4, 15) }
    if (call.path.startsWith('/deliveries/')) return { data: mission(3, 12) }
  })
  await f.dispatch('operatorLoad', { resource: 'missions' })
  const component = f.component('DeliveryDispatch')
  component.openAction(mission(), 'assign')
  component.courierId = 15
  await component.confirmAction()
  assert.equal(f.store.state.delivery.operator.missions[0].courierId, 12)
  const pending = f.store.state.delivery.operator.pending[`assign:${mission().id}`]
  assert.equal(pending.status, 'conflict')
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1)
  await f.dispatch('operatorCommand', { operation: 'assign', deliveryId: mission().id, courierId: 15 })
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1)
  conflict = false
  await component.confirmAction(true)
  const posts = f.calls.filter(call => call.method === 'post')
  assert.equal(posts[1].body.expectedVersion, 3)
  assert.notEqual(posts[1].body.idempotencyKey, posts[0].body.idempotencyKey)
  component.$destroy()
})

test('lost financial response retains exact key/version/body and only an explicit retry sends again', async () => {
  let lost = true
  const f = fixture(cashier, call => call.path.endsWith('/remittances') ? lost ? { lost: true } : { data: { remittanceId: '82', expectedCents: 1250, receivedCents: 1000, discrepancyCents: -250, remainingDueCents: 250 } } : null)
  await f.dispatch('operatorLoad', { resource: 'balance', courierId: 11 })
  const vm = f.component('DeliveryCashRemittances')
  vm.courierId = 11
  vm.received = '10.00'
  await vm.confirmRemittance()
  assert.equal(vm.result, null)
  const first = f.calls.find(call => call.method === 'post').body
  assert.equal(first.expectedBalanceVersion, 4)
  assert.equal(f.store.state.delivery.operator.pending['remit:11'].status, 'unresolved')
  lost = false
  vm.received = '99.99'
  await vm.confirmRemittance()
  assert.deepEqual(f.calls.filter(call => call.method === 'post')[1].body, first)
  assert.equal(vm.result.remainingDueCents, 250)
  assert.equal(vm.result.discrepancyCents, -250)
  assert.equal(f.calls.every(call => call.credentials === false), true)
  vm.$destroy()
})

test('stale expected balance reloads current amount/version and requires a new confirmation', async () => {
  let version = 4
  const f = fixture(cashier, call => {
    if (call.path.endsWith('/cash-balance')) return { data: balance(version, version === 4 ? 1250 : 2000) }
    if (call.path.endsWith('/remittances')) { version = 5; return { status: 409, code: 'COURIER_CASH_VERSION_CONFLICT' } }
  })
  await f.dispatch('operatorLoad', { resource: 'balance', courierId: 11 })
  await f.dispatch('operatorCommand', { operation: 'remit', courierId: 11, receivedCents: 1000 })
  assert.equal(f.store.state.delivery.operator.balances[11].remainingDueCents, 2000)
  assert.equal(f.store.state.delivery.operator.pending['remit:11'].status, 'conflict')
  assert.equal(f.calls.filter(call => call.method === 'post').length, 1)
})

test('all operational missions and independently recent 100 closed are retained, and terminal action is admin-only', async () => {
  const rows = Array.from({ length: 220 }, (_, index) => ({ ...mission(), id: String(index + 1), deliveryStatus: index < 120 ? 'assigned' : 'delivered' }))
  for (const user of [admin, cashier]) {
    const f = fixture(user, call => call.path === '/deliveries' ? { data: rows } : null)
    await f.dispatch('operatorLoad', { resource: 'missions' })
    const component = f.component('DeliveryDispatch')
    assert.equal(component.filteredMissions.length, 120)
    component.filter = 'closed'
    assert.equal(component.filteredMissions.length, 100)
    assert.match(component.historyLabel, /100.*recent|recent.*100/i)
    assert.equal(component.actionsFor(rows[219]).includes('correctTerminal'), user.access === 0)
    component.$destroy()
  }
})

test('courier accounts use existing staff actions; availability is distinct; role6 gets no staff module/service point', async () => {
  const staff = load('store/staff.js')
  let sent
  await staff.actions.update.call({ $axios: { patch: (path, body) => { sent = body; return { data: {} } } } },
    { rootState: { users: { user: admin } }, dispatch() {} }, { id: 11, data: { username: 'Courier', access: 6, module_permissions: ['orders', 'delivery'], service_point_id: 9, status: 1 } })
  assert.deepEqual(sent.module_permissions, [])
  assert.equal(sent.service_point_id, null)
  const f = fixture(cashier)
  const component = f.component('DeliveryCouriers')
  assert.equal(component.canManageAccounts, false)
  await component.setAvailable({ id: 11 }, true)
  assert.equal(f.calls[0].path, '/delivery/couriers/11/availability')
  assert.deepEqual(f.calls[0].body, { available: true })
  assert.equal(f.calls.some(call => call.path.includes('/user/')), false)
  const denied = fixture(courier)
  await assert.rejects(denied.dispatch('operatorLoad', { resource: 'missions' }))
  assert.equal(denied.calls.length, 0)
  component.$destroy()
})

test('former promoted cash holder is listed for cashier independently of assignment list', async () => {
  const f = fixture(cashier, call => call.path === '/delivery/couriers' ? { data: call.params && call.params.financialHolders === true
    ? [{ id: 11, username: 'Promoted holder', status: 1, currentCourier: false }] : [{ id: 15, username: 'New courier' }] } : null)
  await f.dispatch('operatorLoad', { resource: 'holders' })
  await f.dispatch('operatorLoad', { resource: 'couriers' })
  const component = f.component('DeliveryCashRemittances')
  assert.equal(component.holders[0].id, 11)
  assert.equal(f.store.state.delivery.operator.couriers[0].id, 15)
  await component.selectHolder(11)
  assert.ok(f.calls.some(call => call.path === '/delivery/couriers/11/cash-balance'))
  assert.equal(f.calls.some(call => call.path === '/users'), false)
  component.$destroy()
})

test('full manual refund uses current eligibility and immutable holder, exact API and insufficient source is never success', async () => {
  let insufficient = true
  const f = fixture(cashier, call => call.path.endsWith('/refund') ? insufficient ? { status: 409, code: 'DELIVERY_REFUND_CUSTODY_INSUFFICIENT' }
    : { data: { refundId: '87', returnSource: 'register', amountCents: 1250, physicalHolderId: 10, providerVerified: false } } : null)
  const component = f.component('DeliveryDispatch')
  await component.openRefund({ ...mission(), courierId: 15 })
  assert.equal(component.refundEligibility.originalCourierId, 11)
  component.returnSource = 'courier'
  component.reason = 'Full physical return'
  component.refundConfirmed = true
  await component.confirmRefund()
  assert.equal(component.refundResult, null)
  const post = f.calls.find(call => call.path.endsWith('/refund'))
  assert.deepEqual(Object.keys(post.body).sort(), ['idempotencyKey', 'reason', 'returnSource'])
  assert.equal(post.body.returnSource, 'courier')
  assert.match(f.store.state.delivery.operator.error, /especes|source|restitu/i)
  insufficient = false
  component.returnSource = 'register'
  await component.confirmRefund(true)
  assert.equal(component.refundResult.refundId, '87')
  assert.ok(f.calls.filter(call => call.path === '/delivery/couriers/11/cash-balance').length >= 1)
  component.$destroy()
})

test('external-card refund explicitly declares independent terminal operation and has no automatic logistical coupling', async () => {
  const f = fixture(admin, call => call.path.endsWith('/refund-eligibility') ? { data: { eligible: true, method: 'external_card', amountCents: 1250, originalCourierId: 11, returnSources: ['external_card'] } } : null)
  const component = f.component('DeliveryDispatch')
  await component.openRefund(mission())
  assert.match(component.refundDeclaration, /TPE independant/)
  assert.match(component.refundDeclaration, /Stripe/)
  component.reason = 'Declared by restaurant'
  await component.confirmRefund()
  assert.equal(f.calls.some(call => call.path.endsWith('/refund')), false)
  component.$destroy()
})

test('settings validate actual Task2 shape: explicit fee VAT, valid origin/bands, zero minimum, optional free and UTC503', async () => {
  const f = fixture(admin, call => call.method === 'put' ? { status: 503, code: 'DELIVERY_UTC_SESSION_REQUIRED' } : null)
  await f.dispatch('operatorLoad', { resource: 'settings' })
  const component = f.component('DeliverySettings')
  component.useSettings(settings())
  assert.equal(component.validationError, '')
  component.form.fiscalPolicy.vatRate = null
  assert.ok(component.validationError)
  component.form.fiscalPolicy.vatRate = 10
  component.form.bands[0].upToMeters = 2000
  assert.ok(component.validationError)
  component.form.bands[0].upToMeters = 3000
  component.form.origin = null
  assert.ok(component.validationError)
  component.useSettings(settings())
  await component.save()
  assert.match(f.store.state.delivery.operator.error, /UTC/)
  const put = f.calls.find(call => call.method === 'put')
  assert.equal(put.body.expectedRevision, 3)
  assert.equal(put.body.minimumItemsCents, 0)
  assert.equal(put.body.freeDeliveryThresholdCents, null)
  assert.equal(f.calls.some(call => /cancel|resolve-issue/.test(call.path)), false)
  const restricted = fixture(cashier)
  await assert.rejects(restricted.dispatch('operatorSaveSettings', settings()))
  assert.equal(restricted.calls.length, 0)
  component.$destroy()
})

test('operator initialization/shop reset leaves checkout, customer and raw persistence independent; stale read ignored', async () => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const f = fixture(admin, call => call.path === '/deliveries' ? pending : null)
  f.store.state.delivery.currentQuote = { quoteToken: 'existing-quote' }
  f.store.state.delivery.posDraft = { resolution: 'existing-proof' }
  const read = f.dispatch('operatorLoad', { resource: 'missions' })
  for (let index = 0; index < 10 && !f.calls.length; index++) await Promise.resolve()
  f.store.state.users.user = { ...admin, shopid: 8 }
  await f.dispatch('operatorInitialize')
  release({ data: [mission()] })
  await read
  assert.deepEqual(copy(f.store.state.delivery.operator.missions), [])
  assert.equal(f.store.state.delivery.currentQuote.quoteToken, 'existing-quote')
  assert.equal(f.store.state.delivery.posDraft.resolution, 'existing-proof')
  assert.deepEqual(copy(f.store.state.customer.addresses), ['personal'])
})

test('staff admin actions refuse cashier and courier even with stale primary flags before sending HTTP', async () => {
  const staff = load('store/staff.js')
  for (const user of [cashier, courier]) {
    let calls = 0
    const http = () => { calls++; return Promise.resolve({ data: { data: [] } }) }
    const context = { rootState: { users: { user: { ...user, is_primary_admin: true } } }, dispatch() {} }
    const store = { $axios: { get: http, post: http, patch: http, delete: http } }
    for (const [action, payload] of [['getAll', {}], ['create', {}], ['update', { id: 11, data: {} }], ['provisionCredentials', { id: 11 }], ['remove', 11]]) {
      assert.equal(await staff.actions[action].call(store, context, payload), false)
    }
    assert.equal(calls, 0)
  }
})

test('mounted Vue renders terminal correction and account actions only for admin; cashier adjustments absent', async () => {
  for (const user of [admin, cashier]) {
    const f = fixture(user, call => call.path === '/deliveries' ? { data: [{ ...mission(), deliveryStatus: 'delivered', allowedActions: [] }] } : null)
    await f.dispatch('operatorLoad', { resource: 'missions' })
    const dispatch = mountedComponent(f, 'DeliveryDispatch')
    dispatch.filter = 'closed'
    await Vue.nextTick()
    assert.equal(dispatch.$el.textContent.includes('Corriger une erreur terminale'), user.access === 0)
    const couriers = mountedComponent(f, 'DeliveryCouriers')
    assert.equal(couriers.$el.textContent.includes('Ajouter un livreur'), user.access === 0)
    const cash = mountedComponent(f, 'DeliveryCashRemittances')
    await cash.selectHolder(11)
    await Vue.nextTick()
    assert.equal(cash.$el.textContent.includes('Regularisation administrative'), user.access === 0)
    dispatch.$destroy(); couriers.$destroy(); cash.$destroy()
  }
})

test('settings suspension is one settings PUT and no mission cancel; validation blocks malformed bands and missing VAT', async () => {
  const f = fixture(admin, call => call.method === 'put' ? { data: { ...settings(), enabled: false, revision: 4 } } : null)
  await f.dispatch('operatorLoad', { resource: 'settings' })
  const component = f.component('DeliverySettings')
  component.form.fiscalPolicy.vatRate = null
  await component.save()
  assert.equal(f.calls.filter(call => call.method === 'put').length, 0)
  component.useSettings(settings())
  component.form.enabled = false
  await component.save()
  assert.equal(f.calls.filter(call => call.method === 'put').length, 1)
  assert.equal(f.calls.some(call => /cancel|resolve-issue/.test(call.path)), false)
  component.$destroy()
})

test('resolved source-insufficient refund cannot create success and lost refund always replays same original source', async () => {
  let lost = true
  const f = fixture(cashier, call => call.path.endsWith('/refund') ? lost ? { lost: true } : { data: { refundId: '88', amountCents: 1250, returnSource: 'courier' } } : null)
  const component = f.component('DeliveryDispatch')
  await component.openRefund(mission())
  component.reason = 'Physical return'; component.returnSource = 'courier'; component.refundConfirmed = true
  await component.confirmRefund()
  assert.equal(component.refundResult, null)
  const original = copy(f.calls.find(call => call.path.endsWith('/refund')).body)
  component.reason = 'A different reason'; component.returnSource = 'register'
  lost = false
  await component.confirmRefund()
  assert.deepEqual(f.calls.filter(call => call.path.endsWith('/refund'))[1].body, original)
  assert.equal(component.refundResult.refundId, '88')
  component.$destroy()
})

test('terminal correction uses only reason/version/key and cashier command is denied before HTTP', async () => {
  const closed = { ...mission(7), deliveryStatus: 'delivered', allowedActions: [] }
  for (const user of [admin, cashier]) {
    const f = fixture(user, call => call.path === '/deliveries' ? { data: [closed] } : null)
    await f.dispatch('operatorLoad', { resource: 'missions' })
    const payload = { operation: 'correctTerminal', deliveryId: closed.id, reason: 'Wrong button', nextState: 'assigned' }
    if (user.access === 1) await assert.rejects(f.dispatch('operatorCommand', payload))
    else {
      await f.dispatch('operatorCommand', payload)
      const post = f.calls.find(call => call.method === 'post')
      assert.equal(post.path, `/deliveries/${closed.id}/correct-terminal`)
      assert.deepEqual(Object.keys(post.body).sort(), ['expectedVersion', 'idempotencyKey', 'reason'])
      assert.equal(post.body.expectedVersion, 7)
    }
    assert.equal(f.calls.filter(call => call.method === 'post').length, user.access === 0 ? 1 : 0)
  }
})

test('protected layout guard restores an existing admin session before evaluating a settings deep link', async () => {
  const guard = load('middleware/delivery.js').default
  let destination
  const state = { authenticated: false, users: { user: {} } }
  const store = { state, dispatch(name) {
    if (name === 'users/ensureAuthenticatedStorage') { state.authenticated = true; state.users.user = copy(admin); return true }
  } }
  await guard({ store, route: { path: '/settings', name: 'settings' }, redirect: path => { destination = path } })
  assert.equal(destination, undefined)
})

test('checkout availability/reset does not discard an unresolved operator financial attempt for the same actor', async () => {
  const f = fixture(cashier, call => call.path.endsWith('/remittances') ? { lost: true } : call.path.endsWith('/availability') ? { data: { enabled: true } } : null)
  await f.dispatch('operatorLoad', { resource: 'balance', courierId: 11 })
  await f.dispatch('operatorCommand', { operation: 'remit', courierId: 11, receivedCents: 500 })
  const original = copy(f.store.state.delivery.operator.pending['remit:11'])
  await f.dispatch('loadSettings', 7)
  assert.ok(f.store.state.delivery.operator.pending['remit:11'], 'Checkout availability must retain the unresolved remittance')
  assert.deepEqual(copy(f.store.state.delivery.operator.pending['remit:11']), original)
  await f.dispatch('resetForShop', 7)
  assert.deepEqual(copy(f.store.state.delivery.operator.pending['remit:11']), original)
})

test('a remounted operator can resume a lost refund after authoritative payment becomes refunded', async () => {
  const f = fixture(cashier, call => call.path.endsWith('/refund') ? { lost: true }
    : call.path.startsWith('/deliveries/') && !call.path.endsWith('/refund-eligibility') ? { data: { ...mission(), paymentStatus: 'refunded', allowedActions: [] } } : null)
  const first = f.component('DeliveryDispatch')
  await first.openRefund(mission())
  first.reason = 'Full return'; first.returnSource = 'courier'; first.refundConfirmed = true
  await first.confirmRefund()
  first.$destroy()
  const next = f.component('DeliveryDispatch')
  assert.equal(next.actionsFor({ ...mission(), paymentStatus: 'refunded', allowedActions: [] }).includes('refund'), true)
  assert.equal(next.pendingAttempts.length, 1)
  await next.resumeAttempt(next.pendingAttempts[0])
  assert.equal(next.refundOpen, true)
  assert.equal(next.refundLocked, true)
  next.$destroy()
})

test('refund dialog renders the server source-insufficiency refusal alongside its confirmation controls', async () => {
  const f = fixture(cashier, call => call.path.endsWith('/refund') ? { status: 409, code: 'DELIVERY_REFUND_CUSTODY_INSUFFICIENT' } : null)
  const component = mountedComponent(f, 'DeliveryDispatch')
  await component.openRefund(mission())
  component.reason = 'Full return'; component.returnSource = 'courier'; component.refundConfirmed = true
  await component.confirmRefund()
  await Vue.nextTick()
  assert.match(component.$el.textContent, /source ne detient plus assez d'especes/)
  component.$destroy()
})
