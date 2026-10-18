const COUNTER_PAY_BEFORE_MODE = 'counter_pay_before'
const DEFAULT_COUNTER_METHOD = 'Caisse'
const { buildCheckoutPayloadSignature } = require('./customizations')

const deliveryDetails = (details = {}) => Object.fromEntries(
  ['complement', 'instructions'].filter(key => typeof details[key] === 'string')
    .map(key => [key, details[key]])
)

const buildCheckoutIntentSignature = (params = {}) => {
  const legacy = buildCheckoutPayloadSignature(params)
  if (params.fulfillmentType !== 'delivery') return legacy
  return JSON.stringify({ legacy, fulfillmentType: 'delivery',
    addressResolutionToken: params.addressResolutionToken,
    deliveryQuoteToken: params.deliveryQuoteToken,
    deliveryDetails: deliveryDetails(params.deliveryDetails),
    discountType: params.discountType || 'none',
    discountValue: params.discountValue == null ? 0 : params.discountValue,
    customerContextId: params.customerSession ? params.customerSession.customerId : null,
  })
}

const createDeliveryConfirmationSecret = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

const normalizeCounterMethod = (method) => {
  const normalized = method == null ? '' : String(method).trim()
  return normalized || DEFAULT_COUNTER_METHOD
}

const buildCounterPayBeforePayment = (method) =>
  `${COUNTER_PAY_BEFORE_MODE}:${normalizeCounterMethod(method)}`

const isCounterPayBeforePaymentMode = (mode) =>
  typeof mode === 'string' && mode.startsWith(`${COUNTER_PAY_BEFORE_MODE}:`)

const getCounterPayBeforeMethod = (mode) =>
  isCounterPayBeforePaymentMode(mode)
    ? normalizeCounterMethod(mode.slice(COUNTER_PAY_BEFORE_MODE.length + 1))
    : null

module.exports = {
  buildCheckoutIntentSignature,
  createDeliveryConfirmationSecret,
  deliveryDetails,
  COUNTER_PAY_BEFORE_MODE,
  buildCounterPayBeforePayment,
  getCounterPayBeforeMethod,
  isCounterPayBeforePaymentMode,
}
