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
const ordersSource = fs.readFileSync(
  path.join(root, 'pages/orders/index.vue'),
  'utf8'
)
const {
  buildOrderTicketPayload,
  buildOrderTicketEscPos,
  buildOrderTicketCloudXml,
  sendOrderTicket,
} = require('../helpers/orderTicket')

assert.match(detailSource, /v-if="canUseStaffOrderActions && canCollectOrder[^"]*"/)
assert.match(detailSource, /@click="openPaymentDialog"/)
assert.match(detailSource, /v-model="paymentDialog"/)
assert.match(detailSource, /v-for="method in paymentMethods"/)
assert.match(detailSource, /submitOrderPayment\(method\.value\)/)
assert.match(detailSource, /@click="openOrderDiscountDialog"/)
assert.match(detailSource, /v-model="orderDiscountDialog"/)
assert.match(detailSource, /applyOrderDiscount/)
assert.match(detailSource, /clearOrderDiscount/)
assert.match(detailSource, /v-model="receiptDialog"/)
assert.match(detailSource, /confirmOrderReceipt\(true\)/)
assert.match(detailSource, /confirmOrderReceipt\(false\)/)
assert.match(detailSource, /orders\/collectOrderPayment/)
assert.doesNotMatch(detailSource, /orders\/archiveOrder/)
assert.match(detailSource, /discountType: this\.archiveDiscountType/)
assert.match(detailSource, /discountValue: this\.archiveDiscountValue/)
assert.match(detailSource, /@click="printOrderTicket"/)
assert.match(detailSource, /canUseStaffOrderActions/)
assert.match(detailSource, /v-if="canUseStaffOrderActions && canApproveOrder[^"]*"/)
assert.match(detailSource, /@click="approveOrder"/)
assert.match(detailSource, /v-if="canUseStaffOrderActions && canFinishOrder[^"]*"/)
assert.match(detailSource, /@click="finishOrder"/)
assert.match(
  detailSource,
  /async updateOrderStatus\(status\)[\s\S]*?!this\.canUseStaffOrderActions/,
  'client order detail must not be able to call staff status updates'
)
assert.match(detailSource, /v-if="canCancelOrder[^"]*"/)
assert.match(detailSource, /@click="openCancelDialog"/)
assert.doesNotMatch(
  detailSource,
  /v-if="canUseStaffOrderActions && canCancelOrder[^"]*"/,
  'client order detail must keep cancellation available outside staff-only actions'
)
assert.match(detailSource, /isQrClientAccess\(this\.userAccess\)/)
assert.match(
  detailSource,
  /printOrderTicket\(\)[\s\S]*?!this\.canUseStaffOrderActions/,
  'client order detail must not be able to print staff order tickets'
)
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
assert.match(detailSource, /v-if="discountAmount > 0"/)
assert.match(detailSource, /subtotalBeforeDiscount/)
assert.match(detailSource, /discountLabel/)
assert.match(detailSource, /formatCurrency\(discountAmount\)/)
assert.match(detailSource, /order-detail-discount/)
assert.match(detailSource, /class="order-detail-action-bar"/)
assert.match(detailSource, /class="order-detail-action order-detail-action--primary/)
assert.match(detailSource, /\.order-detail-action-bar[\s\S]*grid-template-columns/)
assert.match(detailSource, /\.order-detail-action[\s\S]*min-height:\s*72px/)
assert.match(detailSource, /\.order-detail-action-bar[\s\S]*@media[\s\S]*grid-template-columns:\s*repeat\(2/)
assert.match(orderTicketSource, /buildOrderTicketPayload/)
assert.match(orderTicketSource, /sendOrderTicket/)
assert.match(orderTicketSource, /ticketType: 'commande'/)
assert.match(orderTicketSource, /step_name/)
assert.match(orderTicketSource, /saleMode/)
assert.match(orderTicketSource, /doubleHeightOn/)
assert.match(ordersSource, /sendOrderTicket/)
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

let smartPrintRequest
assert.strictEqual(
  sendOrderTicket({
    payload: ticketPayload,
    smartPrint: true,
    printerIp: '192.168.1.20',
    fetchImplementation: (url, options) => {
      smartPrintRequest = { url, options }
      return Promise.resolve({ ok: true })
    },
    dispatch: () => true,
  }),
  true
)
assert.strictEqual(
  JSON.parse(smartPrintRequest.options.body).ticketType,
  'cuisine'
)

const enrichedPayload = buildOrderTicketPayload({
  order: {
    id: 43,
    ordernumber: '0043',
    created: '2026-08-14T10:20:00.000Z',
    is_takeaway: 1,
    payment: 'Carte',
    subtotal: 12,
  },
  details: [
    {
      name: 'Burger',
      qty: 1,
      total: 12,
      customizationList: [
        { step_name: 'Sauces', name: 'Ketchup' },
        { step_name: 'Sauces', name: 'Barbecue' },
      ],
    },
  ],
})
const cloudXml = buildOrderTicketCloudXml(enrichedPayload)
assert.match(cloudXml, /À emporter/)
assert.match(cloudXml, /Sauces : Ketchup/)
assert.match(cloudXml, /Sauces : Barbecue/)
assert.match(
  cloudXml,
  /<text em="true" align="left" width="1" height="2">1x\s{3}Burger/
)
assert.match(
  cloudXml,
  /<text align="left">\s{2}- Sauces : Ketchup/
)
assert.match(
  cloudXml,
  /<text em="true" align="center" width="2" height="2">TOTAL : 12,00 €<\/text>/
)
assert.match(cloudXml, /width="2" height="2"/)
assert(
  cloudXml.indexOf('TOTAL :') < cloudXml.indexOf('À emporter'),
  'Le mode de vente doit être placé sous le total dans le ticket cloud'
)
const escPosText = buildOrderTicketEscPos(enrichedPayload).toString('latin1')
assert(
  escPosText.indexOf('TOTAL :') < escPosText.indexOf('À emporter'),
  'Le mode de vente doit être placé sous le total dans le ticket Smart Print'
)
assert.doesNotMatch(cloudXml, /Date\s*:/)
assert.doesNotMatch(escPosText, /Date\s*:/)
assert.match(cloudXml, /14\/08\/2026/)
assert.match(
  cloudXml,
  /<text em="true" align="center" width="1" height="1">14\/08\/2026/
)
assert.match(
  cloudXml,
  /<text em="true" align="center" width="2" height="2">À emporter<\/text>/
)
assert.match(
  cloudXml,
  /<text em="true" align="center" width="2" height="2">Paiement : Carte<\/text>/
)

console.log('order detail checkout tests passed')
