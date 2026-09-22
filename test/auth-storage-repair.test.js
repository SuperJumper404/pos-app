/* eslint-disable no-new-func */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../store/users.js'), 'utf8')
const executable = source
  .replace(
    /import EasyAccess, \{ defaultMutations \} from 'vuex-easy-access'\r?\n/,
    ''
  )
  .replace(/export const state = \(\) =>/, 'const state = () =>')
  .replace(/export const mutations =/, 'const mutations =')
  .replace(/export const plugins = \[EasyAccess\(\)\]/, 'const plugins = []')
  .replace(/export const actions =/, 'const actions =')
  .concat('\nreturn { state, mutations, actions }\n')

const moduleFactory = new Function('defaultMutations', executable)
const { actions } = moduleFactory(() => ({}))
const storage = {}
global.localStorage = {
  getItem(key) {
    return storage[key] || null
  },
  setItem(key, value) {
    storage[key] = String(value)
  },
  removeItem(key) {
    delete storage[key]
  },
}

const user = {
  id: null,
  access: 2,
  token: 'persisted-session-token',
  shopid: 8,
  module_permissions: null,
  is_primary_admin: false,
  session_subject: 'service_point',
  service_point_id: 31,
  service_point_name: 'Table 31',
  order_source: 'table_qr',
  qrSessionToken: 'qr-token-from-vuex',
}

const dispatches = []
const repaired = actions.ensureAuthenticatedStorage({
  dispatch(type, payload, options) {
    dispatches.push({ type, payload, options })
  },
  state: { user },
  rootState: { authenticated: false },
})

assert.strictEqual(repaired, true)
assert.strictEqual(storage.token, 'persisted-session-token')
assert.strictEqual(storage.access, '2')
assert.strictEqual(storage.shopid, '8')
assert.strictEqual(storage.session_subject, 'service_point')
assert.strictEqual(storage.service_point_id, '31')
assert.strictEqual(storage.service_point_name, 'Table 31')
assert.strictEqual(storage.order_source, 'table_qr')
assert.strictEqual(storage.table_access_token, 'qr-token-from-vuex')
assert.deepStrictEqual(dispatches, [
  { type: 'setAuthentication', payload: true, options: { root: true } },
])

console.log('auth storage repair tests passed')
