const assert = require('assert')
const fs = require('fs')

const {
  canEditOrder,
  canStartComplementaryOrder,
  editableOrderToCart,
  cartToOrderEditPayload,
  isOrderEditDirty,
} = require('../helpers/orderEdit')

const product = {
  id: 10,
  name: 'Menu',
  image: 'menu.webp',
  price: 8,
  customization_steps: [
    {
      product_step_id: 20,
      name: 'Boisson',
      choices: [
        {
          product_step_choice_id: 30,
          choice_name: 'Cola',
          extra_price: 1.5,
        },
      ],
    },
  ],
}

const editable = {
  order: {
    id: 42,
    ordernumber: '0042',
    subtotal: '19.00',
    status: 1,
    payment_status: 'unpaid',
    payment_provider: 'cash',
  },
  content_revision: 'revision-1',
  items: [
    {
      product_id: 10,
      quantity: 2,
      unit_price: 9.5,
      total: 19,
      selections: [
        { product_customization_step_choice_id: 30 },
      ],
      historical_customizations: [
        {
          product_customization_step_id: 20,
          product_customization_step_choice_id: 30,
          step_name: 'Boisson',
          choice_name: 'Cola',
          unit_extra_price: 1.5,
          choice_type: 'linked_product',
          linked_product_id: 11,
        },
      ],
      requires_reconfiguration: false,
    },
  ],
}

assert.strictEqual(canEditOrder(editable.order), true)
assert.strictEqual(
  canEditOrder({ ...editable.order, payment_status: 'requires_payment' }),
  true
)
assert.strictEqual(canEditOrder({ ...editable.order, status: 2 }), false)
assert.strictEqual(
  canEditOrder({ ...editable.order, payment_status: 'paid' }),
  false
)
assert.strictEqual(
  canStartComplementaryOrder({
    payment_provider: 'stripe',
    payment_status: 'paid',
  }),
  true
)
assert.strictEqual(canStartComplementaryOrder(editable.order), false)

const cart = editableOrderToCart(editable, [product])
assert.strictEqual(cart[0].id, 10)
assert.strictEqual(cart[0].qty, 2)
assert.deepStrictEqual(cart[0].selectedChoiceIds, [30])
assert.deepStrictEqual(cart[0].selections, [
  {
    product_step_id: 20,
    product_step_choice_id: 30,
    step_name: 'Boisson',
    choice_name: 'Cola',
    extra_price: 1.5,
    choice_type: undefined,
    linked_product_id: null,
  },
])
assert.strictEqual(cart[0].configurationSignature, '10:30')

assert.deepStrictEqual(
  cartToOrderEditPayload({
    contentRevision: 'revision-1',
    expectedTotal: 19,
    cart,
  }),
  {
    content_revision: 'revision-1',
    expected_total: 19,
    items: [
      {
        product_id: 10,
        quantity: 2,
        selected_product_step_choice_ids: [30],
      },
    ],
  }
)
assert.strictEqual(isOrderEditDirty(cart, cart), false)
assert.strictEqual(isOrderEditDirty(cart, [{ ...cart[0], qty: 3 }]), true)

const storeSource = fs.readFileSync(
  require.resolve('../store/orderEdit.js'),
  'utf8'
)
for (const action of ['begin', 'save', 'cancel', 'retryPayment']) {
  assert.ok(storeSource.includes(`${action}(`), `missing ${action} action`)
}
assert.ok(
  storeSource.includes('/baseurl/api/v1/orders/$' + '{orderId}/edit'),
  'beginning an edit must load the editable order'
)
assert.ok(
  storeSource.includes('/baseurl/api/v1/orders/$' + '{state.orderId}/items'),
  'saving an edit must patch the order items endpoint'
)
assert.ok(
  storeSource.includes(
    '/baseurl/api/v1/stripe/orders/$' + '{orderId}/replacement-payment'
  ),
  'retrying payment must use the replacement payment endpoint'
)
assert.ok(
  storeSource.includes("dispatch('set/active', false)"),
  'cancelling or completing must clear the active edit session'
)
assert.ok(
  storeSource.includes("dispatch('set/orderId', Number(order.id))"),
  'the active session must retain the API order id'
)
assert.ok(
  storeSource.includes("dispatch('set/orderNumber', String(order.ordernumber))"),
  'the active session must retain the API order number'
)
assert.ok(
  storeSource.includes("dispatch('cart/setTotal', Number(order.subtotal), { root: true })"),
  'the active session must use the API order subtotal'
)

const usersSource = fs.readFileSync(require.resolve('../store/users.js'), 'utf8')
const axiosSource = fs.readFileSync(require.resolve('../plugins/axios.js'), 'utf8')
assert.ok(usersSource.includes("orderEdit/cancel"))
assert.ok(axiosSource.includes("orderEdit/cancel"))

const detailSource = fs.readFileSync(
  require.resolve('../pages/orders/detail/_id.vue'),
  'utf8'
)
assert.ok(
  detailSource.includes('Modifier la commande'),
  'an unpaid editable order must expose the edit action'
)
assert.ok(
  detailSource.includes('@click="requestComplementaryOrder"'),
  'a paid Stripe order must expose the complementary-order action'
)
assert.ok(
  detailSource.includes('v-if="canEditOrder && !loadPage"'),
  'the edit action must keep the helper eligibility guard'
)
assert.ok(
  detailSource.includes('v-if="canStartComplementaryOrder && !loadPage"'),
  'the complementary action must keep the Stripe paid eligibility guard'
)
assert.ok(
  detailSource.includes('requestOrderEdit('),
  'the edit action must request a guarded start'
)
assert.ok(
  detailSource.includes('requestComplementaryOrder('),
  'the complementary action must request a guarded start'
)
assert.ok(
  detailSource.includes('startOrderEdit('),
  'the edit flow must start the edit session after confirmation'
)
assert.ok(
  detailSource.includes('startComplementaryOrder('),
  'the complementary flow must start a normal checkout after confirmation'
)
assert.ok(
  detailSource.includes('replaceCartDialog'),
  'replacing a non-empty local cart must require confirmation'
)
assert.ok(
  detailSource.includes("orderEdit/begin"),
  'starting an edit must hydrate the edit session through its store action'
)
assert.ok(
  detailSource.includes("orders/setComplementaryOrder"),
  'a complementary order must retain its customer and table prefill'
)
assert.ok(
  detailSource.includes("orderEdit/cancel"),
  'a complementary order must never retain an edit session'
)
assert.ok(
  detailSource.includes("this.$router.push('/menus')"),
  'both order starts must navigate to the catalogue'
)

const ordersSource = fs.readFileSync(require.resolve('../store/orders.js'), 'utf8')
assert.ok(
  ordersSource.includes('complementaryOrder: null'),
  'the complementary checkout prefill must be retained outside the edit session'
)
assert.ok(
  ordersSource.includes("dispatch('set/detailOrder', [])"),
  'loading order details must expose a stable error message'
)
assert.ok(
  ordersSource.includes('detailOrderRequestId: 0'),
  'detail requests must have a monotonically increasing guard'
)
assert.ok(
  ordersSource.indexOf("dispatch('set/detailOrder', [])") <
    ordersSource.indexOf('.get(`/baseurl/api/v1/detailorder/${params}`'),
  'starting a detail request must clear the singleton before the request'
)
assert.ok(
  detailSource.includes('detailLoadError'),
  'a failed detail load must leave an actionable error state'
)
assert.ok(
  detailSource.includes('async loadOrderDetail('),
  'detail loading must be shared by initial and route-change navigation'
)
assert.ok(
  detailSource.includes("'$route.params.id'"),
  'changing the detail route must reload the requested order'
)
assert.ok(
  detailSource.includes('loadedOrderId'),
  'order actions must only read a detail matching the current route'
)
assert.ok(
  detailSource.includes('finally'),
  'the loading state must be cleared after successful and failed requests'
)
assert.ok(
  detailSource.includes('v-if="canEditOrder && !loadPage"'),
  'the edit action must be hidden while another detail is loading'
)
assert.ok(
  detailSource.includes('v-if="canStartComplementaryOrder && !loadPage"'),
  'the complementary action must be hidden while another detail is loading'
)

assert.ok(
  storeSource.includes('beginRequestId: 0'),
  'a deferred edit begin must carry an invalidatable request generation'
)
assert.ok(
  storeSource.includes('invalidateBegin('),
  'the edit session must expose explicit begin invalidation'
)
assert.ok(
  storeSource.includes('state.beginRequestId !== requestId'),
  'a late edit response must not hydrate a superseded order session or cart'
)
assert.ok(
  detailSource.includes("'orderEdit/invalidateBegin'"),
  'a detail route change must invalidate an in-flight edit begin'
)
assert.ok(
  detailSource.includes('isCurrentOrderDetail('),
  'deferred detail actions must recheck their captured route and order id'
)
assert.ok(
  detailSource.includes('await this.$store.dispatch(\'cart/abandonCheckout\''),
  'the complementary action must model its deferred checkout cleanup'
)
assert.ok(
  detailSource.includes('await this.$store.dispatch(\'orderEdit/cancel\')'),
  'the complementary action must model its deferred edit cleanup'
)
assert.ok(
  detailSource.includes('this.isCurrentOrderDetail(orderId, actionRequestId)'),
  'a delayed complementary flow must not alter the cart, session, or prefill for a new route'
)

console.log('order edit tests passed')
