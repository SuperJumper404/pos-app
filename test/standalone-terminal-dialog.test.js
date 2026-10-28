const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Vue = require('vue')
const { attemptStorageKey, readAttempt } = require('../helpers/standaloneTerminal')
const file = 'components/terminal/StandaloneTerminalDialog.vue'
assert.ok(fs.existsSync(path.resolve(__dirname, '..', file)), 'The free-amount terminal modal must exist')
const { component, template } = require('./helpers/vue-component')(file)
const instances = []
const payment = { id: 21, paymentKind: 'standalone', readerId: 7, status: 'processing', amountCents: 5000,
  currency: 'eur', createdAt: '2026-10-28T12:00:00Z', confirmedAt: null,
  failureCode: null, failureMessage: null, cardTicket: null, attachmentsCount: 0 }
const make = () => {
  const values = new Map()
  global.localStorage = { getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const user = { id: 4, shopid: 7, access: 1, module_permissions: ['cashregister', 'history'] }
  const calls = []
  const network = Vue.observable({ loading: false })
  let response = payment
  let storeError = null
  const store = { get: key => ({ 'users/user': user, 'terminalPayments/loading': network.loading, 'terminalPayments/error': storeError })[key],
    dispatch: (name, payload) => { calls.push({ name, payload }); return Promise.resolve(typeof response === 'function' ? response() : response) } }
  const instance = new Vue({ ...component, ...template, beforeCreate() {
    this.$store = store
    this.$router = { push: route => { calls.push({ route }); return Promise.resolve() } }
  }, propsData: { value: false,
    reader: { id: 7, label: 'S710', status: 'online', isActive: true, assignedUserId: 4 } } })
  instances.push(instance)
  return { instance, user, calls, values, network, respond: value => { response = value }, setError: value => { storeError = value } }
}
const run = async () => {
  const keyboard = make()
  keyboard.instance.value = true
  await Vue.nextTick()
  keyboard.instance.amountCents = 5000
  let prevented = false
  keyboard.instance.handleKey({ key: 'Enter', target: { tagName: 'BUTTON' }, preventDefault() { prevented = true } })
  assert.strictEqual(keyboard.calls.filter(call => call.name === 'terminalPayments/startPayment').length, 0, 'Enter on a focused close/clear/digit button must never send payment')
  assert.strictEqual(prevented, false, 'Keep the focused button native keyboard activation')
  keyboard.instance.$destroy()
  const h = make()
  for (const key of ['5', '0', '0', '0']) h.instance.handleKey({ key, preventDefault() {} })
  assert.strictEqual(h.instance.amountCents, 0, 'Closed modal must not consume keyboard input')
  await h.instance.onOpen()
  h.instance.addDigit('5'); h.instance.addDigit('0'); h.instance.addDigit('0'); h.instance.addDigit('0')
  assert.strictEqual(h.instance.amountCents, 5000)
  let settle
  h.respond(() => new Promise(resolve => { settle = resolve }))
  const pending = h.instance.sendPayment()
  await h.instance.sendPayment()
  assert.strictEqual(h.calls.filter(call => call.name === 'terminalPayments/startPayment').length, 1)
  const saved = readAttempt(global.localStorage, attemptStorageKey(h.user))
  assert.strictEqual(saved.amountCents, 5000)
  h.instance.addDigit('1')
  assert.strictEqual(h.instance.amountCents, 5000, 'Amount locks before network request')
  h.instance.closeDialog()
  assert.strictEqual(h.calls.some(call => call.name === 'terminalPayments/cancelPayment'), false, 'Closing must not cancel reader action')
  settle(payment)
  await pending
  h.instance.$destroy()

  const uncertain = make()
  await uncertain.instance.onOpen()
  uncertain.instance.amountCents = 5000
  uncertain.respond(false)
  await uncertain.instance.sendPayment()
  const original = uncertain.instance.attempt.attemptKey
  uncertain.respond(payment)
  await uncertain.instance.checkPayment()
  const starts = uncertain.calls.filter(call => call.name === 'terminalPayments/startPayment')
  assert.strictEqual(starts.length, 2)
  assert.strictEqual(starts[0].payload.attemptKey, original)
  assert.strictEqual(starts[1].payload.attemptKey, original)
  assert.strictEqual(uncertain.instance.payment.status, 'processing')
  uncertain.instance.startNewPayment()
  assert.strictEqual(uncertain.instance.attempt.attemptKey, original, 'An unresolved payment cannot be discarded')
  uncertain.instance.$destroy()

  const unsubmitted = make()
  await unsubmitted.instance.onOpen()
  unsubmitted.instance.amountCents = 5000
  unsubmitted.respond({ ...payment, status: 'creating' })
  await unsubmitted.instance.sendPayment()
  unsubmitted.respond({ ...payment, status: 'canceled' })
  await unsubmitted.instance.cancelPayment()
  assert.ok(unsubmitted.calls.some(call => call.name === 'terminalPayments/cancelPayment'), 'Server must decide whether a creating reservation can safely be canceled')
  unsubmitted.instance.$destroy()

  const reopened = make()
  reopened.instance.value = true
  await Vue.nextTick()
  reopened.instance.amountCents = 5000
  let settleFirst
  reopened.respond(() => {
    reopened.network.loading = true
    return new Promise(resolve => { settleFirst = resolve }).finally(() => { reopened.network.loading = false })
  })
  const originalRequest = reopened.instance.sendPayment()
  const originalKey = reopened.instance.attempt.attemptKey
  reopened.instance.closeDialog()
  reopened.instance.value = false
  await Vue.nextTick()
  reopened.instance.value = true
  await Vue.nextTick()
  reopened.respond({ ...payment, status: 'succeeded', confirmedAt: '2026-10-28T12:01:00Z' })
  settleFirst({ ...payment, status: 'succeeded', confirmedAt: '2026-10-28T12:01:00Z' })
  await originalRequest
  for (let tick = 0; tick < 8; tick++) { await Promise.resolve(); await Vue.nextTick() }
  assert.strictEqual(reopened.instance.payment && reopened.instance.payment.status, 'succeeded', 'Reopen during request must recover automatically when it settles')
  const reopenCalls = reopened.calls.filter(call => call.name === 'terminalPayments/startPayment')
  assert.strictEqual(reopenCalls.length, 2)
  assert.ok(reopenCalls.every(call => call.payload.attemptKey === originalKey))
  reopened.instance.$destroy()

  const paid = make()
  await paid.instance.onOpen()
  paid.instance.amountCents = 5000
  paid.respond({ ...payment, status: 'succeeded', confirmedAt: '2026-10-28T12:01:00Z' })
  await paid.instance.sendPayment()
  assert.strictEqual(paid.instance.payment.status, 'succeeded')
  assert.strictEqual(readAttempt(global.localStorage, attemptStorageKey(paid.user)), null)
  assert.ok(paid.instance._render(), 'Real Vue template must render the payment outcome')
  await paid.instance.goToHistory()
  assert.ok(paid.calls.some(call => call.route && call.route.path === '/history'))
  paid.instance.$destroy()

  const blocked = make()
  const existing = { id: 10, paymentKind: 'order', status: 'processing', amountCents: 2200, currency: 'eur' }
  blocked.respond({ activePayment: existing })
  await blocked.instance.onOpen()
  assert.strictEqual(blocked.instance.blockingPayment.id, 10, 'Opening the modal must recover an already occupied terminal')
  blocked.respond({ ...existing, status: 'canceled' })
  await blocked.instance.cancelBlockingPayment()
  assert.ok(blocked.calls.some(call => call.name === 'stripeTerminal/cancelPayment' && call.payload === 10))
  assert.strictEqual(blocked.instance.blockingPayment, null)
  blocked.instance.$destroy()

  const rejected = make()
  await rejected.instance.onOpen()
  rejected.instance.amountCents = 5000
  rejected.setError({ code: 'TERMINAL_READER_BUSY', message: 'Terminal occupé.' })
  rejected.respond(() => rejected.calls[rejected.calls.length - 1].name === 'stripeTerminal/getCurrentReader' ? { activePayment: existing } : false)
  await rejected.instance.sendPayment()
  assert.strictEqual(rejected.instance.blockingPayment.id, 10, 'A rejected new payment must expose the older payment blocking its reader')
  rejected.respond({ ...existing, status: 'canceled' })
  await rejected.instance.cancelBlockingPayment()
  assert.strictEqual(rejected.instance.attempt, null)
  assert.strictEqual(readAttempt(global.localStorage, attemptStorageKey(rejected.user)), null)
  assert.strictEqual(rejected.calls.filter(call => call.name === 'terminalPayments/startPayment').length, 1, 'Canceling must never start another collection')
  rejected.instance.$destroy()

  const polling = make()
  polling.instance.value = true
  await Vue.nextTick()
  await polling.instance.onOpen()
  polling.instance.attempt = { attemptKey: '12345678-1234-4123-8123-123456789abc', amountCents: 5000, paymentId: 21 }
  polling.instance.payment = { ...payment }
  let finishPoll
  polling.respond(() => new Promise(resolve => { finishPoll = resolve }))
  const refresh = polling.instance.checkPayment()
  await polling.instance.cancelPayment()
  polling.respond({ ...payment, status: 'canceled' })
  finishPoll({ ...payment })
  await refresh
  for (let tick = 0; tick < 8; tick++) { await Promise.resolve(); await Vue.nextTick() }
  assert.ok(polling.calls.some(call => call.name === 'terminalPayments/cancelPayment'), 'Cancel requested during polling must run as soon as polling finishes')
  assert.strictEqual(polling.instance.payment.status, 'canceled')
  polling.instance.$destroy()

  const alreadyPaid = make()
  alreadyPaid.instance.value = true
  await Vue.nextTick()
  alreadyPaid.instance.attempt = { attemptKey: '12345678-1234-4123-8123-123456789abc', amountCents: 5000, paymentId: 21 }
  alreadyPaid.instance.payment = { ...payment }
  let confirmSuccess
  alreadyPaid.respond(() => new Promise(resolve => { confirmSuccess = resolve }))
  const finalRefresh = alreadyPaid.instance.checkPayment()
  await alreadyPaid.instance.cancelPayment()
  confirmSuccess({ ...payment, status: 'succeeded' })
  await finalRefresh
  assert.strictEqual(alreadyPaid.instance.cancelRequested, false, 'A payment settled during polling must clear its queued cancellation before the next payment')
  assert.strictEqual(alreadyPaid.calls.some(call => call.name === 'terminalPayments/cancelPayment'), false)
  alreadyPaid.instance.$destroy()
  console.log('PASS terminal modal duplicate send, amount lock, uncertain retry, close and success')
}
run().catch(error => { for (const instance of instances) instance.$destroy(); console.error(error); process.exitCode = 1 })
