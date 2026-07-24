const assert = require('assert')
const fs = require('fs')
const {
  buildOrderEditPayload,
  isOrderEditable,
  isOrderEditDirty,
  mapEditableOrderToCart,
} = require('../helpers/orderEdit')

const product = {
  id: 10,
  name: 'Menu',
  image: 'menu.webp',
  price: 8,
  customization_steps: [{
    product_step_id: 20,
    name: 'Boisson',
    choices: [{
      product_step_choice_id: 30,
      choice_name: 'Cola',
      extra_price: 1.5,
    }],
  }],
}
const editable = {
  order_id: 42,
  order_number: '0042',
  status: 1,
  payment_status: 'unpaid',
  total: 19,
  content_revision: 'revision-1',
  items: [{
    product_id: 10,
    quantity: 2,
    unit_price: 9.5,
    line_total: 19,
    selected_product_step_choice_ids: [30],
    customization_snapshots: [],
    requires_reconfiguration: false,
  }],
}

assert.strictEqual(isOrderEditable(editable), true)
assert.strictEqual(isOrderEditable({ ...editable, status: 2 }), false)
assert.strictEqual(isOrderEditable({ ...editable, payment_status: 'paid' }), false)

const cart = mapEditableOrderToCart(editable, [product])
assert.strictEqual(cart[0].id, 10)
assert.strictEqual(cart[0].qty, 2)
assert.deepStrictEqual(cart[0].selectedChoiceIds, [30])
assert.strictEqual(cart[0].selections[0].choice_name, 'Cola')
assert.strictEqual(cart[0].subtotal, 19)

assert.deepStrictEqual(buildOrderEditPayload({
  contentRevision: 'revision-1',
  expectedTotal: 19,
  cart,
}), {
  content_revision: 'revision-1',
  expected_total: 19,
  items: [{
    product_id: 10,
    quantity: 2,
    selected_product_step_choice_ids: [30],
  }],
})
assert.strictEqual(isOrderEditDirty(cart, cart), false)
assert.strictEqual(isOrderEditDirty(cart, [{ ...cart[0], qty: 3 }]), true)

const usersSource = fs.readFileSync(require.resolve('../store/users.js'), 'utf8')
const axiosSource = fs.readFileSync(require.resolve('../plugins/axios.js'), 'utf8')
assert.ok(usersSource.includes("orderEdit/cancel"))
assert.ok(axiosSource.includes("orderEdit/cancel"))

const detailSource = fs.readFileSync(
  require.resolve('../pages/orders/detail/_id.vue'),
  'utf8'
)
assert.ok(detailSource.includes('Modifier la commande'))
assert.ok(detailSource.includes("orderEdit/load"))
assert.ok(detailSource.includes('canEditOrder'))
assert.ok(detailSource.includes('replaceCartDialog'))

const menusSource = fs.readFileSync(require.resolve('../pages/menus.vue'), 'utf8')
const cartSource = fs.readFileSync(require.resolve('../pages/cart.vue'), 'utf8')
const bannerSource = fs.readFileSync(
  require.resolve('../components/orders/OrderEditBanner.vue'),
  'utf8'
)
assert.ok(menusSource.includes('OrderEditBanner'))
assert.ok(menusSource.includes('isOrderEditActive'))
assert.ok(cartSource.includes('Enregistrer les modifications'))
assert.ok(cartSource.includes("orderEdit/save"))
assert.ok(cartSource.includes("orderEdit/regeneratePayment"))
assert.ok(bannerSource.includes('Modification de la commande'))

console.log('orderEdit tests passed')
