const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const storeSource = read('store/stripeTerminal.js')
const payoutSource = read('pages/cashregister/payout/_id.vue')
const helperSource = read('helpers/stripeTerminal.js')
const packageJson = require('../package.json')
const {
  hasSettledTerminalAllocations,
  isTerminalMethod,
  isTerminalPaymentPending,
} = require('../helpers/stripeTerminal')
const { cashRegisterTerminalPayload } = require('../helpers/cashRegister')

for (const route of [
  '/baseurl/api/v1/stripe/terminal',
  '/readers',
  '/readers/refresh',
  '/current-reader',
  '/payments',
  '/cancel',
]) assert.ok(storeSource.includes(route), `${route} frontend route must remain stable`)

assert.deepStrictEqual(cashRegisterTerminalPayload({
  orderIds: [12, 10],
  discountType: 'amount',
  discountValue: 1.25,
}), { orderIds: [12, 10], discountType: 'amount', discountValue: 125 })
assert.doesNotMatch(storeSource, /readerId\s*:/)
assert.doesNotMatch(storeSource, /amountCents\s*:\s*input/)

assert.strictEqual(isTerminalMethod({ payment_provider: 'stripe_terminal' }), true)
assert.strictEqual(isTerminalMethod('Carte bancaire'), false)
assert.strictEqual(isTerminalPaymentPending({ status: 'creating' }), true)
assert.strictEqual(isTerminalPaymentPending({ status: 'processing' }), true)
assert.strictEqual(isTerminalPaymentPending({ status: 'succeeded' }), false)
assert.strictEqual(hasSettledTerminalAllocations({
  id: 4,
  status: 'succeeded',
  amountCents: 1075,
  orderIds: [10],
  allocations: [{ orderId: 10, amountCents: 1075 }],
}), true)

assert.match(payoutSource, /this\.currentReader\.isActive/)
assert.match(payoutSource, /this\.currentReader\.assignedUserId === Number\(user\.id\)/)
assert.match(payoutSource, /Carte bancaire - TPE Stripe/)
assert.match(payoutSource, /stripeTerminal\/startPayment/)
assert.match(payoutSource, /stripeTerminal\/refreshPayment/)
assert.match(payoutSource, /stripeTerminal\/cancelPayment/)
assert.match(payoutSource, /return this\.terminalAvailable \? \[\.\.\.manual, 'stripe_terminal'\] : manual/)
assert.match(payoutSource, /!this\.terminalAvailable\) return/)

for (const code of [
  'TERMINAL_NO_READER',
  'TERMINAL_READER_OFFLINE',
  'TERMINAL_READER_BUSY',
  'TERMINAL_RECOVERY_REQUIRED',
  'TERMINAL_PAYMENT_NOT_FOUND',
  'TERMINAL_REQUEST_FAILED',
]) assert.ok(helperSource.includes(code), `${code} must have safe frontend copy`)

assert.ok(packageJson.scripts.test.includes('node test/stripe-terminal-integration.test.js'), 'frontend npm test must include the Terminal integration contract')

console.log('stripe terminal integration contracts passed')
