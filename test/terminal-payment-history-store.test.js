const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'store/history.js'), 'utf8').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
const { state, actions } = vm.compileFunction(`${source}\nreturn { state, actions }`, ['EasyAccess', 'defaultMutations', 'require'])(() => ({}), () => ({}), name => require(name.startsWith('@/') ? path.join(root, name.slice(2)) : name))
assert.strictEqual(typeof actions.getEntries, 'function', 'History needs a common list read')
const payment = { id: 123, paymentKind: 'standalone', readerId: 7, status: 'succeeded', amountCents: 5000,
  currency: 'eur', createdAt: '2026-10-28T12:00:00Z', confirmedAt: '2026-10-28T12:01:00Z',
  failureCode: null, failureMessage: null, cardTicket: null, attachmentsCount: 0 }
const order = { id: 123, entryType: 'order', rowKey: 'order:123', eventAt: '2026-10-28T12:00:00Z', subtotal: '40.00', ordernumber: '123' }
const row = { id: 123, entryType: 'terminal_payment', rowKey: 'terminal-payment:123', eventAt: '2026-10-28T12:01:00Z', subtotal: 50, terminalPayment: payment }
const ok = data => ({ data: { success: true, code: 200, data } })
const make = respond => {
  const current = state()
  const rootState = { users: { user: { id: 4, shopid: 7, token: 'token' } } }
  const calls = []
  const axios = { get: (...args) => { calls.push(args); return respond(...args) } }
  return { current, rootState, calls, call: input => actions.getEntries.call({ $axios: axios },
    { state: current, rootState, dispatch: (name, value) => { current[name.slice(4)] = value } }, input) }
}
const run = async () => {
  global.localStorage = { getItem: () => 'test-token' }
  const h = make(() => Promise.resolve(ok({ items: [row, order], total: 2 })))
  const result = await h.call({ search: 'TPE', page: 2, itemsPerPage: 25, sortBy: 'eventAt', sortDesc: true })
  assert.strictEqual(result.total, 2)
  assert.deepStrictEqual(h.current.entries.map(item => item.rowKey), ['terminal-payment:123', 'order:123'])
  assert.strictEqual(h.calls[0][0], '/baseurl/api/v1/stripe/terminal/history')
  assert.deepStrictEqual(h.calls[0][1].params, { search: 'TPE', page: 2, itemsPerPage: 25, sortBy: 'eventAt', sortDesc: true })
  const malformed = make(() => Promise.resolve(ok({ items: [{ ...row, rowKey: 'order:123' }], total: 1 })))
  assert.strictEqual(await malformed.call(), false, 'Conflicting entry type/key must be rejected')
  const pending = []
  const raced = make(() => new Promise(resolve => pending.push(resolve)))
  const first = raced.call({ search: 'old' })
  const second = raced.call({ search: 'new' })
  pending[1](ok({ items: [row], total: 1 }))
  await second
  pending[0](ok({ items: [order], total: 1 }))
  assert.strictEqual(await first, false)
  assert.strictEqual(raced.current.entries[0].entryType, 'terminal_payment')
  const third = raced.call()
  raced.rootState.users.user = { id: 5, shopid: 7 }
  pending[2](ok({ items: [order], total: 1 }))
  assert.strictEqual(await third, false)
  console.log('PASS common history DTOs, request parameters, row collisions and stale responses')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
