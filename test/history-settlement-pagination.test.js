const assert = require('assert')
const Vue = require('vue')
const { validHistoryPage } = require('../helpers/history')
const load = require('./helpers/vue-component')

const eventAt = '2026-11-12T10:00:00Z'
const order = { id: 123, entryType: 'order', rowKey: 'order:123', eventAt, subtotal: '40.00', ordernumber: 'C123' }
const payment = { id: 123, paymentKind: 'standalone', readerId: 7, status: 'succeeded', amountCents: 5000,
  currency: 'eur', createdAt: eventAt, confirmedAt: eventAt,
  failureCode: null, failureMessage: null, cardTicket: null, attachmentsCount: 0 }
const terminal = { id: 123, entryType: 'terminal_payment', rowKey: 'terminal-payment:123', eventAt, subtotal: 50, terminalPayment: payment }
const child = { id: 31, ordernumber: 'C31', subtotal: '12.00', cash_register_settlement_id: 123 }
const settlement = { id: 123, entryType: 'settlement', rowKey: 'settlement:123', eventAt, isSettlement: true,
  cash_register_settlement_id: 123, historyLabel: 'Encaissement table 12', archivedOrders: [child],
  subtotal: 12, payment_status: 'paid', status: 3, username: '12', payment: 'Carte', used_payment_method: 'Carte' }
const entries = [terminal, settlement, order]

assert.strictEqual(validHistoryPage({ items: entries, total: 28 }), true,
  'One server page must accept settlement, TPE and archive rows with the same numeric ID')
const invalidSettlements = [
  { id: '123' }, { id: 0 }, { rowKey: 'order:123' }, { eventAt: 'invalid' },
  { cash_register_settlement_id: 124 }, { isSettlement: false }, { historyLabel: null },
  { subtotal: '12.00' }, { subtotal: NaN }, { subtotal: -1 }, { payment_status: 'unpaid' },
  { archivedOrders: null }, { archivedOrders: [] }, { archivedOrders: [null] },
  { archivedOrders: [{ ...child, id: '31' }] }, { archivedOrders: [{ ...child, id: 0 }] },
  { archivedOrders: [{ ...child, cash_register_settlement_id: 124 }] },
  { archivedOrders: [{ ...child, subtotal: 'invalid' }] },
  { archivedOrders: [{ ...child, subtotal: null }] },
  { archivedOrders: [child, child] },
]
for (const invalid of invalidSettlements) {
  assert.strictEqual(validHistoryPage({ items: [{ ...settlement, ...invalid }], total: 1 }), false,
    `Malformed settlement must be rejected: ${JSON.stringify(invalid)}`)
}
assert.strictEqual(validHistoryPage({ items: [settlement, settlement], total: 2 }), false)
assert.strictEqual(validHistoryPage({ items: [{ ...order, entryType: 'unknown' }], total: 1 }), false)

const { component, template } = load('pages/history/index.vue', { TakeawayChip: {}, VatBreakdown: {},
  TerminalPaymentAttachments: {}, formatdate: {}, price: {}, moment: require('moment'), groupCustomizationSelections: () => [] })
const find = (node, predicate) => node && (predicate(node) ? node : (node.children || []).map(childNode => find(childNode, predicate)).find(Boolean))
const calls = []
const routes = []
const page = new Vue({ ...component, ...template, beforeCreate() {
  this.$store = { get: key => ({ 'users/user': { id: 4, shopid: 7 }, 'history/entries': entries,
    'history/entriesTotal': 28, 'history/entriesOwner': 'standalone-terminal:7:4', staticURL: 'http://localhost:5005' })[key],
  dispatch: (name, payload) => { calls.push([name, payload]); return Promise.resolve(name === 'history/getEntries' ? { items: entries, total: 28 } : []) } }
  this.$route = { query: {} }
  this.$router = { push: path => { routes.push(path); return Promise.resolve() } }
  this.$vuetify = { breakpoint: { smAndDown: false } }
} })

const run = async () => {
  assert.deepStrictEqual(page.historyEntries.map(item => item.rowKey), entries.map(item => item.rowKey))
  const table = find(page._render(), node => node.tag === 'v-data-table')
  assert.strictEqual(table.data.attrs['item-key'], 'rowKey')
  assert.strictEqual(table.data.attrs['server-items-length'], 28)
  const slots = table.data.scopedSlots
  const expansion = { children: [].concat(slots['item.data-table-expand']({ item: settlement, expand: () => {}, isExpanded: false })) }
  const expandButton = find(expansion, node => node.tag === 'v-btn')
  assert.ok(expandButton, 'A settlement must expose the archive links expansion')
  let expanded = false
  page.expandOrder(settlement, value => { expanded = value }, false)
  assert.strictEqual(expanded, true)
  await page.loadOrderDetails(settlement)
  assert.strictEqual(calls.length, 0, 'A settlement ID must never be fetched as an archive ID')
  const expandedRow = { children: [].concat(slots['expanded-item']({ item: settlement })) }
  const archiveLink = find(expandedRow, node => node.tag === 'v-btn' && node.data.attrs.to === '/history/ticket/31')
  assert.ok(archiveLink, 'Settlement expansion links to original archive tickets')
  const action = find({ children: [].concat(slots['item.actions']({ item: settlement })) }, node => node.tag === 'v-btn')
  action.data.on.click()
  assert.deepStrictEqual(routes, ['/history/settlement/123'])
  assert.strictEqual(calls.length, 0)
  page.showInvoice(order)
  assert.strictEqual(routes.at(-1), '/history/ticket/123')
  assert.deepStrictEqual(calls.pop(), ['history/getDetailArchivedOrder', 123])
  page.expanded = [settlement]
  page.tableOptions.page = 2
  await page.loadEntries()
  assert.strictEqual(page.expanded[0].rowKey, 'settlement:123', 'Settlement expansion survives a refresh')
  assert.strictEqual(calls.at(-1)[0], 'history/getEntries')
  assert.strictEqual(calls.at(-1)[1].page, 2)
  assert.strictEqual(calls.length, 1, 'Server results must not trigger archive preloads or client grouping')
  page.$destroy()
  console.log('PASS mixed paginated settlement validation, collision identity, expansion and ticket routes')
}
run().catch(error => { page.$destroy(); console.error(error); process.exitCode = 1 })
