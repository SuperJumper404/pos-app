const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const { buildKioskCheckoutPayload } = require('../helpers/kioskCheckout')
const { buildCheckoutIntentSignature } = require('../helpers/counterCheckout')
const memberId = '00000000-0000-4000-8000-000000000001'
const selection = { memberId, cardNumber: '0001234567890123', rewardId: 'coffee', confirmed: true, expectedDiscountCents: 200, totalCents: 800 }
const params = { customer: 'Client', phone: '0612345678', servicePointId: 5, total: 10, payment: 'À encaisser', dataCart: [{ id: 21, qty: 1, price: 10 }] }

function loadComponent(relative = 'components/loyalty/LoyaltyKiosk.vue') {
  const file = path.join(__dirname, '..', relative)
  assert(fs.existsSync(file), 'the kiosk loyalty component must exist')
  const sfc = require('vue-template-compiler').parseComponent(fs.readFileSync(file, 'utf8'))
  assert.deepEqual(require('vue-template-compiler').compile(sfc.template.content).errors, [])
  const code = require('@babel/core').transformSync(sfc.script.content, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require'])(module, module.exports, name => {
    if (name.startsWith('@/components/') || name === '@/helpers/price' || (relative === 'pages/borne.vue' && !name.endsWith('kioskCheckout'))) return {}
    return require(name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name)
  })
  return module.exports.default
}
function component(dispatch) {
  const options = loadComponent()
  const events = []
  const ctx = { ...options.data(), servicePointId: 5, items: params.dataCart, grossTotal: 10, isTakeaway: false, disabled: false, attemptKey: 1, $store: { dispatch }, $emit: (name, payload) => events.push({ name, payload }) }
  for (const [name, fn] of Object.entries(options.methods)) ctx[name] = fn.bind(ctx)
  for (const [name, fn] of Object.entries(options.computed || {})) Object.defineProperty(ctx, name, { get: () => fn.call(ctx) })
  return { ctx, events, options }
}

test('kiosk checkout includes identified loyalty and the exact confirmed discount for both payment paths', () => {
  const terminal = buildKioskCheckoutPayload({ ...params, terminal: true, clientOrderToken: 'attempt', loyaltySelection: selection })
  assert.equal(terminal.loyalty_member_id, memberId); assert.equal(terminal.loyalty_expected_discount_cents, 200)
  assert.equal(terminal.expected_total, 10); assert.equal(terminal.loyalty_confirmed, true)
  const counter = buildKioskCheckoutPayload({ ...params, loyaltySelection: selection })
  assert.equal(counter.loyaltyMemberId, memberId); assert.equal(counter.loyaltyRewardId, 'coffee')
  const unconfirmed = buildKioskCheckoutPayload({ ...params, loyaltySelection: { ...selection, confirmed: false } })
  assert.equal(unconfirmed.loyaltyRewardId, undefined)
  assert.notEqual(buildCheckoutIntentSignature({ ...params, loyaltyMemberId: memberId }), buildCheckoutIntentSignature({ ...params, loyaltyMemberId: '00000000-0000-4000-8000-000000000002' }))
})
test('kiosk lookup emits accumulation intent and explicit redemption without requesting a telephone code', async () => {
  const calls = []
  const { ctx, events } = component((action, payload) => {
    calls.push({ action, payload })
    return action === 'loyalty/lookupKiosk' ? { id: memberId, cardNumber: selection.cardNumber, available: 50, rewards: [{ id: 'coffee', name: 'Café', points: 30, available: true }] }
      : { grossCents: 1000, discountCents: payload.rewardId ? 200 : 0, totalCents: payload.rewardId ? 800 : 1000, pointsCost: payload.rewardId ? 30 : 0 }
  })
  ctx.value = '0612345678'; await ctx.lookup()
  assert.equal(ctx.member.id, memberId)
  assert.equal(events.filter(event => event.name === 'change').at(-1).payload.rewardId, null)
  ctx.rewardId = 'coffee'; await ctx.previewReward()
  assert.equal(events.filter(event => event.name === 'change').at(-1).payload.rewardId, null, 'preview must not spend')
  ctx.confirmReward()
  assert.equal(events.at(-1).payload.rewardId, 'coffee'); assert.equal(events.at(-1).payload.expectedDiscountCents, 200)
  assert(calls.every(call => !/auth|code|challenge|enroll/i.test(call.action)))
})
test('kiosk reset discards a previous customer lookup arriving late', async () => {
  let finish
  const { ctx, events } = component(action => action === 'loyalty/lookupKiosk' ? new Promise(resolve => { finish = resolve }) : Promise.resolve(null))
  ctx.value = '0612345678'; const pending = ctx.lookup()
  ctx.reset(); finish({ id: memberId, available: 50, rewards: [] }); await pending
  assert.equal(ctx.member, null); assert.equal(events.filter(event => event.name === 'change').at(-1).payload, null)
})
test('the actual kiosk submits counter payment or a server-verified free order according to the confirmed selection', async () => {
  const options = loadComponent('pages/borne.vue')
  for (const [free, expected] of [[false, 'À encaisser'], [true, 'loyalty_zero_total']]) {
    let paymentMode
    const ctx = { checkoutDisabled: false, checkoutLoading: null, loyaltyIsFree: free,
      buildPayload: payment => { paymentMode = payment; return { payment } },
      $store: { dispatch: () => Promise.resolve({ ok: true, data: { orderId: 1 } }) }, finishCheckout: () => Promise.resolve() }
    await options.methods.submitPayAtCounter.call(ctx)
    assert.equal(paymentMode, expected); assert.equal(ctx.checkoutFinalized, true)
  }
})
