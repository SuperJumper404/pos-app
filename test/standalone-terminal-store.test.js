const assert = require('assert')
const fs = require('fs')
const vm = require('vm')
const path = require('path')
const file = path.resolve(__dirname, '../store/terminalPayments.js')
assert.ok(fs.existsSync(file), 'Standalone payments need an isolated store')
const source = fs.readFileSync(file, 'utf8').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
const { state, actions } = vm.compileFunction(`${source}\nreturn { state, actions }`, ['EasyAccess', 'defaultMutations', 'require'])(() => ({}), () => ({}), require)
const payment = { id: 21, paymentKind: 'standalone', readerId: 7, status: 'succeeded', amountCents: 5000,
  currency: 'eur', createdAt: '2026-10-28T12:00:00Z', confirmedAt: '2026-10-28T12:01:00Z',
  failureCode: null, failureMessage: null, cardTicket: null, attachmentsCount: 0 }
const attemptKey = '11111111-1111-4111-8111-111111111111'
const ok = data => ({ data: { success: true, code: 200, data } })
const make = (respond = () => Promise.resolve(ok(payment))) => {
  const current = state()
  const rootState = { users: { user: { id: 4, shopid: 7, token: 'token' } } }
  const calls = []
  const axios = Object.fromEntries(['get', 'post', 'delete'].map(method => [method, (...args) => {
    calls.push({ method, args }); return respond(method, args)
  }]))
  const dispatch = (name, value) => { current[name.slice(4)] = value }
  return { current, rootState, calls, call: (name, input) => actions[name].call({ $axios: axios }, { state: current, rootState, dispatch }, input) }
}
const run = async () => {
  global.localStorage = { getItem: () => 'test-token' }
  const h = make()
  assert.deepStrictEqual(await h.call('startPayment', { amountCents: 5000, attemptKey, orderIds: [1], readerId: 999 }), payment)
  assert.deepStrictEqual(h.calls[0].args[1], { amountCents: 5000, attemptKey })
  assert.strictEqual(h.calls[0].args[0], '/baseurl/api/v1/stripe/terminal/standalone-payments')
  assert.strictEqual(h.calls[0].args[2].headers.Authorization, 'Bearer test-token')
  assert.strictEqual(h.calls[0].args[2].skipGlobalErrorNotification, true)
  assert.deepStrictEqual(h.current.activePayment, payment)
  assert.strictEqual(h.current.loading, false)
  const invalid = make()
  assert.strictEqual(await invalid.call('startPayment', { amountCents: 49, attemptKey }), false)
  assert.strictEqual(invalid.calls.length, 0)
  assert.strictEqual(await make(() => Promise.resolve(ok({ ...payment, paymentKind: 'order' }))).call('refreshPayment', 21), false)
  assert.strictEqual(await make(() => Promise.resolve(ok({ ...payment, id: 22 }))).call('refreshPayment', 21), false)

  const failed = make(() => Promise.reject(new Error('raw-secret')))
  failed.current.activePayment = payment
  assert.strictEqual(await failed.call('refreshPayment', 21), false)
  assert.deepStrictEqual(failed.current.activePayment, payment, 'Uncertain request cannot clear an existing payment')
  assert.ok(!failed.current.error.message.includes('raw-secret'))
  let settle
  const late = make(() => new Promise(resolve => { settle = resolve }))
  const response = late.call('startPayment', { amountCents: 5000, attemptKey })
  await late.call('resetSession')
  settle(ok(payment))
  assert.strictEqual(await response, false)
  assert.strictEqual(late.current.activePayment, null)
  const switched = make(() => new Promise(resolve => { settle = resolve }))
  const previous = switched.call('refreshPayment', 21)
  switched.rootState.users.user = { id: 5, shopid: 7 }
  settle(ok(payment))
  assert.strictEqual(await previous, false)
  assert.strictEqual(switched.current.activePayment, null)

  const attachment = { archiveId: 123, orderNumber: 'C123', amountCents: 4000, attachedAt: '2026-10-28T12:05:00Z', available: true }
  const info = { payment: { ...payment, attachmentsCount: 1 }, attachments: [attachment] }
  const docs = make(() => Promise.resolve(ok(info)))
  assert.deepStrictEqual(await docs.call('addAttachments', { id: 21, archiveIds: [123] }), info)
  assert.strictEqual(docs.current.activePayment, null, 'Joining orders must not replace a cashier payment attempt')
  assert.deepStrictEqual(docs.calls[0].args[1], { archiveIds: [123] })
  assert.strictEqual(await docs.call('addAttachments', { id: 21, archiveIds: [123, 123] }), false)
  assert.strictEqual(docs.calls.length, 1)
  const activeAttachment = { ...attachment, archiveId: null, orderId: 123 }
  const canceledInfo = { payment: { ...payment, status: 'canceled' }, attachments: [attachment, activeAttachment] }
  const activeDocs = make(() => Promise.resolve(ok(canceledInfo)))
  assert.deepStrictEqual(await activeDocs.call('addAttachments', { id: 21, archiveIds: [123], orderIds: [123] }), canceledInfo)
  assert.deepStrictEqual(activeDocs.calls[0].args[1], { archiveIds: [123], orderIds: [123] })
  await activeDocs.call('removeAttachment', { id: 21, orderId: 123 })
  assert.strictEqual(activeDocs.calls[1].args[0], '/baseurl/api/v1/stripe/terminal/standalone-payments/21/attachments/orders/123')
  console.log('PASS standalone store payloads, isolated state, uncertain requests and session races')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
