const assert = require('assert')
const {
  buildCashierReceiptPayload,
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
assert.match(smartPrintCalls[0].options.body, /"ticketType":"caisse"/)

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
console.log('receipt printing tests passed')
