const COUNTER_PAY_BEFORE_MODE = 'counter_pay_before'
const DEFAULT_COUNTER_METHOD = 'Caisse'

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
  COUNTER_PAY_BEFORE_MODE,
  buildCounterPayBeforePayment,
  getCounterPayBeforeMethod,
  isCounterPayBeforePaymentMode,
}
