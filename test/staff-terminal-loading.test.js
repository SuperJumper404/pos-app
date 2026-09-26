const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const source = fs.readFileSync(path.join(__dirname, '..', 'store', 'staff.js'), 'utf8')
const executable = source.replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
const factory = vm.compileFunction(
  `${executable}\nreturn { actions }`,
  ['EasyAccess', 'defaultMutations', 'require', 'localStorage']
)
const { actions } = factory(() => ({}), () => ({}), require, { getItem: () => 'test-token' })

const callGetAll = async (options, response) => {
  const calls = []
  const dispatches = []
  const axios = { get: (url, config) => {
    calls.push({ url, config })
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response)
  } }
  const dispatch = (name, payload) => dispatches.push({ name, payload })
  const result = await actions.getAll.call({ $axios: axios }, { dispatch }, options)
  return { calls, dispatches, result }
}

const run = async () => {
  const backendError = new Error('request failed')
  backendError.response = { data: { message: 'RAW_BACKEND_SECRET' } }

  const silent = await callGetAll({ silent: true }, backendError)
  assert.strictEqual(silent.result, false)
  assert.strictEqual(silent.calls[0].config.skipGlobalErrorNotification, true)
  assert.deepStrictEqual(silent.dispatches.map(({ name }) => name), ['set/message', 'set/data'])
  assert.ok(!JSON.stringify(silent.dispatches).includes('RAW_BACKEND_SECRET'))
  assert.strictEqual(silent.dispatches[0].payload, 'Impossible de charger les caissiers.')

  const existing = await callGetAll(undefined, backendError)
  assert.strictEqual(existing.result, false)
  assert.strictEqual(existing.calls[0].config.skipGlobalErrorNotification, undefined)
  assert.deepStrictEqual(existing.dispatches.map(({ name }) => name), [
    'set/message', 'set/data', 'notifications/error',
  ])
  assert.strictEqual(existing.dispatches[0].payload, 'RAW_BACKEND_SECRET')
  assert.strictEqual(existing.dispatches[2].payload, 'RAW_BACKEND_SECRET')

  const users = [
    { id: 1, username: 'Admin', access: 0, status: 1, is_primary_admin: 1 },
    { id: 2, username: 'Caisse', access: 1, status: 1, is_primary_admin: 0 },
  ]
  const loaded = await callGetAll({ silent: true }, { data: { data: users } })
  assert.strictEqual(loaded.result, true)
  assert.deepStrictEqual(loaded.dispatches.map(({ name }) => name), ['set/data'])
  assert.deepStrictEqual(JSON.parse(JSON.stringify(loaded.dispatches[0].payload)), users)
}

run().then(() => console.log('staff terminal loading tests passed')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
