const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  validateStep,
  calculatePreviewUnitPrice,
  buildConfigurationSignature,
  mergeConfiguredCartLine,
  buildCheckoutItems,
  createComponentInputId,
  serializeProductCustomizationConfig,
} = require('../helpers/customizations')

const step = {
  product_step_id: 10,
  minimum_choices: 1,
  maximum_choices: 2,
}

assert.deepStrictEqual(validateStep(step, [30]), {
  valid: true,
  reason: null,
})
assert.deepStrictEqual(validateStep(step, []), {
  valid: false,
  reason: 'minimum',
})
assert.deepStrictEqual(validateStep(step, [1, 2, 3]), {
  valid: false,
  reason: 'maximum',
})
assert.deepStrictEqual(validateStep(step, [30, 30]), {
  valid: true,
  reason: null,
})

const product = {
  id: 5,
  price: '8.00',
  customization_steps: [
    {
      choices: [
        { product_step_choice_id: 10, extra_price: '0.50' },
        { product_step_choice_id: 30, extra_price: '1.25' },
      ],
    },
  ],
}

assert.strictEqual(calculatePreviewUnitPrice(product, [30, 10]), 9.75)
assert.strictEqual(calculatePreviewUnitPrice(product, [30, 30, 999]), 9.25)

assert.strictEqual(buildConfigurationSignature(5, [30, 10]), '5:10,30')
assert.strictEqual(buildConfigurationSignature('5', ['10', 2, 10]), '5:2,10')

const firstLine = {
  id: 5,
  qty: 1,
  selectedChoiceIds: [30, 10],
  price: 9,
  subtotal: 9,
}
const firstCart = mergeConfiguredCartLine([], firstLine)

assert.notStrictEqual(firstCart[0], firstLine)
assert.deepStrictEqual(firstCart[0].selectedChoiceIds, [10, 30])
assert.strictEqual(firstCart[0].configurationSignature, '5:10,30')

const mergedCart = mergeConfiguredCartLine(firstCart, {
  id: 5,
  qty: 1,
  selectedChoiceIds: [10, 30],
  price: 9,
  subtotal: 9,
})

assert.notStrictEqual(mergedCart, firstCart)
assert.strictEqual(firstCart[0].qty, 1)
assert.strictEqual(firstCart[0].subtotal, 9)
assert.strictEqual(mergedCart.length, 1)
assert.strictEqual(mergedCart[0].qty, 2)
assert.strictEqual(mergedCart[0].subtotal, 18)

const distinctCart = mergeConfiguredCartLine(mergedCart, {
  id: 5,
  qty: 1,
  selectedChoiceIds: [30],
  price: 8.5,
  subtotal: 8.5,
})

assert.strictEqual(distinctCart.length, 2)
assert.strictEqual(distinctCart[1].configurationSignature, '5:30')

assert.deepStrictEqual(buildCheckoutItems(mergedCart), [
  {
    product_id: 5,
    quantity: 2,
    selected_product_step_choice_ids: [10, 30],
  },
])

assert.strictEqual(
  createComponentInputId('image-cropper', 12),
  'image-cropper-12'
)
assert.notStrictEqual(
  createComponentInputId('image-cropper', 12),
  createComponentInputId('image-cropper', 13)
)

const serializedProductConfig = serializeProductCustomizationConfig([
  {
    step_id: '20',
    position: '99',
    minimum_choices: '1',
    maximum_choices: '2',
    active: true,
    choices: [
      {
        step_choice_id: '202',
        position: '12',
        extra_price: '1,2',
        active: false,
      },
      {
        step_choice_id: 201,
        position: 3,
        extra_price: 0,
        active: true,
      },
    ],
  },
  {
    step_id: 10,
    position: 0,
    minimum_choices: 0,
    maximum_choices: 1,
    active: false,
    choices: [
      {
        step_choice_id: 101,
        position: 0,
        extra_price: '2.345',
        active: true,
      },
    ],
  },
])

assert.deepStrictEqual(serializedProductConfig, [
  {
    step_id: 20,
    position: 0,
    minimum_choices: 1,
    maximum_choices: 2,
    active: true,
    choices: [
      {
        step_choice_id: 202,
        position: 0,
        extra_price: '1.20',
        active: false,
      },
      {
        step_choice_id: 201,
        position: 1,
        extra_price: '0.00',
        active: true,
      },
    ],
  },
  {
    step_id: 10,
    position: 1,
    minimum_choices: 0,
    maximum_choices: 1,
    active: false,
    choices: [
      {
        step_choice_id: 101,
        position: 0,
        extra_price: '2.35',
        active: true,
      },
    ],
  },
])

assert.throws(
  () =>
    serializeProductCustomizationConfig([
      serializedProductConfig[0],
      { ...serializedProductConfig[0], choices: [] },
    ]),
  /dupliquée/i
)
assert.throws(
  () =>
    serializeProductCustomizationConfig([
      {
        ...serializedProductConfig[0],
        choices: [
          serializedProductConfig[0].choices[0],
          serializedProductConfig[0].choices[0],
        ],
      },
    ]),
  /dupliqué/i
)

assert.throws(
  () =>
    serializeProductCustomizationConfig([
      { ...serializedProductConfig[0], step_id: true },
    ]),
  /invalide/i
)
assert.throws(
  () =>
    serializeProductCustomizationConfig([
      {
        ...serializedProductConfig[0],
        minimum_choices: false,
      },
    ]),
  /invalide/i
)
assert.throws(
  () =>
    serializeProductCustomizationConfig([
      {
        ...serializedProductConfig[0],
        maximum_choices: true,
      },
    ]),
  /invalide/i
)
assert.throws(
  () =>
    serializeProductCustomizationConfig([
      {
        ...serializedProductConfig[0],
        choices: [
          { ...serializedProductConfig[0].choices[0], step_choice_id: true },
        ],
      },
    ]),
  /invalide/i
)

for (const invalidPrice of [
  true,
  '',
  'prix',
  'Infinity',
  Infinity,
  NaN,
  [],
  '0x10',
]) {
  assert.throws(
    () =>
      serializeProductCustomizationConfig([
        {
          ...serializedProductConfig[0],
          choices: [
            {
              ...serializedProductConfig[0].choices[0],
              extra_price: invalidPrice,
            },
          ],
        },
      ]),
    /supplément.*invalide/i
  )
}

const stepEditorSource = fs.readFileSync(
  path.join(__dirname, '../components/customizations/StepEditor.vue'),
  'utf8'
)
const choiceEditorSource = fs.readFileSync(
  path.join(__dirname, '../components/customizations/ChoiceEditor.vue'),
  'utf8'
)
const customizationAdminPageSource = fs.readFileSync(
  path.join(__dirname, '../pages/customizations/index.vue'),
  'utf8'
)

assert.ok(
  stepEditorSource.includes('maxlength="255"'),
  'step names must enforce the 255-character schema limit'
)
assert.ok(
  stepEditorSource.includes('maxlength="512"'),
  'step descriptions must enforce the 512-character schema limit'
)
assert.ok(
  stepEditorSource.includes('La longueur maximale est de 255 caractères.'),
  'step names must have a max-length validation rule'
)
assert.ok(
  stepEditorSource.includes('La longueur maximale est de 512 caractères.'),
  'step descriptions must have a max-length validation rule'
)
assert.ok(
  choiceEditorSource.includes('maxlength="255"'),
  'simple choice names must enforce the 255-character schema limit'
)
assert.ok(
  choiceEditorSource.includes('La longueur maximale est de 255 caractères.'),
  'simple choice names must have a max-length validation rule'
)
assert.ok(
  !choiceEditorSource.includes('label="Choix actif"'),
  'choice activation must not bypass the page confirmation flow'
)
assert.ok(
  !choiceEditorSource.includes('v-model="form.active"'),
  'ChoiceEditor must not directly edit activation state'
)
assert.ok(
  choiceEditorSource.includes(
    "data.append('active', String(this.persistedActive))"
  ),
  'choice edits must preserve their existing activation state'
)
assert.ok(
  customizationAdminPageSource.includes('stepToDeactivateId: null'),
  'step deactivation must preserve its explicit target'
)
assert.ok(
  customizationAdminPageSource.includes(
    'if (!this.stepToDeactivateId || this.savingStep) return'
  ),
  'step deactivation must guard a missing target and duplicate retries'
)
assert.match(
  customizationAdminPageSource,
  /if \(!saved\) return[\s\S]{0,180}this\.pendingStepPayload = null/,
  'failed step deactivation must preserve its pending operation'
)
assert.ok(
  customizationAdminPageSource.includes(
    'if (!this.choiceToDeactivate || this.savingChoice) return'
  ),
  'choice deactivation must guard a missing target and duplicate retries'
)
assert.match(
  customizationAdminPageSource,
  /if \(!saved\) return[\s\S]{0,180}this\.choiceToDeactivate = null/,
  'failed choice deactivation must preserve its target'
)
assert.ok(
  customizationAdminPageSource.includes('@click="cancelChoiceDeactivation"'),
  'canceling choice deactivation must explicitly clear its pending target'
)

const loadProductActions = () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../store/products.js'),
    'utf8'
  )
  const executable = source
    .replace(/^import .*$/m, '')
    .replace(/export const /g, 'const ')
    .concat('\nreturn actions')

  // eslint-disable-next-line no-new-func
  return new Function('EasyAccess', 'defaultMutations', executable)(
    () => ({}),
    () => ({})
  )
}

const loadProductEditOptions = () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../pages/products/edit/_id/index.vue'),
    'utf8'
  )
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  const executable = script
    .replace(/^import .*$/gm, '')
    .replace('export default', 'return')

  // eslint-disable-next-line no-new-func
  return new Function(
    'Loading',
    'ProductStepConfigurator',
    'serializeProductCustomizationConfig',
    'price',
    executable
  )({}, {}, serializeProductCustomizationConfig, {})
}

const runReviewRegressionTests = async () => {
  const productActions = loadProductActions()
  const originalLocalStorage = global.localStorage
  global.localStorage = { getItem: () => 'test-token' }

  try {
    for (const scenario of [
      {
        action: 'postProducts',
        method: 'post',
        params: {},
        fallback: 'Impossible de créer le produit.',
      },
      {
        action: 'updateProduct',
        method: 'patch',
        params: { id: 1, data: {} },
        fallback: 'Impossible de mettre à jour le produit.',
      },
      {
        action: 'updateProductCustomizationConfig',
        method: 'put',
        params: { id: 1, data: [] },
        fallback: 'Impossible de mettre à jour la configuration du produit.',
      },
    ]) {
      const dispatched = []
      const result = await productActions[scenario.action].call(
        {
          $axios: {
            [scenario.method]: () => Promise.reject(new Error('network')),
          },
        },
        {
          dispatch(type, payload) {
            dispatched.push([type, payload])
          },
        },
        scenario.params
      )

      assert.strictEqual(result, false, `${scenario.action} must resolve false`)
      assert.ok(
        dispatched.some(
          ([type, payload]) =>
            type === 'set/message' && payload === scenario.fallback
        ),
        `${scenario.action} must expose a recoverable network error`
      )
    }
  } finally {
    global.localStorage = originalLocalStorage
  }

  const editOptions = loadProductEditOptions()
  const dispatched = []
  let navigationCount = 0
  const viewModel = {
    configurationValid: true,
    configurationError: '',
    customizationConfig: [],
    loadingBtn: false,
    stsMsg: false,
    id: 5,
    buildProductPayload: () => ({}),
    $store: {
      dispatch: (type, payload) => {
        dispatched.push([type, payload])
        if (type === 'products/updateProduct') return true
        if (type === 'products/updateProductCustomizationConfig') return false
        return true
      },
    },
    $router: {
      push: () => {
        navigationCount += 1
      },
    },
  }

  await editOptions.methods.submitEditProduct.call(viewModel)

  const partialSaveMessage =
    'Le produit a été enregistré, mais sa configuration n’a pas pu être mise à jour.'
  assert.strictEqual(viewModel.loadingBtn, false)
  assert.strictEqual(viewModel.stsMsg, true)
  assert.strictEqual(viewModel.configurationError, partialSaveMessage)
  assert.strictEqual(navigationCount, 0)
  assert.ok(
    dispatched.some(
      ([type, payload]) =>
        type === 'products/set/message' && payload === partialSaveMessage
    ),
    'partial saves must replace the generic product message'
  )
  assert.ok(
    dispatched.some(
      ([type, payload]) =>
        type === 'notifications/error' && payload === partialSaveMessage
    ),
    'partial saves must use the existing error notification path'
  )
}

runReviewRegressionTests()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('customization frontend tests passed')
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  })
