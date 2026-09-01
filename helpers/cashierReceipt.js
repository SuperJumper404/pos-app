const moment = require('moment')
const { normalizeVatBreakdown } = require('./vat')
const { formatPrice, parsePrice, roundPrice } = require('./price-functions')
const { groupCustomizationSelections } = require('./customizations')

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

const getItemVatRate = (item = {}) =>
  item.vat_rate !== undefined ? item.vat_rate : item.vatRate

const formatCompactVatRate = (item = {}) => {
  const value = Number(getItemVatRate(item))
  return Number.isFinite(value)
    ? `${String(value).replace('.', ',')}%`
    : ''
}

const formatReceiptProductHeader = (isTvaActive = false) =>
  isTvaActive
    ? `${'QTE'.padEnd(4)}${'PRODUIT'.padEnd(15)}${'TVA'.padEnd(5)}${'PRIX'.padStart(7)}`
    : 'QTE   PRODUIT                PRIX'

const formatReceiptProductLine = (item = {}, isTvaActive = false) => {
  const qty = `${item.qty}x`.padEnd(4)
  const name = String(item.name || '')
    .padEnd(isTvaActive ? 15 : 20)
    .slice(0, isTvaActive ? 15 : 20)
  const price = formatTicketNumber(item.total).padStart(7)
  if (!isTvaActive) return `${qty}${name}${price}`

  return `${qty}${name}${formatCompactVatRate(item).padStart(5)}${price}`
}

const getCustomizationSelections = (item = {}) =>
  [
    item.customization_selections,
    item.customizationSelections,
    item.customization_snapshots,
    item.customizationSnapshots,
    item.historical_customizations,
    item.historicalCustomizations,
  ].find((selections) => Array.isArray(selections) && selections.length) ||
  item.customizationList

const receiptCustomizationLines = (item = {}) =>
  groupCustomizationSelections(getCustomizationSelections(item))
    .flatMap((group) =>
      (group.choices || []).map((choice) => {
        const choiceName = String(choice.name || '').trim()
        if (!choiceName) return ''
        return group.stepName
          ? `  - ${group.stepName} : ${choiceName}`
          : `  - ${choiceName}`
      })
    )
    .filter(Boolean)

const optionalText = (value) => String(value == null ? '' : value).trim()

const getSaleMode = (order = {}) => {
  if (order.sale_mode || order.saleMode) return order.sale_mode || order.saleMode
  if (order.order_source === 'web' || order.source === 'click_collect') {
    return 'Click & Collect'
  }
  return isEnabled(order.is_takeaway) ? 'À emporter' : 'Sur place'
}

const getSellerName = (order = {}) =>
  optionalText(
    order.taken_by_name ||
      order.prepared_by_name ||
      order.seller_name ||
      order.username
  )

const getCashRegisterNumber = (order = {}, shopInfo = {}) =>
  optionalText(
    order.cash_register_number ||
      order.cashRegisterNumber ||
      order.service_point_cash_register_number ||
      shopInfo.cash_register_number
  )

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
  ticketKind = 'caisse',
} = {}) => {
  const normalizedDetails = Array.isArray(details) ? details : []
  const orderId = order.id || order.orderId
  const totalAmount = roundPrice(
    order.subtotal == null ? sumDetails(normalizedDetails) : order.subtotal
  )
  const subtotalBeforeDiscount = roundPrice(
    order.subtotal_before_discount == null
      ? totalAmount
      : order.subtotal_before_discount
  )
  const discountAmount = roundPrice(
    order.discount_amount == null
      ? Math.max(0, subtotalBeforeDiscount - totalAmount)
      : order.discount_amount
  )
  const paymentMethod =
    order.used_payment_method ||
    order.payment ||
    fallbackPaymentMethod ||
    'Caisse'
  const normalizedTicketKind = ticketKind === 'commande' ? 'commande' : 'caisse'

  return {
    ticketKind: normalizedTicketKind,
    ticketType: normalizedTicketKind,
    ticketTitle:
      normalizedTicketKind === 'commande'
        ? 'TICKET DE COMMANDE'
        : 'Ticket de caisse',
    orderId,
    orderNumber: order.ordernumber || order.orderNumber || orderId || '',
    table:
      order.service_point_name || order.username || order.table || fallbackTable,
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
    subtotalBeforeDiscount,
    discountType: order.discount_type || 'none',
    discountValue: roundPrice(order.discount_value || 0),
    discountAmount,
    isTvaActive: isEnabled(shopInfo.activate_tva),
    vatBreakdown: normalizeVatBreakdown(normalizedDetails),
    itemCount: normalizedDetails.reduce(
      (sum, item) => sum + Math.max(0, Number(item.qty) || 0),
      0
    ),
    saleMode: getSaleMode(order),
    sellerName: getSellerName(order),
    cashRegisterNumber: getCashRegisterNumber(order, shopInfo),
  }
}

const appendOptionalLine = (lines, label, value) => {
  const normalized = optionalText(value)
  if (normalized) lines.push(`${label} : ${normalized}`)
  return lines
}

const receiptHeaderLines = (payload) => {
  const shopInfo = payload.shopInfo || {}
  const lines = []
  appendOptionalLine(lines, 'TEL', shopInfo.shop_phone)
  appendOptionalLine(lines, 'SIRET', shopInfo.shop_siret)
  appendOptionalLine(lines, 'NAF', shopInfo.shop_naf)
  appendOptionalLine(lines, 'TVA', shopInfo.shop_vat_number)
  splitByWords(shopInfo.shop_adress || '').forEach((line) => lines.push(line))
  return lines
}

const receiptOrderLines = (payload) => {
  const lines = []
  appendOptionalLine(lines, 'Vendeur', payload.sellerName)
  appendOptionalLine(lines, 'Caisse', payload.cashRegisterNumber)
  appendOptionalLine(lines, 'Mode', payload.saleMode)
  appendOptionalLine(lines, 'Articles', payload.itemCount)
  return lines
}

const buildEscPosQrCode = (value, size = 6) => {
  const data = Buffer.from(String(value), 'utf8')
  const storeLength = data.length + 3
  return Buffer.concat([
    Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]),
    Buffer.from([
      0x1d,
      0x28,
      0x6b,
      storeLength & 0xff,
      (storeLength >> 8) & 0xff,
      0x31,
      0x50,
      0x30,
    ]),
    data,
    Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
  ])
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
  push(
    alignCenter(),
    boldOn(),
    esc(`${payload.ticketTitle || 'Ticket de caisse'}\n`),
    boldOff()
  )
  receiptHeaderLines(payload).forEach((lineText) => {
    push(alignCenter(), esc(`${lineText}\n`))
  })
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
    esc(`${payload.currentDate}\n`),
    boldOff()
  )
  receiptOrderLines(payload).forEach((lineText) => {
    push(alignLeft(), esc(`${lineText}\n`))
  })
  push(
    boldOn(),
    esc(`${formatReceiptProductHeader(payload.isTvaActive)}\n`),
    boldOff()
  )
  push(line())

  payload.details.forEach((item) => {
    push(
      alignLeft(),
      esc(`${formatReceiptProductLine(item, payload.isTvaActive)} `),
      euroSymbol,
      esc('\n')
    )
    receiptCustomizationLines(item).forEach((lineText) => {
      push(alignLeft(), esc(`${lineText}\n`))
    })
  })
  push(line())

  if (payload.discountAmount > 0) {
    push(
      alignRight(),
      esc(`SOUS-TOTAL : ${formatTicketNumber(payload.subtotalBeforeDiscount)} `),
      euroSymbol,
      esc('\n'),
      alignRight(),
      esc(`REMISE : -${formatTicketNumber(payload.discountAmount)} `),
      euroSymbol,
      esc('\n')
    )
  }

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
    esc(
      payload.ticketKind === 'commande'
        ? 'A PAYER AU COMPTOIR\n'
        : `Paiement : ${payload.paymentMethod}\n`
    ),
    line(),
    alignCenter()
  )
  const qrUrl =
    payload.ticketKind === 'commande'
      ? ''
      : optionalText(shopInfo.receipt_review_qr_url)
  if (qrUrl) {
    push(
      alignCenter(),
      esc(`${shopInfo.receipt_review_qr_label || 'Votre avis nous intéresse'}\n`),
      buildEscPosQrCode(qrUrl),
      esc('\n')
    )
  }
  if (payload.ticketKind === 'commande') {
    push(esc('Presentez ce ticket au comptoir\n'))
  } else {
    push(
      esc('À très bientôt !\n'),
      esc(`${shopInfo.shop_name || ''}\n`),
      esc('Made with smarteat.fr\n')
    )
  }
  if (!payload.isTvaActive) {
    push(esc('* TVA non applicable, art. 293 B du CGI\n'))
  }
  push(esc('\n\n\n\n'), cut())
  return Buffer.concat(output)
}

const buildCashierCloudXml = (payload) => {
  const shopInfo = payload.shopInfo || {}
  const headerXml = receiptHeaderLines(payload)
    .map(
      (line) =>
        `<text width="1" height="1" align="center">${xmlEscape(line)}</text><feed line="1"/>`
    )
    .join('')
  const orderInfoXml = receiptOrderLines(payload)
    .map(
      (line) =>
        `<text align="left">${xmlEscape(line)}</text><feed line="1"/>`
    )
    .join('')
  const productXml = payload.details
    .map((item) => {
      const customizationXml = receiptCustomizationLines(item)
        .map(
          (line) =>
            `<text align="left">${xmlEscape(line)}</text><feed line="1"/>`
        )
        .join('')
      return (
        `<text em="true" align="left">${xmlEscape(formatReceiptProductLine(item, payload.isTvaActive))} \u20AC</text>` +
        '<feed line="1"/>' +
        customizationXml
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
  const discountXml = payload.discountAmount > 0
    ? `<text align="right">SOUS-TOTAL : ${xmlEscape(formatPrice(payload.subtotalBeforeDiscount))} \u20AC</text>` +
      '<feed line="1"/>' +
      `<text align="right">REMISE : -${xmlEscape(formatPrice(payload.discountAmount))} \u20AC</text>` +
      '<feed line="1"/>'
    : ''

  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    '<PrintRequestInfo><ePOSPrint><Parameter>' +
    '<devid>local_printer</devid><timeout>10000</timeout>' +
    '</Parameter><PrintData>' +
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    '<text smooth="true"></text>' +
    `<text em="true" align="center" width="2" height="2">${xmlEscape(shopInfo.shop_name)}</text>` +
    '<feed line="1"/>' +
    `<text em="true" align="center">${xmlEscape(payload.ticketTitle || 'Ticket de caisse')}</text>` +
    '<feed line="1"/>' +
    headerXml +
    '<feed line="1"/>' +
    `<text em="true" align="left">${xmlEscape(payload.table)}</text>` +
    '<feed line="1"/>' +
    `<text em="false">Commande n° ${xmlEscape(payload.orderNumber)}</text>` +
    '<feed line="1"/>' +
    `<text>Date : ${xmlEscape(payload.currentDate)}</text>` +
    '<feed line="1"/>' +
    orderInfoXml +
    `<text>${xmlEscape(formatReceiptProductHeader(payload.isTvaActive))}\n</text>` +
    '<text>--------------------------------</text><feed line="1"/>' +
    productXml +
    '<text>--------------------------------</text><feed line="1"/>' +
    discountXml +
    vatXml +
    `<text align="right" width="2" height="2">${totalLabel} : ${xmlEscape(formatPrice(payload.totalAmount))} \u20AC</text>` +
    '<feed line="2"/>' +
    (payload.ticketKind === 'commande'
      ? '<text align="center" em="true">A PAYER AU COMPTOIR</text>'
      : `<text>Paiement : ${xmlEscape(payload.paymentMethod)}</text>`) +
    '<feed line="1"/><text>--------------------------------</text><feed line="2"/>' +
    (payload.ticketKind !== 'commande' && optionalText(shopInfo.receipt_review_qr_url)
      ? `<text align="center">${xmlEscape(shopInfo.receipt_review_qr_label || 'Votre avis nous intéresse')}</text><feed line="1"/>` +
        `<symbol type="qrcode" level="h" width="6" height="6">${xmlEscape(shopInfo.receipt_review_qr_url)}</symbol><feed line="1"/>`
      : '') +
    (payload.ticketKind === 'commande'
      ? '<text align="center">Presentez ce ticket au comptoir</text>'
      : '<text align="center">À très bientôt !</text><feed line="1"/>' +
        `<text align="center">${xmlEscape(shopInfo.shop_name)}</text>` +
        '<feed line="1"/><text align="center">Made with smarteat.fr</text>') +
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

  if (isEnabled(smartPrint)) {
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
            ticketType:
              payload.ticketKind === 'commande'
                ? 'cuisine'
                : payload.ticketType || 'caisse',
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
        ticketType: payload.ticketType || 'caisse',
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
  formatReceiptProductHeader,
  formatReceiptProductLine,
  receiptHeaderLines,
  receiptOrderLines,
  buildEscPosQrCode,
  sendCashierReceipt,
  splitByWords,
}
