const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const Vue = require('vue')
const Vuex = require('vuex')
const createPersistedState = require('vuex-persistedstate')
const {
  PERSISTED_STATE_TTL,
  parsePersistedState,
  sanitizePersistedState,
  serializePersistedState,
} = require('../helpers/persistedState')

const now = new Date('2026-06-02T12:00:00.000Z').getTime()

assert.strictEqual(PERSISTED_STATE_TTL, 24 * 60 * 60 * 1000)

assert.deepStrictEqual(
  sanitizePersistedState({
    authenticated: true,
    staticURL: 'https://api.smarteat.fr',
    users: { user: { id: 1 } },
  }),
  {
    authenticated: true,
    users: { user: { id: 1 } },
  }
)

const serialized = serializePersistedState(
  {
    staticURL: 'https://api.smarteat.fr',
    cart: { totalCart: 12 },
  },
  now
)
const saved = JSON.parse(serialized)

assert.strictEqual(saved.expiresAt, now + PERSISTED_STATE_TTL)
assert.deepStrictEqual(saved.state, { cart: { totalCart: 12 } })

assert.deepStrictEqual(parsePersistedState(serialized, now), {
  cart: { totalCart: 12 },
})

assert.strictEqual(
  parsePersistedState(serialized, now + PERSISTED_STATE_TTL + 1),
  undefined
)

assert.deepStrictEqual(
  parsePersistedState(
    JSON.stringify({
      staticURL: 'https://api.smarteat.fr',
      cart: { totalCart: 8 },
    }),
    now
  ),
  {
    cart: { totalCart: 8 },
  }
)

assert.strictEqual(parsePersistedState('not json', now), undefined)

const terminalState = {
  readers: [{ id: 7, assignedUserId: 4 }],
  currentReader: { id: 7 },
  activePayment: { id: 13 },
  error: { message: 'Do not keep this across users' },
}
const persisted = {
  authenticated: true,
  users: { user: { id: 4, token: 'saved-session' } },
  cart: { totalCart: 12 },
  stripeTerminal: terminalState,
  customer: { session: { csrfToken: 'private' }, addresses: [{ instructions: 'private' }] },
  delivery: { quote: { addressSnapshot: { instructions: 'private' } } },
  courier: { missions: [{ addressSnapshot: { instructions: 'private' } }] },
}
const expectedPersisted = {
  authenticated: true,
  users: persisted.users,
  cart: persisted.cart,
}
assert.deepStrictEqual(sanitizePersistedState(persisted), expectedPersisted)
assert.deepStrictEqual(parsePersistedState(serializePersistedState(persisted, now), now), expectedPersisted)
assert.deepStrictEqual(parsePersistedState(JSON.stringify(persisted), now), expectedPersisted)

const googleProof = Buffer.from(JSON.stringify({ kind: 'address', addressSnapshot: {
  provider: 'google_places', placeId: 'fixture-place', latitude: 48.868, longitude: 2.306,
} })).toString('base64url') + '.fixture-signature'
const googleCart = { ...persisted.cart, clientOrderToken: 'same-attempt', clientOrderStatus: 'uncertain',
  clientOrderPayload: { fulfillment_type: 'delivery', address_resolution_token: googleProof, delivery_quote_token: googleProof },
  clientOrderSignature: JSON.stringify({ addressResolutionToken: googleProof, deliveryQuoteToken: googleProof }),
}
const googleBytes = serializePersistedState({ ...persisted, cart: googleCart }, now)
assert.equal(googleBytes.includes(googleProof), false, 'Google GPS proofs must not survive browser persistence')
const restoredGoogle = parsePersistedState(googleBytes, now).cart
assert.equal(restoredGoogle.clientOrderToken, 'same-attempt')
assert.equal(restoredGoogle.clientOrderStatus, 'uncertain')
assert.match(restoredGoogle.clientOrderPayload.address_resolution_token, /^sha256:[a-f0-9]{64}$/)
assert.equal(googleCart.clientOrderPayload.address_resolution_token, googleProof, 'Live retries retain their original proofs')
assert.deepStrictEqual(parsePersistedState(JSON.stringify({
  expiresAt: now + PERSISTED_STATE_TTL, state: persisted,
}), now), expectedPersisted)

const pluginSource = fs.readFileSync(
  path.join(__dirname, '../plugins/persistedState.client.js'), 'utf8'
)
const pluginFactory = vm.compileFunction(
  pluginSource
    .replace(/^import .*$/gm, '')
    .replace('export default', 'const plugin =') + '\nreturn plugin',
  ['createPersistedState', 'require']
)
let pluginOptions
const plugin = pluginFactory((options) => {
  pluginOptions = options
  return () => {}
}, require)
plugin({ store: {} })
const storage = {
  saved: null,
  getItem() { return this.saved },
  setItem(key, value) { this.saved = value },
  removeItem() { this.saved = null },
}
pluginOptions.setState('vuex', persisted, storage)
assert.deepStrictEqual(JSON.parse(storage.saved).state, expectedPersisted)
storage.saved = JSON.stringify({ expiresAt: Date.now() + PERSISTED_STATE_TTL, state: persisted })
assert.deepStrictEqual(pluginOptions.getState('vuex', storage), expectedPersisted)

Vue.use(Vuex)

const originalWindow = global.window
const originalNow = Date.now
let clock = now
const values = new Map([
  ['vuex', JSON.stringify({ expiresAt: now + PERSISTED_STATE_TTL, state: expectedPersisted })],
])
const writes = []
const realStorage = {
  getItem: key => values.get(key) || null,
  setItem(key, value) { values.set(key, value); if (key === 'vuex') writes.push(value) },
  removeItem: key => values.delete(key),
}
const moduleWithMutation = (initial = {}) => ({
  namespaced: true,
  state: { ...initial, count: 0 },
  mutations: { CHANGE(state) { state.count++ } },
})
try {
  Date.now = () => clock
  global.window = { localStorage: realStorage }
  const liveStore = new Vuex.Store({
    state: { authenticated: true, rootCount: 0 },
    mutations: {
      ROOT_CHANGE(state) { state.rootCount++ },
      customer(state) { state.rootCount++ },
      delivery(state) { state.rootCount++ },
      courier(state) { state.rootCount++ },
    },
    modules: {
      customer: moduleWithMutation({ addresses: [{ instructions: 'private customer address' }] }),
      delivery: moduleWithMutation({ quote: { instructions: 'private delivery address' } }),
      courier: moduleWithMutation({ missions: [{ instructions: 'private mission' }] }),
      users: moduleWithMutation(expectedPersisted.users),
      staff: moduleWithMutation(),
      cart: moduleWithMutation({ ...expectedPersisted.cart, clientOrderToken: 'pending-recovery-fixture' }),
      customerSupport: moduleWithMutation(),
      deliverySettings: moduleWithMutation(),
      courierCash: moduleWithMutation(),
      nested: { namespaced: true, modules: { customer: moduleWithMutation() } },
    },
  })
  pluginFactory(createPersistedState, require)({ store: liveStore })

  const originalBytes = values.get('vuex')
  const originalExpiry = JSON.parse(originalBytes).expiresAt
  for (const namespace of ['customer', 'delivery', 'courier']) {
    clock += 12345
    liveStore.commit(`${namespace}/CHANGE`)
    assert.strictEqual(liveStore.state[namespace].count, 1)
    assert.strictEqual(values.get('vuex'), originalBytes, `${namespace} must preserve exact stored bytes`)
    assert.strictEqual(JSON.parse(values.get('vuex')).expiresAt, originalExpiry)
    assert.strictEqual(writes.length, 0, 'Excluded mutations must not write storage')
  }

  const retainedMutations = [
    'users/CHANGE', 'staff/CHANGE', 'cart/CHANGE', 'ROOT_CHANGE',
    'customer', 'delivery', 'courier', 'customerSupport/CHANGE',
    'deliverySettings/CHANGE', 'courierCash/CHANGE', 'nested/customer/CHANGE',
  ]
  retainedMutations.forEach((type, index) => {
    clock += 12345
    liveStore.commit(type)
    assert.strictEqual(writes.length, index + 1, `${type} must still persist`)
    const persisted = JSON.parse(values.get('vuex'))
    assert.strictEqual(persisted.expiresAt, clock + PERSISTED_STATE_TTL)
    assert.deepStrictEqual(persisted.state, JSON.parse(JSON.stringify(sanitizePersistedState(liveStore.state))))
    assert.strictEqual(persisted.state.cart.clientOrderToken, 'pending-recovery-fixture')
    assert.strictEqual(persisted.state.users.user.token, 'saved-session')
    for (const namespace of ['customer', 'delivery', 'courier']) {
      assert.strictEqual(Object.prototype.hasOwnProperty.call(persisted.state, namespace), false)
    }
  })
} finally {
  Date.now = originalNow
  global.window = originalWindow
}

console.log('persistedState tests passed')
