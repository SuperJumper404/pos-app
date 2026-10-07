const assert = require('assert')
const {
  buildCardTicketPayload,
  buildCardTicketData,
  sendCardTicket,
} = require('../helpers/cardTicket')

const payload = buildCardTicketPayload({
  payment: {
    id: 41,
    orderId: 100,
    orderNumber: 'B100',
    amountCents: 2000,
    cardTicket: {
      brand: 'visa',
      last4: '4242',
      network: 'cartes_bancaires',
      networkTransactionId: 'net_123',
      readMethod: 'contactless_emv',
      authorizationCode: '123456',
      authorizationResponseCode: '00',
      applicationPreferredName: 'CB',
      dedicatedFileName: 'A0000000421010',
      applicationCryptogram: '9F2608ABCDEF12345678',
      terminalVerificationResults: '8000008000',
      transactionStatusInformation: 'E800',
      cardholderVerificationMethod: 'online_pin',
      accountType: 'credit',
      chargeId: 'ch_terminal',
      terminalPaymentId: 41,
      amountCents: 2000,
      fullPan: '4242424242424242',
      client_secret: 'secret',
      rawStripePayload: { secret: true },
    },
  },
  order: {
    id: 100,
    ordernumber: 'B100',
    created: '2026-10-04 12:30:00',
  },
  shopInfo: {
    shop_name: 'Le Comptoir',
    shop_phone: '0102030405',
    shop_siret: '123456789',
  },
})

assert.strictEqual(payload.ticketTitle, 'Ticket carte')
assert.strictEqual(payload.ticketType, 'carte')
assert.strictEqual(payload.paymentMethod, 'Carte bancaire - TPE Stripe')
assert.strictEqual(payload.orderId, 100)
assert.strictEqual(payload.orderNumber, 'B100')
assert.strictEqual(payload.amountCents, 2000)
assert.strictEqual(payload.amount, 20)
assert.strictEqual(payload.brand, 'visa')
assert.strictEqual(payload.last4, '4242')
assert.strictEqual(payload.network, 'cartes_bancaires')
assert.strictEqual(payload.networkTransactionId, 'net_123')
assert.strictEqual(payload.readMethod, 'contactless_emv')
assert.strictEqual(payload.authorizationCode, '123456')
assert.strictEqual(payload.authorizationResponseCode, '00')
assert.strictEqual(payload.applicationPreferredName, 'CB')
assert.strictEqual(payload.dedicatedFileName, 'A0000000421010')
assert.strictEqual(payload.applicationCryptogram, '9F2608ABCDEF12345678')
assert.strictEqual(payload.terminalVerificationResults, '8000008000')
assert.strictEqual(payload.transactionStatusInformation, 'E800')
assert.strictEqual(payload.cardholderVerificationMethod, 'online_pin')
assert.strictEqual(payload.accountType, 'credit')
assert.strictEqual(payload.chargeId, 'ch_terminal')
assert.strictEqual(payload.terminalPaymentId, 41)

const ticketDataText = JSON.stringify(buildCardTicketData(payload))
assert.match(ticketDataText, /Ticket carte/)
assert.match(ticketDataText, /Carte bancaire - TPE Stripe/)
assert.match(ticketDataText, /B100/)
assert.match(ticketDataText, /visa/)
assert.match(ticketDataText, /4242/)
assert.match(ticketDataText, /Ref. reseau : net_123/)
assert.match(ticketDataText, /Autorisation : 123456/)
assert.match(ticketDataText, /R. autorisation : 00/)
assert.match(ticketDataText, /Application : CB/)
assert.match(ticketDataText, /AID : A0000000421010/)
assert.match(ticketDataText, /AC : 9F2608ABCDEF12345678/)
assert.match(ticketDataText, /TVR : 8000008000/)
assert.match(ticketDataText, /TSI : E800/)
assert.match(ticketDataText, /CVM : online_pin/)
assert.match(ticketDataText, /ch_terminal/)
assert.doesNotMatch(ticketDataText, /4242424242424242/)
assert.doesNotMatch(ticketDataText, /client_secret|rawStripePayload|secret/)

const smartCalls = []
assert.strictEqual(sendCardTicket({
  payload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: (url, options) => {
    smartCalls.push({ url, options })
    return new Promise(() => {})
  },
  dispatch: () => true,
}), true)
assert.strictEqual(smartCalls.length, 1)
assert.strictEqual(smartCalls[0].url, 'http://192.168.1.20:8989/print')
const smartBody = JSON.parse(smartCalls[0].options.body)
assert.strictEqual(smartBody.ticketType, 'carte')
assert.ok(smartBody.dataFormatESCPOS)
assert.ok(smartBody.dataFormatXML)
assert.strictEqual(smartBody.ticketData.kind, 'card_ticket')

const cloudCalls = []
assert.strictEqual(sendCardTicket({
  payload,
  smartPrint: false,
  dispatch: (action, params) => {
    cloudCalls.push({ action, params })
    return new Promise(() => {})
  },
}), true)
assert.strictEqual(cloudCalls.length, 1)
assert.strictEqual(cloudCalls[0].action, 'printing/postPrintingJob')
assert.strictEqual(cloudCalls[0].params.ticketType, 'carte')
assert.strictEqual(cloudCalls[0].params.orderId, 100)
assert.match(cloudCalls[0].params.requete, /Ticket carte/)

console.log('kiosk card ticket tests passed')
