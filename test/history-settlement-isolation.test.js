const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')
const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'store/history.js'), 'utf8').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
const { state, actions } = vm.compileFunction(`${source}\nreturn { state, actions }`, ['EasyAccess', 'defaultMutations', 'require'])(() => ({}), () => ({}), name => require(name.startsWith('@/') ? path.join(root, name.slice(2)) : name))
const { sanitizePersistedState } = require('../helpers/persistedState')
const defer = () => {
  let settle, fail
  const promise = new Promise((resolve, reject) => { settle = resolve; fail = reject })
  return { promise, resolve: settle, reject: fail }
}
const dto = id => ({ id, totalAmount: 48, archivedOrders: [{ id: 31, customer: 'Private customer', details: [] }] })
const ok = id => ({ data: { data: dto(id) } })
const make = () => {
  const current = Vue.observable(state())
  const rootState = Vue.observable({ users: { user: { id: 4, shopid: 7, token: 'session-a' } } })
  const requests = []
  const context = { state: current, rootState, dispatch: (name, value) => { current[name.slice(4)] = value } }
  const api = { $axios: { get: url => { const request = defer(); requests.push({ ...request, url }); return request.promise } } }
  return { current, rootState, requests, context, api,
    load: id => actions.getCashRegisterSettlement.call(api, context, id),
    clear: () => actions.clearCashRegisterSettlement(context) }
}
const instances = []
const pagePath = path.join(root, 'pages/history/settlement/_id.vue')
const parsed = compiler.parseComponent(fs.readFileSync(pagePath, 'utf8'))
const code = babel.transformSync(parsed.script.content, { babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
let printRequest
const pageModule = { exports: {} }
vm.compileFunction(code, ['module', 'exports', 'require'])(pageModule, pageModule.exports, name => {
  if (name === '@/helpers/price') return { methods: { formatCurrency: value => String(value) } }
  if (name === '@/helpers/cashierSettlementReceipt') return {
    ...require('../helpers/cashierSettlementReceipt'), sendCashierSettlementReceipt: options => printRequest.promise.then(result => {
      if (result.ok) options.dispatch('notifications/success', 'Impression envoyée.')
      return result
    }),
  }
  return require(name.startsWith('@/') ? path.join(root, name.slice(2)) : name)
})
const component = pageModule.exports.default
const makePage = h => {
  const calls = []
  const route = Vue.observable({ params: { id: '901' } })
  const page = new Vue({ ...component, ...compiler.compileToFunctions(parsed.template.content), beforeCreate() {
    this.$route = route
    this.$store = {
      get: key => key === 'users/user' ? h.rootState.users.user : key.startsWith('history/') ? h.current[key.slice(8)] : null,
      dispatch: (name, payload) => {
        calls.push([name, payload])
        if (name === 'history/getCashRegisterSettlement') return h.load(payload)
        if (name === 'history/clearCashRegisterSettlement') return Promise.resolve(h.clear())
        return Promise.resolve(true)
      },
    }
  } })
  let pdfs = 0
  page.generateSettlementPdf = () => { pdfs += 1; page.urlPDF = 'blob:settlement-test' }
  instances.push(page)
  return { page, route, calls, pdfs: () => pdfs }
}

const run = async () => {
  global.localStorage = { getItem: () => 'session-a' }
  for (const identityChange of ['id', 'shopid', 'token']) {
    const h = make()
    const request = h.load(901)
    h.rootState.users.user[identityChange] = identityChange === 'token' ? 'session-b' : 8
    h.requests[0].resolve(ok(901))
    assert.strictEqual(await request, false, `A late ${identityChange} response must be discarded`)
    assert.strictEqual(h.current.cashRegisterSettlement, null)
  }
  const raced = make()
  const first = raced.load(901)
  const second = raced.load(902)
  raced.requests[1].resolve(ok(902))
  assert.strictEqual(await second, true)
  raced.requests[0].reject(new Error('old failure'))
  assert.strictEqual(await first, false)
  assert.strictEqual(raced.current.cashRegisterSettlement.id, 902)
  assert.strictEqual(raced.current.cashRegisterSettlementStatus, 'success')
  const cleared = make()
  const pending = cleared.load(901)
  cleared.clear()
  cleared.requests[0].resolve(ok(901))
  assert.strictEqual(await pending, false)
  assert.strictEqual(cleared.current.cashRegisterSettlementStatus, 'idle')
  assert.strictEqual(cleared.current.cashRegisterSettlementOwner, null)
  assert.strictEqual(cleared.current.cashRegisterSettlement, null)
  const invalid = make()
  assert.strictEqual(await invalid.load('1e2'), false)
  assert.strictEqual(invalid.requests.length, 0)
  const wrong = make()
  const wrongRequest = wrong.load(901)
  wrong.requests[0].resolve(ok(902))
  assert.strictEqual(await wrongRequest, false)
  assert.strictEqual(wrong.current.cashRegisterSettlement, null)

  for (const identityChange of ['id', 'shopid', 'token']) {
    const h = make()
    const p = makePage(h)
    const initial = p.page.loadSettlement()
    h.requests[0].resolve(ok(901))
    assert.strictEqual(await initial, true)
    assert.strictEqual(p.page.settlement.id, 901)
    assert.ok(p.page.urlPDF)
    printRequest = defer()
    const printing = p.page.printSettlementReceipt()
    h.rootState.users.user[identityChange] = identityChange === 'token' ? 'session-b' : 8
    assert.strictEqual(p.page.settlement, null, 'Owner changes hide financial details before the watcher flushes')
    await Vue.nextTick()
    assert.strictEqual(p.page.urlPDF, '')
    assert.strictEqual(h.current.cashRegisterSettlement, null)
    assert.strictEqual(h.current.cashRegisterSettlementStatus, 'idle')
    if (identityChange === 'shopid') printRequest.reject(new Error('late printer error'))
    else printRequest.resolve({ ok: true })
    assert.strictEqual(await printing, false)
    assert.ok(!p.calls.some(([name]) => name.startsWith('notifications/')), 'Late printing cannot notify another actor')
    p.page.$destroy()
  }
  const h = make()
  const p = makePage(h)
  const oldRoute = p.page.loadSettlement()
  p.route.params.id = '902'
  await Vue.nextTick()
  h.requests[1].resolve(ok(902))
  await Vue.nextTick()
  h.requests[0].resolve(ok(901))
  await oldRoute
  await Vue.nextTick()
  assert.strictEqual(p.page.settlement.id, 902)
  assert.strictEqual(p.pdfs(), 1)
  const destroyed = p.page.loadSettlement()
  p.page.$destroy()
  h.requests[2].resolve(ok(902))
  assert.strictEqual(await destroyed, false)
  assert.strictEqual(h.current.cashRegisterSettlement, null)
  assert.strictEqual(p.page.urlPDF, '')
  assert.strictEqual(p.pdfs(), 1)
  const persisted = sanitizePersistedState({ history: { ...state(), cashRegisterSettlement: dto(901), cashRegisterSettlementOwner: 'standalone-terminal:7:4' } })
  for (const field of ['cashRegisterSettlement', 'cashRegisterSettlementOwner', 'cashRegisterSettlementStatus']) {
    assert.ok(!Object.hasOwnProperty.call(persisted.history, field), `${field} must not persist across sessions`)
  }
  console.log('PASS settlement owner/token isolation, request races, route/destroy cleanup and private persistence')
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => instances.forEach(page => { if (!page._isDestroyed) page.$destroy() }))
