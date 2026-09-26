const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const {
  clearStoredAuth,
  isQrSession,
  getTokenExpiresAt,
  isTokenExpired,
} = require('../helpers/sessionAuth')

const encode = (payload) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url')

const token = `header.${encode({ exp: 2000 })}.signature`

assert.strictEqual(isQrSession({ session_subject: 'service_point' }), true)
assert.strictEqual(isQrSession({ session_subject: 'staff' }), false)
assert.strictEqual(getTokenExpiresAt(token), 2000000)
assert.strictEqual(isTokenExpired(token, 1999999), false)
assert.strictEqual(isTokenExpired(token, 2000000), true)
assert.strictEqual(isTokenExpired('', 2000000), true)
assert.strictEqual(isTokenExpired('malformed-token', 2000000), true)

const storage = {}
const fakeStorage = {
  setItem(key, value) {
    storage[key] = value
  },
  removeItem(key) {
    delete storage[key]
  },
}
;[
  'idUser',
  'access',
  'token',
  'shopid',
  'table_access_token',
].forEach((key) => fakeStorage.setItem(key, 'value'))
clearStoredAuth(fakeStorage)
assert.strictEqual(storage.token, undefined)
assert.strictEqual(storage.table_access_token, 'value')

const loadStore = (file) => {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/export const /g, 'const ')
  const factory = vm.compileFunction(`${source}\nreturn { state, actions }`,
    ['EasyAccess', 'defaultMutations', 'require'])
  return factory(() => ({}), () => ({}), require)
}

const runIdentityRegression = async () => {
  const terminal = loadStore('store/stripeTerminal.js')
  const users = loadStore('store/users.js')
  const terminalState = terminal.state()
  const userState = users.state()
  const events = []
  const storageValues = new Map()
  const previousStorage = global.localStorage
  global.localStorage = {
    getItem: (key) => storageValues.get(key) || null,
    setItem: (key, value) => storageValues.set(key, String(value)),
    removeItem: (key) => storageValues.delete(key),
  }
  const terminalContext = {
    state: terminalState,
    dispatch(type, value) { terminalState[type.slice(4)] = value },
  }
  const dirtyTerminal = () => {
    terminalState.readers = [{ id: 7 }]
    terminalState.currentReader = { id: 7 }
    terminalState.activePayment = { id: 13 }
    terminalState.error = { code: 'TERMINAL_PAYMENT_FAILED', message: 'Old user' }
  }
  const assertTerminalCleared = () => {
    assert.deepStrictEqual(terminalState.readers, [])
    assert.strictEqual(terminalState.currentReader, null)
    assert.strictEqual(terminalState.activePayment, null)
    assert.strictEqual(terminalState.error, null)
  }
  const dispatch = (type, value, options) => {
    events.push([type, value, options])
    if (type === 'stripeTerminal/resetSession') {
      return terminal.actions.resetSession(terminalContext)
    }
    if (type === 'clearAuthenticatedUser') {
      return users.actions.clearAuthenticatedUser({ dispatch })
    }
    if (type === 'set/user.id') assertTerminalCleared()
    if (type.startsWith('set/user.')) userState.user[type.slice(9)] = value
    return Promise.resolve()
  }
  const axios = {
    post(url) {
      return url.endsWith('/logout')
        ? Promise.resolve({ data: { message: 'Deconnecte' } })
        : Promise.resolve({ data: {
          data: [{ id: 21, access: 2, token: 'new-token', shopid: 8 }],
          message: 'Connecte',
        } })
    },
  }
  try {
    dirtyTerminal()
    assert.strictEqual(await users.actions.postLogin.call({ $axios: axios }, { dispatch }, {}), true)
    assertTerminalCleared()
    dirtyTerminal()
    assert.strictEqual(await users.actions.postLogout.call({ $axios: axios }, { dispatch }), true)
    assertTerminalCleared()
    dirtyTerminal()
    assert.strictEqual(await users.actions.postLogin.call({ $axios: axios }, { dispatch }, {}), true)
    assertTerminalCleared()
    assert.ok(events.filter(([type]) => type === 'stripeTerminal/resetSession').length >= 3)
  } finally {
    global.localStorage = previousStorage
  }
}

runIdentityRegression().then(() => {
  console.log('session auth tests passed')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
