const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  buildKioskCheckoutPayload,
  getKioskOrderReference,
} = require(path.join(root, 'helpers', 'kioskCheckout.js'))

const payload = buildKioskCheckoutPayload({
  customer: 'Nora',
  phone: '0611223344',
  servicePointId: 42,
  total: 18.5,
  payment: 'Paiement au comptoir',
  isTakeaway: true,
  dataCart: [{ id: 7, qty: 2, price: 9.25 }],
  stripe: false,
})

assert.deepStrictEqual(payload, {
  customer: 'Nora',
  phone: '0611223344',
  servicePointId: 42,
  total: 18.5,
  payment: 'Paiement au comptoir',
  remark: '',
  isTakeaway: true,
  dataCart: [{ id: 7, qty: 2, price: 9.25 }],
  stripe: false,
  source: 'borne',
})
assert.strictEqual(
  buildKioskCheckoutPayload({
    customer: 'Nora',
    phone: '0611223344',
    servicePointId: 42,
    total: 20,
    payment: 'Stripe',
    dataCart: [{ id: 7, qty: 2, price: 10 }],
    stripe: true,
    repriceConfirmation: true,
  }).repriceConfirmation,
  true
)
assert.throws(
  () => buildKioskCheckoutPayload({ customer: 'Nora', phone: '06' }),
  /service point/i
)
assert.deepStrictEqual(
  getKioskOrderReference({
    ok: true,
    data: { orderId: 91, orderNumber: 'A-91' },
  }),
  { orderId: 91, orderNumber: 'A-91' }
)
assert.deepStrictEqual(
  getKioskOrderReference({
    ok: true,
    data: { insertId: 92 },
  }),
  { orderId: 92, orderNumber: '92' }
)
assert.deepStrictEqual(
  getKioskOrderReference({ id: 93, ordernumber: 'B-93' }),
  { orderId: 93, orderNumber: 'B-93' }
)

const cartSource = fs.readFileSync(path.join(root, 'store', 'cart.js'), 'utf8')
assert.match(cartSource, /\.\.\.\(params\.source/)
assert.match(cartSource, /source:\s*params\.source/)

console.log('kiosk checkout tests passed')
