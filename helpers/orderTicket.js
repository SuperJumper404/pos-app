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

const buildOrderTicketPayload = ({
  order = {},
  details = [],
  shopInfo = {},
  fallbackTable = 'Comptoir',
  fallbackPaymentMethod = '',
} = {}) => ({
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
  remark: order.remark || '',
  details: Array.isArray(details) ? details : [],
  shopInfo,
})

const buildOrderTicketEscPos = (payload) => {
  const esc = (text) => Buffer.from(String(text || ''), 'ascii')
  const alignLeft = () => Buffer.from([0x1b, 0x61, 0])
  const alignCenter = () => Buffer.from([0x1b, 0x61, 1])
  const boldOn = () => Buffer.from([0x1b, 0x45, 1])
  const boldOff = () => Buffer.from([0x1b, 0x45, 0])
  const cut = () => Buffer.from([0x1d, 0x56, 0x00])
  const output = []
  const push = (...buffers) => buffers.forEach((buffer) => output.push(buffer))
  const shop = payload.shopInfo || {}

  push(Buffer.from([0x1b, 0x40]), Buffer.from([0x1b, 0x74, 0x10]))
  push(alignCenter(), boldOn(), esc(`${shop.shop_name || ''}\n`), boldOff())
  splitByWords(shop.shop_adress || '').forEach((line) =>
    push(alignCenter(), esc(`${line}\n`))
  )
  push(
    alignLeft(),
    boldOn(),
    esc(`${payload.table}\n`),
    boldOff(),
    esc(`Commande n° ${payload.orderNumber}\n`),
    esc(`Client : ${payload.customer}\n`),
    esc(`Date : ${new Date(payload.created).toLocaleString('fr-FR')}\n`),
    esc('--------------------------------\n')
  )

  payload.details.forEach((item) => {
    push(
      esc(`${item.qty || 0}x ${String(item.name || '').slice(0, 24)}\n`)
    )
    const customizations = Array.isArray(item.customizationList)
      ? item.customizationList
      : []
    customizations.forEach((choice) => {
      if (choice && choice.name) push(esc(`  - ${choice.name}\n`))
    })
  })

  push(esc('--------------------------------\n'))
  if (payload.remark) push(boldOn(), esc(`NOTE : ${payload.remark}\n`), boldOff())
  push(esc('\n'), alignCenter(), esc('Made with smarteat.fr\n\n\n'), cut())
  return Buffer.concat(output)
}

const buildOrderTicketCloudXml = (payload) => {
  const shop = payload.shopInfo || {}
  const lines = payload.details
    .map((item) => {
      const customizations = Array.isArray(item.customizationList)
        ? item.customizationList
            .filter((choice) => choice && choice.name)
            .map(
              (choice) =>
                `<text align="left">  - ${xmlEscape(choice.name)}</text><feed line="1"/>`
            )
            .join('')
        : ''
      return (
        `<text em="true" align="left">${xmlEscape(`${item.qty || 0}x ${item.name || ''}`)}</text>` +
        '<feed line="1"/>' +
        customizations
      )
    })
    .join('')

  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    '<PrintRequestInfo><ePOSPrint><Parameter><devid>local_printer</devid><timeout>10000</timeout></Parameter><PrintData>' +
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    `<text em="true" align="center">${xmlEscape(shop.shop_name)}</text><feed line="1"/>` +
    splitByWords(shop.shop_adress || '')
      .map(
        (line) =>
          `<text align="center">${xmlEscape(line)}</text><feed line="1"/>`
      )
      .join('') +
    `<text em="true" align="left">${xmlEscape(payload.table)}</text><feed line="1"/>` +
    `<text>Commande n° ${xmlEscape(payload.orderNumber)}</text><feed line="1"/>` +
    `<text>Client : ${xmlEscape(payload.customer)}</text><feed line="1"/>` +
    '<feed line="1"/>' +
    lines +
    '<feed line="1"/>' +
    (payload.remark
      ? `<text em="true" align="left">NOTE : ${xmlEscape(payload.remark)}</text><feed line="1"/>`
      : '') +
    '<feed line="2"/><text align="center">Made with smarteat.fr</text><feed line="3"/><cut/></epos-print></PrintData></ePOSPrint></PrintRequestInfo>'
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
          ticketType: 'commande',
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
