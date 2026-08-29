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
assert.match(source, /history-ticket-cockpit/)
assert.match(source, /history-ticket-kpis/)
assert.match(source, /receiptSummaryCards\(\)/)
assert.match(source, /printReadinessText\(\)/)
assert.match(source, /printFeedbackText\(\)/)
assert.match(source, /triggerReceiptPrint\(\)/)
assert.match(source, /downloadReceiptPdf\(\)/)
assert.match(source, /receiptPdfFilename\(\)/)
assert.match(source, /mdi-download/)
assert.match(source, /Télécharger PDF/)
assert.match(source, /download = this\.receiptPdfFilename/)
assert.match(source, /prefers-reduced-motion/)
assert.match(
  source,
  /\.history-ticket-header__main\s*{[^}]*align-items: flex-start;/s
)
assert.match(source, /\.history-ticket-kpi\s*{[^}]*align-items: flex-start;/s)
assert.match(source, /\.history-ticket-header__icon\s*{[^}]*margin-top: 24px;/s)
assert.ok(
  !/\.history-ticket-kpi__icon\s*{[^}]*margin-top:/s.test(source),
  'KPI icons should align to the top of their text without vertical offset'
)
assert.match(source, /class="history-ticket-kpi__content"/)
assert.ok(
  !/\.history-ticket-kpi\s+span\s*{/.test(source),
  'KPI text styles must not override the icon container span'
)
assert.match(source, /label: 'Remise'[\s\S]*icon: 'mdi-percent-outline'/)
assert.ok(
  !/label: 'Remise'[\s\S]*icon: 'mdi-tag-percent-outline'/.test(source),
  'History ticket discount KPI must use an icon available in this MDI set'
)
const mountedSource = source.slice(
  source.indexOf('mounted()'),
  source.indexOf('methods:')
)
assert.ok(!mountedSource.includes('generateCleanTicketPDF'))
