/* eslint-disable no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')
const renderer = require('vue-server-renderer').createRenderer()
const receipt = require('../helpers/cashierReceipt')
const kitchen = require('../helpers/orderTicket')
const { sendReceiptBundle } = require('../helpers/receiptBundle')
const { normalizeVatBreakdown } = require('../helpers/vat')

const root = path.resolve(__dirname, '..')
const plain = value => JSON.parse(JSON.stringify(value))
const charge = { feeCents: 400, totalExclTaxCents: 333, taxCents: 67, vatRate: 20,
  fiscalPolicy: { mode: 'configured_rate', vatRate: 20 } }
const product = { name: 'Menu test', qty: 1, total: 20, price: 20, vat_rate: 10, total_ht: 18.18, total_vat: 1.82 }
const order = { id: 31, status: 1, ordernumber: 'TEST-31', delivery_id: '9007199254740993',
  fulfillment_type: 'delivery', order_source: 'web', sale_mode: 'Click & Collect',
  subtotal: 24, subtotal_before_discount: 20, discount_amount: 0, payment_status: 'paid',
  payment: 'Especes', created: '2026-10-16T12:00:00Z',
  delivery_charge: charge, financials: { items_total: 20, items_discount: 0, delivery_fee: 4, grand_total: 24, delivery_charge: charge },
  trackingToken: 'PRIVATE_TRACKING_SENTINEL', addressSnapshot: { instructions: 'PRIVATE_INTERPHONE_SENTINEL' } }
const shopInfo = { shop_name: 'Restaurant Fictif', shop_adress: '7 rue Test', activate_tva: 1 }
const expectedVat = [{ vatRate: 10, totalHt: 18.18, totalVat: 1.82, totalTtc: 20 },
  { vatRate: 20, totalHt: 3.33, totalVat: 0.67, totalTtc: 4 }]
const build = extra => receipt.buildCashierReceiptPayload({ order, details: [product], shopInfo, ...extra })

// Load the actual Vue script and its local imports; only browser-only libraries are inert.
const load = (relative, globals = {}) => {
  const filename = path.isAbsolute(relative) ? relative : path.join(root, relative)
  if (filename.endsWith('.vue') && !fs.existsSync(filename)) return {}
  let source = fs.readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) source = compiler.parseComponent(source).script?.content || 'export default {}'
  const code = babel.transformSync(source, { babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, Buffer, console,
    URL: { createObjectURL: blob => { globals.blobs && globals.blobs.push(blob); return 'blob:fixture' } },
    require: name => {
      if (name.includes('OrderEditModal')) return {}
      if (['html2pdf.js', 'qrcodejs2', 'qrcode-js-package/qrcode.js'].includes(name)) return {}
      if (name.startsWith('@/') || name.startsWith('.')) {
        let target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name)
        if (!path.extname(target)) target += fs.existsSync(target + '.vue') ? '.vue' : '.js'
        return load(target, globals)
      }
      return require(name)
    }, ...globals }, { filename })
  return module.exports
}
const instance = (page, values = {}) => {
  const result = { ...values }
  for (const mixin of page.mixins || []) Object.assign(result, mixin.methods)
  for (const [key, method] of Object.entries(page.methods || {})) if (!(key in values)) result[key] = method.bind(result)
  for (const [key, getter] of Object.entries(page.computed || {})) {
    if (!(key in result)) Object.defineProperty(result, key, { get: () => getter.call(result) })
  }
  return result
}

const tests = []
const test = (name, run) => tests.push({ name, run })
test('literal immutable server charge, VAT and three cashier renderers', () => {
  const payload = build()
  assert.equal(payload.totalAmount, 24)
  assert.deepStrictEqual(payload.deliveryCharge, charge)
  assert.deepStrictEqual(payload.vatBreakdown, expectedVat)
  assert.equal(payload.vatBreakdown.reduce((sum, row) => sum + Math.round(row.totalHt * 100), 0), 2151)
  assert.equal(payload.itemCount, 1)
  assert.equal(payload.details.length, 1)
  assert.equal(payload.saleMode, 'Livraison')
  assert.equal(payload.discountAmount, 0)
  for (const output of [receipt.buildCashierCloudXml(payload), receipt.buildCashierEscPos(payload).toString('ascii')]) {
    assert.match(output, /Livraison : 4,00/)
    assert.match(output, /20 %/)
    assert.match(output, /0,67/)
    assert.doesNotMatch(output, /PRIVATE_/)
  }
  const ticket = receipt.buildCashierTicketData(payload)
  assert.deepStrictEqual(ticket.business.deliveryCharge, charge)
  assert.deepStrictEqual(ticket.business.vatBreakdown, expectedVat)
  assert.match(JSON.stringify(ticket.render), /Livraison : 4,00/)
  assert.equal(ticket.business.items.length, 1)
  assert.doesNotMatch(JSON.stringify(ticket), /PRIVATE_/)
  const changed = build({ order: { ...order, payment_status: 'refunded' }, shopInfo: { ...shopInfo, activate_tva: 0, delivery_fee: 99, vat_rate: 5.5 } })
  assert.equal(changed.totalAmount, 24)
  assert.equal(changed.isTvaActive, true)
  assert.deepStrictEqual(changed.vatBreakdown, expectedVat)
  assert.equal(changed.paymentStatus, 'refunded')
  assert.match(receipt.buildCashierCloudXml(changed), /Rembours/)
})
test('explicit fee argument, free fee zero, missing fiscal data never gets a guessed rate', () => {
  assert.deepStrictEqual(build({ order: { id: 2, subtotal: 24 }, deliveryCharge: charge }).vatBreakdown, expectedVat)
  const free = { ...charge, feeCents: 0, totalExclTaxCents: 0, taxCents: 0 }
  const payload = build({ order: { ...order, subtotal: 20, financials: { ...order.financials, delivery_fee: 0, grand_total: 20, delivery_charge: free }, delivery_charge: free } })
  assert.match(receipt.buildCashierCloudXml(payload), /Livraison : 0,00/)
  assert.deepStrictEqual(payload.vatBreakdown, [expectedVat[0]])
  assert.throws(() => build({ deliveryCharge: { feeCents: 400 } }), /snapshot/i)
  assert.deepStrictEqual(normalizeVatBreakdown([product]), [expectedVat[0]])
})
test('mixed grouped receipt charges once per delivery identity without fake product or count', () => {
  const otherCharge = { ...charge, feeCents: 0, totalExclTaxCents: 0, taxCents: 0 }
  const payload = receipt.buildGroupedCashierReceiptPayload({ shopInfo, orders: [
    { ...order, details: [product] },
    { id: 32, subtotal: 20, details: [product] },
    { ...order, id: 33, delivery_id: '9007199254740994', subtotal: 20, financials: { ...order.financials, delivery_charge: otherCharge, grand_total: 20, delivery_fee: 0 }, delivery_charge: otherCharge, details: [product] },
  ] })
  assert.equal(payload.totalAmount, 64)
  assert.equal(payload.itemCount, 3)
  assert.equal(payload.discountAmount, 0)
  assert.deepStrictEqual(payload.vatBreakdown, [{ vatRate: 10, totalHt: 54.54, totalVat: 5.46, totalTtc: 60 }, expectedVat[1]])
  const xml = receipt.buildCashierCloudXml(payload)
  assert.equal((xml.match(/Livraison : 4,00/g) || []).length, 1)
  assert.equal((xml.match(/Livraison : 0,00/g) || []).length, 1)
  assert.equal(receipt.buildCashierTicketData(payload).business.items.length, 3)
})
test('kitchen fulfillment precedes web channel and print bundle uses injected transports only', () => {
  const payload = kitchen.buildOrderTicketPayload({ order, details: [product], shopInfo })
  assert.equal(payload.saleMode, 'Livraison')
  assert.equal(payload.total, 24)
  assert.doesNotMatch(JSON.stringify(payload), /PRIVATE_/)
  const jobs = []
  sendReceiptBundle({ receiptPayload: build(), smartPrint: true, printerIp: 'injected.invalid',
    fetchImplementation: (url, options) => { jobs.push(JSON.parse(options.body)); return Promise.resolve() } })
  assert.equal(jobs.length, 1)
  assert.deepStrictEqual(jobs[0].ticketData.business.deliveryCharge, charge)
  const cloud = []
  sendReceiptBundle({ receiptPayload: build(), dispatch: (type, value) => { cloud.push({ type, value }); return Promise.resolve() } })
  assert.equal(cloud.length, 1)
  assert.match(cloud[0].value.requete, /Livraison : 4,00/)
})
test('actual Vue tax and service components render the delivery snapshot', async () => {
  const component = load('components/orders/VatBreakdown.vue').default
  assert.deepStrictEqual(plain(component.computed.items.call({ details: [product], deliveryCharge: charge })), expectedVat)
  const chip = load('components/orders/TakeawayChip.vue').default
  const i = instance(chip, { value: 0, fulfillmentType: 'delivery', showDineIn: false, showIcon: true, small: true })
  assert.equal(i.visible, true)
  assert.equal(i.label, 'Livraison')
  assert.equal(i.icon, 'mdi-truck-delivery')
  const source = fs.readFileSync(path.join(root, 'components/orders/TakeawayChip.vue'), 'utf8')
  const compiled = compiler.compile(compiler.parseComponent(source).template.content)
  const html = await renderer.renderToString(new Vue({ ...chip, propsData: { fulfillmentType: 'delivery', showIcon: true },
    render: vm.compileFunction(compiled.render, []), staticRenderFns: compiled.staticRenderFns.map(code => vm.compileFunction(code, [])) }))
  assert.match(html, /Livraison/)
})
test('actual closure Vue consumes stored sources, cross-period flows and zero-order eligibility', () => {
  const page = load('pages/reports.vue').default
  const closure = { orders_count: 0, total_revenue: 0, courier_cash: { courier_cash_sales_cents: 2400,
    register_cash_sales_cents: 0, collected_cents: 0, received_cents: 2400, outstanding_cents: 0,
    remittances_count: 1, adjustments_count: 0, refunds_count: 1, manual_refunded_cents: 2400,
    cash_refunded_by_register_cents: 2400, cash_refunded_by_courier_cents: 0, external_card_refunded_cents: 0 } }
  const i = instance(page, { currentClosure: closure })
  assert.equal(i.canCloseClosure, true)
  assert.deepStrictEqual(plain(i.closureCashRows(closure)).map(row => [row.key, row.cents]), [
    ['register_cash_sales_cents', 0], ['courier_cash_sales_cents', 2400], ['collected_cents', 0], ['received_cents', 2400],
    ['outstanding_cents', 0], ['manual_refunded_cents', 2400], ['cash_refunded_by_register_cents', 2400],
    ['cash_refunded_by_courier_cents', 0], ['external_card_refunded_cents', 0],
  ])
  assert.deepStrictEqual(plain(i.closureCashRows({ courier_cash: null })), [])
  assert.equal(instance(page, { currentClosure: { orders_count: 0 } }).canCloseClosure, false)
  assert.equal(instance(page, { currentClosure: { orders_count: 0, courier_cash: { refunds_count: 1 } } }).canCloseClosure, true)
})
test('actual history jsPDF generator includes original fee VAT and refund state', async () => {
  const blobs = []
  const page = load('pages/history/ticket/_id.vue', { blobs }).default
  const i = instance(page, { dataArchivedOrder: { ...order, payment_status: 'refunded' }, detailArchivedOrder: [product], shopInfo,
    receiptBundleTickets: [] })
  assert.deepStrictEqual(plain(i.vatBreakdown), expectedVat)
  i.generateReceiptPdf()
  const bytes = Buffer.from(await blobs[blobs.length - 1].arrayBuffer())
  const text = bytes.toString('latin1')
  for (const literal of ['Livraison : 4,00', '0,67', '24,00', 'Rembours']) assert.ok(text.includes(literal), literal)
  assert.ok(!text.includes('PRIVATE_'))
  if (process.env.TASK15_PDF_OUTPUT) {
    fs.mkdirSync(process.env.TASK15_PDF_OUTPUT, { recursive: true })
    fs.writeFileSync(path.join(process.env.TASK15_PDF_OUTPUT, 'delivery-refunded.pdf'), bytes)
    const paid = instance(page, { dataArchivedOrder: order, detailArchivedOrder: [product], shopInfo, receiptBundleTickets: [] })
    paid.generateReceiptPdf()
    fs.writeFileSync(path.join(process.env.TASK15_PDF_OUTPUT, 'delivery-paid.pdf'), Buffer.from(await blobs[blobs.length - 1].arrayBuffer()))
  }
})
test('delivery price change uses unpaid pre-pickup edit with explicit server quote confirmation', async () => {
  const calls = []
  const page = load('pages/orders/detail/_id.vue', { localStorage: { getItem: () => 'fixture-only' },
    crypto: require('crypto').webcrypto }).default
  const editable = { order: { ...order, payment_status: 'unpaid', delivery_version: 2 }, content_revision: 'revision',
    items: [{ product_id: 21, quantity: 1, selections: [] }] }
  const i = instance(page, { orderSummary: { ...order, payment_status: 'unpaid', payment_provider: null, delivery_status: 'assigned' },
    userAccess: 0, id: 31, deliveryEditBusy: false, deliveryEdit: null, deliveryEditQuote: null,
    deliveryEditResolution: null, deliveryEditReady: false, deliveryEditDiscountType: 'amount', deliveryEditDiscountValue: 2,
    $store: { dispatch: () => Promise.resolve(true) }, $axios: {
      get: () => Promise.resolve({ data: { data: editable } }),
      patch: (url, body) => { calls.push({ url, body }); return Promise.resolve({ data: { data: {} } }) },
    }, loadOrderDetail: () => Promise.resolve() })
  assert.equal(i.canEditDelivery, true)
  await i.openDeliveryEdit()
  await i.confirmDeliveryEdit()
  assert.equal(calls.length, 0)
  i.deliveryEditQuote = { quoteToken: 'server-quote', grandTotalCents: 2200, expiresAt: '2099-01-01T00:00:00Z' }
  i.deliveryEditResolution = { addressResolutionToken: 'server-proof' }
  i.deliveryEditDiscountType = 'amount'
  i.deliveryEditDiscountValue = 2
  i.deliveryEditConfirmed(true)
  await i.confirmDeliveryEdit()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/baseurl/api/v1/orders/31/items')
  assert.equal(calls[0].body.expected_total, 22)
  assert.equal(calls[0].body.delivery_quote_token, 'server-quote')
  assert.equal(calls[0].body.delivery_expected_version, 2)
  assert.equal(calls[0].body.discount_type, 'amount')
  assert.equal(calls[0].body.discount_value, 2)
  i.acceptDeliveryEditAddress({ addressResolutionToken: 'proof', instructions: 'PRIVATE_INTERPHONE_SENTINEL' })
  assert.equal(i.deliveryEditResolution, null)
  assert.equal(i.deliveryEditReady, false)
  assert.match(i.deliveryEditError, /consignes/i)
  i.orderSummary.payment_status = 'paid'
  assert.equal(i.canEditDelivery, false)
  i.orderSummary.payment_status = 'unpaid'
  i.orderSummary.delivery_status = 'in_transit'
  assert.equal(i.canEditDelivery, false)
})

test('delivery edit uncertain response retries the same body and blocks route departure', async () => {
  const page = load('pages/orders/detail/_id.vue', { localStorage: { getItem: () => 'fixture-only' }, crypto: require('crypto').webcrypto }).default
  const calls = []
  const i = instance(page, { canEditDelivery: true, deliveryEditBusy: false,
    deliveryEdit: { order: { id: 31, delivery_version: 2 }, content_revision: 'revision', items: [] },
    deliveryEditQuote: { quoteToken: 'accepted-quote', grandTotalCents: 2400, expiresAt: '2099-01-01T00:00:00Z' },
    deliveryEditResolution: { addressResolutionToken: 'accepted-proof' }, deliveryEditDiscountType: 'none', deliveryEditDiscountValue: 0,
    deliveryEditAttempt: null, $axios: { patch: (url, body) => { calls.push(plain(body)); return calls.length === 1 ? Promise.reject(new Error('Fictional lost response')) : Promise.resolve() } },
    loadOrderDetail: () => Promise.resolve() })
  i.deliveryEditConfirmed(true)
  await i.confirmDeliveryEdit()
  assert.equal(calls.length, 1)
  assert.ok(i.deliveryEditAttempt)
  let routeResult
  page.beforeRouteLeave.call(i, {}, {}, result => { routeResult = result })
  assert.equal(routeResult, false)
  i.deliveryEditDiscountValue = 99
  await i.confirmDeliveryEdit()
  assert.deepStrictEqual(calls[1], calls[0])
  assert.equal(i.deliveryEditAttempt, null)
})
test('payout edit link opens the eligible delivery after the actual detail loading state clears', async () => {
  const page = load('pages/orders/detail/_id.vue').default
  const route = { params: { id: '31' }, query: { deliveryEdit: '1' } }
  let opened = 0
  const i = instance(page, { ...page.data.call({ $route: route }), $route: route, userAccess: 0,
    openDeliveryEdit: () => { opened++ },
    $store: { dispatch: () => Promise.resolve(true), get: () => [{ ...order, payment_status: 'unpaid', payment_provider: null, delivery_status: 'assigned' }] } })
  await i.loadOrderDetail('31')
  assert.equal(i.loadPage, false)
  assert.equal(opened, 1)
})

;(async () => {
  let failed = 0
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`) } catch (error) { failed++; console.error(`FAIL ${name}: ${error.stack}`) }
  }
  process.exitCode = failed ? 1 : 0
})()
