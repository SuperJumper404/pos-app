const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const {
  buildCashierSettlementCloudXml,
  buildCashierSettlementEscPos,
  buildCashierSettlementReceiptPayload,
  sendCashierSettlementReceipt,
} = require('../helpers/cashierSettlementReceipt')

const occurrences = (value, fragment) =>
  String(value).split(fragment).length - 1

const settlement = {
  id: 701,
  tableReference: 'Table <A & B>',
  paymentMethod: 'Espèces & carte',
  subtotalBeforeDiscount: 30,
  discountType: 'amount',
  discountValue: 3,
  discountAmount: 3,
  totalAmount: 27,
  createdAt: '2026-09-27T12:30:00.000Z',
  archivedOrders: [
    {
      id: 22,
      ordernumber: 'B&2',
      details: [
        {
          name: 'Salade <verte>',
          qty: 1,
          total: 12,
          vat_rate: 10,
          total_ht: 10.91,
          total_vat: 1.09,
          customizationList: [
            {
              step_name: 'Sauce & assaisonnement',
              step_position: 1,
              choice_name: 'Miel <citron>',
              choice_position: 1,
            },
          ],
        },
      ],
    },
    {
      id: 11,
      orderNumber: 'A<1',
      details: [
        {
          name: 'Burger & frites',
          qty: 1,
          total: 18,
          vatRate: 20,
          totalHt: 15,
          totalVat: 3,
          customizationList: [
            {
              stepName: 'Cuisson',
              stepPosition: 1,
              choiceName: 'A point',
              choicePosition: 1,
            },
          ],
        },
      ],
    },
  ],
  // Deliberately differs from line-derived VAT: the server values are authoritative.
  vatBreakdown: [
    { vatRate: 20, totalHt: 13.64, totalVat: 2.73, totalTtc: 16.37 },
    { vatRate: 10, totalHt: 9.66, totalVat: 0.97, totalTtc: 10.63 },
  ],
}

const shopInfo = {
  shop_name: 'Le <Comptoir> & fils',
  shop_adress: '1 rue du Test',
  shop_phone: '0102030405',
  shop_siret: '123',
  activate_tva: true,
  receipt_review_qr_url: 'https://example.test/review?a=1&b=2',
  receipt_review_qr_label: 'Votre avis & nous',
}

const payload = buildCashierSettlementReceiptPayload(settlement, shopInfo)
assert.strictEqual(payload.settlementId, 701)
assert.strictEqual(payload.orderId, 701)
assert.strictEqual(payload.table, 'Table <A & B>')
assert.strictEqual(payload.paymentMethod, 'Espèces & carte')
assert.strictEqual(payload.subtotalBeforeDiscount, 30)
assert.strictEqual(payload.discountAmount, 3)
assert.strictEqual(payload.totalAmount, 27)
assert.deepStrictEqual(payload.vatBreakdown, settlement.vatBreakdown)
assert.deepStrictEqual(payload.orders.map((order) => order.id), [11, 22])
assert.deepStrictEqual(payload.orders.map((order) => order.orderNumber), ['A<1', 'B&2'])
assert.strictEqual(payload.orders[0].details[0].name, 'Burger & frites')

const escPos = buildCashierSettlementEscPos(payload)
assert.strictEqual(typeof escPos, 'string')
assert.strictEqual(occurrences(escPos, 'Le <Comptoir> & fils'), 2)
assert.strictEqual(occurrences(escPos, 'Table <A & B>'), 1)
assert.strictEqual(occurrences(escPos, 'Date : '), 1)
assert.strictEqual(occurrences(escPos, 'Commande n° '), 2)
assert.ok(escPos.indexOf('Commande n° A<1') < escPos.indexOf('Commande n° B&2'))
assert.match(escPos, /Burger & frites/)
assert.match(escPos, /Cuisson : A point/)
assert.match(escPos, /Salade <verte>/)
assert.match(escPos, /Sauce & assaisonnement : Miel <citron>/)
assert.match(escPos, /SOUS-TOTAL : 30,00/)
assert.match(escPos, /REMISE : -3,00/)
assert.match(escPos, /HT \(10 %\) : 9,66/)
assert.match(escPos, /TVA \(20 %\) : 2,73/)
assert.match(escPos, /TOTAL TTC : 27,00/)
assert.strictEqual(occurrences(escPos, 'Paiement : Espèces & carte'), 1)
assert.strictEqual(occurrences(escPos, 'Votre avis & nous'), 1)
assert.strictEqual(occurrences(escPos, 'Made with smarteat.fr'), 1)

const cloudXml = buildCashierSettlementCloudXml(payload)
assert.strictEqual(occurrences(cloudXml, 'Le &lt;Comptoir&gt; &amp; fils'), 2)
assert.strictEqual(occurrences(cloudXml, 'Table &lt;A &amp; B&gt;'), 1)
assert.strictEqual(occurrences(cloudXml, 'Date : '), 1)
assert.strictEqual(occurrences(cloudXml, 'Commande n° '), 2)
assert.ok(cloudXml.indexOf('A&lt;1') < cloudXml.indexOf('B&amp;2'))
assert.match(cloudXml, /Burger &amp; frites/)
assert.match(cloudXml, /Sauce &amp; assaisonnement : Miel &lt;citron&gt;/)
assert.match(cloudXml, /SOUS-TOTAL : 30,00/)
assert.match(cloudXml, /REMISE : -3,00/)
assert.match(cloudXml, /HT \(10 %\): 9,66/)
assert.match(cloudXml, /TVA \(20 %\): 2,73/)
assert.match(cloudXml, /TOTAL TTC : 27,00/)
assert.strictEqual(occurrences(cloudXml, 'Paiement : Espèces &amp; carte'), 1)
assert.strictEqual(occurrences(cloudXml, 'Votre avis &amp; nous'), 1)
assert.strictEqual(occurrences(cloudXml, '<symbol type="qrcode"'), 1)
assert.match(cloudXml, /review\?a=1&amp;b=2/)
assert.strictEqual(occurrences(cloudXml, 'Made with smarteat.fr'), 1)

const submittedPrintResult = { ok: true, status: 'submitted' }
const failedPrintResult = {
  ok: false,
  status: 'failed',
  code: 'PRINT_SUBMISSION_FAILED',
  message: "L'impression du ticket a echoue.",
}

const testTransportContract = async () => {
  const smartPrintCalls = []
  const smartPrintPromise = sendCashierSettlementReceipt({
    payload,
    smartPrint: true,
    printerIp: '192.168.1.20',
    fetchImplementation: (url, options) => {
      smartPrintCalls.push({ url, options })
      return Promise.resolve({ ok: true })
    },
    dispatch: () => true,
  })
  assert.ok(smartPrintPromise instanceof Promise)
  assert.deepStrictEqual(await smartPrintPromise, submittedPrintResult)
  assert.strictEqual(smartPrintCalls.length, 1)
  assert.strictEqual(smartPrintCalls[0].url, 'http://192.168.1.20:8989/print')
  const smartPrintBody = JSON.parse(smartPrintCalls[0].options.body)
  assert.strictEqual(smartPrintBody.ticketType, 'caisse')
  assert.strictEqual(
    Buffer.from(smartPrintBody.dataFormatESCPOS, 'base64').toString('latin1'),
    escPos
  )

  const rejectedSmartPrintCalls = []
  const rejectedSmartPrintResult = await sendCashierSettlementReceipt({
    payload,
    smartPrint: true,
    printerIp: '192.168.1.20',
    fetchImplementation: (...args) => {
      rejectedSmartPrintCalls.push(args)
      return Promise.reject(new Error('smart provider secret'))
    },
    dispatch: () => true,
  })
  assert.deepStrictEqual(rejectedSmartPrintResult, failedPrintResult)
  assert.strictEqual(rejectedSmartPrintCalls.length, 1)
  assert.doesNotMatch(JSON.stringify(rejectedSmartPrintResult), /provider secret/)

  const cloudPrintCalls = []
  const cloudPrintPromise = sendCashierSettlementReceipt({
    payload,
    smartPrint: false,
    dispatch: (action, params) => {
      cloudPrintCalls.push({ action, params })
      return Promise.resolve(true)
    },
  })
  assert.ok(cloudPrintPromise instanceof Promise)
  assert.deepStrictEqual(await cloudPrintPromise, submittedPrintResult)
  assert.strictEqual(cloudPrintCalls.length, 1)
  assert.strictEqual(cloudPrintCalls[0].action, 'printing/postPrintingJob')
  assert.strictEqual(cloudPrintCalls[0].params.orderId, 701)
  assert.strictEqual(cloudPrintCalls[0].params.requete, cloudXml)

  const rejectedCloudPrintCalls = []
  const rejectedCloudPrintResult = await sendCashierSettlementReceipt({
    payload,
    smartPrint: false,
    dispatch: (...args) => {
      rejectedCloudPrintCalls.push(args)
      return Promise.reject(new Error('cloud provider secret'))
    },
  })
  assert.deepStrictEqual(rejectedCloudPrintResult, failedPrintResult)
  assert.strictEqual(rejectedCloudPrintCalls.length, 1)
  assert.doesNotMatch(JSON.stringify(rejectedCloudPrintResult), /provider secret/)

  const printingStoreSource = fs.readFileSync(
    path.join(root, 'store', 'printing.js'),
    'utf8'
  )
  const printingStoreCode = babel.transformSync(printingStoreSource, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code
  const printingStoreModule = { exports: {} }
  vm.runInNewContext(printingStoreCode, {
    module: printingStoreModule,
    exports: printingStoreModule.exports,
    localStorage: { getItem: () => 'test-token' },
    require,
  })
  const realCloudResult = await sendCashierSettlementReceipt({
    payload,
    smartPrint: false,
    dispatch: (action, params) =>
      printingStoreModule.exports.actions.postPrintingJob.call({
        $axios: {
          post: () => Promise.reject(new Error('axios provider secret')),
        },
      }, { dispatch: () => true }, params),
  })
  assert.deepStrictEqual(realCloudResult, failedPrintResult)
  assert.doesNotMatch(JSON.stringify(realCloudResult), /provider secret/)

  const missingPayloadPromise = sendCashierSettlementReceipt({ payload: null })
  assert.ok(missingPayloadPromise instanceof Promise)
  await assert.rejects(
    missingPayloadPromise,
    /encaissement est introuvable/
  )
}

const root = path.resolve(__dirname, '..')
const payoutPath = path.join(root, 'pages', 'cashregister', 'payout', '_id.vue')

const payoutHarness = ({ printError = null } = {}) => {
  const calls = []
  const printCalls = []
  const sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }
  const settlementResult = {
    ...settlement,
    archivedOrders: settlement.archivedOrders.map((order) => ({ ...order })),
  }
  const settlementReceipt = { settlementId: settlement.id, orders: [{}, {}] }
  const load = (filename) => {
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
      sessionStorage,
      require: (name) => {
        if (name === '@/helpers/cashierSettlementReceipt') {
          return {
            buildCashierSettlementReceiptPayload: (value, valueShopInfo) => {
              printCalls.push({ type: 'build', value, shopInfo: valueShopInfo })
              return settlementReceipt
            },
            sendCashierSettlementReceipt: (options) => {
              printCalls.push({ type: 'send', options })
              if (printError) return Promise.reject(printError)
              return Promise.resolve(submittedPrintResult)
            },
          }
        }
        if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
        let target = name.startsWith('@/')
          ? path.join(root, name.slice(2))
          : path.resolve(path.dirname(filename), name)
        if (!path.extname(target)) target += '.js'
        return load(target)
      },
    }, { filename })
    return module.exports
  }
  const page = load(payoutPath).default
  const instance = {
    $route: {
      params: { id: 'Table test' },
      query: {
        modals: 'true',
        mode: 'table',
        tableId: 7,
        settlementKey: 'settlement-key',
        orders: [11, 22],
      },
      path: '/cashregister/payout/Table%20test',
    },
    $router: {
      push: (value) => {
        calls.push({ name: 'navigate', payload: value })
        return Promise.resolve()
      },
      replace: () => Promise.resolve(),
    },
    $store: {
      get: (key) => ({
        authenticated: true,
        'users/user': { id: 4, shopid: 2 },
        'orders/dataOrders': [],
        'shop/shop_name': shopInfo.shop_name,
        'shop/shop_adress': shopInfo.shop_adress,
        'shop/shop_phone': shopInfo.shop_phone,
        'shop/shop_siret': shopInfo.shop_siret,
        'shop/activate_tva': true,
        'shop/receipt_review_qr_url': shopInfo.receipt_review_qr_url,
        'shop/receipt_review_qr_label': shopInfo.receipt_review_qr_label,
        'shop/shop_printer_ip': '192.168.1.20',
        'shop/smart_print_app': true,
      })[key],
      dispatch: (name, payload) => {
        calls.push({ name, payload })
        if (name === 'orders/createTableSettlement') {
          return { ok: true, settlement: settlementResult }
        }
        return true
      },
    },
  }
  Object.assign(instance, page.data.call(instance))
  for (const mixin of page.mixins || []) Object.assign(instance, mixin.methods)
  for (const [name, method] of Object.entries(page.methods)) {
    instance[name] = method.bind(instance)
  }
  for (const [name, getter] of Object.entries(page.computed)) {
    Object.defineProperty(instance, name, { get: () => getter.call(instance) })
  }
  return { instance, calls, printCalls, settlementResult, settlementReceipt }
}

const testPayoutIntegration = async () => {
  const draft = {
    mode: 'table',
    settlementKey: 'settlement-key',
    tableId: 7,
    tableName: 'Table test',
    orderIds: [11, 22],
    paymentMethod: 'Espèces',
    discountType: 'amount',
    discountValue: 3,
  }
  const printed = payoutHarness()
  assert.strictEqual(await printed.instance.finalizeTableSettlement({
    draft,
    wantsReceipt: true,
  }), true)
  assert.strictEqual(
    printed.printCalls.filter((call) => call.type === 'build').length,
    1
  )
  assert.strictEqual(
    printed.printCalls.filter((call) => call.type === 'send').length,
    1
  )
  assert.strictEqual(printed.printCalls[0].value, printed.settlementResult)
  assert.strictEqual(
    printed.printCalls.find((call) => call.type === 'send').options.payload,
    printed.settlementReceipt
  )

  const failed = payoutHarness({ printError: new Error('printer offline') })
  assert.strictEqual(await failed.instance.finalizeTableSettlement({
    draft,
    wantsReceipt: true,
  }), true)
  assert.strictEqual(failed.instance.tableSettlement, failed.settlementResult)
  assert.strictEqual(failed.instance.tableSettlementDraft, null)
  assert.strictEqual(
    failed.printCalls.filter((call) => call.type === 'send').length,
    1
  )
  assert.strictEqual(
    failed.calls.filter((call) => call.name === 'orders/createTableSettlement').length,
    1
  )
  const printNotification = failed.calls.find((call) =>
    call.name === 'notifications/error' && /historique/i.test(call.payload)
  )
  assert.ok(printNotification, 'print failure must explain that history reprint remains available')
  assert.ok(failed.calls.some((call) => call.name === 'navigate'))
}

testTransportContract().then(testPayoutIntegration).then(() => {
  console.log('cash register settlement receipt tests passed')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
