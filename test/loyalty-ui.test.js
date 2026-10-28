const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '..')
function load(relative) {
  const filename = path.join(root, relative)
  let source = fs.readFileSync(filename, 'utf8')
  if (relative.endsWith('.vue')) source = require('vue-template-compiler').parseComponent(source).script.content
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require'])(module, module.exports,
    name => name.startsWith('@/') ? {} : name === './delivery' ? { buildDeliveryApi: () => ({}) } : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name))
  return module.exports
}
function fixture(reply) {
  const module = load('store/loyalty.js')
  const state = module.state()
  const calls = []
  const rootState = { customer: { shopId: 7, epoch: 1, session: { shopId: 7, customerId: '12', csrfToken: 'csrf' } },
    users: { user: { id: 2, shopid: 7, access: 0, session_subject: 'staff' } }, cart: { items: [{ id: 9 }], table: 'keep' } }
  const commit = (name, data) => {
    if (name === 'customer/PRIVATE_RESET') { rootState.customer.session = null; rootState.customer.epoch++; return }
    module.mutations[name](state, data)
  }
  const context = { state, rootState, commit }
  const host = { $customerApi: { request: request => { calls.push(request); return Promise.resolve(reply ? reply(request) : { id: 'member', balance: 20 }) } },
    $deliveryApi: { request: request => { calls.push(request); return Promise.resolve({ data: { success: true, data: { id: 'member', balance: 20 } } }) } } }
  const dispatch = (name, payload) => module.actions[name].call(host, context, payload)
  return { state, rootState, calls, dispatch }
}
test('personal loyalty retains cart/table and uses customer csrf without staff credentials', async () => {
  const f = fixture()
  const before = JSON.stringify(f.rootState.cart)
  await f.dispatch('loadMember')
  assert.equal(f.calls[0].path, '/customer/loyalty')
  assert.equal(f.calls[0].shopId, 7)
  assert.equal(f.calls[0].csrfToken, 'csrf')
  assert.equal(JSON.stringify(f.rootState.cart), before)
  assert.equal(f.state.member.id, 'member')
})
test('late replies cannot restore another restaurants member', async () => {
  let finish
  const f = fixture(() => new Promise(resolve => { finish = resolve }))
  const pending = f.dispatch('loadMember')
  f.rootState.customer.shopId = 8
  f.rootState.customer.epoch++
  finish({ id: 'wrong-restaurant', balance: 400 })
  assert.equal(await pending, null)
  assert.equal(f.state.member, null)
})
test('scan is read-only and spending requires explicit confirmation', async () => {
  const f = fixture()
  await f.dispatch('lookup', 'a'.repeat(64))
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].path, '/loyalty/lookup')
  await f.dispatch('reserve', { orderId: 9, rewardId: 'reward', confirmed: false })
  assert.equal(f.calls.length, 1)
  await f.dispatch('reserve', { orderId: 9, rewardId: 'reward', confirmed: true })
  assert.equal(f.calls[1].body.confirmed, true)
})
test('saving a displayed program never submits server-owned version metadata', async () => {
  const f = fixture()
  await f.dispatch('saveProgram', { name: 'Restaurant', version: 3, enabled: true, pointsPerEuro: 2 })
  assert.equal(f.calls[0].body.version, undefined)
  assert.equal(f.calls[0].body.name, 'Restaurant')
})
test('checkout reward emits spending intent only after its explicit dialog confirmation', () => {
  const { methods } = load('components/loyalty/LoyaltyCheckout.vue').default
  const events = []
  const context = { confirming: false, disabled: false, chosenReward: { id: 'reward', points: 15 }, $emit: (...event) => events.push(event) }
  methods.confirmReward.call(context)
  assert.equal(events.length, 0)
  context.confirming = true
  methods.confirmReward.call(context)
  assert.equal(events[0][0], 'reward')
  assert.deepEqual(events[0][1], { rewardId: 'reward', confirmed: true })
  methods.removeReward.call(context)
  assert.equal(events[1][1], null)
})
test('unauthenticated personal request makes no loyalty call', async () => {
  const f = fixture()
  f.rootState.customer.session = null
  assert.equal(await f.dispatch('enroll'), null)
  assert.equal(f.calls.length, 0)
})
test('expired loyalty session returns customer to login without changing cart', async () => {
  const f = fixture(() => Promise.reject(Object.assign(new Error('Expired'), { status: 401 })))
  const cart = JSON.stringify(f.rootState.cart)
  await f.dispatch('loadMember')
  assert.equal(f.rootState.customer.session, null)
  assert.equal(JSON.stringify(f.rootState.cart), cart)
})
test('loyalty private state is excluded from browser persistence', () => {
  const { sanitizePersistedState } = require('../helpers/persistedState')
  assert.equal(sanitizePersistedState({ loyalty: { member: { qr: 'private' } }, cart: { table: 4 } }).loyalty, undefined)
})
test('new loyalty screens compile in Vue 2 and wallet entry does not recover an old table', () => {
  const compiler = require('vue-template-compiler')
  for (const relative of ['pages/compte/fidelite.vue', 'pages/fidelite.vue', 'components/loyalty/LoyaltyCheckout.vue', 'components/loyalty/LoyaltyPos.vue']) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8')
    const sfc = compiler.parseComponent(source)
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [], relative)
  }
  const page = fs.readFileSync(path.join(root, 'pages/compte/fidelite.vue'), 'utf8')
  assert.match(page, /Scanner le QR de votre table/)
  assert.doesNotMatch(page, /localStorage|selectedTable|cart\//)
})
