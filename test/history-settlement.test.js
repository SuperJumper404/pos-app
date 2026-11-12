const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const { normalizeArchivedHistory } = require('../helpers/history')
const { buildArchivedClientRows } = require('../helpers/clients')
const {
  buildCashierSettlementReceiptPayload,
} = require('../helpers/cashierSettlementReceipt')

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
assert.strictEqual(typeof normalizeArchivedHistory, 'function')

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
    customer: 'Alice',
    phone: '0600000001',
    subtotal: 12,
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
    customer: 'Bob',
    phone: '0600000002',
    subtotal: 18,
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

const normalized = normalizeArchivedHistory(rows)
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

const tieSorted = normalizeArchivedHistory([
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

const errorWithStatus = (status) => {
  const error = new Error(`request failed ${status || 'network'}`)
  if (status) error.response = { status }
  return error
}

const run = async () => {
  const settlementContext = (dispatch) => ({ state: historyStore.state(),
    rootState: { users: { user: { id: 4, shopid: 7, token: 'test-token' } } }, dispatch })
  const archiveDispatches = []
  const archiveResult = await historyStore.actions.getAllArchivedOrders.call({
    $axios: { get: () => Promise.resolve({ data: { data: rows } }) },
  }, { dispatch: (...args) => archiveDispatches.push(args) })
  assert.strictEqual(archiveResult, true)
  const storedArchives = archiveDispatches.find(
    ([name]) => name === 'set/dataArchivedOrders'
  )[1]
  assert.strictEqual(storedArchives.length, rows.length)
  assert.deepStrictEqual(
    Array.from(storedArchives, (order) => order.id).sort((a, b) => a - b),
    rows.map((order) => order.id).sort((a, b) => a - b)
  )
  assert.strictEqual(storedArchives.filter((order) => order.id === 31).length, 2)
  const clientRows = buildArchivedClientRows(storedArchives)
  assert.strictEqual(clientRows.length, 2)
  assert.strictEqual(clientRows.find((client) => client.phoneKey === '0600000001').totalSpent, 12)
  assert.strictEqual(clientRows.find((client) => client.phoneKey === '0600000002').totalSpent, 18)

  const ticketPath = path.join(root, 'pages', 'history', 'ticket', '_id.vue')
  const ticketPage = loadModule(ticketPath, {
    '@/components/orders/TakeawayChip': {},
    'qrcode-js-package/qrcode.js': {},
  }).default
  const ticketInstance = {
    $route: { params: { id: '31' } },
    $store: { get: (key) => key === 'history/dataArchivedOrders' ? storedArchives : null },
  }
  assert.strictEqual(ticketPage.computed.dataArchivedOrder.call(ticketInstance).id, 31)
  const ticketDispatches = []
  await ticketPage.methods.loadReceiptData.call({
    $route: ticketInstance.$route,
    $store: {
      dispatch: (name, payload) => {
        ticketDispatches.push([name, payload])
        return Promise.resolve(true)
      },
    },
    generateReceiptPdf: () => {},
  })
  assert.deepStrictEqual(ticketDispatches, [
    ['history/getAllArchivedOrders', undefined],
    ['history/getDetailArchivedOrder', '31'],
  ])

  const settlementDto = { id: 901, totalAmount: 48, archivedOrders: [] }
  const dispatched = []
  const settlementRequests = []
  const success = await historyStore.actions.getCashRegisterSettlement.call({
    $axios: {
      get: (...args) => {
        settlementRequests.push(args)
        return Promise.resolve({ data: { data: settlementDto } })
      },
    },
  }, settlementContext((...args) => dispatched.push(args)), 901)
  assert.strictEqual(success, true)
  assert.strictEqual(
    settlementRequests[0][0],
    '/baseurl/api/v1/cash-register/settlements/901'
  )
  assert.strictEqual(
    settlementRequests[0][1].skipGlobalErrorNotification,
    true
  )
  assert.deepStrictEqual(dispatched, [
    ['set/cashRegisterSettlement', null],
    ['set/cashRegisterSettlementOwner', 'standalone-terminal:7:4'],
    ['set/cashRegisterSettlementStatus', 'loading'],
    ['set/cashRegisterSettlement', settlementDto],
    ['set/cashRegisterSettlementStatus', 'success'],
  ])

  for (const [status, expectedState] of [
    [404, 'not-found'],
    [403, 'forbidden'],
    [500, 'error'],
    [null, 'error'],
  ]) {
    const failedDispatches = []
    const result = await historyStore.actions.getCashRegisterSettlement.call({
      $axios: { get: () => Promise.reject(errorWithStatus(status)) },
    }, settlementContext((...args) => failedDispatches.push(args)), 999)
    assert.strictEqual(result, false)
    assert.deepStrictEqual(failedDispatches.slice(0, 3), [
      ['set/cashRegisterSettlement', null],
      ['set/cashRegisterSettlementOwner', 'standalone-terminal:7:4'],
      ['set/cashRegisterSettlementStatus', 'loading'],
    ])
    assert.deepStrictEqual(failedDispatches.at(-1), [
      'set/cashRegisterSettlementStatus',
      expectedState,
    ])
    assert.doesNotMatch(JSON.stringify(failedDispatches), /request failed/)
  }

  const pagePath = path.join(root, 'pages', 'history', 'settlement', '_id.vue')
  const source = fs.readFileSync(pagePath, 'utf8')
  const template = compiler.parseComponent(source).template.content
  const compiled = compiler.compile(template)
  assert.deepStrictEqual(compiled.errors, [])
  assert.match(source, /history\/getCashRegisterSettlement/)
  assert.match(source, /cashRegisterSettlementStatus/)
  assert.match(source, /Encaissement introuvable/)
  assert.match(source, /Acces non autorise/)
  assert.match(source, /Impossible de charger l'encaissement/)
  assert.match(source, /Reessayer/)
  assert.match(source, /buildCashierSettlementReceiptPayload/)
  assert.match(source, /sendCashierSettlementReceipt/)
  assert.match(source, /receiptPayload\.orders/)
  assert.match(source, /order\.details/)
  assert.match(source, /orderPaymentStatusLabel\(order\)/)
  assert.match(source, /:to="`\/history\/ticket\/\$\{order\.id\}`"/)
  assert.match(source, /generateSettlementPdf/)
  assert.match(source, /const size = this\.createSettlementPdf\(0\)/)
  assert.match(source, /this\.createSettlementPdf\(size\)/)
  assert.match(source, /payload\.subtotalBeforeDiscount/)
  assert.match(source, /payload\.discountAmount/)
  assert.match(source, /payload\.totalAmount/)
  assert.match(source, /payload\.vatBreakdown/)
  assert.doesNotMatch(source, /@click="[^"]*refund|Rembourser (?:tout|l'encaissement)/i)

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
  let requestCount = 0
  let requestStatus = 'error'
  let currentSettlement = null
  const instance = {
    $route: { params: { id: '901' } },
    $store: {
      get: (key) => ({
        'users/user': { id: 4, shopid: 7, token: 'test-token' },
        'history/cashRegisterSettlementOwner': 'standalone-terminal:7:4',
        'history/cashRegisterSettlement': currentSettlement,
        'history/cashRegisterSettlementStatus': requestStatus,
      })[key],
      dispatch: (name) => {
        if (name !== 'history/getCashRegisterSettlement') return Promise.resolve(true)
        requestCount += 1
        if (requestCount === 1) {
          requestStatus = 'error'
          return Promise.resolve(false)
        }
        requestStatus = 'success'
        currentSettlement = authoritative
        return Promise.resolve(true)
      },
    },
  }
  Object.assign(instance, page.data.call(instance))
  for (const [name, getter] of Object.entries(page.computed)) {
    Object.defineProperty(instance, name, { get: () => getter.call(instance) })
  }
  for (const [name, method] of Object.entries(page.methods)) {
    instance[name] = method.bind(instance)
  }
  assert.strictEqual(instance.orderPaymentStatusLabel({ paymentStatus: 'paid' }), 'Payée')
  assert.strictEqual(
    instance.orderPaymentStatusLabel({ paymentStatus: 'refund_pending', refundStatus: 'pending' }),
    'Remboursement en cours'
  )
  assert.strictEqual(
    instance.orderPaymentStatusLabel({ paymentStatus: 'refunded', refundStatus: 'succeeded' }),
    'Remboursée'
  )
  const statusPayload = buildCashierSettlementReceiptPayload({
    id: 901,
    archivedOrders: [{
      id: 31,
      paymentStatus: 'refunded',
      refundStatus: 'succeeded',
      details: [],
    }],
  })
  assert.strictEqual(statusPayload.orders[0].paymentStatus, 'refunded')
  assert.strictEqual(statusPayload.orders[0].refundStatus, 'succeeded')
  let pdfGenerations = 0
  instance.generateSettlementPdf = () => { pdfGenerations += 1 }
  assert.strictEqual(await instance.loadSettlement(), false)
  assert.strictEqual(instance.settlementStatus, 'error')
  assert.strictEqual(await instance.loadSettlement(), true)
  assert.strictEqual(instance.settlementStatus, 'success')
  assert.strictEqual(requestCount, 2)
  assert.strictEqual(pdfGenerations, 1)
  assert.strictEqual(instance.receiptPayload.totalAmount, 48)
  authoritative.archivedOrders[0].subtotal = -100
  assert.strictEqual(instance.receiptPayload.totalAmount, 48)
  await instance.printSettlementReceipt()
  assert.strictEqual(printCalls[0].payload.totalAmount, 48)

  console.log('history settlement tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
