/* eslint-disable no-new-func */
const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const babel = require('@babel/core')
const Vue = require('vue')
const compiler = require('vue-template-compiler')

const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'pages/cart.vue'), 'utf8')
const component = compiler.parseComponent(source)
const code = babel.transformSync(component.script.content, {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code
const cartModule = { exports: {} }
vm.compileFunction(code, ['module', 'exports', 'require'])(
  cartModule,
  cartModule.exports,
  name => name.startsWith('@/helpers/') && name !== '@/helpers/price'
    ? require(path.join(root, name.slice(2)))
    : {}
)
const options = cartModule.exports.default
const phoneField = component.template.content
  .match(/<v-text-field\b[\s\S]*?<\/v-text-field>/g)
  .find(field => field.includes('v-model="formuser.phone"'))
const compiled = compiler.compile(phoneField)
assert.deepEqual(compiled.errors, [])

function checkout(access, orderSource = 'pos') {
  const storage = { access: String(access), order_source: orderSource }
  global.localStorage = { getItem: key => storage[key] || null }
  const dispatches = []
  const page = new Vue({
    data: options.data,
    computed: options.computed,
    methods: options.methods,
    render: new Function(compiled.render),
  })
  page.$store = {
    state: { users: { user: { order_source: orderSource } } },
    get: key => key === 'shop/qr_payment_mode' ? 'stripe_before_order' : null,
    dispatch: (name, payload) => {
      dispatches.push({ name, payload })
      return Promise.resolve({ ok: false, error: null })
    },
  }
  page.buildOrderPayload = () => ({ phone: page.formuser.phone })
  page.isCheckoutTerminalMethod = () => false
  return { page, dispatches }
}

function phoneInput(page) {
  return page.$options.render.call(page).data.attrs
}

test('QR and click and collect reject empty, short and malformed phone numbers', () => {
  for (const [access, source] of [[2, 'table_qr'], [3, 'click_and_collect'], [3, 'web'], [1, 'web']]) {
    const { page } = checkout(access, source)
    try {
      const input = phoneInput(page)
      assert.ok(input.required === true || input.required === '')
      for (const phone of ['', ' ', '1', '061234567', '06123456789', '0000000000', 'abcdefghij', '06abc12345678', '+33 06 12 34 56 78', '+33 6 12 34 56', '06+12345678']) {
        assert.ok(input.rules.some(rule => rule(phone) !== true), `must reject ${JSON.stringify(phone)}`)
      }
      for (const phone of ['0612345678', '0123456789', ' 06 12 34 56 78 ', '06.12.34.56.78', '06-12-34-56-78', '+33 6 12 34 56 78', '0033612345678', '+49 151 23456789']) {
        assert.ok(input.rules.every(rule => rule(phone) === true), `must accept ${phone}`)
      }
    } finally { page.$destroy() }
  }
})

test('admin and kitchen phone fields remain optional and unrestricted', () => {
  for (const access of [0, 1, 4, 5]) {
    const { page } = checkout(access)
    try {
      const input = phoneInput(page)
      assert.ok(input.required == null || input.required === false)
      for (const phone of ['', '1', 'poste cuisine', '+33 6 12 34 56 78']) {
        assert.ok(input.rules.every(rule => rule(phone) === true))
      }
    } finally { page.$destroy() }
  }
})

for (const method of ['submitOrderWithoutStripe', 'prepareStripePaymentElement']) {
  test(`invalid client phone blocks ${method} before checkout`, async () => {
    const { page, dispatches } = checkout(2, 'table_qr')
    try {
      page.formuser.phone = '1'
      page.isValue = true
      await page[method](method === 'prepareStripePaymentElement' ? true : 'Paiement au comptoir')
      assert.deepEqual(dispatches, [])
      assert.ok(page.checkoutErrorMessage)
    } finally { page.$destroy() }
  })
}

test('valid clients and unrestricted staff can still submit an order', async () => {
  for (const [access, source, phone] of [[2, 'table_qr', '0612345678'], [3, 'click_and_collect', '+33 6 12 34 56 78'], [0, 'pos', ''], [1, 'pos', 'poste cuisine']]) {
    const { page, dispatches } = checkout(access, source)
    try {
      page.formuser.phone = phone
      await page.submitOrderWithoutStripe('Paiement au comptoir')
      assert.deepEqual(dispatches, [{ name: 'cart/checkoutOrder', payload: { phone } }])
    } finally { page.$destroy() }
  }
})

test('a prepared client payment cannot be confirmed with an invalid phone', () => {
  const { page } = checkout(2, 'table_qr')
  try {
    page.formuser.phone = '1'
    Object.defineProperty(page, 'checkoutPayloadMatchesBoundAttempt', { value: true })
    assert.equal(page.guardCheckoutConfirmation(), false)
    assert.match(page.checkoutErrorMessage, /téléphone/i)
  } finally { page.$destroy() }
})
