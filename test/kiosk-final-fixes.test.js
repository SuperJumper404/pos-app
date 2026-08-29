/* eslint-disable no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  buildKioskCartLine,
  getKioskPaymentAvailability,
  getKioskStripeReturnOutcome,
  isKioskProductAvailable,
} = require(path.join(root, 'helpers', 'kioskCheckout.js'))
const { canAccessKiosk } = require(path.join(root, 'helpers', 'kioskAccess.js'))

const configuredLine = buildKioskCartLine(
  { id: 12, name: 'Menu', price: 10 },
  {
    selectedChoiceIds: [31, 22],
    unitPrice: 13.5,
    selections: [
      { product_step_choice_id: 31, choice_name: 'Grand', extra_price: 2 },
      { product_step_choice_id: 22, choice_name: 'Sauce', extra_price: 1.5 },
    ],
  }
)
assert.strictEqual(configuredLine.price, 13.5)
assert.strictEqual(configuredLine.subtotal, 13.5)
assert.strictEqual(configuredLine.configurationSignature, '12:22,31')
assert.deepStrictEqual(configuredLine.selectedChoiceIds, [22, 31])
assert.deepStrictEqual(
  configuredLine.customizationList.map(({ name, price }) => ({ name, price })),
  [
    { name: 'Grand', price: 2 },
    { name: 'Sauce', price: 1.5 },
  ]
)

assert.strictEqual(isKioskProductAvailable({ archived: 0, stock: 1 }), true)
assert.strictEqual(isKioskProductAvailable({ archived: 1, stock: 10 }), false)
assert.strictEqual(isKioskProductAvailable({ is_hidden: 1, stock: 10 }), false)
assert.strictEqual(isKioskProductAvailable({ stock: 0 }), false)
assert.strictEqual(
  isKioskProductAvailable({ stock: 10, customization_available: false }),
  false
)

assert.deepStrictEqual(getKioskPaymentAvailability('stripe_before_order'), {
  counter: false,
  stripe: true,
})
assert.deepStrictEqual(getKioskPaymentAvailability('pay_at_counter'), {
  counter: true,
  stripe: false,
})
assert.deepStrictEqual(getKioskPaymentAvailability('unexpected'), {
  counter: false,
  stripe: true,
})

assert.strictEqual(getKioskStripeReturnOutcome({ payment_status: 'paid' }), 'paid')
assert.strictEqual(
  getKioskStripeReturnOutcome({ payment_status: 'requires_payment' }),
  'pending'
)
assert.strictEqual(
  getKioskStripeReturnOutcome({ payment_status: 'failed' }),
  'failed'
)

assert.strictEqual(
  canAccessKiosk({
    access: 2,
    session_subject: 'service_point',
    source: 'borne',
  }),
  true
)
assert.strictEqual(
  canAccessKiosk({
    access: 1,
    module_permissions: ['orders'],
    is_primary_admin: false,
  }),
  false
)
assert.strictEqual(
  canAccessKiosk({
    access: 0,
    module_permissions: [],
    is_primary_admin: true,
  }),
  true
)
assert.strictEqual(
  canAccessKiosk({ access: 2, module_permissions: ['borne'] }),
  false
)

const pageSource = fs.readFileSync(path.join(root, 'pages', 'borne.vue'), 'utf8')
assert.match(pageSource, /this\.\$store\.get\('users\/user'\)/)
assert.doesNotMatch(pageSource, /localStorage\.getItem\('service_point_id'\)/)
assert.match(pageSource, /cart\/cancelStripeCheckout/)
assert.match(pageSource, /cart\/abandonCheckout/)
assert.match(pageSource, /beforeRouteLeave/)
assert.match(pageSource, /redirect_status/)
assert.match(pageSource, /ORDER_REPRICE_REQUIRED/)
assert.match(pageSource, /applyServerQuoteToCart/)
assert.match(pageSource, /ordernumber/)
assert.match(pageSource, /kitchen_closed/)

console.log('kiosk final fix tests passed')
