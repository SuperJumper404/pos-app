const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')
const { test } = require('node:test')
const { buildKioskCheckoutPayload } = require('../helpers/kioskCheckout')
const { fixture: loyaltyFixture } = require('../../express-pos/test/loyalty-kiosk-checkout.test')
const { fixture: terminalFixture } = require('../../express-pos/test/stripe-terminal-kiosk-payments.test')
const { normalizeCheckoutRequestBody } = require('../../express-pos/src/modules/m_checkout')
const { buildStripeTerminalController } = require('../../express-pos/src/controllers/c_stripeTerminal')

const selection = { memberId: '00000000-0000-4000-8000-000000000001', rewardId: 'coffee', confirmed: true,
  expectedDiscountCents: 200, expectedPointsCost: 30, programVersion: 1, totalCents: 800 }
const payload = () => buildKioskCheckoutPayload({ terminal: true, payment: 'stripe_terminal', customer: 'Client', phone: '0612345678', total: 10,
  servicePointId: 5, dataCart: [{ id: 21, qty: 1, price: 10 }], clientOrderToken: 'joined-boundary', loyaltySelection: selection })
function setup() {
  const loyalty = loyaltyFixture(); const terminal = terminalFixture()
  terminal.state.reader.assigned_service_point_id = 5
  Object.defineProperty(terminal.state, 'orders', { get: () => loyalty.state().orders })
  Object.assign(terminal.checkout, { normalizeCheckoutRequestBody, createCheckout: loyalty.checkout.createCheckout })
  const controller = buildStripeTerminalController({ kioskPaymentService: terminal.service })
  const filename = path.join(__dirname, '../store/stripeTerminal.js')
  const source = fs.readFileSync(filename, 'utf8').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  const store = vm.compileFunction(`${source}\nreturn { state, actions }`, ['EasyAccess', 'defaultMutations', 'require'])(() => ({}), () => ({}), createRequire(filename))
  const state = store.state(); let httpStatus
  const axios = { async post(url, body) {
    const response = { status(value) { httpStatus = value; return this }, json(value) { this.body = value } }
    await controller.startKioskPayment({ body, shopid: 7, servicePointId: 5, sessionSubject: 'service_point', orderSource: 'borne' }, response)
    if (httpStatus >= 400) throw Object.assign(new Error('HTTP failure'), { response: { status: httpStatus, data: response.body } })
    return { data: response.body }
  } }
  const dispatch = (type, value) => { assert(type.startsWith('set/')); state[type.slice(4)] = value }
  const start = body => store.actions.startKioskPayment.call({ $axios: axios }, { state, dispatch }, body)
  return { loyalty, terminal, state, start, status: () => httpStatus }
}
function borneMethods() {
  const source = require('vue-template-compiler').parseComponent(fs.readFileSync(path.join(__dirname, '../pages/borne.vue'), 'utf8')).script.content
  const code = require('@babel/core').transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require'])(module, module.exports, name => name.startsWith('@/') ? {} : require(name))
  return module.exports.default.methods
}
test('real kiosk store, HTTP controller, terminal service and checkout send only the confirmed net amount to Stripe', async () => {
  const f = setup(); const payment = await f.start(payload())
  assert.equal(f.status(), 200); assert.equal(payment.amountCents, 800)
  assert.equal(f.terminal.state.intent.amount, 800); assert.equal(f.loyalty.state().member.reserved, 30)
  assert.equal(f.loyalty.state().orders[0].customer_account_id, undefined)
})
test('real terminal errors reach the kiosk and discard a stale confirmation before any Stripe call', async () => {
  const methods = borneMethods()
  for (const change of ['points', 'version', 'balance']) {
    const f = setup()
    if (change === 'points') f.loyalty.program.rewards[0].points = 40
    if (change === 'version') f.loyalty.setVersion(2)
    if (change === 'balance') f.loyalty.state().member.reserved = 40
    const ctx = { checkoutDisabled: false, terminalCardAvailable: true, checkoutLoading: null, loyaltySelection: selection, loyaltyEpoch: 1,
      $store: { dispatch: (action, body) => { assert.equal(action, 'stripeTerminal/startKioskPayment'); return f.start(body) }, get: () => f.state.error },
      buildPayload: payload, resolveTerminalPayment: () => assert.fail('payment must not start') }
    ctx.handleCheckoutFailure = methods.handleCheckoutFailure.bind(ctx)
    await methods.submitTerminalPayment.call(ctx)
    assert.equal(f.status(), 409)
    assert.equal(f.state.error.code, change === 'balance' ? 'LOYALTY_INSUFFICIENT_POINTS' : 'LOYALTY_REQUOTE_REQUIRED')
    assert.equal(ctx.loyaltySelection, null); assert.equal(ctx.loyaltyEpoch, 2)
    assert.equal(f.terminal.state.intent, null); assert.equal(f.loyalty.state().orders.length, 0)
  }
})
test('known checkout loyalty errors retain their status and code across the terminal wrappers', async () => {
  const f = setup()
  const DomainError = require('../../express-pos/src/helpers/domainError')
  f.terminal.checkout.createCheckout = () => Promise.reject(new DomainError(409, 'LOYALTY_REQUOTE_REQUIRED', 'Confirm updated reward'))
  assert.equal(await f.start(payload()), false)
  assert.equal(f.status(), 409); assert.equal(f.state.error.code, 'LOYALTY_REQUOTE_REQUIRED')
})
test('unexpected exceptions remain generic and cannot expose server details through terminal errors', async () => {
  const f = setup()
  f.terminal.checkout.createCheckout = () => Promise.reject(new Error('private provider detail'))
  assert.equal(await f.start(payload()), false)
  assert.equal(f.status(), 500); assert.equal(f.state.error.code, 'TERMINAL_INTERNAL_ERROR')
  assert(!JSON.stringify(f.state.error).includes('private provider detail'))
})
