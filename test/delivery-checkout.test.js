/* eslint-disable no-console, vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
require('axios/lib/adapters/xhr')

// Use Vue's real DOM patcher/lifecycle with the existing account-test memory boundary.
class MemoryNode {
  constructor(tag, type = 1, text = '') {
    this.tagName = tag && tag.toUpperCase()
    this.nodeType = type
    this.data = text
    this.childNodes = []
    this.parentNode = null
    this.attrs = {}
    this.style = { setProperty() {} }
  }

  appendChild(node) { return this.insertBefore(node, null) }
  insertBefore(node, before) {
    if (node.parentNode) node.parentNode.removeChild(node)
    const index = before ? this.childNodes.indexOf(before) : -1
    if (index < 0) this.childNodes.push(node)
    else this.childNodes.splice(index, 0, node)
    node.parentNode = this
    return node
  }

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
global.window = { navigator: { userAgent: 'node-delivery-test' }, addEventListener() {}, removeEventListener() {} }
global.document = {
  createElement: tag => new MemoryNode(tag),
  createElementNS: (ns, tag) => new MemoryNode(tag),
  createTextNode: text => new MemoryNode(null, 3, text),
  createComment: text => new MemoryNode(null, 8, text),
  createEvent: () => ({ timeStamp: Date.now() }),
}
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
    name => globals.imports && globals.imports[name] || (name === '@stripe/stripe-js'
      ? { loadStripe() { throw new Error('A local Stripe UI double is required in this test') } }
      : name.startsWith('@/') ? load(name.slice(2), globals) : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name)),
    require('crypto').webcrypto, globals.setTimeout || setTimeout, globals.clearTimeout || clearTimeout, process)
  return module.exports
}
const cart = [{ id: 21, qty: 1, price: 25, subtotal: 25, selectedChoiceIds: [] }]
const postal = { street: '7 rue Test', postalCode: '75001', city: 'Paris', country: 'FR' }
const proof = suffix => ({ addressResolutionToken: `proof-${suffix}`, expiresAt: '2099-01-01T00:00:00Z', addressSnapshot: { ...postal, latitude: 48.857, longitude: 2.353 } })
const quote = (fee = 0, discount = 0) => ({ shopId: 7, settingsRevision: 1, ...proof('one'), itemsTotalCents: 2500, itemsDiscountCents: discount,
  itemsNetCents: 2500 - discount, deliveryFeeCents: fee, grandTotalCents: 2500 - discount + fee, quoteToken: `quote-${fee}-${discount}`, expiresAt: '2099-01-01T00:00:00Z' })
const personal = { subject: 'customer', shopId: 7, customerId: '9007199254740993', csrfToken: 'a'.repeat(64), expiresAt: '2099-01-01T00:00:00Z' }
function fixture(reply = () => null, { fetchBoundary = false } = {}) {
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
  const store = new Vuex.Store({ state: { staticURL: 'http://fixture.invalid' }, modules: {
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
  store.$deliveryApi = delivery.buildDeliveryApi({ baseURL: 'http://fixture.invalid', ...(fetchBoundary ? {
    fetch: async (url, options) => {
      const pending = adapter({ url: new URL(url).pathname, method: options.method.toLowerCase(), data: options.body,
        headers: options.headers, withCredentials: options.credentials === 'include', validateStatus: () => true })
      calls[calls.length - 1].fetchCredentials = options.credentials
      const response = await pending
      return { ...response, headers: new Map(), text: () => Promise.resolve(response.data) }
    },
  } : { adapter }) })
  store.$axios = axios.create({ adapter })
  const dispatch = (name, payload) => store.dispatch(`delivery/${name}`, payload)
  const component = (propsData = {}) => new Vue({ ...load('components/delivery/DeliveryCheckout.vue').default, store, propsData: { shopId: 7, cart, ...propsData } })
  return { store, calls, dispatch, component }
}

const deferred = () => {
  let complete
  const promise = new Promise(resolve => { complete = resolve })
  return { promise, resolve: complete }
}
async function drainVue() {
  for (let index = 0; index < 20; index++) {
    await Promise.resolve()
    await Vue.nextTick()
  }
}
function compiledComponent(file, imports = {}) {
  const options = load(file, { imports }).default
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8')).template.content
  const compiled = compiler.compile(source)
  assert.deepEqual(compiled.errors, [])
  const leaf = { functional: true, render: (h, context) => h('div', context.children) }
  return { ...options,
    components: { ...options.components, ...Object.fromEntries([...new Set(source.match(/v-[a-z-]+/g))].map(tag => [tag, leaf])) },
    render: vm.compileFunction(compiled.render, []),
    staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])),
  }
}
async function mountCheckout(f, { site = false } = {}) {
  const mountedPayments = []
  const stripe = { elements: () => ({ create: () => ({ mount: element => { assert.ok(element); mountedPayments.push(element) } }) }) }
  f.store.state.users.user.order_source = site ? 'web' : 'pos'
  const options = compiledComponent('pages/cart.vue', { '@stripe/stripe-js': { loadStripe: () => Promise.resolve(stripe) } })
  options.components.Loading = { functional: true, render: h => h('div') }
  const checkout = compiledComponent('components/delivery/DeliveryCheckout.vue')
  checkout.components.DeliveryAddressInput = compiledComponent('components/delivery/DeliveryAddressInput.vue')
  const page = new Vue({ ...options, store: f.store,
    components: { ...options.components, DeliveryCheckout: checkout },
    beforeCreate() { this.$router = { push() {} } },
  })
  page.$mount(document.createElement('div'))
  await drainVue()
  return { page, mountedPayments }
}

test('Google selection resolves once and SAVE reuses the fresh proof; private details do not call Google', async () => {
  let calls = 0
  const options = load('components/delivery/DeliveryAddressInput.vue').default
  const input = new Vue({ ...options, propsData: { suggester: () => Promise.resolve({ suggestions: [] }),
    resolver: body => { calls++; assert.deepEqual(body, { selectionToken: 'selection-fixture' }); return Promise.resolve({ ...proof('google'), expiresAt: new Date(Date.now() + 900000).toISOString() }) } } })
  try {
    await input.chooseSuggestion({ placeId: 'fixture-place', label: '60 rue Test, Paris', selectionToken: 'selection-fixture' })
    assert.equal(input.suggestions.some(item => item.placeId === input.googleChoice.placeId), true, 'Vuetify must retain the selected item to display its address')
    await input.resolve()
    input.draft.instructions = 'Portail B'
    await Vue.nextTick()
    assert.equal(calls, 1)
    assert.equal(input.resolution.addressSnapshot.instructions, 'Portail B')
    input.query = '61 rue Test'
    await Vue.nextTick()
    assert.equal(input.resolution, null)
  } finally { input.$destroy() }
})

test('Google search waits 300ms, skips short input and rejects stale context replies', async () => {
  let timer
  let delay
  const late = deferred()
  const calls = []
  const options = load('components/delivery/DeliveryAddressInput.vue', {
    setTimeout: (fn, ms) => { timer = fn; delay = ms; return 1 }, clearTimeout() {},
  }).default
  const input = new Vue({ ...options, propsData: { contextKey: 'shop7', resolver: () => Promise.resolve(proof('one')),
    suggester: body => { calls.push(body); return late.promise } } })
  try {
    input.query = 'ab'
    await Vue.nextTick()
    assert.equal(calls.length, 0)
    input.query = '60 rue Francois 1er'
    await Vue.nextTick()
    assert.equal(delay, 300)
    const pending = timer()
    input.contextKey = 'shop8'
    await Vue.nextTick()
    late.resolve({ suggestions: [{ placeId: 'old-shop', label: 'Old', selectionToken: 'old' }] })
    await pending
    assert.equal(calls.length, 1)
    assert.match(calls[0].sessionToken, /^[a-f0-9-]{36}$/i)
    assert.deepEqual(copy(input.suggestions), [])
    assert.equal(input.resolution, null)
  } finally { input.$destroy() }
})

test('Google delivery store sends only search/session or signed selection, never browser GPS', async () => {
  const f = fixture(call => ({ data: call.path.endsWith('address-suggestions') ? { suggestions: [] } : proof('google') }))
  await f.dispatch('suggestAddresses', { input: '60 rue Test', sessionToken: 'session', latitude: 1, personal: false })
  await f.dispatch('resolveAddress', { selectionToken: 'signed-selection', longitude: 2, personal: false })
  assert.deepEqual(f.calls[0].body, { input: '60 rue Test', sessionToken: 'session' })
  assert.deepEqual(f.calls[1].body, { selectionToken: 'signed-selection' })
})

test('Google address display queue deduplicates visible rows and limits provider work to two requests', async () => {
  const { buildAddressDisplayQueue } = require('../helpers/deliveryAddressDisplay')
  const waits = [deferred(), deferred(), deferred()]
  const started = []
  const queue = buildAddressDisplayQueue(id => { started.push(id); return waits[started.length - 1].promise })
  const a = queue.load('a')
  const duplicate = queue.load('a')
  const b = queue.load('b')
  const c = queue.load('c')
  assert.equal(a, duplicate)
  assert.deepEqual(started, ['a', 'b'])
  waits[0].resolve({ ready: true })
  await a
  await Promise.resolve()
  assert.deepEqual(started, ['a', 'b', 'c'])
  queue.clear()
  waits[1].resolve({ ready: true })
  waits[2].resolve({ ready: true })
  assert.equal(await b, null)
  assert.equal(await c, null)
})

test('Google book summary ignores an old account reply and shows provider failure separately', async () => {
  const late = deferred()
  const input = new Vue({ ...load('components/customer/CustomerAddressSummary.vue').default,
    propsData: { value: { id: '51', label: 'Adresse 1', addressSnapshot: { provider: 'google_places', placeId: 'fixture' } },
      contextKey: 'account-1', loader: () => late.promise } })
  try {
    const pending = input.load()
    input.contextKey = 'account-2'
    await Vue.nextTick()
    late.resolve({ displayStatus: 'ready', addressSnapshot: { street: 'Private old account' } })
    await pending
    assert.equal(input.addressText.includes('Private'), false)
  } finally { input.$destroy() }
})

test('Google editing a saved address cannot silently resolve its previous destination', async () => {
  let calls = 0
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, propsData: {
    value: { id: '51', addressSnapshot: { ...postal, provider: 'google_places', placeId: 'old-place' } },
    suggester: () => Promise.resolve({ suggestions: [] }), resolver: () => { calls++; return Promise.resolve(proof('old')) },
  } })
  try {
    input.query = 'A different new address'
    await Vue.nextTick()
    assert.equal(await input.resolve(), null)
    assert.equal(calls, 0)
  } finally { input.$destroy() }
})

test('Google saved address keeps its fresh proof when only private details change', async () => {
  let calls = 0
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, propsData: {
    value: { id: '51', addressSnapshot: { provider: 'google_places', placeId: 'saved-place' } },
    suggester: () => Promise.resolve({ suggestions: [] }),
    resolver: () => { calls++; return Promise.resolve({ ...proof('saved'), expiresAt: new Date(Date.now() + 900000).toISOString() }) },
  } })
  try {
    await input.resolve()
    input.draft.instructions = 'Portail B'
    await Vue.nextTick()
    assert.ok(input.resolution, 'Private fields must preserve the confirmed destination')
    await input.resolve()
    assert.equal(calls, 1)
    assert.equal(input.resolution.addressSnapshot.instructions, 'Portail B')
  } finally { input.$destroy() }
})

test('Google typing after selection preserves the new text when Vuetify clears its old model', async () => {
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, propsData: {
    suggester: () => Promise.resolve({ suggestions: [] }), resolver: () => Promise.resolve(proof('google')),
  } })
  try {
    await input.chooseSuggestion({ placeId: 'fixture', label: '60 rue Test', selectionToken: 'selection' })
    input.query = '61 rue Test'
    await Vue.nextTick()
    input.query = null
    await new Promise(resolve => setTimeout(resolve, 10))
    await drainVue()
    assert.equal(input.query, '61 rue Test')
    assert.equal(input.resolution, null)
    assert.equal(input.googleChoice, null)
  } finally { input.$destroy() }
})

test('Google concurrent SAVE joins selection Details instead of ending the same session twice', async () => {
  let calls = 0
  const late = deferred()
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, propsData: {
    suggester: () => Promise.resolve({ suggestions: [] }), resolver: () => { calls++; return late.promise },
  } })
  try {
    const selected = input.chooseSuggestion({ placeId: 'fixture', label: '60 rue Test', selectionToken: 'selection' })
    await drainVue()
    const saved = input.resolve()
    late.resolve({ ...proof('google'), expiresAt: new Date(Date.now() + 900000).toISOString() })
    const first = await selected
    const second = await saved
    assert.equal(calls, 1)
    assert.equal(first.addressResolutionToken, second.addressResolutionToken)
  } finally { input.$destroy() }
})

test('Google expired proof never resubmits a terminated selection even before its timer fires', async () => {
  let calls = 0
  const originalNow = Date.now
  const now = Date.now()
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, propsData: {
    suggester: () => Promise.resolve({ suggestions: [] }),
    resolver: () => { calls++; return Promise.resolve({ ...proof('google'), expiresAt: new Date(now + 5000).toISOString() }) },
  } })
  try {
    await input.chooseSuggestion({ placeId: 'fixture', label: '60 rue Test', selectionToken: 'selection' })
    Date.now = () => now + 5000
    assert.equal(await input.resolve(), null)
    assert.equal(calls, 1)
    assert.equal(input.resolution, null)
    assert.equal(input.googleChoice, null)
  } finally { Date.now = originalNow; input.$destroy() }
})

test('Google private edits while Details loads keep the same pending destination', async () => {
  const late = deferred()
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, propsData: {
    suggester: () => Promise.resolve({ suggestions: [] }), resolver: () => late.promise,
  } })
  try {
    const selected = input.chooseSuggestion({ placeId: 'fixture', label: '60 rue Test', selectionToken: 'selection' })
    await drainVue()
    input.draft.instructions = 'Portail B'
    await Vue.nextTick()
    late.resolve({ ...proof('google'), expiresAt: new Date(Date.now() + 900000).toISOString() })
    assert.equal((await selected)?.addressSnapshot.instructions, 'Portail B')
  } finally { input.$destroy() }
})

test('Google actual checkout state persists only recovery digests and retries the same accepted identity', async () => {
  const { serializePersistedState, parsePersistedState } = require('../helpers/persistedState')
  const addressToken = Buffer.from(JSON.stringify({ kind: 'address', addressSnapshot: {
    provider: 'google_places', placeId: 'fixture', latitude: 48.868, longitude: 2.306,
  } })).toString('base64url') + '.fixture-signature'
  let lost = true
  const f = fixture(() => lost ? { lost: true } : { data: { orderId: 91 } })
  const writes = []
  f.store.subscribe((mutation, state) => writes.push(serializePersistedState(state)))
  const params = { customer: 'Guest', servicePointId: 70, total: 29, payment: 'cash', dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: addressToken, addressResolutionToken: addressToken }
  assert.equal((await f.store.dispatch('cart/checkoutOrder', params)).ok, false)
  assert.equal(writes.every(bytes => !bytes.includes(addressToken)), true, 'No intermediate Vuex write may persist Google GPS proofs')
  const original = copy(f.calls[0].body)
  const bytes = serializePersistedState(f.store.state)
  assert.equal(bytes.includes(addressToken), false)
  assert.equal(bytes.includes('48.868'), false)
  const restored = parsePersistedState(bytes)
  f.store.replaceState({ ...f.store.state, cart: restored.cart })
  lost = false
  assert.equal((await f.store.dispatch('cart/retryCheckout')).ok, true)
  const sent = f.calls[f.calls.length - 1].body
  assert.equal(sent.client_order_token, original.client_order_token)
  assert.equal(sent.delivery_confirmation_secret, original.delivery_confirmation_secret)
  assert.match(sent.address_resolution_token, /^sha256:[a-f0-9]{64}$/)
  assert.match(sent.delivery_quote_token, /^sha256:[a-f0-9]{64}$/)
})

test('Google staff actor changes cancel old address reads and clear checkout private context without changing the frozen cart', async () => {
  const late = deferred()
  const f = fixture(() => late.promise)
  await f.dispatch('resetForShop', 7)
  const originalUser = { id: 10, shopid: 7, access: 1, status: 1, session_subject: 'staff' }
  f.store.state.users.user = originalUser
  const checkout = f.component({ value: 'delivery' })
  try {
    checkout.profileId = '61'
    checkout.resolution = proof('private')
    checkout.currentQuote = quote()
    f.store.commit('delivery/PROFILES', [{ id: '61', name: 'Private customer' }])
    f.store.commit('delivery/ADDRESSES', [{ id: '51', addressSnapshot: { provider: 'google_places', placeId: 'fixture' } }])
    const frozen = { client_order_token: 'pending', fulfillment_type: 'delivery' }
    f.store.state.cart.clientOrderPayload = frozen
    const before = checkout.bookContext
    const display = f.dispatch('displayAddress', { addressId: '51', customerId: '61', personal: false })
    const resolution = f.dispatch('resolveAddress', { selectionToken: 'private-selection', personal: false })
    await drainVue()
    f.store.state.users.user = { id: 11, shopid: 7, access: 6, status: 1, session_subject: 'staff' }
    f.store.state.users.user = originalUser
    await Vue.nextTick()
    late.resolve({ data: { ...proof('private'), addressSnapshot: { ...postal, provider: 'google_places', instructions: 'Private door' } } })
    assert.equal(await display, null)
    assert.equal(await resolution, null)
    assert.notEqual(checkout.bookContext, before)
    assert.equal(checkout.resolution, null)
    assert.equal(checkout.currentQuote, null)
    assert.equal(checkout.profileId, null)
    assert.deepEqual(copy(f.store.state.delivery.addresses), [])
    assert.deepEqual(copy(f.store.state.delivery.profiles), [])
    assert.equal(f.store.state.cart.clientOrderPayload, frozen)
  } finally { late.resolve({ data: proof('private') }); checkout.$destroy() }
})

test('Google actual Vuetify preserves saved addresses on initialization', async () => {
  if (!process.env.GOOGLE_SAVED_VUETIFY_CHILD) {
    const env = { ...process.env, GOOGLE_SAVED_VUETIFY_CHILD: '1' }
    delete env.NODE_TEST_CONTEXT
    try {
      require('child_process').execFileSync(process.execPath, ['--test', '--test-name-pattern=Google actual Vuetify preserves', __filename], { env, timeout: 20000 })
    } catch (error) { throw new Error(String(error.stdout || error.message)) }
    return
  }
  const Vuetify = require('vuetify')
  document.documentElement = { clientWidth: 1440, clientHeight: 900 }
  Vue.use(Vuetify)
  for (const addressSnapshot of [{ provider: 'google_places', placeId: 'saved-place' }, { ...postal, latitude: 48.8, longitude: 2.3 }]) {
    const root = new Vue({ vuetify: new Vuetify({ theme: { disable: true } }) })
    const requests = []
    const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default, parent: root, propsData: {
      value: { id: '51', label: 'Adresse 1', addressSnapshot }, suggester: () => Promise.resolve({ suggestions: [] }),
      resolver: body => { requests.push(body); return Promise.resolve(proof('saved')) },
    } })
    const Autocomplete = Vue.options.components.VAutocomplete
    // Isolate Vuetify's real creation lifecycle; the child process owns unmounted dependency teardown.
    const autocomplete = new Autocomplete({ parent: input, propsData: {
      value: input.googleChoice || input.storedChoice, searchInput: input.query, items: input.storedChoice ? [input.storedChoice] : input.suggestions,
      itemText: 'label', itemValue: 'placeId', returnObject: true, noFilter: true,
    }, _parentListeners: { 'update:search-input': value => { input.query = value } } })
    autocomplete.$refs.menu = { getTiles() {}, listIndex: -1 }
    const stop = input.$watch(() => ({ value: input.googleChoice || input.storedChoice, searchInput: input.query,
      items: input.storedChoice ? [input.storedChoice] : input.suggestions }), props => {
      const silent = Vue.config.silent
      Vue.config.silent = true
      Object.assign(autocomplete.$props, props)
      Vue.config.silent = silent
    })
    try {
      await drainVue()
      assert.equal(input.postalEdited, false, 'Widget initialization is not a user edit')
      assert.equal(input.unchangedPostal, true)
      assert.ok(autocomplete.internalSearch, 'The unchanged saved address stays visible')
      assert.ok(await input.resolve())
      await drainVue()
      assert.ok(input.resolution, 'Vuetify normalization must not invalidate the accepted saved address')
      assert.equal(input.postalEdited, false)
      assert.equal(input.storedChoice.label, [postal.street, postal.postalCode, postal.city].join(', '))
      assert.deepEqual(requests, [{ addressId: '51' }])
      await input.chooseSuggestion(null)
      assert.equal(input.unchangedPostal, false, 'Explicitly clearing must not revive the saved destination')
      assert.equal(await input.resolve(), null)
      assert.equal(requests.length, 1)
    } finally { stop(); input.$destroy(); root.$destroy() }
  }
})

test('I1 mounted confirmed delivery keeps proofs/signature through pending child teardown and Stripe response without cancel', async () => {
  const response = deferred()
  const sent = deferred()
  const f = fixture(call => {
    if (call.path.endsWith('/stripe/payment-intents/qr-table')) { sent.resolve(); return response.promise }
    return null
  })
  await f.store.dispatch('cart/setTocart', copy(cart))
  const { page, mountedPayments } = await mountCheckout(f, { site: true })
  let preparation
  try {
    page.fulfillmentType = 'delivery'
    page.isValue = true
    await drainVue()
    const checkout = page.$refs.deliveryCheckout
    const address = checkout.$refs.addressInput
    assert.ok(address && address._isMounted)
    Object.assign(address.draft, postal, { instructions: 'Original door' })
    await Vue.nextTick()
    await address.resolve()
    await drainVue()
    checkout.confirmQuote()
    await drainVue()
    assert.equal(page.deliveryConfirmed, true)
    const originalSignature = page.currentStripeCheckoutSignature
    const originalProof = copy(page.deliveryResolution)
    const originalQuote = copy(page.deliveryQuote)
    preparation = page.prepareStripePaymentElement()
    await sent.promise
    await drainVue()
    assert.equal(page.deliveryAttemptLocked, true)
    assert.equal(address._isDestroyed, true, 'Real v-if teardown must exercise the unchanged resolved(null) hook')
    assert.deepEqual(copy(page.deliveryResolution), originalProof)
    assert.deepEqual(copy(page.deliveryQuote), originalQuote)
    assert.equal(page.currentStripeCheckoutSignature, originalSignature)
    response.resolve({ data: { orderId: 91, clientSecret: 'local-double-secret', publishableKey: 'local-double-key', paymentIntentId: 'pi_local_double' } })
    await preparation
    await drainVue()
    assert.equal(f.store.state.cart.clientOrderStatus, 'stripe_prepared')
    assert.equal(page.currentStripeCheckoutSignature, originalSignature)
    assert.equal(page.stripeCheckoutSignature, originalSignature)
    assert.equal(page.stripePaymentReady, true)
    assert.equal(mountedPayments.length, 1)
    assert.equal(f.calls.filter(call => call.path.endsWith('/cancel')).length, 0)
  } finally {
    response.resolve({ lost: true })
    if (preparation) await preparation
    page.$destroy()
  }
})

test('I2 reload with persisted pending exactly replays original Stripe endpoint/key/body/proofs/secret and blocks live remount clicks', async () => {
  const interrupted = deferred()
  const sent = deferred()
  const live = fixture(call => { sent.resolve(); return interrupted.promise })
  const originalRequest = live.store.dispatch('cart/checkoutOrder', { customer: 'Guest', servicePointId: 70, total: 28.99,
    payment: 'Stripe', stripe: true, dataCart: cart, fulfillmentType: 'delivery',
    deliveryQuoteToken: 'quote-original', addressResolutionToken: 'proof-original',
    deliveryDetails: { complement: 'Flat 2', instructions: 'Private original' }, deliveryAddressSnapshot: postal })
  await sent.promise
  const persisted = copy(live.store.state.cart)
  const wire = copy(live.calls[0])
  assert.equal(persisted.clientOrderStatus, 'pending')
  const remount = await mountCheckout(live)
  const replayResponse = deferred()
  const reloaded = fixture(() => replayResponse.promise)
  reloaded.store.replaceState({ ...reloaded.store.state, cart: copy(persisted) })
  const restored = await mountCheckout(reloaded)
  try {
    await remount.page.retryDeliveryAttempt()
    assert.equal(live.store.state.cart.clientOrderStatus, 'pending', 'Ordinary remount cannot normalize a live request')
    assert.equal(live.calls.length, 1)
    assert.equal(restored.page.deliveryAttemptLocked, true)
    const recovery = restored.page.retryDeliveryAttempt()
    await drainVue()
    assert.equal(reloaded.calls.length, 1, 'Reload has no live promise: explicit recovery must send the original request')
    assert.equal((await reloaded.store.dispatch('cart/retryCheckout')).error.code, 'CHECKOUT_ATTEMPT_UNRESOLVED')
    replayResponse.resolve({ data: { orderId: 91, clientSecret: 'local-double-secret', publishableKey: 'local-double-key' } })
    await recovery
    assert.equal(reloaded.calls.length, 1, 'Reload has no live promise: explicit recovery must send the original request')
    assert.equal(reloaded.calls[0].path, wire.path)
    assert.deepEqual(reloaded.calls[0].body, wire.body)
    assert.equal(reloaded.calls[0].credentials, false)
    assert.deepEqual(copy(reloaded.store.state.cart.clientOrderPayload), persisted.clientOrderPayload)
    assert.equal(reloaded.store.state.cart.clientOrderToken, persisted.clientOrderToken)
    assert.equal(reloaded.store.state.cart.clientOrderStatus, 'stripe_prepared')
    assert.equal(restored.page.stripePaymentReady, true)
  } finally {
    replayResponse.resolve({ lost: true })
    interrupted.resolve({ lost: true })
    await originalRequest
    remount.page.$destroy()
    restored.page.$destroy()
  }
})

test('I3 mounted POS profile/address plus unrelated personal session and lost reply retries as original guest with cookies omitted', async () => {
  let lost = true
  const profile = { id: '51', name: 'Restaurant contact', contactPhone: '0700000000' }
  const address = { id: '9007199254740995', label: 'Contact address', addressSnapshot: { ...postal } }
  const f = fixture(call => {
    if (call.path.endsWith('/customers/51/addresses')) return { data: [address] }
    if (call.path.endsWith('/orders/checkout')) return lost ? { lost: true } : { data: { orderId: 91, tracking_url: '/local-tracking-double' } }
    return null
  }, { fetchBoundary: true })
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', personal)
  await f.store.dispatch('cart/setTocart', copy(cart))
  const { page } = await mountCheckout(f)
  const before = JSON.stringify({ storage, users: f.store.state.users, shop: f.store.state.shop })
  try {
    page.fulfillmentType = 'delivery'
    page.isValue = true
    await drainVue()
    const checkout = page.$refs.deliveryCheckout
    f.store.commit('delivery/PROFILES', [profile])
    await checkout.selectProfile(profile.id)
    await checkout.selectAddress(address.id)
    await drainVue()
    checkout.confirmQuote()
    await drainVue()
    assert.equal(page.formuser.customer, profile.name)
    assert.equal(page.deliveryConfirmed, true)
    await page.paymentBtn()
    assert.equal(f.store.state.cart.clientOrderStatus, 'uncertain')
    const original = copy(f.store.state.cart.clientOrderPayload)
    assert.equal(original.customerContextId, undefined, 'Selected POS contact is never a verified personal owner')
    const first = f.calls.find(call => call.path.endsWith('/orders/checkout'))
    assert.ok(first)
    lost = false
    await page.retryDeliveryAttempt()
    const checkouts = f.calls.filter(call => call.path.endsWith('/orders/checkout'))
    assert.equal(checkouts.length, 2)
    assert.deepEqual(checkouts[1].body, first.body)
    assert(checkouts.every(call => call.credentials === false && call.fetchCredentials === 'omit' && !call.headers['X-CSRF-Token']))
    assert.equal(page.checkoutFinalized, true)
    assert.equal(JSON.stringify({ storage, users: f.store.state.users, shop: f.store.state.shop }), before)
  } finally { page.$destroy() }
})

test('I3 personal retry requires the original verified owner/shop and current CSRF, never a selected contact', async () => {
  const f = fixture(() => ({ lost: true }))
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', personal)
  await f.store.dispatch('cart/checkoutOrder', { customer: 'Personal', total: 25, payment: 'cash', dataCart: cart, customerSession: personal,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'original-quote', addressResolutionToken: 'original-proof' })
  const original = copy(f.calls[0].body)
  assert.equal(f.store.state.cart.clientOrderPayload.customerContextShopId, 7)
  assert.equal(original.customerContextShopId, undefined)
  assert.equal(f.store.state.cart.clientOrderPayload.csrfToken, undefined)
  for (const session of [null, { ...personal, customerId: '51' }, { ...personal, shopId: 8 }, { ...personal, csrfToken: '' }, { ...personal, subject: 'staff' }]) {
    f.store.commit('customer/SESSION', session)
    const blocked = await f.store.dispatch('cart/retryCheckout')
    assert.equal(blocked.error.code, 'CHECKOUT_ATTEMPT_UNRESOLVED')
    assert.equal(f.calls.length, 1)
  }
  f.store.state.users.user.shopid = 8
  f.store.commit('customer/RESET', 8)
  f.store.commit('customer/SESSION', { ...personal, shopId: 8 })
  assert.equal((await f.store.dispatch('cart/retryCheckout')).error.code, 'CHECKOUT_ATTEMPT_UNRESOLVED')
  assert.equal(f.calls.length, 1, 'Even an identical account ID in another current shop cannot replace the original tenant')
  f.store.state.users.user.shopid = 7
  f.store.commit('customer/RESET', 7)
  f.store.commit('customer/SESSION', { ...personal, csrfToken: 'b'.repeat(64) })
  await f.store.dispatch('cart/retryCheckout')
  assert.equal(f.calls.length, 2)
  assert.deepEqual(f.calls[1].body, original)
  assert.equal(f.calls[1].credentials, true)
  assert.equal(f.calls[1].headers['X-CSRF-Token'], 'b'.repeat(64))
})

test('I2 restored pending counter-paid delivery keeps its original endpoint and payment choice', async () => {
  const f = fixture(() => ({ lost: true }))
  await f.store.dispatch('cart/checkoutOrder', { customer: 'Guest', total: 29, payment: 'counter_pay_before:Especes', dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'counter-quote', addressResolutionToken: 'counter-proof' })
  const persisted = copy(f.store.state.cart)
  persisted.clientOrderStatus = 'pending'
  const restored = fixture(() => ({ data: { orderId: 91 } }))
  restored.store.replaceState({ ...restored.store.state, cart: persisted })
  const result = await restored.store.dispatch('cart/retryCheckout')
  assert.equal(result.ok, true)
  assert.equal(restored.calls.length, 1)
  assert.equal(restored.calls[0].path, '/baseurl/api/v1/orders/checkout')
  assert.deepEqual(restored.calls[0].body, f.calls[0].body)
  assert.equal(restored.calls[0].body.payment, 'counter_pay_before:Especes')
})

test('I3 a personal session appearing after a site guest lost reply cannot change replay credentials or bound signature', async () => {
  const f = fixture(() => ({ lost: true }), { fetchBoundary: true })
  await f.store.dispatch('cart/checkoutOrder', { customer: 'Guest', total: 25, payment: 'Stripe', stripe: true, dataCart: cart,
    fulfillmentType: 'delivery', deliveryQuoteToken: 'guest-quote', addressResolutionToken: 'guest-proof' })
  const { page } = await mountCheckout(f, { site: true })
  try {
    const signature = page.currentStripeCheckoutSignature
    f.store.commit('customer/RESET', 7)
    f.store.commit('customer/SESSION', personal)
    await drainVue()
    assert.equal(page.currentStripeCheckoutSignature, signature)
    await page.retryDeliveryAttempt()
    assert.equal(f.calls.length, 2)
    assert.deepEqual(f.calls[1].body, f.calls[0].body)
    assert.equal(f.calls[1].fetchCredentials, 'omit')
    assert.equal(f.calls[1].headers['X-CSRF-Token'], undefined)
  } finally { page.$destroy() }
})

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

test('cashier menu keeps its original service dialog even when delivery is enabled', async () => {
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
    assert.equal(cashier.expressSelectedServiceLabel, 'Sur place')
    await cashier.openExpressServiceDialog()
    assert.equal(cashier.expressServiceDialog, true)
    assert.deepEqual(routes, [])
    assert.equal(f.store.state.delivery.discount.value, 0)
    assert.equal(f.store.state.delivery.posDraft, null)
    cashier.selectExpressService(true)
    assert.equal(cashier.expressIsTakeaway, true)
    assert.equal(cashier.expressServiceDialog, false)
    cashier.openExpressServiceDialog()
    assert.equal(cashier.expressServiceDialog, true)
    cashier.selectExpressService(false)
    assert.equal(cashier.expressSelectedServiceLabel, 'Sur place')
    assert.equal(cashier.expressServiceDialog, false)
    assert.equal(f.calls.length, 0)
  } finally { cashier.$destroy() }
})

test('cashier delivery opens a modal without navigating or submitting an order', async () => {
  const f = fixture()
  const page = new Vue({ ...load('pages/caisse/menu.vue').default, store: f.store })
  const routes = []
  page.$router = { push: route => routes.push(route) }
  try {
    page.cartItem = copy(cart)
    page.expressCustomer = 'Alice'
    page.expressPhone = '0700000000'
    page.expressRemark = 'Sans couverts'
    page.openExpressServiceDialog()
    assert.equal(typeof page.openExpressDeliveryDialog, 'function')
    await page.openExpressDeliveryDialog()
    assert.equal(page.expressServiceDialog, false)
    assert.equal(page.expressDeliveryDialog, true)
    assert.equal(page.expressIsDelivery, false, 'Opening is not confirmation')
    assert.deepEqual(routes, [])
    assert.equal(f.calls.some(call => call.path.endsWith('/checkout')), false)
    assert.equal(page.expressCustomer, 'Alice')
    page.selectExpressService(true)
    assert.equal(page.expressIsDelivery, false)
    assert.equal(page.expressPhone, '0700000000')
    assert.equal(page.expressRemark, 'Sans couverts')
  } finally { page.$destroy() }
})

test('cashier delivery submits the confirmed fee and keeps order notes separate from courier instructions', async () => {
  for (const counterPaid of [false, true]) {
    const f = fixture(call => call.path.endsWith('/checkout') ? { data: { orderId: 91 } } : { data: quote(400) })
    const page = new Vue({ ...load('pages/caisse/menu.vue').default, store: f.store })
    try {
      assert.equal(typeof page.confirmExpressDelivery, 'function')
      f.store.commit('delivery/RESET', 7)
      f.store.commit('delivery/AVAILABILITY', true)
      page.cartItem = copy(cart)
      page.total = 25
      page.expressCustomer = 'Alice'
      page.expressPhone = '0700000000'
      page.expressRemark = 'Sans couverts'
      page.expressDeliveryResolution = { ...proof('menu'), complement: 'Etage 2', instructions: 'Sonner B' }
      page.expressDeliveryQuote = quote(400)
      page.expressDeliveryReady = true
      page.$refs.expressDelivery = { ready: true }
      page.confirmExpressDelivery()
      assert.equal(page.expressSelectedServiceLabel, 'Livraison')
      assert.equal(page.expressCheckoutTotal, 29)
      assert.equal(page.expressSubmitDisabled, false, 'Delivery does not require a table')
      if (counterPaid) {
        page.pendingExpressPaymentMethod = 'Especes'
        await page.confirmExpressReceipt(false)
      } else await page.submitExpressPayLater()
      const sent = f.calls.find(call => call.path.endsWith('/checkout')).body
      assert.equal(sent.fulfillment_type, 'delivery')
      assert.equal(sent.expected_total, 29)
      assert.equal(sent.address_resolution_token, 'proof-menu')
      assert.equal(sent.delivery_quote_token, 'quote-400-0')
      assert.equal(sent.payment, counterPaid ? 'counter_pay_before:Especes' : 'Paiement a la livraison')
      assert.equal(sent.customer, 'Alice')
      assert.equal(sent.phone, '0700000000')
      assert.equal(sent.remark, 'Sans couverts')
      assert.deepEqual(copy(sent.delivery_address_details), { complement: 'Etage 2', instructions: 'Sonner B' })
      assert.equal(page.expressIsDelivery, false)
      assert.equal(page.expressDeliveryResolution, null)
    } finally { page.$destroy() }
  }
})

async function mountCashierDelivery(f) {
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, 'pages/menus.vue'), 'utf8')).template.content
  const fragment = source.match(/<DeliveryOrderDialog\b[\s\S]*?\/>/)[0]
  const compiled = compiler.compile(fragment)
  assert.deepEqual(compiled.errors, [])
  const dialogOptions = compiledComponent('components/delivery/DeliveryOrderDialog.vue')
  const checkoutOptions = compiledComponent('components/delivery/DeliveryCheckout.vue')
  checkoutOptions.components.DeliveryAddressInput = compiledComponent('components/delivery/DeliveryAddressInput.vue')
  dialogOptions.components.DeliveryCheckout = checkoutOptions
  const page = new Vue({ ...Vue.extend(load('pages/caisse/menu.vue').default).options, components: { DeliveryOrderDialog: dialogOptions }, store: f.store, mounted: [],
    render: vm.compileFunction(compiled.render, []), staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])),
  })
  page.$router = { push() {} }
  page.cartItem = copy(cart)
  page.total = 25
  page.expressCustomer = 'Alice'
  page.expressPhone = '0700000000'
  page.expressRemark = 'Sans couverts'
  page.$mount(document.createElement('div'))
  page.openExpressDeliveryDialog()
  await drainVue()
  return page
}

test('delivery address shows only a compact French kilometre badge from the current quote', async () => {
  const f = fixture(call => call.path.endsWith('/quotes') ? { data: { ...quote(), distanceMeters: 5300 } } : null)
  const options = compiledComponent('components/delivery/DeliveryCheckout.vue')
  options.components.DeliveryAddressInput = { render: h => h('div') }
  const checkout = new Vue({ ...options, store: f.store, propsData: { shopId: 7, cart, value: 'delivery' } })
  checkout.$mount(document.createElement('div'))
  await drainVue()
  try {
    assert.doesNotMatch(checkout.$el.textContent, /\bkm\b/)
    await checkout.onResolved(proof('distance'))
    await drainVue()
    assert.match(checkout.$el.textContent, /5,3 km/)
    assert.doesNotMatch(checkout.$el.textContent, /vol d.oiseau/i)
    for (const [distance, label] of [[0, '0,0 km'], [12345, '12,3 km']]) {
      checkout.currentQuote = { ...quote(), distanceMeters: distance }
      await drainVue()
      assert.ok(checkout.$el.textContent.includes(label))
    }
    await checkout.onResolved(null)
    await drainVue()
    assert.doesNotMatch(checkout.$el.textContent, /\bkm\b/, 'Editing the address clears the old distance')
  } finally { checkout.$destroy() }
})

test('delivery distance badge stays hidden for missing or invalid distances', async () => {
  const f = fixture()
  const options = compiledComponent('components/delivery/DeliveryCheckout.vue')
  options.components.DeliveryAddressInput = { render: h => h('div') }
  const checkout = new Vue({ ...options, store: f.store, propsData: { shopId: 7, cart, value: 'delivery' } })
  checkout.$mount(document.createElement('div'))
  await drainVue()
  try {
    for (const distance of [null, undefined, NaN, Infinity, -1, '5300']) {
      checkout.currentQuote = { ...quote(), distanceMeters: distance }
      await drainVue()
      assert.doesNotMatch(checkout.$el.textContent, /\bkm\b/)
    }
  } finally { checkout.$destroy() }
})

test('cashier delivery dialog shares Menu contacts and note, selects a profile and invalidates a changed cart', async () => {
  const f = fixture(call => ({ data: call.path.endsWith('/availability') ? { enabled: true }
    : call.path.endsWith('/quotes') ? quote(400) : [] }))
  const page = await mountCashierDelivery(f)
  try {
    const dialog = page.$refs.expressDelivery
    const checkout = dialog.$refs.checkout
    assert.equal(dialog.customer, 'Alice')
    assert.equal(dialog.phone, '0700000000')
    assert.equal(dialog.remark, 'Sans couverts')
    dialog.$emit('update:customer', 'Bob')
    dialog.$emit('update:phone', '0611111111')
    dialog.$emit('update:remark', 'Sans pain')
    await drainVue()
    assert.equal(page.expressCustomer, 'Bob')
    assert.equal(page.expressPhone, '0611111111')
    assert.equal(page.buildExpressRemark(), 'Sans pain')
    assert.deepEqual(copy(checkout.customerToCreate), { name: 'Bob', contactPhone: '0611111111' })
    f.store.commit('delivery/PROFILES', [{ id: '12', name: 'Claire', contactPhone: '0622222222' }])
    await checkout.selectProfile('12')
    await drainVue()
    assert.equal(page.expressCustomer, 'Claire')
    assert.equal(page.expressPhone, '0622222222')
    assert.equal(page.expressRemark, 'Sans pain')
    await checkout.onResolved({ ...proof('dialog'), complement: 'Etage 2', instructions: 'Sonner B' })
    await drainVue()
    assert.equal(dialog.canConfirm, false)
    checkout.confirmQuote()
    await drainVue()
    assert.equal(dialog.canConfirm, true)
    dialog.confirm()
    await drainVue()
    assert.equal(page.expressDeliveryDialog, false)
    assert.equal(page.expressIsDelivery, true)
    assert.equal(page.expressSubmitDisabled, false)
    assert.equal(page.expressCheckoutTotal, 29)
    page.cartItem[0].qty = 2
    assert.equal(page.validateExpressDelivery(), false, 'Synchronous edits cannot reuse the previous quote')
    await drainVue()
    assert.equal(page.expressDeliveryReady, false)
    assert.equal(page.expressSubmitDisabled, true)
    f.store.state.users.user = { shopid: 8, session_subject: 'staff', order_source: 'pos' }
    assert.equal(page.expressCustomer, '')
    assert.equal(page.expressPhone, '')
    assert.equal(page.expressRemark, '')
    assert.equal(page.expressDeliveryResolution, null)
    assert.equal(f.calls.some(call => call.path.endsWith('/checkout')), false)
  } finally { page.$destroy() }
})

test('cashier delivery replaces a rejected quote only after unlocking and requires its confirmation', async () => {
  let attempts = 0
  const f = fixture(call => call.path.endsWith('/checkout') ? ++attempts === 1
    ? { status: 409, code: 'DELIVERY_QUOTE_CHANGED', data: { code: 'DELIVERY_QUOTE_CHANGED', server_quote: quote(500) } }
    : { data: { orderId: 91 } }
    : { data: call.path.endsWith('/availability') ? { enabled: true } : quote(400) })
  const page = await mountCashierDelivery(f)
  page.showAlert = () => {}
  try {
    const dialog = page.$refs.expressDelivery
    const checkout = dialog.$refs.checkout
    await checkout.onResolved(proof('reprice'))
    await drainVue()
    checkout.confirmQuote()
    await drainVue()
    dialog.confirm()
    await drainVue()
    await page.submitExpressPayLater()
    await drainVue()
    assert.equal(checkout.currentQuote.quoteToken, 'quote-500-0')
    assert.equal(checkout.ready, false)
    assert.equal(page.expressDeliveryReady, false)
    assert.equal(page.expressDeliveryDialog, true)
    checkout.confirmQuote()
    await drainVue()
    dialog.confirm()
    await drainVue()
    await page.submitExpressPayLater()
    assert.deepEqual(f.calls.filter(call => call.path.endsWith('/checkout')).map(call => call.body.delivery_quote_token), ['quote-400-0', 'quote-500-0'])
  } finally { page.$destroy() }
})

test('cashier delivery clears the previous actor carnet even after the delivery dialog was removed', async () => {
  const f = fixture()
  const page = await mountCashierDelivery(f)
  try {
    f.store.commit('delivery/PROFILES', [{ id: '12', name: 'Private customer', contactPhone: '0600000000' }])
    page.selectExpressService(false)
    await drainVue()
    f.store.state.users.user = { ...f.store.state.users.user, id: 99 }
    assert.deepEqual(copy(f.store.state.delivery.profiles), [])
    assert.deepEqual(copy(f.store.state.delivery.addresses), [])
  } finally { page.$destroy() }
})

test('cashier delivery can reopen and retry availability after a temporary network failure', async () => {
  let requests = 0
  const f = fixture(call => call.path.endsWith('/availability') ? ++requests === 1 ? { lost: true } : { data: { enabled: true } } : null)
  const page = await mountCashierDelivery(f)
  try {
    assert.equal(f.store.state.delivery.enabled, false)
    page.expressDeliveryDialog = false
    await drainVue()
    page.openExpressDeliveryDialog()
    await drainVue()
    assert.equal(page.expressDeliveryDialog, true)
    assert.equal(requests, 2)
    assert.equal(f.store.state.delivery.enabled, true)
  } finally { page.$destroy() }
})

test('cashier delivery rejects expired proof and never replaces an uncertain order', async () => {
  const f = fixture()
  const page = new Vue({ ...load('pages/caisse/menu.vue').default, store: f.store })
  try {
    assert.equal(typeof page.confirmExpressDelivery, 'function')
    page.cartItem = copy(cart)
    page.expressCustomer = 'Alice'
    page.expressPhone = '0700000000'
    page.expressDeliveryQuote = quote(400)
    page.expressDeliveryResolution = { ...proof('expired'), expiresAt: '2000-01-01T00:00:00Z' }
    page.expressDeliveryReady = true
    page.$refs.expressDelivery = { ready: true }
    page.confirmExpressDelivery()
    assert.equal(page.expressIsDelivery, false)
    page.expressIsDelivery = true
    await page.submitExpressPayLater()
    assert.equal(f.calls.length, 0)
    f.store.state.cart.clientOrderStatus = 'uncertain'
    const frozen = { fulfillment_type: 'delivery', customer: 'Original' }
    f.store.state.cart.clientOrderPayload = frozen
    await page.submitExpressPayLater()
    assert.equal(f.store.state.cart.clientOrderPayload, frozen)
    assert.equal(f.calls.length, 0)
  } finally { page.$destroy() }
})

test('cashier delivery ignores stale checkout UI and printing after an actor switch in both payment flows', async () => {
  for (const counterPaid of [false, true]) {
    const pending = deferred()
    const f = fixture(call => call.path.endsWith('/checkout') ? pending.promise
      : { data: call.path.endsWith('/availability') ? { enabled: true } : quote(400) })
    const page = await mountCashierDelivery(f)
    let printed = false
    page.printExpressReceipt = () => { printed = true; return Promise.resolve() }
    try {
      const dialog = page.$refs.expressDelivery
      await dialog.$refs.checkout.onResolved(proof('stale'))
      await drainVue()
      dialog.$refs.checkout.confirmQuote()
      await drainVue()
      dialog.confirm()
      await drainVue()
      page.pendingExpressPaymentMethod = 'Especes'
      const submission = counterPaid ? page.confirmExpressReceipt(true) : page.submitExpressPayLater()
      await drainVue()
      f.store.state.users.user = { ...f.store.state.users.user, id: 99 }
      await drainVue()
      page.cartItem = [{ ...cart[0], id: 22 }]
      page.expressCustomer = 'New actor customer'
      page.expressPhone = '0611111111'
      pending.resolve({ data: { orderId: 91 } })
      await submission
      assert.equal(page.cartItem.length, 1)
      assert.equal(page.cartItem[0].id, 22)
      assert.equal(page.expressCustomer, 'New actor customer')
      assert.equal(page.expressPhone, '0611111111')
      assert.equal(page.expressPaymentLoading, null)
      assert.equal(page.expressReceiptPrinting, false)
      assert.equal(printed, false)
    } finally { page.$destroy() }
  }
})

test('cashier delivery availability remains retryable after an actor switch clears its network error', async () => {
  const f = fixture(() => ({ lost: true }))
  const page = await mountCashierDelivery(f)
  try {
    f.store.state.users.user = { ...f.store.state.users.user, id: 99 }
    await drainVue()
    assert.equal(page.expressDeliveryUnavailable, false)
    page.openExpressDeliveryDialog()
    assert.equal(page.expressDeliveryDialog, true)
  } finally { page.$destroy() }
})

test('cashier delivery freezes service and cart edits until checkout has a known outcome', async () => {
  const pending = deferred()
  const f = fixture(call => call.path.endsWith('/checkout') ? pending.promise
    : { data: call.path.endsWith('/availability') ? { enabled: true } : quote(400) })
  const page = await mountCashierDelivery(f)
  try {
    const dialog = page.$refs.expressDelivery
    await dialog.$refs.checkout.onResolved(proof('locked'))
    await drainVue()
    dialog.$refs.checkout.confirmQuote()
    await drainVue()
    dialog.confirm()
    await drainVue()
    const submission = page.submitExpressPayLater()
    await drainVue()
    page.selectExpressService(false)
    page.setExpressTakeaway(true)
    assert.equal(page.expressIsDelivery, true)
    page.plusBtn(page.cartItem[0], 0)
    page.minusBtn(page.cartItem[0], 0)
    page.deleteBtn(page.cartItem[0])
    page.addToCart({ id: 99, price: 10 })
    await page.btnCancel()
    assert.deepEqual(copy(page.cartItem), copy(cart))
    pending.resolve({ data: { orderId: 91 } })
    await submission
    assert.equal(page.cartItem.length, 0)
    assert.equal(f.calls.filter(call => call.path.endsWith('/checkout')).length, 1)
  } finally { page.$destroy() }
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
