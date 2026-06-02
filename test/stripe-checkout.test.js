const assert = require('assert')
const {
  buildStripeCheckoutSignature,
  shouldAutoPrepareStripeCheckout,
} = require('../helpers/stripeCheckout')

assert.strictEqual(
  shouldAutoPrepareStripeCheckout({
    isQrClient: true,
    isStripeCheckout: true,
    isValue: true,
    dataCart: [{ id: 1 }],
    isKitchenClosed: false,
    stripePaymentReady: false,
    stripePreparing: false,
  }),
  true
)

assert.strictEqual(
  shouldAutoPrepareStripeCheckout({
    isQrClient: true,
    isStripeCheckout: true,
    isValue: false,
    dataCart: [{ id: 1 }],
    isKitchenClosed: false,
    stripePaymentReady: false,
    stripePreparing: false,
  }),
  false
)

assert.strictEqual(
  shouldAutoPrepareStripeCheckout({
    isQrClient: false,
    isStripeCheckout: false,
    isValue: true,
    dataCart: [{ id: 1 }],
    isKitchenClosed: false,
    stripePaymentReady: false,
    stripePreparing: false,
  }),
  false
)

assert.strictEqual(
  shouldAutoPrepareStripeCheckout({
    isQrClient: true,
    isStripeCheckout: true,
    isValue: true,
    dataCart: [{ id: 1 }],
    isKitchenClosed: true,
    stripePaymentReady: false,
    stripePreparing: false,
  }),
  false
)

assert.strictEqual(
  shouldAutoPrepareStripeCheckout({
    isQrClient: true,
    isStripeCheckout: true,
    isValue: true,
    dataCart: [{ id: 1 }],
    isKitchenClosed: false,
    stripePaymentReady: true,
    stripePreparing: false,
  }),
  false
)

assert.strictEqual(
  shouldAutoPrepareStripeCheckout({
    isQrClient: true,
    isStripeCheckout: true,
    isValue: true,
    dataCart: [],
    isKitchenClosed: false,
    stripePaymentReady: false,
    stripePreparing: false,
  }),
  false
)

const signature = buildStripeCheckoutSignature({
  customer: 'Alice',
  phone: '0600000000',
  selectedTable: 12,
  total: 18,
  dataCart: [
    {
      id: 2,
      price: '9',
      qty: 2,
      customizationList: [{ id: 1, name: 'Sauce' }],
    },
  ],
})

assert.strictEqual(
  signature,
  JSON.stringify({
    customer: 'Alice',
    phone: '0600000000',
    selectedTable: 12,
    total: 18,
    items: [
      {
        id: 2,
        price: '9',
        qty: 2,
        customizationList: [{ id: 1, name: 'Sauce' }],
      },
    ],
  })
)

assert.notStrictEqual(
  signature,
  buildStripeCheckoutSignature({
    customer: 'Alice',
    phone: '0600000000',
    selectedTable: 12,
    total: 20,
    dataCart: [
      {
        id: 2,
        price: '9',
        qty: 2,
        customizationList: [{ id: 1, name: 'Sauce' }],
      },
    ],
  })
)

console.log('stripeCheckout tests passed')
