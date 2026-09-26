const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')
const storePath = path.join(root, 'store', 'stripeTerminal.js')
const helperPath = path.join(root, 'helpers', 'stripeTerminal.js')

assert.ok(fs.existsSync(storePath), 'Terminal store must exist')
assert.ok(fs.existsSync(helperPath), 'Terminal helpers must exist')

const source = fs.readFileSync(storePath, 'utf8')
assert.doesNotMatch(source, /(?:from|require\s*\()\s*['"][^'"]*cart(?:\.js)?['"]|cart\//)
assert.doesNotMatch(source, /setInterval|setTimeout/)
assert.doesNotMatch(source, /notifications\//)

const executable = source
  .replace(/^import .*$/gm, '')
  .replace(/export const /g, 'const ')
const storeFactory = vm.compileFunction(
  `${executable}\nreturn { state, actions }`,
  ['EasyAccess', 'defaultMutations']
)
const { state, actions } = storeFactory(() => ({}), () => ({}))
const {
  isTerminalMethod,
  isTerminalPaymentPending,
  terminalPaymentMessage,
} = require(helperPath)

const reader = { id: 7, label: 'S710', status: 'online', isActive: true }
const payment = { id: 13, readerId: 7, status: 'processing', orderIds: [3] }
const base = '/baseurl/api/v1/stripe/terminal'

const harness = (result = { data: null }, rejection = null) => {
  const calls = []
  const current = state()
  const request = (method) => (...args) => {
    calls.push({ method, args })
    return rejection
      ? Promise.reject(rejection)
      : Promise.resolve({ data: { data: result.data } })
  }
  const axios = {
    get: request('get'),
    post: request('post'),
    patch: request('patch'),
  }
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
  const config = method === 'get' ? call.args[1] : call.args[2]
  assert.strictEqual(config.headers.Authorization, 'Bearer test-token')
  assert.strictEqual(config.skipGlobalErrorNotification, true)
  if (method !== 'get') assert.deepStrictEqual(call.args[1], payload)
}

const run = async () => {
  assert.deepStrictEqual(state(), {
    readers: [],
    currentReader: null,
    activePayment: null,
    loading: false,
    error: null,
  })
  assert.deepStrictEqual(
    Object.keys(actions).sort(),
    [
      'getReaders', 'registerReader', 'assignReader', 'setReaderActive',
      'refreshReaders', 'getCurrentReader', 'startPayment',
      'refreshPayment', 'cancelPayment', 'resetPayment',
    ].sort()
  )

  global.localStorage = { getItem: (key) => key === 'token' ? 'test-token' : null }

  const routes = [
    ['getReaders', undefined, 'get', `${base}/readers`, undefined, [reader], 'readers'],
    ['registerReader', {
      registrationCode: 'code', label: 'S710', assignedUserId: 4,
      address: { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR', extra: 'omit' },
      assignedServicePointId: 8, secret: 'omit',
    }, 'post', `${base}/readers`, {
      registrationCode: 'code', label: 'S710', assignedUserId: 4,
      address: { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR' },
    }, reader],
    ['assignReader', { id: 7, assignedUserId: 5, assignedServicePointId: 8, secret: 'omit' },
      'patch', `${base}/readers/7/assignment`, { assignedUserId: 5 }, reader],
    ['setReaderActive', { id: 7, isActive: false, secret: 'omit' },
      'patch', `${base}/readers/7/status`, { isActive: false }, reader],
    ['refreshReaders', undefined, 'post', `${base}/readers/refresh`, {}, [reader], 'readers'],
    ['getCurrentReader', undefined, 'get', `${base}/current-reader`, undefined, reader, 'currentReader'],
    ['startPayment', { orderIds: [3], discountType: 'fixed', discountValue: 1, amountCents: 1, readerId: 7 },
      'post', `${base}/payments`, { orderIds: [3], discountType: 'fixed', discountValue: 1 }, payment, 'activePayment'],
    ['refreshPayment', 13, 'get', `${base}/payments/13`, undefined, payment, 'activePayment'],
    ['cancelPayment', 13, 'post', `${base}/payments/13/cancel`, {},
      { ...payment, status: 'canceled' }, 'activePayment'],
  ]

  for (const [name, input, method, url, body, dto, field] of routes) {
    const h = harness({ data: dto })
    const returned = await h.call(name, input)
    assert.deepStrictEqual(returned, dto, `${name} must return backend DTO`)
    assert.strictEqual(h.calls.length, 1, `${name} must make one request`)
    assertRequest(h.calls[0], method, url, body)
    if (field) assert.deepStrictEqual(h.current[field], dto, `${name} must update ${field}`)
    assert.strictEqual(h.current.loading, false)
    assert.strictEqual(h.current.error, null)
  }

  const absentReader = harness({ data: null })
  assert.strictEqual(await absentReader.call('getCurrentReader'), null)
  assert.strictEqual(absentReader.current.currentReader, null)

  const failed = harness(null, { response: { data: { error: 'TERMINAL_READER_OFFLINE', message: 'Terminal hors ligne.' } } })
  failed.current.readers = [reader]
  assert.strictEqual(await failed.call('getReaders'), false)
  assert.deepStrictEqual(failed.current.error, {
    code: 'TERMINAL_READER_OFFLINE', message: 'Terminal hors ligne.',
  })
  assert.strictEqual(failed.current.loading, false)
  assert.deepStrictEqual(failed.current.readers, [reader])

  const unknown = harness(null, { response: { data: { error: { secret: true }, message: { secret: true } } } })
  assert.strictEqual(await unknown.call('startPayment', { orderIds: [3] }), false)
  assert.deepStrictEqual(unknown.current.error, {
    code: 'TERMINAL_REQUEST_FAILED', message: 'Impossible de contacter le terminal.',
  })

  const reset = harness()
  reset.current.activePayment = payment
  reset.current.error = { code: 'TERMINAL_REQUEST_FAILED', message: 'Erreur' }
  await reset.call('resetPayment')
  assert.strictEqual(reset.current.activePayment, null)
  assert.strictEqual(reset.current.error, null)
  assert.strictEqual(reset.calls.length, 0)

  assert.strictEqual(isTerminalMethod('stripe_terminal'), true)
  assert.strictEqual(isTerminalMethod('Terminal'), true)
  assert.strictEqual(isTerminalMethod('Carte bancaire'), false)
  assert.strictEqual(isTerminalMethod(null), false)
  assert.strictEqual(isTerminalPaymentPending({ status: 'creating' }), true)
  assert.strictEqual(isTerminalPaymentPending({ status: 'processing' }), true)
  for (const status of ['succeeded', 'failed', 'canceled', 'refunded', 'unknown']) {
    assert.strictEqual(isTerminalPaymentPending({ status }), false, status)
  }
  assert.strictEqual(isTerminalPaymentPending(null), false)
  assert.strictEqual(terminalPaymentMessage({ status: 'failed', failureMessage: 'Carte refusée.' }), 'Carte refusée.')
  assert.strictEqual(typeof terminalPaymentMessage({ status: 'processing' }), 'string')
  assert.strictEqual(typeof terminalPaymentMessage({ status: 'succeeded' }), 'string')
  assert.strictEqual(typeof terminalPaymentMessage(null), 'string')

  console.log('stripe terminal store tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
