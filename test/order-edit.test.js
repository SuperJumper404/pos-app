const assert = require('assert')
const fs = require('fs')
const {
  buildOrderEditPayload,
  isOrderEditable,
  isOrderEditDirty,
  mapEditableOrderToCart,
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
  order_id: 42,
  order_number: '0042',
  status: 1,
  payment_status: 'unpaid',
  total: 19,
  content_revision: 'revision-1',
  items: [
    {
      product_id: 10,
      quantity: 2,
      unit_price: 9.5,
      line_total: 19,
      selected_product_step_choice_ids: [30],
      customization_snapshots: [],
      requires_reconfiguration: false,
    },
  ],
}

assert.strictEqual(isOrderEditable(editable), true)
assert.strictEqual(isOrderEditable({ ...editable, status: 2 }), false)
assert.strictEqual(
  isOrderEditable({ ...editable, payment_status: 'paid' }),
  false
)

const cart = mapEditableOrderToCart(editable, [product])
assert.strictEqual(cart[0].id, 10)
assert.strictEqual(cart[0].qty, 2)
assert.deepStrictEqual(cart[0].selectedChoiceIds, [30])
assert.strictEqual(cart[0].selections[0].choice_name, 'Cola')
assert.strictEqual(cart[0].subtotal, 19)

assert.deepStrictEqual(
  buildOrderEditPayload({
    contentRevision: 'revision-1',
    expectedTotal: 19,
    cart,
  }),
  {
    content_revision: 'revision-1',
    expected_total: 19,
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

const usersSource = fs.readFileSync(
  require.resolve('../store/users.js'),
  'utf8'
)
const axiosSource = fs.readFileSync(
  require.resolve('../plugins/axios.js'),
  'utf8'
)
assert.ok(usersSource.includes('orderEdit/cancel'))
assert.ok(axiosSource.includes('orderEdit/cancel'))

const detailSource = fs.readFileSync(
  require.resolve('../pages/orders/detail/_id.vue'),
  'utf8'
)
assert.ok(detailSource.includes('Modifier la commande'))
assert.ok(detailSource.includes('orderEdit/load'))
assert.ok(detailSource.includes('canEditOrder'))
assert.ok(detailSource.includes('replaceCartDialog'))

const menusSource = fs.readFileSync(
  require.resolve('../pages/menus.vue'),
  'utf8'
)
const cartSource = fs.readFileSync(require.resolve('../pages/cart.vue'), 'utf8')
const bannerSource = fs.readFileSync(
  require.resolve('../components/orders/OrderEditBanner.vue'),
  'utf8'
)
assert.ok(menusSource.includes('OrderEditBanner'))
assert.ok(menusSource.includes('isOrderEditActive'))
assert.ok(cartSource.includes('Enregistrer les modifications'))
assert.ok(cartSource.includes('orderEdit/save'))
assert.ok(cartSource.includes('orderEdit/regeneratePayment'))
assert.ok(bannerSource.includes('Modification de la commande'))

const loadOrderEditStore = () => {
  const source = fs.readFileSync(
    require.resolve('../store/orderEdit.js'),
    'utf8'
  )
  const executable = source
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace(/export const /g, 'const ')
    .concat('\nreturn { state, actions }')

  // eslint-disable-next-line no-new-func
  return new Function(
    'EasyAccess',
    'defaultMutations',
    'buildOrderEditPayload',
    'isOrderEditDirty',
    'mapEditableOrderToCart',
    executable
  )(
    () => ({}),
    () => ({}),
    buildOrderEditPayload,
    isOrderEditDirty,
    mapEditableOrderToCart
  )
}

const loadMenusOptions = () => {
  const script = menusSource.match(/<script>([\s\S]*?)<\/script>/)[1]
  const executable = script
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace('export default', 'return')

  // eslint-disable-next-line no-new-func
  return new Function(
    'Loading',
    'OrderEditBanner',
    'ProductCustomizationWizard',
    'price',
    'mergeConfiguredCartLine',
    executable
  )({}, {}, {}, {}, () => [])
}

const runStoreAndNavigationContracts = async () => {
  const orderEditStore = loadOrderEditStore()
  const rootState = {
    products: {
      dataProduct: [{ ...product, name: 'Ancien catalogue' }],
    },
  }
  let catalogRefreshes = 0
  let begun
  const dispatch = (type, payload) => {
    if (type === 'products/getProducts') {
      catalogRefreshes += 1
      rootState.products.dataProduct = [{ ...product, name: 'Catalogue frais' }]
      return true
    }
    if (type === 'begin') {
      begun = payload
      return { ok: true, data: payload.editable, error: null }
    }
    return true
  }
  const previousLocalStorage = global.localStorage
  global.localStorage = { getItem: () => 'token' }
  try {
    const result = await orderEditStore.actions.load.call(
      {
        $axios: {
          get: () => Promise.resolve({ data: { data: editable } }),
        },
      },
      { dispatch, rootState },
      42
    )
    assert.strictEqual(result.ok, true)
    assert.strictEqual(
      catalogRefreshes,
      1,
      'editing always refreshes the product catalog'
    )
    assert.strictEqual(begun.cart[0].name, 'Catalogue frais')

    for (const refreshFailure of ['false', 'rejected']) {
      const failed = await orderEditStore.actions.load.call(
        {
          $axios: {
            get: () => Promise.resolve({ data: { data: editable } }),
          },
        },
        {
          rootState,
          dispatch: (type) => {
            if (type !== 'products/getProducts') return true
            return refreshFailure === 'false'
              ? false
              : Promise.reject(new Error('network failure'))
          },
        },
        42
      )
      assert.strictEqual(failed.ok, false)
      assert.strictEqual(
        failed.error.message,
        'Impossible de charger le catalogue actuel pour modifier la commande.'
      )
    }
  } finally {
    global.localStorage = previousLocalStorage
  }

  const menusOptions = loadMenusOptions()
  let routeDecision
  const previousWindow = global.window
  global.window = { confirm: () => false }
  try {
    menusOptions.beforeRouteLeave.call(
      {
        isOrderEditActive: true,
        orderEditDirty: true,
        allowRouteLeave: false,
      },
      {},
      {},
      (decision) => {
        routeDecision = decision
      }
    )
  } finally {
    global.window = previousWindow
  }
  assert.strictEqual(
    routeDecision,
    false,
    'dirty menu edits block accidental navigation'
  )
}

runStoreAndNavigationContracts()
  .then(() => console.log('orderEdit tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
