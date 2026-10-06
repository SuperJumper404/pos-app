const assert = require('assert')
const {
  buildCashierReceiptPayload,
  buildGroupedCashierReceiptPayload,
  sendCashierReceipt,
} = require('../helpers/cashierReceipt')

const payload = buildCashierReceiptPayload({
  order: {
    id: 42,
    ordernumber: '1234',
    username: 'Comptoir',
    customer: 'Client comptoir',
    created: '2026-08-10 12:30:00',
    payment: 'Espèces',
    subtotal: 12,
    remark: 'Sans oignon',
  },
  details: [{ name: 'Salade', qty: 1, total: 12 }],
  shopInfo: {
    shop_name: 'Le Comptoir',
    shop_adress: '1 rue du Test',
    shop_phone: '0102030405',
    shop_siret: '123',
    activate_tva: false,
  },
})

assert.strictEqual(payload.orderId, 42)
assert.strictEqual(payload.orderNumber, '1234')
assert.strictEqual(payload.totalAmount, 12)
assert.strictEqual(payload.paymentMethod, 'Espèces')

const smartPrintCalls = []
const smartPrintFetch = (url, options) => {
  smartPrintCalls.push({ url, options })
  return { ok: true }
}

const smartPrintResult = sendCashierReceipt({
  payload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: smartPrintFetch,
  dispatch: () => Promise.resolve(true),
})
assert.strictEqual(smartPrintResult, true)
assert.strictEqual(smartPrintCalls.length, 1)
assert.strictEqual(smartPrintCalls[0].url, 'http://192.168.1.20:8989/print')
const smartPrintBody = JSON.parse(smartPrintCalls[0].options.body)
assert.strictEqual(smartPrintBody.ticketType, 'caisse')
assert.ok(smartPrintBody.dataFormatESCPOS)
assert.ok(smartPrintBody.dataFormatXML)
assert.strictEqual(smartPrintBody.ticketData.schemaVersion, 1)
assert.strictEqual(smartPrintBody.ticketData.kind, 'cashier_receipt')
assert.strictEqual(smartPrintBody.ticketData.business.orderId, 42)
assert.strictEqual(smartPrintBody.ticketData.business.shop.siret, '123')
assert.strictEqual(smartPrintBody.ticketData.business.shop.phone, '0102030405')
assert.strictEqual(smartPrintBody.ticketData.business.shop.address, '1 rue du Test')
assert.ok(smartPrintBody.ticketData.render.sections.length > 0)
assert.ok(
  smartPrintBody.ticketData.render.sections.some(
    (section) => section.id === 'items'
  )
)

const legalPayload = buildCashierReceiptPayload({
  order: { id: 420, ordernumber: 'L420', subtotal: 9, payment: 'Carte' },
  details: [{ name: 'Plat', qty: 1, total: 9 }],
  shopInfo: {
    shop_name: 'Legal Shop',
    shop_phone: '0203040506',
    shop_adress: '2 rue Legale',
    shop_siret: '987654321',
    shop_naf: '5610A',
    shop_vat_number: 'FR00987654321',
  },
})
const legalSmartPrintCalls = []
sendCashierReceipt({
  payload: legalPayload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: (url, options) => {
    legalSmartPrintCalls.push({ url, options })
    return { ok: true }
  },
  dispatch: () => true,
})
const legalTicketData = JSON.parse(
  legalSmartPrintCalls[0].options.body
).ticketData
assert.deepStrictEqual(legalTicketData.business.shop, {
  name: 'Legal Shop',
  phone: '0203040506',
  address: '2 rue Legale',
  siret: '987654321',
  naf: '5610A',
  vatNumber: 'FR00987654321',
  receiptReviewQrUrl: '',
  receiptReviewQrLabel: '',
})

const cloudCalls = []
const cloudPrintResult = sendCashierReceipt({
  payload,
  smartPrint: false,
  dispatch: (action, params) => {
    cloudCalls.push({ action, params })
    return Promise.resolve(true)
  },
})
assert.strictEqual(cloudPrintResult, true)
assert.strictEqual(cloudCalls.length, 1)
assert.strictEqual(cloudCalls[0].action, 'printing/postPrintingJob')
assert.strictEqual(cloudCalls[0].params.ticketType, 'caisse')
assert.strictEqual(cloudCalls[0].params.orderId, 42)
assert.match(cloudCalls[0].params.requete, /TOTAL\*/)

const commandPayload = buildCashierReceiptPayload({
  order: { id: 43, ordernumber: 'K43', subtotal: 8 },
  details: [{ name: 'Menu borne', qty: 1, total: 8 }],
  shopInfo: { shop_name: 'Borne' },
  ticketKind: 'commande',
})
const commandSmartPrintCalls = []
sendCashierReceipt({
  payload: commandPayload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: (url, options) => {
    commandSmartPrintCalls.push({ url, options })
    return { ok: true }
  },
  dispatch: () => true,
})
assert.match(commandSmartPrintCalls[0].options.body, /"ticketType":"cuisine"/)
const commandCloudCalls = []
sendCashierReceipt({
  payload: commandPayload,
  smartPrint: false,
  dispatch: (action, params) => {
    commandCloudCalls.push({ action, params })
    return true
  },
})
assert.strictEqual(commandCloudCalls[0].params.ticketType, 'commande')
assert.strictEqual(
  typeof buildGroupedCashierReceiptPayload,
  'function',
  'cash register grouped payout must build one receipt payload for multiple orders'
)
const groupedPayload = buildGroupedCashierReceiptPayload({
  orders: [
    {
      id: 101,
      ordernumber: 'A101',
      service_point_name: 'Table 8',
      customer: 'Alice',
      created: '2026-08-10 12:30:00',
      subtotal: 12,
      receiptDetails: [{ name: 'Burger', qty: 1, total: 12 }],
    },
    {
      id: 102,
      ordernumber: 'A102',
      service_point_name: 'Table 8',
      customer: 'Bob',
      created: '2026-08-10 12:35:00',
      subtotal: 8,
      receiptDetails: [{ name: 'Dessert', qty: 1, total: 8 }],
    },
  ],
  shopInfo: { shop_name: 'Group Shop' },
  fallbackPaymentMethod: 'Carte',
  fallbackTable: 'Table 8',
})
assert.deepStrictEqual(groupedPayload.orderIds, [101, 102])
assert.strictEqual(groupedPayload.orderId, '101-102')
assert.strictEqual(groupedPayload.orderNumber, 'A101 / A102')
assert.strictEqual(groupedPayload.totalAmount, 20)
assert.strictEqual(groupedPayload.itemCount, 2)
assert.strictEqual(groupedPayload.paymentMethod, 'Carte')
assert.deepStrictEqual(
  groupedPayload.orderGroups.map((group) => [
    group.orderNumber,
    group.customer,
    group.details.map((item) => item.name),
  ]),
  [
    ['A101', 'Alice', ['Burger']],
    ['A102', 'Bob', ['Dessert']],
  ]
)
const groupedSmartPrintCalls = []
sendCashierReceipt({
  payload: groupedPayload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: (url, options) => {
    groupedSmartPrintCalls.push({ url, options })
    return { ok: true }
  },
  dispatch: () => true,
})
assert.strictEqual(groupedSmartPrintCalls.length, 1)
const groupedTicketData = JSON.parse(
  groupedSmartPrintCalls[0].options.body
).ticketData
assert.deepStrictEqual(groupedTicketData.business.orderIds, [101, 102])
assert.strictEqual(groupedTicketData.business.items.length, 2)
assert.ok(
  groupedTicketData.render.sections.some(
    (section) =>
      section.id === 'items' &&
      section.lines.some((line) => /Commande #/.test(line.text || ''))
  )
)
const { terminalReceiptSnapshot, terminalReceiptWithDetails } = require('../helpers/cashRegister')
const settled = { id: 91, status: 'succeeded', amountCents: 1075, orderIds: [1],
  allocations: [{ orderId: 1, amountCents: 1075 }] }
const terminalOrder = terminalReceiptSnapshot([{ id: 1, subtotal: 12, total_ht: 10.45, total_vat: 1.55 }], settled)[0]
const originalLines = [
  { orderDetailsId: 10, name: 'A', qty: 1, total: 6, total_ht: 5, total_vat: 1, vat_rate: 20 },
  { orderDetailsId: 20, name: 'B', qty: 1, total: 6, total_ht: 5.45, total_vat: 0.55, vat_rate: 10 },
]
const terminalReceipt = terminalReceiptWithDetails(terminalOrder, originalLines)
assert.deepStrictEqual(terminalReceipt.receiptDetails.map(line => [line.total, line.total_ht, line.total_vat]),
  [[5.38, 4.48, 0.9], [5.37, 4.88, 0.49]])
assert.strictEqual(terminalReceipt.total_ht, 9.36)
assert.strictEqual(terminalReceipt.total_vat, 1.39)
const terminalPayload = buildCashierReceiptPayload({ order: terminalReceipt, details: terminalReceipt.receiptDetails, shopInfo: { activate_tva: true } })
assert.strictEqual(terminalPayload.subtotalBeforeDiscount, 12)
assert.strictEqual(terminalPayload.discountAmount, 1.25)
assert.strictEqual(terminalPayload.totalAmount, 10.75)
assert.strictEqual(terminalPayload.vatBreakdown.reduce((sum, group) => sum + Math.round(group.totalTtc * 100), 0), 1075)
assert.strictEqual(terminalPayload.vatBreakdown.reduce((sum, group) => sum + Math.round(group.totalHt * 100) + Math.round(group.totalVat * 100), 0), 1075)
assert.deepStrictEqual(terminalReceiptWithDetails(terminalOrder, originalLines.slice().reverse()).receiptDetails.slice().reverse(), terminalReceipt.receiptDetails)
assert.deepStrictEqual(originalLines.map(line => line.total), [6, 6])
console.log('receipt printing tests passed')
