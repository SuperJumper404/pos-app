const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { buildCashierReceiptPayload, sendCashierReceipt } = require('../helpers/cashierReceipt')

const root = path.resolve(__dirname, '..')
const payload = buildCashierReceiptPayload({
  order: { id: 99, ordernumber: '9999', subtotal: 5, payment: 'Carte' },
  details: [{ name: 'Produit', qty: 1, total: 5 }],
  shopInfo: { shop_name: 'Test', activate_tva: false },
})

let smartPrintStarted = false
const pendingPrinterRequest = new Promise(() => {})
const smartPrintResult = sendCashierReceipt({
  payload,
  smartPrint: true,
  printerIp: '192.168.1.20',
  fetchImplementation: () => {
    smartPrintStarted = true
    return pendingPrinterRequest
  },
  dispatch: () => true,
})
assert.strictEqual(smartPrintStarted, true)
assert.strictEqual(
  smartPrintResult,
  true,
  'SmartPrint submission must return without waiting for the printer'
)

let cloudPrintStarted = false
const cloudPrintResult = sendCashierReceipt({
  payload,
  smartPrint: false,
  dispatch: () => {
    cloudPrintStarted = true
    return pendingPrinterRequest
  },
})
assert.strictEqual(cloudPrintStarted, true)
assert.strictEqual(
  cloudPrintResult,
  true,
  'cloud printing submission must return without waiting for the printer'
)

const printingStoreSource = fs.readFileSync(
  path.join(root, 'store', 'printing.js'),
  'utf8'
)
assert.match(
  printingStoreSource,
  /notifications\/success.*Impression envoyée/,
  'cloud printing must notify as soon as the job is submitted'
)
assert.doesNotMatch(
  printingStoreSource,
  /\.then\(|notifications\/error/,
  'cloud printing must not inspect or expose the printer response'
)

const orderSource = fs.readFileSync(
  path.join(root, 'pages', 'orders', 'index.vue'),
  'utf8'
)
const orderPrintSource = orderSource.slice(
  orderSource.indexOf('async printOrderDetails'),
  orderSource.indexOf('soundNotification()', orderSource.indexOf('async printOrderDetails'))
)
const smartOrderPrintSource = orderPrintSource.slice(
  orderPrintSource.indexOf('if (this.shopInfo.smart_print_app)'),
  orderPrintSource.indexOf('} else {', orderPrintSource.indexOf('if (this.shopInfo.smart_print_app)'))
)
assert.doesNotMatch(
  smartOrderPrintSource,
  /await fetch|if \(!response\.ok\)/,
  'order ticket printing must not wait for or expose printer responses'
)
assert.doesNotMatch(
  orderPrintSource,
  /await this\.printReceiptCloud|if \(!printed\)/,
  'cloud order ticket printing must not wait for the printer response'
)

const menuSource = fs.readFileSync(path.join(root, 'pages', 'menus.vue'), 'utf8')
const receiptConfirmationSource = menuSource.slice(
  menuSource.indexOf('async confirmExpressReceipt'),
  menuSource.indexOf('async btnCancel', menuSource.indexOf('async confirmExpressReceipt'))
)
assert.doesNotMatch(
  receiptConfirmationSource,
  /await this\.printExpressReceipt|printError|showAlert\([\s\S]*ticket/,
  'express checkout must continue after pushing the receipt print job'
)

const historySource = fs.readFileSync(
  path.join(root, 'pages', 'history', 'ticket', '_id.vue'),
  'utf8'
)
const historySmartPrintStart = historySource.indexOf('    printReceiptSmartPrint() {')
const historyCloudPrintStart = historySource.indexOf('    printReceiptCloud() {')
const historyPrintMethodsSource = historySource.slice(
  historySmartPrintStart,
  historySource.indexOf('    generateEscPos()', historyCloudPrintStart)
)
assert.doesNotMatch(
  historyPrintMethodsSource,
  /await sendCashierReceipt|notifications\/error|setTimeout/,
  'cashier history printing must not wait for or expose printer responses'
)

console.log('fire-and-forget printing tests passed')
