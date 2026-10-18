/* eslint-disable no-console, vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const { test } = require('node:test')
class MemoryNode {
  constructor(tag, type = 1, text = '') { this.tagName = tag && tag.toUpperCase(); this.nodeType = type; this.data = text; this.childNodes = []; this.parentNode = null; this.attrs = {}; this.style = { setProperty() {} } }
  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) { if (node.parentNode) node.parentNode.removeChild(node); const index = this.childNodes.indexOf(before); if (index < 0) this.childNodes.push(node); else this.childNodes.splice(index, 0, node); node.parentNode = this; return node }
  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node }
  setAttribute(key, value) { this.attrs[key] = value }
  removeAttribute(key) { delete this.attrs[key] }
  hasAttribute(key) { return Object.hasOwn(this.attrs, key) }
  addEventListener() {}
  removeEventListener() {}
  get nextSibling() { return this.parentNode && this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this) + 1] }
  get textContent() { return this.nodeType === 1 ? this.childNodes.map(node => node.textContent).join('') : this.data }
}
const listeners = new Set()
global.window = { navigator: { userAgent: 'tracking-test' }, addEventListener() {} }
global.document = { hidden: false, addEventListener: (event, listener) => listeners.add(listener), removeEventListener: (event, listener) => listeners.delete(listener),
  createElement: tag => new MemoryNode(tag), createElementNS: (ns, tag) => new MemoryNode(tag), createTextNode: text => new MemoryNode(null, 3, text), createComment: text => new MemoryNode(null, 8, text), createEvent: () => ({ timeStamp: Date.now() }) }
const Vue = require('vue')
const compiler = require('vue-template-compiler')
Vue.config.productionTip = false
Vue.config.devtools = false
function load(relative, globals = {}) {
  let filename = path.resolve(__dirname, '..', relative)
  if (!fs.existsSync(filename)) filename += fs.existsSync(filename + '.vue') ? '.vue' : '.js'
  let source = fs.readFileSync(filename, 'utf8')
  let render
  if (filename.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    const compiled = compiler.compile(sfc.template.content)
    assert.deepEqual(compiled.errors, [])
    render = vm.compileFunction(compiled.render)
    source = sfc.script.content
  }
  const module = { exports: {} }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  vm.compileFunction(code, ['module', 'exports', 'require', 'setTimeout', 'clearTimeout'])(module, module.exports,
    name => globals.imports && globals.imports[name] || (name.startsWith('@/') ? load(name.slice(2), globals) : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name)), globals.setTimeout || setTimeout, globals.clearTimeout || clearTimeout)
  if (render) module.exports.default.render = render
  return module.exports
}
const drain = async () => { for (let i = 0; i < 15; i++) { await Promise.resolve(); await Vue.nextTick() } }
const token = 'a'.repeat(43)
process.env.privateURL = 'http://127.0.0.1:6024'
test('fragment parsing and public transport never copy the token into URL/headers/credentials', async () => {
  const { readTrackingFragment, buildTrackingApi } = load('helpers/deliveryTracking.js')
  const history = { replaceState(state, title, url) { this.url = url } }
  assert.equal(readTrackingFragment({ location: { hash: '#' + token, pathname: '/livraison/suivi', search: '' }, history }) === token, true)
  assert.equal(history.url, '/livraison/suivi')
  assert.equal(readTrackingFragment({ location: { hash: '', search: '?token=guess', pathname: '/livraison/suivi' }, history }), null)
  const calls = []
  const api = buildTrackingApi({ baseURL: 'http://127.0.0.1:6024', fetch: (url, options) => {
    calls.push({ url, options }); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: { stage: 'received' } }) })
  } })
  assert.deepEqual(await api.read(token), { stage: 'received' })
  assert.equal(calls[0].url, 'http://127.0.0.1:6024/baseurl/api/v1/delivery/tracking/read')
  assert.equal(JSON.parse(calls[0].options.body).token === token, true)
  assert.equal(calls[0].options.credentials, 'omit')
  assert.equal(calls[0].options.referrerPolicy, 'no-referrer')
  assert.equal(calls[0].options.cache, 'no-store')
  assert.equal(calls[0].options.headers.Authorization, undefined)
})
test('actual Vue mounted poll: visible 15 seconds, hidden pause, network 15/30/60, expiry and destroy stop', async () => {
  const timers = new Map(); let nextTimer = 0
  const setTimer = (fn, ms) => { timers.set(++nextTimer, { fn, ms }); return nextTimer }
  const clearTimer = id => timers.delete(id)
  const tick = async ms => { const entry = [...timers].find(([, value]) => value.ms === ms); assert.ok(entry, `Expected ${ms}ms timer`); timers.delete(entry[0]); await entry[1].fn(); await drain() }
  let calls = 0; let failure = 0
  const dto = { reference: 'FIXTURE-31', stage: 'ready', restaurant: { name: 'Fixture', phone: '', address: '7 rue Test' }, addressSnapshot: { street: '7 rue Test', postalCode: '75001', city: 'Paris', country: 'FR' }, payment: { status: 'paid', totalCents: 1250, remainingDueCents: 0 } }
  global.window.location = { hash: '#' + token, pathname: '/livraison/suivi', search: '' }
  global.window.history = { replaceState() {} }
  global.window.fetch = () => { calls++; if (failure) return Promise.reject(Object.assign(new Error('Fixture failure'), { status: failure })); return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: dto }) }) }
  const component = load('pages/livraison/suivi.vue', { setTimeout: setTimer, clearTimeout: clearTimer }).default
  const page = new Vue(component).$mount()
  await drain()
  assert.equal(calls, 1)
  assert.equal(page.view.reference, 'FIXTURE-31')
  await tick(15000); assert.equal(calls, 2)
  document.hidden = true; for (const listener of listeners) listener()
  assert.equal(timers.size, 0)
  document.hidden = false; for (const listener of listeners) listener()
  await drain(); assert.equal(calls, 3)
  failure = 503
  await tick(15000); await tick(15000); await tick(30000); await tick(60000)
  failure = 0; await tick(60000)
  assert.equal(page.error, '')
  failure = 404; await tick(15000)
  assert.equal(page.view, null)
  assert.equal(timers.size, 0)
  page.$destroy(); assert.equal(listeners.size, 0)
  failure = 0; document.hidden = true
  const hidden = new Vue(component).$mount(); await drain()
  const before = calls
  assert.equal(timers.size, 0)
  document.hidden = false; for (const listener of listeners) listener(); await drain()
  assert.equal(calls, before + 1)
  hidden.$destroy(); assert.equal(timers.size, 0)
  assert.equal(listeners.size, 0)
})
test('cart keeps private confirmation in memory, ordinary replay never rotates, explicit recovery has no staff credentials', async () => {
  const Vuex = require('vuex'); Vue.use(Vuex)
  if (!global.crypto) global.crypto = require('crypto').webcrypto
  const module = load('store/cart.js')
  const calls = []; const sent = []
  global.window.fetch = (url, options) => { calls.push({ url, options }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { trackingUrl: '/livraison/suivi#' + token } }) }) }
  const store = new Vuex.Store({ modules: {
    cart: { ...module, namespaced: true, state: module.state() },
    users: { namespaced: true, state: { user: { shopid: 7, id: null, session_subject: 'service_point' } } },
    delivery: { namespaced: true, actions: { checkoutRequest(context, input) {
      sent.push(input.payload)
      return { data: { data: { orderId: 31, delivery: { id: '41' }, idempotent_replay: true } } }
    } } },
    notifications: { namespaced: true, actions: { success() {} } },
  }, plugins: [require('vuex-easy-access').default()] })
  const result = await store.dispatch('cart/checkoutOrder', { fulfillmentType: 'delivery', dataCart: [{ id: 21, qty: 1, price: 12.5, subtotal: 12.5 }],
    expectedTotal: 12.5, deliveryQuoteToken: 'quote', addressResolutionToken: 'address', customer: { id: 71, name: 'Guest', phone: '' }, payment: 'Paiement a la livraison' })
  assert.equal(result.ok, true)
  assert.equal(calls.length, 0)
  assert.equal(await store.dispatch('cart/hasDeliveryTrackingConfirmation'), true)
  const secret = sent[0].delivery_confirmation_secret
  assert.equal(JSON.stringify(store.state).includes(secret), false)
  await store.dispatch('cart/rotateDeliveryTracking')
  assert.equal(calls.length, 1)
  const body = JSON.parse(calls[0].options.body)
  assert.equal(body.privateCheckoutContext.confirmationSecret === secret, true)
  assert.equal(body.privateCheckoutContext.clientOrderToken === sent[0].client_order_token, true)
  assert.equal(calls[0].options.headers.Authorization, undefined)
  assert.equal(calls[0].options.credentials, 'omit')
})
test('actual detail Vue discards a late tracking link after navigating to another order', async () => {
  const imports = Object.fromEntries(['@/components/orders/OrderEditModal', '@/components/orders/TakeawayChip', '@/components/orders/VatBreakdown',
    '@/components/delivery/DeliveryCheckout.vue', '@/components/products/CustomizationSummary'].map(name => [name, {}]))
  const options = load('pages/orders/detail/_id.vue', { imports }).default
  let rows = [{ id: 31, shopid: 7, delivery_id: '41', fulfillment_type: 'delivery' }]
  const state = Vue.observable({ users: { user: { id: 10, shopid: 7, access: 0, session_subject: 'staff' } } })
  let complete
  const response = new Promise(resolve => { complete = resolve })
  global.window.fetch = () => response
  global.localStorage = { getItem: () => 'fixture-staff-bearer' }
  const page = new Vue({ ...options, beforeCreate() {
    this.$route = { params: { id: '31' }, query: {} }
    this.$store = { state, get: key => key === 'orders/detailOrder' ? rows : '', dispatch: () => Promise.resolve(true) }
  }, mounted() {}, render: h => h('div') }).$mount()
  page.loadedOrderId = '31'
  assert.equal(page.canRenewDeliveryTracking, true)
  const pending = page.renewTracking()
  rows = [{ id: 33, shopid: 7, delivery_id: '42', fulfillment_type: 'delivery' }]
  await page.loadOrderDetail('33')
  complete({ ok: true, json: () => Promise.resolve({ data: { trackingUrl: '/livraison/suivi#' + token } }) })
  await pending
  assert.equal(page.trackingUrl === null, true, 'A previous order link must never appear on the new order')
  state.users.user.shopid = 8
  await Vue.nextTick()
  assert.equal(page.canRenewDeliveryTracking, false)
  page.$destroy()
  delete global.localStorage
})
