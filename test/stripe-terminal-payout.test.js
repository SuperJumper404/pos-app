const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

const root = path.resolve(__dirname, '..')
const pagePath = path.join(root, 'pages/cashregister/payout/_id.vue')
const terminalMethod = 'stripe_terminal'
const reader = {
  id: 7, label: 'Caisse S710', serialNumber: '123', deviceType: 'stripe_s710',
  status: 'online', isActive: true, assignedUserId: 4, assignedServicePointId: null,
}
const order = (id = 1, extra = {}) => ({
  id, ordernumber: `A${id}`, subtotal: 12, payment_status: 'unpaid',
  payment: 'Paiement au comptoir', ...extra,
})
const payment = (status = 'processing', extra = {}) => {
  const dto = { id: 91, readerId: 7, status, amountCents: 1200, currency: 'eur',
    orderIds: [1], failureCode: null, failureMessage: null, ...extra }
  if (status === 'succeeded' && !dto.allocations) dto.allocations = dto.orderIds.map(orderId => ({
    orderId, amountCents: dto.amountCents / dto.orderIds.length,
  }))
  return dto
}
const deferred = () => {
  let settle
  const promise = new Promise((resolve) => { settle = resolve })
  return { promise, resolve: settle }
}
const storage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const make = (options = {}) => {
  const calls = []
  const timers = new Map()
  let timerId = 0
  const sessionStorage = options.storage || storage()
  const state = {
    orders: options.orders || [order()], reader: { ...reader }, activePayment: null,
    error: null, authenticated: true, user: { id: 4, shopid: 2 },
  }
  const responses = {}
  const load = (filename) => {
    if (!fs.existsSync(filename)) return {}
    let source = fs.readFileSync(filename, 'utf8')
    if (filename.endsWith('.vue')) source = compiler.parseComponent(source).script.content
    const code = babel.transformSync(source, {
      babelrc: false, configFile: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code
    const module = { exports: {} }
    vm.runInNewContext(code, {
      module, exports: module.exports,
      require: (name) => {
        if (name.startsWith('@/') || name.startsWith('.')) {
          let target = name.startsWith('@/')
            ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name)
          if (!path.extname(target)) target += '.js'
          return load(target)
        }
        return require(name)
      },
      sessionStorage,
      setTimeout: (callback, delay) => {
        assert.ok(delay >= 1000 && delay <= 10000, 'Polling interval must be bounded')
        const id = ++timerId
        timers.set(id, callback)
        return id
      },
      clearTimeout: (id) => timers.delete(id),
    }, { filename })
    return module.exports
  }
  const page = load(pagePath).default
  const route = { params: { id: 'Table 1' }, query: { modals: 'true', orders: state.orders.map(x => x.id) }, path: '/cashregister/payout/Table%201' }
  const instance = {
    $route: route,
    $router: {
      push: (value) => { calls.push({ name: 'navigate', payload: value }); return Promise.resolve() },
      replace: (value) => { calls.push({ name: 'replace', payload: value }); return Promise.resolve() },
    },
    $store: {
      get: (key) => ({
        authenticated: state.authenticated,
        'users/user': state.user,
        'orders/dataOrders': state.orders,
        'orders/detailOrder': [],
        'stripeTerminal/currentReader': state.reader,
        'stripeTerminal/activePayment': state.activePayment,
        'stripeTerminal/error': state.error,
        'shop/shop_payment_methods': ['Espèces', 'Carte bancaire'],
      })[key],
      dispatch: async (name, payload) => {
        await Promise.resolve()
        calls.push({ name, payload })
        if (Object.hasOwnProperty.call(responses, name)) {
          const answer = responses[name]
          return typeof answer === 'function' ? answer(payload) : answer
        }
        if (name === 'stripeTerminal/getCurrentReader') return state.reader
        if (name === 'stripeTerminal/startPayment') {
          state.activePayment = payment()
          return state.activePayment
        }
        if (name === 'stripeTerminal/refreshPayment') return state.activePayment || payment()
        if (name === 'stripeTerminal/cancelPayment') return payment('canceled')
        return true
      },
    },
  }
  Object.assign(instance, page.data.call(instance))
  instance.$options = page
  for (const mixin of page.mixins || []) Object.assign(instance, mixin.methods)
  for (const [name, method] of Object.entries(page.methods)) instance[name] = method.bind(instance)
  for (const [name, getter] of Object.entries(page.computed)) {
    Object.defineProperty(instance, name, { get: () => getter.call(instance) })
  }
  const initialize = async () => { await page.mounted.call(instance) }
  const tick = async () => {
    const next = timers.entries().next().value
    assert.ok(next, 'Expected a scheduled status refresh')
    timers.delete(next[0])
    await next[1]()
  }
  return { instance, state, calls, responses, timers, initialize, tick, page, storage: sessionStorage, load }
}

const tests = []
const test = (name, run) => tests.push({ name, run })
const count = (h, name) => h.calls.filter(call => call.name === name).length
const noSettlement = (h) => {
  assert.strictEqual(h.instance.receiptDialog, false)
  assert.strictEqual(count(h, 'orders/archiveOrder'), 0)
}
const start = async (h) => {
  await h.initialize()
  h.instance.selectedPaymentMethod = terminalMethod
  await h.instance.requestReceiptChoice()
}

test('manual methods retain receipt choice then archive with their original method', async () => {
  for (const method of ['Espèces', 'Carte bancaire']) {
    const h = make()
    await h.initialize()
    h.instance.selectedPaymentMethod = method
    await h.instance.requestReceiptChoice()
    assert.strictEqual(h.instance.receiptDialog, true)
    assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
    await h.instance.confirmReceiptChoice(false)
    assert.strictEqual(h.calls.find(x => x.name === 'orders/archiveOrder').payload.payment_method, method)
  }
})

test('Terminal choice requires the authenticated current cashier and active assignment', async () => {
  const h = make()
  await h.initialize()
  assert.ok(Array.isArray(h.instance.paymentMethods), 'Terminal-aware payment choices must exist')
  assert.ok(h.instance.paymentMethods.includes(terminalMethod))
  for (const patch of [{ isActive: false }, { assignedUserId: 99 }, { assignedUserId: null }]) {
    h.state.reader = { ...reader, ...patch }
    assert.ok(!h.instance.paymentMethods.includes(terminalMethod))
  }
  h.state.reader = reader
  h.state.authenticated = false
  assert.ok(!h.instance.paymentMethods.includes(terminalMethod))
})

test('Terminal starts before receipt, sends IDs and cent discount only, and blocks double clicks', async () => {
  const h = make()
  await h.initialize()
  h.instance.selectedPaymentMethod = terminalMethod
  h.instance.discountType = 'amount'
  h.instance.discountValue = 1.25
  const pending = deferred()
  h.responses['stripeTerminal/startPayment'] = pending.promise
  const first = h.instance.requestReceiptChoice()
  await Promise.resolve()
  await h.instance.requestReceiptChoice()
  for (let i = 0; i < 10; i++) await Promise.resolve()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
  noSettlement(h)
  assert.strictEqual(h.instance.confirmDisabled, true)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(h.calls.find(x => x.name === 'stripeTerminal/startPayment').payload)), {
    orderIds: [1], discountType: 'amount', discountValue: 125,
  })
  pending.resolve(payment())
  await first
  assert.strictEqual(h.instance.terminalState, 'processing')
  assert.strictEqual(h.timers.size, 1)
})

test('only local succeeded opens receipt and archives without a manual payment override', async () => {
  const h = make()
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded')
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })]
    return true
  }
  await h.tick()
  assert.strictEqual(h.timers.size, 0)
  assert.strictEqual(h.instance.receiptDialog, true)
  assert.strictEqual(h.instance.terminalState, 'succeeded')
  await h.instance.confirmReceiptChoice(false)
  assert.strictEqual(h.calls.find(x => x.name === 'orders/archiveOrder').payload.payment_method, null)
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
})

for (const status of ['failed', 'canceled']) {
  test(`${status} stops polling and keeps orders due`, async () => {
    const h = make()
    await start(h)
    h.responses['stripeTerminal/refreshPayment'] = payment(status)
    await h.tick()
    assert.strictEqual(h.timers.size, 0)
    assert.strictEqual(h.instance.terminalState, status)
    assert.strictEqual(h.instance.paymentSummary.dueAmount, 12)
    noSettlement(h)
  })
}

test('refresh errors enter recovery without another start or archive', async () => {
  const h = make()
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = false
  await h.tick()
  assert.strictEqual(h.instance.terminalState, 'recovery')
  assert.strictEqual(h.timers.size, 0)
  await h.instance.retryTerminalPayment()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
  noSettlement(h)
})

test('polling has a finite budget and a manual recovery action', async () => {
  const h = make()
  await start(h)
  let attempts = 0
  while (h.timers.size && attempts < 200) { await h.tick(); attempts++ }
  assert.ok(attempts > 0 && attempts < 200)
  assert.strictEqual(h.instance.terminalState, 'recovery')
  noSettlement(h)
})

test('reload resumes a remembered local payment ID without starting another payment', async () => {
  const first = make()
  await start(first)
  first.page.beforeDestroy.call(first.instance)
  const h = make({ storage: first.storage })
  await h.initialize()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(h.calls.find(x => x.name === 'stripeTerminal/refreshPayment').payload, 91)
  assert.strictEqual(h.instance.terminalState, 'processing')
  noSettlement(h)
})

test('in-memory session discovery refreshes a matching active session', async () => {
  const h = make()
  h.state.activePayment = payment()
  await h.initialize()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(count(h, 'stripeTerminal/refreshPayment'), 1)
  noSettlement(h)
})

test('paid-but-unarchived reload closes through receipt/archive without startPayment', async () => {
  const h = make({ orders: [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })] })
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded')
  await h.initialize()
  await h.instance.requestReceiptChoice()
  assert.strictEqual(h.instance.receiptDialog, true)
  await h.instance.confirmReceiptChoice(false)
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(count(h, 'orders/archiveOrder'), 1)
})

test('partial archive failure retries only remaining paid orders', async () => {
  const h = make({ orders: [order(), order(2)] })
  h.responses['stripeTerminal/startPayment'] = payment('processing', { orderIds: [1, 2], amountCents: 2400 })
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { orderIds: [1, 2], amountCents: 2400 })
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = h.state.orders.map(o => ({ ...o, payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 }))
    return true
  }
  await h.tick()
  h.responses['orders/archiveOrder'] = ({ id }) => id === 1
  await h.instance.confirmReceiptChoice(false)
  assert.deepStrictEqual(Array.from(h.instance.ordersToArchive), [2])
  assert.strictEqual(h.instance.requiresPaymentMethod, false)
  h.responses['orders/archiveOrder'] = true
  await h.instance.requestReceiptChoice()
  await h.instance.confirmReceiptChoice(false)
  assert.deepStrictEqual(h.calls.filter(x => x.name === 'orders/archiveOrder').map(x => x.payload.id), [1, 2, 2])
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
})

test('cancel is locked until acknowledged and a processing reply is not cancellation', async () => {
  const h = make()
  await start(h)
  const pending = deferred()
  h.responses['stripeTerminal/cancelPayment'] = pending.promise
  const cancel = h.instance.cancelTerminalPayment()
  await h.instance.cancelTerminalPayment()
  assert.strictEqual(count(h, 'stripeTerminal/cancelPayment'), 1)
  assert.strictEqual(h.instance.terminalCanceling, true)
  assert.strictEqual(h.timers.size, 0)
  noSettlement(h)
  pending.resolve(payment())
  await cancel
  assert.strictEqual(h.instance.terminalState, 'processing')
  assert.strictEqual(h.timers.size, 1)
  assert.ok(h.instance.terminalNotice)
})

test('destroy invalidates an in-flight start and never schedules polling afterward', async () => {
  const h = make()
  await h.initialize()
  h.instance.selectedPaymentMethod = terminalMethod
  const pending = deferred()
  h.responses['stripeTerminal/startPayment'] = pending.promise
  const request = h.instance.requestReceiptChoice()
  for (let i = 0; i < 10; i++) await Promise.resolve()
  h.page.beforeDestroy.call(h.instance)
  pending.resolve(payment('succeeded'))
  await request
  assert.strictEqual(h.timers.size, 0)
  noSettlement(h)
})

test('destroy clears a scheduled poll and stale poll cannot open receipt', async () => {
  const h = make()
  await start(h)
  const pending = deferred()
  h.responses['stripeTerminal/refreshPayment'] = pending.promise
  const request = h.tick()
  request.catch(() => {})
  h.page.beforeDestroy.call(h.instance)
  pending.resolve(payment('succeeded'))
  await request
  assert.strictEqual(h.timers.size, 0)
  noSettlement(h)
})

test('uncertain start recovery first refreshes paid orders and never starts again', async () => {
  const h = make()
  h.responses['stripeTerminal/startPayment'] = false
  await start(h)
  assert.strictEqual(h.instance.terminalState, 'recovery')
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded')
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })]
    return true
  }
  await h.instance.retryTerminalPayment()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
  assert.strictEqual(h.instance.receiptDialog, true)
})

test('unrelated returned payment cannot settle the selection', async () => {
  const h = make()
  h.responses['stripeTerminal/startPayment'] = payment('succeeded', { orderIds: [99] })
  await start(h)
  assert.strictEqual(h.instance.terminalState, 'idle')
  assert.ok(h.instance.terminalNotice.includes('autres commandes'))
  noSettlement(h)
})

test('failed order refresh blocks payment and archive even with cached orders', async () => {
  const h = make()
  h.responses['orders/getAllOrder'] = false
  await h.initialize()
  h.instance.selectedPaymentMethod = terminalMethod
  await h.instance.requestReceiptChoice()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  noSettlement(h)
})

test('receipt and archive cannot be called directly while Terminal is processing', async () => {
  const h = make()
  await start(h)
  await h.instance.confirmReceiptChoice(false)
  await h.instance.btnYes(false)
  noSettlement(h)
})

test('Terminal status renders semantic, accessible states and safe recovery actions', () => {
  const filename = path.join(root, 'components/cashregister/TerminalPaymentStatus.vue')
  assert.ok(fs.existsSync(filename), 'Terminal status component must exist')
  const parsed = compiler.parseComponent(fs.readFileSync(filename, 'utf8'))
  const compiled = compiler.compile(parsed.template.content)
  assert.deepStrictEqual(compiled.errors, [])
  const component = vm.compileFunction(parsed.script.content.replace('export default', 'return'), [])()
  for (const state of ['idle', 'starting', 'processing', 'succeeded', 'failed', 'canceled', 'recovery']) {
    const title = component.computed.title.call({ state, canceling: false })
    assert.ok(typeof title === 'string' && title.length > 0, `Missing ${state} heading`)
  }
  assert.ok(component.computed.title.call({ state: 'processing', canceling: true }).includes('Annulation'))
})

test('reader refresh failure cannot expose a previously cached Terminal choice', async () => {
  const h = make()
  h.responses['stripeTerminal/getCurrentReader'] = false
  await h.initialize()
  assert.ok(!h.instance.paymentMethods.includes(terminalMethod))
})

test('route change clears the timer and ignores the previous payment response', async () => {
  const h = make()
  await start(h)
  const pending = deferred()
  h.responses['stripeTerminal/refreshPayment'] = pending.promise
  const poll = h.tick()
  await Promise.resolve()
  const to = { params: { id: 'Table 2' }, query: { orders: [2], modals: 'true' }, path: '/cashregister/payout/Table%202' }
  h.state.orders = [order(2)]
  h.instance.$route = to
  await h.page.watch.$route.call(h.instance, to)
  pending.resolve(payment('succeeded'))
  await poll
  assert.strictEqual(h.instance.id, 'Table 2')
  assert.strictEqual(h.timers.size, 0)
  noSettlement(h)
})

test('leaving the payout never reinitializes its watcher on the parent route', async () => {
  const h = make()
  await start(h)
  const before = count(h, 'orders/getAllOrder')
  const to = { path: '/cashregister', params: {}, query: {} }
  h.page.beforeRouteLeave.call(h.instance, to, h.instance.$route, () => {})
  h.instance.$route = to
  await h.page.watch.$route.call(h.instance, to)
  assert.strictEqual(count(h, 'orders/getAllOrder'), before)
  assert.strictEqual(h.timers.size, 0)
})

test('cancel success race follows confirmed payment into receipt choice', async () => {
  const h = make()
  await start(h)
  h.responses['stripeTerminal/cancelPayment'] = payment('succeeded')
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })]
    return true
  }
  await h.instance.cancelTerminalPayment()
  assert.strictEqual(h.instance.terminalState, 'succeeded')
  assert.strictEqual(h.instance.receiptDialog, true)
  assert.strictEqual(h.timers.size, 0)
})

test('confirmed Terminal archive never reapplies the pre-payment discount', async () => {
  const h = make()
  await h.initialize()
  h.instance.discountType = 'amount'
  h.instance.discountValue = 1.25
  h.instance.selectedPaymentMethod = terminalMethod
  await h.instance.requestReceiptChoice()
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { amountCents: 1075 })
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { subtotal: 10.75, payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })]
    return true
  }
  await h.tick()
  await h.instance.confirmReceiptChoice(false)
  const archive = h.calls.find(x => x.name === 'orders/archiveOrder').payload
  assert.strictEqual(archive.discountType, undefined)
  assert.strictEqual(archive.discountValue, undefined)
})

test('unreliable archive refresh retains paid retry IDs and never requests another payment', async () => {
  const h = make({ orders: [order(), order(2)] })
  h.responses['stripeTerminal/startPayment'] = payment('processing', { orderIds: [1, 2], amountCents: 2400 })
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { orderIds: [1, 2], amountCents: 2400 })
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = h.state.orders.map(o => ({ ...o, payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 }))
    return true
  }
  await h.tick()
  h.responses['orders/getAllOrder'] = () => { h.state.orders = []; return false }
  h.responses['orders/archiveOrder'] = ({ id }) => id === 1
  await h.instance.confirmReceiptChoice(false)
  assert.strictEqual(h.instance.requiresPaymentMethod, false)
  assert.deepStrictEqual(Array.from(h.instance.ordersToArchive), [2])
  h.responses['orders/archiveOrder'] = true
  await h.instance.requestReceiptChoice()
  await h.instance.confirmReceiptChoice(false)
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
  assert.deepStrictEqual(h.calls.filter(x => x.name === 'orders/archiveOrder').map(x => x.payload.id), [1, 2, 2])
})

test('cashier switch invalidates pending work and cannot offer a previous receipt', async () => {
  const h = make()
  await start(h)
  const pending = deferred()
  h.responses['stripeTerminal/refreshPayment'] = pending.promise
  const poll = h.tick()
  h.state.user = { id: 99, shopid: 2 }
  h.page.watch.cashierIdentity.call(h.instance)
  pending.resolve(payment('succeeded'))
  await poll
  assert.strictEqual(h.timers.size, 0)
  assert.strictEqual(h.instance.dialog, false)
  noSettlement(h)
})

test('manual partial archive retry can settle its remaining due order by Terminal', async () => {
  const h = make()
  await h.initialize()
  h.instance.selectedPaymentMethod = 'Espèces'
  h.responses['orders/archiveOrder'] = false
  await h.instance.requestReceiptChoice()
  await h.instance.confirmReceiptChoice(false)
  assert.strictEqual(h.instance.retryActive, true)
  h.instance.selectedPaymentMethod = terminalMethod
  await h.instance.requestReceiptChoice()
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded')
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })]
    return true
  }
  await h.tick()
  assert.strictEqual(h.instance.receiptDialog, true)
  assert.strictEqual(h.instance.requiresPaymentMethod, false)
})

test('completed archive can leave while an unfinished archive blocks route changes', async () => {
  const h = make()
  await h.initialize()
  h.instance.loadingBtn = true
  const answers = []
  h.page.beforeRouteLeave.call(h.instance, {}, {}, value => answers.push(value))
  h.instance.dialog = false
  h.page.beforeRouteLeave.call(h.instance, {}, {}, value => answers.push(value))
  assert.deepStrictEqual(answers, [false, undefined])
})

test('cancellation control stays present but locked during cancellation confirmation', async () => {
  const h = make()
  await start(h)
  const pending = deferred()
  h.responses['stripeTerminal/cancelPayment'] = pending.promise
  const cancel = h.instance.cancelTerminalPayment()
  assert.strictEqual(h.instance.canCancelTerminalPayment, true)
  assert.strictEqual(h.instance.terminalBusy, true)
  await h.instance.cancelTerminalPayment()
  pending.resolve(payment('canceled'))
  await cancel
  assert.strictEqual(count(h, 'stripeTerminal/cancelPayment'), 1)
})

test('a fresh retry after final failure receives a new bounded polling budget', async () => {
  const h = make()
  await start(h)
  h.instance.terminalPollCount = 59
  h.responses['stripeTerminal/refreshPayment'] = payment('failed')
  await h.tick()
  h.state.activePayment = payment('failed')
  await h.instance.requestReceiptChoice()
  assert.strictEqual(h.instance.terminalState, 'processing')
  assert.strictEqual(h.timers.size, 1)
})

test('raw service messages never enter the payment status copy', async () => {
  const h = make()
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = payment('failed', { failureCode: 'raw-unknown', failureMessage: 'secret-stripe-message' })
  await h.tick()
  assert.ok(!h.instance.terminalNotice.includes('secret-stripe-message'))
  assert.ok(!h.instance.terminalNotice.includes('raw-unknown'))
})

test('recovery matching requires exact, order-insensitive due IDs', () => {
  const { matchesCashRegisterTerminalAttempt: matches } = require('../helpers/cashRegister')
  assert.strictEqual(matches({ orderIds: [1, 2] }, [2, 1]), true)
  for (const ids of [[1], [1, 2, 3], [2, 3], [], [1, 1]]) {
    assert.strictEqual(matches({ orderIds: [1, 2] }, ids), false)
  }
})

test('unmatched unknown recovery is never replayed on subset or superset reload', async () => {
  for (const ids of [[1], [1, 2, 3]]) {
    const saved = storage()
    saved.setItem('cashregister-terminal:2:4', JSON.stringify({ orderIds: [1, 2], discountType: 'none', discountValue: 0 }))
    const h = make({ storage: saved, orders: ids.map(id => order(id)) })
    await h.initialize()
    assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
    noSettlement(h)
  }
})

test('recovery records preserve unresolved A when B is recorded and resolved', async () => {
  const h = make()
  await h.initialize()
  h.instance.rememberTerminalAttempt({ orderIds: [1], paymentId: 91 })
  h.instance.rememberTerminalAttempt({ orderIds: [2], paymentId: 92 })
  let saved = JSON.parse(h.storage.getItem('cashregister-terminal:2:4'))
  assert.strictEqual(saved.version, 2)
  assert.strictEqual(Object.keys(saved.records).length, 2)
  h.instance.rememberTerminalAttempt(null)
  saved = JSON.parse(h.storage.getItem('cashregister-terminal:2:4'))
  assert.deepStrictEqual(Object.values(saved.records).map(x => x.paymentId), [91])
  const reloaded = make({ storage: h.storage })
  await reloaded.initialize()
  assert.strictEqual(count(reloaded, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(reloaded.instance.terminalPayment.id, 91)
})

test('A processing then B attempted then reload A never loses or repays A', async () => {
  const a = make()
  await start(a)
  a.page.beforeDestroy.call(a.instance)
  const b = make({ storage: a.storage, orders: [order(2)] })
  b.responses['stripeTerminal/startPayment'] = payment()
  await start(b)
  assert.strictEqual(b.instance.terminalPayment.id, 91)
  assert.ok(b.instance.terminalNotice.includes('autres commandes'))
  noSettlement(b)
  b.page.beforeDestroy.call(b.instance)
  const reloaded = make({ storage: a.storage })
  await reloaded.initialize()
  assert.strictEqual(count(reloaded, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(reloaded.instance.terminalPayment.id, 91)
})

test('known mismatched session reconciles by ID without replaying unselected orders', async () => {
  const saved = storage()
  saved.setItem('cashregister-terminal:2:4', JSON.stringify({ orderIds: [1, 2], paymentId: 91 }))
  const h = make({ storage: saved })
  h.responses['stripeTerminal/refreshPayment'] = payment('processing', { orderIds: [1, 2], amountCents: 2400 })
  await h.initialize()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(h.instance.terminalPayment.id, 91)
  noSettlement(h)
})

test('a settled allocation supplies the receipt total and discount rather than the stale order subtotal', async () => {
  const h = make()
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { amountCents: 1075 })
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 })]
    return true
  }
  await h.tick()
  const printed = []
  h.instance.printReceiptsForOrders = orders => printed.push(...orders)
  await h.instance.confirmReceiptChoice(true)
  assert.strictEqual(printed[0].subtotal, 10.75)
  assert.strictEqual(printed[0].subtotal_before_discount, 12)
  assert.strictEqual(printed[0].discount_amount, 1.25)
  const { buildCashierReceiptPayload } = require('../helpers/cashierReceipt')
  const receipt = buildCashierReceiptPayload({ order: printed[0], details: [], shopInfo: {} })
  assert.strictEqual(receipt.totalAmount, 10.75)
  assert.strictEqual(receipt.discountAmount, 1.25)
  assert.strictEqual(receipt.subtotalBeforeDiscount, 12)
})

test('recovery explicitly switches the real store away from another cached payment ID', async () => {
  const h = make()
  await h.initialize()
  const real = h.load(path.join(root, 'store/stripeTerminal.js'))
  const terminal = real.state()
  terminal.activePayment = payment('processing', { id: 92, orderIds: [2] })
  const previousGet = h.instance.$store.get
  h.instance.$store.get = key => key === 'stripeTerminal/activePayment' ? terminal.activePayment : previousGet(key)
  const previousDispatch = h.instance.$store.dispatch
  const localDispatch = (name, payload) => { terminal[name.slice(4)] = payload }
  h.instance.$store.dispatch = (name, payload) => {
    if (!['stripeTerminal/resetPayment', 'stripeTerminal/refreshPayment'].includes(name)) return previousDispatch(name, payload)
    h.calls.push({ name, payload })
    return real.actions[name.split('/')[1]].call({ $axios: {
      get: () => Promise.resolve({ data: { code: 200, success: true, data: payment() } }),
    } }, { state: terminal, dispatch: localDispatch }, payload)
  }
  h.instance.terminalAttempt = { orderIds: [1], paymentId: 91 }
  await h.instance.retryTerminalPayment()
  assert.strictEqual(h.instance.terminalState, 'processing')
  assert.strictEqual(terminal.activePayment.id, 91)
  assert.ok(h.calls.findIndex(x => x.name === 'stripeTerminal/resetPayment') < h.calls.findIndex(x => x.name === 'stripeTerminal/refreshPayment'))
})

test('mixed selection archives only succeeded session orders then leaves the other order payable', async () => {
  const saved = storage()
  saved.setItem('cashregister-terminal:2:4', JSON.stringify({ orderIds: [1], paymentId: 91 }))
  const h = make({ storage: saved, orders: [order(), order(2)] })
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { amountCents: 1075 })
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 }), order(2)]
    return true
  }
  await h.initialize()
  assert.strictEqual(h.instance.receiptDialog, true)
  await h.instance.confirmReceiptChoice(false)
  assert.deepStrictEqual(h.calls.filter(x => x.name === 'orders/archiveOrder').map(x => x.payload.id), [1])
  assert.deepStrictEqual(Array.from(h.instance.ordersToArchive), [2])
  assert.strictEqual(h.instance.requiresPaymentMethod, true)
  assert.strictEqual(h.instance.paymentControlsLocked, false)
  assert.strictEqual(h.instance.dialog, 'true')
  h.responses['stripeTerminal/startPayment'] = payment('processing', { id: 92, orderIds: [2] })
  h.instance.selectPaymentMethod(terminalMethod)
  await h.instance.requestReceiptChoice()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
  assert.deepStrictEqual(Array.from(h.calls.find(x => x.name === 'stripeTerminal/startPayment').payload.orderIds), [2])
})

test('sub-minimum discounts keep the form editable and never create a recovery record', async () => {
  for (const [type, value] of [['percent', 100], ['amount', 11.51], ['amount', 20]]) {
    const h = make()
    await h.initialize()
    h.instance.selectedPaymentMethod = terminalMethod
    h.instance.discountType = type
    h.instance.discountValue = value
    await h.instance.requestReceiptChoice()
    assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
    assert.strictEqual(h.instance.terminalAttempt, null)
    assert.strictEqual(h.storage.getItem('cashregister-terminal:2:4'), null)
    assert.strictEqual(h.instance.paymentControlsLocked, false)
    h.instance.selectPaymentMethod('Espèces')
    assert.strictEqual(h.instance.selectedPaymentMethod, 'Espèces')
    noSettlement(h)
  }
})

test('close button is disabled throughout Terminal work', () => {
  const parsed = compiler.parseComponent(fs.readFileSync(pagePath, 'utf8'))
  const template = compiler.compile(parsed.template.content)
  const find = node => {
    if (node.attrsMap && node.attrsMap['aria-label'] === "Fermer la modal d'encaissement") return node
    return (node.children || []).map(find).find(Boolean)
  }
  const button = find(template.ast)
  assert.strictEqual(button.attrsMap[':disabled'], 'loadingBtn || terminalBusy')
})

test('paid recovery survives receipt dismissal and clears only after every allocated order closes', async () => {
  const h = make({ orders: [order(), order(2)] })
  h.responses['stripeTerminal/startPayment'] = payment('processing', { orderIds: [1, 2], amountCents: 2400 })
  await start(h)
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { orderIds: [1, 2], amountCents: 2150 })
  await h.tick()
  assert.strictEqual(Object.values(JSON.parse(h.storage.getItem('cashregister-terminal:2:4')).records)[0].paymentId, 91)
  h.page.beforeDestroy.call(h.instance)
  for (const id of [1, 2]) {
    const reloaded = make({ storage: h.storage, orders: [order(id)] })
    reloaded.responses['stripeTerminal/refreshPayment'] = payment('succeeded', { orderIds: [1, 2], amountCents: 2150 })
    await reloaded.initialize()
    assert.strictEqual(count(reloaded, 'stripeTerminal/startPayment'), 0)
    assert.strictEqual(reloaded.instance.terminalReceiptOrders[0].subtotal, 10.75)
    await reloaded.instance.confirmReceiptChoice(false)
    if (id === 1) assert.ok(h.storage.getItem('cashregister-terminal:2:4'))
    else assert.strictEqual(h.storage.getItem('cashregister-terminal:2:4'), null)
  }
})

test('reconciled unrelated paid A remains recoverable without preventing a new payment for B', async () => {
  const h = make({ orders: [order(2)] })
  h.storage.setItem('cashregister-terminal:2:4', JSON.stringify({ orderIds: [1], paymentId: 91 }))
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded')
  await start(h)
  noSettlement(h)
  assert.strictEqual(h.instance.paymentControlsLocked, false)
  assert.ok(h.storage.getItem('cashregister-terminal:2:4'))
  h.responses['stripeTerminal/startPayment'] = payment('processing', { id: 92, orderIds: [2] })
  await h.instance.requestReceiptChoice()
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 1)
  const ids = Object.values(JSON.parse(h.storage.getItem('cashregister-terminal:2:4')).records).map(x => x.paymentId)
  assert.deepStrictEqual(ids, [91, 92])
})

test('mixed receipt identifies only the settled orders and preserves a failed paid archive retry', async () => {
  const h = make({ orders: [order(), order(2)] })
  h.storage.setItem('cashregister-terminal:2:4', JSON.stringify({ orderIds: [1], paymentId: 91 }))
  h.responses['stripeTerminal/refreshPayment'] = payment('succeeded')
  await h.initialize()
  assert.strictEqual(h.instance.receiptOrderNumbers, '#A1')
  const template = compiler.parseComponent(fs.readFileSync(pagePath, 'utf8')).template.content
  assert.ok(/cashregister-receipt-modal__copy[\s\S]*?\{\{ receiptOrderNumbers \}\}/.test(template))
  h.responses['orders/archiveOrder'] = false
  h.responses['orders/getAllOrder'] = false
  await h.instance.confirmReceiptChoice(false)
  assert.deepStrictEqual(Array.from(h.instance.ordersToArchive), [1, 2])
  assert.deepStrictEqual(Array.from(h.instance.retryDueOrderIds), [2])
  h.responses['orders/archiveOrder'] = true
  await h.instance.requestReceiptChoice()
  await h.instance.confirmReceiptChoice(false)
  assert.deepStrictEqual(h.calls.filter(x => x.name === 'orders/archiveOrder').map(x => x.payload.id), [1, 1])
  assert.deepStrictEqual(Array.from(h.instance.ordersToArchive), [2])
  assert.strictEqual(h.instance.requiresPaymentMethod, true)
  assert.strictEqual(h.instance.paymentControlsLocked, false)
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
})

test('a selection paid elsewhere during preflight does not leave the form permanently starting', async () => {
  const h = make()
  await h.initialize()
  h.responses['orders/getAllOrder'] = () => {
    h.state.orders = [order(1, { payment_status: 'paid', payment: 'Espèces' })]
    return true
  }
  h.instance.selectPaymentMethod(terminalMethod)
  await h.instance.requestReceiptChoice()
  assert.strictEqual(h.instance.terminalState, 'idle')
  assert.strictEqual(h.instance.paymentControlsLocked, false)
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(h.storage.getItem('cashregister-terminal:2:4'), null)
})

test('successive paid sessions each use their own authoritative receipt without starting payment', async () => {
  const h = make({ orders: [order(1, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 91 }),
    order(2, { payment_status: 'paid', payment: 'Carte bancaire', payment_provider: 'stripe_terminal', stripe_terminal_payment_id: 92 })] })
  h.responses['stripeTerminal/refreshPayment'] = id => payment('succeeded', { id, orderIds: [id === 91 ? 1 : 2], amountCents: 1075 })
  await h.initialize()
  const printed = []
  h.instance.printReceiptsForOrders = orders => printed.push(...orders)
  await h.instance.confirmReceiptChoice(true)
  await h.instance.requestReceiptChoice()
  await h.instance.confirmReceiptChoice(true)
  assert.deepStrictEqual(printed.map(o => [o.id, o.subtotal]), [[1, 10.75], [2, 10.75]])
  assert.strictEqual(count(h, 'stripeTerminal/startPayment'), 0)
  assert.strictEqual(count(h, 'stripeTerminal/refreshPayment'), 2)
})

const run = async () => {
  let failed = 0
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`) } catch (error) {
      failed++
      console.error(`FAIL ${name}: ${error.message}`)
    }
  }
  console.log(`${tests.length - failed}/${tests.length} Terminal payout tests passed`)
  if (failed) process.exitCode = 1
}
run().catch(error => { console.error(error); process.exitCode = 1 })
