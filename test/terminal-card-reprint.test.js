const assert = require('assert/strict')
const test = require('node:test')
const { buildCardTicketPayload, buildCardTicketData, sendCardTicket } = require('../helpers/cardTicket')

const payload = buildCardTicketPayload({ payment: {
  id: 81, amountCents: 1200, cardTicket: { brand: 'visa', last4: '4242', funding: 'debit' },
} })

const pdfLines = async url => {
  const buffer = Buffer.from(await (await fetch(url)).arrayBuffer())
  return [...buffer.toString('latin1').matchAll(/\(([^\r\n]*)\) Tj/g)]
    .map(match => match[1].replace(/\\([\\()])/g, '$1'))
}

test('standalone PDF contains only the seven payment fields and acceptance', async () => {
  const Vue = require('vue')
  const { component } = require('./helpers/vue-component')('pages/history/terminal-ticket/_id.vue')
  const values = { 'shop/shop_name': 'Le Comptoir' }
  const instance = new Vue({ ...component, beforeCreate() { this.$store = { get: key => values[key] } } })
  try {
    instance.payment = { id: 50, status: 'succeeded', amountCents: 800, confirmedAt: '2026-11-01 12:42:00',
      cardTicket: { brand: 'mastercard', last4: '9695', funding: 'debit', network: 'mastercard',
        readMethod: 'contactless_emv', authorizationCode: '754615', accountType: 'checking' } }
    instance.generatePdf()
    assert.deepEqual(await pdfLines(instance.urlPDF), [
      'Terminal : TPE', 'Référence : 50', 'Date : 01/11/2026 a 12:42', 'Carte : MASTERCARD',
      'Type : Débit', 'PAN : ************9695', 'Montant : 8,00 EUR', 'Paiement accepté',
    ])
  } finally { if (instance.urlPDF) URL.revokeObjectURL(instance.urlPDF); instance.$destroy() }
})

test('standalone card tickets use the cashier printer route in SmartEat and cloud', async () => {
  for (const checked of [false, true]) {
    let body
    await sendCardTicket({ payload, checked, smartPrint: true, printerIp: '127.0.0.1',
      fetchImplementation: (url, options) => { body = JSON.parse(options.body); return Promise.resolve({ ok: true }) } })
    assert.equal(body.ticketType, 'caisse')
    assert.equal(body.ticketData.kind, 'card_ticket')
    assert.match(Buffer.from(body.dataFormatESCPOS, 'base64').toString('latin1'), /PAN : \*{12}4242/)
    let job
    await sendCardTicket({ payload, checked, dispatch: (name, value) => { job = value; return true } })
    assert.equal(job.ticketType, 'caisse')
    assert.equal(job.terminalPaymentId, 81)
    assert.match(job.requete, /Carte : VISA/)
  }
})

test('all card renderers include card type and a masked PAN without exposing a full number', () => {
  const text = JSON.stringify(buildCardTicketData(payload))
  assert.match(text, /Carte : VISA/)
  assert.match(text, /Type : Débit/)
  assert.match(text, /PAN : \*{12}4242/)
  const invalid = buildCardTicketPayload({ payment: { cardTicket: { last4: '4242424242424242' } } })
  assert.equal(invalid.last4, null)
  assert.doesNotMatch(JSON.stringify(buildCardTicketData(invalid)), /4242424242424242/)
})

test('archived order reprints recover card data while retaining the amount allocated to the order', async () => {
  const fs = require('fs')
  const path = require('path')
  const vm = require('vm')
  const Vue = require('vue')
  const compiler = require('vue-template-compiler')
  const script = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../pages/history/ticket/_id.vue'), 'utf8')).script.content
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"]/g, '').replace('export default', 'return')
  const priceFile = path.join(__dirname, '../helpers/price.js')
  const price = vm.compileFunction(fs.readFileSync(priceFile, 'utf8').replace(/^export.*$/gm, '') + '\nreturn price', ['require'])(require('module').createRequire(priceFile))
  const bindings = { TakeawayChip: {}, price, moment: require('moment'),
    JSPDF: require('jspdf').jsPDF, QRCode: null,
    ...require('../helpers/cashierReceipt'), ...require('../helpers/cardTicket'), ...require('../helpers/receiptBundle') }
  const component = vm.compileFunction(script, Object.keys(bindings))(...Object.values(bindings))
  const order = { id: 42, ordernumber: 'A42', created: '2026-10-28T12:00:00Z', subtotal: 12,
    payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 81, stripe_terminal_amount_cents: 1200 }
  const values = { 'history/dataArchivedOrders': [order], 'history/detailArchivedOrder': [{ name: 'Menu', qty: 1, total: 12 }],
    'shop/shop_name': 'Le Comptoir' }
  const calls = []
  const instance = new Vue({ ...component, beforeCreate() {
    this.$route = { params: { id: '42' } }
    this.$store = { get: key => values[key], dispatch: (name, params) => {
      calls.push({ name, params })
      return name === 'terminalPayments/getCardTicket'
        ? { terminalPaymentId: 81, amountCents: 3000, brand: 'visa', last4: '4242', funding: 'debit' } : true
    } }
  } })
  try {
    await instance.loadReceiptData()
    assert.ok(instance.urlPDF.startsWith('blob:'))
    assert.equal(instance.cardTicketPayload.brand, 'VISA')
    assert.equal(instance.cardTicketPayload.amountCents, 1200)
    const lines = await pdfLines(instance.urlPDF)
    assert.ok(lines.includes('Le Comptoir'), 'the cashier receipt still contains the shop header')
    assert.ok(lines.some(line => line.includes('Menu')), 'the cashier receipt still contains its products')
    assert.doesNotMatch(lines.join('\n'), /Ticket carte|Lecture :|Reseau :|Autorisation :/)
    const start = lines.findIndex(line => line.startsWith('Terminal :'))
    assert.ok(start >= 0)
    assert.deepEqual(lines.slice(start).filter(line => !/^-+$/.test(line)).map(line => line.split(' : ')[0]),
      ['Terminal', 'Référence', 'Date', 'Carte', 'Type', 'PAN', 'Montant', 'Paiement accepté'])
    instance.printReceiptCloud()
    const job = calls.find(call => call.name === 'printing/postPrintingJob').params
    assert.equal(job.ticketType, 'caisse')
    assert.match(job.requete, /PAN : \*{12}4242/)
    assert.match(job.requete, /Type : Débit/)
  } finally { if (instance.urlPDF) URL.revokeObjectURL(instance.urlPDF); instance.$destroy() }
})
