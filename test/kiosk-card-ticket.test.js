const assert = require('assert')
const {
  buildCardTicketPayload,
  buildCardTicketEscPos,
  buildCardTicketCloudXml,
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
      funding: 'debit',
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
assert.strictEqual(payload.ticketType, 'caisse')
assert.strictEqual(payload.paymentMethod, 'TPE')
assert.strictEqual(payload.orderId, 100)
assert.strictEqual(payload.orderNumber, 'B100')
assert.strictEqual(payload.amountCents, 2000)
assert.strictEqual(payload.amount, 20)
assert.strictEqual(payload.brand, 'VISA')
assert.strictEqual(payload.last4, '4242')
assert.strictEqual(payload.maskedPan, '************4242')
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
assert.match(ticketDataText, /B100/)
const expectedLines = [
  'Terminal : TPE',
  'Référence : 41',
  'Date : 04/10/2026 a 12:30',
  'Carte : VISA',
  'Type : Débit',
  'PAN : ************4242',
  'Montant : 20,00 EUR',
  'Paiement accepté',
]
assert.deepStrictEqual(
  buildCardTicketData(payload).render.sections.flatMap(section => section.lines)
    .filter(line => line.type === 'text').map(line => line.text),
  expectedLines,
  'standalone card tickets must only print the requested payment fields'
)
const escPosText = buildCardTicketEscPos(payload).toString('latin1')
const cloudXml = buildCardTicketCloudXml(payload)
for (const rendered of [escPosText, cloudXml]) {
  for (const line of expectedLines) assert.ok(rendered.includes(line), `missing ${line}`)
  assert.doesNotMatch(rendered, /Ticket carte|Le Comptoir|Commande :|Lecture :|Reseau :|Ref\. reseau|Autorisation|autorisation|Application :|AID :|AC :|TVR :|TSI :|CVM :|Compte :/)
}
assert.doesNotMatch(ticketDataText, /Paiement :/)
assert.doesNotMatch(ticketDataText, /Charge/)
assert.doesNotMatch(ticketDataText, /Paiement terminal/)
assert.doesNotMatch(ticketDataText, /ch_terminal/)
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
assert.strictEqual(smartBody.ticketType, 'caisse')
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
assert.strictEqual(cloudCalls[0].params.ticketType, 'caisse')
assert.strictEqual(cloudCalls[0].params.orderId, 100)
assert.match(cloudCalls[0].params.requete, /Paiement accepté/)

console.log('kiosk card ticket tests passed')
