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

console.log('order edit tests passed')
