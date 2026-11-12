const assert = require('assert/strict')
const fs = require('fs')
const vm = require('vm')
const path = require('path')
const { test } = require('node:test')
const babel = require('@babel/core')
const filename = path.resolve(__dirname, '../store/clients.js')
const compiled = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
const moduleValue = { exports: {} }
vm.compileFunction(compiled, ['module', 'exports', 'require'])(moduleValue, moduleValue.exports, require)
const clients = moduleValue.exports
const deferred = () => { let complete; const promise = new Promise(resolve => { complete = resolve }); return { promise, resolve: complete } }
function fixture(reply = () => ({ items: [], total: 0, metrics: {}, capabilities: {} })) {
  const state = clients.state()
  const rootState = { users: { user: { id: 2, shopid: 7, access: 0, token: 'staff', session_subject: 'staff' } },
    customer: { session: { customerId: 'personal-account' } } }
  const calls = []
  global.localStorage = { getItem: () => 'staff' }
  const host = { $axios: { request: async request => { calls.push(request); return { data: { data: await reply(request) } } } } }
  const context = { state, rootState, commit: (name, payload) => clients.mutations[name](state, payload) }
  const dispatch = (name, payload) => clients.actions[name].call(host, context, payload)
  return { state, rootState, calls, dispatch }
}
test('directory reads use server paging and preserve personal account state', async () => {
  const f = fixture()
  await f.dispatch('load', { q: 'Alice', filter: 'members', page: 2, pageSize: 10 })
  assert.equal(f.calls[0].url, '/baseurl/api/v1/clients')
  assert.equal(f.calls[0].params.page, 2)
  assert.equal(f.calls[0].params.q, 'Alice')
  assert.equal(f.calls[0].headers.Authorization, 'Bearer staff')
  assert.equal(f.rootState.customer.session.customerId, 'personal-account')
})
test('old search and detail replies cannot replace the current selection', async () => {
  const oldList = deferred(); const oldDetail = deferred()
  const f = fixture(request => request.url.endsWith('/1') ? oldDetail.promise : request.params?.q === 'old' ? oldList.promise : { items: [{ id: 'new' }], total: 1 })
  const pending = f.dispatch('load', { q: 'old' })
  await f.dispatch('load', { q: 'new' })
  oldList.resolve({ items: [{ id: 'old' }], total: 1 })
  await pending
  assert.equal(f.state.items[0].id, 'new')
  const detail = f.dispatch('detail', '1')
  f.dispatch('clearDetail')
  oldDetail.resolve({ client: { id: '1' } })
  await detail
  assert.equal(f.state.selected, null)
})
test('session changes discard late directory responses and reset removes staff data', async () => {
  const delayed = deferred()
  const f = fixture(() => delayed.promise)
  const pending = f.dispatch('load')
  f.rootState.users.user.shopid = 8
  delayed.resolve({ items: [{ id: 'wrong-shop' }] })
  await pending
  assert.equal(f.state.items.length, 0)
  f.dispatch('reset')
  assert.equal(f.state.selected, null)
  const { sanitizePersistedState } = require('../helpers/persistedState')
  assert.equal(sanitizePersistedState({ clients: { items: [{ phone: 'private' }] } }).clients, undefined)
})
test('reconciliation uses explicit dry-run/apply bodies and linking remains separate from loyalty', async () => {
  const f = fixture()
  await f.dispatch('reconcile', true)
  await f.dispatch('reconcile', false)
  await f.dispatch('linkContact', { contactKey: 'a'.repeat(64), customerId: '9007199254740993' })
  assert.deepEqual(f.calls.slice(0, 2).map(request => request.data), [{ dryRun: true }, { dryRun: false }])
  assert.deepEqual(f.calls[2].data, { customerId: '9007199254740993' })
  assert.ok(f.calls.every(request => !request.url.includes('/loyalty')))
})
test('legacy client roles with residual staff permissions do not request the directory', async () => {
  const f = fixture()
  f.rootState.users.user.access = 2
  f.rootState.users.user.module_permissions = ['history']
  await f.dispatch('load')
  assert.equal(f.calls.length, 0)
})
