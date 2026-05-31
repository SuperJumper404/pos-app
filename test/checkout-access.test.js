const assert = require('assert')
const {
  isCounterPaymentAllowed,
  isQrClientAccess,
  isStripePaymentRequired,
} = require('../helpers/checkoutAccess')

assert.strictEqual(isQrClientAccess(2), true)
assert.strictEqual(isQrClientAccess('2'), true)
assert.strictEqual(isQrClientAccess(3), true)
assert.strictEqual(isQrClientAccess('3'), true)
assert.strictEqual(isQrClientAccess(0), false)
assert.strictEqual(isQrClientAccess(1), false)
assert.strictEqual(isQrClientAccess(null), false)

assert.strictEqual(isStripePaymentRequired('stripe_before_order'), true)
assert.strictEqual(isStripePaymentRequired('pay_at_counter'), false)
assert.strictEqual(isCounterPaymentAllowed('stripe_before_order'), false)
assert.strictEqual(isCounterPaymentAllowed('pay_at_counter'), true)

console.log('checkoutAccess tests passed')
