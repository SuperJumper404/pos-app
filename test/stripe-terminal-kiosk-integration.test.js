const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const storeSource = read('store/stripeTerminal.js')
const kioskPageSource = read('pages/borne.vue')
const packageJson = require('../package.json')

const baseUrlMatch = storeSource.match(/const baseUrl = '([^']+)'/)
assert.ok(baseUrlMatch, 'Terminal store must define a stable baseUrl')
assert.strictEqual(
  `${baseUrlMatch[1]}/kiosk/current-reader`,
  '/baseurl/api/v1/stripe/terminal/kiosk/current-reader'
)
assert.strictEqual(
  `${baseUrlMatch[1]}/kiosk/payments`,
  '/baseurl/api/v1/stripe/terminal/kiosk/payments'
)

assert.doesNotMatch(kioskPageSource, /loadStripe/)
assert.doesNotMatch(kioskPageSource, /stripePaymentElement/)
assert.match(kioskPageSource, /sendReceiptBundle/)
assert.doesNotMatch(kioskPageSource, /sendCardTicket/)
assert.doesNotMatch(kioskPageSource, /sendCashierReceipt/)
assert.match(kioskPageSource, /sendOrderTicket/)

const kioskPayloadStart = storeSource.indexOf('const kioskCheckoutPayload =')
const runRequestStart = storeSource.indexOf('const runRequest =', kioskPayloadStart)
assert.ok(kioskPayloadStart >= 0, 'kiosk checkout payload sanitizer is required')
assert.ok(runRequestStart > kioskPayloadStart, 'request helper must follow sanitizer')
const kioskPayloadSource = storeSource.slice(kioskPayloadStart, runRequestStart)
assert.doesNotMatch(kioskPayloadSource, /readerId/)
assert.doesNotMatch(kioskPayloadSource, /amountCents/)
assert.match(kioskPayloadSource, /client_order_token/)
assert.match(kioskPayloadSource, /expected_total/)
assert.match(kioskPayloadSource, /items/)

const startKioskPaymentStart = storeSource.indexOf('  startKioskPayment(')
const refreshKioskPaymentStart = storeSource.indexOf(
  '  refreshKioskPayment(',
  startKioskPaymentStart
)
assert.ok(startKioskPaymentStart >= 0, 'kiosk start action is required')
assert.ok(refreshKioskPaymentStart > startKioskPaymentStart)
const startKioskPaymentSource = storeSource.slice(
  startKioskPaymentStart,
  refreshKioskPaymentStart
)
assert.doesNotMatch(startKioskPaymentSource, /readerId/)
assert.doesNotMatch(startKioskPaymentSource, /amountCents/)
assert.match(startKioskPaymentSource, /kioskCheckoutPayload\(input\)/)

for (const testFile of [
  'node test/stripe-terminal-kiosk-integration.test.js',
  'node test/stripe-terminal-kiosk-store.test.js',
  'node test/kiosk-card-ticket.test.js',
  'node test/kiosk-checkout.test.js',
  'node test/kiosk-page.test.js',
]) {
  assert.ok(
    packageJson.scripts.test.includes(testFile),
    `frontend npm test must include ${testFile}`
  )
}

console.log('stripe terminal kiosk integration contracts passed')
