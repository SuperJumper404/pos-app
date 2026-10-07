const { sendCashierReceipt } = require('./cashierReceipt')
const { sendCardTicket } = require('./cardTicket')

const normalizeCardTicketPayloads = ({
  cardTicketPayload,
  cardTicketPayloads,
} = {}) => {
  const payloads = Array.isArray(cardTicketPayloads)
    ? cardTicketPayloads
    : [cardTicketPayload]
  return payloads.filter(Boolean)
}

const buildReceiptBundle = ({
  receiptPayload,
  cardTicketPayload,
  cardTicketPayloads,
} = {}) => {
  const tickets = []
  if (receiptPayload) {
    tickets.push({
      kind: 'cashier_receipt',
      ticketType: receiptPayload.ticketType || 'caisse',
      payload: receiptPayload,
    })
  }

  normalizeCardTicketPayloads({ cardTicketPayload, cardTicketPayloads })
    .forEach((payload) => {
      tickets.push({
        kind: 'card_ticket',
        ticketType: 'carte',
        payload,
      })
    })

  return tickets
}

const sendReceiptBundle = ({
  receiptPayload,
  cardTicketPayload,
  cardTicketPayloads,
  smartPrint,
  printerIp,
  dispatch,
  fetchImplementation,
} = {}) => {
  const tickets = buildReceiptBundle({
    receiptPayload,
    cardTicketPayload,
    cardTicketPayloads,
  })

  tickets.forEach((ticket) => {
    const common = {
      payload: ticket.payload,
      smartPrint,
      printerIp,
      dispatch,
      fetchImplementation,
    }
    if (ticket.kind === 'card_ticket') {
      sendCardTicket(common)
      return
    }
    sendCashierReceipt(common)
  })

  return tickets.length > 0
}

module.exports = {
  buildReceiptBundle,
  sendReceiptBundle,
}
