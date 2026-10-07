const assert = require('assert')
const { buildCashierReceiptPayload } = require('../helpers/cashierReceipt')
const { buildCardTicketPayload } = require('../helpers/cardTicket')
const {
  buildReceiptBundle,
  sendReceiptBundle,
} = require('../helpers/receiptBundle')

const receiptPayload = buildCashierReceiptPayload({
  order: {
    id: 42,
    ordernumber: 'A42',
    username: 'Comptoir',
    created: '2026-10-07 12:00:00',
    payment: 'Carte bancaire - TPE Stripe',
    subtotal: 12.5,
  },
  details: [{ name: 'Menu', qty: 1, total: 12.5 }],
  shopInfo: {
    shop_name: 'Le Test',
    shop_siret: '123456789',
    activate_tva: false,
  },
})

const cardTicketPayload = buildCardTicketPayload({
  payment: {
    id: 91,
    orderId: 42,
    orderNumber: 'A42',
    amountCents: 1250,
    cardTicket: {
      brand: 'visa',
      last4: '4242',
      authorizationCode: '123456',
      terminalPaymentId: 91,
    },
  },
  order: { id: 42, ordernumber: 'A42', created: '2026-10-07 12:00:00' },
  shopInfo: { shop_name: 'Le Test' },
})

assert.deepStrictEqual(
  buildReceiptBundle({ receiptPayload, cardTicketPayload }).map((ticket) => ticket.kind),
  ['cashier_receipt', 'card_ticket'],
  'combined receipt must always expose the cashier receipt before the card ticket'
)

const smartPrintCalls = []
sendReceiptBundle({
  receiptPayload,
  cardTicketPayload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: (url, options) => {
    smartPrintCalls.push({ url, body: JSON.parse(options.body) })
    return { ok: true }
  },
  dispatch: () => true,
})

assert.deepStrictEqual(
  smartPrintCalls.map((call) => call.body.ticketType),
  ['caisse', 'carte'],
  'SmartPrint must receive the same cashier-then-card order as the PDF preview'
)
assert.deepStrictEqual(
  smartPrintCalls.map((call) => call.body.ticketData.kind),
  ['cashier_receipt', 'card_ticket']
)

const cloudCalls = []
sendReceiptBundle({
  receiptPayload,
  cardTicketPayloads: [cardTicketPayload],
  smartPrint: false,
  dispatch: (action, params) => {
    cloudCalls.push({ action, params })
    return true
  },
})

assert.deepStrictEqual(
  cloudCalls.map((call) => call.params.ticketType),
  ['caisse', 'carte'],
  'cloud printing must keep the same cashier-then-card order'
)
assert.ok(cloudCalls.every((call) => call.action === 'printing/postPrintingJob'))
