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

const storage = {}
global.localStorage = {
  setItem(key, value) {
    storage[key] = String(value)
  },
  getItem(key) {
    return storage[key] || null
  },
  removeItem(key) {
    delete storage[key]
  },
}

const { actions } = moduleFactory(() => ({}))
const dispatches = []
const context = {
  dispatch(type, payload, options) {
    dispatches.push({ type, payload, options })
  },
}

const responseUser = {
  id: 21,
  access: 2,
  token: 'fresh-table-session',
  shopid: 8,
}

const axios = {
  post(url, body) {
    assert.strictEqual(url, '/baseurl/api/v1/table-access')
    assert.deepStrictEqual(body, { token: 'stable-qr-token' })
    return Promise.resolve({
      data: {
        data: [responseUser],
        message: 'Connexion table reussie !',
      },
    })
  },
}

actions.postTableAccess
  .call({ $axios: axios }, context, 'stable-qr-token')
  .then((result) => {
    assert.strictEqual(result, true)
    assert.strictEqual(storage.idUser, '21')
    assert.strictEqual(storage.access, '2')
    assert.strictEqual(storage.token, 'fresh-table-session')
    assert.strictEqual(storage.shopid, '8')
    assert.deepStrictEqual(dispatches.slice(0, 5), [
      { type: 'set/user.id', payload: 21, options: undefined },
      { type: 'set/user.access', payload: 2, options: undefined },
      {
        type: 'set/user.token',
        payload: 'fresh-table-session',
        options: undefined,
      },
      { type: 'set/user.shopid', payload: 8, options: undefined },
      { type: 'setAuthentication', payload: true, options: { root: true } },
    ])
    console.log('table access auth tests passed')
  })
