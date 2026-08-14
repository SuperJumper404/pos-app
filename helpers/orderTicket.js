const moment = require('moment')

const xmlEscape = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const splitByWords = (value, maxLength = 30) => {
  const lines = []
  let current = ''

  String(value || '')
    .split(' ')
    .filter(Boolean)
    .forEach((word) => {
      if (current && current.length + word.length + 1 > maxLength) {
        lines.push(current)
        current = word
      } else {
        current = current ? `${current} ${word}` : word
      }
    })

  if (current) lines.push(current)
  return lines
}

const formatAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2).replace('.', ',') : '0,00'
}

const isEnabled = (value) => [true, 1, '1', 'true'].includes(value)

const getSaleMode = (order = {}) =>
  order.sale_mode || order.saleMode ||
  (isEnabled(order.is_takeaway) ? 'À emporter' : 'Sur place')

const getChoiceName = (choice = {}) =>
  String(choice.choice_name || choice.choiceName || choice.name || '').trim()

const getStepName = (choice = {}) =>
  String(choice.step_name || choice.stepName || '').trim()

const getCustomizationLabel = (choice = {}) => {
  const choiceName = getChoiceName(choice)
  const stepName = getStepName(choice)
  if (!choiceName) return ''
  return stepName ? `${stepName} : ${choiceName}` : choiceName
}

const customizationLines = (item = {}) =>
  (Array.isArray(item.customizationList) ? item.customizationList : [])
    .map(getCustomizationLabel)
    .filter(Boolean)

const getItemPrice = (item = {}) =>
  item.total === undefined || item.total === null ? item.price : item.total

const sumDetails = (details) =>
  (Array.isArray(details) ? details : []).reduce(
    (sum, item) => sum + (Number(getItemPrice(item)) || 0),
    0
  )

const formatDate = (value) =>
  moment(value || new Date()).local().format('DD/MM/YYYY [à] HH:mm')

const buildOrderTicketPayload = ({
  order = {},
  details = [],
  shopInfo = {},
  fallbackTable = 'Comptoir',
  fallbackPaymentMethod = '',
} = {}) => {
  const normalizedDetails = Array.isArray(details) ? details : []
  return {
    orderId: order.id || order.orderId,
    orderNumber: order.ordernumber || order.orderNumber || order.id || '',
    table:
      order.service_point_name ||
      order.username ||
      order.table ||
      fallbackTable,
    customer: order.customer || order.customer_name || 'Client',
    created: order.created || new Date(),
    paymentMethod:
      order.payment || order.used_payment_method || fallbackPaymentMethod || '',
    saleMode: getSaleMode(order),
    total: order.subtotal == null ? sumDetails(normalizedDetails) : order.subtotal,
    remark: order.remark || '',
    details: normalizedDetails,
    shopInfo,
  }
}

const buildOrderTicketEscPos = (payload = {}) => {
  const esc = (text) => Buffer.from(String(text || ''), 'latin1')
  const alignLeft = () => Buffer.from([0x1b, 0x61, 0])
  const alignCenter = () => Buffer.from([0x1b, 0x61, 1])
  const boldOn = () => Buffer.from([0x1b, 0x45, 1])
  const boldOff = () => Buffer.from([0x1b, 0x45, 0])
  const doubleOn = () => Buffer.from([0x1d, 0x21, 0x11])
  const doubleOff = () => Buffer.from([0x1d, 0x21, 0x00])
  const doubleHeightOn = () => Buffer.from([0x1d, 0x21, 0x01])
  const doubleHeightOff = () => Buffer.from([0x1d, 0x21, 0x00])
  const tripleOn = () => Buffer.from([0x1d, 0x21, 0x22])
  const line = () => esc('--------------------------------\n')
  const cut = () => Buffer.from([0x1d, 0x56, 0x00])
  const euroSymbol = Buffer.from([0x80])
  const output = []
  const push = (...buffers) => buffers.forEach((buffer) => output.push(buffer))
  const shop = payload.shopInfo || {}

  push(Buffer.from([0x1b, 0x40]), Buffer.from([0x1b, 0x74, 0x10]))
  push(alignCenter(), boldOn(), doubleOff(), esc(`${shop.shop_name || ''}\n`))
  push(doubleOff(), boldOff(), esc('\n'))

  push(
    alignCenter(),
    boldOn(),
    doubleOn(),
    esc('Commande\n'),
    tripleOn(),
    esc(`#${payload.orderNumber}\n`),
    boldOff(),
    doubleOff()
  )
  push(
    alignCenter(),
    boldOn(),
    doubleOn(),
    esc(`${payload.table || ''}\n`),
    doubleOff(),
    boldOff()
  )
  push(
    alignCenter(),
    boldOn(),
    doubleOn(),
    esc(`Client:${payload.customer || ''}\n`),
    doubleOff(),
    boldOff()
  )
  push(alignCenter(), boldOn(), esc(`${formatDate(payload.created)}\n\n`), boldOff())

  push(
    boldOn(),
    doubleHeightOn(),
    alignLeft(),
    esc('QTE   PRODUIT                PRIX\n'),
    doubleHeightOff(),
    boldOff(),
    line()
  )

  payload.details.forEach((item) => {
    const qty = `${item.qty || 0}x`.padEnd(5)
    const name = String(item.name || '').padEnd(20).slice(0, 20)
    const price = formatAmount(getItemPrice(item)).padStart(7)
    push(
      alignLeft(),
      boldOn(),
      doubleHeightOn(),
      esc(`${qty}${name}${price} `),
      euroSymbol,
      esc('\n'),
      doubleHeightOff(),
      boldOff()
    )
    customizationLines(item).forEach((customization) => {
      splitByWords(customization).forEach((lineText) =>
        push(
          alignLeft(),
          boldOn(),
          esc(`  - ${lineText}\n`),
          boldOff()
        )
      )
    })
  })

  push(line(), esc('\n'), alignCenter(), boldOn(), doubleOn())
  push(esc(`TOTAL : ${formatAmount(payload.total)} `), euroSymbol)
  push(doubleOff(), boldOff(), esc('\n'))
  push(
    alignCenter(),
    boldOn(),
    doubleOn(),
    esc(`${payload.saleMode || ''}\n`),
    doubleOff(),
    boldOff(),
    esc('\n')
  )
  if (payload.paymentMethod) {
    push(
      alignCenter(),
      boldOn(),
      doubleOn(),
      esc(`Paiement : ${payload.paymentMethod}\n`),
      doubleOff(),
      boldOff(),
      esc('\n')
    )
  }
  push(line())

  if (payload.remark) {
    push(alignCenter(), doubleOn(), boldOn(), esc('----------\n'))
    push(alignLeft(), esc(`NOTE: ${payload.remark}\n`))
    push(alignCenter(), esc('----------\n'), doubleOff(), boldOff())
  }

  push(alignCenter(), esc('Made with smarteat.fr\n\n\n\n\n'), cut())
  return Buffer.concat(output)
}

const buildOrderTicketCloudXml = (payload = {}) => {
  const shop = payload.shopInfo || {}
  const paymentXml = payload.paymentMethod
    ? `<text em="true" align="center" width="2" height="2">Paiement : ${xmlEscape(payload.paymentMethod)}</text><feed line="2"/>`
    : ''
  const lines = payload.details
    .map((item) => {
      const qty = `${item.qty || 0}x`.padEnd(5)
      const name = String(item.name || '').padEnd(20).slice(0, 20)
      const price = formatAmount(getItemPrice(item)).padStart(7)
      const customizations = customizationLines(item)
        .map(
          (customization) =>
            `<text align="left">  - ${xmlEscape(customization)}</text><feed line="1"/>`
        )
        .join('')
      return (
        `<text em="true" align="left" width="1" height="2">${xmlEscape(`${qty}${name}${price} €`)}</text>` +
        '<feed line="1"/>' +
        customizations
      )
    })
    .join('')

  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    '<PrintRequestInfo><ePOSPrint><Parameter><devid>local_printer</devid><timeout>10000</timeout></Parameter><PrintData>' +
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    `<text em="true" align="center" width="1" height="1">${xmlEscape(shop.shop_name)}</text><feed line="1"/>` +
    '<feed line="1"/>' +
    `<text em="true" align="center" width="3" height="3">Commande n°${xmlEscape(payload.orderNumber)}</text><feed line="1"/>` +
    `<text em="true" align="center" width="2" height="2">${xmlEscape(payload.table)}</text><feed line="1"/>` +
    `<text em="true" align="center" width="2" height="2">Client:${xmlEscape(payload.customer)}</text><feed line="1"/>` +
    `<text em="true" align="center" width="1" height="1">${xmlEscape(formatDate(payload.created))}</text><feed line="2"/>` +
    '<text align="left"> QTE   PRODUIT                PRIX</text><feed line="1"/>' +
    '<text align="left">--------------------------------</text><feed line="2"/>' +
    lines +
    '<text align="left">--------------------------------</text><feed line="1"/>' +
    `<text em="true" align="center" width="2" height="2">TOTAL : ${xmlEscape(formatAmount(payload.total))} €</text><feed line="1"/>` +
    `<text em="true" align="center" width="2" height="2">${xmlEscape(payload.saleMode)}</text><feed line="2"/>` +
    paymentXml +
    '<text align="left">--------------------------------</text><feed line="2"/>' +
    (payload.remark
      ? `<text em="true" align="left">NOTE: ${xmlEscape(payload.remark)}</text><feed line="1"/>`
      : '') +
    '<feed line="1"/><text align="center">Made with smarteat.fr</text><feed line="3"/><cut/></epos-print></PrintData></ePOSPrint></PrintRequestInfo>'
  )
}

const sendOrderTicket = ({
  payload,
  smartPrint,
  printerIp,
  dispatch,
  fetchImplementation,
} = {}) => {
  if (!payload || !payload.orderId) {
    throw new TypeError("La commande est introuvable pour l'impression.")
  }

  if (smartPrint) {
    const requestFetch =
      fetchImplementation || (typeof fetch === 'function' ? fetch : null)
    if (!requestFetch || !printerIp) {
      throw new TypeError("SmartPrint n'est pas configuré.")
    }
    Promise.resolve(
      requestFetch(`http://${printerIp}:8989/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: 'cuisine',
          dataFormatESCPOS: buildOrderTicketEscPos(payload).toString('base64'),
          dataFormatXML: null,
        }),
      })
    ).catch(() => {})
    if (typeof dispatch === 'function') {
      dispatch('notifications/success', 'Impression envoyée.', { root: true })
    }
    return true
  }

  if (typeof dispatch !== 'function') {
    throw new TypeError("Le service d'impression cloud est indisponible.")
  }
  dispatch('printing/postPrintingJob', {
    requete: buildOrderTicketCloudXml(payload),
    ticketType: 'commande',
    orderId: payload.orderId,
  })
  return true
}

module.exports = {
  buildOrderTicketPayload,
  buildOrderTicketEscPos,
  buildOrderTicketCloudXml,
  sendOrderTicket,
  formatAmount,
}
