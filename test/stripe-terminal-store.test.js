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
  ['EasyAccess', 'defaultMutations', 'require']
)
const { state, actions } = storeFactory(() => ({}), () => ({}), require)
const {
  isTerminalMethod,
  isTerminalPaymentPending,
  terminalPaymentMessage,
} = require(helperPath)

const reader = {
  id: 7, label: 'S710', serialNumber: 's710-1', deviceType: 'stripe_s710',
  status: 'online', assignedUserId: 4, assignedServicePointId: null,
  isActive: true,
}
const payment = {
  id: 13, readerId: 7, status: 'processing', amountCents: 1250,
  currency: 'eur', orderIds: [3], failureCode: null, failureMessage: null,
}
const base = '/baseurl/api/v1/stripe/terminal'
const ok = (data) => ({ data: { code: 200, success: true, data } })
const deferred = () => {
  let settle
  let fail
  const promise = new Promise((resolve, reject) => { settle = resolve; fail = reject })
  return { promise, resolve: settle, reject: fail }
}

const harness = (result = { data: null }, rejection = null, responder = null) => {
  const calls = []
  const current = state()
  const request = (method) => (...args) => {
    calls.push({ method, args })
    return responder
      ? responder(method, args)
      : rejection
      ? Promise.reject(rejection)
      : Promise.resolve(result.envelope || ok(result.data))
  }
  const axios = {
    get: request('get'),
    post: request('post'),
    patch: request('patch'),
  }
  const dispatches = []
  const dispatch = (type, value) => {
    dispatches.push({ type, value })
    if (type === 'getCurrentReader') {
      return actions.getCurrentReader.call({ $axios: axios }, { dispatch, state: current })
    }
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
      'refreshPayment', 'cancelPayment', 'resetPayment', 'resetSession',
    ].sort()
  )

  global.localStorage = { getItem: (key) => key === 'token' ? 'test-token' : null }

  for (const allocations of [undefined, [], [{ orderId: 3, amountCents: 1249 }],
    [{ orderId: 4, amountCents: 1250 }], [{ orderId: 3, amountCents: -1 }],
    [{ orderId: 3, amountCents: 625 }, { orderId: 3, amountCents: 625 }]]) {
    const invalid = harness({ data: { ...payment, status: 'succeeded', allocations } })
    assert.strictEqual(await invalid.call('refreshPayment', 13), false,
      'Successful payments require exact allocations that sum to the settled total')
  }
  const settled = { ...payment, status: 'succeeded', allocations: [{ orderId: 3, amountCents: 1250 }] }
  assert.deepStrictEqual(await harness({ data: settled }).call('refreshPayment', 13), settled)

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
      'patch', `${base}/readers/7/assignment`, { assignedUserId: 5 }, { ...reader, assignedUserId: 5 }],
    ['setReaderActive', { id: 7, isActive: false, secret: 'omit' },
      'patch', `${base}/readers/7/status`, { isActive: false }, { ...reader, isActive: false }],
    ['refreshReaders', undefined, 'post', `${base}/readers/refresh`, {}, [reader], 'readers'],
    ['getCurrentReader', undefined, 'get', `${base}/current-reader`, undefined, reader, 'currentReader'],
    ['startPayment', { orderIds: [3], discountType: 'amount', discountValue: 100, amountCents: 1, readerId: 7 },
      'post', `${base}/payments`, { orderIds: [3], discountType: 'amount', discountValue: 100 }, payment, 'activePayment'],
    ['refreshPayment', 13, 'get', `${base}/payments/13`, undefined, payment, 'activePayment'],
    ['cancelPayment', 13, 'post', `${base}/payments/13/cancel`, {},
      { ...payment, status: 'canceled' }, 'activePayment'],
  ]

  for (const [name, input, method, url, body, dto, field] of routes) {
    const refetchesCurrent = ['getReaders', 'refreshReaders', 'assignReader', 'setReaderActive'].includes(name)
    const h = refetchesCurrent
      ? harness(null, null, (requestMethod, args) => Promise.resolve(ok(args[0] === `${base}/current-reader` ? null : dto)))
      : harness({ data: dto })
    const returned = await h.call(name, input)
    assert.deepStrictEqual(returned, dto, `${name} must return backend DTO`)
    assert.strictEqual(h.calls.length, refetchesCurrent ? 2 : 1, `${name} request count`)
    assertRequest(h.calls[0], method, url, body)
    if (refetchesCurrent) assertRequest(h.calls[1], 'get', `${base}/current-reader`)
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
    code: 'TERMINAL_READER_OFFLINE', message: 'Le terminal est hors ligne.',
  })
  assert.strictEqual(failed.current.loading, false)
  assert.deepStrictEqual(failed.current.readers, [reader])

  const knownSecret = harness(null, { response: { data: { error: 'TERMINAL_READER_OFFLINE', message: 'secret-token-123' } } })
  assert.strictEqual(await knownSecret.call('startPayment', { orderIds: [3] }), false)
  assert.deepStrictEqual(knownSecret.current.error, {
    code: 'TERMINAL_READER_OFFLINE', message: 'Le terminal est hors ligne.',
  })

  const unknownSecret = harness(null, { response: { data: { error: 'TERMINAL_NOT_REAL', message: 'secret-token-123' } } })
  assert.strictEqual(await unknownSecret.call('getReaders'), false)
  assert.deepStrictEqual(unknownSecret.current.error, {
    code: 'TERMINAL_REQUEST_FAILED', message: 'Impossible de contacter le terminal.',
  })

  const malformedCode = harness(null, { response: { data: { error: { toString: null }, message: 'secret-token-123' } } })
  assert.strictEqual(await malformedCode.call('getReaders'), false)
  assert.deepStrictEqual(malformedCode.current.error, {
    code: 'TERMINAL_REQUEST_FAILED', message: 'Impossible de contacter le terminal.',
  })

  const unknown = harness(null, { response: { data: { error: { secret: true }, message: { secret: true } } } })
  assert.strictEqual(await unknown.call('startPayment', { orderIds: [3] }), false)
  assert.deepStrictEqual(unknown.current.error, {
    code: 'TERMINAL_REQUEST_FAILED', message: 'Impossible de contacter le terminal.',
  })

  const reset = harness(null, { response: { data: { error: 'TERMINAL_PAYMENT_FAILED' } } })
  await reset.call('startPayment', { orderIds: [3] })
  reset.current.activePayment = payment
  await reset.call('resetPayment')
  assert.strictEqual(reset.current.activePayment, null)
  assert.strictEqual(reset.current.error, null)
  assert.strictEqual(reset.calls.length, 1)

  for (const invalid of [
    { name: 'registerReader', input: undefined },
    { name: 'assignReader', input: null },
    { name: 'setReaderActive', input: { id: 7 } },
    { name: 'startPayment', input: null },
    { name: 'startPayment', input: { orderIds: [3], discountType: 'percent', discountValue: NaN } },
    { name: 'refreshPayment', input: null },
  ]) {
    const h = harness({ data: payment })
    assert.strictEqual(await h.call(invalid.name, invalid.input), false, invalid.name)
    assert.strictEqual(h.current.error.code, 'TERMINAL_INVALID_INPUT')
    assert.strictEqual(h.current.loading, false)
    assert.strictEqual(h.calls.length, 0)
  }

  for (const [name, result] of [
    ['getReaders', { envelope: { data: { code: 200, success: false, data: [reader] } } }],
    ['getReaders', { envelope: { data: { code: 200, success: true } } }],
    ['getReaders', { data: [{ id: 'bad' }] }],
    ['getReaders', { data: [{ id: 7, label: 'S710', status: 'online', isActive: true }] }],
    ['startPayment', { data: { ...payment, status: 'impossible' } }],
    ['startPayment', { data: { ...payment, amountCents: undefined } }],
    ['cancelPayment', { data: { ...payment, id: 99 } }],
  ]) {
    const h = harness(result)
    const input = name === 'startPayment' ? { orderIds: [3] } : name === 'cancelPayment' ? 13 : undefined
    assert.strictEqual(await h.call(name, input), false, name)
    assert.strictEqual(h.current.error.code, 'TERMINAL_INVALID_RESPONSE')
    assert.strictEqual(h.current.loading, false)
    assert.deepStrictEqual(h.current.readers, [])
    assert.strictEqual(h.current.activePayment, null)
  }

  const oldList = deferred()
  const newList = deferred()
  let listCalls = 0
  const listRace = harness(null, null, (method, args) => args[0] === `${base}/current-reader`
    ? Promise.resolve(ok(null)) : ++listCalls === 1 ? oldList.promise : newList.promise)
  const firstList = listRace.call('getReaders')
  const secondList = listRace.call('getReaders')
  assert.strictEqual(listRace.current.loading, true)
  const newestReader = { ...reader, label: 'New label' }
  newList.resolve(ok([newestReader]))
  assert.deepStrictEqual(await secondList, [newestReader])
  assert.strictEqual(listRace.current.loading, true)
  oldList.resolve(ok([reader]))
  await firstList
  assert.deepStrictEqual(listRace.current.readers, [newestReader])
  assert.strictEqual(listRace.current.loading, false)

  const staleFailure = deferred()
  const freshSuccess = deferred()
  let errorCalls = 0
  const errorRace = harness(null, null, (method, args) => args[0] === `${base}/current-reader`
    ? Promise.resolve(ok(null)) : ++errorCalls === 1 ? staleFailure.promise : freshSuccess.promise)
  const previous = errorRace.call('getReaders')
  const latest = errorRace.call('getReaders')
  freshSuccess.resolve(ok([reader]))
  await latest
  staleFailure.reject({ response: { data: { error: 'TERMINAL_READER_OFFLINE' } } })
  assert.strictEqual(await previous, false)
  assert.strictEqual(errorRace.current.error, null)
  assert.deepStrictEqual(errorRace.current.readers, [reader])

  const pendingPaymentFailure = deferred()
  const unrelatedList = deferred()
  const crossDomain = harness(null, null, (method, args) =>
    args[0] === `${base}/current-reader` ? Promise.resolve(ok(null))
      : args[0].includes('/payments') ? pendingPaymentFailure.promise : unrelatedList.promise)
  const paymentRequest = crossDomain.call('startPayment', { orderIds: [3] })
  const readerRequest = crossDomain.call('getReaders')
  pendingPaymentFailure.reject({ response: { data: { error: 'TERMINAL_PAYMENT_FAILED' } } })
  assert.strictEqual(await paymentRequest, false)
  assert.deepStrictEqual(crossDomain.current.error, {
    code: 'TERMINAL_PAYMENT_FAILED', message: 'Le paiement sur le terminal a echoue.',
  })
  unrelatedList.resolve(ok([reader]))
  await readerRequest
  assert.strictEqual(crossDomain.current.error.code, 'TERMINAL_PAYMENT_FAILED')

  const laterReaderFailure = deferred()
  const paymentError = new Error('Terminal payment failed')
  paymentError.response = { data: { error: 'TERMINAL_PAYMENT_FAILED' } }
  const retainedPaymentError = harness(null, null, (method, args) =>
    args[0].includes('/readers') ? laterReaderFailure.promise : Promise.reject(paymentError))
  const pendingList = retainedPaymentError.call('getReaders')
  await retainedPaymentError.call('startPayment', { orderIds: [3] })
  laterReaderFailure.reject({ response: { data: { error: 'TERMINAL_READER_NOT_FOUND' } } })
  await pendingList
  assert.strictEqual(retainedPaymentError.current.error.code, 'TERMINAL_PAYMENT_FAILED')

  const pendingReaderFailure = deferred()
  const paymentAfterReader = deferred()
  const resetDomains = harness(null, null, (method, args) =>
    args[0].includes('/readers') ? pendingReaderFailure.promise : paymentAfterReader.promise)
  const reading = resetDomains.call('getReaders')
  const paying = resetDomains.call('startPayment', { orderIds: [3] })
  resetDomains.call('resetPayment')
  pendingReaderFailure.reject({ response: { data: { error: 'TERMINAL_READER_NOT_FOUND' } } })
  assert.strictEqual(await reading, false)
  assert.strictEqual(resetDomains.current.error.code, 'TERMINAL_READER_NOT_FOUND')
  paymentAfterReader.resolve(ok(payment))
  await paying
  assert.strictEqual(resetDomains.current.activePayment, null)

  const oldPayment = deferred()
  const newPayment = deferred()
  let paymentCalls = 0
  const paymentRace = harness(null, null, () => ++paymentCalls === 1 ? oldPayment.promise : newPayment.promise)
  const firstPayment = paymentRace.call('refreshPayment', 13)
  const secondPayment = paymentRace.call('cancelPayment', 13)
  const canceled = { ...payment, status: 'canceled' }
  newPayment.resolve(ok(canceled))
  await secondPayment
  assert.deepStrictEqual(paymentRace.current.activePayment, canceled)
  oldPayment.resolve(ok(payment))
  await firstPayment
  assert.deepStrictEqual(paymentRace.current.activePayment, canceled)

  const pendingReset = deferred()
  const resetRace = harness(null, null, () => pendingReset.promise)
  const started = resetRace.call('startPayment', { orderIds: [3] })
  resetRace.call('resetPayment')
  pendingReset.resolve(ok(payment))
  await started
  assert.strictEqual(resetRace.current.activePayment, null)
  assert.strictEqual(resetRace.current.loading, false)

  const formerSession = deferred()
  const sessionRace = harness(null, null, () => formerSession.promise)
  const previousSessionPayment = sessionRace.call('startPayment', { orderIds: [3] })
  sessionRace.call('resetSession')
  formerSession.resolve(ok(payment))
  assert.strictEqual(await previousSessionPayment, false)
  assert.strictEqual(sessionRace.current.activePayment, null)
  assert.deepStrictEqual(sessionRace.current.readers, [])

  const postMutationFetch = deferred()
  const oldAdmin = harness(null, null, (method) => method === 'patch'
    ? Promise.resolve(ok({ ...reader, assignedUserId: 5 }))
    : postMutationFetch.promise)
  const previousAssignment = oldAdmin.call('assignReader', { id: 7, assignedUserId: 5 })
  await Promise.resolve()
  await Promise.resolve()
  oldAdmin.call('resetSession')
  postMutationFetch.resolve(ok(null))
  assert.strictEqual(await previousAssignment, false)
  assert.deepStrictEqual(oldAdmin.current.readers, [])

  const oldIdentity = deferred()
  const identityRace = harness(null, null, () => oldIdentity.promise)
  const refreshed = identityRace.call('refreshPayment', 13)
  identityRace.current.activePayment = { ...payment, id: 99 }
  oldIdentity.resolve(ok(payment))
  await refreshed
  assert.strictEqual(identityRace.current.activePayment.id, 99)

  const oldCurrent = deferred()
  const newCurrent = deferred()
  let currentCalls = 0
  const currentRace = harness(null, null, () => ++currentCalls === 1 ? oldCurrent.promise : newCurrent.promise)
  const firstCurrent = currentRace.call('getCurrentReader')
  const secondCurrent = currentRace.call('getCurrentReader')
  newCurrent.resolve(ok(null))
  await secondCurrent
  oldCurrent.resolve(ok(reader))
  await firstCurrent
  assert.strictEqual(currentRace.current.currentReader, null)

  const earlierAssignment = deferred()
  const laterSnapshot = deferred()
  const assignmentRace = harness(null, null, (method, args) => method === 'patch'
    ? earlierAssignment.promise
    : args[0].includes('current-reader') ? Promise.resolve(ok(null)) : laterSnapshot.promise)
  const assigning = assignmentRace.call('assignReader', { id: 7, assignedUserId: 5 })
  const snapshot = assignmentRace.call('getReaders')
  laterSnapshot.resolve(ok([reader]))
  await snapshot
  earlierAssignment.resolve(ok({ ...reader, assignedUserId: 5 }))
  await assigning
  assert.strictEqual(assignmentRace.current.readers[0].assignedUserId, 5)

  const oldSnapshot = deferred()
  const mutation = deferred()
  const staleList = harness(null, null, (method, args) => method === 'patch'
    ? mutation.promise
    : args[0].includes('current-reader') ? Promise.resolve(ok(null)) : oldSnapshot.promise)
  const listing = staleList.call('getReaders')
  const changing = staleList.call('setReaderActive', { id: 7, isActive: false })
  mutation.resolve(ok({ ...reader, isActive: false }))
  await changing
  oldSnapshot.resolve(ok([reader]))
  assert.strictEqual(await listing, false)
  assert.strictEqual(staleList.current.readers[0].isActive, false)

  const firstMutation = deferred()
  const secondMutation = deferred()
  let sameReaderPatches = 0
  const sameReaderRace = harness(null, null, (method) => method === 'patch'
    ? ++sameReaderPatches === 1 ? firstMutation.promise : secondMutation.promise
    : Promise.resolve(ok(null)))
  const olderChange = sameReaderRace.call('assignReader', { id: 7, assignedUserId: 5 })
  const newerChange = sameReaderRace.call('assignReader', { id: 7, assignedUserId: 6 })
  secondMutation.resolve(ok({ ...reader, assignedUserId: 6 }))
  assert.strictEqual((await newerChange).assignedUserId, 6)
  firstMutation.resolve(ok({ ...reader, assignedUserId: 5 }))
  assert.strictEqual(await olderChange, false)
  assert.strictEqual(sameReaderRace.current.readers[0].assignedUserId, 6)

  const independentFirst = deferred()
  const independentSecond = deferred()
  let independentPatches = 0
  const independentReaders = harness(null, null, (method) => method === 'patch'
    ? ++independentPatches === 1 ? independentFirst.promise : independentSecond.promise
    : Promise.resolve(ok(null)))
  const firstReaderChange = independentReaders.call('assignReader', { id: 7, assignedUserId: 5 })
  const secondReaderChange = independentReaders.call('assignReader', { id: 8, assignedUserId: 6 })
  independentSecond.resolve(ok({ ...reader, id: 8, assignedUserId: 6 }))
  await secondReaderChange
  independentFirst.resolve(ok({ ...reader, assignedUserId: 5 }))
  await firstReaderChange
  assert.deepStrictEqual(independentReaders.current.readers.map((item) => item.id).sort(), [7, 8])

  const unrelatedCurrent = deferred()
  const unrelatedRegistration = deferred()
  const registrationRace = harness(null, null, (method) =>
    method === 'get' ? unrelatedCurrent.promise : unrelatedRegistration.promise)
  const readingCurrent = registrationRace.call('getCurrentReader')
  const registering = registrationRace.call('registerReader', {
    registrationCode: 'code', label: 'Other', assignedUserId: 5,
  })
  unrelatedRegistration.resolve(ok({ ...reader, id: 8, assignedUserId: 5 }))
  await registering
  unrelatedCurrent.resolve(ok(reader))
  await readingCurrent
  assert.deepStrictEqual(registrationRace.current.currentReader, reader)

  const replacementReader = { ...reader, id: 9 }
  const authoritative = deferred()
  const reassignment = harness(null, null, (method) => method === 'patch'
    ? Promise.resolve(ok({ ...reader, assignedUserId: 5 }))
    : authoritative.promise)
  reassignment.current.currentReader = reader
  let assignmentSettled = false
  const changedReader = reassignment.call('assignReader', { id: 7, assignedUserId: 5 })
    .then((value) => { assignmentSettled = true; return value })
  await Promise.resolve()
  await Promise.resolve()
  assert.strictEqual(assignmentSettled, false)
  assert.ok(reassignment.calls.some((call) => call.args[0] === `${base}/current-reader`))
  authoritative.resolve(ok(replacementReader))
  await changedReader
  assert.deepStrictEqual(reassignment.current.currentReader, replacementReader)
  assert.strictEqual(reassignment.current.readers[0].assignedUserId, 5)

  const disabled = harness(null, null, (method) => method === 'patch'
    ? Promise.resolve(ok({ ...reader, isActive: false }))
    : Promise.resolve(ok(null)))
  disabled.current.currentReader = reader
  await disabled.call('setReaderActive', { id: 7, isActive: false })
  assert.strictEqual(disabled.current.currentReader, null)
  assert.strictEqual(disabled.calls.filter((call) => call.args[0] === `${base}/current-reader`).length, 1)

  const assigned = harness(null, null, (method) => Promise.resolve(ok(method === 'get'
    ? null : { ...reader, assignedUserId: 5 })))
  assigned.current.currentReader = reader
  assigned.current.readers = [reader]
  await assigned.call('assignReader', { id: 7, assignedUserId: 5 })
  assert.strictEqual(assigned.current.currentReader, null)
  assert.strictEqual(assigned.current.readers[0].assignedUserId, 5)

  const deactivated = harness(null, null, (method) => Promise.resolve(ok(method === 'get'
    ? null : { ...reader, isActive: false })))
  deactivated.current.currentReader = reader
  deactivated.current.readers = [reader]
  await deactivated.call('setReaderActive', { id: 7, isActive: false })
  assert.strictEqual(deactivated.current.currentReader, null)

  const pendingCurrent = deferred()
  const adminUpdate = deferred()
  const refreshedCurrent = deferred()
  let adminGets = 0
  const adminRace = harness(null, null, (method) => method === 'get'
    ? ++adminGets === 1 ? pendingCurrent.promise : refreshedCurrent.promise
    : adminUpdate.promise)
  adminRace.current.currentReader = reader
  const loadingCurrent = adminRace.call('getCurrentReader')
  const reassigning = adminRace.call('assignReader', { id: 7, assignedUserId: 5 })
  adminUpdate.resolve(ok({ ...reader, assignedUserId: 5 }))
  await Promise.resolve()
  await Promise.resolve()
  refreshedCurrent.resolve(ok(null))
  await reassigning
  pendingCurrent.resolve(ok(reader))
  await loadingCurrent
  assert.strictEqual(adminRace.current.currentReader, null)

  for (const [label, list] of [
    ['absent', []],
    ['inactive', [{ ...reader, isActive: false }]],
  ]) {
    const currentRefresh = deferred()
    const listed = harness(null, null, (method, args) => args[0].includes('current-reader')
      ? currentRefresh.promise : Promise.resolve(ok(list)))
    listed.current.currentReader = reader
    const fetching = listed.call('getReaders')
    await Promise.resolve()
    assert.strictEqual(listed.current.currentReader, null, `${label} clears before GET settles`)
    assert.strictEqual(listed.calls.length, 2, `${label} triggers current-reader GET`)
    currentRefresh.resolve(ok(null))
    assert.deepStrictEqual(await fetching, list)
    assert.strictEqual(listed.current.currentReader, null)
  }

  const reassignedList = { ...reader, assignedUserId: 5 }
  const reassignedCurrent = harness(null, null, (method, args) => args[0].includes('current-reader')
    ? Promise.resolve(ok(null)) : Promise.resolve(ok([reassignedList])))
  reassignedCurrent.current.currentReader = reader
  await reassignedCurrent.call('getReaders')
  assert.strictEqual(reassignedCurrent.current.currentReader, null)
  assert.strictEqual(reassignedCurrent.calls.length, 2)

  const unchangedCurrent = harness(null, null, (method, args) => args[0].includes('current-reader')
    ? Promise.resolve(ok(reader)) : Promise.resolve(ok([reader])))
  unchangedCurrent.current.currentReader = reader
  await unchangedCurrent.call('refreshReaders')
  assert.deepStrictEqual(unchangedCurrent.current.currentReader, reader)
  assert.strictEqual(unchangedCurrent.calls.length, 2)

  const obsoleteCurrent = deferred()
  const listCurrent = deferred()
  let overlapGets = 0
  const listCurrentRace = harness(null, null, (method, args) => args[0].includes('current-reader')
    ? ++overlapGets === 1 ? obsoleteCurrent.promise : listCurrent.promise
    : Promise.resolve(ok([])))
  listCurrentRace.current.currentReader = reader
  const oldCurrentFetch = listCurrentRace.call('getCurrentReader')
  const freshListFetch = listCurrentRace.call('getReaders')
  await Promise.resolve()
  assert.strictEqual(listCurrentRace.current.currentReader, null)
  listCurrent.resolve(ok(null))
  await freshListFetch
  obsoleteCurrent.resolve(ok(reader))
  assert.strictEqual(await oldCurrentFetch, false)
  assert.strictEqual(listCurrentRace.current.currentReader, null)

  for (const [action, oldFinishesLast] of [
    ['getReaders', true], ['getReaders', false],
    ['refreshReaders', true], ['refreshReaders', false],
  ]) {
    const olderCurrent = deferred()
    const freshEmptyList = deferred()
    const authoritativeCurrent = deferred()
    let currentRequests = 0
    const emptyCurrentRace = harness(null, null, (method, args) => args[0] === `${base}/current-reader`
      ? ++currentRequests === 1 ? olderCurrent.promise : authoritativeCurrent.promise
      : freshEmptyList.promise)
    assert.strictEqual(emptyCurrentRace.current.currentReader, null)
    const olderFetch = emptyCurrentRace.call('getCurrentReader')
    let listSettled = false
    const newerList = emptyCurrentRace.call(action).then((value) => {
      listSettled = true
      return value
    })
    freshEmptyList.resolve(ok([]))
    await Promise.resolve()
    assert.deepStrictEqual(emptyCurrentRace.current.readers, [])
    if (oldFinishesLast) {
      authoritativeCurrent.resolve(ok(null))
      assert.deepStrictEqual(await newerList, [])
    }
    olderCurrent.resolve(ok(reader))
    const olderResult = await olderFetch
    assert.strictEqual(emptyCurrentRace.current.currentReader, null,
      `${action} must not let an older GET repopulate an initially empty current reader`)
    assert.strictEqual(olderResult, false)
    if (!oldFinishesLast) {
      assert.strictEqual(listSettled, false, `${action} must await authoritative reconciliation`)
      assert.strictEqual(emptyCurrentRace.current.loading, true)
      authoritativeCurrent.resolve(ok(null))
      assert.deepStrictEqual(await newerList, [])
    }
    assert.strictEqual(currentRequests, 2)
    assertRequest(emptyCurrentRace.calls[2], 'get', `${base}/current-reader`)
    assert.deepStrictEqual(emptyCurrentRace.current.readers, [])
    assert.strictEqual(emptyCurrentRace.current.currentReader, null)
    assert.strictEqual(emptyCurrentRace.current.loading, false)
    assert.strictEqual(emptyCurrentRace.current.error, null)
  }

  const unrelated = harness({ data: { ...reader, id: 8 } })
  unrelated.current.currentReader = reader
  await unrelated.call('registerReader', { registrationCode: 'code', label: 'S710', assignedUserId: 5 })
  assert.deepStrictEqual(unrelated.current.currentReader, reader)

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
  assert.strictEqual(terminalPaymentMessage({
    status: 'failed', failureCode: 'TERMINAL_PAYMENT_FAILED', failureMessage: 'secret-token-123',
  }), 'Le paiement sur le terminal a echoue.')
  assert.strictEqual(terminalPaymentMessage({
    status: 'failed', failureCode: 'UNKNOWN', failureMessage: 'secret-token-123',
  }), 'Le paiement sur le terminal a echoue.')
  assert.strictEqual(typeof terminalPaymentMessage({ status: 'processing' }), 'string')
  assert.strictEqual(typeof terminalPaymentMessage({ status: 'succeeded' }), 'string')
  assert.strictEqual(typeof terminalPaymentMessage(null), 'string')

  console.log('stripe terminal store tests passed')
}

const watchdog = setTimeout(() => {
  console.error(new Error('Terminal store test did not settle'))
  process.exitCode = 1
}, 5000)

run().then(() => {
  clearTimeout(watchdog)
}).catch((error) => {
  clearTimeout(watchdog)
  console.error(error)
  process.exitCode = 1
})
