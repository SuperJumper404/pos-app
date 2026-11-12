/* eslint-disable no-console */
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const Vue = require('vue')
const compiler = require('vue-template-compiler')
const babel = require('@babel/core')
const root = path.resolve(__dirname, '..')
let token = 'fixture-token'
const storage = { getItem: () => token }
function load(relative) {
  const filename = path.join(root, relative)
  let source = fs.readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) {
    const sfc = compiler.parseComponent(source)
    assert.deepEqual(compiler.compile(sfc.template.content).errors, [])
    source = sfc.script.content
  }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require', 'localStorage'])(module, module.exports,
    name => require(name.startsWith('@/') ? path.join(root, name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name), storage)
  return module.exports
}
const deferred = () => { let settle; const promise = new Promise(resolve => { settle = resolve }); return { resolve: settle, promise } }
const admin = () => ({ id: 1, shopid: 7, access: 0, status: 1, session_subject: 'staff', token })
const person = { id: 2, staff_login_id: 'ABCD23', access: 1, is_primary_admin: 0 }
function fixture(reply) {
  const calls = []
  const state = Vue.observable({ users: { user: admin() }, staff: { data: [person] }, delivery: { operator: { couriers: [] } }, route: { fullPath: '/staff', query: {} } })
  const store = { state, get: () => state.staff.data, dispatch: (name, payload) => { calls.push({ name, payload }); return reply(name, payload) } }
  const options = load('pages/staff/index.vue').default
  const page = new Vue({ ...options, computed: { ...options.computed, $route() { return state.route } }, beforeCreate() { this.$store = store }, mounted: [] })
  return { page, calls, state }
}

test('team has a courier shortcut with no staff modules or service point', () => {
  const f = fixture(() => null)
  assert.equal(typeof f.page.openCreateCourier, 'function')
  f.page.openCreateCourier()
  assert.equal(f.page.formDialog, true)
  assert.equal(f.page.form.access, 6)
  assert.deepEqual([...f.page.form.module_permissions], [])
  assert.equal(f.page.form.service_point_id, null)
  f.page.$destroy()
})

test('team courier creation keeps generated credentials masked even when availability cannot load', async () => {
  const courier = { ...person, access: 6, status: 1 }
  const f = fixture(name => {
    if (name === 'staff/create') return { staff_login_id: 'ABCD23', staff_pin: '0042' }
    if (name === 'staff/getAll') { f.state.staff.data = [courier]; return true }
    if (name === 'delivery/operatorLoad') throw new Error('Directory unavailable')
    return null
  })
  f.page.$refs.form = { validate: () => true, resetValidation() {} }
  f.page.form = { ...f.page.form, username: 'Fixture courier', access: 6, module_permissions: [] }
  try {
    await f.page.submit()
    assert.equal(f.page.credentialsDialog, true)
    assert.equal(f.page.credentialResult.staff_pin, '0042')
    assert.equal(f.page.showCredentialPin, false)
    assert.ok(f.calls.some(call => call.name === 'delivery/operatorLoad'))
    assert.equal(f.page.submitting, false)
  } finally { f.page.$destroy() }
})

test('team loads courier availability and delegates changes without altering account credentials', async () => {
  const courier = { ...person, access: 6, status: 1 }
  const directory = [{ id: 2, status: 1, available: 1, missionCount: 3 }]
  const f = fixture(name => {
    if (name === 'delivery/operatorLoad') { f.state.delivery.operator.couriers = directory; return directory }
    return true
  })
  f.state.staff.data = [courier]
  assert.equal(typeof f.page.courierInfo, 'function')
  assert.equal(f.page.courierInfo(courier), null)
  try {
    await f.page.refresh()
    assert.equal(f.page.courierInfo(courier).missionCount, 3)
    await f.page.setCourierAvailable(courier, false)
    assert.deepEqual(f.calls.find(call => call.name === 'delivery/operatorAvailability').payload, { courierId: 2, available: false })
    assert.equal(f.calls.some(call => ['staff/update', 'staff/provisionCredentials'].includes(call.name)), false)
  } finally { f.page.$destroy() }
})

test('team forgets courier availability and ignores mutation failures after an actor switch', async () => {
  const pending = deferred()
  const courier = { ...person, access: 6, status: 1 }
  const f = fixture(name => name === 'delivery/operatorAvailability' ? pending.promise : null)
  f.state.staff.data = [courier]
  f.state.delivery.operator.couriers = [{ id: 2, available: 1 }]
  assert.equal(typeof f.page.setCourierAvailable, 'function')
  f.page.courierDirectoryActor = f.page.credentialActor
  const work = f.page.setCourierAvailable(courier, false)
  f.state.users.user = { ...admin(), shopid: 8 }
  pending.resolve(null)
  await work
  assert.equal(f.page.courierInfo(courier), null)
  assert.equal(f.page.courierError, '')
  f.page.$destroy()
})

test('team refuses unavailable, inactive and unauthorized availability changes and duplicate submissions', async () => {
  const pending = deferred()
  const courier = { ...person, access: 6, status: 1 }
  const f = fixture(name => name === 'delivery/operatorAvailability' ? pending.promise : null)
  f.state.delivery.operator.couriers = [{ id: 2, available: 1 }]
  try {
    await f.page.setCourierAvailable(courier, false)
    assert.equal(f.calls.length, 0, 'unknown directory')
    f.page.courierDirectoryActor = f.page.credentialActor
    await f.page.setCourierAvailable({ ...courier, status: 0 }, false)
    await f.page.setCourierAvailable(person, false)
    f.page.loading = true
    await f.page.setCourierAvailable(courier, false)
    f.page.loading = false
    assert.equal(f.calls.length, 0, 'inactive, non-courier and loading guards')
    const first = f.page.setCourierAvailable(courier, false)
    await f.page.setCourierAvailable(courier, false)
    assert.equal(f.calls.length, 1, 'pending mutation is not duplicated')
    pending.resolve(true)
    await first
    f.state.users.user = { ...admin(), access: 1 }
    f.page.courierDirectoryActor = f.page.credentialActor
    await f.page.setCourierAvailable(courier, true)
    assert.equal(f.calls.length, 1, 'non-admin cannot mutate availability')
  } finally { pending.resolve(true); f.page.$destroy() }
})

test('team conceals stale availability when mutation confirmation cannot load', async () => {
  const courier = { ...person, access: 6, status: 1 }
  const f = fixture(() => null)
  f.state.delivery.operator.couriers = [{ id: 2, available: 1 }]
  f.page.courierDirectoryActor = f.page.credentialActor
  try {
    await f.page.setCourierAvailable(courier, false)
    assert.equal(f.page.courierInfo(courier), null)
    assert.ok(f.page.courierError)
    assert.equal(f.page.courierSaving, null)
  } finally { f.page.$destroy() }
})

test('team rejects a late directory response after a shop switch or page destruction', async () => {
  for (const change of ['actor', 'destroy']) {
    const pending = deferred()
    const courier = { ...person, access: 6, status: 1 }
    const f = fixture(name => name === 'delivery/operatorLoad' ? pending.promise : true)
    f.state.staff.data = [courier]
    const work = f.page.refresh()
    await Promise.resolve()
    assert.ok(f.calls.some(call => call.name === 'delivery/operatorLoad'))
    if (change === 'actor') { f.state.users.user = { ...admin(), shopid: 8 }; f.state.users.user = admin() }
    else f.page.$destroy()
    pending.resolve([{ id: 2, available: 1 }])
    await work
    assert.equal(f.page.courierDirectoryActor, null, change)
    assert.equal(f.page.courierInfo(courier), null, change)
    assert.equal(f.page.courierError, '', change)
    f.page.$destroy()
  }
})

test('staff PIN is fetched on demand, concealed on hide and never resets credentials', async () => {
  const f = fixture(() => Promise.resolve({ staff_login_id: 'ABCD23', staff_pin: '0042' }))
  assert.equal(typeof f.page.togglePin, 'function')
  assert.equal(f.calls.length, 0)
  await f.page.togglePin(person)
  assert.equal(f.page.revealedPin, '0042')
  assert.deepEqual(f.calls, [{ name: 'staff/readCredentials', payload: { id: 2 } }])
  await f.page.togglePin(person)
  assert.equal(f.page.revealedPin, '')
  assert.equal(f.calls.length, 1)
  f.page.$destroy()
})
test('legacy PIN is never regenerated by reveal; failed requests leave no PIN', async () => {
  const f = fixture(() => Promise.resolve({ staff_pin: null, needs_regeneration: true }))
  assert.equal(typeof f.page.togglePin, 'function')
  await f.page.togglePin(person)
  assert.equal(f.page.revealedPin, '')
  assert.equal(f.page.pinMessage, 'PIN a regenerer')
  assert.ok(f.calls.every(call => call.name === 'staff/readCredentials'))
  f.page.$destroy()
})
test('switching row, actor, list or destroying the page discards late PIN replies', async () => {
  for (const change of ['actor', 'list', 'route', 'destroy', 'hide']) {
    const pending = deferred()
    const f = fixture(() => pending.promise)
    assert.equal(typeof f.page.togglePin, 'function')
    const result = f.page.togglePin(person)
    if (change === 'actor') { f.state.users.user = { ...admin(), shopid: 8 }; f.state.users.user = admin() }
    if (change === 'list') f.state.staff.data = [{ ...person }]
    if (change === 'route') f.state.route = { fullPath: '/staff?create=courier', query: {} }
    if (change === 'destroy') f.page.$destroy()
    if (change === 'hide') f.page.clearRevealedPin()
    pending.resolve({ staff_pin: '0042' })
    await result
    assert.equal(f.page.revealedPin, '', change)
    f.page.$destroy()
  }
})
test('pending generation cannot restore a PIN after its target disappears or the route changes', async () => {
  for (const change of ['list', 'route']) {
    const pending = deferred()
    const f = fixture(() => pending.promise)
    f.page.openCredentials(person)
    const result = f.page.saveCredentials()
    if (change === 'list') f.state.staff.data = []
    else f.state.route = { fullPath: '/staff?create=courier', query: {} }
    pending.resolve({ staff_login_id: 'ABCD23', staff_pin: '0042' })
    await result
    assert.equal(f.page.credentialResult, null, change)
    assert.equal(f.page.credentialsDialog, false, change)
    f.page.$destroy()
  }
})
test('Vuex reveal returns a transient DTO without commits and denies non-admin/stale sessions', async () => {
  const { actions } = load('store/staff.js')
  assert.equal(typeof actions.readCredentials, 'function')
  const dispatches = []; const rootState = { users: { user: admin() } }
  const context = { rootState, dispatch: (...args) => dispatches.push(args) }
  let calls = 0
  const axios = { get: (url, config) => { calls++; assert.equal(url, '/baseurl/api/v1/user/2/staff-credentials'); assert.equal(config.headers.Authorization, 'Bearer fixture-token'); return Promise.resolve({ data: { data: { staff_login_id: 'ABCD23', staff_pin: '0042' } } }) } }
  const result = await actions.readCredentials.call({ $axios: axios }, context, { id: 2 })
  assert.equal(result.staff_pin, '0042'); assert.deepEqual(dispatches, [])
  rootState.users.user.access = 1
  assert.equal(await actions.readCredentials.call({ $axios: axios }, context, { id: 2 }), false); assert.equal(calls, 1)
  rootState.users.user = admin(); const pending = deferred()
  const stale = actions.readCredentials.call({ $axios: { get: () => pending.promise } }, context, { id: 2 })
  token = 'replacement'; pending.resolve({ data: { data: { staff_pin: '0042' } } })
  assert.equal(await stale, false); token = 'fixture-token'
})
