const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const source = fs.readFileSync(path.join(__dirname, '..', 'store', 'staff.js'), 'utf8')
const executable = source.replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
const factory = vm.compileFunction(
  `${executable}\nreturn { actions, state }`,
  ['EasyAccess', 'defaultMutations', 'require', 'localStorage']
)
const { actions, state } = factory(() => ({}), () => ({}), require, { getItem: () => 'test-token' })

const deferred = () => {
  let settleResolve
  let settleReject
  const promise = new Promise((resolve, reject) => {
    settleResolve = resolve
    settleReject = reject
  })
  return { promise, resolve: settleResolve, reject: settleReject }
}

const callGetAll = async (options, response) => {
  const calls = []
  const dispatches = []
  const current = state()
  const axios = { get: (url, config) => {
    calls.push({ url, config })
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response)
  } }
  const dispatch = (name, payload) => {
    dispatches.push({ name, payload })
    if (name.startsWith('set/')) current[name.slice(4)] = payload
  }
  const result = await actions.getAll.call({ $axios: axios }, { dispatch, state: current }, options)
  return { calls, dispatches, result, current }
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

  const oldRequest = deferred()
  const freshRequest = deferred()
  const refreshRequest = deferred()
  const pending = [oldRequest.promise, freshRequest.promise, refreshRequest.promise]
  const current = state()
  const overlapDispatches = []
  const dispatch = (name, payload) => {
    overlapDispatches.push(name)
    if (name.startsWith('set/')) current[name.slice(4)] = payload
  }
  const axios = { get: () => pending.shift() }
  const invoke = () => actions.getAll.call({ $axios: axios }, { dispatch, state: current }, { silent: true })
  const old = invoke()
  const fresh = invoke()
  freshRequest.resolve({ data: { data: [users[1]] } })
  assert.strictEqual(await fresh, true)
  oldRequest.reject(backendError)
  assert.strictEqual(await old, false)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(current.data)), [users[1]])
  assert.strictEqual(current.message, '')
  assert.deepStrictEqual(overlapDispatches, ['set/data'])
  const refresh = invoke()
  refreshRequest.resolve({ data: { data: users } })
  assert.strictEqual(await refresh, true)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(current.data)), users)

  const firstState = state()
  const secondState = state()
  const firstPending = deferred()
  const secondPending = deferred()
  const instanceDispatch = (target) => (name, payload) => {
    if (name.startsWith('set/')) target[name.slice(4)] = payload
  }
  const first = actions.getAll.call({ $axios: { get: () => firstPending.promise } },
    { state: firstState, dispatch: instanceDispatch(firstState) }, { silent: true })
  const second = actions.getAll.call({ $axios: { get: () => secondPending.promise } },
    { state: secondState, dispatch: instanceDispatch(secondState) }, { silent: true })
  firstPending.resolve({ data: { data: [users[0]] } })
  secondPending.resolve({ data: { data: [users[1]] } })
  assert.strictEqual(await first, true)
  assert.strictEqual(await second, true)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(firstState.data)), [users[0]])
  assert.deepStrictEqual(JSON.parse(JSON.stringify(secondState.data)), [users[1]])
}

run().then(() => console.log('staff terminal loading tests passed')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
