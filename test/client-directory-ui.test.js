/* eslint-disable vue/one-component-per-file */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')
const Vuex = require('vuex')
const Vuetify = require('vuetify')
const { createRenderer } = require('vue-server-renderer')
Vue.use(Vuex)
Vue.use(Vuetify)
const root = path.resolve(__dirname, '..')
function load(relative) {
  let filename = path.join(root, relative)
  if (!fs.existsSync(filename)) filename += '.js'
  const source = fs.readFileSync(filename, 'utf8')
  const sfc = filename.endsWith('.vue') ? compiler.parseComponent(source) : null
  const code = babel.transformSync(sfc ? sfc.script.content : source, { babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const result = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require'])(result, result.exports, name => name === './delivery' ? { buildDeliveryApi: () => ({}) } : name.startsWith('@/') ? load(name.slice(2)) : require('module').createRequire(filename)(name))
  if (sfc) {
    const compiled = compiler.compile(sfc.template.content)
    assert.deepEqual(compiled.errors, [])
    Object.assign(result.exports.default, { render: vm.compileFunction(compiled.render, []), staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])) })
  }
  return result.exports
}
const data = admin => ({ items: [
  { id: '1', customerId: '1', name: 'Alice Martin', phone: '0612345678', email: 'alice@example.test', aliases: ['Alice'], source: 'account', verified: true,
    orderCount: 3, totalSpent: 24, averageSpent: 8, lastVisitLabel: 'Hier', reconciliation: { status: 'none', candidateIds: [] }, contactKeys: [],
    ...(admin ? { loyalty: { id: 'member-1', balance: 50, reserved: 10, available: 40 } } : {}) },
  { id: 'historical:a', customerId: null, name: 'Ancien contact', phone: '555', email: '', aliases: [], source: 'historical', verified: false,
    orderCount: 1, totalSpent: 8, averageSpent: 8, lastVisitLabel: 'Il y a 32 jours', reconciliation: { status: 'unmatched', candidateIds: [] }, contactKeys: ['a'], ...(admin ? { loyalty: null } : {}) },
], total: 2, metrics: { clientCount: 2, ordersWithPhone: 4, ordersWithoutPhone: 1, inactiveOver30Days: 1, returnRate: 50 },
capabilities: { manageLoyalty: admin, reconcile: admin }, needsImport: true, loading: {}, errors: {}, selected: null, candidates: [],
query: { q: '', filter: 'all', page: 1, pageSize: 25, sortBy: 'lastOrderAt', sortDesc: true } })
function fixture(admin = true, loyaltyOverride = null) {
  const store = new Vuex.Store({ modules: { clients: { namespaced: true, state: data(admin), actions: { reset() {}, load() {}, clearDetail() {} } },
    users: { state: { user: { id: 2, shopid: 7, access: admin ? 0 : 1, session_subject: 'staff' } } },
    loyalty: loyaltyOverride || { namespaced: true, state: { selected: null, busy: false, error: '' }, actions: { reset() {} } },
    products: { namespaced: true, state: { dataProduct: [] }, actions: { getProducts() {} } } } })
  const vuetify = new Vuetify()
  return { store, vuetify }
}
test('the shared directory renders accounts, historical clients, purchases and optional loyalty in one table', async () => {
  const { store, vuetify } = fixture()
  const Directory = load('components/clients/ClientDirectory.vue').default
  const app = new Vue({ store, vuetify, render: h => h('v-app', [h(Directory)]) })
  const html = await createRenderer().renderToString(app)
  assert.match(html, /Alice Martin/)
  assert.match(html, /Ancien contact/)
  assert.match(html, /555/)
  assert.match(html, /40/)
  assert.match(html, /Sans carte/)
  assert.match(html, /Rechercher/)
  app.$destroy()
})
test('non-administrators do not receive program or reconciliation controls', async () => {
  const { store, vuetify } = fixture(false)
  const Page = load('pages/clients.vue').default
  const app = new Vue({ store, vuetify, beforeCreate() { this.$route = { query: {} } }, render: h => h('v-app', [h(Page)]) })
  Vue.prototype.$route = { query: {} }
  const html = await createRenderer().renderToString(app)
  assert.doesNotMatch(html, /Programme de fidélité|Rapprocher l’historique|Points disponibles/)
  app.$destroy()
})
test('legacy loyalty route redirects into the common page; detail never displays another members movements', () => {
  const legacy = load('pages/fidelite.vue').default
  let destination
  legacy.asyncData({ redirect: path => { destination = path } })
  assert.equal(destination, '/clients?tab=programme')
  const { store, vuetify } = fixture()
  store.state.clients.selected = { client: data(true).items[0], orders: [], candidates: [] }
  store.state.loyalty.selected = { id: 'other-member', history: [{ reason: 'wrong client' }] }
  const Detail = load('components/clients/ClientDetail.vue').default
  const detail = new Vue({ ...Detail, store, vuetify, propsData: { id: '1', value: false } })
  assert.equal(detail.member, null)
  detail.$destroy()
})
test('a closed detail does not cancel a pending programme and cached programme can recover from a cancelled read', async () => {
  let complete
  const pending = new Promise(resolve => { complete = resolve })
  const loyaltyModule = load('store/loyalty.js')
  const { store, vuetify } = fixture(true, { ...loyaltyModule, state: loyaltyModule.state() })
  const program = { name: 'Programme conservé', rewards: [] }
  let request = 0
  store.$deliveryApi = { request: () => ++request === 1 ? pending : Promise.resolve({ data: { data: program } }) }
  const Program = load('components/loyalty/LoyaltyProgram.vue').default
  const Detail = load('components/clients/ClientDetail.vue').default
  const panel = new Vue({ ...Program, store, vuetify })
  const opening = panel.load()
  const detail = new Vue({ ...Detail, store, vuetify, propsData: { value: false } })
  complete({ data: { data: program } })
  await opening
  assert.equal(panel.draft?.name, 'Programme conservé')
  panel.draft = null
  await store.dispatch('loyalty/reset')
  assert.equal(typeof Program.activated, 'function')
  await Program.activated.call(panel)
  assert.equal(panel.draft.name, 'Programme conservé')
  detail.$destroy(); panel.$destroy()
})
