const assert = require('assert')
const {
  validateStep,
  calculatePreviewUnitPrice,
  buildConfigurationSignature,
  mergeConfiguredCartLine,
  buildCheckoutItems,
  createComponentInputId,
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

// eslint-disable-next-line no-console
console.log('customization frontend tests passed')
