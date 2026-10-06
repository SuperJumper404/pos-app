const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const {
  isCashPaymentMethod,
  sendCashDrawerOpen,
} = require('../helpers/cashDrawer')

assert.strictEqual(isCashPaymentMethod('Espèces'), true)
assert.strictEqual(isCashPaymentMethod('espece'), true)
assert.strictEqual(isCashPaymentMethod('Cash'), true)
assert.strictEqual(isCashPaymentMethod('Carte bancaire'), false)

const calls = []
const result = sendCashDrawerOpen({
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: (url, options) => {
    calls.push({ url, options })
    return Promise.resolve({ ok: true })
  },
})

assert.strictEqual(result, true)
assert.strictEqual(calls.length, 1)
assert.strictEqual(calls[0].url, 'http://192.168.1.20:8989/cash-drawer/open')
assert.strictEqual(calls[0].options.method, 'POST')
assert.strictEqual(
  JSON.parse(calls[0].options.body).action,
  'open_cash_drawer'
)

assert.strictEqual(
  sendCashDrawerOpen({
    smartPrint: false,
    printerIp: '192.168.1.20',
    fetchImplementation: () => {
      throw new Error('must not call fetch')
    },
  }),
  false
)

assert.throws(
  () => sendCashDrawerOpen({ smartPrint: true, printerIp: '' }),
  /Adresse SmartEat Printing App manquante/
)

const cashRegisterSource = fs.readFileSync(
  path.join(root, 'pages', 'cashregister', 'index.vue'),
  'utf8'
)
assert.match(cashRegisterSource, /cashregister-hero__actions/)
assert.match(cashRegisterSource, /cashregister-drawer-open/)
assert.match(cashRegisterSource, /Ouvrir tiroir/)
assert.match(cashRegisterSource, /openCashDrawer\(\)/)
assert.match(cashRegisterSource, /sendCashDrawerOpen/)

const payoutSource = fs.readFileSync(
  path.join(root, 'pages', 'cashregister', 'payout', '_id.vue'),
  'utf8'
)
assert.match(payoutSource, /isCashPaymentMethod/)
assert.match(payoutSource, /openCashDrawerForCashPayment\(paymentMethod\)/)
assert.match(
  payoutSource,
  /archiveSummary\.allSucceeded[\s\S]*openCashDrawerForCashPayment\(paymentMethod\)/
)

console.log('cash drawer tests passed')
