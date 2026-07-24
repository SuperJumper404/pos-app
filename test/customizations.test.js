const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  validateStep,
  calculatePreviewUnitPrice,
  buildConfigurationSignature,
  mergeConfiguredCartLine,
  replaceConfiguredCartLine,
  buildCheckoutItems,
  applyServerQuoteToCart,
  findCartLineIndexForCheckoutError,
  createComponentInputId,
  serializeProductCustomizationConfig,
  nextVisibleStepIndex,
  findStepIndexById,
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

const wizardSteps = [
  {
    product_step_id: 10,
    minimum_choices: 0,
    choices: [
      {
        product_step_choice_id: 101,
        choice_type: 'linked_product',
        active: true,
        available: false,
      },
    ],
  },
  {
    product_step_id: '20',
    minimum_choices: 1,
    choices: [
      {
        product_step_choice_id: 201,
        choice_type: 'linked_product',
        active: true,
        available: false,
      },
    ],
  },
  {
    product_step_id: 30,
    minimum_choices: 0,
    choices: [{ product_step_choice_id: 301, active: true, available: true }],
  },
]

assert.strictEqual(
  nextVisibleStepIndex(wizardSteps, -1),
  1,
  'optional steps without an available choice must be skipped'
)
assert.strictEqual(
  nextVisibleStepIndex(wizardSteps, 1),
  2,
  'the next selectable step must remain visible'
)
assert.strictEqual(
  nextVisibleStepIndex(
    [
      {
        product_step_id: 40,
        minimum_choices: 0,
        choices: [
          {
            product_step_choice_id: 401,
            choice_type: 'simple',
            active: true,
            available: false,
          },
        ],
      },
    ],
    -1
  ),
  0,
  'active simple choices remain selectable even without a stock availability flag'
)
assert.strictEqual(
  nextVisibleStepIndex(wizardSteps, 2),
  wizardSteps.length,
  'the summary index must follow the last visible step'
)
assert.strictEqual(
  findStepIndexById(wizardSteps, 20),
  1,
  'required unavailable steps must remain addressable as blocking steps'
)
assert.strictEqual(findStepIndexById(wizardSteps, 'missing'), -1)

const choiceCardPath = path.join(
  __dirname,
  '../components/products/CustomizationChoiceCard.vue'
)
const wizardPath = path.join(
  __dirname,
  '../components/products/ProductCustomizationWizard.vue'
)
const cartSummaryPath = path.join(
  __dirname,
  '../components/products/CartCustomizationSummary.vue'
)
const choiceCardSource = fs.readFileSync(choiceCardPath, 'utf8')
const wizardSource = fs.readFileSync(wizardPath, 'utf8')
const cartSummarySource = fs.readFileSync(cartSummaryPath, 'utf8')

assert.ok(
  choiceCardSource.includes("this.$emit('toggle', this.choiceId)"),
  'choice cards must emit an id without mutating the choice prop'
)
assert.ok(
  choiceCardSource.includes('Indisponible') &&
    choiceCardSource.includes('Inclus'),
  'choice cards must expose availability and included-price labels'
)
assert.ok(
  choiceCardSource.includes("choice.choice_type === 'linked_product'"),
  'linked choices must resolve their product image separately'
)
assert.ok(
  !/this\.choice\.[A-Za-z_]+\s*=(?!=)/.test(choiceCardSource),
  'choice cards must never mutate their choice prop'
)

for (const contractToken of [
  '<v-progress-linear',
  'Étape {{ currentStepNumber }} / {{ visibleStepCount }}',
  'Prix actuel',
  'initialStepId',
  "this.$emit('input', [...normalizedSelection])",
  "this.$emit('confirm', this.confirmationPayload)",
  "this.$emit('cancel')",
]) {
  assert.ok(
    wizardSource.includes(contractToken),
    `wizard contract missing: ${contractToken}`
  )
}
assert.ok(
  cartSummarySource.includes('groupedSelections') &&
    cartSummarySource.includes('Total'),
  'the cart summary must group selections and display the total'
)

const loadComponentOptions = (source, dependencyNames, dependencies) => {
  const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/)
  assert.ok(scriptMatch, 'component script must exist')
  const executable = scriptMatch[1]
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace('export default', 'return')

  // eslint-disable-next-line no-new-func
  return new Function(...dependencyNames, executable)(...dependencies)
}

const wizardOptions = loadComponentOptions(
  wizardSource,
  [
    'CustomizationChoiceCard',
    'CartCustomizationSummary',
    'calculatePreviewUnitPrice',
    'findStepIndexById',
    'nextVisibleStepIndex',
    'validateStep',
  ],
  [
    {},
    {},
    calculatePreviewUnitPrice,
    findStepIndexById,
    nextVisibleStepIndex,
    validateStep,
  ]
)

const availabilityChoice = {
  product_step_choice_id: 501,
  choice_type: 'linked_product',
  active: true,
  available: true,
}
const availabilityStep = {
  product_step_id: 50,
  name: 'Boisson',
  active: true,
  minimum_choices: 1,
  maximum_choices: 1,
  choices: [availabilityChoice],
}
const availabilityVm = {
  steps: [availabilityStep],
  currentStep: availabilityStep,
  currentStepChoices: availabilityStep.choices,
  minimumChoices: 1,
  selectedChoiceIds: [501],
  choiceSelectable(choice) {
    return wizardOptions.methods.choiceSelectable.call(this, choice)
  },
}
availabilityVm.selectableChoiceIds =
  wizardOptions.computed.selectableChoiceIds.call(availabilityVm)

assert.deepStrictEqual(
  wizardOptions.computed.selectedForCurrentStep.call(availabilityVm),
  [501],
  'an available linked choice initially satisfies the required step'
)
assert.strictEqual(
  wizardOptions.methods.isChoiceSelected.call(
    availabilityVm,
    availabilityChoice
  ),
  true
)

availabilityChoice.available = false
availabilityVm.selectableChoiceIds =
  wizardOptions.computed.selectableChoiceIds.call(availabilityVm)
availabilityVm.selectedForCurrentStep =
  wizardOptions.computed.selectedForCurrentStep.call(availabilityVm)

assert.deepStrictEqual(
  availabilityVm.selectedForCurrentStep,
  [],
  'an unavailable linked choice must stop satisfying the current step reactively'
)
assert.strictEqual(
  wizardOptions.methods.isChoiceSelected.call(
    availabilityVm,
    availabilityChoice
  ),
  false,
  'an unavailable linked choice must lose selected styling'
)
assert.deepStrictEqual(
  wizardOptions.computed.currentStepValidation.call(availabilityVm),
  { valid: false, reason: 'minimum' }
)
assert.match(
  wizardOptions.computed.blockingExplanation.call(availabilityVm),
  /ne propose pas assez de choix disponibles/i
)

const inactiveStepChoice = {
  product_step_choice_id: 601,
  choice_type: 'simple',
  choice_name: 'Ancienne option',
  extra_price: '4.00',
  active: true,
  available: true,
}
const activeStepChoice = {
  product_step_choice_id: 602,
  choice_type: 'simple',
  choice_name: 'Option active',
  extra_price: '0.50',
  active: true,
  available: true,
}
const inactiveSelectionProduct = {
  id: 60,
  price: '10.00',
  customization_steps: [
    {
      product_step_id: 60,
      step_id: 6,
      name: 'Étape inactive',
      position: 0,
      active: false,
      minimum_choices: 0,
      maximum_choices: 1,
      choices: [inactiveStepChoice],
    },
    {
      product_step_id: 61,
      step_id: 7,
      name: 'Étape active',
      position: 1,
      active: true,
      minimum_choices: 0,
      maximum_choices: 1,
      choices: [activeStepChoice],
    },
  ],
}
const inactiveSelectionEvents = []
const inactiveSelectionVm = {
  product: inactiveSelectionProduct,
  steps: inactiveSelectionProduct.customization_steps,
  selectedChoiceIds: [601, 602],
  choiceSelectable(choice) {
    return wizardOptions.methods.choiceSelectable.call(this, choice)
  },
  sanitizeSelection(values) {
    return wizardOptions.methods.sanitizeSelection.call(this, values)
  },
  $emit(event, payload) {
    inactiveSelectionEvents.push([event, payload])
  },
}
inactiveSelectionVm.selectableChoiceIds =
  wizardOptions.computed.selectableChoiceIds.call(inactiveSelectionVm)

wizardOptions.methods.setSelection.call(inactiveSelectionVm, [601, 602])
assert.deepStrictEqual(
  inactiveSelectionVm.selectedChoiceIds,
  [602],
  'selections from an inactive enclosing step must be removed internally'
)
assert.deepStrictEqual(inactiveSelectionEvents, [['input', [602]]])

inactiveSelectionVm.validSelectedChoiceIds =
  wizardOptions.computed.validSelectedChoiceIds.call(inactiveSelectionVm)
inactiveSelectionVm.previewUnitPrice =
  wizardOptions.computed.previewUnitPrice.call(inactiveSelectionVm)
inactiveSelectionVm.selections =
  wizardOptions.computed.selections.call(inactiveSelectionVm)

assert.deepStrictEqual(inactiveSelectionVm.validSelectedChoiceIds, [602])
assert.strictEqual(
  inactiveSelectionVm.previewUnitPrice,
  10.5,
  'inactive-step supplements must not affect the preview price'
)
assert.deepStrictEqual(
  inactiveSelectionVm.selections.map((selection) =>
    Number(selection.product_step_choice_id)
  ),
  [602],
  'inactive-step choices must not appear in the summary'
)
assert.deepStrictEqual(
  wizardOptions.computed.confirmationPayload.call(inactiveSelectionVm),
  {
    selectedChoiceIds: [602],
    unitPrice: 10.5,
    selections: inactiveSelectionVm.selections.map((selection) => ({
      ...selection,
    })),
  },
  'inactive-step choices must not reach the confirm payload'
)

const requestedStepVm = {
  steps: wizardSteps,
  initialStepId: 20,
  currentStepIndex: null,
}
wizardOptions.methods.resetWizardPosition.call(requestedStepVm)
assert.strictEqual(
  requestedStepVm.currentStepIndex,
  1,
  'initialStepId must open the requested edit or recovery step'
)

const singleSelectionVm = {
  currentStepChoices: [
    { product_step_choice_id: 101 },
    { product_step_choice_id: 102 },
  ],
  maximumChoices: 1,
  selectedChoiceIds: [99, 101],
  selectableChoiceIds: new Set([99, 101, 102]),
  choiceSelectable: () => true,
  setSelection(selection) {
    this.selectedChoiceIds = selection
  },
}
wizardOptions.methods.toggleChoice.call(singleSelectionVm, 102)
assert.deepStrictEqual(
  singleSelectionVm.selectedChoiceIds,
  [99, 102],
  'maximum one must replace only the current step selection'
)

const multipleSelectionVm = {
  currentStepChoices: [
    { product_step_choice_id: 201 },
    { product_step_choice_id: 202 },
    { product_step_choice_id: 203 },
  ],
  maximumChoices: 2,
  selectedChoiceIds: [201, 202],
  selectableChoiceIds: new Set([201, 202, 203]),
  choiceSelectable: () => true,
  setSelection(selection) {
    this.selectedChoiceIds = selection
  },
}
wizardOptions.methods.toggleChoice.call(multipleSelectionVm, 203)
assert.deepStrictEqual(
  multipleSelectionVm.selectedChoiceIds,
  [201, 202],
  'multiple selection must stop at the configured maximum'
)
wizardOptions.methods.toggleChoice.call(multipleSelectionVm, 201)
assert.deepStrictEqual(
  multipleSelectionVm.selectedChoiceIds,
  [202],
  'multiple selection must allow deselection'
)

const summaryOptions = loadComponentOptions(
  cartSummarySource,
  ['formatPrice'],
  [(value) => Number(value).toFixed(2)]
)
assert.deepStrictEqual(
  summaryOptions.computed.groupedSelections.call({
    selections: [
      { step_name: 'Boisson', choice_name: 'Cola', extra_price: '0.50' },
      { step_name: 'Sauce', choice_name: 'Curry', extra_price: 0 },
      { step_name: 'Boisson', choice_name: 'Eau', extra_price: 0 },
    ],
  }),
  [
    {
      stepName: 'Boisson',
      choices: [
        { step_name: 'Boisson', choice_name: 'Cola', extra_price: '0.50' },
        { step_name: 'Boisson', choice_name: 'Eau', extra_price: 0 },
      ],
    },
    {
      stepName: 'Sauce',
      choices: [{ step_name: 'Sauce', choice_name: 'Curry', extra_price: 0 }],
    },
  ],
  'summary groups must preserve step and choice order'
)

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

const editSourceCart = [
  {
    id: 5,
    qty: 1,
    selectedChoiceIds: [10],
    selections: [{ product_step_choice_id: 10, product_step_id: 100 }],
    price: 9,
    subtotal: 9,
  },
  {
    id: 5,
    qty: 2,
    selectedChoiceIds: [30],
    selections: [{ product_step_choice_id: 30, product_step_id: 100 }],
    price: 10,
    subtotal: 20,
  },
]

const editedIntoExisting = replaceConfiguredCartLine(editSourceCart, 1, {
  ...editSourceCart[1],
  selectedChoiceIds: [10],
  selections: [{ product_step_choice_id: 10, product_step_id: 100 }],
  price: 9,
  subtotal: 18,
})

assert.deepStrictEqual(
  editedIntoExisting.map(({ configurationSignature, qty, subtotal }) => ({
    configurationSignature,
    qty,
    subtotal,
  })),
  [{ configurationSignature: '5:10', qty: 3, subtotal: 27 }],
  'editing a quantity-two line into an existing signature must merge quantities and remove the source line'
)
assert.strictEqual(editSourceCart.length, 2, 'cart edits must stay immutable')

const editedToDistinct = replaceConfiguredCartLine(editSourceCart, 1, {
  ...editSourceCart[1],
  selectedChoiceIds: [10, 30],
  price: 10.5,
  subtotal: 21,
})
assert.strictEqual(
  editedToDistinct.length,
  2,
  'editing to a distinct signature must preserve both cart lines'
)
assert.deepStrictEqual(
  editedToDistinct.map((line) => line.configurationSignature),
  ['5:10', '5:10,30']
)

const repricedCart = applyServerQuoteToCart(editSourceCart, {
  total: 24,
  items: [
    {
      product_id: 5,
      quantity: 1,
      selected_choice_ids: [10],
      unit_price: 9.5,
      total: 9.5,
    },
    {
      product_id: 5,
      quantity: 2,
      selected_choice_ids: [30],
      unit_price: 7.25,
      total: 14.5,
    },
  ],
})
assert.deepStrictEqual(
  repricedCart.map(({ price, qty, subtotal }) => ({ price, qty, subtotal })),
  [
    { price: 9.5, qty: 1, subtotal: 9.5 },
    { price: 7.25, qty: 2, subtotal: 14.5 },
  ],
  'a server quote must update matching configured lines without losing quantity'
)

assert.strictEqual(
  findCartLineIndexForCheckoutError(editSourceCart, {
    product_id: 5,
    product_step_id: 100,
  }),
  -1,
  'ambiguous product/step errors must not open the wrong configured line'
)
assert.strictEqual(
  findCartLineIndexForCheckoutError(editSourceCart, {
    product_step_choice_id: 30,
  }),
  1,
  'a unique contextual choice error must recover the matching line'
)
assert.strictEqual(
  findCartLineIndexForCheckoutError(
    [
      {
        id: 7,
        selections: [{ linked_product_id: 99 }],
      },
    ],
    { shortages: [{ product_id: 99 }] }
  ),
  0,
  'a linked-product stock shortage must recover the parent cart line'
)

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

const loadCartModule = (uuidv4) => {
  const source = fs.readFileSync(
    path.join(__dirname, '../store/cart.js'),
    'utf8'
  )
  const executable = source
    .replace(/^import .*$/gm, '')
    .replace(/export const /g, 'const ')
    .concat('\nreturn { state, mutations, actions }')

  // eslint-disable-next-line no-new-func
  return new Function(
    'EasyAccess',
    'defaultMutations',
    'uuidv4',
    'require',
    executable
  )(
    () => ({}),
    () => ({}),
    uuidv4,
    require
  )
}

const menusPageSource = fs.readFileSync(
  path.join(__dirname, '../pages/menus.vue'),
  'utf8'
)
const cartPageSource = fs.readFileSync(
  path.join(__dirname, '../pages/cart.vue'),
  'utf8'
)

assert.ok(
  menusPageSource.includes('<ProductCustomizationWizard') &&
    menusPageSource.includes('mergeConfiguredCartLine'),
  'menus must add every configured product through the shared wizard and merge helper'
)
assert.ok(
  !menusPageSource.includes('selectedItem.product_customization'),
  'the legacy inline customization dialog must be removed from menus'
)
assert.ok(
  menusPageSource.includes('customization_available === false') &&
    menusPageSource.includes('customization_unavailable_reason'),
  'uncommandable products must expose the backend availability reason'
)
for (const cartContract of [
  '<CartCustomizationSummary',
  '<ProductCustomizationWizard',
  'replaceConfiguredCartLine',
  "'cart/checkoutOrder'",
  'ORDER_REPRICE_REQUIRED',
  ':initial-step-id="recoveryStepId"',
]) {
  assert.ok(
    cartPageSource.includes(cartContract),
    `cart ordering contract missing: ${cartContract}`
  )
}

const menusOptions = loadComponentOptions(
  menusPageSource,
  ['Loading', 'ProductCustomizationWizard', 'price', 'mergeConfiguredCartLine'],
  [{}, {}, {}, mergeConfiguredCartLine]
)

const menuProduct = {
  id: 5,
  name: 'Menu',
  price: 8,
  stock: 5,
  customization_available: true,
  customization_steps: [{ product_step_id: 100, choices: [] }],
}
const menusVm = {
  isKitchenClosed: false,
  cartItem: [],
  dataProduct: [menuProduct],
  selectedItem: null,
  selectedChoiceIds: [],
  customizationDialog: false,
  roundPrice: (value) => Math.round(Number(value) * 100) / 100,
  parsePrice: Number,
  totalPrice() {},
  indexCart() {},
  showKitchenClosedSnackbar() {},
  showAlert() {},
  customizationUnavailableReason(productValue) {
    return menusOptions.methods.customizationUnavailableReason.call(
      this,
      productValue
    )
  },
}

menusOptions.methods.addToCart.call(menusVm, menuProduct)
assert.strictEqual(menusVm.customizationDialog, true)
assert.strictEqual(menusVm.cartItem.length, 0)

menusVm.closeCustomizationWizard = () => {
  menusOptions.methods.closeCustomizationWizard.call(menusVm)
}
menusOptions.methods.confirmCustomization.call(menusVm, {
  selectedChoiceIds: [10],
  unitPrice: 9,
  selections: [
    {
      product_step_choice_id: 10,
      product_step_id: 100,
      choice_name: 'Cola',
      extra_price: 1,
    },
  ],
})
assert.deepStrictEqual(menusVm.cartItem[0].selectedChoiceIds, [10])
assert.strictEqual(menusVm.cartItem[0].configurationSignature, '5:10')
assert.strictEqual(menusVm.cartItem[0].subtotal, 9)

menusOptions.methods.addToCart.call(menusVm, {
  id: 6,
  name: 'Produit simple',
  price: 4,
  stock: 2,
  customization_available: true,
  customization_steps: [],
})
menusOptions.methods.addToCart.call(menusVm, {
  id: 6,
  name: 'Produit simple',
  price: 4,
  stock: 2,
  customization_available: true,
  customization_steps: [],
})
assert.deepStrictEqual(
  menusVm.cartItem.find((line) => line.id === 6),
  {
    id: 6,
    name: 'Produit simple',
    price: 4,
    stock: 2,
    customization_available: true,
    customization_steps: [],
    selectedChoiceIds: [],
    selections: [],
    customizationList: [],
    subtotal: 8,
    qty: 2,
    configurationSignature: '6:',
  }
)

const cartExecutable = cartPageSource
  .match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
  .replace(
    /const \{\s*isCounterPaymentAllowed,\s*isQrClientAccess,\s*\} = require\([^\n]+\)/m,
    ''
  )
  .replace(
    /const \{\s*buildStripeCheckoutSignature,\s*shouldAutoPrepareStripeCheckout,\s*\} = require\([^\n]+\)/m,
    ''
  )
  .replace('export default', 'return')

// eslint-disable-next-line no-new-func
const cartOptions = new Function(
  'loadStripe',
  'Loading',
  'ProductCustomizationWizard',
  'CartCustomizationSummary',
  'price',
  'applyServerQuoteToCart',
  'findCartLineIndexForCheckoutError',
  'replaceConfiguredCartLine',
  'isCounterPaymentAllowed',
  'isQrClientAccess',
  'buildStripeCheckoutSignature',
  'shouldAutoPrepareStripeCheckout',
  cartExecutable
)(
  () => null,
  {},
  {},
  {},
  {},
  applyServerQuoteToCart,
  findCartLineIndexForCheckoutError,
  replaceConfiguredCartLine,
  () => false,
  () => false,
  () => '',
  () => false
)

const cartEditVm = {
  dataCart: editSourceCart.map((line) => ({
    ...line,
    customization_steps: [{ product_step_id: 100 }],
  })),
  editingCartIndex: null,
  editingProduct: null,
  editingSelectedChoiceIds: [],
  recoveryStepId: null,
  customizationRecoveryMessage: '',
  customizationDialog: false,
  roundPrice: (value) => Math.round(Number(value) * 100) / 100,
  resetCheckoutAttempt() {},
  syncCartState(cart) {
    this.savedCart = cart
  },
  closeCartCustomization() {
    this.customizationDialog = false
  },
}
cartOptions.methods.editCartLine.call(cartEditVm, 1, 100, 'Corrigez ce choix')
assert.deepStrictEqual(cartEditVm.editingSelectedChoiceIds, [30])
assert.strictEqual(cartEditVm.recoveryStepId, 100)
assert.strictEqual(cartEditVm.customizationRecoveryMessage, 'Corrigez ce choix')

cartOptions.methods.confirmCartCustomization.call(cartEditVm, {
  selectedChoiceIds: [10],
  unitPrice: 9,
  selections: [{ product_step_choice_id: 10, product_step_id: 100 }],
})
assert.deepStrictEqual(
  cartEditVm.savedCart.map(({ qty, subtotal, configurationSignature }) => ({
    qty,
    subtotal,
    configurationSignature,
  })),
  [{ qty: 3, subtotal: 27, configurationSignature: '5:10' }],
  'the real cart confirm method must merge the edited quantity-two line'
)

const recoveryVm = {
  dataCart: editSourceCart,
  checkoutErrorMessage: '',
  pendingRepriceFlow: null,
  pendingRepricePaymentMethod: null,
  repriceDialog: false,
  syncCartState(cart) {
    this.repricedCart = cart
  },
  editCartLine(lineIndex, productStepId, message) {
    this.recoveredLine = { lineIndex, productStepId, message }
  },
}
cartOptions.methods.handleCheckoutError.call(
  recoveryVm,
  {
    code: 'ORDER_REPRICE_REQUIRED',
    message: 'Le prix a changé.',
    server_quote: {
      total: 18.5,
      items: [
        {
          product_id: 5,
          quantity: 1,
          selected_choice_ids: [10],
          unit_price: 9.5,
        },
        {
          product_id: 5,
          quantity: 2,
          selected_choice_ids: [30],
          unit_price: 4.5,
        },
      ],
    },
  },
  'order',
  'Espèce'
)
assert.strictEqual(recoveryVm.repriceDialog, true)
assert.strictEqual(recoveryVm.pendingRepriceFlow, 'order')
assert.deepStrictEqual(
  recoveryVm.repricedCart.map((line) => line.subtotal),
  [9.5, 9]
)

cartOptions.methods.handleCheckoutError.call(
  recoveryVm,
  {
    code: 'CUSTOMIZATION_CHOICE_NOT_ALLOWED',
    message: 'Ce choix n’est plus disponible.',
    product_step_id: 100,
    product_step_choice_id: 30,
  },
  'order',
  'Espèce'
)
assert.deepStrictEqual(recoveryVm.recoveredLine, {
  lineIndex: 1,
  productStepId: 100,
  message: 'Ce choix n’est plus disponible.',
})

const stripeChangeDispatches = []
const stripeChangeVm = {
  isQrClient: true,
  stripePaymentReady: true,
  stripeCheckoutSignature: 'old-checkout',
  currentStripeCheckoutSignature: 'changed-checkout',
  resetStripePaymentElement() {
    this.stripePaymentReady = false
  },
  scheduleStripeAutoPrepare() {},
  $store: {
    dispatch(type) {
      stripeChangeDispatches.push(type)
    },
  },
}
cartOptions.methods.handleStripeCheckoutChange.call(stripeChangeVm)
assert.deepStrictEqual(
  stripeChangeDispatches,
  ['cart/abandonCheckout'],
  'changing a prepared Stripe payload must start a new logical checkout token'
)

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

  let uuidCount = 0
  const cartModule = loadCartModule(() => `checkout-token-${++uuidCount}`)
  const cartState = cartModule.state()
  const checkoutDispatches = []
  const checkoutCommits = []
  const checkoutCalls = []
  const checkoutContext = {
    state: cartState,
    dispatch(type, payload) {
      checkoutDispatches.push([type, payload])
      if (type === 'set/clientOrderToken') {
        cartState.clientOrderToken = payload
      }
    },
    commit(type, payload) {
      checkoutCommits.push([type, payload])
    },
  }
  const checkoutInput = {
    customer: 'Alice',
    customerID: 12,
    payment: 'Espèce',
    remark: 'Sans couverts',
    phone: '0600000000',
    total: 18,
    dataCart: [
      {
        id: 5,
        qty: 2,
        price: 9,
        subtotal: 18,
        selectedChoiceIds: [30, 10],
      },
    ],
  }
  const checkoutApi = {
    $axios: {
      post(url, payload) {
        checkoutCalls.push([url, payload])
        if (checkoutCalls.length === 1)
          return Promise.reject(new Error('network'))
        return Promise.resolve({
          data: {
            message: 'Commande créée.',
            data: { orderId: 44, total: 18 },
          },
        })
      },
    },
  }

  const failedCheckout = await cartModule.actions.checkoutOrder.call(
    checkoutApi,
    checkoutContext,
    checkoutInput
  )
  assert.strictEqual(failedCheckout.ok, false)
  assert.strictEqual(failedCheckout.data, null)
  assert.strictEqual(failedCheckout.error.message, 'network')
  assert.strictEqual(
    cartState.clientOrderToken,
    'checkout-token-1',
    'transient failures must preserve the current logical checkout token'
  )

  const successfulCheckout = await cartModule.actions.checkoutOrder.call(
    checkoutApi,
    checkoutContext,
    checkoutInput
  )
  assert.deepStrictEqual(successfulCheckout, {
    ok: true,
    data: { orderId: 44, total: 18 },
    error: null,
  })
  assert.strictEqual(uuidCount, 1, 'a retry must reuse the same UUID')
  assert.deepStrictEqual(checkoutCalls[0], [
    '/baseurl/api/v1/orders/checkout',
    {
      client_order_token: 'checkout-token-1',
      expected_total: 18,
      customer: 'Alice',
      customerID: 12,
      payment: 'Espèce',
      remark: 'Sans couverts',
      phone: '0600000000',
      items: [
        {
          product_id: 5,
          quantity: 2,
          selected_product_step_choice_ids: [10, 30],
        },
      ],
    },
  ])
  assert.strictEqual(
    cartState.clientOrderToken,
    null,
    'a completed non-Stripe checkout must clear its token'
  )
  assert.deepStrictEqual(checkoutCommits, [['ADD_ORDER_SENT', 44]])

  const repriceState = cartModule.state()
  const repriceTokens = []
  let repriceRequestCount = 0
  const repriceContext = {
    state: repriceState,
    dispatch(type, payload) {
      if (type === 'set/clientOrderToken') {
        repriceState.clientOrderToken = payload
      }
    },
    commit() {},
  }
  const repriceApi = {
    $axios: {
      post(_url, payload) {
        repriceTokens.push(payload.client_order_token)
        repriceRequestCount += 1
        if (repriceRequestCount === 1) {
          const error = new Error('Le prix a changé.')
          error.response = {
            status: 409,
            data: {
              message: 'Le prix a changé.',
              data: {
                code: 'ORDER_REPRICE_REQUIRED',
                server_quote: { total: 19, items: [] },
              },
            },
          }
          return Promise.reject(error)
        }
        return Promise.resolve({ data: { data: { orderId: 45 } } })
      },
    },
  }
  const repriceResult = await cartModule.actions.checkoutOrder.call(
    repriceApi,
    repriceContext,
    checkoutInput
  )
  assert.strictEqual(repriceResult.error.code, 'ORDER_REPRICE_REQUIRED')
  assert.deepStrictEqual(repriceResult.error.server_quote, {
    total: 19,
    items: [],
  })
  await cartModule.actions.checkoutOrder.call(repriceApi, repriceContext, {
    ...checkoutInput,
    total: 19,
  })
  assert.strictEqual(
    repriceTokens[0],
    repriceTokens[1],
    'repricing confirmation must reuse the same checkout token'
  )

  const stripeState = cartModule.state()
  const stripeCalls = []
  const stripeContext = {
    state: stripeState,
    dispatch(type, payload) {
      if (type === 'set/clientOrderToken')
        stripeState.clientOrderToken = payload
    },
    commit() {},
  }
  const stripeResult = await cartModule.actions.checkoutOrder.call(
    {
      $axios: {
        post(url, payload) {
          stripeCalls.push([url, payload])
          return Promise.resolve({
            data: { data: { orderId: 55, clientSecret: 'secret' } },
          })
        },
      },
    },
    stripeContext,
    { ...checkoutInput, stripe: true, payment: 'Stripe' }
  )
  assert.strictEqual(stripeResult.ok, true)
  assert.strictEqual(
    stripeCalls[0][0],
    '/baseurl/api/v1/stripe/payment-intents/qr-table'
  )
  assert.ok(
    stripeState.clientOrderToken,
    'PaymentIntent preparation must retain the token until final payment or abandonment'
  )
  cartModule.actions.abandonCheckout(stripeContext)
  assert.strictEqual(stripeState.clientOrderToken, null)
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
