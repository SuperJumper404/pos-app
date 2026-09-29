const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

const root = path.resolve(__dirname, '..')

const loadModule = (filename, overrides = {}) => {
  let source = fs.readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) {
    source = compiler.parseComponent(source).script.content
  }
  const code = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    localStorage: { getItem: () => 'test-token' },
    require: (name) => {
      if (overrides[name]) return overrides[name]
      if (name === 'vuex-easy-access') {
        const EasyAccess = () => ({})
        EasyAccess.defaultMutations = () => ({})
        return { __esModule: true, default: EasyAccess, defaultMutations: () => ({}) }
      }
      if (name === '@/helpers/history') {
        return require('../helpers/history')
      }
      if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
      let target = name.startsWith('@/')
        ? path.join(root, name.slice(2))
        : path.resolve(path.dirname(filename), name)
      if (!path.extname(target)) target += '.js'
      return loadModule(target, overrides)
    },
  }, { filename })
  return module.exports
}

const historyStore = loadModule(path.join(root, 'store', 'history.js'))
assert.strictEqual(typeof historyStore.normalizeArchivedHistory, 'function')

const rows = [
  {
    id: 31,
    ordernumber: 'C31',
    archived_at: '2026-09-27T10:00:00.000Z',
    cash_register_settlement_id: 901,
    settlement_table_reference: '12',
    settlement_total_amount: 48,
    settlement_payment_method: 'Carte',
    settlement_created_at: '2026-09-27T12:00:00.000Z',
    payment_status: 'refunded',
  },
  {
    id: 11,
    ordernumber: 'A11',
    archived_at: '2026-09-27T10:01:00.000Z',
    cash_register_settlement_id: null,
    subtotal: 9,
  },
  {
    id: 32,
    ordernumber: 'C32',
    archived_at: '2026-09-27T10:02:00.000Z',
    cash_register_settlement_id: 901,
    settlement_table_reference: '12',
    settlement_total_amount: 48,
    settlement_payment_method: 'Carte',
    settlement_created_at: '2026-09-27T12:00:00.000Z',
  },
  {
    id: 12,
    ordernumber: 'A12',
    archived_at: '2026-09-27T11:00:00.000Z',
    cash_register_settlement_id: null,
    subtotal: 14,
  },
  {
    id: 31,
    ordernumber: 'C31 duplicate join row',
    archived_at: '2026-09-27T10:00:00.000Z',
    cash_register_settlement_id: 901,
    settlement_table_reference: '12',
    settlement_total_amount: 48,
    settlement_payment_method: 'Carte',
    settlement_created_at: '2026-09-27T12:00:00.000Z',
  },
]

const normalized = historyStore.normalizeArchivedHistory(rows)
assert.strictEqual(normalized.length, 3)
assert.deepStrictEqual(
  Array.from(normalized, (item) => item.isSettlement ? item.cash_register_settlement_id : item.id),
  [901, 12, 11]
)
const grouped = normalized[0]
assert.strictEqual(grouped.historyLabel, 'Encaissement table 12')
assert.strictEqual(grouped.subtotal, 48)
assert.strictEqual(grouped.used_payment_method, 'Carte')
assert.strictEqual(grouped.payment_status, 'paid')
assert.strictEqual(grouped.created, '2026-09-27T12:00:00.000Z')
assert.deepStrictEqual(Array.from(grouped.archivedOrders, (order) => order.id), [31, 32])
assert.strictEqual(new Set(grouped.archivedOrders.map((order) => order.id)).size, 2)
assert.deepStrictEqual(
  normalized.filter((item) => !item.isSettlement).map((item) => item.id),
  [12, 11]
)

const tieSorted = historyStore.normalizeArchivedHistory([
  { id: 20, archived_at: '2026-09-27T12:00:00.000Z', cash_register_settlement_id: null },
  {
    id: 19,
    archived_at: '2026-09-27T11:00:00.000Z',
    cash_register_settlement_id: 21,
    settlement_table_reference: 'B',
    settlement_created_at: '2026-09-27T12:00:00.000Z',
  },
])
assert.deepStrictEqual(
  Array.from(tieSorted, (item) => item.isSettlement ? item.cash_register_settlement_id : item.id),
  [21, 20]
)

const dispatched = []
const settlementDto = { id: 901, totalAmount: 48, archivedOrders: [] }
historyStore.actions.getCashRegisterSettlement.call({
  $axios: { get: () => Promise.resolve({ data: { data: settlementDto } }) },
}, { dispatch: (...args) => dispatched.push(args) }, 901).then((result) => {
  assert.strictEqual(result, true)
  assert.deepStrictEqual(dispatched[0], ['set/cashRegisterSettlement', settlementDto])
}).then(async () => {
  const failedDispatches = []
  const notFoundError = new Error('not found')
  notFoundError.response = { status: 404 }
  const result = await historyStore.actions.getCashRegisterSettlement.call({
    $axios: { get: () => Promise.reject(notFoundError) },
  }, { dispatch: (...args) => failedDispatches.push(args) }, 999)
  assert.strictEqual(result, false)
  assert.deepStrictEqual(failedDispatches[1], ['set/cashRegisterSettlement', null])

  const pagePath = path.join(root, 'pages', 'history', 'settlement', '_id.vue')
  const source = fs.readFileSync(pagePath, 'utf8')
  const template = compiler.parseComponent(source).template.content
  const compiled = compiler.compile(template)
  assert.deepStrictEqual(compiled.errors, [])
  assert.match(source, /history\/getCashRegisterSettlement/)
  assert.match(source, /buildCashierSettlementReceiptPayload/)
  assert.match(source, /sendCashierSettlementReceipt/)
  assert.match(source, /receiptPayload\.orders/)
  assert.match(source, /order\.details/)
  assert.match(source, /:to="`\/history\/ticket\/\$\{order\.id\}`"/)
  assert.match(source, /generateSettlementPdf/)
  assert.match(source, /const size = this\.createSettlementPdf\(0\)/)
  assert.match(source, /this\.createSettlementPdf\(size\)/)
  assert.match(source, /payload\.subtotalBeforeDiscount/)
  assert.match(source, /payload\.discountAmount/)
  assert.match(source, /payload\.totalAmount/)
  assert.match(source, /payload\.vatBreakdown/)
  assert.ok(!/refund|rembours/i.test(source), 'settlement route must not expose a global refund action')

  const printCalls = []
  const page = loadModule(pagePath, {
    '@/helpers/cashierSettlementReceipt': {
      buildCashierSettlementReceiptPayload: (settlement) => ({
        settlementId: settlement.id,
        totalAmount: settlement.totalAmount,
        orders: settlement.archivedOrders,
      }),
      sendCashierSettlementReceipt: (options) => {
        printCalls.push(options)
        return Promise.resolve({ ok: true, status: 'submitted' })
      },
    },
    '@/helpers/price': { methods: {} },
  }).default
  const authoritative = {
    id: 901,
    subtotalBeforeDiscount: 52,
    discountAmount: 4,
    totalAmount: 48,
    archivedOrders: [{ id: 31, refund_status: 'refunded', subtotal: 0, details: [] }],
  }
  const instance = {
    $route: { params: { id: '901' } },
    $store: {
      get: (key) => key === 'history/cashRegisterSettlement' ? authoritative : null,
      dispatch: () => Promise.resolve(true),
    },
  }
  Object.assign(instance, page.data.call(instance))
  for (const [name, getter] of Object.entries(page.computed)) {
    Object.defineProperty(instance, name, { get: () => getter.call(instance) })
  }
  for (const [name, method] of Object.entries(page.methods)) {
    instance[name] = method.bind(instance)
  }
  assert.strictEqual(instance.receiptPayload.totalAmount, 48)
  authoritative.archivedOrders[0].subtotal = -100
  assert.strictEqual(instance.receiptPayload.totalAmount, 48)
  await instance.printSettlementReceipt()
  assert.strictEqual(printCalls[0].payload.totalAmount, 48)

  console.log('history settlement tests passed')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
