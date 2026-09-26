const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
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
}
const expectedPersisted = {
  authenticated: true,
  users: persisted.users,
  cart: persisted.cart,
}
assert.deepStrictEqual(sanitizePersistedState(persisted), expectedPersisted)
assert.deepStrictEqual(parsePersistedState(serializePersistedState(persisted, now), now), expectedPersisted)
assert.deepStrictEqual(parsePersistedState(JSON.stringify(persisted), now), expectedPersisted)

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

console.log('persistedState tests passed')
