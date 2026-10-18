/* eslint-disable no-console, vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const { test } = require('node:test')
require('axios/lib/adapters/xhr')
class MemoryNode {
  constructor(tag, type = 1, text = '') { this.tagName = tag && tag.toUpperCase(); this.nodeType = type; this.data = text; this.childNodes = []; this.parentNode = null; this.attrs = {}; this.style = { setProperty() {} } }
  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) { if (node.parentNode) node.parentNode.removeChild(node); const index = this.childNodes.indexOf(before); if (index < 0) this.childNodes.push(node); else this.childNodes.splice(index, 0, node); node.parentNode = this; return node }
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
const listeners = new Set()
global.window = { navigator: { userAgent: 'tracking-test' }, addEventListener() {}, removeEventListener() {} }
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
  let staticRenderFns
  if (filename.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    const compiled = compiler.compile(sfc.template.content)
    assert.deepEqual(compiled.errors, [])
    render = vm.compileFunction(compiled.render)
    staticRenderFns = compiled.staticRenderFns.map(code => vm.compileFunction(code))
    source = sfc.script.content
  }
  const module = { exports: {} }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  vm.compileFunction(code, ['module', 'exports', 'require', 'setTimeout', 'clearTimeout'])(module, module.exports,
    name => globals.imports && globals.imports[name] || (name.startsWith('@/') ? load(name.slice(2), globals) : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name)), globals.setTimeout || setTimeout, globals.clearTimeout || clearTimeout)
  if (render) Object.assign(module.exports.default, { render, staticRenderFns })
  return module.exports
}
const drain = async () => { for (let i = 0; i < 15; i++) { await Promise.resolve(); await Vue.nextTick() } }
const token = 'a'.repeat(43)
process.env.privateURL = 'http://127.0.0.1:6024'

const deferred = () => {
  let complete; let fail
  const promise = new Promise((resolve, reject) => { complete = resolve; fail = reject })
  return { promise, resolve: complete, reject: fail }
}
const deliveryParams = () => ({ fulfillmentType: 'delivery', servicePointId: 70, total: 12.5,
  dataCart: [{ id: 21, qty: 1, price: 12.5, subtotal: 12.5 }], deliveryQuoteToken: 'quote',
  addressResolutionToken: 'address', customer: 'Guest', payment: 'Paiement a la livraison' })
const checkoutData = id => ({ orderId: id, delivery: { id: String(id + 10) }, tracking_url: '/livraison/suivi#' + token })
function trackingFixture() {
  const Vuex = require('vuex'); Vue.use(Vuex)
  if (!global.crypto) global.crypto = require('crypto').webcrypto
  global.localStorage = { getItem: key => ({ shopid: '7', access: '1', token: 'fixture-bearer' }[key] || null), setItem() {} }
  const cart = load('store/cart.js'); const delivery = load('store/delivery.js')
  const calls = []
  const fetch = (url, options) => {
    const pending = deferred()
    calls.push({ url, options, body: JSON.parse(options.body), ...pending })
    return pending.promise.then(data => ({ ok: true, status: 200, headers: new Map(),
      json: () => Promise.resolve({ data }), text: () => Promise.resolve(JSON.stringify({ data })) }))
  }
  window.fetch = fetch
  const store = new Vuex.Store({ state: { staticURL: 'http://fixture.invalid' }, modules: {
    cart: { ...cart, namespaced: true, state: cart.state() },
    delivery: { ...delivery, state: delivery.state() },
    users: { namespaced: true, state: { user: { shopid: 7, id: null, session_subject: 'service_point', order_source: 'pos' } } },
    customer: { namespaced: true, state: { shopId: 7, session: null } },
    shop: { namespaced: true, state: {}, actions: { getCurrentShopInfo() {} } },
    orderEdit: { namespaced: true, state: { active: false } },
    servicePoints: { namespaced: true, state: { items: [] }, actions: { getAll() {} } },
    notifications: { namespaced: true, actions: { success() {} } },
  }, plugins: [require('vuex-easy-access').default()] })
  store.$deliveryApi = delivery.buildDeliveryApi({ baseURL: 'http://fixture.invalid', fetch })
  const checkout = async (id = 31) => {
    const result = store.dispatch('cart/checkoutOrder', deliveryParams())
    await drain()
    calls[calls.length - 1].resolve(checkoutData(id))
    return (await result).data
  }
  return { store, calls, checkout }
}
async function mountTrackingCart(f) {
  const leaf = { functional: true, render: (h, context) => h('div', context.children) }
  const imports = Object.fromEntries(['@/components/loading', '@/components/products/ProductCustomizationWizard',
    '@/components/products/CustomizationSummary'].map(name => [name, leaf]))
  imports['@stripe/stripe-js'] = { loadStripe() { throw new Error('Unexpected provider call') } }
  const options = load('pages/cart.vue', { imports }).default
  const source = fs.readFileSync(path.join(__dirname, '../pages/cart.vue'), 'utf8')
  const components = { ...options.components, DeliveryCheckout: leaf,
    ...Object.fromEntries([...new Set(source.match(/v-[a-z-]+/g))].map(tag => [tag, leaf])) }
  const page = new Vue({ ...options, components, store: f.store, beforeCreate() { this.$router = { push() {} } } }).$mount()
  page.fulfillmentType = 'delivery'
  await drain()
  return page
}

test('I1 deferred checkout never adopts a late proof/link after shop, attempt or cart-state replacement', async () => {
  for (const replace of [
    f => { f.store.state.users.user.shopid = 8 },
    f => { f.store.state.users.user.shopid = 8; f.store.state.users.user.shopid = 7 },
    f => { f.store.dispatch('cart/set/clientOrderToken', 'new-attempt') },
    f => { f.store.dispatch('cart/set/clientOrderPayload', { ...f.store.state.cart.clientOrderPayload }) },
    f => { f.store.replaceState({ ...f.store.state, cart: { ...f.store.state.cart } }) },
  ]) {
    const f = trackingFixture()
    const pending = f.store.dispatch('cart/checkoutOrder', deliveryParams())
    await drain()
    const original = f.calls[0]
    const page = await mountTrackingCart(f)
    replace(f)
    original.resolve(checkoutData(31))
    const result = await pending
    assert.equal(result.ok, true, 'Financial checkout success remains a success')
    assert.equal(result.data.orderId, 31)
    assert.equal(Boolean(result.data.tracking_url), false, 'Late tracking result is discarded')
    assert.equal(await f.store.dispatch('cart/hasDeliveryTrackingConfirmation'), false)
    await page.finishDeliveryCheckout(result.data)
    assert.equal(page.deliveryTrackingUrl === null, true)
    assert.equal(page.deliveryTrackingRecovery, false)
    page.$destroy()
  }
})

test('I1 mounted cart ignores stale rotation success/error/finally while the new same-shop confirmation is busy', async () => {
  for (const failure of [false, true]) {
    const f = trackingFixture()
    const page = await mountTrackingCart(f)
    const original = await f.checkout()
    await page.finishDeliveryCheckout(original)
    page.deliveryTrackingUrl = null
    const old = page.renewDeliveryTracking()
    await drain()
    const oldCall = f.calls[f.calls.length - 1]
    await page.finishDeliveryCheckout(await f.checkout(32))
    page.deliveryTrackingUrl = null
    const current = page.renewDeliveryTracking()
    await drain()
    const currentCall = f.calls[f.calls.length - 1]
    assert.notEqual(currentCall, oldCall, 'New confirmation can issue its own renewal')
    await page.finishDeliveryCheckout(original)
    assert.equal(page.deliveryTrackingBusy, true, 'An obsolete publication cannot supersede the current renewal')
    if (failure) oldCall.reject(new Error('Lost old result'))
    else oldCall.resolve({ trackingUrl: '/livraison/suivi#' + token })
    await old
    assert.equal(page.deliveryTrackingUrl === null, true)
    assert.equal(page.checkoutErrorMessage, '')
    assert.equal(page.deliveryTrackingError || '', '')
    assert.equal(page.deliveryTrackingBusy, true, 'Old finally cannot clear the current request')
    currentCall.resolve({ trackingUrl: '/livraison/suivi#' + 'b'.repeat(43) })
    await current
    assert.equal(page.deliveryTrackingBusy, false)
    assert.equal(Boolean(page.deliveryTrackingUrl && page.deliveryTrackingUrl.endsWith('b'.repeat(43))), true)
    page.$destroy()
  }
})

test('I1 rotations validate current shop/attempt after HTTP and a destroyed page cannot publish to its replacement', async () => {
  for (const change of ['shop', 'attempt', 'destroy', 'state']) {
    const f = trackingFixture()
    const page = await mountTrackingCart(f)
    const data = await f.checkout()
    await page.finishDeliveryCheckout(data)
    page.deliveryTrackingUrl = null
    const pending = page.renewDeliveryTracking()
    await drain()
    const call = f.calls[f.calls.length - 1]
    let replacement
    if (change === 'shop') f.store.state.users.user.shopid = 8
    if (change === 'attempt') await f.store.dispatch('cart/set/clientOrderToken', 'another-checkout')
    if (change === 'state') f.store.replaceState({ ...f.store.state, cart: { ...f.store.state.cart } })
    if (change === 'destroy') { page.$destroy(); replacement = await mountTrackingCart(f) }
    await drain()
    call.resolve({ trackingUrl: '/livraison/suivi#' + token })
    await pending
    assert.equal(page.deliveryTrackingUrl === null, true, change)
    assert.equal(page.checkoutErrorMessage, '', change)
    assert.equal(page.deliveryTrackingBusy, false, change)
    if (replacement) { assert.equal(replacement.deliveryTrackingUrl === null, true); replacement.$destroy() }
    else page.$destroy()
  }
})

test('I1 actual Vuex rotation refuses an old saved confirmation before sending and discards late HTTP results', async () => {
  for (const replace of [
    f => { f.store.state.users.user.shopid = 8 },
    async f => { await f.store.dispatch('cart/set/clientOrderToken', 'new-checkout') },
    async f => { await f.checkout(32) },
  ]) {
    const f = trackingFixture()
    const data = await f.checkout()
    const context = await f.store.dispatch('cart/deliveryTrackingContext', data)
    const pending = f.store.dispatch('cart/rotateDeliveryTracking', context.confirmationId)
    await drain()
    const call = f.calls[f.calls.length - 1]
    await replace(f)
    call.resolve({ trackingUrl: '/livraison/suivi#' + token })
    const result = await pending
    assert.equal(result.discarded, true)
    assert.equal(Boolean(result.trackingUrl), false)
    const before = f.calls.length
    await assert.rejects(f.store.dispatch('cart/rotateDeliveryTracking', context.confirmationId), /Confirmation privee indisponible/)
    assert.equal(f.calls.length, before, 'Old proof cannot start another HTTP request')
  }
})

test('I1 compiled cart publication checks result identity, latest request and component liveness after await', async () => {
  const f = trackingFixture()
  const page = await mountTrackingCart(f)
  const old = await f.checkout()
  const current = await f.checkout(32)
  await page.finishDeliveryCheckout(current)
  page.deliveryTrackingUrl = null
  await page.finishDeliveryCheckout(old)
  assert.equal(page.deliveryTrackingUrl === null, true, 'Old same-shop result is not relabelled with the new proof')
  const first = page.publishDeliveryTracking(current)
  const second = page.publishDeliveryTracking(current)
  assert.equal(await first, false, 'Only the latest publication may update the view')
  assert.equal(await second, true)
  page.deliveryTrackingUrl = null
  const destroyed = page.publishDeliveryTracking(current)
  page.$destroy()
  const replacement = await mountTrackingCart(f)
  assert.equal(await destroyed, false)
  assert.equal(page.deliveryTrackingUrl === null, true)
  assert.equal(replacement.deliveryTrackingUrl === null, true)
  replacement.$destroy()
})

test('I1 current confirmation retains exact rotation key after a lost HTTP result and ordinary exact checkout replay', async () => {
  const f = trackingFixture()
  const pending = f.store.dispatch('cart/checkoutOrder', deliveryParams())
  await drain()
  const original = f.calls[0]
  original.reject(new Error('Lost checkout result'))
  assert.equal((await pending).ok, false)
  const retry = f.store.dispatch('cart/retryCheckout')
  await drain()
  const replay = f.calls[1]
  assert.equal(replay.options.body === original.options.body, true)
  assert.equal(replay.options.credentials, 'omit')
  replay.resolve(checkoutData(31))
  const result = await retry
  const page = await mountTrackingCart(f)
  await page.finishDeliveryCheckout(result.data)
  assert.equal(page.deliveryTrackingUrl === result.data.tracking_url, true)
  page.deliveryTrackingUrl = null
  const failed = page.renewDeliveryTracking()
  await drain()
  const first = f.calls[2]
  first.reject(new Error('Lost rotation result'))
  await failed
  const recovery = page.renewDeliveryTracking()
  await drain()
  const second = f.calls[3]
  assert.equal(second.options.body === first.options.body, true)
  assert.equal(second.body.privateCheckoutContext.confirmationSecret === original.body.delivery_confirmation_secret, true)
  assert.equal(JSON.stringify(f.store.state).includes(original.body.delivery_confirmation_secret), false)
  assert.equal(second.options.headers.Authorization, undefined)
  assert.equal(second.options.credentials, 'omit')
  second.resolve({ trackingUrl: null, idempotentReplay: true })
  await recovery
  const fresh = page.renewDeliveryTracking()
  await drain()
  assert.notEqual(f.calls[4].body.idempotencyKey, second.body.idempotencyKey)
  f.calls[4].resolve({ trackingUrl: '/livraison/suivi#' + token })
  await fresh
  assert.equal(page.deliveryTrackingUrl === '/livraison/suivi#' + token, true)
  page.$destroy()
})
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
