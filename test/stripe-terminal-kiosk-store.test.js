const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')
const storePath = path.join(root, 'store', 'stripeTerminal.js')
const source = fs.readFileSync(storePath, 'utf8')

assert.match(source, /\/stripe\/terminal/)
assert.match(source, /\/kiosk\/current-reader/)
assert.match(source, /\/kiosk\/payments/)
assert.match(source, /\/kiosk\/payments\/\$\{paymentId\}\/cancel/)

const executable = source
  .replace(/^import .*$/gm, '')
  .replace(/export const /g, 'const ')
const storeFactory = vm.compileFunction(
  `${executable}\nreturn { state, actions }`,
  ['EasyAccess', 'defaultMutations', 'require']
)
const { state, actions } = storeFactory(() => ({}), () => ({}), require)

const base = '/baseurl/api/v1/stripe/terminal'
const ok = (data) => ({ data: { code: 200, success: true, data } })
const kioskReader = { id: 21, label: 'Borne 1', status: 'online', stripeReaderId: 'tmr_kiosk' }
const kioskPayment = {
  id: 41,
  orderId: 100,
  orderNumber: 'B100',
  readerId: 21,
  status: 'processing',
  amountCents: 2000,
  currency: 'eur',
  orderIds: [100],
  outcome: 'pending',
  cardTicket: null,
}

const harness = (data, rejection = null) => {
  const current = state()
  const calls = []
  const request = (method) => (...args) => {
    calls.push({ method, args })
    return rejection ? Promise.reject(rejection) : Promise.resolve(ok(data))
  }
  const axios = { get: request('get'), post: request('post'), patch: request('patch') }
  const dispatches = []
  const dispatch = (type, value) => {
    dispatches.push({ type, value })
    assert.ok(type.startsWith('set/'), `Unexpected dispatch: ${type}`)
    current[type.slice(4)] = value
  }
  const call = (name, payload) => actions[name].call({ $axios: axios }, { dispatch, state: current }, payload)
  return { current, calls, call, dispatches }
}

const assertRequest = (call, method, url, payload) => {
  assert.strictEqual(call.method, method)
  assert.strictEqual(call.args[0], url)
  if (method !== 'get') assert.deepStrictEqual(call.args[1], payload)
  const config = method === 'get' ? call.args[1] : call.args[2]
  assert.strictEqual(config.headers.Authorization, 'Bearer kiosk-token')
  assert.strictEqual(config.skipGlobalErrorNotification, true)
}

const run = async () => {
  global.localStorage = { getItem: (key) => key === 'token' ? 'kiosk-token' : null }

  assert.strictEqual(typeof actions.getKioskCurrentReader, 'function')
  assert.strictEqual(typeof actions.startKioskPayment, 'function')
  assert.strictEqual(typeof actions.refreshKioskPayment, 'function')
  assert.strictEqual(typeof actions.cancelKioskPayment, 'function')

  const currentReader = harness(kioskReader)
  assert.deepStrictEqual(await currentReader.call('getKioskCurrentReader'), kioskReader)
  assertRequest(currentReader.calls[0], 'get', `${base}/kiosk/current-reader`)
  assert.deepStrictEqual(currentReader.current.currentReader, kioskReader)

  const checkoutPayload = {
    customer: { name: 'Ada' },
    items: [{ product_id: 1, quantity: 2 }],
    expected_total: 20,
    discount_type: 'none',
    discount_value: 0,
    is_takeaway: true,
    client_order_token: 'kiosk-token-1',
    payment_mode: 'stripe',
    readerId: 999,
    amountCents: 1,
    secret: 'omit',
  }
  const start = harness(kioskPayment)
  assert.deepStrictEqual(await start.call('startKioskPayment', checkoutPayload), kioskPayment)
  assertRequest(start.calls[0], 'post', `${base}/kiosk/payments`, {
    customer: { name: 'Ada' },
    items: [{ product_id: 1, quantity: 2 }],
    expected_total: 20,
    discount_type: 'none',
    discount_value: 0,
    is_takeaway: true,
    client_order_token: 'kiosk-token-1',
  })
  assert(!JSON.stringify(start.calls[0].args[1]).includes('readerId'))
  assert(!JSON.stringify(start.calls[0].args[1]).includes('amountCents'))
  assert.strictEqual(start.current.activePayment, kioskPayment)

  const paid = {
    ...kioskPayment,
    status: 'succeeded',
    outcome: 'paid',
    cardTicket: {
      brand: 'visa',
      last4: '4242',
      network: 'cartes_bancaires',
      networkTransactionId: 'net_123',
      readMethod: 'contactless_emv',
      authorizationCode: '123456',
      authorizationResponseCode: '00',
      applicationPreferredName: 'CB',
      dedicatedFileName: 'A0000000421010',
      applicationCryptogram: '9F2608ABCDEF12345678',
      terminalVerificationResults: '8000008000',
      transactionStatusInformation: 'E800',
      cardholderVerificationMethod: 'online_pin',
      accountType: 'credit',
      chargeId: 'ch_terminal',
      terminalPaymentId: 41,
      amountCents: 2000,
    },
  }
  const refresh = harness(paid)
  assert.deepStrictEqual(await refresh.call('refreshKioskPayment', 41), paid)
  assertRequest(refresh.calls[0], 'get', `${base}/kiosk/payments/41`)
  assert.deepStrictEqual(refresh.current.activePayment, paid)

  const canceled = harness({ ...kioskPayment, status: 'canceled', outcome: 'canceled' })
  assert.strictEqual((await canceled.call('cancelKioskPayment', 41)).outcome, 'canceled')
  assertRequest(canceled.calls[0], 'post', `${base}/kiosk/payments/41/cancel`, {})

  for (const invalid of [
    { ...kioskPayment, orderId: null },
    { ...kioskPayment, outcome: 'unknown' },
    { ...kioskPayment, cardTicket: { brand: 'visa', fullPan: '4242424242424242' } },
    { ...kioskPayment, cardTicket: { brand: 'visa', rawStripePayload: { secret: true } } },
  ]) {
    const malformed = harness(invalid)
    assert.strictEqual(await malformed.call('startKioskPayment', checkoutPayload), false)
    assert.strictEqual(malformed.current.error.code, 'TERMINAL_INVALID_RESPONSE')
  }

  const unknown = harness(null, {
    response: { data: { error: 'TERMINAL_NOT_REAL', message: 'secret-token-123' } },
  })
  assert.strictEqual(await unknown.call('startKioskPayment', checkoutPayload), false)
  assert.deepStrictEqual(unknown.current.error, {
    code: 'TERMINAL_REQUEST_FAILED',
    message: 'Impossible de contacter le terminal.',
  })

  console.log('stripe terminal kiosk store tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
