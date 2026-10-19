/* eslint-disable no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
require('axios/lib/adapters/xhr')

// Initialize Vue's real DOM patcher against the review probe's memory boundary.
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
global.window = { navigator: { userAgent: 'node-account-test' }, addEventListener() {}, removeEventListener() {} }
global.document = {
  createElement: tag => new MemoryNode(tag),
  createElementNS: (ns, tag) => new MemoryNode(tag),
  createTextNode: text => new MemoryNode(null, 3, text),
  createComment: text => new MemoryNode(null, 8, text),
  createEvent: () => ({ timeStamp: Date.now() }),
}
const compiler = require('vue-template-compiler')
const Vue = require('vue')
const Vuex = require('vuex')
const axios = require('axios')
const settle = require('axios/lib/core/settle')
Vue.use(Vuex)
Vue.config.productionTip = false
Vue.config.devtools = false

const root = path.resolve(__dirname, '..')
const clone = value => JSON.parse(JSON.stringify(value))
const deferred = () => {
  let complete
  const promise = new Promise(resolve => { complete = resolve })
  return { promise, resolve: complete }
}
const timers = () => {
  let id = 0
  const pending = new Map()
  return {
    pending,
    setTimeout(fn, delay) { pending.set(++id, { fn, delay }); return id },
    clearTimeout(key) { pending.delete(key) },
    setInterval() { return ++id },
    clearInterval() {},
    async flush() {
      const entries = [...pending.values()]
      pending.clear()
      await Promise.all(entries.map(entry => entry.fn()))
      await Vue.nextTick()
    },
  }
}
function load(relative, globals = {}) {
  let filename = path.join(root, relative)
  if (!fs.existsSync(filename)) filename += fs.existsSync(`${filename}.js`) ? '.js' : '.vue'
  let source = fs.readFileSync(filename, 'utf8')
  if (relative.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    const compiled = compiler.compile(sfc.template.content)
    assert.deepStrictEqual(compiled.errors, [], `${relative}: template must compile`)
    source = sfc.script.content
  }
  const code = babel.transformSync(source, {
    babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require', 'crypto', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'])(
    module, module.exports,
    name => {
      if (name.startsWith('@/')) return load(name.slice(2))
      return require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name)
    },
    require('crypto').webcrypto,
    globals.setTimeout || setTimeout, globals.clearTimeout || clearTimeout,
    globals.setInterval || setInterval, globals.clearInterval || clearInterval
  )
  return module.exports
}
const session = (shopId = 7) => ({
  subject: 'customer', shopId, customerId: '9007199254740993',
  expiresAt: '2099-01-01T00:00:00.000Z', csrfToken: 'a'.repeat(64),
})
const postal = { street: '12 rue de la Paix', postalCode: '75002', city: 'Paris', country: 'FR' }
const savedAddress = (id = '9007199254740995', label = 'Adresse 3') => ({
  id, customerId: session().customerId, label, isDefault: true,
  addressSnapshot: { ...postal, latitude: 48.87, longitude: 2.33, complement: 'Etage 2', instructions: 'Interphone prive' },
})
const proof = () => ({ addressSnapshot: savedAddress().addressSnapshot, addressResolutionToken: 'fresh-server-proof', expiresAt: '2099-01-01T00:00:00Z' })

function make(options = {}) {
  const calls = []
  let serverSession = options.authenticated === false ? null : session()
  let addresses = [savedAddress()]
  const identities = new Map([['email', session().customerId]])
  let linked = false
  const adapter = async config => {
    const call = {
      method: config.method, path: config.url, params: config.params,
      body: config.data ? JSON.parse(config.data) : undefined,
      headers: clone(config.headers), credentials: config.withCredentials,
      baseURL: config.baseURL,
      auth: config.auth,
    }
    calls.push(call)
    let result = options.reply && await options.reply(call)
    if (!result) {
      const tenant = config.params && config.params.shopId
      if (call.path.includes('/shopInfo/')) result = { data: { shop_name: `Restaurant ${call.path.split('/').pop()}`, shop_profile_image: 'restaurant.png', shop_theme: '{"primary":"red"}', shop_payment_methods: 'private-staff-settings' } }
      else if (call.path.endsWith('/channels')) result = { data: { email: true, whatsapp: true } }
      else if (call.path.endsWith('/challenges')) result = { data: { challengeId: '9007199254740999', expiresAt: '2099-01-01T00:00:00Z', resendAfter: new Date(Date.now() + 93000).toISOString(), status: 'sent' } }
      else if (call.path.endsWith('/link/verify')) {
        identities.set('whatsapp', serverSession.customerId)
        linked = true
        result = { data: { linked: true } }
      } else if (call.path.endsWith('/verify')) {
        serverSession = session(call.body.shopId)
        if (linked) assert.equal(identities.get('whatsapp'), serverSession.customerId)
        result = { data: serverSession }
      } else if (call.path.endsWith('/session')) result = serverSession && serverSession.shopId === tenant ? { data: serverSession } : { status: 401, error: 'CUSTOMER_SESSION_INVALID' }
      else if (call.path.endsWith('/logout')) { serverSession = null; result = { data: { loggedOut: true } } }
      else if (call.path.endsWith('/address-resolutions')) result = { data: proof() }
      else if (call.method === 'delete') { addresses = addresses.filter(row => row.id !== call.path.split('/').pop()); result = { data: { id: call.path.split('/').pop() } } }
      else if (call.method === 'patch') {
        const row = addresses.find(row => row.id === call.path.split('/').pop())
        row.isDefault = call.body.makeDefault || row.isDefault
        row.addressSnapshot = { ...row.addressSnapshot, ...Object.fromEntries(Object.entries(call.body).filter(([key]) => ['complement', 'instructions'].includes(key))) }
        result = { data: row }
      } else if (call.method === 'post') { const row = savedAddress('9007199254740997', 'Adresse 4'); addresses.push(row); result = { data: row } }
      else result = { data: addresses }
    }
    const response = { status: result.status || 200, statusText: '', headers: {}, config, data: JSON.stringify({
      success: !result.error, data: clone(result.data || null), error: result.error,
      message: 'Never display raw provider details',
    }) }
    return new Promise((resolve, reject) => settle(resolve, reject, response))
  }
  const plugin = load('plugins/customerApi.client.js')
  const api = plugin.buildCustomerApi({ baseURL: 'http://localhost:5005', adapter })
  const module = load('store/customer.js')
  const staff = {
    authenticated: true, users: { user: { id: 10, token: 'STAFF_BEARER', shopid: 77 } },
    shop: { shop_name: 'Staff restaurant', shop_theme: { primary: '#1976d2' }, shop_payment_methods: ['cash'] },
    products: { rows: [{ id: 21 }] }, cart: { items: [{ id: 21 }], clientOrderToken: 'recovery-keep' },
  }
  const storage = { vuex: JSON.stringify({ expiresAt: Date.now() + 86400001, state: staff }), staffToken: 'STAFF_BEARER', theme: '#1976d2' }
  const theme = { primary: '#1976d2' }
  const store = new Vuex.Store({ state: clone(staff), modules: { customer: module } })
  store.$customerApi = api
  const storageBoundary = {
    getItem: key => storage[key] || null,
    setItem: (key, value) => { storage[key] = value },
    removeItem: key => { delete storage[key] },
  }
  const previousWindow = global.window
  try {
    global.window = { localStorage: storageBoundary }
    load('plugins/persistedState.client.js').default({ store })
  } finally { global.window = previousWindow }
  const dispatch = (name, payload) => store.dispatch(`customer/${name}`, payload)
  const snapshot = () => JSON.stringify({ ...Object.fromEntries(Object.keys(staff).map(key => [key, store.state[key]])), storage, theme })
  const component = (file, propsData = {}, clocks) => new Vue({ ...load(file, clocks).default, store, propsData })
  return { store, dispatch, calls, api, snapshot, component, storage, get state() { return store.state.customer } }
}

async function drainVue() {
  for (let index = 0; index < 20; index++) {
    await Promise.resolve()
    await Vue.nextTick()
  }
}

function mountAccount(fixture, shopId = '7') {
  const options = load('pages/compte/index.vue').default
  const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, 'pages/compte/index.vue'), 'utf8'))
  const compiled = compiler.compile(sfc.template.content)
  assert.deepStrictEqual(compiled.errors, [])
  const route = Vue.observable({ query: { shopId } })
  const leaf = { functional: true, render: (h, context) => h('div', context.children) }
  const page = new Vue({
    ...options,
    store: fixture.store,
    components: {
      CustomerCodeLogin: { ...load('components/customer/CustomerCodeLogin.vue').default, render(h) { return h('div') } },
      CustomerAddressBook: leaf,
      'v-btn': leaf, 'v-icon': leaf, 'v-skeleton-loader': leaf, 'v-alert': leaf,
    },
    beforeCreate() { this.$route = route },
    render: vm.compileFunction(compiled.render, []),
    staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])),
  })
  page.$mount(document.createElement('div'))
  return { page, route }
}

test('I1 mounted compiled account loads the book once after login destroys its event sender', async () => {
  const f = make({ authenticated: false })
  const { page } = mountAccount(f)
  try {
    await drainVue()
    assert.equal(page.opening, false)
    const login = page.$children.find(child => typeof child.verify === 'function')
    assert.ok(login, 'Actual mounted login must exist')
    login.destination = 'me@example.test'
    await login.sendCode()
    login.code = '123456'
    await login.verify()
    await drainVue()
    assert.equal(login._isDestroyed, true)
    assert.ok(f.state.session)
    assert.equal(f.calls.filter(call => call.method === 'get' && call.path.endsWith('/addresses')).length, 1)
    assert.deepStrictEqual(clone(f.state.addresses), [savedAddress()])
    assert.equal(page.loadingBook, false)
    assert.ok(!f.calls.some(call => /quote|address-resolutions/.test(call.path)))
  } finally { page.$destroy() }
})

test('I1 mounted account restores one book and ignores old-shop completion while the new book is loading', async () => {
  const old = deferred()
  const next = deferred()
  const f = make({ reply: call => {
    if (call.path.endsWith('/session')) return { data: session(call.params.shopId) }
    if (call.path.endsWith('/addresses')) return call.params.shopId === 7 ? old.promise : next.promise
    return null
  } })
  const { page, route } = mountAccount(f)
  try {
    await drainVue()
    assert.equal(page.loadingBook, true)
    route.query.shopId = '8'
    await drainVue()
    assert.equal(f.state.shopId, 8)
    assert.equal(page.loadingBook, true)
    old.resolve({ status: 401, error: 'CUSTOMER_SESSION_INVALID' })
    await drainVue()
    assert.equal(page.loadingBook, true)
    assert.equal(f.state.session.shopId, 8)
    next.resolve({ data: [savedAddress('888', 'Adresse 8')] })
    await drainVue()
    assert.equal(page.loadingBook, false)
    assert.equal(f.state.addresses[0].id, '888')
    for (const shopId of [7, 8]) assert.equal(f.calls.filter(call => call.path.endsWith('/addresses') && call.params.shopId === shopId).length, 1)
  } finally { old.resolve({ data: [] }); next.resolve({ data: [] }); page.$destroy() }
})

test('I1 mounted account clears an old loading indicator when the next shop has no session', async () => {
  const old = deferred()
  const f = make({ reply: call => call.path.endsWith('/addresses') ? old.promise : null })
  const { page, route } = mountAccount(f)
  try {
    await drainVue()
    assert.equal(page.loadingBook, true)
    route.query.shopId = '8'
    await drainVue()
    assert.equal(f.state.session, null)
    assert.equal(page.loadingBook, false)
    old.resolve({ data: [savedAddress()] })
    await drainVue()
    assert.equal(f.state.addresses.length, 0)
    assert.equal(page.loadingBook, false)
  } finally { old.resolve({ data: [] }); page.$destroy() }
})

for (const changed of [false, true]) {
  test(`I2 chosen server candidate survives fresh SAVE for ${changed ? 'changed' : 'new'} postal address`, async () => {
    const f = make({ reply: call => {
      if (!call.path.endsWith('/address-resolutions')) return null
      if (call.body.candidateId !== 'candidate-2') return { status: 422, error: 'DELIVERY_ADDRESS_INVALID', data: {
        candidates: [{ providerId: 'candidate-2', providerLabel: '14 rue de la Paix 75002 Paris' }],
      } }
      return { data: { ...proof(), addressSnapshot: { ...proof().addressSnapshot, street: '14 rue de la Paix' } } }
    } })
    await f.dispatch('loadSession', { shopId: 7 })
    await f.dispatch('loadAddresses')
    const book = f.component('components/customer/CustomerAddressBook.vue')
    book.editAddress(changed ? f.state.addresses[0] : null)
    const input = f.component('components/delivery/DeliveryAddressInput.vue', { value: book.selected, resolver: book.resolveAddress }, timers())
    book.$refs.addressInput = input
    try {
      input.draft = { ...postal, street: '14 rue de la Paix', complement: 'Etage prive', instructions: 'Interphone prive' }
      await Vue.nextTick()
      await input.resolve()
      assert.equal(input.candidates.length, 1)
      await input.chooseCandidate(input.candidates[0])
      assert.equal(input.resolution.addressResolutionToken, 'fresh-server-proof')
      input.draft.instructions = 'Autre interphone prive'
      await Vue.nextTick()
      const before = f.calls.length
      await book.save()
      const resolution = f.calls.slice(before).find(call => call.path.endsWith('/address-resolutions'))
      assert.equal(resolution.body.candidateId, 'candidate-2')
      assert.deepStrictEqual(resolution.body.address, { ...postal, street: '14 rue de la Paix' })
      const mutation = f.calls.slice(before).find(call => call.method === (changed ? 'patch' : 'post') && /\/addresses(?:\/\d+)?$/.test(call.path))
      assert.ok(mutation, 'Candidate selection must reach the address mutation')
      assert.equal(mutation.body.addressResolutionToken, 'fresh-server-proof')
      assert.equal(mutation.body.complement, 'Etage prive')
      assert.equal(mutation.body.instructions, 'Autre interphone prive')
      assert.equal(book.editing, false)
      assert.ok(!f.calls.some(call => /quote/.test(call.path)))
      assert.ok(!Object.hasOwn(resolution.body.address, 'latitude'))
    } finally { input.$destroy(); book.$destroy() }
  })
}

test('I2 candidate authority is invalidated by postal/context changes and destruction', async () => {
  for (const change of ['postal', 'context', 'destroy']) {
    const f = make()
    await f.dispatch('loadSession', { shopId: 7 })
    const input = f.component('components/delivery/DeliveryAddressInput.vue', {
      resolver: payload => f.dispatch('resolveAddress', payload), contextKey: 'shop7',
    }, timers())
    try {
      input.draft = { ...postal, complement: '', instructions: '' }
      await Vue.nextTick()
      await input.chooseCandidate({ providerId: 'candidate-2' })
      if (change === 'postal') input.draft.street = '14 rue de la Paix'
      else if (change === 'context') input.contextKey = 'shop8'
      else input.$destroy()
      await Vue.nextTick()
      const before = f.calls.length
      await input.resolve()
      if (change === 'destroy' || change === 'context') { assert.equal(f.calls.length, before); assert.equal(input.resolution, null) }
      else assert.ok(!Object.hasOwn(f.calls[before].body, 'candidateId'))
    } finally { input.$destroy() }
  }
})

test('independent Axios ignores poisoned global/staff defaults and logout interceptors', async () => {
  const previousHeaders = axios.defaults.headers
  const previousAuth = axios.defaults.auth
  const previousParams = axios.defaults.params
  let staffLogout = 0
  const interceptor = axios.interceptors.response.use(null, error => { staffLogout++; return Promise.reject(error) })
  axios.defaults.headers = { common: { Authorization: 'Bearer STAFF_BEARER', Authentication: 'STAFF_BEARER' }, post: { Authorization: 'staff-method-token' } }
  axios.defaults.auth = { username: 'staff', password: 'fixture' }
  axios.defaults.params = { staffOnly: true }
  try {
    const f = make({ authenticated: false })
    const staffAxios = axios.create()
    staffAxios.onError = handler => staffAxios.interceptors.response.use(undefined, error => {
      staffLogout++
      return handler(error)
    })
    load('plugins/axios.js').default({ $axios: staffAxios, store: f.store, redirect() { staffLogout++ } })
    assert.equal(staffAxios.interceptors.response.handlers.length, 1)
    const before = f.snapshot()
    await f.dispatch('loadSession', { shopId: 7 })
    assert.equal(f.snapshot(), before)
    assert.equal(staffLogout, 0)
    for (const call of f.calls) {
      assert.ok(!Object.keys(call.headers).some(key => /^(authorization|authentication)$/i.test(key)))
      assert.equal(call.credentials, true)
      assert.equal(call.auth, undefined)
      assert.ok(!call.params || !call.params.staffOnly)
    }
    assert.equal(f.state.session, null)
    assert.equal(f.state.addresses.length, 0)
    assert.equal(axios.defaults.headers.common.Authorization, 'Bearer STAFF_BEARER')
  } finally {
    axios.defaults.headers = previousHeaders
    axios.defaults.auth = previousAuth
    axios.defaults.params = previousParams
    axios.interceptors.response.eject(interceptor)
  }
})

test('login/link/logout/401 preserve staff shop/products/cart/storage/theme and never quote/geocode', async () => {
  const f = make({ authenticated: false })
  const before = f.snapshot()
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('requestCode', { channel: 'email', destination: 'me@example.test', purpose: 'login' })
  const challenge = clone(f.state.challenge)
  assert.match(challenge.browserBinding, /^[a-f0-9]{64}$/)
  await f.dispatch('verifyCode', { challengeId: challenge.challengeId, code: '123456' })
  assert.deepStrictEqual(clone(f.state.session), session())
  await f.dispatch('loadAddresses')
  const book = clone(f.state.addresses)
  await f.dispatch('requestCode', { channel: 'whatsapp', destination: '+33612345678', purpose: 'link' })
  await f.dispatch('linkIdentity', { challengeId: f.state.challenge.challengeId, code: '123456' })
  assert.deepStrictEqual(clone(f.state.addresses), book)
  await f.dispatch('logout')
  assert.equal(f.state.session, null)
  assert.equal(f.state.addresses.length, 0)
  await f.dispatch('requestCode', { channel: 'whatsapp', destination: '+33612345678', purpose: 'login' })
  await f.dispatch('verifyCode', { challengeId: f.state.challenge.challengeId, code: '123456' })
  await f.dispatch('loadAddresses')
  assert.deepStrictEqual(clone(f.state.addresses), book)
  assert.equal(f.snapshot(), before)
  assert.ok(!f.calls.some(call => /quote|address-resolutions|access-token|\/users|\/session\//.test(call.path)))
  const verify = f.calls.find(call => call.path.endsWith('/customer-auth/verify'))
  assert.equal(verify.body.browserBinding, challenge.browserBinding)
  for (const call of f.calls.filter(call => /\/link\/|\/logout$/.test(call.path))) {
    assert.equal(call.params.shopId, 7)
    assert.equal(call.headers['X-CSRF-Token'], session().csrfToken)
    assert.ok(!Object.hasOwn(call.body, 'shopId'))
  }
  assert.deepStrictEqual(Object.keys(f.state.shop).sort(), ['shop_name', 'shop_profile_image'])
})

test('tenant epoch discards late session/branding/channels/addresses and old 401', async () => {
  const late = deferred()
  const f = make({ reply: call => call.params && call.params.shopId === 7 && call.path.endsWith('/session') ? late.promise : null })
  const before = f.snapshot()
  const first = f.dispatch('loadSession', { shopId: 7 })
  await Promise.resolve()
  const next = f.dispatch('loadSession', { shopId: 8 })
  await next
  late.resolve({ data: session(7) })
  await first
  assert.equal(f.state.shopId, 8)
  assert.equal(f.state.session, null)
  assert.equal(f.state.challenge, null)
  assert.equal(f.state.addresses.length, 0)
  assert.equal(f.state.shop.shop_name, 'Restaurant 8')
  assert.equal(f.snapshot(), before)
  const replies = deferred()
  const g = make({ reply: call => call.path.endsWith('/addresses') ? replies.promise : null })
  await g.dispatch('loadSession', { shopId: 7 })
  const pending = g.dispatch('loadAddresses')
  await Promise.resolve()
  await g.dispatch('resetForShop', 8)
  replies.resolve({ status: 401, error: 'CUSTOMER_SESSION_INVALID' })
  await pending
  assert.equal(g.state.error, null)
  assert.equal(g.state.shopId, 8)
  assert.equal(g.state.busy, false)
})

test('current customer 401 clears only customer state, late reads cannot restore book after logout', async () => {
  let fail = false
  const f = make({ reply: call => fail && call.path.endsWith('/addresses') ? { status: 401, error: 'CUSTOMER_SESSION_INVALID' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  const before = f.snapshot()
  fail = true
  await f.dispatch('loadAddresses')
  assert.equal(f.state.session, null)
  assert.equal(f.state.addresses.length, 0)
  assert.equal(f.state.challenge, null)
  assert.equal(f.snapshot(), before)
})

test('actual general persistence preserves raw staff storage bytes and expiry during customer activity', async () => {
  const f = make()
  const raw = f.storage.vuex
  const expiresAt = JSON.parse(raw).expiresAt
  const before = f.snapshot()
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  assert.equal(f.snapshot(), before)
  assert.equal(f.storage.vuex, raw)
  assert.equal(JSON.parse(f.storage.vuex).expiresAt, expiresAt)
  assert.ok(!Object.hasOwn(JSON.parse(f.storage.vuex).state, 'customer'))
})

test('wrong OTP retains challenge and valid customer session for another attempt', async () => {
  const f = make({ reply: call => call.path.endsWith('/verify') ? { status: 401, error: 'CUSTOMER_CODE_INVALID' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('requestCode', { channel: 'whatsapp', destination: '+33612345678', purpose: 'link' })
  const challenge = clone(f.state.challenge)
  await f.dispatch('linkIdentity', { challengeId: challenge.challengeId, code: '123456' })
  assert.deepStrictEqual(clone(f.state.session), session())
  assert.deepStrictEqual(clone(f.state.challenge), challenge)
  assert.equal(f.state.error.code, 'CUSTOMER_CODE_INVALID')
})

test('failed/pending provider status never claims sent or authenticates; failed code is not verified', async () => {
  for (const status of ['failed', 'pending']) {
    const f = make({ authenticated: false, reply: call => call.path.endsWith('/challenges') ? { data: {
      challengeId: '999', expiresAt: '2099-01-01T00:00:00Z', resendAfter: new Date(Date.now() + 60000).toISOString(), status,
    } } : null })
    await f.dispatch('loadSession', { shopId: 7 })
    const login = f.component('components/customer/CustomerCodeLogin.vue', {}, timers())
    login.destination = 'me@example.test'
    await login.sendCode()
    assert.ok(!login.deliveryMessage.includes('Code envoye'))
    assert.equal(f.state.session, null)
    if (status === 'failed') {
      login.code = '123456'
      const count = f.calls.length
      await login.verify()
      assert.equal(f.calls.length, count)
      assert.ok(login.displayError)
    }
    login.$destroy()
  }
})

test('late public shop/channels and successful address replies cannot cross shop or logout epoch', async () => {
  const old = deferred()
  let deferShop = true
  const f = make({ reply: call => deferShop && (call.path.includes('/shopInfo/') || call.path.endsWith('/channels')) ? old.promise : null })
  const pending = f.dispatch('loadSession', { shopId: 7 })
  await Promise.resolve()
  deferShop = false
  await f.dispatch('loadSession', { shopId: 8 })
  old.resolve({ data: { shop_name: 'Old restaurant', email: false, whatsapp: false } })
  await pending
  assert.equal(f.state.shop.shop_name, 'Restaurant 8')
  assert.equal(f.state.channels.email, true)
  const addressReply = deferred()
  const g = make({ reply: call => call.path.endsWith('/address-resolutions') ? addressReply.promise : null })
  await g.dispatch('loadSession', { shopId: 7 })
  const address = g.dispatch('resolveAddress', { addressId: savedAddress().id })
  await g.dispatch('logout')
  addressReply.resolve({ data: proof() })
  assert.equal(await address, null)
  assert.equal(g.state.session, null)
  assert.equal(g.state.addresses.length, 0)
})

test('late successful login does not emit or restore session after shop switch; verify double is blocked', async () => {
  const reply = deferred()
  const f = make({ authenticated: false, reply: call => call.path.endsWith('/verify') ? reply.promise : null })
  await f.dispatch('loadSession', { shopId: 7 })
  const login = f.component('components/customer/CustomerCodeLogin.vue', {}, timers())
  login.destination = 'me@example.test'
  await login.sendCode()
  login.code = '123456'
  let emits = 0
  login.$on('authenticated', () => { emits++ })
  const pending = login.verify()
  await login.verify()
  await Promise.resolve()
  assert.equal(f.calls.filter(call => call.path.endsWith('/verify')).length, 1)
  await f.dispatch('resetForShop', 8)
  reply.resolve({ data: session() })
  await pending
  assert.equal(emits, 0)
  assert.equal(f.state.session, null)
  login.$destroy()
})

test('channel configuration gates requests; provider fallback is explicit; conflict never merges', async () => {
  const f = make({ authenticated: false, reply: call => call.path.endsWith('/channels') ? { data: { email: false, whatsapp: false } } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  const count = f.calls.length
  await f.dispatch('requestCode', { channel: 'email', destination: 'me@example.test', purpose: 'login' })
  assert.equal(f.calls.length, count)
  assert.equal(f.state.challenge, null)
  const g = make({ reply: call => call.path.endsWith('/link/verify') ? { status: 409, error: 'CUSTOMER_IDENTITY_CONFLICT' } : null })
  await g.dispatch('loadSession', { shopId: 7 })
  await g.dispatch('loadAddresses')
  const before = clone(g.state.addresses)
  await g.dispatch('requestCode', { channel: 'whatsapp', destination: '+33612345678', purpose: 'link' })
  await g.dispatch('linkIdentity', { challengeId: g.state.challenge.challengeId, code: '123456' })
  assert.equal(g.state.error.code, 'CUSTOMER_IDENTITY_CONFLICT')
  assert.deepStrictEqual(clone(g.state.addresses), before)
  assert.ok(!g.state.error.message.includes('provider details'))
})

test('actual login SFC validates code/contact, uses server countdown, blocks doubles and safely focuses', async () => {
  const slow = deferred()
  let hold = false
  const f = make({ authenticated: false, reply: call => hold && call.path.endsWith('/challenges') ? slow.promise : null })
  await f.dispatch('loadSession', { shopId: 7 })
  const clock = timers()
  const login = f.component('components/customer/CustomerCodeLogin.vue', { mode: 'login' }, clock)
  login.channel = 'email'
  login.destination = ''
  const before = f.calls.length
  await login.sendCode()
  assert.equal(f.calls.length, before)
  login.destination = 'me@example.test'
  hold = true
  const pending = login.sendCode()
  await login.sendCode()
  await Promise.resolve()
  assert.equal(f.calls.length, before + 1)
  let focused = 0
  login.$refs.code = { focus() { focused++ }, select() {} }
  slow.resolve({ data: { challengeId: '9007199254740999', expiresAt: '2099-01-01T00:00:00Z', resendAfter: new Date(Date.now() + 93000).toISOString(), status: 'sent' } })
  await pending
  await Vue.nextTick()
  assert.ok(login.remainingSeconds >= 92 && login.remainingSeconds <= 93)
  assert.equal(focused, 1)
  const sent = f.calls.length
  await login.sendCode()
  assert.equal(f.calls.length, sent)
  for (const code of ['', '123', '12345x']) { login.code = code; await login.verify() }
  assert.equal(f.calls.length, sent)
  let authenticated = 0
  login.$on('authenticated', () => { authenticated++ })
  login.code = '123456'
  await login.verify()
  assert.equal(authenticated, 1)
  login.$destroy()
})

test('SFC provider errors expose another configured channel without sending it automatically', async () => {
  const f = make({ authenticated: false, reply: call => call.path.endsWith('/challenges') ? { status: 503, error: 'CUSTOMER_TRANSPORT_UNAVAILABLE' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  const login = f.component('components/customer/CustomerCodeLogin.vue', { mode: 'login' }, timers())
  login.channel = 'email'; login.destination = 'me@example.test'
  await login.sendCode()
  assert.equal(f.state.challenge, null)
  assert.equal(login.availableChannels.length, 2)
  assert.equal(f.calls.filter(call => call.path.endsWith('/challenges')).length, 1)
  login.chooseChannel('whatsapp')
  assert.equal(login.channel, 'whatsapp')
  assert.equal(f.calls.filter(call => call.path.endsWith('/challenges')).length, 1)
  login.$destroy()
})

test('address mutations use exact server DTO/proofs, stable labels and tenant CSRF', async () => {
  const f = make()
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  const row = f.state.addresses[0]
  await f.dispatch('saveAddress', { id: row.id, makeDefault: true })
  assert.equal(f.state.addresses[0].label, 'Adresse 3')
  await f.dispatch('saveAddress', { addressResolutionToken: 'fresh-server-proof', complement: 'Etage 4', instructions: 'Prive', makeDefault: false })
  assert.deepStrictEqual(f.state.addresses.map(row => row.label), ['Adresse 3', 'Adresse 4'])
  await f.dispatch('deleteAddress', row.id)
  assert.equal(f.state.addresses[0].label, 'Adresse 4')
  assert.ok(!JSON.stringify(f.state.addresses).includes('fresh-server-proof'))
  for (const call of f.calls.filter(call => call.path.includes('/customer/') && call.method !== 'get')) {
    assert.equal(call.params.shopId, 7)
    assert.equal(call.headers['X-CSRF-Token'], session().csrfToken)
    assert.ok(!Object.keys(call.body || {}).some(key => ['shopId', 'customerId', 'latitude', 'longitude'].includes(key)))
  }
})

test('shared SFC debounces 300ms, ignores stale postal replies and sends only server candidate IDs', async () => {
  const stale = deferred()
  let first = true
  const f = make({ reply: call => {
    if (!call.path.endsWith('/address-resolutions')) return null
    if (first) { first = false; return stale.promise }
    if (!call.body.candidateId) return { status: 422, error: 'DELIVERY_ADDRESS_INVALID', data: { candidates: [{ providerId: 'candidate-2', providerLabel: '12 rue de la Paix 75002 Paris' }] } }
    return { data: proof() }
  } })
  await f.dispatch('loadSession', { shopId: 7 })
  const clock = timers()
  const input = f.component('components/delivery/DeliveryAddressInput.vue', { resolver: payload => f.dispatch('resolveAddress', payload) }, clock)
  input.draft = { ...postal, complement: 'Secret apartment', instructions: 'Secret buzzer' }
  await Vue.nextTick()
  assert.equal(clock.pending.size, 1)
  assert.equal([...clock.pending.values()][0].delay, 300)
  const old = clock.flush()
  await Promise.resolve()
  input.draft.street = '14 rue de la Paix'
  await Vue.nextTick()
  stale.resolve({ data: proof() })
  await old
  assert.equal(input.resolution, null)
  await clock.flush()
  assert.equal(input.candidates.length, 1)
  await input.chooseCandidate(input.candidates[0])
  assert.equal(input.resolution.addressResolutionToken, 'fresh-server-proof')
  const calls = f.calls.filter(call => call.path.endsWith('/address-resolutions'))
  assert.deepStrictEqual(Object.keys(calls[0].body.address).sort(), ['city', 'country', 'postalCode', 'street'])
  assert.equal(calls[2].body.candidateId, 'candidate-2')
  assert.ok(!JSON.stringify(calls.map(call => call.body)).includes('Secret'))
  input.$destroy()
})

test('unchanged saved private edit and selection renew by addressId with zero new postal resolution', async () => {
  const f = make()
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  const clock = timers()
  const input = f.component('components/delivery/DeliveryAddressInput.vue', { value: savedAddress(), resolver: payload => f.dispatch('resolveAddress', payload) }, clock)
  assert.equal(f.calls.filter(call => call.path.endsWith('/address-resolutions')).length, 0)
  input.draft.instructions = 'Nouvel interphone prive'
  await Vue.nextTick()
  await clock.flush()
  assert.equal(input.resolution.instructions, 'Nouvel interphone prive')
  assert.deepStrictEqual(f.calls.find(call => call.path.endsWith('/address-resolutions')).body, { addressId: savedAddress().id })
  const book = f.component('components/customer/CustomerAddressBook.vue')
  let selected
  book.$on('select', value => { selected = value })
  await book.selectAddress(savedAddress())
  assert.equal(selected.addressId, savedAddress().id)
  assert.equal(selected.addressResolutionToken, 'fresh-server-proof')
  assert.ok(!Object.hasOwn(selected, 'price'))
  assert.ok(f.calls.filter(call => call.path.endsWith('/address-resolutions')).every(call => Object.keys(call.body).join() === 'addressId'))
  input.$destroy(); book.$destroy()
})

test('addressbook SFC saves private edits using fresh stored proof, confirms deletion and keeps labels', async () => {
  const f = make({ reply: call => call.path.endsWith('/address-resolutions') && call.body.address
    ? { status: 503, error: 'DELIVERY_GEOCODING_UNAVAILABLE' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  const book = f.component('components/customer/CustomerAddressBook.vue')
  book.editAddress(f.state.addresses[0])
  const input = f.component('components/delivery/DeliveryAddressInput.vue', {
    value: book.selected, resolver: book.resolveAddress,
  }, timers())
  book.$refs.addressInput = input
  input.draft.instructions = 'Autre consigne privee'
  await Vue.nextTick()
  await book.save()
  assert.equal(book.editing, false)
  assert.equal(f.state.addresses[0].addressSnapshot.instructions, 'Autre consigne privee')
  const patch = f.calls.find(call => call.method === 'patch')
  assert.equal(patch.body.addressResolutionToken, 'fresh-server-proof')
  assert.equal(patch.body.instructions, 'Autre consigne privee')
  assert.ok(f.calls.filter(call => call.path.endsWith('/address-resolutions')).every(call => call.body.addressId))
  assert.equal(f.state.addresses[0].label, 'Adresse 3')
  book.confirmDelete = savedAddress().id
  await book.removeAddress(book.confirmDelete)
  assert.equal(f.state.addresses.length, 0)
  assert.equal(book.confirmDelete, null)
  input.$destroy(); book.$destroy()
})

test('Google saved private edits need no new postal proof or provider call', async () => {
  const f = make({ reply: call => call.path.endsWith('/address-resolutions') ? { status: 503, error: 'DELIVERY_GEOCODING_UNAVAILABLE' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  f.state.addresses[0].addressSnapshot = { provider: 'google_places', placeId: 'saved-place', instructions: 'Old private detail' }
  const book = f.component('components/customer/CustomerAddressBook.vue')
  book.editAddress(f.state.addresses[0])
  const input = f.component('components/delivery/DeliveryAddressInput.vue', { value: book.selected, resolver: book.resolveAddress }, timers())
  book.$refs.addressInput = input
  try {
    input.draft.instructions = 'New private detail'
    await Vue.nextTick()
    await book.save()
    assert.equal(book.editing, false)
    assert.equal(f.calls.some(call => call.path.endsWith('/address-resolutions')), false)
    const patch = f.calls.find(call => call.method === 'patch')
    assert.equal(patch.body.instructions, 'New private detail')
    assert.equal(Object.hasOwn(patch.body, 'addressResolutionToken'), false)
  } finally { input.$destroy(); book.$destroy() }
})

test('link SFC emits identity-linked only after HTTP success; conflict retains its verified book', async () => {
  let conflict = true
  const f = make({ reply: call => conflict && call.path.endsWith('/link/verify')
    ? { status: 409, error: 'CUSTOMER_IDENTITY_CONFLICT' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  await f.dispatch('loadAddresses')
  const book = clone(f.state.addresses)
  const login = f.component('components/customer/CustomerCodeLogin.vue', { mode: 'link' }, timers())
  login.chooseChannel('whatsapp'); login.destination = '+33612345678'
  await login.sendCode()
  let linked = 0
  login.$on('identity-linked', () => { linked++ })
  login.code = '123456'
  await login.verify()
  assert.equal(linked, 0)
  assert.equal(f.state.error.code, 'CUSTOMER_IDENTITY_CONFLICT')
  assert.deepStrictEqual(clone(f.state.addresses), book)
  conflict = false
  await login.verify()
  assert.equal(linked, 1)
  assert.deepStrictEqual(clone(f.state.addresses), book)
  login.$destroy()
})

test('shared input discards late error on new draft and context change without poisoning account errors', async () => {
  const late = deferred()
  const f = make({ reply: call => call.path.endsWith('/address-resolutions') ? late.promise : null })
  await f.dispatch('loadSession', { shopId: 7 })
  const clock = timers()
  const input = f.component('components/delivery/DeliveryAddressInput.vue', { resolver: value => f.dispatch('resolveAddress', value) }, clock)
  input.draft = { ...postal, complement: '', instructions: '' }
  await Vue.nextTick()
  const pending = clock.flush()
  input.draft.street = '14 rue de la Paix'
  await Vue.nextTick()
  input.contextKey = 8
  await Vue.nextTick()
  late.resolve({ status: 503, error: 'DELIVERY_GEOCODING_UNAVAILABLE' })
  await pending
  assert.equal(input.error, '')
  assert.equal(input.resolution, null)
  assert.equal(f.state.error, null)
  assert.equal(clock.pending.size, 0)
  input.$destroy()
})

test('failed discovery never enables missing channels, retry recovers, wrong-shop session is never displayed', async () => {
  let broken = true
  const f = make({ reply: call => {
    if (broken && call.path.endsWith('/channels')) return { status: 503, error: 'CUSTOMER_AUTH_UNAVAILABLE' }
    if (call.path.endsWith('/session')) return { data: session(8) }
    return null
  } })
  const before = f.snapshot()
  await f.dispatch('loadSession', { shopId: 7 })
  assert.equal(f.state.session, null)
  assert.equal(f.state.channelsLoaded, false)
  const login = f.component('components/customer/CustomerCodeLogin.vue', {}, timers())
  assert.equal(login.availableChannels.length, 0)
  broken = false
  await login.retryChannels()
  assert.equal(login.availableChannels.length, 2)
  assert.equal(f.snapshot(), before)
  login.$destroy()
})

test('guest exit stays available when public branding fails', async () => {
  const f = make({ authenticated: false, reply: call => call.path.includes('/shopInfo/')
    ? { status: 503, error: 'CUSTOMER_UNAVAILABLE' } : null })
  await f.dispatch('loadSession', { shopId: 7 })
  const page = f.component('pages/compte/index.vue')
  assert.equal(page.guestRoute, '/click-and-collect/7/Restaurant')
  page.$destroy()
})

test('account route uses independent customer layout without auth/bootstrap and reacts to shop query', async () => {
  const f = make()
  const options = load('pages/compte/index.vue').default
  assert.equal(options.layout, 'customer')
  assert.ok(!options.middleware)
  const page = new Vue({ ...options, store: f.store })
  page.$route = { query: { shopId: '7' } }
  await page.openShop('7')
  assert.equal(f.state.shopId, 7)
  await page.openShop('8')
  assert.equal(f.state.shopId, 8)
  assert.equal(f.state.session, null)
  await page.openShop('99999999999999999999999999999999')
  assert.equal(f.state.shopId, null)
  assert.equal(page.opening, false)
  const layout = load('layouts/customer.vue').default
  assert.ok(!layout.middleware)
  page.$destroy()
})
