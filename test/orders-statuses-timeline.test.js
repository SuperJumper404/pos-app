const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../pages/ordersStatuses.vue'),
  'utf8'
)

assert.match(
  source,
  /orderTimeline\(item\)/,
  'orders status cards must render a per-order timeline'
)

assert.match(
  source,
  /orderStepClass\(item,\s*step\)/,
  'timeline steps must expose completed, active, and canceled visual states'
)

;['En attente', 'En préparation', 'Terminée', 'Annulée'].forEach((label) => {
  assert.ok(
    source.includes(label),
    `timeline must include the "${label}" step label`
  )
})

assert.match(
  source,
  /orderStatusProgress\(item\)/,
  'timeline must expose a progress value for each order'
)

assert.match(
  source,
  /statusChipClass\(item\)/,
  'orders status page must style status chips with dedicated classes'
)

assert.doesNotMatch(
  source,
  /:class="statusChipClass\(item\)"/,
  'order card headers must not show a duplicate order status chip'
)

assert.match(
  source,
  /key:\s*'received'[\s\S]*?label:\s*'En attente'[\s\S]*?icon:\s*'mdi-timer-sand'/,
  'waiting timeline step must use the hourglass icon'
)

assert.match(
  source,
  /`order-progress-rail--\$\{statusMeta\(item\)\.key\}`/,
  'progress rail must use the current order status color class'
)

assert.match(
  source,
  /\[`order-step--active-\$\{statusKey\}`\]/,
  'active timeline step must use the current order status color class'
)

assert.match(
  source,
  /\.order-step--active-preparing[\s\S]*?background:\s*#00a85a/,
  'preparing timeline status must render in green'
)

assert.match(
  source,
  /\.order-step-node\s+\.v-icon[\s\S]*?color:\s*inherit\s*!important/,
  'timeline icons must inherit the color of their status node'
)

assert.match(
  source,
  /paymentMeta\(item\)/,
  'orders status page must render payment chips with dedicated labels and icons'
)

assert.match(
  source,
  /payment_status\) \{[\s\S]*?case 'refunded':[\s\S]*?icon: 'mdi-cash-refund'[\s\S]*?className: 'order-chip--refunded'/,
  'refunded payment chip must keep the previous refund icon'
)

assert.match(
  source,
  /\.order-chip--canceled,\s*[\s\S]*?\.order-chip--counter,\s*[\s\S]*?\.order-chip--refunded\s*\{[\s\S]*?background:\s*#ff9f0a/,
  'refunded payment chip must keep the previous orange color'
)

assert.match(
  source,
  /class="order-payment-chip-icon"[\s\S]*?{{ paymentMeta\(item\)\.icon }}/,
  'payment chip icon must have a dedicated spacing class'
)

assert.match(
  source,
  /\.order-payment-chip-icon\s*\{[\s\S]*?margin-right:\s*6px\s*!important/,
  'payment chip icon must have enough spacing from the label'
)

assert.match(
  source,
  /\.order-chip--service\s*\{[\s\S]*?height:\s*28px\s*!important[\s\S]*?padding:\s*0 12px\s*!important/,
  'takeaway chip must have the same comfortable sizing as payment chips'
)

assert.match(
  source,
  /\.order-chip--service\s+::v-deep\s+\.v-icon[\s\S]*?margin-right:\s*6px\s*!important/,
  'takeaway chip icon must have enough spacing from the label'
)

assert.match(
  source,
  /mdi-calendar-clock|mdi-account-circle-outline|mdi-credit-card-outline/,
  'orders status cards must use polished information icons'
)

assert.match(
  source,
  /currentOrdersCount\(\)/,
  'orders status page must expose the number of active orders'
)

assert.match(
  source,
  /commande{{ currentOrdersCount > 1 \? 's' : '' }} en cours/,
  'orders status page must show a single active-orders count'
)

assert.doesNotMatch(
  source,
  /orders-summary-strip|orderSummaryCards|Dernière mise à jour|lastUpdateLabel/,
  'orders status page must not show the old hero refresh or status summary blocks'
)

console.log('orders statuses timeline tests passed')
