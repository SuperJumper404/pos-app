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
      funding: 'debit',
      authorizationCode: '123456',
      network: 'visa',
      readMethod: 'contactless_emv',
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
  ['caisse'],
  'SmartPrint must receive one cashier receipt that contains the card ticket'
)
assert.deepStrictEqual(
  smartPrintCalls.map((call) => call.body.ticketData.kind),
  ['cashier_receipt']
)
const smartTicketText = JSON.stringify(smartPrintCalls[0].body)
assert.deepStrictEqual(
  smartPrintCalls[0].body.ticketData.render.sections.find(section => section.id === 'card_ticket_1')
    .lines.filter(line => line.type === 'text').map(line => line.text),
  ['Ticket de paiement', 'Terminal : TPE', 'Référence : 91', 'Date : 07/10/2026 a 12:00', 'Carte : VISA',
    'Type : Débit', 'PAN : ************4242', 'Montant : 12,50 EUR', 'Paiement accepté']
)
assert.match(smartTicketText, /PAN : \*\*\*\*\*\*\*\*\*\*\*\*4242/)
assert.doesNotMatch(smartTicketText, /Paiement terminal|Charge/)
for (const printed of [smartPrintCalls[0].body.dataFormatXML,
  Buffer.from(smartPrintCalls[0].body.dataFormatESCPOS, 'base64').toString('latin1')]) {
  assert.doesNotMatch(printed, /Ticket carte|Lecture :|Reseau :|Autorisation :/)
  assert.match(printed, /Ticket de paiement/)
  assert.ok(printed.indexOf('Ticket de paiement') < printed.indexOf('Terminal :'))
  assert.match(printed, /Paiement accepté/)
}

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
  ['caisse'],
  'cloud printing must receive one cashier receipt that contains the card ticket'
)
assert.ok(cloudCalls.every((call) => call.action === 'printing/postPrintingJob'))
assert.doesNotMatch(cloudCalls[0].params.requete, /Ticket carte|Lecture :|Reseau :|Autorisation :/)
assert.match(cloudCalls[0].params.requete, /Ticket de paiement/)
assert.match(cloudCalls[0].params.requete, /Paiement accepté/)
assert.match(cloudCalls[0].params.requete, /PAN : \*\*\*\*\*\*\*\*\*\*\*\*4242/)
