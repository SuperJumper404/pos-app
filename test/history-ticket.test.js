const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../pages/history/ticket/_id.vue'),
  'utf8'
)

assert.match(source, /async loadReceiptData\(\)/)
assert.match(source, /history\/getAllArchivedOrders/)
assert.match(source, /history\/getDetailArchivedOrder/)
assert.match(source, /this\.generateReceiptPdf\(\)/)
assert.match(source, /if \(!this\.dataArchivedOrder\) return/)
assert.match(source, /if \(!this\.detailArchivedOrder\.length\) return/)
assert.match(source, /safePdfText\(value/)
assert.match(source, /write\(this\.shopInfo\.shop_name/)
assert.match(source, /write\(payload\.table/)
assert.match(source, /receiptHeaderLines/)
assert.match(source, /receiptOrderLines/)
assert.match(source, /payload\.paymentMethod/)
assert.match(source, /receipt_review_qr_url/)
assert.match(source, /addReviewQrCode/)
assert.ok(!source.includes('autoTable('))
const mountedSource = source.slice(
  source.indexOf('mounted()'),
  source.indexOf('methods:')
)
assert.ok(!mountedSource.includes('generateCleanTicketPDF'))

console.log('history ticket tests passed')
