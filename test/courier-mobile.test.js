/* eslint-disable no-console, vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const http = require('http')
const { test } = require('node:test')
const babel = require('@babel/core')

class MemoryNode {
  constructor(tag, type = 1, text = '') {
    this.tagName = tag && tag.toUpperCase(); this.nodeType = type; this.data = text
    this.childNodes = []; this.parentNode = null; this.attrs = {}; this.events = {}; this.style = { setProperty() {} }
  }

  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) {
    if (node.parentNode) node.parentNode.removeChild(node)
    const index = before ? this.childNodes.indexOf(before) : -1
    if (index < 0) this.childNodes.push(node); else this.childNodes.splice(index, 0, node)
    node.parentNode = this; return node
  }

  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node }
  setAttribute(key, value) { this.attrs[key] = value }
  removeAttribute(key) { delete this.attrs[key] }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key) }
  getAttribute(key) { return this.attrs[key] || null }
  addEventListener(key, listener) { this.events[key] = listener }
  removeEventListener(key) { delete this.events[key] }
  get nextSibling() { return this.parentNode && this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this) + 1] }
  get textContent() { return this.nodeType === 1 ? this.childNodes.map(node => node.textContent).join('') : this.data }
  set textContent(value) { this.childNodes = []; this.data = value }
}
global.window = { navigator: { userAgent: 'node-courier-test' }, addEventListener() {}, removeEventListener() {} }
global.document = { createElement: tag => new MemoryNode(tag), createElementNS: (ns, tag) => new MemoryNode(tag),
  createTextNode: text => new MemoryNode(null, 3, text), createComment: text => new MemoryNode(null, 8, text), createEvent: () => ({ timeStamp: Date.now() }) }
const Vue = require('vue')
const Vuex = require('vuex')
const compiler = require('vue-template-compiler')
Vue.use(Vuex)
Vue.config.productionTip = false
Vue.config.devtools = false
const root = path.resolve(__dirname, '..')
const copy = value => JSON.parse(JSON.stringify(value))
function load(relative) {
  const filename = path.join(root, relative)
  let source = fs.readFileSync(filename, 'utf8')
  if (relative.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [])
    source = sfc.script ? sfc.script.content : 'export default {}'
  }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require', 'process'])(module, module.exports,
    name => name.startsWith('@/') ? load(name.slice(2) + (path.extname(name) ? '' : '.js'))
      : name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), name + (path.extname(name) ? '' : '.js')))) : require(name), process)
  return module.exports
}
function compiled(file) {
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8')).template.content
  const result = compiler.compile(source)
  assert.deepEqual(result.errors, [])
  const leaf = { functional: true, render(h, ctx) {
    const children = [...(ctx.children || [])]
    if (ctx.data.attrs && Array.isArray(ctx.data.attrs.items)) children.push(...ctx.data.attrs.items.map(item => h('span', item.text)))
    return h(ctx.data.attrs && ctx.data.attrs.href ? 'a' : 'div', ctx.data, children)
  } }
  const options = load(file).default
  return { ...options, components: { ...options.components, ...Object.fromEntries([...new Set(source.match(/v-[a-z-]+/g) || [])].map(tag => [tag, leaf])),
    CourierMission: file.endsWith('CourierMission.vue') ? undefined : compiledChild('CourierMission', source),
    CourierPayment: file.endsWith('CourierPayment.vue') ? undefined : compiledChild('CourierPayment', source) },
  render: vm.compileFunction(result.render, []), staticRenderFns: result.staticRenderFns.map(code => vm.compileFunction(code, [])) }
}
function compiledChild(name, source) { return source.includes(`<${name}`) ? compiled(`components/delivery/${name}.vue`) : undefined }
function nodes(element, predicate) { return [element, ...(element.childNodes || []).flatMap(child => nodes(child, predicate))].filter(predicate) }
function action(component, name) { return nodes(component.$el, node => node.attrs && node.attrs['data-action'] === name)[0] }
async function drain() { for (let index = 0; index < 30; index++) { await Promise.resolve(); await Vue.nextTick() } }
function deferred() { let complete; const promise = new Promise(resolve => { complete = resolve }); return { promise, resolve: complete } }
const courier = { id: 11, shopid: 7, access: 6, status: 1, session_subject: 'staff', module_permissions: [] }
const mission = (id = '9007199254740993', extra = {}) => ({ id, version: 2, shopId: 7, courierId: 11,
  orderReference: `FIXTURE-${id}`, preparationStatus: 3, paymentStatus: 'unpaid', acceptanceStatus: 'accepted',
  deliveryStatus: 'assigned', remainingDueCents: 1250, allowedActions: ['pickup', 'reportIssue'],
  addressSnapshot: { street: '1 Test Street', postalCode: '75001', city: 'Paris', country: 'FR', instructions: 'Private fixture', intercom: 'Private fixture intercom' },
  contactSnapshot: { name: 'Fixture customer', phone: '+33 7 00 00 00 00' }, items: [{ name: 'Fixture meal', quantity: 1, customizations: [{ step: 'Size', choice: 'Large' }] }],
  financials: { grand_total: 12.5 }, ...extra })
const balance = () => ({ shopId: 7, courierId: 11, version: 1, collectedCents: 0, receivedCents: 0, remainingDueCents: 0,
  discrepancyCents: 0, surplusCents: 0, adjustedDueCents: 0, refundedCents: 0, courierRefundedCents: 0, registerRefundedCents: 0,
  externalCardRefundedCents: 0, collections: [], remittances: [], adjustments: [], refunds: [] })
function storage() {
  const values = new Map([['token', `fixture.${Buffer.from(JSON.stringify({ exp: 4070908800 })).toString('base64url')}.fixture`]])
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), values }
}
async function fixture(t, reply = () => null, options = {}) {
  global.localStorage = options.storage || storage()
  const calls = []
  const rows = [mission(), mission('9007199254740994', { paymentStatus: 'paid', remainingDueCents: 0 })]
  const server = http.createServer(async (req, res) => {
    try {
      let data = ''
      for await (const chunk of req) data += chunk
      const call = { method: req.method, path: req.url.replace('/baseurl/api/v1', ''), body: data ? JSON.parse(data) : undefined, headers: req.headers }
      calls.push(call)
      let response = await reply(call, rows)
      if (!response) response = { data: call.path === '/courier/deliveries' ? copy(rows)
        : call.path === '/courier/availability' ? { courierId: 11, available: false }
          : call.path === '/courier/cash-balance' ? balance() : copy(rows.find(row => call.path === `/courier/deliveries/${row.id}`)) }
      if (response.lost) return req.socket.destroy()
      res.writeHead(response.status || 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: !response.status, data: response.data, error: response.code, message: 'Fixture response' }))
    } catch (error) { res.writeHead(500); res.end(JSON.stringify({ success: false, message: error.message })) }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => { server.close(resolve); if (server.closeAllConnections) server.closeAllConnections() }))
  const module = load('store/courier.js')
  const delivery = load('store/delivery.js')
  const store = new Vuex.Store({ state: { authenticated: true }, modules: {
    courier: { ...module, state: module.state() }, delivery: { ...delivery, state: delivery.state() },
    users: { namespaced: true, state: { user: copy(options.user || courier) }, actions: { ensureAuthenticatedStorage: () => true } },
    customer: { namespaced: true, state: { session: { customerId: '81' }, addresses: ['personal fixture'] } },
  } })
  store.$deliveryApi = delivery.buildDeliveryApi({ baseURL: `http://127.0.0.1:${server.address().port}`, fetch: (url, init) => {
    assert.equal(init.credentials, 'omit'); return fetch(url, init)
  } })
  const dispatch = (name, input) => store.dispatch(`courier/${name}`, input)
  const mount = (file, propsData = {}) => {
    const redirects = []
    const component = new Vue({ ...compiled(file), propsData, store, beforeCreate() { this.$router = { replace: destination => redirects.push(destination) } } }).$mount()
    t.after(() => component.$destroy())
    return { component, redirects }
  }
  return { store, calls, rows, dispatch, mount, storage: global.localStorage }
}

test('Task14 courier store, route, layout and mission/payment surfaces exist', () => {
  for (const file of ['store/courier.js', 'pages/livreur/index.vue', 'layouts/courier.vue', 'middleware/courier.js',
    'components/delivery/CourierMission.vue', 'components/delivery/CourierPayment.vue']) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} missing`)
})

test('role6 goes directly to courier namespace; public tracking and legacy QR/kiosk remain separate', async t => {
  const f = await fixture(t)
  const auth = load('middleware/auth.js').default
  const guard = load('middleware/courier.js').default
  for (const path of ['/', '/menus', '/orders', '/settings', '/staff', '/livraison', '/livraison/suivi-private']) {
    const redirects = []
    await auth({ store: f.store, route: { path }, redirect: value => redirects.push(value) })
    assert.deepEqual(redirects, ['/livreur'])
  }
  for (const path of ['/livreur', '/livreur/', '/livraison/suivi', '/livraison/suivi/fixture-token']) {
    const redirects = []
    await guard({ store: f.store, route: { path }, redirect: value => redirects.push(value) })
    assert.deepEqual(redirects, [])
  }
  f.store.state.users.user = { ...courier, session_subject: 'customer' }
  const redirects = []
  await guard({ store: f.store, route: { path: '/livreur' }, redirect: value => redirects.push(value) })
  assert.deepEqual(redirects, ['/login'])
  assert.deepEqual(copy(f.store.state.courier.missions), [])
})

test('mount reads current availability and balance without any availability write', async t => {
  const f = await fixture(t)
  await f.dispatch('loadMissions')
  await f.dispatch('loadAvailability')
  await f.dispatch('loadCashBalance')
  assert.equal(f.store.state.courier.available, false)
  assert.equal(f.store.state.courier.balance.remainingDueCents, 0)
  assert.equal(f.calls.every(call => call.method === 'GET' && call.path.startsWith('/courier/')), true)
  assert.equal(f.calls.every(call => !call.headers.cookie && call.headers.authorization.startsWith('Bearer fixture.')), true)
  const page = f.mount('pages/livreur/index.vue').component
  await drain()
  assert.equal(page.$el.textContent.includes('Mes missions'), true)
  assert.equal(f.calls.some(call => call.method === 'PATCH'), false)
})

test('successful refresh clears only its resource read failure, not another failed resource', async t => {
  const failed = new Set(['/courier/deliveries', '/courier/cash-balance'])
  const f = await fixture(t, call => failed.has(call.path) ? { status: 503 } : null)
  await f.dispatch('loadMissions')
  await f.dispatch('loadCashBalance')
  assert.match(f.store.state.courier.error, /Lecture impossible/)
  failed.delete('/courier/deliveries')
  await f.dispatch('loadMissions')
  assert.match(f.store.state.courier.error, /Lecture impossible/)
  failed.clear()
  await f.dispatch('loadCashBalance')
  assert.equal(f.store.state.courier.error, null)
  assert.equal(f.store.state.courier.missions.length, 2)
})

test('read recovery preserves an unresolved command error through later successful reads', async t => {
  let failRead = true
  const f = await fixture(t, call => call.method === 'POST' ? { status: 503 }
    : failRead && call.path === '/courier/deliveries' ? { status: 503 } : null)
  await f.dispatch('loadMissions')
  failRead = false
  await f.dispatch('read', { resource: 'detail', deliveryId: '9007199254740993' })
  await f.dispatch('pickup', { deliveryId: '9007199254740993' })
  assert.match(f.store.state.courier.error, /Resultat non confirme/)
  await f.dispatch('loadMissions')
  await f.dispatch('loadCashBalance')
  assert.match(f.store.state.courier.error, /Resultat non confirme/)
})

test('an obsolete failed read cannot restore a banner after the newer refresh succeeds', async t => {
  const slow = deferred()
  let readCount = 0
  const f = await fixture(t, call => {
    if (call.path !== '/courier/deliveries') return null
    if (++readCount === 1) return slow.promise
    return null
  })
  const oldRead = f.dispatch('loadMissions')
  while (!f.calls.length) await new Promise(resolve => setImmediate(resolve))
  await f.dispatch('loadMissions')
  slow.resolve({ status: 503 })
  await oldRead
  assert.equal(f.store.state.courier.error, null)
  assert.equal(f.store.state.courier.missions.length, 2)
})

test('two missions are picked up and finished independently through actual HTTP', async t => {
  const f = await fixture(t, (call, rows) => {
    if (call.method !== 'POST') return
    const row = rows.find(row => call.path.includes(row.id))
    if (call.path.endsWith('/pickup')) Object.assign(row, { version: 3, deliveryStatus: 'in_transit', allowedActions: row.paymentStatus === 'paid' ? ['deliver', 'reportIssue'] : ['collectPayment', 'reportIssue'] })
    if (call.path.endsWith('/collect-payment')) Object.assign(row, { version: 4, paymentStatus: 'paid', remainingDueCents: 0, allowedActions: ['deliver', 'reportIssue'] })
    if (call.path.endsWith('/deliver')) { Object.assign(row, { version: row.version + 1, deliveryStatus: 'delivered', allowedActions: [] }); delete row.addressSnapshot; delete row.contactSnapshot; delete row.items }
    return { data: call.path.endsWith('/collect-payment') ? { collectionId: '81', delivery: copy(row), idempotentReplay: false } : copy(row) }
  })
  await f.dispatch('loadMissions')
  for (const deliveryId of f.rows.map(row => row.id)) await f.dispatch('pickup', { deliveryId })
  assert.deepEqual(f.store.state.courier.missions.map(row => row.deliveryStatus), ['in_transit', 'in_transit'])
  await f.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'external_card', amountCents: 1, courierId: 999 })
  const collection = f.calls.find(call => call.path.endsWith('/collect-payment'))
  assert.deepEqual(Object.keys(collection.body).sort(), ['expectedVersion', 'idempotencyKey', 'method'])
  assert.equal(collection.body.method, 'external_card')
  assert.equal(f.store.state.courier.balance.remainingDueCents, 0)
  await f.dispatch('deliver', { deliveryId: f.rows[0].id })
  assert.equal(f.store.state.courier.missions[1].deliveryStatus, 'in_transit')
  await f.dispatch('deliver', { deliveryId: f.rows[1].id })
  for (const row of f.store.state.courier.missions) { assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.addressSnapshot, undefined); assert.equal(row.contactSnapshot, undefined) }
})

test('double tap issues one payment request and no optimistic payment', async t => {
  const hold = deferred()
  const f = await fixture(t, async call => { if (call.path.endsWith('/collect-payment')) { await hold.promise; return { data: { delivery: mission(undefined, { version: 4, paymentStatus: 'paid', remainingDueCents: 0 }) } } } })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment', 'reportIssue'] })
  await f.dispatch('loadMissions')
  const first = f.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'cash' })
  await f.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'external_card' })
  assert.equal(f.store.state.courier.missions[0].paymentStatus, 'unpaid')
  hold.resolve(); await first
  assert.equal(f.calls.filter(call => call.path.endsWith('/collect-payment')).length, 1)
})

test('lost payment survives reload with minimal metadata, rereads authority and explicitly replays exact body', async t => {
  let lost = true
  const seen = []
  const reply = call => {
    seen.push(call)
    if (call.path.endsWith('/collect-payment')) return lost ? { lost: true } : { data: { delivery: mission(undefined, { version: 4, paymentStatus: 'paid', remainingDueCents: 0 }) } }
  }
  const f = await fixture(t, reply)
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions')
  await f.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'cash' })
  const first = f.calls.find(call => call.method === 'POST').body
  const saved = [...f.storage.values.entries()].filter(([key]) => key !== 'token')
  assert.equal(saved.length, 1)
  const metadata = JSON.parse(saved[0][1])
  assert.deepEqual(Object.keys(metadata[0]).sort(), ['courierId', 'deliveryId', 'expectedVersion', 'idempotencyKey', 'method', 'shopId'])
  assert.equal(saved[0][1].includes('Private'), false)
  lost = false
  const reloaded = await fixture(t, reply, { storage: f.storage })
  await reloaded.dispatch('loadMissions')
  assert.equal(reloaded.calls.some(call => call.method === 'POST'), false)
  const start = seen.length
  await reloaded.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'external_card' })
  assert.deepEqual(reloaded.calls.find(call => call.method === 'POST').body, first)
  assert.equal(seen[start].path, `/courier/deliveries/${f.rows[0].id}`)
  assert.equal(seen[start].method, 'GET')
  assert.equal(JSON.parse(f.storage.getItem(saved[0][0])).length, 0)
})

test('failed authority read never starts or replays a collection and clears private mission', async t => {
  let failRead = false
  const f = await fixture(t, call => call.path === `/courier/deliveries/${mission().id}` && failRead ? { status: 404 } : null)
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions'); failRead = true
  await f.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'cash' })
  assert.equal(f.calls.some(call => call.method === 'POST'), false)
  assert.equal(f.store.state.courier.missions.some(row => row.id === f.rows[0].id), false)
})

test('closed response replaces all private fields and a delayed list cannot revive them', async t => {
  const stale = deferred(); let delay = false
  const f = await fixture(t, async call => {
    if (call.path === '/courier/deliveries' && delay) { await stale.promise; return { data: [mission(undefined, { paymentStatus: 'paid', remainingDueCents: 0 })] } }
    if (call.path.endsWith('/deliver')) return { data: mission(undefined, { version: 4, deliveryStatus: 'delivered', addressSnapshot: undefined, contactSnapshot: undefined, items: undefined, allowedActions: [] }) }
  })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', paymentStatus: 'paid', remainingDueCents: 0, allowedActions: ['deliver'] })
  await f.dispatch('loadMissions'); delay = true
  const loading = f.dispatch('loadMissions')
  await f.dispatch('deliver', { deliveryId: f.rows[0].id })
  stale.resolve(); await loading
  const closed = f.store.state.courier.missions[0]
  assert.equal(closed.deliveryStatus, 'delivered'); assert.equal(closed.addressSnapshot, undefined); assert.equal(closed.contactSnapshot, undefined)
})

test('issue, preparation, paid and pending-payment guards block invalid commands', async t => {
  const f = await fixture(t)
  for (const extra of [{ preparationStatus: 2 }, { deliveryStatus: 'issue', allowedActions: ['deliver', 'collectPayment', 'pickup'] },
    { paymentStatus: 'paid', remainingDueCents: 0, allowedActions: ['collectPayment'] },
    { paymentStatus: 'requires_payment', acceptanceStatus: 'payment_pending', allowedActions: ['collectPayment'] }]) {
    f.rows[0] = mission(undefined, extra); await f.dispatch('loadMissions')
    await f.dispatch('pickup', { deliveryId: f.rows[0].id })
    await f.dispatch('deliver', { deliveryId: f.rows[0].id })
    await f.dispatch('collectPayment', { deliveryId: f.rows[0].id, method: 'cash' })
  }
  assert.equal(f.calls.some(call => call.method === 'POST'), false)
})

test('identity changes clear old mission/balance/pending before refusing; stale response discarded', async t => {
  const hold = deferred(); let late = false
  const f = await fixture(t, async call => { if (late && call.path === '/courier/deliveries') { await hold.promise; return { data: [mission()] } } })
  await f.dispatch('loadMissions'); await f.dispatch('loadCashBalance')
  late = true; const request = f.dispatch('loadMissions')
  f.store.state.users.user = { ...courier, id: 12 }
  await f.dispatch('initialize')
  hold.resolve(); await request
  assert.deepEqual(copy(f.store.state.courier.missions), []); assert.equal(f.store.state.courier.balance, null)
  f.store.state.users.user = { ...courier, access: 0 }
  await f.dispatch('pickup', { deliveryId: mission().id })
  assert.deepEqual(copy(f.store.state.courier.pending), {})
})

test('compiled payment hides paid collect, labels external card manual and disables pending actions', async t => {
  const f = await fixture(t)
  await f.dispatch('loadMissions')
  const paid = f.mount('components/delivery/CourierPayment.vue', { mission: f.rows[1] }).component
  assert.equal(action(paid, 'collect'), undefined)
  const unpaid = f.mount('components/delivery/CourierPayment.vue', { mission: mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] }) }).component
  assert.equal(unpaid.$el.textContent.includes('manuelle'), true)
  assert.ok(action(unpaid, 'collect'))
})

test('compiled mission builds fixed encoded phone/maps URLs and has no cancel/refund action', async t => {
  const f = await fixture(t)
  await f.dispatch('initialize')
  const component = f.mount('components/delivery/CourierMission.vue', { mission: mission(undefined, {
    contactSnapshot: { name: 'Fixture', phone: 'javascript:alert(1)' }, addressSnapshot: { street: 'javascript:alert(1)?&', postalCode: '75001', city: 'Paris' },
  }) }).component
  const links = nodes(component.$el, node => node.attrs && node.attrs.href)
  assert.equal(links.some(node => String(node.attrs.href).startsWith('javascript:')), false)
  assert.equal(links.some(node => String(node.attrs.href).startsWith('tel:')), false)
  assert.equal(links.some(node => String(node.attrs.href).startsWith('https://www.google.com/maps/dir/?api=1&destination=javascript%3Aalert(1)%3F%26')), true)
  assert.equal(action(component, 'refund'), undefined); assert.equal(action(component, 'cancel'), undefined)
  component.$props.mission = mission(); await drain()
  assert.equal(nodes(component.$el, node => node.attrs && node.attrs.href === 'tel:%2B33700000000').length, 1)
})

test('mounted page clears private child state on identity/logout and never grants operator privileges', async t => {
  const f = await fixture(t)
  const mounted = f.mount('pages/livreur/index.vue')
  await mounted.component.refresh(); await drain()
  assert.equal(mounted.component.$el.textContent.includes('Private fixture'), true)
  f.store.state.authenticated = false
  await drain()
  assert.equal(mounted.component.$el.textContent.includes('Private fixture'), false)
  assert.deepEqual(copy(f.store.state.courier.missions), [])
  assert.ok(mounted.redirects.includes('/login'))
  const layout = load('layouts/default.vue').default
  assert.ok([].concat(layout.middleware).includes('courier'))
})

test('courier data stays excluded from shared persistence; Task13 same-identity pending survives checkout reset', async t => {
  const f = await fixture(t)
  await f.dispatch('loadMissions'); await f.dispatch('loadCashBalance')
  const persisted = require('../helpers/persistedState')
  const decoded = JSON.parse(persisted.serializePersistedState(f.store.state))
  assert.equal(JSON.stringify(decoded).includes('Private fixture'), false)
  assert.equal(Object.hasOwn(decoded, 'courier'), false)
  f.store.state.delivery.operator.pending = { 'remit:11': { status: 'unresolved', body: { idempotencyKey: 'operator-existing', receivedCents: 100 } } }
  f.store.commit('delivery/RESET', 7)
  assert.equal(f.store.state.delivery.operator.pending['remit:11'].body.idempotencyKey, 'operator-existing')
  assert.deepEqual(copy(f.store.state.customer.addresses), ['personal fixture'])
})

test('compiled payment click reaches HTTP once, stays disabled while pending, and displays server cents', async t => {
  const hold = deferred(); const started = deferred()
  const f = await fixture(t, async call => {
    if (call.path.endsWith('/collect-payment')) { started.resolve(); await hold.promise; return { data: { delivery: mission(undefined, { version: 3, paymentStatus: 'paid', remainingDueCents: 0 }) } } }
  })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions')
  const component = f.mount('components/delivery/CourierPayment.vue', { mission: f.store.state.courier.missions[0] }).component
  component.method = 'external_card'; await drain()
  assert.equal(component.$el.textContent.includes('declaration manuelle'), true)
  const button = action(component, 'collect')
  assert.ok(button.events.click)
  button.events.click({ target: button, currentTarget: button, timeStamp: Date.now() })
  await started.promise; await drain()
  assert.equal(action(component, 'collect').attrs.disabled, 'disabled')
  await component.collect()
  hold.resolve()
  await f.dispatch('loadCashBalance'); await drain()
  assert.equal(f.calls.filter(call => call.path.endsWith('/collect-payment')).length, 1)
})

test('unknown issue keeps exact reason/key in memory, same identity refresh preserves it, explicit replay only', async t => {
  let lost = true
  const f = await fixture(t, call => call.path.endsWith('/report-issue') ? lost ? { lost: true }
    : { data: mission(undefined, { version: 3, deliveryStatus: 'issue', allowedActions: [] }) } : null)
  await f.dispatch('loadMissions')
  await f.dispatch('reportIssue', { deliveryId: mission().id, reason: 'Fixture reason' })
  const first = f.calls.find(call => call.method === 'POST').body
  await f.dispatch('initialize'); await f.dispatch('loadMissions')
  assert.equal(f.store.state.courier.pending[mission().id].status, 'unresolved')
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
  assert.equal([...f.storage.values.values()].some(value => value.includes('Fixture reason')), false)
  lost = false
  await f.dispatch('reportIssue', { deliveryId: mission().id, reason: 'Changed reason' })
  assert.deepEqual(f.calls.filter(call => call.method === 'POST')[1].body, first)
  assert.equal(f.store.state.courier.missions.find(row => row.id === mission().id).deliveryStatus, 'issue')
})

test('conflict rereads current mission, clears stale privacy and waits for a new explicit confirmation', async t => {
  const f = await fixture(t, call => {
    if (call.path.endsWith('/pickup')) return { status: 409, code: 'DELIVERY_VERSION_CONFLICT', data: { delivery: mission() } }
    if (call.path === `/courier/deliveries/${mission().id}`) return { data: mission(undefined, { version: 7, deliveryStatus: 'delivered', allowedActions: [] }) }
  })
  await f.dispatch('loadMissions')
  await f.dispatch('pickup', { deliveryId: mission().id })
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  assert.equal(row.version, 7); assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.addressSnapshot, undefined)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(f.store.state.courier.pending[mission().id], undefined)
})

test('reassigned recovery never posts, restores no private details, retains its unresolved key', async t => {
  let lost = true; let reassigned = false
  const f = await fixture(t, call => {
    if (call.path.endsWith('/collect-payment') && lost) return { lost: true }
    if (reassigned && call.path === `/courier/deliveries/${mission().id}`) return { status: 404 }
  })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions'); await f.dispatch('collectPayment', { deliveryId: mission().id, method: 'cash' })
  const key = f.store.state.courier.pending[mission().id].body.idempotencyKey
  lost = false; reassigned = true
  await f.dispatch('loadMissions'); await f.dispatch('collectPayment', { deliveryId: mission().id })
  assert.equal(f.store.state.courier.missions.some(row => row.id === mission().id), false)
  assert.equal(f.store.state.courier.pending[mission().id].body.idempotencyKey, key)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
})

test('authoritative denial after an unknown payment does not erase its minimal recovery metadata', async t => {
  let deny = false
  const f = await fixture(t, call => call.path.endsWith('/collect-payment') ? deny ? { status: 403 } : { lost: true } : null)
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions'); await f.dispatch('collectPayment', { deliveryId: mission().id, method: 'cash' })
  const key = f.calls.find(call => call.method === 'POST').body.idempotencyKey
  deny = true
  await f.dispatch('collectPayment', { deliveryId: mission().id })
  assert.equal([...f.storage.values.values()].some(value => value.includes(key)), true)
  assert.equal(f.store.state.courier.missions.length, 0)
})

test('bounded or unavailable recovery storage refuses new money without evicting unknown entries', async t => {
  const saved = storage()
  const entries = Array.from({ length: 32 }, (_, index) => ({ shopId: 8, courierId: 12, deliveryId: String(index + 1),
    idempotencyKey: `fixture-${index}`, method: 'cash', expectedVersion: 2 }))
  saved.setItem('smarteat.courier.collections.v1', JSON.stringify(entries))
  const f = await fixture(t, () => null, { storage: saved })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions'); await f.dispatch('collectPayment', { deliveryId: mission().id, method: 'cash' })
  assert.equal(f.calls.some(call => call.method === 'POST'), false)
  assert.deepEqual(JSON.parse(saved.getItem('smarteat.courier.collections.v1')), entries)
  assert.ok(f.store.state.courier.recoveryError)
})

test('manual passage order remains local and availability PATCH has no optimistic or mount write', async t => {
  let fail = false
  const f = await fixture(t, call => call.method === 'PATCH' ? fail ? { lost: true } : { data: { courierId: 11, available: true } } : null)
  await f.dispatch('loadMissions'); await f.dispatch('loadAvailability')
  await f.dispatch('reorder', { deliveryId: f.rows[1].id, direction: -1 })
  assert.deepEqual(copy(f.store.state.courier.order), ['9007199254740994', '9007199254740993'])
  assert.equal(f.calls.every(call => call.method === 'GET'), true)
  await f.dispatch('setAvailability', true)
  assert.equal(f.store.state.courier.available, true)
  assert.deepEqual(f.calls.find(call => call.method === 'PATCH').body, { available: true })
  fail = true; await f.dispatch('setAvailability', false)
  assert.equal(f.store.state.courier.available, null)
})

test('public tracking exception works without staff authentication and never opens the operator namespace', async t => {
  const f = await fixture(t)
  f.store.state.authenticated = false
  const auth = load('middleware/auth.js').default
  const redirects = []
  await auth({ store: f.store, route: { path: '/livraison/suivi/fixture-token' }, redirect: target => redirects.push(target) })
  assert.deepEqual(redirects, [])
  await auth({ store: f.store, route: { path: '/livraison' }, redirect: target => redirects.push(target) })
  assert.deepEqual(redirects, ['/login'])
})

test('availability PATCH invalidates a delayed read and releases both loading flags', async t => {
  const hold = deferred(); const started = deferred()
  const f = await fixture(t, async call => {
    if (call.path === '/courier/availability' && call.method === 'GET') { started.resolve(); await hold.promise; return { data: { courierId: 11, available: false } } }
    if (call.method === 'PATCH') return { data: { courierId: 11, available: true } }
  })
  const read = f.dispatch('loadAvailability'); await started.promise
  await f.dispatch('setAvailability', true)
  hold.resolve(); await read
  assert.equal(f.store.state.courier.available, true)
  assert.equal(Boolean(f.store.state.courier.busy['availability:']), false)
  assert.equal(Boolean(f.store.state.courier.busy.availability), false)
})

test('unwritable or malformed recovery storage blocks payment without sending or persisting private fields', async t => {
  for (const mode of ['denied', 'malformed']) {
    const saved = storage()
    if (mode === 'denied') saved.setItem = () => { throw new Error('Storage denied') }
    else saved.setItem('smarteat.courier.collections.v1', '{invalid')
    const f = await fixture(t, () => null, { storage: saved })
    f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
    await f.dispatch('loadMissions'); await f.dispatch('collectPayment', { deliveryId: mission().id, method: 'cash' })
    assert.equal(f.calls.some(call => call.method === 'POST'), false)
    assert.ok(f.store.state.courier.recoveryError)
  }
})

test('late mutation after courier/shop change cannot republish private details or old balance', async t => {
  const hold = deferred(); const started = deferred()
  const f = await fixture(t, async call => {
    if (call.path.endsWith('/pickup')) { started.resolve(); await hold.promise; return { data: mission(undefined, { version: 3, deliveryStatus: 'in_transit' }) } }
  })
  await f.dispatch('loadMissions'); await f.dispatch('loadCashBalance')
  const mutation = f.dispatch('pickup', { deliveryId: mission().id }); await started.promise
  f.store.state.users.user = { ...courier, shopid: 8, id: 12 }
  await f.dispatch('initialize'); hold.resolve(); await mutation
  assert.equal(f.store.state.courier.missions.length, 0); assert.equal(f.store.state.courier.balance, null)
})

test('mounted courier page keeps authority failure visible after clearing denied private scope', async t => {
  const f = await fixture(t, () => ({ status: 403 }))
  const page = f.mount('pages/livreur/index.vue').component
  await page.refresh(); await drain()
  assert.equal(f.store.state.courier.missions.length, 0)
  assert.equal(page.$el.textContent.includes('Lecture impossible'), true)
})

test('manual order skips completed missions so one arrow moves one visible mission', async t => {
  const f = await fixture(t)
  f.rows.push(mission('9007199254740995'))
  await f.dispatch('loadMissions')
  f.store.commit('courier/ORDER', ['9007199254740993', '9007199254740994', '9007199254740995'])
  f.store.commit('courier/MISSION', { deliveryId: '9007199254740994', row: mission('9007199254740994', { deliveryStatus: 'delivered' }) })
  await f.dispatch('reorder', { deliveryId: '9007199254740993', direction: 1 })
  assert.deepEqual(copy(f.store.state.courier.order), ['9007199254740995', '9007199254740993'])
})

for (const recovering of [false, true]) test(`round1 I1 detail404 blocks an old list started during collection preflight (${recovering ? 'unresolved replay' : 'new collection'})`, async t => {
  const detailStarted = deferred(); const detailRelease = deferred()
  const listStarted = deferred(); const listRelease = deferred()
  let overlap = false
  const f = await fixture(t, async (call, rows) => {
    if (call.path.endsWith('/collect-payment')) return { lost: true }
    if (!overlap) return
    if (call.path === `/courier/deliveries/${mission().id}`) {
      detailStarted.resolve(); await detailRelease.promise; return { status: 404 }
    }
    if (call.path === '/courier/deliveries') {
      const snapshot = copy(rows)
      snapshot[1].version = 8
      listStarted.resolve(); await listRelease.promise; return { data: snapshot }
    }
  })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] })
  await f.dispatch('loadMissions')
  if (recovering) {
    await f.dispatch('collectPayment', { deliveryId: mission().id, method: 'cash' })
    await f.dispatch('loadMissions')
  }
  f.store.commit('courier/ORDER', [f.rows[1].id, f.rows[0].id])
  const saved = f.storage.getItem('smarteat.courier.collections.v1')
  const postCount = f.calls.filter(call => call.method === 'POST').length
  overlap = true
  const collect = f.dispatch('collectPayment', { deliveryId: mission().id, method: 'external_card' })
  await detailStarted.promise
  const list = f.dispatch('loadMissions'); await listStarted.promise
  detailRelease.resolve(); await collect
  assert.equal(f.store.state.courier.missions.some(row => row.id === mission().id), false)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, postCount)
  listRelease.resolve(); await list
  assert.equal(f.store.state.courier.missions.some(row => row.id === mission().id), false, 'old list resurrected reassigned mission')
  assert.equal(JSON.stringify(f.store.state.courier.missions).includes('Private fixture intercom'), true, 'other mission remains independent')
  assert.equal(f.store.state.courier.missions.find(row => row.id === f.rows[1].id).version, 8)
  assert.deepEqual(copy(f.store.state.courier.order), [f.rows[1].id])
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
  assert.equal(f.storage.getItem('smarteat.courier.collections.v1'), saved)
  if (recovering) {
    const entries = JSON.parse(saved)
    assert.deepEqual(Object.keys(entries[0]).sort(), ['courierId', 'deliveryId', 'expectedVersion', 'idempotencyKey', 'method', 'shopId'])
    assert.equal(f.store.state.courier.pending[mission().id].body.idempotencyKey, entries[0].idempotencyKey)
    assert.equal(f.store.state.courier.pending[mission().id].body.method, 'cash')
  }
  overlap = false
  f.rows[0] = mission(undefined, { version: 9, addressSnapshot: { street: 'New authoritative fixture' } })
  await f.dispatch('loadMissions')
  assert.equal(f.store.state.courier.missions.find(row => row.id === mission().id).version, 9)
  assert.equal(f.store.state.courier.missions.find(row => row.id === mission().id).addressSnapshot.street, 'New authoritative fixture')
  assert.equal(f.calls.filter(call => call.method === 'POST').length, postCount)
})

test('round1 I1 newer terminal detail defeats older list and detail without blocking a fresh authoritative reopen', async t => {
  const listStarted = deferred(); const listRelease = deferred()
  const detailStarted = deferred(); const detailRelease = deferred()
  let overlap = false; let detailCount = 0
  const f = await fixture(t, async (call, rows) => {
    if (!overlap) return
    if (call.path === '/courier/deliveries') {
      const snapshot = copy(rows); listStarted.resolve(); await listRelease.promise; return { data: snapshot }
    }
    if (call.path === `/courier/deliveries/${mission().id}`) {
      if (++detailCount === 1) {
        const snapshot = copy(rows[0]); detailStarted.resolve(); await detailRelease.promise; return { data: snapshot }
      }
      return { data: mission(undefined, { version: 7, deliveryStatus: 'delivered', allowedActions: [] }) }
    }
  })
  await f.dispatch('loadMissions'); overlap = true
  const list = f.dispatch('loadMissions'); await listStarted.promise
  const oldDetail = f.dispatch('read', { resource: 'detail', deliveryId: mission().id }); await detailStarted.promise
  await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  listRelease.resolve(); detailRelease.resolve(); await list; await oldDetail
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.version, 7)
  assert.equal(row.addressSnapshot, undefined); assert.equal(row.contactSnapshot, undefined); assert.equal(row.items, undefined)
  assert.equal(f.store.state.courier.missions.length, 2)
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
  overlap = false; f.rows[0] = mission(undefined, { version: 8, deliveryStatus: 'issue', allowedActions: [] })
  await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  assert.equal(f.store.state.courier.missions.find(row => row.id === mission().id).version, 8)
})

for (const removed of [false, true]) test(`round1 I1 newer list ${removed ? 'removal' : 'closure'} defeats an older detail`, async t => {
  const started = deferred(); const release = deferred()
  const f = await fixture(t, async (call, rows) => {
    if (call.path === `/courier/deliveries/${mission().id}`) {
      const snapshot = copy(rows[0]); started.resolve(); await release.promise; return { data: snapshot }
    }
  })
  await f.dispatch('loadMissions')
  const oldDetail = f.dispatch('read', { resource: 'detail', deliveryId: mission().id }); await started.promise
  if (removed) f.rows.shift()
  else f.rows[0] = mission(undefined, { version: 7, deliveryStatus: 'delivered', allowedActions: [] })
  await f.dispatch('loadMissions')
  release.resolve(); await oldDetail
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  if (removed) assert.equal(row, undefined)
  else { assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.addressSnapshot, undefined); assert.equal(row.contactSnapshot, undefined) }
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
})

test('round1 I1 older command success cannot restore private data over a newer terminal detail', async t => {
  const started = deferred(); const release = deferred()
  const f = await fixture(t, async call => {
    if (call.path.endsWith('/pickup')) {
      started.resolve(); await release.promise
      return { data: mission(undefined, { version: 3, deliveryStatus: 'in_transit', allowedActions: ['collectPayment'] }) }
    }
    if (call.path === `/courier/deliveries/${mission().id}`) return { data: mission(undefined, { version: 5, deliveryStatus: 'delivered', allowedActions: [] }) }
  })
  await f.dispatch('loadMissions')
  const pickup = f.dispatch('pickup', { deliveryId: mission().id }); await started.promise
  await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  release.resolve(); await pickup
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.version, 5)
  assert.equal(row.addressSnapshot, undefined); assert.equal(row.contactSnapshot, undefined)
  assert.equal(f.store.state.courier.pending[mission().id], undefined)
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
})

for (const denied of [false, true]) test(`round1 I1 command ${denied ? '404' : 'newer closure'} fences a concurrent older active detail and list`, async t => {
  const commandStarted = deferred(); const commandRelease = deferred()
  const listStarted = deferred(); const listRelease = deferred()
  const denialReadStarted = deferred(); const denialReadRelease = deferred()
  let overlap = false; let detailCount = 0
  const f = await fixture(t, async (call, rows) => {
    if (call.path.endsWith('/deliver')) {
      commandStarted.resolve(); await commandRelease.promise
      return denied ? { status: 404 } : { data: mission(undefined, { version: 3, deliveryStatus: 'delivered', allowedActions: [] }) }
    }
    if (denied && call.path === `/courier/deliveries/${mission().id}` && ++detailCount > 1) {
      denialReadStarted.resolve(); await denialReadRelease.promise; return { status: 404 }
    }
    if (overlap && call.path === '/courier/deliveries') {
      const snapshot = copy(rows); listStarted.resolve(); await listRelease.promise; return { data: snapshot }
    }
  })
  f.rows[0] = mission(undefined, { deliveryStatus: 'in_transit', paymentStatus: 'paid', remainingDueCents: 0, allowedActions: ['deliver'] })
  await f.dispatch('loadMissions')
  const command = f.dispatch('deliver', { deliveryId: mission().id }); await commandStarted.promise
  await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  overlap = true
  const list = f.dispatch('loadMissions'); await listStarted.promise
  commandRelease.resolve()
  try {
    if (denied) {
      await denialReadStarted.promise
      assert.equal(f.store.state.courier.missions.some(row => row.id === mission().id), false, 'command404 must clear before its follow-up read')
    } else await command
    listRelease.resolve(); await list
    if (denied) assert.equal(f.store.state.courier.missions.some(row => row.id === mission().id), false)
  } finally {
    listRelease.resolve(); denialReadRelease.resolve(); await command; await list
  }
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  if (denied) assert.equal(row, undefined)
  else { assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.version, 3); assert.equal(row.addressSnapshot, undefined) }
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
})

test('round1 I1 empty authoritative list fences an in-flight detail not previously in missions', async t => {
  const started = deferred(); const release = deferred()
  const f = await fixture(t, async call => {
    if (call.path === '/courier/deliveries') return { data: [] }
    if (call.path === `/courier/deliveries/${mission().id}`) {
      started.resolve(); await release.promise; return { data: mission() }
    }
  })
  const detail = f.dispatch('read', { resource: 'detail', deliveryId: mission().id }); await started.promise
  await f.dispatch('loadMissions'); release.resolve(); await detail
  assert.equal(f.store.state.courier.missions.length, 0)
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
})

for (const scenario of [
  { operation: 'pickup', version: 3, recovering: false },
  { operation: 'pickup', version: 3, recovering: true },
  { operation: 'collectPayment', version: 3, recovering: false },
  { operation: 'collectPayment', version: 3, recovering: true },
]) test(`round2 N-I1 confirmed ${scenario.operation} version${scenario.version} ${scenario.recovering ? 'replay' : 'new'} survives a precommit active detail`, async t => {
  const started = deferred(); const release = deferred()
  const suffix = scenario.operation === 'pickup' ? '/pickup' : '/collect-payment'
  let firstLost = scenario.recovering
  const applied = () => mission(undefined, { version: scenario.version, deliveryStatus: 'in_transit', paymentStatus: 'paid',
    remainingDueCents: 0, allowedActions: ['deliver', 'reportIssue'] })
  const f = await fixture(t, async (call, rows) => {
    if (!call.path.endsWith(suffix)) return
    if (firstLost) {
      firstLost = false
      if (scenario.operation === 'collectPayment') rows[0] = applied()
      return { lost: true }
    }
    started.resolve(); await release.promise
    rows[0] = applied()
    return { data: scenario.operation === 'pickup' ? copy(rows[0]) : { collectionId: '81', delivery: copy(rows[0]), idempotentReplay: scenario.recovering } }
  })
  f.rows[0] = mission(undefined, scenario.operation === 'pickup'
    ? { paymentStatus: 'paid', remainingDueCents: 0 }
    : { deliveryStatus: 'in_transit', allowedActions: ['collectPayment', 'reportIssue'] })
  await f.dispatch('loadMissions')
  const untouched = copy(f.store.state.courier.missions[1])
  f.store.commit('courier/ORDER', [f.rows[1].id, f.rows[0].id])
  if (scenario.recovering) {
    await f.dispatch(scenario.operation, { deliveryId: mission().id, method: 'cash' })
    await f.dispatch('loadMissions')
  }
  const command = f.dispatch(scenario.operation, { deliveryId: mission().id, method: 'cash' }); await started.promise
  await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  const detailCount = f.calls.filter(call => call.path === `/courier/deliveries/${mission().id}`).length
  release.resolve(); const result = await command
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  assert.equal(row.deliveryStatus, 'in_transit'); assert.equal(row.version, scenario.version)
  assert.equal(row.paymentStatus, 'paid'); assert.equal(row.remainingDueCents, 0)
  assert.ok(row.allowedActions.includes('deliver')); assert.ok(result, 'confirmed nonterminal outcome must not disappear')
  assert.deepEqual(copy(f.store.state.courier.missions[1]), untouched)
  assert.deepEqual(copy(f.store.state.courier.order), [f.rows[1].id, f.rows[0].id])
  assert.equal(f.store.state.courier.pending[mission().id], undefined)
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
  const posts = f.calls.filter(call => call.method === 'POST')
  assert.equal(posts.length, scenario.recovering ? 2 : 1)
  if (scenario.recovering) assert.deepEqual(posts[1].body, posts[0].body)
  if (scenario.operation === 'collectPayment' && scenario.recovering) {
    assert.equal(f.calls.filter(call => call.path === `/courier/deliveries/${mission().id}`).length, detailCount + 1)
    assert.equal(posts[1].body.expectedVersion, 2)
    assert.equal(result.idempotentReplay, true)
  }
  if (scenario.operation === 'collectPayment') assert.deepEqual(JSON.parse(f.storage.getItem('smarteat.courier.collections.v1')), [])
})

for (const source of ['detail', 'list']) test(`round2 N-I1 lower-version confirmation rereads authority after a newer active ${source}`, async t => {
  const started = deferred(); const release = deferred()
  const reconcileStarted = deferred(); const reconcileRelease = deferred()
  let confirmed = false
  const f = await fixture(t, async (call, rows) => {
    if (call.path.endsWith('/pickup')) {
      started.resolve(); await release.promise; confirmed = true
      return { data: mission(undefined, { version: 3, deliveryStatus: 'in_transit' }) }
    }
    if (confirmed && call.path === `/courier/deliveries/${mission().id}`) {
      reconcileStarted.resolve(); await reconcileRelease.promise; return { data: copy(rows[0]) }
    }
  })
  await f.dispatch('loadMissions')
  const command = f.dispatch('pickup', { deliveryId: mission().id }); await started.promise
  f.rows[0] = mission(undefined, { version: 5, deliveryStatus: 'issue', allowedActions: [] })
  if (source === 'detail') await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  else await f.dispatch('loadMissions')
  release.resolve()
  // Wait for either the reconciliation request or the old implementation's discarded result.
  const boundary = await Promise.race([reconcileStarted.promise.then(() => 'read'), command.then(() => 'done')])
  try {
    assert.equal(boundary, 'read', 'confirmed stale projection needs an own-detail reconciliation')
    const row = f.store.state.courier.missions.find(row => row.id === mission().id)
    assert.equal(row.version, 5); assert.equal(row.deliveryStatus, 'issue')
  } finally { reconcileRelease.resolve(); await command }
  assert.equal(f.store.state.courier.missions.find(row => row.id === mission().id).version, 5)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
})

for (const authority of ['removed', 'terminal']) test(`round2 N-I1 higher-version nonterminal reply cannot replace ${authority} authority`, async t => {
  const started = deferred(); const release = deferred()
  let read = false
  const f = await fixture(t, async call => {
    if (call.path.endsWith('/pickup')) {
      started.resolve(); await release.promise; return { data: mission(undefined, { version: 7, deliveryStatus: 'in_transit' }) }
    }
    if (read && call.path === `/courier/deliveries/${mission().id}`) return authority === 'removed'
      ? { status: 404 } : { data: mission(undefined, { version: 6, deliveryStatus: 'delivered', allowedActions: [] }) }
  })
  await f.dispatch('loadMissions')
  const command = f.dispatch('pickup', { deliveryId: mission().id }); await started.promise
  read = true; await f.dispatch('read', { resource: 'detail', deliveryId: mission().id })
  const reads = f.calls.filter(call => call.method === 'GET').length
  release.resolve(); await command
  const row = f.store.state.courier.missions.find(row => row.id === mission().id)
  if (authority === 'removed') assert.equal(row, undefined)
  else { assert.equal(row.deliveryStatus, 'delivered'); assert.equal(row.version, 6); assert.equal(row.addressSnapshot, undefined) }
  assert.equal(f.calls.filter(call => call.method === 'GET').length, reads)
  assert.equal(f.calls.filter(call => call.method === 'POST').length, 1)
  assert.equal(Object.values(f.store.state.courier.busy).some(Boolean), false)
})
