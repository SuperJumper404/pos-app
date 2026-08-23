const PAYMENT_STATUS_DISPLAY = {
  paid: {
    text: 'Payé',
    color: 'success',
  },
  requires_payment: {
    text: 'En attente',
    color: 'indigo',
  },
  unpaid: {
    text: 'À encaisser',
    color: 'warning',
  },
  failed: {
    text: 'Échoué',
    color: 'error',
  },
  canceled: {
    text: 'Annulée',
    color: 'warning',
  },
  refunded: {
    text: 'Remboursé',
    color: 'warning',
  },
}

const getPaymentMethodText = (order = {}) =>
  order.used_payment_method || order.payment || 'Payé'

const STRIPE_PAYMENT_COLOR = '#635BFF'

const isStripePayment = (order = {}) => {
  const paymentText = String(getPaymentMethodText(order)).toLowerCase()

  return (
    order.payment_provider === 'stripe' ||
    paymentText.includes('stripe') ||
    paymentText.includes('apple pay') ||
    paymentText.includes('google pay') ||
    paymentText === 'carte'
  )
}

const isCounterPayment = (order = {}) =>
  String(order.payment || '')
    .toLowerCase()
    .includes('comptoir')

const isKioskPayAtCounterOrder = (order = {}) => {
  const source = String(order.source || order.order_source || '').toLowerCase()
  const payment = String(order.payment || order.used_payment_method || '')
    .toLowerCase()
    .trim()
  return (
    source === 'borne' &&
    (payment.includes('comptoir') || payment.includes('encaisser'))
  )
}

const getPaymentStatusDisplay = (order = {}) => {
  if (isKioskPayAtCounterOrder(order)) {
    return {
      text: 'À encaisser',
      color: 'warning',
    }
  }

  if (order.payment_status === 'paid') {
    return {
      text: getPaymentMethodText(order),
      color: isStripePayment(order) ? STRIPE_PAYMENT_COLOR : 'success',
    }
  }

  if (order.payment_status === 'unpaid' && isCounterPayment(order)) {
    return {
      text: 'À encaisser',
      color: 'warning',
    }
  }

  return (
    PAYMENT_STATUS_DISPLAY[order.payment_status] || {
      text: order.payment ? order.payment : 'Non renseigné',
      color: 'grey',
    }
  )
}

const getPaymentStatusText = (order = {}) => getPaymentStatusDisplay(order).text

const getPaymentStatusColor = (order = {}) =>
  getPaymentStatusDisplay(order).color

module.exports = {
  getPaymentStatusDisplay,
  getPaymentStatusText,
  getPaymentStatusColor,
}
