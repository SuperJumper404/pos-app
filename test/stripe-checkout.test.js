const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
const Vue = require('vue')
const compiler = require('vue-template-compiler')
const { buildCheckoutIntentSignature } = require('../helpers/counterCheckout')
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

const root = path.resolve(__dirname, '..')
const cartComponent = compiler.parseComponent(
  fs.readFileSync(path.join(root, 'pages/cart.vue'), 'utf8')
)
const cartModule = { exports: {} }
vm.compileFunction(babel.transformSync(cartComponent.script.content, {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, ['module', 'exports', 'require'])(cartModule, cartModule.exports,
  name => name.startsWith('@/helpers/') && name !== '@/helpers/price'
    ? require(path.join(root, name.slice(2)))
    : {})
const cartOptions = cartModule.exports.default
const compiledCart = compiler.compile(cartComponent.template.content)
assert.deepStrictEqual(compiledCart.errors, [])

function qrCheckout({ access = 2, enabled = false, mode = 'pay_at_counter' } = {}) {
  global.localStorage = { getItem: key => key === 'access' ? String(access) : null }
  const calls = []
  const values = Vue.observable({
    'shop/stripe_charges_enabled': enabled,
    'shop/qr_payment_mode': mode,
    'cart/dataCart': [],
    'cart/clientOrderSignature': null,
  })
  const page = new Vue({
    props: cartOptions.props,
    data: cartOptions.data,
    computed: cartOptions.computed,
    beforeCreate() {
      this.$store = {
        state: { users: { user: { shopid: 7, order_source: 'table_qr' } } },
        get: key => values[key] ?? null,
        set() {},
        dispatch(name, payload) {
          calls.push({ name, payload })
          if (name === 'cart/checkoutOrder') {
            values['cart/clientOrderSignature'] = buildCheckoutIntentSignature(payload)
          }
          return Promise.resolve(name === 'cart/checkoutOrder' ? { ok: false, error: null } : true)
        },
      }
      this.$router = { push() {} }
    },
    methods: { ...cartOptions.methods, formatCurrency: String, roundPrice: Number,
      isCheckoutTerminalMethod: () => false },
    render: vm.compileFunction(compiledCart.render, []),
    staticRenderFns: compiledCart.staticRenderFns.map(code => vm.compileFunction(code, [])),
  })
  page.isValue = true
  page.formuser.customer = 'Alice'
  page.formuser.phone = '0612345678'
  return { page, calls, values }
}

function checkoutButtons(page) {
  const result = []
  const visit = node => {
    if ((node.data?.directives || []).some(directive => directive.name === 'show' && !directive.value)) return
    if (node.tag === 'v-btn') {
      const label = (node.children || []).filter(child => !child.tag).map(child => child.text || '').join('').trim()
      if (['Payer', 'Commander', 'Confirmer le paiement'].includes(label)) result.push({ label, node })
    }
    for (const child of node.children || []) visit(child)
  }
  visit(page._render())
  return result
}

for (const access of [2, 3]) {
  for (const mode of ['pay_at_counter', 'stripe_before_order']) {
    test(`QR access ${access} without Stripe only offers Commander (${mode})`, () => {
      const { page } = qrCheckout({ access, mode })
      try {
        assert.deepStrictEqual(checkoutButtons(page).map(button => button.label), ['Commander'])
        assert.strictEqual(page.isStripeCheckout, false)
      } finally { page.$destroy() }
    })
  }
  for (const enabled of [true, 1, '1', 'true']) {
    test(`QR access ${access} with Stripe ${JSON.stringify(enabled)} offers both choices before payment is prepared`, () => {
      const { page } = qrCheckout({ access, enabled })
      try {
        assert.deepStrictEqual(checkoutButtons(page).map(button => button.label), ['Payer', 'Commander'])
      } finally { page.$destroy() }
    })
  }
}

test('mandatory QR payment only offers Payer, then payment confirmation', () => {
  const { page } = qrCheckout({ enabled: true, mode: 'stripe_before_order' })
  try {
    assert.deepStrictEqual(checkoutButtons(page).map(button => button.label), ['Payer'])
    page.stripePaymentReady = true
    assert.deepStrictEqual(checkoutButtons(page).map(button => button.label), ['Confirmer le paiement'])
  } finally { page.$destroy() }
})

test('optional QR payment keeps Commander available after Stripe preparation', () => {
  const { page } = qrCheckout({ enabled: true })
  try {
    page.stripePaymentReady = true
    assert.deepStrictEqual(checkoutButtons(page).map(button => button.label), ['Confirmer le paiement', 'Commander'])
  } finally { page.$destroy() }
})

test('a prepared Stripe order cannot be submitted without a matching bound attempt', () => {
  const { page } = qrCheckout({ enabled: true })
  try {
    page.stripePaymentReady = true
    const button = checkoutButtons(page).find(button => button.label === 'Commander')
    assert.strictEqual(button.node.data.attrs.disabled, true)
  } finally { page.$destroy() }
})

test('QR without Stripe submits an unpaid order', async () => {
  const { page, calls } = qrCheckout({ mode: 'stripe_before_order' })
  try {
    await page.paymentBtn()
    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0].name, 'cart/checkoutOrder')
    assert.strictEqual(calls[0].payload.stripe, false)
  } finally { page.$destroy() }
})

test('choosing Payer in optional QR mode starts a Stripe checkout', async () => {
  const { page, calls, values } = qrCheckout({ enabled: true })
  values['cart/dataCart'] = [{ id: 1 }]
  try {
    await page.paymentBtn()
    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0].name, 'cart/checkoutOrder')
    assert.strictEqual(calls[0].payload.stripe, true)
    assert.strictEqual(calls[0].payload.payment, 'Stripe')
  } finally { page.$destroy() }
})

test('choosing Commander before Stripe preparation submits an unpaid counter order', async () => {
  const { page, calls } = qrCheckout({ enabled: true })
  try {
    const button = checkoutButtons(page).find(button => button.label === 'Commander')
    assert.ok(button, 'Commander must be available before preparing Stripe')
    assert.ok(button.node.data.on?.click, 'Commander must have its own order action')
    await button.node.data.on.click()
    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0].name, 'cart/checkoutOrder')
    assert.strictEqual(calls[0].payload.payment, 'Paiement au comptoir')
    assert.strictEqual(calls[0].payload.stripe, false)
  } finally { page.$destroy() }
})

test('choosing Commander after Stripe preparation reuses the prepared order', async () => {
  const { page, calls, values } = qrCheckout({ enabled: true })
  try {
    page.stripePaymentReady = true
    page.stripeOrderId = 42
    values['cart/clientOrderSignature'] = page.currentStripeCheckoutSignature
    await page.orderWithoutPayment()
    assert.deepStrictEqual(calls.find(call => call.name === 'cart/markStripeOrderPayAtCounter'), {
      name: 'cart/markStripeOrderPayAtCounter', payload: 42,
    })
    assert.strictEqual(calls.some(call => call.name === 'cart/checkoutOrder'), false)
    assert.strictEqual(page.checkoutFinalized, true)
  } finally { page.$destroy() }
})

test('Commander can retry the same unpaid attempt after a lost response', async () => {
  const { page, calls } = qrCheckout({ enabled: true })
  try {
    await page.orderWithoutPayment()
    assert.strictEqual(page.checkoutPayloadMatchesBoundAttempt, true)
    await page.paymentBtn()
    assert.strictEqual(calls.length, 2)
    assert.strictEqual(calls[1].name, 'cart/checkoutOrder')
    assert.deepStrictEqual(calls[1].payload, calls[0].payload)
  } finally { page.$destroy() }
})

test('an unpaid QR attempt remains Commander-only when restored', () => {
  const { page } = qrCheckout({ enabled: true })
  try {
    page.restoreCheckoutAttemptPayload({ customer: 'Alice', phone: '0612345678', payment: 'Paiement au comptoir', stripe: false })
    assert.deepStrictEqual(checkoutButtons(page).map(button => button.label), ['Commander'])
    assert.strictEqual(page.isStripeCheckout, false)
  } finally { page.$destroy() }
})

test('restoring an unresolved Stripe attempt keeps Payer available after choosing Commander', () => {
  const { page, values } = qrCheckout({ enabled: true })
  try {
    values['cart/clientOrderSignature'] = page.currentStripeCheckoutSignature
    const payload = { customer: 'Alice', phone: '0612345678', payment: 'Stripe', stripe: true }
    page.selectedCheckoutFlow = 'counter'
    page.handleCheckoutError({ code: 'CHECKOUT_ATTEMPT_UNRESOLVED', attempt_payload: payload })
    assert.strictEqual(page.isStripeCheckout, true)
    assert.strictEqual(page.checkoutPayloadMatchesBoundAttempt, true)
    assert.strictEqual(page.primaryActionDisabled, false)
  } finally { page.$destroy() }
})

test('optional QR payment waits for the client to choose Payer before preparing Stripe', () => {
  const { page, values } = qrCheckout({ enabled: true })
  values['cart/dataCart'] = [{ id: 1 }]
  try {
    assert.strictEqual(page.shouldPrepareStripeCheckout(), false)
    page.selectedCheckoutFlow = 'stripe'
    assert.strictEqual(page.shouldPrepareStripeCheckout(), true)
  } finally { page.$destroy() }
})

test('mandatory QR payment still prepares Stripe automatically', () => {
  const { page, values } = qrCheckout({ enabled: true, mode: 'stripe_before_order' })
  values['cart/dataCart'] = [{ id: 1 }]
  try {
    assert.strictEqual(page.shouldPrepareStripeCheckout(), true)
  } finally { page.$destroy() }
})

test('Commander cannot submit a second order while Stripe is preparing', async () => {
  const { page, calls } = qrCheckout({ enabled: true })
  page.stripePreparing = true
  try {
    await page.orderWithoutPayment()
    assert.deepStrictEqual(calls, [])
  } finally { page.$destroy() }
})
