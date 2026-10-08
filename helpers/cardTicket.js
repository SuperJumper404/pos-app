const moment = require('moment')
const { formatPrice, roundPrice } = require('./price-functions')

const PAYMENT_METHOD = 'Carte bancaire - TPE Stripe'

const xmlEscape = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const isEnabled = (value) => [true, 1, '1', 'true'].includes(value)
const optionalText = (value) => String(value == null ? '' : value).trim()
const centsToAmount = (value) => roundPrice((Number(value) || 0) / 100)
const formatAmount = (value) => formatPrice(roundPrice(value))
const cardText = (value) => {
  const text = optionalText(value)
  return text || null
}
const normalizeBrand = (value) => {
  const text = optionalText(value)
  if (!text) return null
  const normalized = text.toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'mastercard') return 'MASTERCARD'
  if (normalized === 'visa') return 'VISA'
  if (normalized === 'amex' || normalized === 'americanexpress') return 'AMEX'
  if (normalized === 'cartesbancaires' || normalized === 'cb') return 'CB'
  return text.toUpperCase()
}
const maskPan = (last4) => (/^[0-9]{4}$/.test(String(last4 || '')) ? `************${last4}` : null)

const buildCardTicketPayload = ({ payment = {}, order = {}, shopInfo = {} } = {}) => {
  const card = payment.cardTicket || {}
  const orderId = payment.orderId || order.id || order.orderId
  const amountCents = Number.isSafeInteger(card.amountCents)
    ? card.amountCents
    : payment.amountCents
  return {
    ticketTitle: 'Ticket carte',
    ticketType: 'carte',
    orderId,
    orderNumber: payment.orderNumber || order.ordernumber || order.orderNumber || orderId || '',
    created: order.created || new Date(),
    currentDate: moment(order.created || new Date()).local().format('DD/MM/YYYY [a] HH:mm'),
    paymentMethod: PAYMENT_METHOD,
    amountCents,
    amount: centsToAmount(amountCents),
    brand: normalizeBrand(card.brand),
    last4: typeof card.last4 === 'string' ? card.last4 : null,
    maskedPan: maskPan(card.last4),
    network: cardText(card.network),
    networkTransactionId: cardText(card.networkTransactionId),
    readMethod: cardText(card.readMethod),
    authorizationCode: cardText(card.authorizationCode),
    authorizationResponseCode: cardText(card.authorizationResponseCode),
    applicationPreferredName: cardText(card.applicationPreferredName),
    dedicatedFileName: cardText(card.dedicatedFileName),
    applicationCryptogram: cardText(card.applicationCryptogram),
    terminalVerificationResults: cardText(card.terminalVerificationResults),
    transactionStatusInformation: cardText(card.transactionStatusInformation),
    cardholderVerificationMethod: cardText(card.cardholderVerificationMethod),
    accountType: cardText(card.accountType),
    chargeId: typeof card.chargeId === 'string' ? card.chargeId : null,
    terminalPaymentId: card.terminalPaymentId || payment.id || null,
    shopInfo,
  }
}

const cardLines = (payload = {}) => [
  ['Commande', payload.orderNumber],
  ['Date', payload.currentDate],
  ['Carte', payload.brand],
  ['PAN', payload.maskedPan],
  ['Montant', `${formatAmount(payload.amount)} EUR`],
  ['Autorisation', payload.authorizationCode],
  ['R. autorisation', payload.authorizationResponseCode],
  ['Application', payload.applicationPreferredName],
  ['AID', payload.dedicatedFileName],
  ['AC', payload.applicationCryptogram],
  ['Lecture', payload.readMethod],
  ['Reseau', payload.network],
  ['Ref. reseau', payload.networkTransactionId],
  ['TVR', payload.terminalVerificationResults],
  ['TSI', payload.transactionStatusInformation],
  ['CVM', payload.cardholderVerificationMethod],
  ['Compte', payload.accountType],
].filter((line) => optionalText(line[1]))

const buildCardTicketEscPos = (payload = {}) => {
  const esc = (text) => Buffer.from(String(text == null ? '' : text), 'latin1')
  const alignLeft = () => Buffer.from([0x1b, 0x61, 0])
  const alignCenter = () => Buffer.from([0x1b, 0x61, 1])
  const boldOn = () => Buffer.from([0x1b, 0x45, 1])
  const boldOff = () => Buffer.from([0x1b, 0x45, 0])
  const doubleOn = () => Buffer.from([0x1d, 0x21, 0x11])
  const doubleOff = () => Buffer.from([0x1d, 0x21, 0x00])
  const line = () => esc('--------------------------------\n')
  const cut = () => Buffer.from([0x1d, 0x56, 0x00])
  const output = []
  const push = (...buffers) => buffers.forEach((buffer) => output.push(buffer))
  const shop = payload.shopInfo || {}

  push(Buffer.from([0x1b, 0x40]), Buffer.from([0x1b, 0x74, 0x10]))
  push(alignCenter(), boldOn(), doubleOn(), esc(`${shop.shop_name || ''}\n`), doubleOff())
  push(esc(`${payload.ticketTitle || 'Ticket carte'}\n`), boldOff(), line())
  cardLines(payload).forEach(([label, value]) => {
    push(alignLeft(), esc(`${label} : ${value}\n`))
  })
  push(line(), alignCenter(), boldOn(), esc('Paiement accepte\n'), boldOff())
  push(esc('\n\n\n\n'), cut())
  return Buffer.concat(output)
}

const buildCardTicketCloudXml = (payload = {}) => {
  const shop = payload.shopInfo || {}
  const lines = cardLines(payload)
    .map(([label, value]) =>
      `<text align="left">${xmlEscape(label)} : ${xmlEscape(value)}</text><feed line="1"/>`
    )
    .join('')
  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    '<PrintRequestInfo><ePOSPrint><Parameter><devid>local_printer</devid><timeout>10000</timeout></Parameter><PrintData>' +
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    `<text em="true" align="center" width="2" height="2">${xmlEscape(shop.shop_name || '')}</text><feed line="1"/>` +
    `<text em="true" align="center">${xmlEscape(payload.ticketTitle || 'Ticket carte')}</text><feed line="1"/>` +
    '<text>--------------------------------</text><feed line="1"/>' +
    lines +
    '<text>--------------------------------</text><feed line="1"/>' +
    '<text em="true" align="center">Paiement accepte</text><feed line="4"/><cut/>' +
    '</epos-print></PrintData></ePOSPrint></PrintRequestInfo>'
  )
}

const renderText = (text, options = {}) => ({
  type: 'text',
  text: String(text == null ? '' : text),
  align: options.align || 'left',
  bold: Boolean(options.bold),
  size: options.size || 'normal',
})

const buildCardTicketData = (payload = {}) => ({
  schemaVersion: 1,
  kind: 'card_ticket',
  business: {
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    shop: {
      name: optionalText((payload.shopInfo || {}).shop_name),
      phone: optionalText((payload.shopInfo || {}).shop_phone),
      siret: optionalText((payload.shopInfo || {}).shop_siret),
    },
    currentDate: payload.currentDate,
    paymentMethod: payload.paymentMethod,
    amountCents: payload.amountCents,
    amount: payload.amount,
    brand: payload.brand,
    last4: payload.last4,
    maskedPan: payload.maskedPan,
    network: payload.network,
    networkTransactionId: payload.networkTransactionId,
    readMethod: payload.readMethod,
    authorizationCode: payload.authorizationCode,
    authorizationResponseCode: payload.authorizationResponseCode,
    applicationPreferredName: payload.applicationPreferredName,
    dedicatedFileName: payload.dedicatedFileName,
    applicationCryptogram: payload.applicationCryptogram,
    terminalVerificationResults: payload.terminalVerificationResults,
    transactionStatusInformation: payload.transactionStatusInformation,
    cardholderVerificationMethod: payload.cardholderVerificationMethod,
    accountType: payload.accountType,
  },
  render: {
    paperWidth: 32,
    sections: [
      {
        id: 'header',
        lines: [
          renderText((payload.shopInfo || {}).shop_name || '', { align: 'center', bold: true, size: 'double' }),
          renderText(payload.ticketTitle || 'Ticket carte', { align: 'center', bold: true }),
        ],
      },
      {
        id: 'card',
        lines: cardLines(payload).map(([label, value]) => renderText(`${label} : ${value}`)),
      },
      {
        id: 'footer',
        lines: [
          renderText('Paiement accepte', { align: 'center', bold: true }),
          { type: 'feed', lines: 4 },
          { type: 'cut' },
        ],
      },
    ],
  },
})

const sendCardTicket = ({
  payload,
  smartPrint,
  printerIp,
  dispatch,
  fetchImplementation,
} = {}) => {
  if (!payload || !payload.orderId) {
    throw new TypeError("La commande est introuvable pour l'impression.")
  }

  if (isEnabled(smartPrint)) {
    const requestFetch = fetchImplementation || (typeof fetch === 'function' ? fetch : null)
    if (!requestFetch || !printerIp) throw new TypeError("SmartPrint n'est pas configure.")
    Promise.resolve(
      requestFetch(`http://${printerIp}:8989/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: 'carte',
          dataFormatESCPOS: buildCardTicketEscPos(payload).toString('base64'),
          dataFormatXML: buildCardTicketCloudXml(payload),
          ticketData: buildCardTicketData(payload),
        }),
      })
    ).catch(() => {})
    if (typeof dispatch === 'function') {
      dispatch('notifications/success', 'Impression envoyee.', { root: true })
    }
    return true
  }

  if (typeof dispatch !== 'function') {
    throw new TypeError("Le service d'impression cloud est indisponible.")
  }
  Promise.resolve(
    dispatch('printing/postPrintingJob', {
      requete: buildCardTicketCloudXml(payload),
      ticketType: 'carte',
      orderId: payload.orderId,
    })
  ).catch(() => {})
  return true
}

module.exports = {
  buildCardTicketPayload,
  buildCardTicketEscPos,
  buildCardTicketCloudXml,
  buildCardTicketData,
  cardTicketLines: cardLines,
  sendCardTicket,
}
