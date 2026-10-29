const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Vue = require('vue')
const file = 'pages/history/terminal-ticket/_id.vue'
assert.ok(fs.existsSync(path.join(__dirname, '..', file)), 'Standalone payments need their own ticket page')
const { component, template } = require('./helpers/vue-component')(file)
const payment = { id: 21, paymentKind: 'standalone', readerId: 7, readerLabel: 'Comptoir', status: 'succeeded', amountCents: 5000,
  currency: 'eur', createdAt: '2026-10-28T12:00:00Z', confirmedAt: '2026-10-28T12:01:00Z',
  failureCode: null, failureMessage: null, cardTicket: { brand: 'visa', last4: '4242' }, attachmentsCount: 0 }
const find = (node, predicate) => node && (predicate(node) ? node : (node.children || []).map(child => find(child, predicate)).find(Boolean))
const text = node => node ? `${node.text || ''} ${(node.children || []).map(text).join(' ')}` : ''
const instances = []
const make = (permissions = ['history']) => {
  const user = Vue.observable({ id: 4, shopid: 7, access: 1, token: 'session', module_permissions: permissions })
  const calls = []
  let result = { payment, attachments: [] }
  let printResult = true
  const instance = new Vue({ ...component, ...template, beforeCreate() {
    this.$route = { params: { id: '21' } }
    this.$store = { get: key => ({ 'users/user': user, 'shop/shop_name': 'Le Comptoir', 'shop/shop_printer_ip': '127.0.0.1' })[key],
      dispatch: (name, payload) => {
        calls.push({ name, payload })
        if (name.startsWith('printing/')) return Promise.resolve(typeof printResult === 'function' ? printResult() : printResult)
        return Promise.resolve(typeof result === 'function' ? result(name) : result)
      } }
  } })
  instances.push(instance)
  return { instance, user, calls, respond: value => { result = value }, printRespond: value => { printResult = value } }
}
const run = async () => {
  const ready = make()
  await ready.instance.loadPayment()
  assert.strictEqual(ready.calls[0].name, 'terminalPayments/getAttachments', 'History users can print shop payments regardless of owner')
  assert.ok(ready.instance.urlPDF.startsWith('blob:'), 'A real PDF preview must be generated')
  assert.strictEqual(ready.instance.ticketPayload.amountCents, 5000)
  assert.strictEqual(ready.instance.ticketPayload.orderId, undefined, 'A payment ticket must not fabricate an order')
  assert.ok(find(ready.instance._render(), node => node.tag === 'iframe'))
  assert.ok(text(ready.instance._render()).includes('50,00'))
  await ready.instance.printTicket()
  const print = ready.calls.find(call => call.name === 'printing/postPrintingJobChecked')
  assert.ok(print, 'Use the existing cloud printer transport')
  assert.strictEqual(print.payload.terminalPaymentId, 21)
  assert.ok(!print.payload.orderId)
  let browserPrints = 0
  ready.instance.$refs.preview = { contentWindow: { focus() {}, print() { browserPrints++ } } }
  ready.instance.previewReady = true
  ready.instance.printBrowser()
  assert.strictEqual(browserPrints, 1)
  assert.ok(!ready.calls.some(call => /orders\/|archiveOrder|startPayment/.test(call.name)))

  const printing = make()
  await printing.instance.loadPayment()
  let rejectPrint
  printing.printRespond(() => new Promise((resolve, reject) => { rejectPrint = reject }))
  const printRequest = printing.instance.printTicket()
  assert.strictEqual(printing.instance.printLoading, true, 'The print action stays busy until the service responds')
  assert.strictEqual(printing.instance.printMessage, '', 'A pending request must not claim it was sent')
  await printing.instance.printTicket()
  assert.strictEqual(printing.calls.filter(call => call.name.startsWith('printing/')).length, 1, 'Prevent duplicate sends while printing is pending')
  rejectPrint(new Error('Service unavailable'))
  await printRequest
  assert.strictEqual(printing.instance.printLoading, false)
  assert.strictEqual(printing.instance.printError, true)
  assert.ok(printing.instance.printMessage.includes('Impossible'))
  printing.printRespond(true)
  await printing.instance.printTicket()
  assert.strictEqual(printing.instance.printError, false, 'A successful retry clears the earlier failure')
  assert.ok(printing.instance.printMessage.includes('envoyée'))

  const owner = make(['cashregister'])
  owner.respond(payment)
  await owner.instance.loadPayment()
  assert.strictEqual(owner.calls[0].name, 'terminalPayments/getPayment', 'A payer reads their ticket without changing the active payment attempt')
  assert.ok(owner.instance.urlPDF)

  const failed = make()
  failed.respond({ payment: { ...payment, status: 'failed' }, attachments: [] })
  await failed.instance.loadPayment()
  assert.strictEqual(failed.instance.urlPDF, '')
  assert.strictEqual(failed.instance.ticketPayload, null)
  assert.ok(text(failed.instance._render()).includes('confirmé'))
  failed.instance.printTicket()
  failed.instance.printBrowser()
  assert.ok(!failed.calls.some(call => call.name === 'printing/postPrintingJob'))
  failed.respond(false)
  await failed.instance.loadPayment()
  assert.strictEqual(failed.instance.payment, null)
  assert.ok(failed.instance.errorMessage)

  const invalid = make()
  invalid.instance.$route.params.id = '1e2'
  await invalid.instance.loadPayment()
  assert.strictEqual(invalid.calls.length, 0, 'Reject malformed ids before any request')
  const pending = make()
  let settle
  pending.respond(() => new Promise(resolve => { settle = resolve }))
  const request = pending.instance.loadPayment()
  pending.user.id = 5
  await Vue.nextTick()
  settle({ payment, attachments: [] })
  await request
  assert.strictEqual(pending.instance.payment, null, 'Late responses cannot expose a previous user payment')
  assert.strictEqual(pending.instance.urlPDF, '')
  for (const { instance } of [ready, printing, owner, failed, invalid, pending]) instance.$destroy()
  console.log('PASS standalone payment PDF, confirmed-only printing, owner/history access and session isolation')
}
run().catch(error => { for (const instance of instances) instance.$destroy(); console.error(error); process.exitCode = 1 })
