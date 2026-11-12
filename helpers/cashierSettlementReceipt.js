const {
  buildCashierReceiptPayload,
  buildEscPosQrCode,
  formatReceiptProductHeader,
  formatReceiptProductLine,
  receiptHeaderLines,
} = require('./cashierReceipt')
const { groupCustomizationSelections } = require('./customizations')
const { formatPrice, roundPrice } = require('./price-functions')
const { CARD_TICKET_TITLE, cardTicketLines } = require('./cardTicket')

const isEnabled = (value) => [true, 1, '1', 'true'].includes(value)

const submittedPrintResult = () => ({ ok: true, status: 'submitted' })

const failedPrintResult = () => ({
  ok: false,
  status: 'failed',
  code: 'PRINT_SUBMISSION_FAILED',
  message: "L'impression du ticket a echoue.",
})

const normalizePrintSubmission = (submission) =>
  Promise.resolve(submission).then(
    (result) =>
      result === false || (result && result.ok === false)
        ? failedPrintResult()
        : submittedPrintResult(),
    () => failedPrintResult()
  )

const optionalText = (value) => String(value == null ? '' : value).trim()
const bankTickets = payload => Array.isArray(payload.cardTicketPayloads)
  ? payload.cardTicketPayloads.filter(Boolean) : []

const xmlEscape = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const formatVatRate = (value) => `${String(value).replace('.', ',')} %`

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
        const choiceName = optionalText(choice.name)
        if (!choiceName) return ''
        return group.stepName
          ? `  - ${group.stepName} : ${choiceName}`
          : `  - ${choiceName}`
      })
    )
    .filter(Boolean)

const stableOrderSort = (orders) =>
  orders
    .map((order, index) => ({ order, index }))
    .sort((left, right) => {
      const leftId = Number(left.order && left.order.id)
      const rightId = Number(right.order && right.order.id)
      const leftSortable = Number.isFinite(leftId)
      const rightSortable = Number.isFinite(rightId)
      if (leftSortable && rightSortable && leftId !== rightId) {
        return leftId - rightId
      }
      if (leftSortable !== rightSortable) return leftSortable ? -1 : 1
      return left.index - right.index
    })
    .map(({ order }) => order)

const buildCashierSettlementReceiptPayload = (
  settlement = {},
  shopInfo = {}
) => {
  const settlementId = settlement.id
  const base = buildCashierReceiptPayload({
    order: {
      id: settlementId,
      created: settlement.createdAt,
      service_point_name: settlement.tableReference,
      subtotal: settlement.totalAmount,
      subtotal_before_discount: settlement.subtotalBeforeDiscount,
      discount_type: settlement.discountType,
      discount_value: settlement.discountValue,
      discount_amount: settlement.discountAmount,
      payment: settlement.paymentMethod,
    },
    details: [],
    shopInfo,
    fallbackTable: settlement.tableReference,
  })

  const orders = stableOrderSort(
    Array.isArray(settlement.archivedOrders) ? settlement.archivedOrders : []
  ).map((order = {}) => ({
    id: order.id,
    orderNumber: order.ordernumber || order.orderNumber || order.id || '',
    paymentStatus: order.paymentStatus || order.payment_status || null,
    refundStatus: order.refundStatus || order.refund_status || null,
    details: Array.isArray(order.details) ? order.details.slice() : [],
  }))

  return {
    ...base,
    settlementId,
    orderId: settlementId,
    table: settlement.tableReference || base.table,
    paymentMethod: settlement.paymentMethod || base.paymentMethod,
    subtotalBeforeDiscount: roundPrice(settlement.subtotalBeforeDiscount),
    discountType: settlement.discountType || 'none',
    discountValue: roundPrice(settlement.discountValue),
    discountAmount: roundPrice(settlement.discountAmount),
    totalAmount: roundPrice(settlement.totalAmount),
    vatBreakdown: Array.isArray(settlement.vatBreakdown)
      ? settlement.vatBreakdown.map((row) => ({ ...row }))
      : [],
    orders,
  }
}

const buildCashierSettlementEscPos = (payload) => {
  const shopInfo = payload.shopInfo || {}
  const line = '--------------------------------\n'
  let output = '\x1B@\x1Bt\x10'
  output += `\x1Ba\x01\x1BE\x01\x1D!\x11${shopInfo.shop_name || ''}\n`
  output += `\x1D!\x00\x1BE\x00\x1BE\x01${payload.ticketTitle || 'Ticket de caisse'}\n\x1BE\x00`
  receiptHeaderLines(payload).forEach((text) => {
    output += `${text}\n`
  })
  output += `\x1Ba\x00\x1BE\x01${payload.table || ''}\n\x1BE\x00`
  output += `Date : \x1BE\x01${payload.currentDate}\n\x1BE\x00`

  payload.orders.forEach((order) => {
    output += `${line}\x1BE\x01Commande n° ${order.orderNumber}\n\x1BE\x00`
    output += `\x1BE\x01${formatReceiptProductHeader(payload.isTvaActive)}\n\x1BE\x00`
    order.details.forEach((item) => {
      output += `${formatReceiptProductLine(item, payload.isTvaActive)} \x80\n`
      receiptCustomizationLines(item).forEach((text) => {
        output += `${text}\n`
      })
    })
  })
  output += line

  if (payload.discountAmount > 0) {
    output += `\x1Ba\x02SOUS-TOTAL : ${formatPrice(payload.subtotalBeforeDiscount)} \x80\n`
    output += `REMISE : -${formatPrice(payload.discountAmount)} \x80\n`
  }
  if (payload.isTvaActive) {
    payload.vatBreakdown.forEach((item) => {
      output += `\x1Ba\x02HT (${formatVatRate(item.vatRate)}) : ${formatPrice(item.totalHt)} \x80\n`
      output += `TVA (${formatVatRate(item.vatRate)}) : ${formatPrice(item.totalVat)} \x80\n`
    })
  }

  output += `\x1Ba\x02\x1BE\x01\x1D!\x11TOTAL${payload.isTvaActive ? ' TTC' : '*'} : ${formatPrice(payload.totalAmount)} \x80\n`
  output += `\x1D!\x00\x1BE\x00\nPaiement : ${payload.paymentMethod}\n${line}\x1Ba\x01`
  const qrUrl = optionalText(shopInfo.receipt_review_qr_url)
  if (qrUrl) {
    output += `${shopInfo.receipt_review_qr_label || 'Votre avis nous intéresse'}\n`
    output += buildEscPosQrCode(qrUrl).toString('latin1')
    output += '\n'
  }
  output += `À très bientôt !\n${shopInfo.shop_name || ''}\nMade with smarteat.fr\n`
  if (!payload.isTvaActive) {
    output += '* TVA non applicable, art. 293 B du CGI\n'
  }
  bankTickets(payload).forEach((cardPayload) => {
    output += `${line}\x1Ba\x01\x1BE\x01${CARD_TICKET_TITLE}\n\x1BE\x00`
    cardTicketLines(cardPayload).forEach(([label, value]) => {
      output += `\x1Ba\x00${label} : ${value}\n`
    })
    output += `${line}\x1Ba\x01\x1BE\x01Paiement accepté\n\x1BE\x00`
  })
  output += '\n\n\n\n\x1DV\x00'
  return output
}

const buildCashierSettlementCloudXml = (payload) => {
  const shopInfo = payload.shopInfo || {}
  const headerXml = receiptHeaderLines(payload)
    .map((line) =>
      `<text width="1" height="1" align="center">${xmlEscape(line)}</text><feed line="1"/>`
    )
    .join('')
  const ordersXml = payload.orders
    .map((order) => {
      const productXml = order.details
        .map((item) => {
          const customizations = receiptCustomizationLines(item)
            .map((line) =>
              `<text align="left">${xmlEscape(line)}</text><feed line="1"/>`
            )
            .join('')
          return `<text em="true" align="left">${xmlEscape(formatReceiptProductLine(item, payload.isTvaActive))} €</text>` +
            '<feed line="1"/>' + customizations
        })
        .join('')
      return '<text>--------------------------------</text><feed line="1"/>' +
        `<text em="true" align="left">Commande n° ${xmlEscape(order.orderNumber)}</text>` +
        '<feed line="1"/>' +
        `<text>${xmlEscape(formatReceiptProductHeader(payload.isTvaActive))}\n</text>` +
        productXml
    })
    .join('')
  const discountXml = payload.discountAmount > 0
    ? `<text align="right">SOUS-TOTAL : ${xmlEscape(formatPrice(payload.subtotalBeforeDiscount))} €</text>` +
      '<feed line="1"/>' +
      `<text align="right">REMISE : -${xmlEscape(formatPrice(payload.discountAmount))} €</text>` +
      '<feed line="1"/>'
    : ''
  const vatXml = payload.isTvaActive
    ? payload.vatBreakdown.map((item) =>
        `<text align="right">HT (${xmlEscape(formatVatRate(item.vatRate))}): ${xmlEscape(formatPrice(item.totalHt))} €</text>` +
        '<feed line="1"/>' +
        `<text align="right">TVA (${xmlEscape(formatVatRate(item.vatRate))}): ${xmlEscape(formatPrice(item.totalVat))} €</text>` +
        '<feed line="1"/>'
      ).join('')
    : ''
  const qrUrl = optionalText(shopInfo.receipt_review_qr_url)
  const qrXml = qrUrl
    ? `<text align="center">${xmlEscape(shopInfo.receipt_review_qr_label || 'Votre avis nous intéresse')}</text><feed line="1"/>` +
      `<symbol type="qrcode" level="h" width="6" height="6">${xmlEscape(qrUrl)}</symbol><feed line="1"/>`
    : ''

  return '<?xml version="1.0" encoding="utf-8" ?>' +
    '<PrintRequestInfo><ePOSPrint><Parameter>' +
    '<devid>local_printer</devid><timeout>10000</timeout>' +
    '</Parameter><PrintData>' +
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    '<text smooth="true"></text>' +
    `<text em="true" align="center" width="2" height="2">${xmlEscape(shopInfo.shop_name)}</text>` +
    '<feed line="1"/>' +
    `<text em="true" align="center">${xmlEscape(payload.ticketTitle || 'Ticket de caisse')}</text>` +
    '<feed line="1"/>' + headerXml + '<feed line="1"/>' +
    `<text em="true" align="left">${xmlEscape(payload.table)}</text><feed line="1"/>` +
    `<text>Date : ${xmlEscape(payload.currentDate)}</text><feed line="1"/>` +
    ordersXml + '<text>--------------------------------</text><feed line="1"/>' +
    discountXml + vatXml +
    `<text align="right" width="2" height="2">TOTAL${payload.isTvaActive ? ' TTC' : '*'} : ${xmlEscape(formatPrice(payload.totalAmount))} €</text>` +
    '<feed line="2"/>' +
    `<text>Paiement : ${xmlEscape(payload.paymentMethod)}</text>` +
    '<feed line="1"/><text>--------------------------------</text><feed line="2"/>' +
    qrXml + '<text align="center">À très bientôt !</text><feed line="1"/>' +
    `<text align="center">${xmlEscape(shopInfo.shop_name)}</text>` +
    '<feed line="1"/><text align="center">Made with smarteat.fr</text>' +
    bankTickets(payload).map(cardPayload =>
      '<feed line="1"/><text>--------------------------------</text><feed line="1"/>' +
      `<text align="center" em="true">${CARD_TICKET_TITLE}</text><feed line="1"/>` +
      cardTicketLines(cardPayload).map(([label, value]) =>
        `<text align="left" em="false">${xmlEscape(label)} : ${xmlEscape(value)}</text><feed line="1"/>`
      ).join('') +
      '<text>--------------------------------</text><feed line="1"/>' +
      '<text em="true" align="center">Paiement accepté</text><feed line="1"/>'
    ).join('') +
    '<feed line="3"/><cut/></epos-print></PrintData></ePOSPrint></PrintRequestInfo>'
}

const sendCashierSettlementReceipt = ({
  payload,
  smartPrint,
  printerIp,
  dispatch,
  fetchImplementation,
} = {}) => {
  if (!payload || !payload.settlementId) {
    return Promise.reject(
      new TypeError("L'encaissement est introuvable pour l'impression.")
    )
  }

  if (isEnabled(smartPrint)) {
    const requestFetch =
      fetchImplementation || (typeof fetch === 'function' ? fetch : null)
    if (!requestFetch || !printerIp) {
      return Promise.reject(new TypeError("SmartPrint n'est pas configuré."))
    }
    let submission
    try {
      submission = requestFetch(`http://${printerIp}:8989/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: payload.ticketType || 'caisse',
          dataFormatESCPOS: Buffer.from(
            buildCashierSettlementEscPos(payload),
            'latin1'
          ).toString('base64'),
          dataFormatXML: null,
        }),
      })
    } catch (error) {
      return Promise.resolve(failedPrintResult())
    }
    return normalizePrintSubmission(submission).then((result) => {
      if (result.ok && typeof dispatch === 'function') {
        try {
          Promise.resolve(
            dispatch('notifications/success', 'Impression envoyée.', {
              root: true,
            })
          ).catch(() => {})
        } catch (error) {}
      }
      return result
    })
  }

  if (typeof dispatch !== 'function') {
    return Promise.reject(
      new TypeError("Le service d'impression cloud est indisponible.")
    )
  }
  let submission
  try {
    submission = dispatch('printing/postPrintingJob', {
      requete: buildCashierSettlementCloudXml(payload),
      ticketType: payload.ticketType || 'caisse',
      orderId: payload.settlementId,
      awaitResult: true,
    })
  } catch (error) {
    return Promise.resolve(failedPrintResult())
  }
  return normalizePrintSubmission(submission)
}

module.exports = {
  buildCashierSettlementCloudXml,
  buildCashierSettlementEscPos,
  buildCashierSettlementReceiptPayload,
  sendCashierSettlementReceipt,
}
