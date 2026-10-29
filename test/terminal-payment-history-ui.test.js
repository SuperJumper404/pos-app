const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Vue = require('vue')
const load = require('./helpers/vue-component')
const { component, template } = load('pages/history/index.vue', { TakeawayChip: {}, VatBreakdown: {},
  TerminalPaymentAttachments: {}, formatdate: {}, price: {}, moment: require('moment'), groupCustomizationSelections: () => [] })
const payment = { id: 123, paymentKind: 'standalone', readerId: 7, status: 'succeeded', amountCents: 5000,
  currency: 'eur', createdAt: '2026-10-28T12:00:00Z', confirmedAt: '2026-10-28T12:01:00Z',
  failureCode: null, failureMessage: null, cardTicket: null, attachmentsCount: 0 }
const order = { id: 123, entryType: 'order', rowKey: 'order:123', eventAt: '2026-10-28T12:00:00Z', subtotal: 40, ordernumber: '123' }
const row = { id: 123, entryType: 'terminal_payment', rowKey: 'terminal-payment:123', eventAt: '2026-10-28T12:01:00Z', subtotal: 50, terminalPayment: payment }
const find = (node, predicate) => node && (predicate(node) ? node : (node.children || []).map(child => find(child, predicate)).find(Boolean))
const text = node => Array.isArray(node) ? node.map(text).join(' ') : node ? `${node.text || ''} ${(node.children || []).map(text).join(' ')}` : ''
const entries = [row, order]
const page = new Vue({ ...component, ...template, beforeCreate() {
  this.$store = { get: key => ({ 'users/user': { id: 4, shopid: 7 }, 'history/entries': entries,
    'history/entriesTotal': 2, 'history/entriesOwner': 'standalone-terminal:7:4', staticURL: 'http://localhost:5005' })[key],
  dispatch: () => Promise.resolve(true) }
  this.$route = { query: {} }
  this.$router = { push: () => Promise.resolve() }
  this.$vuetify = { breakpoint: { smAndDown: false } }
} })
assert.ok(Array.isArray(page.historyEntries), 'History page must consume both entry types')
assert.deepStrictEqual(page.historyEntries.map(item => item.rowKey), ['terminal-payment:123', 'order:123'])
const vnode = page._render()
const table = find(vnode, node => node.tag === 'v-data-table')
assert.ok(table)
assert.strictEqual(table.data.attrs['item-key'], 'rowKey')
assert.strictEqual(table.data.attrs['server-items-length'], 2)
const slots = table.data.scopedSlots
assert.ok(text(slots['item.actions']({ item: row })).includes('Commandes (0)'))
assert.strictEqual(find({ children: [].concat(slots['item.actions']({ item: row })) }, node => node.tag === 'v-btn').data.attrs['aria-label'], 'Commandes jointes au paiement TPE 123 (0)')
assert.ok(!text(slots['item.actions']({ item: row })).includes('Ticket'))
assert.ok(text(slots['item.actions']({ item: order })).includes('Ticket'))
assert.ok(text(slots['item.ordernumber']({ item: row })).includes('Paiement TPE'))
assert.ok(!find(vnode, node => node.tag === 'v-tabs'))
assert.strictEqual(typeof page.openFocusedPayment, 'function', 'History link must reach a payment even when its row is off-page')
page.$route.query.payment = '999'
page.tableOptions.sortBy = ['subtotal']
page.openFocusedPayment()
assert.strictEqual(page.attachmentsPaymentId, 999)
assert.strictEqual(page.attachmentsDialog, true)
page.$destroy()

const attachmentFile = 'components/history/TerminalPaymentAttachments.vue'
assert.ok(fs.existsSync(path.resolve(__dirname, '..', attachmentFile)), 'Informational attachment modal must exist')
const { component: attachment, template: attachmentTemplate } = load(attachmentFile)
const run = async () => {
  const calls = []
  const candidate = { archiveId: 5, orderNumber: 'C5', amountCents: 4000, createdAt: '2026-10-28T12:00:00Z', tableName: null, customer: null }
  let attached = []
  const instance = new Vue({ ...attachment, ...attachmentTemplate, beforeCreate() {
    this.$store = { get: key => key === 'users/user' ? { id: 4, shopid: 7 } : null,
      dispatch: (name, payload) => {
        calls.push({ name, payload })
        if (name === 'terminalPayments/searchCandidates') return Promise.resolve({ items: [candidate], total: 1 })
        if (name === 'terminalPayments/addAttachments') attached = [{ archiveId: 5, orderNumber: 'C5', amountCents: 4000, attachedAt: candidate.createdAt, available: true }]
        if (name === 'terminalPayments/removeAttachment') attached = []
        return Promise.resolve({ payment: { ...payment, attachmentsCount: attached.length }, attachments: attached })
      } }
  }, propsData: { value: false, paymentId: 123 } })
  await instance.loadPayment()
  instance.candidates = [candidate]
  const candidateTable = find(instance._render(), node => node.tag === 'v-data-table')
  const selection = candidateTable.data.scopedSlots['item.data-table-select']
  assert.strictEqual(typeof selection, 'function', 'Attachment selection must override the non-keyboard Vuetify simple checkbox')
  let checked = false
  const checkbox = selection({ item: { ...candidate, isSelectable: true }, isSelected: false, select: value => { checked = value } })[0]
  assert.strictEqual(checkbox.tag, 'v-checkbox')
  assert.ok(checkbox.data.attrs['aria-label'].includes('C5'))
  checkbox.data.on.change(true)
  assert.strictEqual(checked, true)
  instance.selectedCandidates = [candidate]
  await instance.addSelected()
  assert.strictEqual(instance.attachments[0].amountCents, 4000, '50 EUR payment accepts a 40 EUR order without matching')
  assert.deepStrictEqual(calls.find(call => call.name === 'terminalPayments/addAttachments').payload, { id: 123, archiveIds: [5] })
  assert.ok(!calls.some(call => /orders\/|archiveOrder|startPayment/.test(call.name)))
  await instance.removeAttachment(instance.attachments[0])
  assert.strictEqual(instance.attachments.length, 0)
  instance.payment = { ...payment, status: 'canceled' }
  const active = { ...candidate, archiveId: null, orderId: 5, orderNumber: 'ACTIVE5', orderStatus: 2 }
  instance.candidates = [candidate, active]
  assert.strictEqual(instance.canModify, true, 'Canceled payments still support informational links')
  assert.deepStrictEqual(instance.candidateRows.map(row => row.sourceKey), ['archive:5', 'order:5'])
  instance.selectedCandidates = [candidate, active]
  await instance.addSelected()
  assert.deepStrictEqual(calls.filter(call => call.name === 'terminalPayments/addAttachments').pop().payload, { id: 123, archiveIds: [5], orderIds: [5] })
  await instance.removeAttachment({ ...active, available: true })
  assert.deepStrictEqual(calls.filter(call => call.name === 'terminalPayments/removeAttachment').pop().payload, { id: 123, orderId: 5 })
  const searches = []
  instance.$store.dispatch = () => new Promise(resolve => searches.push(resolve))
  const firstSearch = instance.loadCandidates()
  const secondSearch = instance.loadCandidates()
  searches[1]({ items: [{ ...candidate, archiveId: 6, orderNumber: 'C6' }], total: 1 })
  await secondSearch
  searches[0]({ items: [candidate], total: 1 })
  await firstSearch
  assert.strictEqual(instance.candidates[0].archiveId, 6, 'A late archive search must not overwrite the latest results')
  assert.ok(instance._render())
  instance.$destroy()
  console.log('PASS same history table, typed row actions, mismatched attachments and late search isolation')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
