/* eslint-disable no-console */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
const Vue = require('vue')
const Vuex = require('vuex')
Vue.use(Vuex)
Vue.config.productionTip = false
const root = path.resolve(__dirname, '..')
function load(relative, globals = {}) {
  let filename = path.join(root, relative)
  if (!path.extname(filename)) filename += '.js'
  let source = fs.readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) {
    const sfc = require('vue-template-compiler').parseComponent(source)
    assert.deepEqual(require('vue-template-compiler').compile(sfc.template?.content || '').errors, [])
    source = sfc.script.content
  }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require', 'setTimeout', 'clearTimeout'])(module, module.exports,
    name => name === './delivery' ? { buildDeliveryApi: () => ({}) } : name.startsWith('@/helpers/clientPhone') ? load('helpers/clientPhone.js', globals)
      : name.startsWith('@/') ? {} : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name),
    globals.setTimeout || setTimeout, globals.clearTimeout || clearTimeout)
  return module.exports
}
const deferred = () => { let finish; const promise = new Promise(resolve => { finish = resolve }); return { promise, finish } }
const member = { status: 'resolved', phone: '+33612345678', created: false, customer: { id: '12', shopId: 7, name: 'Alice' }, loyalty: { available: 37 } }
function fixture(reply = () => member) {
  const module = load('store/clientPhone.js')
  const state = module.state(); const calls = []
  const rootState = { authenticated: true, users: { user: { shopid: 7, id: 2, access: 0, session_subject: 'staff', token: 'staff' } } }
  const context = { state, rootState, commit: (name, value) => module.mutations[name](state, value) }
  const host = { $deliveryApi: { request: async req => { calls.push(req); return { data: { data: await reply(req) } } } },
    $customerApi: { request: async req => { calls.push(req); return await reply(req) } } }
  return { state, rootState, calls, dispatch: (name, input) => module.actions[name].call(host, context, input) }
}
test('phone gate accepts full FR and international, rejects incomplete and malformed input', () => {
  const { completePhone } = load('helpers/clientPhone.js')
  for (const phone of ['0612345678', '06 12 34 56 78', '+33 6 12 34 56 78', '0033612345678', '+44 7700 900123', '+352261234', '+298211000']) assert(completePhone(phone), phone)
  for (const phone of ['', '06', '061234567', '+33 6 12', '+352', '+29821', '+000123456', 'abc0612345678', '0000000000', '+330612345678', '+336123456789', '++33612345678']) assert.equal(completePhone(phone), '', phone)
})
test('staff profile lookup uses existing transport and creates no loyalty session', async () => {
  const f = fixture(); await f.dispatch('resolve', { phone: '0612345678', name: 'Alice' })
  assert.equal(f.calls[0].path, '/clients/resolve-phone'); assert.deepEqual(f.calls[0].body, { phone: '+33612345678', countryCode: 'FR', name: 'Alice' })
  assert.equal(f.state.result.loyalty.available, 37); assert.equal(f.state.busy, false)
  assert.equal(f.state.phoneSession, undefined)
  const profile = fixture(() => ({ ...member, created: true, loyalty: null })); await profile.dispatch('resolve', { phone: '0612345678' })
  assert.equal(load('helpers/clientPhone.js').availablePoints(profile.state.result), 0)
})
test('invalid input clears old points without a request', async () => {
  const f = fixture(); await f.dispatch('resolve', { phone: '0612345678' }); await f.dispatch('resolve', { phone: '06' })
  assert.equal(f.calls.length, 1); assert.equal(f.state.result, null)
})
test('ambiguity has no points, and invalid backend input cannot leave a previous result', async () => {
  const ambiguous = fixture(() => ({ status: 'ambiguous', phone: '+33612345678', customer: null, loyalty: null }))
  await ambiguous.dispatch('resolve', { phone: '0612345678' }); assert.equal(load('helpers/clientPhone.js').availablePoints(ambiguous.state.result), null)
  const invalid = fixture(() => { throw Object.assign(new Error('Invalid'), { response: { data: { error: 'CUSTOMER_PHONE_INVALID' } } }) })
  await invalid.dispatch('resolve', { phone: '+49301234567' }); assert.equal(invalid.state.result, null); assert.match(invalid.state.error, /numéro de téléphone valide/)
  for (const user of [{ shopid: 7, access: 0, session_subject: 'customer' }, { shopid: 7, access: null, session_subject: 'staff' }, { shopid: 7, access: 3, session_subject: 'service_point', order_source: 'borne' }]) {
    const denied = fixture(); denied.rootState.users.user = user
    await denied.dispatch('resolve', { phone: '0612345678' }); assert.equal(denied.calls.length, 0)
  }
})
test('QR lookup uses bearer transport without customer cookies and failures do not clear auth', async () => {
  const f = fixture(() => { throw Object.assign(new Error('No'), { status: 401 }) })
  f.rootState.users.user = { shopid: 7, access: 2, session_subject: 'service_point', order_source: 'table_qr', token: 'table' }
  await f.dispatch('resolve', { phone: '0612345678' })
  assert.equal(f.calls[0].path, '/clients/resolve-phone'); assert.equal(f.calls[0].credentials, undefined); assert.equal(f.rootState.authenticated, true)
})
test('actual QR transport sends only its bearer with cookies omitted', async () => {
  const calls = []; const { buildDeliveryApi } = load('store/delivery.js')
  const previous = global.localStorage
  global.localStorage = { getItem: key => key === 'token' ? 'signed-table' : null }
  try {
    const api = buildDeliveryApi({ baseURL: 'https://fixture.invalid', adapter: config => {
      calls.push(config); return Promise.resolve({ status: 200, data: { data: { ...member, customer: undefined, loyalty: { available: 37 } } } })
    } })
    await api.request({ method: 'post', path: '/clients/resolve-phone', body: { phone: '+33612345678' } })
    assert.equal(calls[0].headers.Authorization, 'Bearer signed-table'); assert.equal(calls[0].withCredentials, false)
    assert.equal(calls[0].headers['X-CSRF-Token'], undefined); assert.equal(calls[0].url, '/baseurl/api/v1/clients/resolve-phone')
  } finally { global.localStorage = previous }
})
test('rapid input, reset, restaurant and identity changes reject stale replies', async () => {
  const pending = []; const f = fixture(() => { const d = deferred(); pending.push(d); return d.promise })
  const a = f.dispatch('resolve', { phone: '0612345678' }); const b = f.dispatch('resolve', { phone: '0676543210' })
  pending[0].finish(member); assert.equal(await a, null); assert.equal(f.state.result, null)
  pending[1].finish({ ...member, phone: '+33676543210' }); await b; assert.equal(f.state.result.phone, '+33676543210')
  for (const change of [() => f.dispatch('reset'), () => { f.rootState.users.user.shopid++ }, () => { f.rootState.users.user.id++ }]) {
    const request = f.dispatch('resolve', { phone: '0612345678' }); change(); pending.at(-1).finish(member)
    assert.equal(await request, null); assert.equal(f.state.result, null); assert.equal(f.state.busy, false)
  }
})
test('real Vue phone watcher clears immediately, debounces 400ms and cancels on destroy', async () => {
  let timer; let delay; const calls = []
  const { phoneLookupMixin } = load('helpers/clientPhone.js', { setTimeout: (fn, ms) => { timer = fn; delay = ms; return 1 }, clearTimeout: () => { timer = null } })
  const store = { state: { users: { user: { shopid: 7, id: 2 } }, clientPhone: { result: member } },
    dispatch: (name, payload) => { calls.push([name, payload]); return Promise.resolve(member) } }
  const input = new Vue({ mixins: [phoneLookupMixin], data: () => ({ phone: '', enabled: true }),
    computed: { phoneLookupInput() { return this.phone }, phoneLookupEnabled() { return this.enabled } }, beforeCreate() { this.$store = store } })
  input.phone = '0612345678'; assert.equal(calls.at(-1)[0], 'clientPhone/reset'); assert.equal(delay, 400)
  input.phone = '06'; assert.equal(timer, null); assert(!calls.some(call => call[0] === 'clientPhone/resolve'))
  input.phone = '0612345678'; await timer(); assert.equal(calls.at(-1)[0], 'clientPhone/resolve')
  input.phone = '0676543210'; input.$destroy(); assert.equal(timer, null); assert.equal(calls.at(-1)[0], 'clientPhone/reset')
})
test('client summary requires authenticated same-shop staff, including paid orders', () => {
  const options = load('pages/orders/detail/_id.vue').default
  const ctx = { $store: { state: { authenticated: true, users: { user: { shopid: 7, access: 4, session_subject: 'staff' } } } }, orderSummary: { shopid: 7, payment_status: 'paid', clientProfile: { customer: member.customer, loyalty: member.loyalty } } }
  assert.equal(options.computed.clientProfile.call(ctx), ctx.orderSummary.clientProfile)
  ctx.$store.state.users.user.shopid = 8; assert.equal(options.computed.clientProfile.call(ctx), null)
  ctx.$store.state.users.user = { shopid: 7, access: 2, session_subject: 'service_point' }; assert.equal(options.computed.clientProfile.call(ctx), null)
})

test('paid and archived staff details retain the order contact when canonical contact fields are empty', async () => {
  const source = fs.readFileSync(path.join(root, 'pages/orders/detail/_id.vue'), 'utf8')
  const template = source.match(/<v-card v-if="clientProfile"[\s\S]*?<\/v-card>/)[0]
  const compiled = require('vue-template-compiler').compile(template)
  assert.deepEqual(compiled.errors, [])
  const options = load('pages/orders/detail/_id.vue').default
  const renderer = require('vue-server-renderer').createRenderer()
  for (const archived of [false, true]) {
    for (const hasContact of [false, true]) {
      const profile = { customer: { id: '12', shopId: 7, name: hasContact ? 'Canonical name' : '', phone: hasContact ? '+33611111111' : '', email: 'contact@example.invalid' }, loyalty: null }
      const before = JSON.stringify(profile)
      const order = { shopid: 7, customer: 'Order contact', phone: '+33622222222', payment_status: 'paid', archived, clientProfile: profile }
      const store = { state: { authenticated: true, users: { user: { shopid: 7, access: 4, session_subject: 'staff' } } } }
      const page = new Vue({ data: () => ({ orderSummary: order }), computed: { clientProfile: options.computed.clientProfile },
        beforeCreate() { this.$store = store }, render: vm.compileFunction(compiled.render, []), staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])) })
      const html = await renderer.renderToString(page)
      assert(html.includes(hasContact ? 'Canonical name' : 'Order contact'))
      assert(html.includes(hasContact ? '+33611111111' : '+33622222222'))
      assert(html.includes('contact@example.invalid'))
      assert.equal(JSON.stringify(profile), before, 'display fallbacks do not update the canonical profile')
      page.$destroy()
    }
  }
})
test('client lookup is never persisted and old caches are sanitized', () => {
  const persisted = require('../helpers/persistedState')
  assert.equal(persisted.sanitizePersistedState({ clientPhone: { result: member } }).clientPhone, undefined)
  assert.equal(persisted.parsePersistedState(JSON.stringify({ clientPhone: { result: member } })).clientPhone, undefined)
})
test('QR phone edits clear loyalty proofs, rewards and ignore a late enrollment without changing accepted checkout recovery', async () => {
  const loyalty = load('store/loyalty.js'); const phone = load('store/clientPhone.js')
  const pending = deferred()
  const store = new Vuex.Store({ state: { authenticated: true }, modules: {
    users: { state: { user: { shopid: 7, access: 2, session_subject: 'service_point', order_source: 'table_qr', token: 'table' } } },
    loyalty: { ...loyalty, state: { ...loyalty.state(), phoneShopId: 7, member: { id: 'old' }, phoneSession: { shopId: 7, memberId: 'old' }, program: { enabled: true }, canEnroll: true } },
    clientPhone: { ...phone, state: phone.state() },
    cart: { state: { clientOrderStatus: 'stripe_prepared', clientOrderPayload: { phone: '0612345678', phoneMemberId: 'old', paymentIntentId: 'pi_accepted' } } },
  } })
  store.$customerApi = { request: () => pending.promise }
  const request = store.dispatch('loyalty/enrollPhone', { shopId: 7, phone: '0612345678' })
  const options = load('pages/cart.vue').default; let removed = 0
  const ctx = { $store: store, $refs: { loyaltyCheckout: { removeReward() { removed++ } } }, phoneLookupEnabled: true, checkoutShopId: 7, loyaltyReward: { rewardId: 'old' } }
  const before = JSON.stringify(store.state.cart)
  options.methods.invalidatePhoneLoyalty.call(ctx)
  assert.equal(store.state.loyalty.phoneSession, null); assert.equal(store.state.loyalty.member, null); assert.equal(ctx.loyaltyReward, null); assert.equal(removed, 1)
  pending.finish({ member: { id: 'old' }, session: { shopId: 7, memberId: 'old' } })
  assert.equal(await request, null); assert.equal(store.state.loyalty.phoneSession, null); assert.equal(JSON.stringify(store.state.cart), before)
  assert.equal(store.state.loyalty.canEnroll, true)
})
test('cashier lookup autofills only a blank name', () => {
  const { methods } = load('pages/menus.vue').default
  const ctx = { expressCustomer: '' }; methods.onClientPhoneResolved.call(ctx, member); assert.equal(ctx.expressCustomer, 'Alice')
  ctx.expressCustomer = 'Nom manuel'; methods.onClientPhoneResolved.call(ctx, member); assert.equal(ctx.expressCustomer, 'Nom manuel')
})
test('QR loyalty explicitly enrolls the checkout number without another number field or automatic enrollment', async () => {
  const options = load('components/loyalty/LoyaltyCheckout.vue').default; const calls = []; const events = []
  const ctx = { ...options.data(), phone: '06 12 34 56 78', shopId: 7, disabled: false, submitting: false, marketingConsent: false, loyalty: { busy: false },
    $store: { dispatch: (...args) => { calls.push(args); return Promise.resolve({ id: 'new' }) } }, $emit: (...args) => events.push(args), onJoined: options.methods.onJoined }
  await options.methods.enrollCheckoutPhone.call(ctx)
  assert.deepEqual(calls, [['loyalty/enrollPhone', { shopId: 7, phone: '06 12 34 56 78', countryCode: 'FR', marketingConsent: false }]])
  assert.equal(ctx.joined, true)
  const source = fs.readFileSync(path.join(root, 'components/loyalty/LoyaltyCheckout.vue'), 'utf8')
  assert.match(source, /LoyaltyPhoneAccess v-if="phone == null/)
  assert.match(source, /v-if="!hidePoints"/)
})
test('QR metadata never adopts a previous member cookie and ignores a restaurant change', async () => {
  const options = load('components/loyalty/LoyaltyCheckout.vue').default
  for (const changeShop of [false, true]) {
    const pending = deferred(); const calls = []
    const ctx = { ...options.data(), phone: '0612345678', shopId: 7, loyalty: {},
      $store: { state: { users: { user: { shopid: 7, token: 'table' } } }, dispatch: (...args) => { calls.push(args) }, commit: (...args) => { calls.push(args) } },
      $customerApi: { request: () => pending.promise } }
    const request = options.methods.initialize.call(ctx); await Promise.resolve()
    if (changeShop) ctx.$store.state.users.user.shopid = 8
    pending.finish({ member: { id: 'previous-phone' }, session: { memberId: 'previous-phone' }, program: { enabled: true }, canEnroll: true })
    await request
    assert(!calls.some(call => call[0] === 'loyalty/loadPhoneMember' || call[0] === 'loyalty/PHONE_RESULT'))
    assert.equal(calls.filter(call => call[0] === 'loyalty/MEMBER').length, changeShop ? 0 : 1)
    if (!changeShop) assert.deepEqual(calls.find(call => call[0] === 'loyalty/MEMBER')[1], { member: undefined, program: { enabled: true }, canEnroll: true })
  }
})

test('editing the QR phone during metadata loading retains programme enrollment without adopting stale proof', async () => {
  const options = load('components/loyalty/LoyaltyCheckout.vue').default
  const loyalty = load('store/loyalty.js')
  const pending = deferred(); const calls = []
  const store = new Vuex.Store({ state: { authenticated: true, cart: {
    clientOrderToken: 'accepted-checkout', clientOrderStatus: 'uncertain',
    clientOrderPayload: { phone: '0612345678', customerContextSubject: 'loyalty', customerContextShopId: 7, customerContextId: '12', loyaltyContextMemberId: 'old' },
  } }, modules: {
    users: { state: { user: { shopid: 7, access: 2, session_subject: 'service_point', order_source: 'table_qr', token: 'table' } } },
    loyalty: { ...loyalty, state: loyalty.state() },
  } })
  const program = { enabled: true, version: 1 }
  const currentMember = { id: 'new', available: 0, rewards: [], program }
  const api = { request: input => {
    calls.push(input)
    return calls.length === 1 ? pending.promise : Promise.resolve({ member: currentMember, session: { subject: 'loyalty', shopId: 7, customerId: '22', memberId: 'new', csrfToken: 'new-proof' }, program, canEnroll: true })
  } }
  store.$customerApi = api
  const checkout = new Vue({ ...options, propsData: { phone: '0612345678', shopId: 7 }, beforeCreate() { this.$store = store; this.$customerApi = api } })
  const request = checkout.initialize()
  checkout.phone = '0676543210'
  const cart = load('pages/cart.vue').default
  cart.methods.invalidatePhoneLoyalty.call({ $store: store, $refs: {}, phoneLookupEnabled: true, checkoutShopId: 7 })
  // Returning to the original text must not revive proof invalidated by either edit.
  checkout.phone = '0612345678'
  cart.methods.invalidatePhoneLoyalty.call({ $store: store, $refs: {}, phoneLookupEnabled: true, checkoutShopId: 7 })
  pending.finish({ member: { id: 'old', available: 37, rewards: [] }, session: { subject: 'loyalty', shopId: 7, customerId: '12', memberId: 'old', csrfToken: 'stale-proof' }, program, canEnroll: true })
  await request
  assert.deepEqual(JSON.parse(JSON.stringify(store.state.loyalty.program)), program)
  assert.equal(store.state.loyalty.canEnroll, true)
  assert.equal(store.state.loyalty.member, null)
  assert.equal(store.state.loyalty.phoneSession, null)
  assert.equal(calls.length, 1, 'metadata loading never enrolls automatically')
  checkout.identify()
  await checkout.enrollCheckoutPhone()
  assert.equal(calls[1].body.phone, '0612345678')
  assert.equal(store.state.loyalty.member.id, 'new')
  assert.equal(checkout.joined, true)
  checkout.$destroy()
})
test('real Vue QR input invalidates immediately and a shop switch cannot publish the old lookup', async () => {
  let timer
  const pending = deferred(); const module = load('store/clientPhone.js')
  const loyalty = load('store/loyalty.js')
  const store = new Vuex.Store({ state: { authenticated: true }, modules: {
    users: { state: { user: { shopid: 7, access: 2, session_subject: 'service_point', order_source: 'table_qr', token: 'table' } } },
    clientPhone: { ...module, state: module.state() }, loyalty: { ...loyalty, state: { ...loyalty.state(), member: { id: 'old' }, phoneSession: { shopId: 7, memberId: 'old' } } },
  } })
  store.$deliveryApi = { request: () => pending.promise }
  const page = load('pages/cart.vue').default
  const { phoneLookupMixin } = load('helpers/clientPhone.js', { setTimeout: fn => { timer = fn; return 1 }, clearTimeout() { timer = null } })
  const input = new Vue({ mixins: [phoneLookupMixin], data: () => ({ formuser: { phone: '' }, loyaltyReward: { rewardId: 'old' }, isDelivery: false, isSiteCheckout: false, isOrderEditActive: false }),
    computed: { phoneLookupInput: page.computed.phoneLookupInput, phoneLookupEnabled: page.computed.phoneLookupEnabled, checkoutShopId() { return this.$store.state.users.user.shopid } },
    beforeCreate() { this.$store = store },
    methods: { invalidatePhoneLoyalty: page.methods.invalidatePhoneLoyalty } })
  input.formuser.phone = '0612345678'
  assert.equal(store.state.loyalty.phoneSession, null); assert.equal(input.loyaltyReward, null)
  const request = timer(); store.state.users.user.shopid = 8
  assert.equal(input.clientPhonePoints, null)
  pending.finish({ data: { data: member } }); await request
  assert.equal(input.clientPhonePoints, null); assert.equal(store.state.clientPhone.result, null)
  input.$destroy()
})
test('main navigation keeps Clients et fidélité and hides legacy loyalty, stock and product internals', () => {
  const list = load('helpers/listdashboard.js').default.computed.list.call({ shopId: 7, shop_name: 'Restaurant' })
  for (const routeName of ['fidelite', 'stocks', 'categories', 'customizations']) assert.equal(list.find(row => row.routeName === routeName).hiddenFromMainNavigation, true)
  assert.equal(list.find(row => row.routeName === 'clients').hiddenFromMainNavigation, undefined)
  assert.match(fs.readFileSync(path.join(root, 'pages/fidelite.vue'), 'utf8'), /\/clients\?tab=programme/)
})
