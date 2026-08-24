const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const ordersSource = fs.readFileSync(
  path.join(root, 'pages', 'orders', 'index.vue'),
  'utf8'
)

assert.match(
  ordersSource,
  /<v-container fluid class="orders-page/,
  'orders page must use the premium page shell'
)
assert.match(
  ordersSource,
  /class="orders-toolbar"[\s\S]*?class="orders-toolbar__actions"/,
  'orders page must expose a structured toolbar'
)
assert.match(
  ordersSource,
  /class="orders-table"[\s\S]*?class="orders-actions"/,
  'orders data table must use premium table and grouped row actions'
)
assert.match(
  ordersSource,
  /v-if="item\.status === 1"[\s\S]*?color="grey"[\s\S]*?En attente[\s\S]*?v-if="item\.status === 2"[\s\S]*?color="success"[\s\S]*?En préparation[\s\S]*?v-if="item\.status === 3"[\s\S]*?color="primary"[\s\S]*?Terminée[\s\S]*?v-if="item\.status === 4"[\s\S]*?color="warning"[\s\S]*?Annulée/,
  'order status chips must keep the original status colors'
)
assert.match(
  ordersSource,
  /:color="paymentStatusColor\(item\)"[\s\S]*?class="orders-data-chip"/,
  'order payment chips must keep the original chip class'
)
assert.match(
  ordersSource,
  /\.v-chip\.orders-data-chip \{[\s\S]*?border-radius: 12px !important;[\s\S]*?\}/,
  'order payment and status chips must keep the original compact style'
)
assert.doesNotMatch(
  ordersSource,
  /orders-payment-chip|orders-status-chip/,
  'order payment and status chips must not use premium chip classes'
)
assert.match(
  ordersSource,
  /orders-action-btn--approve[\s\S]*?orders-action-btn--details[\s\S]*?orders-action-btn--print[\s\S]*?orders-action-btn--danger/,
  'order row actions must expose semantic button classes'
)
assert.match(
  ordersSource,
  /<v-data-table[\s\S]*?@click:row="openOrderDetail"/,
  'orders table rows must open the detail page on click'
)
assert.match(
  ordersSource,
  /@click\.stop="btnApprove\(item\)"[\s\S]*?@click\.stop="btnFinish\(item\.id\)"[\s\S]*?@click\.stop="openOrderDetail\(item\)"[\s\S]*?@click\.stop="printOrderDetails\(item\)"[\s\S]*?@click\.stop="btnCancel\(item\)"/,
  'orders table row actions must not trigger the row click'
)
assert.match(
  ordersSource,
  /openOrderDetail\(item\)[\s\S]*?\$router\.push\(`orders\/detail\/\$\{item\.id\}`\)/,
  'orders row click handler must route to the order detail page'
)
assert.match(
  ordersSource,
  /class="orders-cockpit"[\s\S]*?v-for="stat in orderStats"/,
  'orders overdrive mode must expose an operational cockpit with live stats'
)
assert.match(
  ordersSource,
  /orderStats\(\)[\s\S]*?activeOrdersCount\(\)[\s\S]*?servicePulseText\(\)/,
  'orders overdrive mode must compute operational service metrics'
)
assert.match(
  ordersSource,
  /class="\['orders-row-signal', orderSignalClass\(item\)\]"[\s\S]*?orderSignalClass\(item\)/,
  'orders overdrive mode must add semantic row signals'
)
assert.match(
  ordersSource,
  /class="orders-table"[\s\S]*?class="orders-lanes"[\s\S]*?v-for="lane in orderLanes"[\s\S]*?'orders-lane-card'/,
  'orders workflow mode must expose status lanes below the table'
)
assert.match(
  ordersSource,
  /orderLanes\(\)[\s\S]*?laneOrders\(lane\)[\s\S]*?isPaymentDue\(order\)/,
  'orders workflow mode must compute lane groups by payment and status'
)
assert.match(
  ordersSource,
  /orders-lane-order__actions[\s\S]*?btnApprove\(order\)[\s\S]*?btnFinish\(order\.id\)[\s\S]*?openOrderDetail\(order\)/,
  'orders workflow cards must keep fast operational actions'
)
assert.match(
  ordersSource,
  /class="orders-lane-order"[\s\S]*?role="button"[\s\S]*?@click="openOrderDetail\(order\)"[\s\S]*?@keydown\.enter="openOrderDetail\(order\)"[\s\S]*?@keydown\.space\.prevent="openOrderDetail\(order\)"/,
  'orders workflow cards must open the detail page on click and keyboard activation'
)
assert.match(
  ordersSource,
  /orders-lane-order__actions[\s\S]*?@click\.stop="btnApprove\(order\)"[\s\S]*?@click\.stop="btnFinish\(order\.id\)"[\s\S]*?@click\.stop="openOrderDetail\(order\)"/,
  'orders workflow card actions must not trigger the card click'
)

console.log('orders page premium tests passed')
