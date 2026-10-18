/* eslint-disable no-console, vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
const Vue = require('vue')
const Vuex = require('vuex')
const compiler = require('vue-template-compiler')
const axios = require('axios')
const settle = require('axios/lib/core/settle')
if (!global.crypto) global.crypto = require('crypto').webcrypto
Vue.use(Vuex)
Vue.config.productionTip = false
Vue.config.devtools = false
const root = path.resolve(__dirname, '..')
const copy = value => JSON.parse(JSON.stringify(value))
const storage = { token: 'existing-staff-bearer', shopid: '7', access: '1' }
global.localStorage = { getItem: key => storage[key] || null, setItem: (key, value) => { storage[key] = value } }
function load(relative, globals = {}) {
  let filename = path.join(root, relative)
  if (!fs.existsSync(filename)) filename += fs.existsSync(`${filename}.vue`) ? '.vue' : '.js'
  let source = fs.readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    if (sfc.template) assert.deepEqual(compiler.compile(sfc.template.content).errors, [])
    source = sfc.script ? sfc.script.content : 'export default {}'
  }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require', 'crypto', 'setTimeout', 'clearTimeout', 'process'])(module, module.exports,
    name => name.startsWith('@/') ? load(name.slice(2)) : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name),
    require('crypto').webcrypto, globals.setTimeout || setTimeout, globals.clearTimeout || clearTimeout, process)
  return module.exports
}
const cart = [{ id: 21, qty: 1, price: 25, subtotal: 25, selectedChoiceIds: [] }]
const postal = { street: '7 rue Test', postalCode: '75001', city: 'Paris', country: 'FR' }
const proof = suffix => ({ addressResolutionToken: `proof-${suffix}`, expiresAt: '2099-01-01T00:00:00Z', addressSnapshot: { ...postal, latitude: 48.857, longitude: 2.353 } })
const quote = (fee = 0, discount = 0) => ({ shopId: 7, settingsRevision: 1, ...proof('one'), itemsTotalCents: 2500, itemsDiscountCents: discount,
  itemsNetCents: 2500 - discount, deliveryFeeCents: fee, grandTotalCents: 2500 - discount + fee, quoteToken: `quote-${fee}-${discount}`, expiresAt: '2099-01-01T00:00:00Z' })
const personal = { subject: 'customer', shopId: 7, customerId: '9007199254740993', csrfToken: 'a'.repeat(64), expiresAt: '2099-01-01T00:00:00Z' }
function fixture(reply = () => null) {
  const calls = []
  const adapter = async config => {
    const call = { path: config.url, method: config.method, body: config.data && JSON.parse(config.data), headers: copy(config.headers), credentials: config.withCredentials, params: config.params }
    calls.push(call)
    const result = await reply(call) || { data: call.path.endsWith('/availability') ? { enabled: true } : call.path.endsWith('/quotes') ? quote() : proof('one') }
    if (result.lost) throw new Error('Lost HTTP response')
    return new Promise((resolve, reject) => settle(resolve, reject, {
      config, status: result.status || 200, headers: {}, data: JSON.stringify({ success: !result.status, data: result.data, error: result.code, message: result.message || 'Fixture' }),
    }))
  }
  const delivery = load('store/delivery.js')
  const cartModule = load('store/cart.js')
  const customer = load('store/customer.js')
  const easy = require('vuex-easy-access').default
  const store = new Vuex.Store({ modules: {
    delivery: { ...delivery, state: delivery.state() },
    customer: { ...customer, state: customer.state() },
    cart: { ...cartModule, namespaced: true, state: cartModule.state() },
    users: { namespaced: true, state: { user: { shopid: 7, session_subject: 'staff', order_source: 'pos' } } },
    shop: { namespaced: true, state: { shop_name: 'Staff shop' }, actions: { getCurrentShopInfo() {} } },
    orderEdit: { namespaced: true, state: { active: false } },
    servicePoints: { namespaced: true, state: { items: [] }, actions: { getAll() {} } },
    products: { namespaced: true, state: { dataProduct: [] } },
    notifications: { namespaced: true, actions: { success() {} } },
  }, plugins: [easy()] })
  store.$deliveryApi = delivery.buildDeliveryApi({ baseURL: 'http://fixture.invalid', adapter })
  store.$axios = axios.create({ adapter })
  const dispatch = (name, payload) => store.dispatch(`delivery/${name}`, payload)
  const component = (propsData = {}) => new Vue({ ...load('components/delivery/DeliveryCheckout.vue').default, store, propsData: { shopId: 7, cart, ...propsData } })
  return { store, calls, dispatch, component }
}

test('server availability is a safe projection and stale shop replies cannot restore delivery', async () => {
  let finish
  const f = fixture(call => call.path.endsWith('/availability') ? new Promise(resolve => { finish = resolve }) : null)
  await f.dispatch('resetForShop', 7)
  const pending = f.dispatch('loadSettings')
  await Promise.resolve()
  await f.dispatch('resetForShop', 8)
  finish({ data: { enabled: true, origin: 'private' } })
  await pending
  assert.equal(f.store.state.delivery.shopId, 8)
  assert.equal(f.store.state.delivery.enabled, false)
})

test('quote posts product intent and signed address only; POS/site use the same server cents', async () => {
  const f = fixture()
  await f.dispatch('resetForShop', 7)
  await f.dispatch('loadSettings')
  const input = { cart, resolution: proof('one'), discount: { type: 'none', value: 0 } }
  const pos = await f.dispatch('quote', input)
  const site = await f.dispatch('quote', input)
  assert.equal(pos.grandTotalCents, 2500)
  assert.equal(site.grandTotalCents, pos.grandTotalCents)
  const call = f.calls.find(call => call.path.endsWith('/quotes'))
  assert.deepEqual(call.body, { items: [{ product_id: 21, quantity: 1, selected_product_step_choice_ids: [] }], address_resolution_token: 'proof-one', discount: { type: 'none', value: 0 } })
  assert.equal(call.credentials, false)
  assert.equal(call.headers['X-CSRF-Token'], undefined)
})

test('shared resolver adapts candidate_id, filters private fields, and keeps selected candidate for fresh proof', async () => {
  const f = fixture()
  await f.dispatch('resetForShop', 7)
  let timer
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue', { setTimeout: fn => { timer = fn; return 1 }, clearTimeout() {} }).default,
    propsData: { contextKey: '7', resolver: payload => f.dispatch('resolveAddress', payload) } })
  try {
    Object.assign(input.draft, postal, { instructions: 'Private door', complement: 'Flat 2' })
    await Vue.nextTick()
    await input.chooseCandidate({ providerId: 'candidate-2' })
    input.draft.instructions = 'Private changed'
    await Vue.nextTick()
    await timer()
    assert.equal(f.calls.length, 2)
    for (const call of f.calls) assert.deepEqual(call.body, { address: postal, candidate_id: 'candidate-2' })
    assert.equal(input.resolution.instructions, 'Private changed')
  } finally { input.$destroy() }
})

test('slow Address 1 cannot replace Address 2 and debounce remains 300ms', async () => {
  let finish
  let delay
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue', { setTimeout: (fn, ms) => { delay = ms; return 1 }, clearTimeout() {} }).default,
    propsData: { resolver: body => body.address.street === postal.street ? new Promise(resolve => { finish = resolve }) : Promise.resolve(proof('two')) } })
  try {
    Object.assign(input.draft, postal)
    await Vue.nextTick()
    assert.equal(delay, 300)
    const one = input.resolve()
    input.draft.street = '8 rue Test'
    await Vue.nextTick()
    await input.resolve()
    finish(proof('one'))
    await one
    assert.equal(input.resolution.addressResolutionToken, 'proof-two')
  } finally { input.$destroy() }
})

test('personal stored address uses exact addressId and fresh customer proof; staff uses owned adapter without IGN', async () => {
  const f = fixture()
  await f.dispatch('resetForShop', 7)
  const personalCalls = []
  f.store.$customerApi = { request: request => { personalCalls.push(request); return Promise.resolve(proof('fresh')) } }
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', personal)
  await f.dispatch('resolveAddress', { addressId: '9007199254740995', latitude: 0, instructions: 'Private' })
  assert.deepEqual(personalCalls[0].body, { addressId: '9007199254740995' })
  assert.equal(f.calls.length, 0)
  f.store.commit('customer/PRIVATE_RESET')
  await f.dispatch('resolveAddress', { addressId: '9007199254740995', customerId: '51' })
  assert.match(f.calls[0].path, /\/delivery\/customers\/51\/addresses\/9007199254740995\/resolve$/)
  assert.deepEqual(f.calls[0].body, {})
})

test('R3 one cent discount requires explicit new quote confirmation and blocks old Pay', async () => {
  const f = fixture(call => call.path.endsWith('/quotes') ? { data: call.body.discount.value ? quote(400, 1) : quote() } : null)
  await f.dispatch('resetForShop', 7)
  await f.dispatch('loadSettings')
  const checkout = f.component({ value: 'delivery' })
  try {
    await checkout.onResolved(proof('one'))
    assert.equal(checkout.ready, false)
    checkout.confirmQuote()
    assert.equal(checkout.ready, true)
    checkout.discount = { type: 'amount', value: 0.01 }
    await Vue.nextTick()
    await checkout.refreshQuote()
    assert.equal(checkout.currentQuote.grandTotalCents, 2899)
    assert.equal(checkout.ready, false)
    assert.equal(f.calls.filter(call => /checkout|payment-intents/.test(call.path)).length, 0)
    checkout.confirmQuote()
    assert.equal(checkout.ready, true)
  } finally { checkout.$destroy() }
})

test('lost response retry preserves exact proof/secret/key and rejects refresh or changed address under old key', async () => {
  let lost = true
  const f = fixture(call => /orders\/checkout/.test(call.path) ? lost ? { lost: true } : { data: { orderId: 91 } } : null)
  const params = { customer: 'Guest', phone: '0700000000', servicePointId: 70, total: 29, payment: 'cash', dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'quote-original', addressResolutionToken: 'proof-original', deliveryDetails: { instructions: 'Private original' } }
  assert.equal((await f.store.dispatch('cart/checkoutOrder', params)).ok, false)
  const original = copy(f.calls[0].body)
  assert.equal(original.fulfillment_type, 'delivery')
  assert.match(original.delivery_confirmation_secret, /^[a-f0-9]{64}$/)
  const pending = copy(f.store.state.cart.clientOrderPayload)
  const changed = await f.store.dispatch('cart/checkoutOrder', { ...params, addressResolutionToken: 'proof-refreshed' })
  assert.equal(changed.error.code, 'CHECKOUT_ATTEMPT_UNRESOLVED')
  assert.deepEqual(copy(f.store.state.cart.clientOrderPayload), pending)
  assert.equal(f.calls.length, 1)
  lost = false
  const retried = await f.store.dispatch('cart/retryCheckout')
  assert.equal(retried.ok, true)
  assert.deepEqual(f.calls[1].body, original)
  assert.equal(f.calls.length, 2)
})

test('delivery quote changed is prewrite reprice, never uncertain/new payment; only confirmation replaces proofs', async () => {
  const f = fixture(call => /orders\/checkout/.test(call.path) ? { status: 409, data: { code: 'DELIVERY_QUOTE_CHANGED', server_quote: quote(400, 1) } } : null)
  const result = await f.store.dispatch('cart/checkoutOrder', { customer: 'Guest', total: 25, payment: 'cash', dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'old', addressResolutionToken: 'proof-one' })
  assert.equal(result.error.code, 'DELIVERY_QUOTE_CHANGED')
  assert.equal(f.store.state.cart.clientOrderStatus, 'reprice_required')
})

test('identity checkout carries only matching credential/CSRF and customer401 never invokes staff interceptor', async () => {
  const f = fixture(call => /orders\/checkout/.test(call.path) ? { status: 401, code: 'CUSTOMER_SESSION_INVALID' } : null)
  let staffLogout = 0
  f.store.$axios.interceptors.response.use(null, error => { staffLogout++; return Promise.reject(error) })
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', personal)
  const before = JSON.stringify({ storage, users: f.store.state.users, shop: f.store.state.shop })
  await f.store.dispatch('cart/checkoutOrder', { customer: 'Personal', total: 25, payment: 'cash', dataCart: cart, customerSession: personal,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'quote', addressResolutionToken: 'proof' })
  assert.equal(f.calls[0].credentials, true)
  assert.equal(f.calls[0].headers['X-CSRF-Token'], personal.csrfToken)
  assert.equal(f.calls[0].headers.Authorization, 'Bearer existing-staff-bearer')
  assert.equal(f.calls[0].body.customer_account_id, undefined)
  assert.equal(staffLogout, 0)
  assert.equal(JSON.stringify({ storage, users: f.store.state.users, shop: f.store.state.shop }), before)
})

test('actual cart page blocks old Pay and builds the server total including fee exactly once', async () => {
  const f = fixture()
  const page = new Vue({ ...load('pages/cart.vue').default, store: f.store })
  try {
    page.isValue = true
    page.fulfillmentType = 'delivery'
    page.deliveryQuote = quote(400, 1)
    page.deliveryResolution = proof('one')
    page.deliveryConfirmed = false
    page.total = 28.99
    assert.equal(page.primaryActionDisabled, true)
    await page.paymentBtn()
    assert.equal(f.calls.length, 0)
    const payload = page.buildOrderPayload('cash', false)
    assert.equal(payload.fulfillmentType, 'delivery')
    assert.equal(payload.total, 28.99)
    assert.equal(payload.addressResolutionToken, 'proof-one')
    assert.equal(payload.deliveryQuoteToken, 'quote-400-1')
  } finally { page.$destroy() }
})

test('after server reprice the real cart allows explicit confirmation with the new proofs', async () => {
  const f = fixture()
  const page = new Vue({ ...load('pages/cart.vue').default, store: f.store })
  try {
    page.fulfillmentType = 'delivery'
    page.deliveryConfirmed = true
    page.deliveryQuote = quote(400, 1)
    page.deliveryResolution = proof('one')
    page.isValue = true
    await f.store.dispatch('cart/set/clientOrderStatus', 'reprice_required')
    await f.store.dispatch('cart/set/clientOrderSignature', 'old-accepted-display')
    await Vue.nextTick()
    page.deliveryConfirmed = true
    assert.equal(page.checkoutPayloadCanStart, true)
    assert.equal(page.buildOrderPayload('cash', false).repriceConfirmation, true)
  } finally { page.$destroy() }
})

test('unresolved recovery restores original address and discount without refresh and forbids silent replacement', async () => {
  const f = fixture(() => ({ lost: true }))
  const params = { customer: 'Guest', phone: '0700000000', servicePointId: 70, total: 28.99, payment: 'cash', dataCart: cart,
    discountType: 'amount', discountValue: 0.01, isTakeaway: true,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'original-quote', addressResolutionToken: 'original-proof',
    deliveryDetails: { complement: 'Flat 2', instructions: 'Original door' }, deliveryAddressSnapshot: postal }
  await f.store.dispatch('cart/checkoutOrder', params)
  const original = copy(f.store.state.cart.clientOrderPayload)
  const page = new Vue({ ...load('pages/cart.vue').default, store: f.store })
  try {
    await page.restoreCheckoutFromStore()
    assert.equal(page.deliveryAttemptLocked, true)
    assert.equal(page.buildOrderPayload('cash', false).discountValue, 0.01)
    assert.equal(page.buildOrderPayload('cash', false).deliveryDetails.instructions, 'Original door')
    assert.equal(page.pendingDeliveryAddress, '7 rue Test, 75001, Paris')
    assert.equal(await page.resetCheckoutAttempt(), false)
    assert.deepEqual(copy(f.store.state.cart.clientOrderPayload), original)
    assert.equal(f.calls.length, 1)
  } finally { page.$destroy() }
})

test('site excludes dine-in and suspension never switches a delivery selection or erases cart', async () => {
  const f = fixture(() => ({ data: { enabled: false } }))
  await f.dispatch('resetForShop', 7)
  const checkout = f.component({ site: true, value: 'delivery' })
  const inputs = []
  checkout.$on('input', value => inputs.push(value))
  try {
    await f.dispatch('loadSettings')
    assert.equal(checkout.ready, false)
    assert.equal(checkout.value, 'delivery')
    assert(!checkout.modes.some(mode => mode.value === 'dine_in'))
    checkout.selectMode('dine_in')
    assert.deepEqual(inputs, [])
    assert.deepEqual(copy(checkout.cart), copy(cart))
  } finally { checkout.$destroy() }
})

test('guest transport omits cookies even on same origin while personal transport includes them', async () => {
  const requests = []
  const delivery = load('store/delivery.js')
  const api = delivery.buildDeliveryApi({ baseURL: 'https://same-origin.test', fetch: (url, options) => {
    requests.push({ url, ...options })
    return { status: 200, statusText: 'OK', headers: new Map(), text: () => Promise.resolve('{"success":true,"data":{}}') }
  } })
  await api.request({ method: 'post', path: '/orders/checkout', body: {} })
  await api.request({ method: 'post', path: '/orders/checkout', body: {}, credentials: true, csrfToken: personal.csrfToken })
  assert.deepEqual(requests.map(request => request.credentials), ['omit', 'include'])
})

test('delivery discount precision remains server-owned', async () => {
  const f = fixture(() => ({ lost: true }))
  await f.store.dispatch('cart/checkoutOrder', { customer: 'Guest', total: 27.99, payment: 'cash', dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'quote', addressResolutionToken: 'proof', discountType: 'amount', discountValue: '1.005' })
  assert.equal(f.calls[0].body.discount_value, '1.005')
})

test('frozen-attempt mounting never clears proofs or requests quote/address', async () => {
  const f = fixture()
  const checkout = f.component({ value: 'delivery', locked: true })
  const events = []
  checkout.$on('quote', quote => events.push(quote))
  try {
    await checkout.openShop()
    assert.deepEqual(events, [])
    assert.equal(f.calls.length, 0)
  } finally { checkout.$destroy() }
})

test('actual cashier service entry routes its existing cart to common checkout without customer/bootstrap actions', async () => {
  const f = fixture()
  const options = load('pages/caisse/menu.vue').default
  const cashier = new Vue({ ...options, store: f.store })
  const routes = []
  cashier.$router = { push: route => routes.push(route) }
  try {
    f.store.commit('delivery/AVAILABILITY', true)
    cashier.cartItem = copy(cart)
    cashier.expressCustomer = 'Customer at counter'
    cashier.expressPhone = '0700000000'
    cashier.expressDiscountType = 'amount'
    cashier.expressDiscountValue = 0.01
    await cashier.openExpressServiceDialog()
    assert.deepEqual(routes, ['/cart'])
    assert.equal(f.store.state.delivery.discount.value, 0.01)
    assert.equal(f.store.state.delivery.posDraft.customer, 'Customer at counter')
    assert.equal(f.calls.length, 0)
  } finally { cashier.$destroy() }
})

test('cashier can explicitly collect delivery using the existing counter-paid mode without changing the fee', () => {
  const f = fixture()
  const page = new Vue({ ...load('pages/cart.vue').default, store: f.store })
  try {
    page.fulfillmentType = 'delivery'
    page.deliverySettlement = 'counter'
    page.formuser.payment = 'Especes'
    page.total = 29
    const payload = page.buildOrderPayload('Especes', false)
    assert.equal(payload.payment, 'counter_pay_before:Especes')
    assert.equal(payload.total, 29)
  } finally { page.$destroy() }
})

test('already-processed delivery without authoritative resolution keeps original pending recovery', async () => {
  const f = fixture(() => ({ status: 409, message: 'Cette commande a deja ete traitee.', data: { orderId: 91, code: 'DELIVERY_PAYMENT_NOT_SETTLED' } }))
  const result = await f.store.dispatch('cart/checkoutOrder', { customer: 'Guest', total: 25, payment: 'Stripe', stripe: true, dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'original-quote', addressResolutionToken: 'original-proof' })
  assert.equal(result.ok, false)
  assert.ok(f.store.state.cart.clientOrderToken)
  assert.equal(f.store.state.cart.clientOrderPayload.delivery_quote_token, 'original-quote')
})

test('current settled commercial response explicitly resolves delivery and cannot prepare another payment', async () => {
  const f = fixture(() => ({ status: 409, message: 'Cette commande a deja ete traitee.', data: { orderId: 91, code: 'DELIVERY_PAYMENT_NOT_SETTLED', payment_status: 'paid', checkout_resolved: true } }))
  const result = await f.store.dispatch('cart/checkoutOrder', { customer: 'Guest', total: 25, payment: 'Stripe', stripe: true, dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'original-quote', addressResolutionToken: 'original-proof' })
  assert.equal(result.ok, true)
  assert.equal(result.data.checkout_resolved, true)
  assert.equal(result.data.payment_status, 'paid')
  assert.equal(f.store.state.cart.clientOrderToken, null)
  assert.equal(f.calls.length, 1)
})

test('staff owned-address adapter remains bearer-scoped with a same-shop personal cookie account in memory', async () => {
  const f = fixture()
  await f.dispatch('resetForShop', 7)
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', personal)
  let personalRequests = 0
  f.store.$customerApi = { request: () => { personalRequests++; return Promise.resolve(proof('personal')) } }
  await f.dispatch('resolveAddress', { addressId: '9007199254740995', customerId: '51', personal: false })
  await f.dispatch('resolveAddress', { address: postal, personal: false })
  assert.equal(personalRequests, 0)
  assert.match(f.calls[0].path, /\/customers\/51\/addresses\/9007199254740995\/resolve$/)
  assert.equal(f.calls[1].path, '/baseurl/api/v1/delivery/address-resolutions')
  assert(f.calls.every(call => call.credentials === false))
})

test('explicit switch from delivery to takeaway retains matching customer CSRF context on existing site checkout', () => {
  const f = fixture()
  f.store.state.users.user.order_source = 'web'
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', personal)
  const page = new Vue({ ...load('pages/cart.vue').default, store: f.store })
  try {
    page.fulfillmentType = 'takeaway'
    const payload = page.buildOrderPayload('cash', false)
    assert.equal(payload.customerSession.customerId, personal.customerId)
    assert.equal(payload.customerSession.csrfToken, personal.csrfToken)
    assert.equal(payload.fulfillmentType, 'takeaway')
    assert.equal(payload.deliveryQuoteToken, undefined)
  } finally { page.$destroy() }
})

test('common checkout consumes cashier draft once so a later order cannot reuse its previous customer', async () => {
  const f = fixture()
  f.store.commit('delivery/POS_DRAFT', { customer: 'Current counter customer', phone: '0700000000', remark: '', isTakeaway: false, servicePointId: 70 })
  await f.store.dispatch('cart/setTocart', cart)
  const page = new Vue({ ...load('pages/cart.vue').default, store: f.store })
  try {
    for (const hook of page.$options.mounted) await hook.call(page)
    assert.equal(page.formuser.customer, 'Current counter customer')
    assert.equal(f.store.state.delivery.posDraft, null)
  } finally { page.$destroy() }
})
