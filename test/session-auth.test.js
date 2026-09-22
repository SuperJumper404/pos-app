const assert = require('assert')
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

console.log('session auth tests passed')
