const QR_CLIENT_ACCESSES = [2, 3]
const QR_PAYMENT_MODES = {
  STRIPE_BEFORE_ORDER: 'stripe_before_order',
  PAY_AT_COUNTER: 'pay_at_counter',
}

const normalizeQrPaymentMode = (mode) => {
  if (Object.values(QR_PAYMENT_MODES).includes(mode)) {
    return mode
  }

  return QR_PAYMENT_MODES.STRIPE_BEFORE_ORDER
}

const isQrClientAccess = (access) => QR_CLIENT_ACCESSES.includes(Number(access))
const isStripePaymentRequired = (mode) =>
  normalizeQrPaymentMode(mode) === QR_PAYMENT_MODES.STRIPE_BEFORE_ORDER
const isCounterPaymentAllowed = (mode) =>
  normalizeQrPaymentMode(mode) === QR_PAYMENT_MODES.PAY_AT_COUNTER

module.exports = {
  isCounterPaymentAllowed,
  isQrClientAccess,
  isStripePaymentRequired,
}
