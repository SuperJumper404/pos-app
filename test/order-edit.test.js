const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
  canEditOrder,
  canStartComplementaryOrder,
  canUseOrderEditModal,
  editableOrderToCart,
  cartToOrderEditPayload,
  isOrderEditDirty,
} = require('../helpers/orderEdit')

const product = {
  id: 10,
  name: 'Menu',
  image: 'menu.webp',
  price: 8,
  customization_steps: [
    {
      product_step_id: 20,
      name: 'Boisson',
      choices: [
        {
          product_step_choice_id: 30,
          choice_name: 'Cola',
          extra_price: 1.5,
        },
      ],
    },
  ],
}

const editable = {
  order: {
    id: 42,
    ordernumber: '0042',
    subtotal: '19.00',
    status: 1,
    payment_status: 'unpaid',
    payment_provider: 'cash',
  },
  content_revision: 'revision-1',
  items: [
    {
      product_id: 10,
      quantity: 2,
      unit_price: 9.5,
      total: 19,
      selections: [
        { product_customization_step_choice_id: 30 },
      ],
      historical_customizations: [
        {
          product_customization_step_id: 20,
          product_customization_step_choice_id: 30,
          step_name: 'Boisson',
          choice_name: 'Cola',
          unit_extra_price: 1.5,
          choice_type: 'linked_product',
          linked_product_id: 11,
        },
      ],
      requires_reconfiguration: false,
    },
  ],
}

assert.strictEqual(canEditOrder(editable.order), true)
assert.strictEqual(
  canEditOrder({ ...editable.order, payment_status: 'requires_payment' }),
  true
)
assert.strictEqual(canEditOrder({ ...editable.order, status: 2 }), false)
assert.strictEqual(
  canEditOrder({ ...editable.order, payment_status: 'paid' }),
  false
)
assert.strictEqual(
  canStartComplementaryOrder({
    payment_provider: 'stripe',
    payment_status: 'paid',
  }),
  true
)
assert.strictEqual(canStartComplementaryOrder(editable.order), false)
assert.strictEqual(canUseOrderEditModal(0, editable.order), true)
assert.strictEqual(canUseOrderEditModal(2, editable.order), false)
assert.strictEqual(canUseOrderEditModal(3, editable.order), false)
assert.strictEqual(
  canUseOrderEditModal(0, { ...editable.order, status: 2 }),
  false
)

const cart = editableOrderToCart(editable, [product])
assert.strictEqual(cart[0].id, 10)
assert.strictEqual(cart[0].qty, 2)
assert.deepStrictEqual(cart[0].selectedChoiceIds, [30])
assert.deepStrictEqual(cart[0].selections, [
  {
    product_step_id: 20,
    product_step_choice_id: 30,
    step_name: 'Boisson',
    choice_name: 'Cola',
    extra_price: 1.5,
    choice_type: undefined,
    linked_product_id: null,
  },
])
assert.strictEqual(cart[0].configurationSignature, '10:30')

assert.deepStrictEqual(
  cartToOrderEditPayload({
    contentRevision: 'revision-1',
    expectedTotal: 19,
    isTakeaway: true,
    cart,
  }),
  {
    content_revision: 'revision-1',
    expected_total: 19,
    is_takeaway: true,
    items: [
      {
        product_id: 10,
        quantity: 2,
        selected_product_step_choice_ids: [30],
      },
    ],
  }
)
assert.strictEqual(isOrderEditDirty(cart, cart), false)
assert.strictEqual(isOrderEditDirty(cart, [{ ...cart[0], qty: 3 }]), true)

const storeSource = fs.readFileSync(
  require.resolve('../store/orderEdit.js'),
  'utf8'
)
for (const action of ['begin', 'save', 'cancel', 'retryPayment']) {
  assert.ok(storeSource.includes(`${action}(`), `missing ${action} action`)
}
assert.ok(
  storeSource.includes('/baseurl/api/v1/orders/$' + '{orderId}/edit'),
  'beginning an edit must load the editable order'
)
assert.ok(
  storeSource.includes('/baseurl/api/v1/orders/$' + '{state.orderId}/items'),
  'saving an edit must patch the order items endpoint'
)
assert.ok(
  storeSource.includes(
    '/baseurl/api/v1/stripe/orders/$' + '{orderId}/replacement-payment'
  ),
  'retrying payment must use the replacement payment endpoint'
)
assert.ok(
  storeSource.includes("dispatch('set/active', false)"),
  'cancelling or completing must clear the active edit session'
)
assert.ok(
  storeSource.includes("dispatch('set/orderId', Number(order.id))"),
  'the active session must retain the API order id'
)
assert.ok(
  storeSource.includes("dispatch('set/orderNumber', String(order.ordernumber))"),
  'the active session must retain the API order number'
)
assert.ok(
  storeSource.includes("dispatch('cart/setTotal', Number(order.subtotal), { root: true })"),
  'the active session must use the API order subtotal'
)

const usersSource = fs.readFileSync(require.resolve('../store/users.js'), 'utf8')
const axiosSource = fs.readFileSync(require.resolve('../plugins/axios.js'), 'utf8')
assert.ok(usersSource.includes("orderEdit/cancel"))
assert.ok(axiosSource.includes("orderEdit/cancel"))

const detailSource = fs.readFileSync(
  require.resolve('../pages/orders/detail/_id.vue'),
  'utf8'
)
const modalPath = '../components/orders/OrderEditModal.vue'
assert.doesNotThrow(() => require.resolve(modalPath))
const modalSource = fs.readFileSync(require.resolve(modalPath), 'utf8')
assert.ok(modalSource.includes('<v-dialog'))
assert.ok(modalSource.includes('fullscreen'))
assert.ok(modalSource.includes("step === 'menu'"))
assert.ok(modalSource.includes("step === 'cart'"))
assert.ok(modalSource.includes("orderEdit/cancel"))
assert.ok(detailSource.includes('<OrderEditModal'))
assert.ok(detailSource.includes('canOpenOrderEditModal'))
assert.ok(detailSource.includes('this.orderEditDialog = true'))
const takeawayChipPath = '../components/orders/TakeawayChip.vue'
assert.doesNotThrow(() => require.resolve(takeawayChipPath))
const takeawayChipSource = fs.readFileSync(
  require.resolve(takeawayChipPath),
  'utf8'
)
assert.ok(takeawayChipSource.includes('À emporter'))
assert.ok(detailSource.includes('<TakeawayChip'))
assert.ok(
  detailSource.includes('Modifier la commande'),
  'an unpaid editable order must expose the edit action'
)
assert.ok(
  detailSource.includes('@click="requestComplementaryOrder"'),
  'a paid Stripe order must expose the complementary-order action'
)
assert.ok(
  detailSource.includes('v-if="canOpenOrderEditModal && !loadPage"'),
  'the edit action must keep the kitchen and helper eligibility guards'
)
assert.ok(
  detailSource.includes('v-if="canStartComplementaryOrder && !loadPage"'),
  'the complementary action must keep the Stripe paid eligibility guard'
)
assert.ok(
  detailSource.includes('requestOrderEdit('),
  'the edit action must request a guarded start'
)
assert.ok(
  detailSource.includes('requestComplementaryOrder('),
  'the complementary action must request a guarded start'
)
assert.ok(
  detailSource.includes('startOrderEdit('),
  'the edit flow must start the edit session after confirmation'
)
assert.ok(
  detailSource.includes('startComplementaryOrder('),
  'the complementary flow must start a normal checkout after confirmation'
)
assert.ok(
  detailSource.includes('replaceCartDialog'),
  'replacing a non-empty local cart must require confirmation'
)
assert.ok(
  detailSource.includes("orderEdit/begin"),
  'starting an edit must hydrate the edit session through its store action'
)
assert.ok(
  detailSource.includes("orders/setComplementaryOrder"),
  'a complementary order must retain its customer and table prefill'
)
assert.ok(
  detailSource.includes("orderEdit/cancel"),
  'a complementary order must never retain an edit session'
)
assert.ok(
  detailSource.includes("this.$router.push('/menus')"),
  'a complementary order must still navigate to the catalogue'
)

const ordersSource = fs.readFileSync(require.resolve('../store/orders.js'), 'utf8')
assert.ok(
  ordersSource.includes('complementaryOrder: null'),
  'the complementary checkout prefill must be retained outside the edit session'
)
assert.ok(
  ordersSource.includes("dispatch('set/detailOrder', [])"),
  'loading order details must expose a stable error message'
)
assert.ok(
  ordersSource.includes('detailOrderRequestId: 0'),
  'detail requests must have a monotonically increasing guard'
)
assert.ok(
  ordersSource.indexOf("dispatch('set/detailOrder', [])") <
    ordersSource.indexOf(
      '.get(`/baseurl/api/v1/detailorder/$' + '{params}`'
    ),
  'starting a detail request must clear the singleton before the request'
)
assert.ok(
  detailSource.includes('detailLoadError'),
  'a failed detail load must leave an actionable error state'
)
assert.ok(
  detailSource.includes('async loadOrderDetail('),
  'detail loading must be shared by initial and route-change navigation'
)
assert.ok(
  detailSource.includes("'$route.params.id'"),
  'changing the detail route must reload the requested order'
)
assert.ok(
  detailSource.includes('loadedOrderId'),
  'order actions must only read a detail matching the current route'
)
assert.ok(
  detailSource.includes('finally'),
  'the loading state must be cleared after successful and failed requests'
)
assert.ok(
  detailSource.includes('v-if="canOpenOrderEditModal && !loadPage"'),
  'the edit action must be hidden while another detail is loading'
)
assert.ok(
  detailSource.includes('v-if="canStartComplementaryOrder && !loadPage"'),
  'the complementary action must be hidden while another detail is loading'
)

assert.ok(
  storeSource.includes('beginRequestId: 0'),
  'a deferred edit begin must carry an invalidatable request generation'
)
assert.ok(
  storeSource.includes('invalidateBegin('),
  'the edit session must expose explicit begin invalidation'
)
assert.ok(
  storeSource.includes('state.beginRequestId !== requestId'),
  'a late edit response must not hydrate a superseded order session or cart'
)
assert.ok(
  detailSource.includes("'orderEdit/invalidateBegin'"),
  'a detail route change must invalidate an in-flight edit begin'
)
assert.ok(
  detailSource.includes('isCurrentOrderDetail('),
  'deferred detail actions must recheck their captured route and order id'
)
assert.ok(
  detailSource.includes('await this.$store.dispatch(\'cart/abandonCheckout\''),
  'the complementary action must model its deferred checkout cleanup'
)
assert.ok(
  detailSource.includes('await this.$store.dispatch(\'orderEdit/cancel\')'),
  'the complementary action must model its deferred edit cleanup'
)
assert.ok(
  detailSource.includes('this.isCurrentOrderDetail(orderId, actionRequestId)'),
  'a delayed complementary flow must not alter the cart, session, or prefill for a new route'
)

const menusSource = fs.readFileSync(require.resolve('../pages/menus.vue'), 'utf8')
const cartSource = fs.readFileSync(require.resolve('../pages/cart.vue'), 'utf8')
assert.ok(cartSource.includes('cart-checkout-actions--embedded'))
assert.ok(cartSource.includes("grid-template-areas: 'save save' 'menu cancel'"))
assert.ok(
  !menusSource.includes('OrderEditBanner') &&
    !cartSource.includes('OrderEditBanner') &&
    !fs.existsSync(
      path.join(__dirname, '..', 'components', 'orders', 'OrderEditBanner.vue')
    ),
  'the redundant order edit banner must be removed'
)
assert.ok(
  cartSource.includes('Enregistrer les modifications'),
  'the cart primary action must describe the order edit save'
)
assert.ok(
  cartSource.includes("'orderEdit/retryPayment'"),
  'a failed replacement payment must expose the current retry action'
)

const loadOrderEditStore = () => {
  const executable = storeSource
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace(/export const /g, 'const ')
    .concat('\nreturn { state, actions }')

  // eslint-disable-next-line no-new-func
  return new Function(
    'EasyAccess',
    'defaultMutations',
    'cartToOrderEditPayload',
    'editableOrderToCart',
    'isOrderEditDirty',
    executable
  )(
    () => ({}),
    () => ({}),
    cartToOrderEditPayload,
    editableOrderToCart,
    isOrderEditDirty
  )
}

const loadPageOptions = (source, dependencies, values) => {
  const executable = source
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace(
      /const \{\s*isCounterPaymentAllowed,\s*isQrClientAccess,\s*\} = require\([^\n]+\)/m,
      ''
    )
    .replace(
      /const \{\s*shouldAutoPrepareStripeCheckout\s*\} = require\([^\n]+\)/m,
      ''
    )
    .replace('export default', 'return')

  // eslint-disable-next-line no-new-func
  return new Function(...dependencies, executable)(...values)
}

const runCartEditContracts = async () => {
  const orderEditStore = loadOrderEditStore()
  const previousLocalStorage = global.localStorage
  global.localStorage = { getItem: () => 'token' }
  try {
    const emptyState = {
      ...orderEditStore.state(),
      active: true,
      orderId: 42,
      orderNumber: '0042',
      contentRevision: 'revision-1',
    }
    let emptyPatch
    const emptyDispatches = []
    const emptyDispatch = (type, payload) => {
      emptyDispatches.push([type, payload])
      if (type.startsWith('set/')) {
        emptyState[type.slice(4)] = payload
      } else if (type === 'complete') {
        return orderEditStore.actions.complete({
          dispatch: emptyDispatch,
          state: emptyState,
        })
      } else if (type === 'cancel') {
        return orderEditStore.actions.cancel({
          dispatch: emptyDispatch,
          state: emptyState,
        })
      }
      return null
    }
    const emptyResult = await orderEditStore.actions.save.call(
      {
        $axios: {
          patch(url, payload) {
            emptyPatch = { url, payload }
            return Promise.resolve({
              data: { data: { order_id: 42, canceled: true, total: 0 } },
            })
          },
        },
      },
      {
        dispatch: emptyDispatch,
        state: emptyState,
        rootState: { cart: { dataCart: null, totalCart: 0 } },
      }
    )
    assert.strictEqual(emptyResult.ok, true)
    assert.deepStrictEqual(emptyPatch.payload.items, [])
    assert.strictEqual(emptyState.active, false)
    assert.ok(
      emptyDispatches.some(
        ([type, payload]) => type === 'cart/setTocart' && payload === null
      ),
      'a successful empty save must clean the cart session'
    )

    const refreshState = {
      ...orderEditStore.state(),
      active: true,
      orderId: 42,
      orderNumber: '0042',
      contentRevision: 'revision-1',
      originalCart: cart,
      dirty: true,
      paymentProvider: 'stripe',
      paymentStatus: 'requires_payment',
    }
    const refreshDispatches = []
    const refreshDispatch = (type, payload) => {
      refreshDispatches.push([type, payload])
      if (type.startsWith('set/')) refreshState[type.slice(4)] = payload
      return null
    }
    const refreshPayment = {
      orderId: 42,
      paymentIntentId: 'pi_new',
      clientSecret: 'secret',
      publishableKey: 'pk_test',
    }
    const refreshResult = await orderEditStore.actions.save.call(
      {
        $axios: {
          patch: () =>
            Promise.resolve({
              data: {
                data: {
                  order_id: 42,
                  content_revision: 'revision-2',
                  total: 19,
                  payment_status: 'requires_payment',
                  payment_refresh: 'succeeded',
                  payment: refreshPayment,
                },
              },
            }),
        },
      },
      {
        dispatch: refreshDispatch,
        state: refreshState,
        rootState: { cart: { dataCart: cart, totalCart: 19 } },
      }
    )
    assert.strictEqual(refreshResult.ok, true)
    assert.strictEqual(refreshState.active, true)
    assert.strictEqual(refreshState.dirty, false)
    assert.strictEqual(refreshState.contentRevision, 'revision-2')
    assert.strictEqual(refreshState.paymentRefresh, 'succeeded')
    assert.deepStrictEqual(refreshState.payment, refreshPayment)
    assert.ok(
      !refreshDispatches.some(([type]) => type === 'complete'),
      'payment confirmation must keep the edit context active'
    )

    const retryResult = await orderEditStore.actions.retryPayment.call(
      {
        $axios: {
          post: () => Promise.resolve({ data: { data: refreshPayment } }),
        },
      },
      { dispatch: refreshDispatch, state: refreshState }
    )
    assert.strictEqual(retryResult.ok, true)
    assert.strictEqual(refreshState.active, true)
    assert.strictEqual(refreshState.paymentRefresh, 'succeeded')
    assert.deepStrictEqual(refreshState.payment, refreshPayment)

    const paymentRefreshError = new Error('Paiement à reprendre.')
    paymentRefreshError.response = {
      status: 409,
      data: {
        message: 'Paiement à reprendre.',
        data: {
          code: 'ORDER_EDIT_CONFLICT',
          payment_refresh: 'required',
          payment_refresh_message: 'Rechargez la commande avant de réessayer.',
        },
      },
    }
    await orderEditStore.actions.save.call(
      { $axios: { patch: () => Promise.reject(paymentRefreshError) } },
      {
        dispatch: refreshDispatch,
        state: refreshState,
        rootState: { cart: { dataCart: cart, totalCart: 19 } },
      }
    )
    assert.strictEqual(refreshState.paymentRefresh, 'required')

    refreshState.paymentRefresh = 'succeeded'
    refreshState.payment = refreshPayment
    orderEditStore.actions.updateDirty(
      {
        dispatch: refreshDispatch,
        state: refreshState,
        rootState: { cart: { dataCart: [{ ...cart[0], qty: 3 }] } },
      },
      [{ ...cart[0], qty: 3 }]
    )
    assert.strictEqual(refreshState.dirty, true)
    assert.strictEqual(refreshState.paymentRefresh, null)
    assert.strictEqual(refreshState.payment, null)

    let dirtyRetryRequested = false
    const dirtyRetryResult = await orderEditStore.actions.retryPayment.call(
      {
        $axios: {
          post() {
            dirtyRetryRequested = true
          },
        },
      },
      { dispatch: refreshDispatch, state: refreshState }
    )
    assert.strictEqual(dirtyRetryResult.ok, false)
    assert.strictEqual(dirtyRetryRequested, false)

    const menusOptions = loadPageOptions(
      menusSource,
      [
        'Loading',
        'ProductCustomizationWizard',
        'price',
        'mergeConfiguredCartLine',
        'replaceConfiguredCartLine',
      ],
      [{}, {}, {}, () => [], () => []]
    )
    assert.ok(
      menusOptions.props && menusOptions.props.embeddedOrderEdit,
      'menus must declare its embedded order-edit mode'
    )
    const embeddedMenuEvents = []
    const embeddedMenuRoutes = []
    menusOptions.methods.openCart.call({
      embeddedOrderEdit: true,
      isOrderEditActive: true,
      $emit: (...args) => embeddedMenuEvents.push(args),
      $router: { push: (path) => embeddedMenuRoutes.push(path) },
    })
    assert.deepStrictEqual(embeddedMenuEvents, [['show-cart']])
    assert.deepStrictEqual(embeddedMenuRoutes, [])

    const standaloneMenuRoutes = []
    menusOptions.methods.openCart.call({
      embeddedOrderEdit: false,
      isOrderEditActive: true,
      $emit() {},
      $router: { push: (path) => standaloneMenuRoutes.push(path) },
    })
    assert.deepStrictEqual(standaloneMenuRoutes, ['/cart'])
    const mountedCart = [{ ...cart[0] }]
    const menuDispatches = []
    const menuVm = {
      loadPage: false,
      isOrderEditActive: true,
      hasUnsafeCheckoutAttempt: false,
      clientOrderStatus: 'idle',
      cartItem: [],
      total: 0,
      idxCart: 0,
      $store: {
        get(path) {
          const values = {
            'cart/dataCart': mountedCart,
            'cart/totalCart': 19,
            'cart/indexCart': 2,
            'products/dataProduct': [product],
          }
          return values[path]
        },
        dispatch(type, payload) {
          menuDispatches.push([type, payload])
          return Promise.resolve(true)
        },
      },
      $router: { replace() {} },
    }
    await menusOptions.mounted.call(menuVm)
    assert.strictEqual(menuVm.cartItem[0].id, mountedCart[0].id)
    assert.strictEqual(menuVm.cartItem[0].qty, mountedCart[0].qty)
    assert.notStrictEqual(menuVm.cartItem, mountedCart)
    assert.ok(
      !menuDispatches.some(
        ([type, payload]) =>
          (type === 'cart/setTocart' && payload === null) ||
          (type === 'cart/setTotal' && payload === 0)
      ),
      'opening menus during an edit must never clear the edit cart'
    )

    const cartOptions = loadPageOptions(
      cartSource,
      [
        'loadStripe',
        'Loading',
        'ProductCustomizationWizard',
        'CartCustomizationSummary',
        'price',
        'applyServerQuoteToCart',
        'buildCheckoutPayloadSignature',
        'findCartTargetForCheckoutError',
        'replaceConfiguredCartLine',
        'isCounterPaymentAllowed',
        'isQrClientAccess',
        'shouldAutoPrepareStripeCheckout',
      ],
      [
        () => null,
        {},
        {},
        {},
        {},
        (sourceCart) => sourceCart,
        () => '',
        () => null,
        () => [],
        () => false,
        () => false,
        () => false,
      ]
    )
    assert.ok(
      cartOptions.props && cartOptions.props.embeddedOrderEdit,
      'cart must declare its embedded order-edit mode'
    )
    const embeddedCartEvents = []
    const embeddedCartRoutes = []
    const embeddedCartVm = {
      embeddedOrderEdit: true,
      isOrderEditActive: true,
      $emit: (...args) => embeddedCartEvents.push(args),
      $router: { push: (path) => embeddedCartRoutes.push(path) },
    }
    cartOptions.methods.showOrderEditMenu.call(embeddedCartVm)
    cartOptions.methods.finishOrderEdit.call(embeddedCartVm, 42)
    assert.deepStrictEqual(embeddedCartEvents, [
      ['show-menu'],
      ['edit-complete', 42],
    ])
    assert.deepStrictEqual(embeddedCartRoutes, [])

    const standaloneCartRoutes = []
    const standaloneCartVm = {
      embeddedOrderEdit: false,
      isOrderEditActive: true,
      $emit() {},
      $router: { push: (path) => standaloneCartRoutes.push(path) },
    }
    cartOptions.methods.showOrderEditMenu.call(standaloneCartVm)
    cartOptions.methods.finishOrderEdit.call(standaloneCartVm, 42)
    assert.deepStrictEqual(standaloneCartRoutes, [
      '/menus',
      '/orders/detail/42',
    ])
    assert.ok(modalSource.includes('@show-menu="step = \'menu\'"'))
    assert.ok(modalSource.includes('@request-close="requestClose"'))
    assert.ok(modalSource.includes('@edit-complete="completeEdit"'))
    const pageDispatches = []
    const pageRoutes = []
    let confirms = false
    const previousWindow = global.window
    global.window = { confirm: () => confirms }
    try {
      const menuExitDecisions = []
      const menuExitVm = {
        isOrderEditActive: true,
        orderEditDirty: true,
        allowRouteLeave: false,
        $store: menuVm.$store,
      }
      confirms = true
      await menusOptions.beforeRouteLeave.call(
        menuExitVm,
        {},
        {},
        (decision) => menuExitDecisions.push(decision)
      )
      assert.ok(
        menuDispatches.some(([type]) => type === 'orderEdit/cancel'),
        'leaving menus after confirmation must clear the edit session'
      )
      assert.deepStrictEqual(menuExitDecisions, [undefined])

      confirms = false
      const emptyCartVm = {
        embeddedOrderEdit: false,
        isOrderEditActive: true,
        orderEditId: 42,
        dataCart: null,
        loadingBtn: false,
        checkoutErrorMessage: '',
        allowRouteLeave: false,
        $store: {
          dispatch(type, payload) {
            pageDispatches.push([type, payload])
            if (type === 'orderEdit/save') {
              return Promise.resolve({
                ok: true,
                data: { order_id: 42, canceled: true },
                error: null,
              })
            }
            return Promise.resolve(null)
          },
        },
        $router: { push: (path) => pageRoutes.push(path) },
        finishOrderEdit(orderId) {
          return cartOptions.methods.finishOrderEdit.call(this, orderId)
        },
      }
      await cartOptions.methods.saveOrderEdit.call(emptyCartVm)
      assert.ok(!pageDispatches.some(([type]) => type === 'orderEdit/save'))
      confirms = true
      await cartOptions.methods.saveOrderEdit.call(emptyCartVm)
      assert.ok(pageDispatches.some(([type]) => type === 'orderEdit/save'))
      assert.strictEqual(pageRoutes[0], '/orders/detail/42')

      const retryCalls = []
      const retryVm = {
        loadingBtn: false,
        checkoutErrorMessage: '',
        mountEditedPayment(payment) {
          retryCalls.push(['mount', payment.paymentIntentId])
          return Promise.resolve()
        },
        $store: {
          dispatch(type) {
            retryCalls.push([type])
            return Promise.resolve({ ok: true, data: refreshPayment, error: null })
          },
        },
      }
      await cartOptions.methods.retryEditedPayment.call(retryVm)
      assert.deepStrictEqual(retryCalls, [
        ['orderEdit/retryPayment'],
        ['mount', 'pi_new'],
      ])

      const dirtyRetryCalls = []
      await cartOptions.methods.retryEditedPayment.call({
        ...retryVm,
        orderEditDirty: true,
        $store: {
          dispatch(type) {
            dirtyRetryCalls.push(type)
          },
        },
      })
      assert.deepStrictEqual(dirtyRetryCalls, [])

      const dirtyConfirmationVm = {
        isOrderEditActive: true,
        orderEditDirty: true,
        stripePaymentReady: true,
        stripeOrderId: 42,
        orderEditId: 42,
        checkoutErrorMessage: '',
      }
      assert.strictEqual(
        cartOptions.methods.guardCheckoutConfirmation.call(
          dirtyConfirmationVm
        ),
        false
      )
      assert.ok(dirtyConfirmationVm.checkoutErrorMessage.includes('Enregistrez'))

      const cartExitDispatches = []
      const cartExitDecisions = []
      await cartOptions.beforeRouteLeave.call(
        {
          isOrderEditActive: true,
          orderEditDirty: true,
          orderEditPaymentRefresh: null,
          allowRouteLeave: false,
          checkoutFinalized: false,
          resetStripePaymentElement() {},
          $store: {
            get: () => false,
            dispatch(type) {
              cartExitDispatches.push(type)
              return Promise.resolve()
            },
          },
        },
        {},
        {},
        (decision) => cartExitDecisions.push(decision)
      )
      assert.deepStrictEqual(cartExitDispatches, ['orderEdit/cancel'])
      assert.deepStrictEqual(cartExitDecisions, [undefined])
    } finally {
      global.window = previousWindow
    }
  } finally {
    global.localStorage = previousLocalStorage
  }
}

runCartEditContracts()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('order edit tests passed')
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  })
