const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const root = path.resolve(__dirname, '..')
const load = file => {
  if (!fs.existsSync(path.join(root, file))) return { default: { methods: {} } }
  let source = fs.readFileSync(path.join(root, file), 'utf8')
  if (file.endsWith('.vue')) source = compiler.parseComponent(source).script.content
  const module = { exports: {} }
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  vm.runInNewContext(code, { module, exports: module.exports, localStorage: { getItem: () => '0' },
    require: name => {
      if (!name.startsWith('@/') && !name.startsWith('.')) return require(name)
      const resolved = name.startsWith('@/') ? name.slice(2) : path.relative(root, path.resolve(root, path.dirname(file), name))
      if (/components\//.test(resolved)) return {}
      return load(path.extname(resolved) ? resolved : `${resolved}.js`)
    },
  })
  return module.exports
}
const main = async () => {
  const page = load('pages/menus.vue').default
  const calls = []
  const context = {
    pendingExpressPaymentMethod: 'stripe_terminal', expressReceiptPrinting: false,
    expressSubmitDisabled: false, isOrderEditActive: false, expressIsDelivery: false,
    expressCustomer: 'Client', expressPhone: '', expressRemark: '', expressSelectedTable: 3,
    expressCheckoutTotal: 12, expressDiscountType: 'none', expressDiscountValue: 0,
    cartItem: [{ productID: 1, qty: 1 }], expressIsTakeaway: false,
    checkoutTerminalReader: { id: 7, label: 'Terrasse', isActive: true },
    $route: { path: '/caisse/menu' },
    $router: { push: location => Promise.resolve(calls.push(['navigate', location])) },
    $store: { dispatch: (name, payload) => { calls.push([name, payload]); return Promise.resolve({ ok: true, data: { orderId: 22 } }) } },
    roundPrice: value => value, buildExpressDeliveryPayload: () => ({}),
    beginExpressCheckout: () => null, isExpressCheckoutCurrent: () => true,
    clearMenuCart: () => calls.push(['clear']), clearExpressDiscount: () => {},
    buildExpressRemark: () => '', showAlert: message => { throw new Error(message) },
    printExpressReceipt: () => Promise.resolve(calls.push(['print'])),
  }
  Object.assign(context, load('mixins/terminalCheckout.js').default.methods)
  await page.methods.confirmExpressReceipt.call(context, true)
  assert.strictEqual(calls[0][0], 'cart/checkoutOrder')
  assert.strictEqual(calls[0][1].payment, 'Paiement au comptoir')
  const destination = calls.find(call => call[0] === 'navigate')[1]
  assert.strictEqual(destination.query.terminal, '1')
  assert.strictEqual(destination.query.collectOnly, '1')
  assert.strictEqual(destination.query.returnTo, '/caisse/menu')
  assert.strictEqual(destination.query.receipt, '1')
  assert.strictEqual(destination.query.orders[0], 22)

  const detail = load('pages/orders/detail/_id.vue').default
  const detailCalls = []
  await detail.methods.confirmOrderReceipt.call({
    ...load('mixins/terminalCheckout.js').default.methods,
    paymentLoading: false, receiptPrinting: false, pendingPaymentMethod: 'stripe_terminal',
    canCollectOrder: true, orderSummary: { id: 44 }, detailOrder: [],
    archiveDiscountType: 'percent', archiveDiscountValue: 10,
    $route: { path: '/orders/detail/44' },
    $router: { push: value => Promise.resolve(detailCalls.push(['navigate', value])) },
    $store: { dispatch: name => detailCalls.push([name]) },
  }, false)
  assert.strictEqual(detailCalls.length, 1)
  assert.strictEqual(detailCalls[0][0], 'navigate')
  assert.strictEqual(detailCalls[0][1].query.discountType, 'percent')
  assert.strictEqual(detailCalls[0][1].query.discountValue, '10')
  const cart = load('pages/cart.vue').default
  const cartCalls = []
  await cart.methods.submitOrderWithoutStripe.call({
    ...load('mixins/terminalCheckout.js').default.methods,
    isDelivery: true, isQrClient: false, checkoutShopId: 2,
    buildOrderPayload: () => ({ payment: 'counter_pay_before:stripe_terminal', stripe: false }),
    publishDeliveryTracking: () => Promise.resolve(cartCalls.push(['tracking'])),
    $route: { path: '/cart' },
    $router: { push: value => Promise.resolve(cartCalls.push(['navigate', value])) },
    $store: { set: () => {}, dispatch: (name, payload) => { cartCalls.push([name, payload]); return Promise.resolve({ ok: true, data: { orderId: 55 } }) } },
    finishDeliveryCheckout: () => { throw new Error('Must not finalize a TPE payment before confirmation') },
  }, 'stripe_terminal')
  assert.strictEqual(cartCalls[0][0], 'cart/checkoutOrder')
  assert.strictEqual(cartCalls[0][1].payment, 'Paiement a la livraison')
  assert.strictEqual(cartCalls.find(call => call[0] === 'navigate')[1].query.orders[0], 55)
  console.log('Menu and order-detail TPE handoff passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
