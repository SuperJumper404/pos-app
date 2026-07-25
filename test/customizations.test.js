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
  buildCheckoutPayloadSignature,
  applyServerQuoteToCart,
  findCartTargetForCheckoutError,
  createComponentInputId,
  serializeProductCustomizationConfig,
  nextVisibleStepIndex,
  findStepIndexById,
  groupCustomizationSelections,
} = require('../helpers/customizations')
const {
  parsePersistedState,
  serializePersistedState,
} = require('../helpers/persistedState')

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

const shuffledSnapshotSelections = [
  {
    product_customization_step_id: 20,
    step_name: 'Sauces',
    step_position: 1,
    choice_name: 'Curry',
    choice_position: 1,
    unit_extra_price: '0.50',
  },
  {
    product_customization_step_id: 10,
    step_name: 'Boisson',
    step_position: 0,
    choice_name: 'Eau',
    choice_position: 1,
    unit_extra_price: 0,
  },
  {
    product_customization_step_id: 20,
    step_name: 'Sauces',
    step_position: 1,
    choice_name: 'Barbecue',
    choice_position: 0,
    unit_extra_price: 0,
  },
  {
    product_customization_step_id: 10,
    step_name: 'Boisson',
    step_position: 0,
    choice_name: 'Cola',
    choice_position: 0,
    unit_extra_price: '1.25',
  },
]
const originalSnapshotSelections = JSON.parse(
  JSON.stringify(shuffledSnapshotSelections)
)
assert.deepStrictEqual(
  groupCustomizationSelections(shuffledSnapshotSelections),
  [
    {
      stepName: 'Boisson',
      choices: [
        { name: 'Cola', price: 1.25 },
        { name: 'Eau', price: 0 },
      ],
    },
    {
      stepName: 'Sauces',
      choices: [
        { name: 'Barbecue', price: 0 },
        { name: 'Curry', price: 0.5 },
      ],
    },
  ],
  'snapshot groups must follow step_position then choice_position'
)
assert.deepStrictEqual(
  shuffledSnapshotSelections,
  originalSnapshotSelections,
  'grouping snapshots must not mutate the API response'
)
assert.deepStrictEqual(
  groupCustomizationSelections([
    {
      product_customization_step_id: 200,
      step_name: 'Sauces',
      step_position: 1,
      name: 'AlgÃ©rienne',
      choice_position: 0,
      price: '1.00',
    },
    {
      product_customization_step_id: 100,
      step_name: 'Sauces',
      step_position: 0,
      name: 'Ketchup',
      choice_position: 0,
      price: 0,
    },
  ]),
  [
    {
      stepName: 'Sauces',
      choices: [{ name: 'Ketchup', price: 0 }],
    },
    {
      stepName: 'Sauces',
      choices: [{ name: 'AlgÃ©rienne', price: 1 }],
    },
  ],
  'distinct backend step ids with the same label must remain separate'
)
assert.deepStrictEqual(
  groupCustomizationSelections([
    {
      product_customization_step_id: 10,
      step_name: 'Options',
      step_position: 2,
      name: 'A second',
      choice_position: 5,
      price: 0,
    },
    {
      product_customization_step_id: 20,
      step_name: 'Options',
      step_position: 2,
      name: 'B first',
      choice_position: 0,
      price: 0,
    },
    {
      product_customization_step_id: 10,
      step_name: 'Options',
      step_position: 2,
      name: 'A first',
      choice_position: 0,
      price: 0,
    },
  ]),
  [
    {
      stepName: 'Options',
      choices: [
        { name: 'A first', price: 0 },
        { name: 'A second', price: 0 },
      ],
    },
    {
      stepName: 'Options',
      choices: [{ name: 'B first', price: 0 }],
    },
  ],
  'choice positions must not reorder groups with equal step positions'
)
assert.deepStrictEqual(
  groupCustomizationSelections([
    {
      product_customization_step_id: 30,
      step_name: 'Extras',
      step_position: null,
      name: 'C second',
      choice_position: 4,
      price: 0,
    },
    {
      product_customization_step_id: 40,
      step_name: 'Extras',
      step_position: null,
      name: 'D first',
      choice_position: 0,
      price: 0,
    },
    {
      product_customization_step_id: 30,
      step_name: 'Extras',
      step_position: null,
      name: 'C first',
      choice_position: 0,
      price: 0,
    },
  ]),
  [
    {
      stepName: 'Extras',
      choices: [
        { name: 'C first', price: 0 },
        { name: 'C second', price: 0 },
      ],
    },
    {
      stepName: 'Extras',
      choices: [{ name: 'D first', price: 0 }],
    },
  ],
  'missing step positions must preserve original group order'
)
assert.deepStrictEqual(
  groupCustomizationSelections([
    null,
    { name: 'Sans oignon', price: '0.00' },
    'invalid',
    { name: 'Bacon', price: '2.50' },
    {},
  ]),
  [
    {
      stepName: 'Personnalisation',
      choices: [
        { name: 'Sans oignon', price: 0 },
        { name: 'Bacon', price: 2.5 },
      ],
    },
  ],
  'legacy name/price entries must remain readable under one fallback group'
)
assert.deepStrictEqual(groupCustomizationSelections(null), [])
assert.deepStrictEqual(groupCustomizationSelections([null, {}, false]), [])
assert.deepStrictEqual(
  groupCustomizationSelections([
    {
      product_step_id: 72,
      step_name: 'Boisson',
      choice_name: 'Cola',
      extra_price: '1.50',
    },
  ]),
  [
    {
      stepName: 'Boisson',
      stepId: 72,
      choices: [{ name: 'Cola', price: 1.5 }],
    },
  ],
  'current cart groups must retain the editable product step id'
)
assert.deepStrictEqual(
  groupCustomizationSelections([
    {
      step_name: 'Boisson',
      step_position: 0,
      choice_name: 'Sans position',
      choice_position: null,
      unit_extra_price: 0,
    },
    {
      step_name: 'Boisson',
      step_position: 0,
      choice_name: 'Premier',
      choice_position: 0,
      unit_extra_price: 0,
    },
  ]),
  [
    {
      stepName: 'Boisson',
      choices: [
        { name: 'Premier', price: 0 },
        { name: 'Sans position', price: 0 },
      ],
    },
  ],
  'missing positions must follow explicitly positioned snapshots'
)
assert.deepStrictEqual(
  groupCustomizationSelections([
    { name: 'Legacy duplicate', price: 3 },
    {
      step_name: 'Boisson',
      name: 'Cola',
      step_position: 0,
      choice_position: 0,
      price: 1,
    },
  ]),
  [
    {
      stepName: 'Boisson',
      choices: [{ name: 'Cola', price: 1 }],
    },
  ],
  'V2 snapshots must take precedence when a legacy projection coexists'
)

for (const pageFile of [
  '../pages/history/index.vue',
  '../pages/cashregister/details/_id.vue',
]) {
  const source = fs.readFileSync(path.join(__dirname, pageFile), 'utf8')
  for (const contractToken of [
    'groupCustomizationSelections',
    'customizationGroups(itm)',
    'group.stepName',
    'group.choices',
  ]) {
    assert.ok(
      source.includes(contractToken),
      `${pageFile} customization display missing: ${contractToken}`
    )
  }
}

const orderDetailSource = fs.readFileSync(
  path.join(__dirname, '../pages/orders/detail/_id.vue'),
  'utf8'
)
for (const contractToken of [
  'groupCustomizationSelections',
  'customizationGroups(itm)',
  '<CustomizationSummary',
  ':groups="customizationGroups(itm)"',
]) {
  assert.ok(
    orderDetailSource.includes(contractToken),
    `order detail shared customization display missing: ${contractToken}`
  )
}

const choiceCardPath = path.join(
  __dirname,
  '../components/products/CustomizationChoiceCard.vue'
)
const wizardPath = path.join(
  __dirname,
  '../components/products/ProductCustomizationWizard.vue'
)
const customizationSummaryPath = path.join(
  __dirname,
  '../components/products/CustomizationSummary.vue'
)
const legacyCartSummaryPath = path.join(
  __dirname,
  '../components/products/CartCustomizationSummary.vue'
)
assert.ok(
  fs.existsSync(customizationSummaryPath),
  'the shared customization summary component must exist'
)
assert.ok(
  !fs.existsSync(legacyCartSummaryPath),
  'the cart-only customization summary must be removed'
)
const choiceCardSource = fs.readFileSync(choiceCardPath, 'utf8')
const wizardSource = fs.readFileSync(wizardPath, 'utf8')
const customizationSummarySource = fs.readFileSync(
  customizationSummaryPath,
  'utf8'
)

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
  customizationSummarySource.includes('editable') &&
    customizationSummarySource.includes('showTotal') &&
    customizationSummarySource.includes('Total'),
  'the shared summary must expose independent edit and total modes'
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
    'CustomizationSummary',
    'groupCustomizationSelections',
    'calculatePreviewUnitPrice',
    'findStepIndexById',
    'nextVisibleStepIndex',
    'validateStep',
  ],
  [
    {},
    {},
    groupCustomizationSelections,
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
  customizationSummarySource,
  ['formatPrice', 'parsePrice'],
  [(value) => Number(value).toFixed(2), Number]
)
assert.strictEqual(summaryOptions.props.editable.default, false)
assert.strictEqual(summaryOptions.props.showTotal.default, false)
const summaryEvents = []
summaryOptions.methods.editGroup.call(
  {
    editable: true,
    canEditGroup: summaryOptions.methods.canEditGroup,
    $emit: (...args) => summaryEvents.push(args),
  },
  { stepId: 72 }
)
summaryOptions.methods.editGroup.call(
  {
    editable: false,
    canEditGroup: summaryOptions.methods.canEditGroup,
    $emit: (...args) => summaryEvents.push(args),
  },
  { stepId: 73 }
)
assert.deepStrictEqual(
  summaryEvents,
  [['edit', 72]],
  'the summary must emit edit only in editable mode'
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

const checkoutSignatureInput = {
  customer: ' Alice ',
  customerID: 12,
  payment: 'Stripe',
  remark: ' Sans couverts ',
  phone: ' 0600000000 ',
  total: 18,
  stripe: true,
  dataCart: [
    {
      id: 5,
      qty: 2,
      selectedChoiceIds: [30, 10],
    },
  ],
}
const checkoutPayloadSignature = buildCheckoutPayloadSignature(
  checkoutSignatureInput
)
assert.strictEqual(
  checkoutPayloadSignature,
  buildCheckoutPayloadSignature({
    ...checkoutSignatureInput,
    customer: 'Alice',
    remark: 'Sans couverts',
    phone: '0600000000',
    dataCart: [
      {
        id: 5,
        qty: 2,
        selectedChoiceIds: [10, 30],
      },
    ],
  }),
  'canonical checkout signatures must normalize strings and selected id order'
)
for (const [label, changedInput] of [
  ['customer', { customer: 'Bob' }],
  ['table', { customerID: 13 }],
  ['phone', { phone: '0700000000' }],
  ['remark', { remark: 'Avec couverts' }],
  ['payment', { payment: 'Espèce' }],
  ['flow', { stripe: false }],
  ['total', { total: 19 }],
  ['quantity', { dataCart: [{ id: 5, qty: 3, selectedChoiceIds: [10, 30] }] }],
  ['choices', { dataCart: [{ id: 5, qty: 2, selectedChoiceIds: [10] }] }],
]) {
  assert.notStrictEqual(
    checkoutPayloadSignature,
    buildCheckoutPayloadSignature({
      ...checkoutSignatureInput,
      ...changedInput,
    }),
    `${label} must participate in the checkout attempt signature`
  )
}

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
  findCartTargetForCheckoutError(editSourceCart, {
    product_id: 5,
    product_step_id: 100,
  }),
  null,
  'ambiguous product/step errors must not open the wrong configured line'
)
assert.deepStrictEqual(
  findCartTargetForCheckoutError(editSourceCart, {
    product_id: 5,
    product_step_choice_id: 30,
  }),
  { lineIndex: 1, productStepId: 100 },
  'a unique contextual choice error must recover the matching line'
)
assert.deepStrictEqual(
  findCartTargetForCheckoutError(
    [
      {
        id: 7,
        selections: [{ linked_product_id: 99, product_step_id: 700 }],
      },
    ],
    { shortages: [{ product_id: 99 }] }
  ),
  { lineIndex: 0, productStepId: 700 },
  'a linked-product stock shortage must recover its exact parent step'
)
assert.strictEqual(
  findCartTargetForCheckoutError(
    [
      {
        id: 7,
        selections: [{ linked_product_id: 99, product_step_id: 700 }],
      },
    ],
    { shortages: [{ product_id: 7 }] }
  ),
  null,
  'a parent product shortage must not open an unrelated customization step'
)
assert.strictEqual(
  findCartTargetForCheckoutError(
    [
      {
        id: 7,
        selections: [{ linked_product_id: 99, product_step_id: 700 }],
      },
      {
        id: 8,
        selections: [{ linked_product_id: 99, product_step_id: 800 }],
      },
    ],
    { shortages: [{ product_id: 99 }] }
  ),
  null,
  'multiple linked-product shortage matches must remain untargeted'
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
const stepDeactivationMethod = customizationAdminPageSource.match(
  /async confirmStepDeactivation\(\)[\s\S]*?\n {4}reactivateStep\(\)/
)[0]
assert.ok(
  stepDeactivationMethod.includes("'customizations/updateStep'") &&
    !stepDeactivationMethod.includes("'customizations/deleteStep'"),
  'deactivation must use PATCH and never invoke permanent deletion'
)
assert.ok(
  customizationAdminPageSource.includes('Supprimer définitivement'),
  'step administration must expose permanent deletion'
)
assert.ok(
  customizationAdminPageSource.includes('stepDeleteDialog: false') &&
    customizationAdminPageSource.includes('stepToDeleteId: null'),
  'permanent deletion must use state separate from deactivation'
)
assert.ok(
  customizationAdminPageSource.includes('@click="requestStepDeletion()"'),
  'permanent deletion must require an explicit confirmation request'
)
assert.ok(
  customizationAdminPageSource.includes('stepToDeleteProducts'),
  'the deletion dialog must list products attached to its explicit target'
)
assert.ok(
  customizationAdminPageSource.includes(
    'if (!this.stepToDeleteId || this.savingStep) return'
  ),
  'step deletion must guard a missing target and duplicate retries'
)
assert.match(
  customizationAdminPageSource,
  /if \(!deleted\) return[\s\S]{0,180}this\.stepToDeleteId = null/,
  'failed permanent deletion must preserve its target'
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

const applyCartStateDispatch = (state, type, payload) => {
  if (!type.startsWith('set/')) return
  state[type.slice(4)] = payload
}

const menusPageSource = fs.readFileSync(
  path.join(__dirname, '../pages/menus.vue'),
  'utf8'
)
const cartPageSource = fs.readFileSync(
  path.join(__dirname, '../pages/cart.vue'),
  'utf8'
)
const axiosPluginSource = fs.readFileSync(
  path.join(__dirname, '../plugins/axios.js'),
  'utf8'
)
const loadAxiosPlugin = () =>
  // eslint-disable-next-line no-new-func
  new Function(
    'require',
    axiosPluginSource.replace('export default', 'return')
  )(require)

const loadStoreModule = (storeFile, config = null) => {
  const source = fs.readFileSync(path.join(__dirname, storeFile), 'utf8')
  const executable = source
    .replace(/^import .*$/gm, '')
    .replace(/export const /g, 'const ')
    .concat('\nreturn { state, mutations, actions }')
  const configStub = config || {
    environments: {
      [process.env.ENV]: { backEndPoint: 'http://localhost:5005' },
    },
  }

  // eslint-disable-next-line no-new-func
  return new Function('EasyAccess', 'defaultMutations', 'require', executable)(
    () => ({}),
    () => ({}),
    (request) =>
      request.includes('config.json') ? configStub : require(request)
  )
}

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
  '<CustomizationSummary',
  '<ProductCustomizationWizard',
  'replaceConfiguredCartLine',
  "'cart/checkoutOrder'",
  'ORDER_REPRICE_REQUIRED',
  ':initial-step-id="recoveryStepId"',
  "'formuser.notes'()",
  "'formuser.payment'()",
  'beforeRouteLeave',
  "'cart/cancelStripeCheckout'",
  '!checkoutPayloadMatchesBoundAttempt',
]) {
  assert.ok(
    cartPageSource.includes(cartContract),
    `cart ordering contract missing: ${cartContract}`
  )
}
const cartHeaderBlock = cartPageSource.match(
  /<div class="cart-summary-text">[\s\S]*?<\/div>\s*<\/v-col>/
)[0]
assert.ok(
  cartHeaderBlock.includes('Modifier toutes les options') &&
    cartHeaderBlock.includes('@click="editCartLine(itemIndex)"'),
  'the global pencil action must live below product name and price'
)
assert.notStrictEqual(
  buildCheckoutPayloadSignature({
    customer: 'Ada',
    customerID: 12,
    total: 10,
    payment: 'cash',
    dataCart: [{ id: 10, qty: 1, selectedChoiceIds: [] }],
    isTakeaway: false,
  }),
  buildCheckoutPayloadSignature({
    customer: 'Ada',
    customerID: 12,
    total: 10,
    payment: 'cash',
    dataCart: [{ id: 10, qty: 1, selectedChoiceIds: [] }],
    isTakeaway: true,
  })
)
const cartCustomizationBlock = cartPageSource.match(
  /<v-col class="cart-summary-customizations pt-2">[\s\S]*?<\/v-col>/
)[0]
assert.ok(
  !cartCustomizationBlock.includes('mdi-pencil'),
  'the global pencil action must not remain beside per-step edit actions'
)

const menusOptions = loadComponentOptions(
  menusPageSource,
  [
    'Loading',
    'ProductCustomizationWizard',
    'price',
    'mergeConfiguredCartLine',
    'replaceConfiguredCartLine',
  ],
  [{}, {}, {}, mergeConfiguredCartLine, replaceConfiguredCartLine]
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
  editingCartIndex: null,
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

menusOptions.methods.addToCart.call(menusVm, menuProduct)
menusOptions.methods.confirmCustomization.call(menusVm, {
  selectedChoiceIds: [30],
  unitPrice: 10,
  selections: [
    {
      product_step_choice_id: 30,
      product_step_id: 100,
      choice_name: 'Frites',
      extra_price: 2,
    },
  ],
})
menusVm.cartItem[1].qty = 2
menusVm.cartItem[1].subtotal = 20

menusOptions.methods.editCartLine.call(menusVm, 1)
assert.strictEqual(menusVm.editingCartIndex, 1)
assert.deepStrictEqual(menusVm.selectedChoiceIds, [30])
assert.strictEqual(menusVm.customizationDialog, true)

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
assert.deepStrictEqual(
  menusVm.cartItem.map(({ configurationSignature, qty, subtotal }) => ({
    configurationSignature,
    qty,
    subtotal,
  })),
  [{ configurationSignature: '5:10', qty: 3, subtotal: 27 }],
  'editing from menus must preserve the whole source quantity and merge matching configurations'
)
assert.strictEqual(menusVm.editingCartIndex, null)

const cartBeforeInvalidEdit = JSON.parse(JSON.stringify(menusVm.cartItem))
menusVm.editingCartIndex = 99
menusVm.selectedItem = menuProduct
menusOptions.methods.confirmCustomization.call(menusVm, {
  selectedChoiceIds: [10],
  unitPrice: 9,
  selections: [],
})
assert.deepStrictEqual(
  menusVm.cartItem,
  cartBeforeInvalidEdit,
  'an edit whose source line disappeared must not add or mutate a cart line'
)

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
    /const \{\s*shouldAutoPrepareStripeCheckout\s*\} = require\([^\n]+\)/m,
    ''
  )
  .replace('export default', 'return')

// eslint-disable-next-line no-new-func
const cartOptions = new Function(
  'loadStripe',
  'Loading',
  'ProductCustomizationWizard',
  'CustomizationSummary',
  'price',
  'applyServerQuoteToCart',
  'findCartTargetForCheckoutError',
  'replaceConfiguredCartLine',
  'isCounterPaymentAllowed',
  'isQrClientAccess',
  'buildCheckoutPayloadSignature',
  'shouldAutoPrepareStripeCheckout',
  cartExecutable
)(
  () => null,
  {},
  {},
  {},
  {},
  applyServerQuoteToCart,
  findCartTargetForCheckoutError,
  replaceConfiguredCartLine,
  () => false,
  () => false,
  buildCheckoutPayloadSignature,
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
  let orderEditCheckoutDispatches = 0
  const orderEditReset = await cartOptions.methods.resetCheckoutAttempt.call({
    isOrderEditActive: true,
    clearStripeAutoPrepareTimeout() {},
    resetStripePaymentElement() {},
    $store: {
      dispatch() {
        orderEditCheckoutDispatches += 1
      },
    },
  })
  assert.strictEqual(orderEditReset, true)
  assert.strictEqual(
    orderEditCheckoutDispatches,
    0,
    'editing a cart line must not abandon or replace the normal checkout state'
  )

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
      applyCartStateDispatch(cartState, type, payload)
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
  assert.strictEqual(cartState.clientOrderStatus, 'uncertain')
  assert.ok(cartState.clientOrderSignature)
  assert.strictEqual(cartState.clientOrderPayload.customer, 'Alice')

  const changedUncertainCheckout = await cartModule.actions.checkoutOrder.call(
    checkoutApi,
    checkoutContext,
    { ...checkoutInput, customer: 'Bob' }
  )
  assert.strictEqual(changedUncertainCheckout.ok, false)
  assert.strictEqual(
    changedUncertainCheckout.error.code,
    'CHECKOUT_ATTEMPT_UNRESOLVED'
  )
  assert.strictEqual(
    checkoutCalls.length,
    1,
    'a changed payload must not be sent while the previous request is uncertain'
  )
  assert.strictEqual(cartState.clientOrderPayload.customer, 'Alice')

  const unsafeAbandon = cartModule.actions.abandonCheckout(checkoutContext)
  assert.strictEqual(unsafeAbandon.ok, false)
  assert.strictEqual(cartState.clientOrderToken, 'checkout-token-1')

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
      is_takeaway: false,
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

  const authRetryState = cartModule.state()
  let authRetryRequestCount = 0
  const authRetryContext = {
    state: authRetryState,
    dispatch(type, payload) {
      applyCartStateDispatch(authRetryState, type, payload)
    },
    commit() {},
  }
  const authRetryApi = {
    $axios: {
      post() {
        authRetryRequestCount += 1
        if (authRetryRequestCount === 1) {
          return Promise.reject(new Error('network'))
        }
        const error = new Error('Session expirée.')
        error.response = {
          status: 401,
          data: { message: 'Session expirée.', data: {} },
        }
        return Promise.reject(error)
      },
    },
  }
  await cartModule.actions.checkoutOrder.call(
    authRetryApi,
    authRetryContext,
    checkoutInput
  )
  const uncertainRetryToken = authRetryState.clientOrderToken
  const uncertainRetryPayload = authRetryState.clientOrderPayload
  await cartModule.actions.checkoutOrder.call(
    authRetryApi,
    authRetryContext,
    checkoutInput
  )
  assert.strictEqual(
    authRetryState.clientOrderStatus,
    'uncertain',
    'an exact uncertain retry rejected by auth must remain unsafe'
  )
  assert.strictEqual(authRetryState.clientOrderToken, uncertainRetryToken)
  assert.deepStrictEqual(
    authRetryState.clientOrderPayload,
    uncertainRetryPayload
  )

  const pendingAuthState = cartModule.state()
  pendingAuthState.clientOrderToken = 'pending-token'
  pendingAuthState.clientOrderSignature =
    buildCheckoutPayloadSignature(checkoutInput)
  pendingAuthState.clientOrderPayload = { customer: 'Alice' }
  pendingAuthState.clientOrderStatus = 'pending'
  const pendingAuthError = new Error('Accès refusé.')
  pendingAuthError.response = {
    status: 403,
    data: { message: 'Accès refusé.', data: {} },
  }
  await cartModule.actions.checkoutOrder.call(
    { $axios: { post: () => Promise.reject(pendingAuthError) } },
    {
      state: pendingAuthState,
      dispatch(type, payload) {
        applyCartStateDispatch(pendingAuthState, type, payload)
      },
      commit() {},
    },
    checkoutInput
  )
  assert.strictEqual(pendingAuthState.clientOrderStatus, 'uncertain')
  assert.strictEqual(pendingAuthState.clientOrderToken, 'pending-token')

  const repriceState = cartModule.state()
  const repriceTokens = []
  let repriceRequestCount = 0
  const repriceContext = {
    state: repriceState,
    dispatch(type, payload) {
      applyCartStateDispatch(repriceState, type, payload)
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
  assert.strictEqual(repriceState.clientOrderStatus, 'reprice_required')
  await cartModule.actions.checkoutOrder.call(repriceApi, repriceContext, {
    ...checkoutInput,
    total: 19,
    repriceConfirmation: true,
  })
  assert.strictEqual(
    repriceTokens[0],
    repriceTokens[1],
    'repricing confirmation must reuse the same checkout token'
  )

  const prewriteState = cartModule.state()
  const prewriteTokens = []
  let prewriteRequestCount = 0
  const prewriteContext = {
    state: prewriteState,
    dispatch(type, payload) {
      applyCartStateDispatch(prewriteState, type, payload)
    },
    commit() {},
  }
  const prewriteApi = {
    $axios: {
      post(_url, payload) {
        prewriteTokens.push(payload.client_order_token)
        prewriteRequestCount += 1
        if (prewriteRequestCount === 1) {
          const error = new Error('Stock insuffisant.')
          error.response = {
            status: 409,
            data: {
              message: 'Stock insuffisant.',
              data: { code: 'INSUFFICIENT_STOCK', shortages: [] },
            },
          }
          return Promise.reject(error)
        }
        return Promise.resolve({ data: { data: { orderId: 46 } } })
      },
    },
  }
  await cartModule.actions.checkoutOrder.call(
    prewriteApi,
    prewriteContext,
    checkoutInput
  )
  assert.strictEqual(prewriteState.clientOrderStatus, 'prewrite_rejected')
  await cartModule.actions.checkoutOrder.call(prewriteApi, prewriteContext, {
    ...checkoutInput,
    customer: 'Bob',
  })
  assert.notStrictEqual(
    prewriteTokens[0],
    prewriteTokens[1],
    'a confirmed pre-write rejection may safely rotate the token for a changed payload'
  )

  for (const precondition of [
    { status: 401, code: null, label: 'authentication rejection' },
    { status: 403, code: null, label: 'authorization rejection' },
    { status: 404, code: 'SHOP_NOT_FOUND', label: 'missing shop' },
    { status: 409, code: 'KITCHEN_CLOSED', label: 'closed kitchen' },
    {
      status: 422,
      code: 'STRIPE_PAYMENT_DISABLED',
      label: 'disabled Stripe payment',
    },
    {
      status: 422,
      code: 'STRIPE_CONNECT_INCOMPLETE',
      label: 'incomplete Stripe Connect account',
    },
  ]) {
    const state = cartModule.state()
    const context = {
      state,
      dispatch(type, payload) {
        applyCartStateDispatch(state, type, payload)
      },
      commit() {},
    }
    const error = new Error(precondition.label)
    error.response = {
      status: precondition.status,
      data: {
        message: precondition.label,
        data: precondition.code ? { code: precondition.code } : {},
      },
    }
    await cartModule.actions.checkoutOrder.call(
      { $axios: { post: () => Promise.reject(error) } },
      context,
      { ...checkoutInput, stripe: true, payment: 'Stripe' }
    )
    assert.strictEqual(
      state.clientOrderStatus,
      'prewrite_rejected',
      `${precondition.label} must be safe to abandon before auth/menu redirect`
    )
    const abandoned = cartModule.actions.abandonCheckout(context)
    assert.strictEqual(abandoned.ok, true)
    assert.strictEqual(state.clientOrderToken, null)
  }

  for (const status of [404, 422]) {
    const state = cartModule.state()
    const context = {
      state,
      dispatch(type, payload) {
        applyCartStateDispatch(state, type, payload)
      },
      commit() {},
    }
    const error = new Error(`code-less ${status}`)
    error.response = {
      status,
      data: { message: `code-less ${status}`, data: {} },
    }
    await cartModule.actions.checkoutOrder.call(
      { $axios: { post: () => Promise.reject(error) } },
      context,
      checkoutInput
    )
    assert.strictEqual(
      state.clientOrderStatus,
      'uncertain',
      `an arbitrary code-less ${status} must not be assumed pre-write safe`
    )
    assert.strictEqual(cartModule.actions.abandonCheckout(context).ok, false)
  }

  const rootStoreModule = loadStoreModule('../store/index.js')
  const userStoreModule = loadStoreModule('../store/users.js')
  const rootActions = rootStoreModule.actions
  const userActions = userStoreModule.actions
  const rootAuthDispatches = []
  await rootActions.clearAuthentication({
    dispatch(type, payload) {
      rootAuthDispatches.push([type, payload])
    },
  })
  assert.deepStrictEqual(rootAuthDispatches, [['set/authenticated', false]])
  const userAuthDispatches = []
  await userActions.clearAuthenticatedUser({
    dispatch(type, payload) {
      userAuthDispatches.push([type, payload])
    },
  })
  assert.deepStrictEqual(userAuthDispatches, [
    ['set/user.id', null],
    ['set/user.access', null],
    ['set/user.token', null],
    ['set/user.shopid', null],
  ])

  const originalRecovery = {
    clientOrderToken: 'auth-checkout-token',
    clientOrderSignature: 'auth-checkout-signature',
    clientOrderPayload: {
      customer: 'Alice',
      items: [{ product_id: 7, quantity: 2 }],
    },
    clientOrderOrderId: 55,
    clientOrderStatus: 'stripe_prepared',
  }
  const createAuthState = (bearer) => ({
    authenticated: true,
    users: {
      user: { id: 12, access: 1, token: bearer, shopid: 4 },
    },
    cart: {
      ...JSON.parse(JSON.stringify(originalRecovery)),
      clientOrderAuthRedirect: false,
    },
  })
  const createLocalStorage = (state, events) => {
    const values = new Map([
      ['idUser', String(state.users.user.id)],
      ['access', String(state.users.user.access)],
      ['token', state.users.user.token],
      ['shopid', String(state.users.user.shopid)],
      ['vuex', serializePersistedState(state)],
    ])
    return {
      getItem(key) {
        return values.has(key) ? values.get(key) : null
      },
      setItem(key, value) {
        events.push(['set', key])
        values.set(key, String(value))
      },
      removeItem(key) {
        events.push(['remove', key])
        values.delete(key)
      },
    }
  }
  const applyAuthDispatch = (state, events) => async (type, payload) => {
    events.push([type, payload])
    if (type === 'cart/markCheckoutAuthRedirect') {
      state.cart.clientOrderAuthRedirect = payload
    } else if (type === 'clearAuthentication') {
      await rootActions.clearAuthentication({
        dispatch(innerType, innerPayload) {
          events.push([innerType, innerPayload])
          if (innerType === 'set/authenticated') {
            state.authenticated = innerPayload
          }
        },
      })
    } else if (type === 'users/clearAuthenticatedUser') {
      await userActions.clearAuthenticatedUser({
        dispatch(innerType, innerPayload) {
          events.push([innerType, innerPayload])
          const field = innerType.replace('set/user.', '')
          state.users.user[field] = innerPayload
        },
      })
    }
  }
  const runAuthError = async ({ state, storage, events, dispatch }) => {
    let handler = null
    const savedLocalStorage = global.localStorage
    global.localStorage = storage
    try {
      loadAxiosPlugin()({
        $axios: {
          onError(callback) {
            handler = callback
          },
        },
        store: {
          state,
          dispatch,
          commit(type, payload) {
            events.push([type, payload])
            if (type === 'cart/MARK_CHECKOUT_AUTH_REDIRECT') {
              cartModule.mutations.MARK_CHECKOUT_AUTH_REDIRECT(
                state.cart,
                payload
              )
            } else if (type === 'CLEAR_AUTHENTICATION_STATE') {
              rootStoreModule.mutations.CLEAR_AUTHENTICATION_STATE(state)
            } else if (type === 'users/CLEAR_AUTHENTICATED_USER') {
              userStoreModule.mutations.CLEAR_AUTHENTICATED_USER(state.users)
            }
          },
        },
        redirect(pathValue) {
          events.push(['redirect', pathValue])
        },
        router: {},
      })
      await handler({
        response: { status: 401, data: { message: 'Session expired.' } },
        config: { skipGlobalErrorNotification: true },
      })
    } finally {
      global.localStorage = savedLocalStorage
    }
  }

  const secureAuthEvents = []
  const authState = createAuthState('secret-bearer-success')
  const authStorage = createLocalStorage(authState, secureAuthEvents)
  await runAuthError({
    state: authState,
    storage: authStorage,
    events: secureAuthEvents,
    dispatch: applyAuthDispatch(authState, secureAuthEvents),
  })
  const persistedAuthState = parsePersistedState(authStorage.getItem('vuex'))
  const authCleanupIndex = secureAuthEvents.findIndex(
    ([type]) => type === 'cart/markCheckoutAuthRedirect'
  )
  const loginRedirectIndex = secureAuthEvents.findIndex(
    ([type, payload]) => type === 'redirect' && payload === '/login'
  )
  assert.ok(authCleanupIndex >= 0)
  assert.ok(authCleanupIndex < loginRedirectIndex)
  assert.ok(
    secureAuthEvents.findIndex(
      ([type]) => type === 'users/clearAuthenticatedUser'
    ) <
      secureAuthEvents.findIndex(
        ([type, key]) => type === 'remove' && key === 'token'
      )
  )
  assert.ok(
    secureAuthEvents.findIndex(
      ([type, key]) => type === 'set' && key === 'vuex'
    ) < loginRedirectIndex
  )
  assert.strictEqual(authState.authenticated, false)
  assert.deepStrictEqual(authState.users.user, {
    id: null,
    access: null,
    token: null,
    shopid: null,
  })
  assert.strictEqual(persistedAuthState.authenticated, false)
  assert.deepStrictEqual(persistedAuthState.users.user, authState.users.user)
  for (const key of ['idUser', 'access', 'token', 'shopid']) {
    assert.strictEqual(authStorage.getItem(key), null)
  }
  assert.ok(!authStorage.getItem('vuex').includes('secret-bearer-success'))
  assert.deepStrictEqual(persistedAuthState.cart, authState.cart)
  assert.deepStrictEqual(
    Object.fromEntries(
      Object.keys(originalRecovery).map((key) => [key, authState.cart[key]])
    ),
    originalRecovery
  )

  const failedAuthEvents = []
  const failedAuthState = createAuthState('secret-bearer-fallback')
  const failedAuthStorage = createLocalStorage(
    failedAuthState,
    failedAuthEvents
  )
  await runAuthError({
    state: failedAuthState,
    storage: failedAuthStorage,
    events: failedAuthEvents,
    dispatch(type, payload) {
      failedAuthEvents.push([type, payload])
      return Promise.reject(new Error(`failed dispatch: ${type}`))
    },
  })
  const fallbackPersistedState = parsePersistedState(
    failedAuthStorage.getItem('vuex')
  )
  assert.strictEqual(failedAuthState.authenticated, false)
  assert.deepStrictEqual(failedAuthState.users.user, {
    id: null,
    access: null,
    token: null,
    shopid: null,
  })
  assert.strictEqual(failedAuthState.cart.clientOrderAuthRedirect, true)
  assert.deepStrictEqual(
    Object.fromEntries(
      Object.keys(originalRecovery).map((key) => [
        key,
        failedAuthState.cart[key],
      ])
    ),
    originalRecovery
  )
  assert.ok(
    !failedAuthStorage.getItem('vuex').includes('secret-bearer-fallback')
  )
  for (const key of ['idUser', 'access', 'token', 'shopid']) {
    assert.strictEqual(failedAuthStorage.getItem(key), null)
  }
  assert.strictEqual(fallbackPersistedState.authenticated, false)
  assert.strictEqual(fallbackPersistedState.users.user.token, null)
  assert.deepStrictEqual(fallbackPersistedState.cart, failedAuthState.cart)
  assert.ok(
    failedAuthEvents.some(
      ([type]) => type === 'users/CLEAR_AUTHENTICATED_USER'
    ),
    'a rejected auth action must use the explicit mutation fallback'
  )
  assert.deepStrictEqual(failedAuthEvents.at(-1), ['redirect', '/login'])

  const loginEvents = []
  const loginStorage = createLocalStorage(
    createAuthState('expired-bearer'),
    loginEvents
  )
  const savedLocalStorage = global.localStorage
  global.localStorage = loginStorage
  try {
    const loginResult = await userActions.postLogin.call(
      {
        $axios: {
          post: () =>
            Promise.resolve({
              data: {
                data: [{ id: 21, access: 2, token: 'fresh-bearer', shopid: 8 }],
                message: 'Connected',
              },
            }),
        },
      },
      {
        dispatch(type, payload, options) {
          loginEvents.push([type, payload, options])
        },
      },
      { email: 'alice@example.test', password: 'secret' }
    )
    assert.strictEqual(loginResult, true)
  } finally {
    global.localStorage = savedLocalStorage
  }
  assert.ok(
    loginEvents.some(
      ([type, payload, options]) =>
        type === 'setAuthentication' &&
        payload === true &&
        options &&
        options.root === true
    )
  )

  const authRedirectEvents = []
  let authErrorHandler = null
  const previousLocalStorage = global.localStorage
  global.localStorage = {
    getItem() {
      return null
    },
    setItem() {},
    removeItem(key) {
      authRedirectEvents.push(['remove', key])
    },
  }
  try {
    loadAxiosPlugin()({
      $axios: {
        onError(handler) {
          authErrorHandler = handler
        },
      },
      store: {
        state: {
          authenticated: true,
          users: { user: {} },
          cart: { clientOrderAuthRedirect: false },
        },
        dispatch(type, payload) {
          authRedirectEvents.push([type, payload])
        },
      },
      redirect(pathValue) {
        authRedirectEvents.push(['redirect', pathValue])
      },
      router: {},
    })
    await authErrorHandler({
      response: { status: 401, data: { message: 'Session expirée.' } },
      config: { skipGlobalErrorNotification: true },
    })
  } finally {
    global.localStorage = previousLocalStorage
  }
  const legacyAuthCleanupIndex = authRedirectEvents.findIndex(
    ([type]) => type === 'cart/markCheckoutAuthRedirect'
  )
  const legacyLoginRedirectIndex = authRedirectEvents.findIndex(
    ([type, payload]) => type === 'redirect' && payload === '/login'
  )
  assert.ok(
    legacyAuthCleanupIndex >= 0,
    '401 redirect must mark the in-memory attempt for auth navigation'
  )
  assert.ok(
    legacyAuthCleanupIndex < legacyLoginRedirectIndex,
    'the auth redirect marker must be set before login navigation starts'
  )
  assert.ok(
    !authRedirectEvents.some(
      ([type, payload]) => type === 'remove' && payload === 'vuex'
    ),
    '401 must preserve the persisted Vuex checkout recovery snapshot'
  )

  const authExitState = cartModule.state()
  authExitState.clientOrderToken = 'auth-token'
  authExitState.clientOrderSignature = 'auth-signature'
  authExitState.clientOrderPayload = { customer: 'Alice' }
  authExitState.clientOrderOrderId = 55
  authExitState.clientOrderStatus = 'stripe_prepared'
  const authExitContext = {
    state: authExitState,
    dispatch(type, payload) {
      applyCartStateDispatch(authExitState, type, payload)
    },
  }
  const authExitResult = cartModule.actions.markCheckoutAuthRedirect(
    authExitContext,
    true
  )
  assert.strictEqual(authExitResult.ok, true)
  assert.strictEqual(authExitState.clientOrderToken, 'auth-token')
  assert.strictEqual(authExitState.clientOrderSignature, 'auth-signature')
  assert.deepStrictEqual(authExitState.clientOrderPayload, {
    customer: 'Alice',
  })
  assert.strictEqual(authExitState.clientOrderOrderId, 55)
  assert.strictEqual(authExitState.clientOrderStatus, 'stripe_prepared')
  assert.strictEqual(authExitState.clientOrderAuthRedirect, true)
  cartModule.actions.markCheckoutAuthRedirect(authExitContext, false)
  assert.strictEqual(authExitState.clientOrderAuthRedirect, false)
  assert.strictEqual(authExitState.clientOrderToken, 'auth-token')
  assert.strictEqual(authExitState.clientOrderOrderId, 55)
  assert.strictEqual(authExitState.clientOrderStatus, 'stripe_prepared')

  let authRouteDecision = 'not-called'
  let authLocalResetCount = 0
  await cartOptions.beforeRouteLeave.call(
    {
      checkoutFinalized: false,
      allowRouteLeave: false,
      $store: {
        get(pathValue) {
          return pathValue === 'cart/clientOrderAuthRedirect'
        },
      },
      resetStripePaymentElement() {
        authLocalResetCount += 1
      },
      resetCheckoutAttempt() {
        throw new Error('auth redirect must not retry cancellation')
      },
    },
    {},
    {},
    (decision) => {
      authRouteDecision = decision
    }
  )
  assert.strictEqual(authLocalResetCount, 1)
  assert.strictEqual(authRouteDecision, undefined)

  assert.strictEqual(
    cartOptions.computed.checkoutPayloadMatchesBoundAttempt.call({
      currentStripeCheckoutSignature: 'displayed-signature',
      $store: { get: () => null },
    }),
    false,
    'confirmation requires a present bound signature'
  )
  assert.strictEqual(
    cartOptions.computed.checkoutPayloadCanStart.call({
      checkoutPayloadMatchesBoundAttempt: false,
      $store: { get: () => null },
    }),
    true,
    'a first checkout may start before a signature is bound'
  )

  const stripeState = cartModule.state()
  const stripeCalls = []
  const stripeContext = {
    state: stripeState,
    dispatch(type, payload) {
      applyCartStateDispatch(stripeState, type, payload)
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
  assert.strictEqual(stripeState.clientOrderStatus, 'stripe_prepared')
  assert.strictEqual(
    stripeState.clientOrderOrderId,
    55,
    'the prepared order id must survive a page refresh in Vuex'
  )
  assert.deepStrictEqual(
    stripeState.clientOrderPayload.dataCart,
    checkoutInput.dataCart,
    'the bound attempt must retain an immutable cart snapshot for recovery'
  )
  const preparedStripePayload = stripeState.clientOrderPayload
  const preparedStripeToken = stripeState.clientOrderToken
  await cartModule.actions.checkoutOrder.call(
    {
      $axios: {
        post() {
          return Promise.resolve({
            data: {
              data: {
                orderId: 55,
                clientSecret: 'replayed-secret',
                publishableKey: 'key',
              },
            },
          })
        },
      },
    },
    stripeContext,
    { ...checkoutInput, stripe: true, payment: 'Stripe' }
  )
  assert.strictEqual(
    stripeState.clientOrderToken,
    preparedStripeToken,
    'refresh recreation with an unchanged Stripe payload must reuse the token'
  )

  const replayPreconditionState = {
    ...stripeState,
    clientOrderPayload: JSON.parse(
      JSON.stringify(stripeState.clientOrderPayload)
    ),
  }
  const replayPreconditionContext = {
    state: replayPreconditionState,
    dispatch(type, payload) {
      applyCartStateDispatch(replayPreconditionState, type, payload)
    },
    commit() {},
  }
  const replayPreconditionError = new Error('Boutique introuvable.')
  replayPreconditionError.response = {
    status: 404,
    data: {
      message: 'Boutique introuvable.',
      data: { code: 'SHOP_NOT_FOUND' },
    },
  }
  await cartModule.actions.checkoutOrder.call(
    {
      $axios: {
        post: () => Promise.reject(replayPreconditionError),
      },
    },
    replayPreconditionContext,
    { ...checkoutInput, stripe: true, payment: 'Stripe' }
  )
  assert.strictEqual(
    replayPreconditionState.clientOrderStatus,
    'stripe_prepared',
    'a persisted prepared order must remain unsafe even if replay hits a safe precondition'
  )
  assert.strictEqual(
    cartModule.actions.abandonCheckout(replayPreconditionContext).ok,
    false
  )

  const preparedAbandon = cartModule.actions.abandonCheckout(stripeContext)
  assert.strictEqual(preparedAbandon.ok, false)
  assert.ok(stripeState.clientOrderToken)
  assert.strictEqual(preparedAbandon.error.attempt_order_id, 55)

  const restoredCartDispatches = []
  const restoredCartVm = {
    formuser: { customer: '', phone: '', payment: '', notes: '' },
    selectedTable: null,
    total: 0,
    stripeOrderId: null,
    stripeCheckoutSignature: null,
    restoringCheckoutPayload: false,
    roundPrice: (value) => Math.round(Number(value) * 100) / 100,
    $store: {
      get(pathValue) {
        const values = {
          'cart/clientOrderToken': stripeState.clientOrderToken,
          'cart/clientOrderPayload': stripeState.clientOrderPayload,
          'cart/clientOrderOrderId': stripeState.clientOrderOrderId,
          'cart/clientOrderSignature': stripeState.clientOrderSignature,
        }
        return values[pathValue]
      },
      dispatch(type, payload) {
        restoredCartDispatches.push([type, payload])
      },
    },
    $nextTick(callback) {
      if (callback) callback()
      return Promise.resolve()
    },
    restoreCheckoutAttemptPayload(payload) {
      return cartOptions.methods.restoreCheckoutAttemptPayload.call(
        this,
        payload
      )
    },
  }
  const restored = await cartOptions.methods.restoreCheckoutFromStore.call(
    restoredCartVm
  )
  assert.strictEqual(restored, true)
  assert.strictEqual(restoredCartVm.formuser.customer, 'Alice')
  assert.strictEqual(restoredCartVm.formuser.notes, 'Sans couverts')
  assert.strictEqual(restoredCartVm.selectedTable, 12)
  assert.strictEqual(restoredCartVm.stripeOrderId, 55)
  assert.strictEqual(
    restoredCartVm.stripeCheckoutSignature,
    stripeState.clientOrderSignature
  )
  assert.ok(
    restoredCartDispatches.some(
      ([type, payload]) =>
        type === 'cart/setTocart' && payload[0].selectedChoiceIds[0] === 30
    ),
    'refresh recovery must restore the configured display cart, not only public item ids'
  )
  assert.ok(
    restoredCartDispatches.some(
      ([type, payload]) =>
        type === 'cart/markCheckoutAuthRedirect' && payload === false
    ),
    'successful cart remount must clear only the auth redirect marker'
  )

  const persistedCancellationOrderIds = []
  const persistedCancellationVm = {
    stripeOrderId: null,
    stripePreparationPromise: null,
    stripeReplacementPending: false,
    clearStripeAutoPrepareTimeout() {},
    cancelPreparedStripeAttempt(orderId) {
      persistedCancellationOrderIds.push(orderId)
      return Promise.resolve({ ok: true, data: null, error: null })
    },
    restoreCheckoutAttemptPayload() {},
    $store: {
      get(pathValue) {
        return pathValue === 'cart/clientOrderOrderId' ? 55 : null
      },
      dispatch() {
        throw new Error('persisted prepared orders must cancel by order id')
      },
    },
  }
  const persistedReset = await cartOptions.methods.resetCheckoutAttempt.call(
    persistedCancellationVm
  )
  assert.strictEqual(persistedReset, true)
  assert.deepStrictEqual(persistedCancellationOrderIds, [55])
  assert.strictEqual(
    menusOptions.computed.hasUnsafeCheckoutAttempt.call({
      clientOrderStatus: 'prewrite_rejected',
      clientOrderOrderId: 55,
    }),
    true,
    'menus must treat any persisted prepared order id as unsafe'
  )

  const unsafeMenuDispatches = []
  const unsafeMenuRoutes = []
  const unsafeMenuVm = {
    loadPage: false,
    cartItem: [],
    total: 0,
    idxCart: 0,
    clientOrderStatus: 'uncertain',
    hasUnsafeCheckoutAttempt: true,
    $store: {
      get(pathValue) {
        const values = {
          'cart/clientOrderPayload': stripeState.clientOrderPayload,
          'cart/dataCart': checkoutInput.dataCart,
          'cart/totalCart': 18,
          'cart/indexCart': 2,
          'products/dataProduct': [],
        }
        return values[pathValue]
      },
      dispatch(type, payload) {
        unsafeMenuDispatches.push([type, payload])
        return Promise.resolve()
      },
    },
    $router: {
      replace(pathValue) {
        unsafeMenuRoutes.push(pathValue)
      },
    },
    restorePersistedCheckoutCart() {
      return menusOptions.methods.restorePersistedCheckoutCart.call(this)
    },
  }
  await menusOptions.mounted.call(unsafeMenuVm)
  assert.deepStrictEqual(unsafeMenuRoutes, ['/cart'])
  assert.strictEqual(unsafeMenuVm.cartItem[0].id, 5)
  assert.ok(
    !unsafeMenuDispatches.some(
      ([type, payload]) =>
        (type === 'cart/setTotal' || type === 'cart/setIndex') && payload === 0
    ),
    'direct menus navigation must not zero an unresolved persisted checkout'
  )

  unsafeMenuVm.cartItem = [{ id: 9, qty: 1 }]
  unsafeMenuVm.embeddedOrderEdit = false
  unsafeMenuVm.isOrderEditActive = false
  unsafeMenuVm.isKitchenClosed = false
  unsafeMenuVm.showKitchenClosedSnackbar = () => {}
  unsafeMenuVm.$router.push = (pathValue) => unsafeMenuRoutes.push(pathValue)
  unsafeMenuVm.openCart = function () {
    return menusOptions.methods.openCart.call(this)
  }
  await menusOptions.methods.btnOrder.call(unsafeMenuVm)
  assert.strictEqual(unsafeMenuVm.cartItem[0].id, 5)
  assert.strictEqual(unsafeMenuRoutes[unsafeMenuRoutes.length - 1], '/cart')

  const safeMountedEvents = []
  await menusOptions.mounted.call({
    loadPage: false,
    cartItem: [{ id: 5 }],
    clientOrderStatus: 'prewrite_rejected',
    hasUnsafeCheckoutAttempt: false,
    $store: {
      get(pathValue) {
        return pathValue === 'products/dataProduct' ? [] : null
      },
      dispatch(type, payload) {
        safeMountedEvents.push([type, payload])
        return Promise.resolve()
      },
    },
  })
  assert.ok(
    safeMountedEvents.some(
      ([type, payload]) => type === 'cart/setTocart' && payload === null
    ),
    'a safe rejected attempt must clear its stale persisted cart before a new menu cart'
  )
  assert.ok(
    safeMountedEvents.findIndex(([type]) => type === 'cart/abandonCheckout') <
      safeMountedEvents.findIndex(([type]) => type === 'cart/setTocart'),
    'the safe attempt must clear before the persisted cart is reset'
  )

  const safeMenuEvents = []
  const safeMenuVm = {
    embeddedOrderEdit: false,
    isOrderEditActive: false,
    isKitchenClosed: false,
    clientOrderStatus: 'prewrite_rejected',
    hasUnsafeCheckoutAttempt: false,
    cartItem: [{ id: 9, qty: 1 }],
    showKitchenClosedSnackbar() {},
    restorePersistedCheckoutCart() {},
    openCart() {
      return menusOptions.methods.openCart.call(this)
    },
    $store: {
      dispatch(type, payload) {
        safeMenuEvents.push([type, payload])
        return Promise.resolve({ ok: true })
      },
    },
    $router: {
      push(pathValue) {
        safeMenuEvents.push(['route', pathValue])
      },
    },
  }
  await menusOptions.methods.btnOrder.call(safeMenuVm)
  assert.deepStrictEqual(safeMenuEvents.slice(0, 2), [
    ['cart/abandonCheckout', { safe: true }],
    ['cart/setTocart', safeMenuVm.cartItem],
  ])

  const cancellationCalls = []
  const cancellationResult = await cartModule.actions.cancelStripeCheckout.call(
    {
      $axios: {
        post(url, payload) {
          cancellationCalls.push([url, payload])
          return Promise.resolve({
            data: { data: { orderId: 55, canceled: true } },
          })
        },
      },
    },
    stripeContext,
    55
  )
  assert.deepStrictEqual(cancellationCalls, [
    ['/baseurl/api/v1/stripe/payment-intents/qr-table/55/cancel', {}],
  ])
  assert.deepStrictEqual(cancellationResult, {
    ok: true,
    data: { orderId: 55, canceled: true },
    error: null,
  })
  assert.ok(
    stripeState.clientOrderToken,
    'the cancellation request alone must not rotate the token before the page observes success'
  )
  const safeAbandon = cartModule.actions.abandonCheckout(stripeContext, {
    safe: true,
  })
  assert.strictEqual(safeAbandon.ok, true)
  assert.strictEqual(stripeState.clientOrderToken, null)
  assert.strictEqual(stripeState.clientOrderOrderId, null)

  stripeState.clientOrderToken = 'terminal-token'
  stripeState.clientOrderSignature = 'terminal-signature'
  stripeState.clientOrderStatus = 'stripe_prepared'
  const terminalError = new Error('Paiement déjà confirmé.')
  terminalError.response = {
    status: 409,
    data: {
      message: 'Paiement déjà confirmé.',
      data: { code: 'STRIPE_PAYMENT_ALREADY_SUCCEEDED' },
    },
  }
  const terminalCancellation =
    await cartModule.actions.cancelStripeCheckout.call(
      { $axios: { post: () => Promise.reject(terminalError) } },
      stripeContext,
      55
    )
  assert.strictEqual(terminalCancellation.ok, false)
  assert.strictEqual(
    terminalCancellation.error.code,
    'STRIPE_PAYMENT_ALREADY_SUCCEEDED'
  )
  assert.strictEqual(
    stripeState.clientOrderToken,
    'terminal-token',
    'a terminal cancellation conflict must retain the bound attempt'
  )

  const safeCancellationEvents = []
  const safeCancellationVm = {
    stripeOrderId: 55,
    stripeCancellationPromise: null,
    stripeCancellationOrderId: null,
    checkoutErrorMessage: '',
    resetStripePaymentElement() {
      safeCancellationEvents.push('reset-local')
      this.stripeOrderId = null
    },
    $store: {
      dispatch(type, payload) {
        safeCancellationEvents.push([type, payload])
        if (type === 'cart/cancelStripeCheckout') {
          return Promise.resolve({
            ok: true,
            data: { orderId: 55 },
            error: null,
          })
        }
        return Promise.resolve({ ok: true, data: null, error: null })
      },
    },
  }
  const safePageCancellation =
    await cartOptions.methods.cancelPreparedStripeAttempt.call(
      safeCancellationVm,
      55
    )
  assert.strictEqual(safePageCancellation.ok, true)
  assert.deepStrictEqual(safeCancellationEvents, [
    ['cart/cancelStripeCheckout', 55],
    ['cart/abandonCheckout', { safe: true }],
    'reset-local',
  ])

  const failedCancellationEvents = []
  const failedCancellationVm = {
    stripeOrderId: 55,
    stripeCancellationPromise: null,
    stripeCancellationOrderId: null,
    checkoutErrorMessage: '',
    resetStripePaymentElement() {
      failedCancellationEvents.push('reset-local')
    },
    restoreCheckoutAttemptPayload(payload) {
      failedCancellationEvents.push(['restore', payload.customer])
    },
    $store: {
      get(pathValue) {
        return pathValue === 'cart/clientOrderPayload'
          ? preparedStripePayload
          : null
      },
      dispatch(type, payload) {
        failedCancellationEvents.push([type, payload])
        return Promise.resolve({
          ok: false,
          data: null,
          error: {
            code: 'STRIPE_PAYMENT_ALREADY_SUCCEEDED',
            message: 'Paiement déjà confirmé.',
          },
        })
      },
    },
  }
  const failedPageCancellation =
    await cartOptions.methods.cancelPreparedStripeAttempt.call(
      failedCancellationVm,
      55
    )
  assert.strictEqual(failedPageCancellation.ok, false)
  assert.strictEqual(failedCancellationVm.stripeOrderId, 55)
  assert.deepStrictEqual(failedCancellationEvents, [
    ['cart/cancelStripeCheckout', 55],
    ['restore', 'Alice'],
  ])

  const boundStripePayload = {
    ...preparedStripePayload,
    client_order_token: 'bound-token',
  }
  const boundStripeSignature = buildCheckoutPayloadSignature({
    customer: boundStripePayload.customer,
    customerID: boundStripePayload.customerID,
    phone: boundStripePayload.phone,
    remark: boundStripePayload.remark,
    payment: boundStripePayload.payment,
    total: boundStripePayload.expected_total,
    dataCart: boundStripePayload.dataCart,
    stripe: true,
  })
  for (const mutation of [
    { label: 'customer', apply: (vm) => (vm.formuser.customer = 'Bob') },
    { label: 'table', apply: (vm) => (vm.selectedTable = 13) },
    { label: 'phone', apply: (vm) => (vm.formuser.phone = '0700000000') },
    { label: 'remark', apply: (vm) => (vm.formuser.notes = 'Avec couverts') },
    { label: 'payment', apply: (vm) => (vm.formuser.payment = 'Carte') },
  ]) {
    const vm = {
      formuser: {
        customer: boundStripePayload.customer,
        phone: boundStripePayload.phone,
        payment: boundStripePayload.payment,
        notes: boundStripePayload.remark,
        isTakeaway: false,
      },
      selectedTable: boundStripePayload.customerID,
      total: boundStripePayload.expected_total,
      dataCart: boundStripePayload.dataCart,
      isQrClient: true,
      restoringCheckoutPayload: false,
      checkoutFinalized: false,
      repriceDialog: false,
      stripePreparing: false,
      stripePreparationPromise: null,
      stripeCancellationPromise: null,
      stripeCancellationOrderId: null,
      stripeReplacementPending: false,
      stripePaymentReady: true,
      stripeOrderId: 55,
      stripeCheckoutSignature: boundStripeSignature,
      checkoutErrorMessage: '',
      roundPrice: (value) => Math.round(Number(value) * 100) / 100,
      get currentStripeCheckoutSignature() {
        return buildCheckoutPayloadSignature({
          customer: this.formuser.customer,
          customerID: this.selectedTable,
          phone: this.formuser.phone,
          remark: this.formuser.notes,
          payment: this.formuser.payment,
          total: this.total,
          dataCart: this.dataCart,
          stripe: true,
        })
      },
      clearStripeAutoPrepareTimeout() {},
      scheduleStripeAutoPrepare() {},
      resetStripePaymentElement() {
        throw new Error('failed cancellation must retain the Stripe element')
      },
      restoreCheckoutAttemptPayload(payload) {
        return cartOptions.methods.restoreCheckoutAttemptPayload.call(
          this,
          payload
        )
      },
      cancelPreparedStripeAttempt(orderId) {
        return cartOptions.methods.cancelPreparedStripeAttempt.call(
          this,
          orderId
        )
      },
      resetCheckoutAttempt() {
        return cartOptions.methods.resetCheckoutAttempt.call(this)
      },
      $nextTick(callback) {
        if (callback) callback()
        return Promise.resolve()
      },
      $store: {
        get(pathValue) {
          const values = {
            'cart/clientOrderPayload': boundStripePayload,
            'cart/clientOrderSignature': boundStripeSignature,
            'cart/clientOrderOrderId': 55,
          }
          return values[pathValue]
        },
        dispatch(type) {
          if (type === 'cart/cancelStripeCheckout') {
            return Promise.resolve({
              ok: false,
              data: null,
              error: { message: 'Annulation indisponible.' },
            })
          }
          return Promise.resolve({ ok: true, data: null, error: null })
        },
      },
    }
    mutation.apply(vm)
    await cartOptions.methods.handleStripeCheckoutChange.call(vm)
    assert.deepStrictEqual(
      vm.formuser,
      {
        customer: boundStripePayload.customer,
        phone: boundStripePayload.phone,
        payment: boundStripePayload.payment,
        notes: boundStripePayload.remark,
        isTakeaway: false,
      },
      `${mutation.label} must roll back after cancellation failure`
    )
    assert.strictEqual(vm.selectedTable, boundStripePayload.customerID)
    assert.strictEqual(vm.stripeOrderId, 55)
    assert.strictEqual(vm.stripePaymentReady, true)
  }

  let stripeConfirmationCalls = 0
  let confirmationRestoreCalls = 0
  await cartOptions.methods.confirmStripePayment.call({
    checkoutPayloadMatchesBoundAttempt: false,
    checkoutErrorMessage: '',
    loadingBtn: false,
    stripe: {
      confirmPayment() {
        stripeConfirmationCalls += 1
        return Promise.resolve({})
      },
    },
    stripeElements: {},
    restoreBoundCheckoutPayload() {
      confirmationRestoreCalls += 1
    },
    guardCheckoutConfirmation() {
      return cartOptions.methods.guardCheckoutConfirmation.call(this)
    },
    $store: { dispatch() {}, set() {} },
    $router: { push() {} },
  })
  assert.strictEqual(stripeConfirmationCalls, 0)
  assert.strictEqual(confirmationRestoreCalls, 1)

  let counterConfirmationCalls = 0
  await cartOptions.methods.orderWithoutPayment.call({
    checkoutPayloadMatchesBoundAttempt: false,
    stripeOrderId: 55,
    selectedCheckoutFlow: 'stripe',
    loadingBtn: false,
    restoreBoundCheckoutPayload() {},
    guardCheckoutConfirmation() {
      return cartOptions.methods.guardCheckoutConfirmation.call(this)
    },
    $store: {
      dispatch(type) {
        if (type === 'cart/markStripeOrderPayAtCounter') {
          counterConfirmationCalls += 1
        }
        return Promise.resolve(true)
      },
      set() {},
    },
    $router: { push() {} },
  })
  assert.strictEqual(counterConfirmationCalls, 0)

  const guardedCartVm = {
    ...cartEditVm,
    dataCart: cartEditVm.dataCart.map((line) => ({ ...line })),
    resetCheckoutAttempt() {
      return Promise.resolve(false)
    },
    syncCartState() {
      throw new Error('a blocked mutation must not alter the cart')
    },
  }
  await cartOptions.methods.changeQuantity.call(guardedCartVm, 0, 1)
  assert.strictEqual(guardedCartVm.dataCart[0].qty, 1)

  const editableCartVm = {
    ...cartEditVm,
    dataCart: cartEditVm.dataCart.map((line) => ({ ...line })),
    resetCheckoutAttempt() {
      return Promise.resolve(true)
    },
  }
  await cartOptions.methods.confirmCartCustomization.call(editableCartVm, {
    selectedChoiceIds: [10],
    unitPrice: 9,
    selections: [{ product_step_choice_id: 10, product_step_id: 100 }],
  })
  assert.deepStrictEqual(
    editableCartVm.savedCart.map(
      ({ qty, subtotal, configurationSignature }) => ({
        qty,
        subtotal,
        configurationSignature,
      })
    ),
    [{ qty: 3, subtotal: 27, configurationSignature: '5:10' }],
    'the cart must only apply its edit after the previous checkout is safely resolved'
  )

  const staleOrderIds = []
  const stalePreparationVm = {
    stripePreparationPromise: null,
    stripeReplacementPending: false,
    stripePreparing: false,
    stripePaymentReady: false,
    stripeCheckoutSignature: null,
    checkoutErrorMessage: '',
    signature: 'old-signature',
    returnedOrderId: 77,
    cancellationSucceeds: true,
    get currentStripeCheckoutSignature() {
      return this.signature
    },
    shouldPrepareStripeCheckout: () => true,
    clearStripeAutoPrepareTimeout() {},
    buildOrderPayload: () => ({ stripe: true }),
    handleCheckoutError() {},
    cancelPreparedStripeAttempt: (orderId) => {
      staleOrderIds.push(orderId)
      return Promise.resolve({
        ok: stalePreparationVm.cancellationSucceeds,
        data: null,
        error: null,
      })
    },
    scheduleStripeAutoPrepare() {},
    $nextTick: () => Promise.resolve(),
    $store: {
      dispatch(type) {
        if (type !== 'cart/checkoutOrder') return Promise.resolve(null)
        stalePreparationVm.signature = 'changed-signature'
        return Promise.resolve({
          ok: true,
          data: {
            orderId: stalePreparationVm.returnedOrderId,
            clientSecret: 'secret',
            publishableKey: 'key',
          },
          error: null,
        })
      },
    },
  }
  await cartOptions.methods.prepareStripePaymentElement.call(
    stalePreparationVm,
    true
  )
  assert.deepStrictEqual(
    staleOrderIds,
    [77],
    'a stale in-flight Stripe success must be canceled before replacement'
  )

  stalePreparationVm.signature = 'second-old-signature'
  stalePreparationVm.returnedOrderId = 78
  stalePreparationVm.cancellationSucceeds = false
  await cartOptions.methods.prepareStripePaymentElement.call(
    stalePreparationVm,
    true
  )
  assert.strictEqual(
    stalePreparationVm.stripeOrderId,
    78,
    'a failed stale cancellation must retain the order id so cancellation can be retried'
  )

  let routeDecision = null
  await cartOptions.beforeRouteLeave.call(
    {
      checkoutFinalized: false,
      allowRouteLeave: false,
      $store: { get: () => false },
      resetCheckoutAttempt() {
        return Promise.resolve(false)
      },
    },
    {},
    {},
    (decision) => {
      routeDecision = decision
    }
  )
  assert.strictEqual(
    routeDecision,
    false,
    'route navigation must be blocked when checkout cancellation is unresolved'
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
