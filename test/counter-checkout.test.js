const assert = require('assert')
const {
  COUNTER_PAY_BEFORE_MODE,
  buildCounterPayBeforePayment,
  getCounterPayBeforeMethod,
  isCounterPayBeforePaymentMode,
} = require('../helpers/counterCheckout')

assert.strictEqual(COUNTER_PAY_BEFORE_MODE, 'counter_pay_before')
assert.strictEqual(
  buildCounterPayBeforePayment('Espèces'),
  'counter_pay_before:Espèces'
)
assert.strictEqual(
  buildCounterPayBeforePayment('  Carte bancaire  '),
  'counter_pay_before:Carte bancaire'
)
assert.strictEqual(buildCounterPayBeforePayment(''), 'counter_pay_before:Caisse')
assert.strictEqual(isCounterPayBeforePaymentMode('counter_pay_before:Carte'), true)
assert.strictEqual(isCounterPayBeforePaymentMode('stripe'), false)
assert.strictEqual(getCounterPayBeforeMethod('counter_pay_before:Carte'), 'Carte')
assert.strictEqual(getCounterPayBeforeMethod('cash'), null)

console.log('counter checkout tests passed')
