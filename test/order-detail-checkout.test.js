const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const detailSource = fs.readFileSync(
  path.join(root, 'pages/orders/detail/_id.vue'),
  'utf8'
)
const packageSource = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const orderTicketPath = path.join(root, 'helpers/orderTicket.js')
const orderTicketSource = fs.existsSync(orderTicketPath)
  ? fs.readFileSync(orderTicketPath, 'utf8')
  : ''
const { buildOrderTicketPayload, sendOrderTicket } = require('../helpers/orderTicket')

assert.match(detailSource, /v-if="canCollectOrder[^"]*"/)
assert.match(detailSource, /@click="openPaymentDialog"/)
assert.match(detailSource, /v-model="paymentDialog"/)
assert.match(detailSource, /v-for="method in paymentMethods"/)
assert.match(detailSource, /submitOrderPayment\(method\.value\)/)
assert.match(detailSource, /v-model="receiptDialog"/)
assert.match(detailSource, /confirmOrderReceipt\(true\)/)
assert.match(detailSource, /confirmOrderReceipt\(false\)/)
assert.match(detailSource, /orders\/archiveOrder/)
assert.match(detailSource, /@click="printOrderTicket"/)
assert.match(detailSource, /v-if="canApproveOrder[^"]*"/)
assert.match(detailSource, /@click="approveOrder"/)
assert.match(detailSource, /v-if="canFinishOrder[^"]*"/)
assert.match(detailSource, /@click="finishOrder"/)
assert.match(detailSource, /v-if="canCancelOrder[^"]*"/)
assert.match(detailSource, /@click="openCancelDialog"/)
assert.match(detailSource, /v-model="cancelOrderDialog"/)
assert.match(detailSource, /confirmCancelOrder/)
assert.match(detailSource, /orders\/updateOrder/)
assert.match(detailSource, /orders\/refundStripeOrder/)
assert.match(detailSource, /<span class="order-detail-header__label">Table<\/span>/)
assert.match(detailSource, /{{ orderTableLabel }}/)
assert.match(detailSource, /<span class="order-detail-header__label">Statut<\/span>/)
assert.match(detailSource, /{{ orderStatusText }}/)
assert.match(detailSource, /:color="orderStatusColor"/)
assert.match(detailSource, /service_point_name/)
assert.match(detailSource, /class="order-detail-action-bar"/)
assert.match(detailSource, /class="order-detail-action order-detail-action--primary/)
assert.match(detailSource, /\.order-detail-action-bar[\s\S]*grid-template-columns/)
assert.match(detailSource, /\.order-detail-action[\s\S]*min-height:\s*72px/)
assert.match(detailSource, /\.order-detail-action-bar[\s\S]*@media[\s\S]*grid-template-columns:\s*repeat\(2/)
assert.match(orderTicketSource, /buildOrderTicketPayload/)
assert.match(orderTicketSource, /sendOrderTicket/)
assert.match(orderTicketSource, /ticketType: 'commande'/)
assert.match(packageSource.scripts.test, /test\/order-detail-checkout\.test\.js/)

const ticketPayload = buildOrderTicketPayload({
  order: { id: 42, service_point_name: 'Table 4' },
  details: [{ name: 'Salade', qty: 1 }],
})
assert.strictEqual(ticketPayload.table, 'Table 4')
const printCalls = []
assert.strictEqual(
  sendOrderTicket({
    payload: ticketPayload,
    smartPrint: false,
    dispatch: (action, params) => printCalls.push({ action, params }),
  }),
  true
)
assert.strictEqual(printCalls[0].params.ticketType, 'commande')

console.log('order detail checkout tests passed')
