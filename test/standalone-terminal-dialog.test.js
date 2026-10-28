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
  const store = { get: key => ({ 'users/user': user, 'terminalPayments/loading': network.loading })[key],
    dispatch: (name, payload) => { calls.push({ name, payload }); return Promise.resolve(typeof response === 'function' ? response() : response) } }
  const instance = new Vue({ ...component, ...template, beforeCreate() {
    this.$store = store
    this.$router = { push: route => { calls.push({ route }); return Promise.resolve() } }
  }, propsData: { value: false,
    reader: { id: 7, label: 'S710', status: 'online', isActive: true, assignedUserId: 4 } } })
  instances.push(instance)
  return { instance, user, calls, values, network, respond: value => { response = value } }
}
const run = async () => {
  const keyboard = make()
  keyboard.instance.value = true
  await Vue.nextTick()
  keyboard.instance.amountCents = 5000
  let prevented = false
  keyboard.instance.handleKey({ key: 'Enter', target: { tagName: 'BUTTON' }, preventDefault() { prevented = true } })
  assert.strictEqual(keyboard.calls.length, 0, 'Enter on a focused close/clear/digit button must never send payment')
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
  console.log('PASS terminal modal duplicate send, amount lock, uncertain retry, close and success')
}
run().catch(error => { for (const instance of instances) instance.$destroy(); console.error(error); process.exitCode = 1 })
