const assert = require('assert')
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

console.log('persistedState tests passed')
