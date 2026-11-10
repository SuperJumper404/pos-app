const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const test = require('node:test')
const helpers = require('../helpers/cashReconciliation')
const source = fs.readFileSync(require.resolve('../pages/reports.vue'), 'utf8')
const storeSource = fs.readFileSync(require.resolve('../store/cashClosures.js'), 'utf8')
const componentSource = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*\r?\n/gm, '').replace('export default', 'module.exports =')
const component = vm.runInNewContext(componentSource, {
  module: { exports: {} }, formatdate: {}, price: {}, ...helpers,
  normalizePaymentSummary: require('../helpers/paymentMethods').normalizePaymentSummary,
  cashClosureCanClose: () => true, cashClosureRows: () => [], process: { client: false },
})

test('printing contains only the selected report and always restores the page', () => {
  let printed = false
  let removed = false
  const classes = new Set()
  const roots = []
  const document = {
    createElement: () => ({ children: [], appendChild(child) { this.children.push(child) }, remove() { removed = true } }),
    body: { appendChild: root => roots.push(root), classList: { add: value => classes.add(value), remove: value => classes.delete(value) } },
  }
  const context = { module: { exports: {} }, formatdate: {}, price: {}, ...helpers,
    normalizePaymentSummary: () => [], cashClosureCanClose: () => true, cashClosureRows: () => [],
    process: { client: true }, document,
    window: { print: () => {
      printed = true
      assert.equal(classes.has('reports-printing'), true)
      assert.equal(roots[0].className, 'reports-print-root')
      assert.equal(roots[0].children[0].textContent, 'Ticket Z #42')
      assert.equal(roots[0].children[1].savedCount, 1234)
    } },
  }
  const printable = vm.runInNewContext(componentSource, context)
  const report = { detailTicketType: 'Z', selectedClosureDetail: { closure_number: 42 },
    $refs: { ticketBody: { $el: { cloneNode: () => ({ savedCount: 1234 }) } } } }
  printable.methods.printClosureDetail.call(report)
  assert.equal(printed, true)
  assert.equal(removed, true)
  assert.equal(classes.size, 0)
  removed = false
  context.window.print = () => { throw new Error('print canceled') }
  assert.throws(() => printable.methods.printClosureDetail.call(report), /print canceled/)
  assert.equal(removed, true)
  assert.equal(classes.size, 0)
})

test('X preview opens the current snapshot without closing or modifying the register', () => {
  const context = { currentClosure: { orders_count: 0, total_revenue: 20, standalone_terminal_summary: { count: 1, total: 20 } } }
  component.methods.showCurrentTicket.call(context)
  assert.equal(context.detailTicketType, 'X')
  assert.equal(context.selectedClosureDetail.total_revenue, 20)
  assert.equal(context.closureDetailDialog, true)
})

test('closing sends manual declarations and the displayed period identity', async () => {
  const calls = []
  const context = { closingClosure: false, canCloseClosure: true, declarationCash: '0', declarationCard: '12,34',
    currentClosure: { last_closure_id: 8 }, refreshReports: async () => {},
    $store: { dispatch: (...args) => { calls.push(args); return Promise.resolve(true) } } }
  await component.methods.confirmCloseClosure.call(context)
  assert.equal(calls[0][0], 'cashClosures/closeCurrent')
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { declared_cash_cents: 0, declared_card_cents: 1234, expected_last_closure_id: 8 })
  assert.equal(context.closingClosure, false)
  assert.equal(context.closeClosureDialog, false)
})

test('blank declarations prevent closing and failed submissions preserve counts for correction', async () => {
  const context = { closingClosure: false, canCloseClosure: true, declarationCash: '', declarationCard: '12',
    currentClosure: {}, $store: { dispatch: () => { throw new Error('must not submit') } } }
  await component.methods.confirmCloseClosure.call(context)
  assert.equal(context.declarationSubmitted, true)
  context.declarationCash = '4,50'
  context.closeClosureDialog = true
  context.$store = { dispatch: () => Promise.resolve(false), get: () => 'Erreur de clôture' }
  await component.methods.confirmCloseClosure.call(context)
  assert.equal(context.declarationCash, '4,50')
  assert.equal(context.closeClosureDialog, true)
  assert.equal(context.closingClosure, false)
  assert.equal(context.closingError, 'Erreur de clôture')
})

test('store transmits count payload and a standalone-only period can close', async () => {
  const script = storeSource.replace(/^import .*\r?\n/gm, '').replace(/export const /g, 'const ') +
    '\nmodule.exports = { actions, cashClosureCanClose }'
  const context = { module: { exports: {} }, defaultMutations: () => ({}), EasyAccess: () => ({}),
    localStorage: { getItem: () => 'test-token' } }
  vm.runInNewContext(script, context)
  const store = context.module.exports
  assert.equal(store.cashClosureCanClose({ orders_count: 0, standalone_terminal_summary: { count: 1 } }), true)
  assert.equal(store.cashClosureCanClose({ orders_count: 0 }), false)
  let sent
  const payload = { declared_cash_cents: 0, declared_card_cents: 1234, expected_last_closure_id: null }
  await store.actions.closeCurrent.call({ $axios: { post: (url, body) => { sent = body; return Promise.resolve({ data: { data: {}, message: 'OK' } }) } } },
    { dispatch: () => {} }, payload)
  assert.deepEqual(sent, payload)
})
