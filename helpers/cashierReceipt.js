const moment = require('moment')
const { normalizeVatBreakdown } = require('./vat')
const { formatPrice, parsePrice, roundPrice } = require('./price-functions')

const isEnabled = (value) => [true, 1, '1', 'true'].includes(value)

const splitByWords = (value, maxLength = 30) => {
  const words = String(value || '').split(' ')
  const lines = []
  let current = ''

  words.forEach((word) => {
    if (!word) return
    if ((current + word).length > maxLength && current) {
      lines.push(current.trim())
      current = `${word} `
      return
    }
    current += `${word} `
  })

  if (current.trim()) lines.push(current.trim())
  return lines
}

const formatTicketNumber = (value) => formatPrice(value)

const formatVatRate = (value) => `${String(value).replace('.', ',')} %`

const xmlEscape = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const sumDetails = (details) =>
  roundPrice(
    (Array.isArray(details) ? details : []).reduce(
      (sum, item) => sum + parsePrice(item && item.total),
      0
    )
  )

const buildCashierReceiptPayload = ({
  order = {},
  details = [],
  shopInfo = {},
  fallbackPaymentMethod = '',
  fallbackCustomer = 'Client comptoir',
  fallbackTable = 'Comptoir',
  fallbackRemark = '',
} = {}) => {
  const normalizedDetails = Array.isArray(details) ? details : []
  const orderId = order.id || order.orderId
  const totalAmount = roundPrice(
    order.subtotal == null ? sumDetails(normalizedDetails) : order.subtotal
  )
  const paymentMethod =
    order.used_payment_method ||
    order.payment ||
    fallbackPaymentMethod ||
    'Caisse'

  return {
    orderId,
    orderNumber: order.ordernumber || order.orderNumber || orderId || '',
    table: order.username || order.table || fallbackTable,
    customer: order.customer || order.customer_name || fallbackCustomer,
    created: order.created || new Date(),
    currentDate: moment(order.created || new Date())
      .local()
      .format('DD/MM/YYYY [à] HH:mm'),
    paymentMethod,
    remark: order.remark || fallbackRemark || '',
    details: normalizedDetails,
    shopInfo,
    totalAmount,
    isTvaActive: isEnabled(shopInfo.activate_tva),
    vatBreakdown: normalizeVatBreakdown(normalizedDetails),
  }
}

const buildCashierEscPos = (payload) => {
  const esc = (text) => Buffer.from(text, 'ascii')
  const alignLeft = () => Buffer.from([0x1b, 0x61, 0])
  const alignCenter = () => Buffer.from([0x1b, 0x61, 1])
  const alignRight = () => Buffer.from([0x1b, 0x61, 2])
  const boldOn = () => Buffer.from([0x1b, 0x45, 1])
  const boldOff = () => Buffer.from([0x1b, 0x45, 0])
  const doubleOn = () => Buffer.from([0x1d, 0x21, 0x11])
  const doubleOff = () => Buffer.from([0x1d, 0x21, 0x00])
  const line = () => esc('--------------------------------\n')
  const cut = () => Buffer.from([0x1d, 0x56, 0x00])
  const euroSymbol = Buffer.from([0x80])
  const output = []
  const push = (...buffers) => buffers.forEach((buffer) => output.push(buffer))
  const shopInfo = payload.shopInfo || {}

  push(Buffer.from([0x1b, 0x40]))
  push(Buffer.from([0x1b, 0x74, 0x10]))
  push(alignCenter(), boldOn(), doubleOn())
  push(esc(`${shopInfo.shop_name || ''}\n`))
  push(doubleOff(), boldOff())
  push(alignCenter(), esc(`TEL: ${shopInfo.shop_phone || ''}\n`))
  push(alignCenter(), esc(`SIRET: ${shopInfo.shop_siret || ''}\n`))
  splitByWords(shopInfo.shop_adress || '').forEach((lineText) => {
    push(alignCenter(), esc(`${lineText}\n`))
  })
  push(esc('\n'))

  push(
    alignLeft(),
    boldOn(),
    esc(`${payload.table || ''}\n`),
    boldOff(),
    esc('Commande n° '),
    boldOn(),
    esc(`${payload.orderNumber}\n`),
    boldOff(),
    esc('Date : '),
    boldOn(),
    esc(`${payload.currentDate}\n\n`),
    boldOff()
  )
  push(boldOn(), esc('QTE   PRODUIT                PRIX\n\n'), boldOff())
  push(line())

  payload.details.forEach((item) => {
    const qty = `${item.qty}x`.padEnd(5)
    const name = String(item.name || '').padEnd(20).slice(0, 20)
    const price = formatTicketNumber(item.total).padStart(7)
    push(alignLeft(), esc(`${qty}${name}${price} `), euroSymbol, esc('\n'))
  })
  push(line())

  if (payload.isTvaActive) {
    payload.vatBreakdown.forEach((item) => {
      push(
        alignRight(),
        esc(`HT (${formatVatRate(item.vatRate)}) : ${formatTicketNumber(item.totalHt)} `),
        euroSymbol,
        esc('\n'),
        alignRight(),
        esc(`TVA (${formatVatRate(item.vatRate)}) : ${formatTicketNumber(item.totalVat)} `),
        euroSymbol,
        esc('\n')
      )
    })
  }

  push(alignRight(), boldOn(), doubleOn())
  push(
    esc(`TOTAL${payload.isTvaActive ? ' TTC' : '*'} : ${formatTicketNumber(payload.totalAmount)} `),
    euroSymbol,
    esc('\n'),
    doubleOff(),
    boldOff(),
    esc('\n'),
    alignRight(),
    esc(`Paiement : ${payload.paymentMethod}\n`),
    line(),
    alignCenter(),
    esc('À très bientôt !\n'),
    esc(`${shopInfo.shop_name || ''}\n`),
    esc('Made with smarteat.fr\n')
  )
  if (!payload.isTvaActive) {
    push(esc('* TVA non applicable, art. 293 B du CGI\n'))
  }
  push(esc('\n\n\n\n'), cut())
  return Buffer.concat(output)
}

const buildCashierCloudXml = (payload) => {
  const shopInfo = payload.shopInfo || {}
  const addressXml = splitByWords(shopInfo.shop_adress || '')
    .map(
      (line) =>
        `<text width="1" height="1" align="center">${xmlEscape(line)}</text><feed line="1"/>`
    )
    .join('')
  const productXml = payload.details
    .map((item) => {
      const qty = `${item.qty}x`.padEnd(5)
      const name = String(item.name || '').padEnd(20).slice(0, 20)
      const price = formatTicketNumber(item.total).padStart(7)
      return (
        `<text em="true" align="left">${xmlEscape(qty + name + price)} \u20AC</text>` +
        '<feed line="1"/>'
      )
    })
    .join('')
  const vatXml = payload.isTvaActive
    ? payload.vatBreakdown
        .map(
          (item) =>
            `<text align="right">HT (${xmlEscape(formatVatRate(item.vatRate))}): ${xmlEscape(formatPrice(item.totalHt))} \u20AC</text>` +
            '<feed line="1"/>' +
            `<text align="right">TVA (${xmlEscape(formatVatRate(item.vatRate))}): ${xmlEscape(formatPrice(item.totalVat))} \u20AC</text>` +
            '<feed line="1"/>'
        )
        .join('')
    : ''
  const totalLabel = `TOTAL${payload.isTvaActive ? ' TTC' : '*'}`

  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    '<PrintRequestInfo><ePOSPrint><Parameter>' +
    '<devid>local_printer</devid><timeout>10000</timeout>' +
    '</Parameter><PrintData>' +
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    '<text smooth="true"></text>' +
    `<text em="true" align="center" width="2" height="2">${xmlEscape(shopInfo.shop_name)}</text>` +
    '<feed line="1"/>' +
    `<text align="center">TEL : ${xmlEscape(shopInfo.shop_phone)}</text>` +
    '<feed line="1"/>' +
    `<text align="center">SIRET : ${xmlEscape(shopInfo.shop_siret)}</text>` +
    '<feed line="1"/>' +
    addressXml +
    '<feed line="2"/>' +
    `<text em="true" align="left">${xmlEscape(payload.table)}</text>` +
    '<feed line="1"/>' +
    `<text em="false">Commande n° ${xmlEscape(payload.orderNumber)}</text>` +
    '<feed line="1"/>' +
    `<text>Date : ${xmlEscape(payload.currentDate)}</text>` +
    '<feed line="2"/>' +
    '<text>QTE   PRODUIT                PRIX\n\n</text>' +
    '<text>--------------------------------</text><feed line="1"/>' +
    productXml +
    '<text>--------------------------------</text><feed line="1"/>' +
    vatXml +
    `<text align="right" width="2" height="2">${totalLabel} : ${xmlEscape(formatPrice(payload.totalAmount))} \u20AC</text>` +
    '<feed line="2"/>' +
    `<text>Paiement : ${xmlEscape(payload.paymentMethod)}</text>` +
    '<feed line="1"/><text>--------------------------------</text><feed line="2"/>' +
    '<text align="center">À très bientôt !</text><feed line="1"/>' +
    `<text align="center">${xmlEscape(shopInfo.shop_name)}</text>` +
    '<feed line="1"/><text align="center">Made with smarteat.fr</text>' +
    '<feed line="3"/><cut/></epos-print></PrintData></ePOSPrint></PrintRequestInfo>'
  )
}

const sendCashierReceipt = ({
  payload,
  smartPrint,
  printerIp,
  dispatch,
  fetchImplementation,
} = {}) => {
  if (!payload || !payload.orderId) {
    throw new TypeError('La commande est introuvable pour l’impression.')
  }

  if (smartPrint) {
    const requestFetch =
      fetchImplementation || (typeof fetch === 'function' ? fetch : null)
    if (!requestFetch || !printerIp) {
      throw new TypeError('SmartPrint n’est pas configuré.')
    }
    try {
      Promise.resolve(
        requestFetch(`http://${printerIp}:8989/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketType: 'caisse',
            dataFormatESCPOS: buildCashierEscPos(payload).toString('base64'),
            dataFormatXML: null,
          }),
        })
      ).catch(() => {})
    } catch (error) {
      // The job was attempted; printer transport errors are intentionally ignored.
    }
    if (typeof dispatch === 'function') {
      dispatch('notifications/success', 'Impression envoyée.', { root: true })
    }
    return true
  }

  if (typeof dispatch !== 'function') {
    throw new TypeError('Le service d’impression cloud est indisponible.')
  }
  try {
    Promise.resolve(
      dispatch('printing/postPrintingJob', {
        requete: buildCashierCloudXml(payload),
        ticketType: 'caisse',
        orderId: payload.orderId,
      })
    ).catch(() => {})
  } catch (error) {
    // The job was attempted; printer transport errors are intentionally ignored.
  }
  return true
}

module.exports = {
  buildCashierCloudXml,
  buildCashierEscPos,
  buildCashierReceiptPayload,
  sendCashierReceipt,
  splitByWords,
}
