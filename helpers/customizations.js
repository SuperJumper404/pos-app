const { parsePrice, roundPrice } = require('./price-functions')

const normalizeNumericIds = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter(
          (value) =>
            Number.isInteger(value) && Number.isFinite(value) && value > 0
        )
    )
  ).sort((left, right) => left - right)

const getSelectedChoiceIds = (line) =>
  normalizeNumericIds(
    line.selectedChoiceIds || line.selected_product_step_choice_ids
  )

const getProductId = (line) => Number(line.id || line.product_id)

const validateStep = (step, selectedIds) => {
  const selectedCount = normalizeNumericIds(selectedIds).length
  const minimumChoices = Number(step.minimum_choices) || 0
  const maximumChoices = Number(step.maximum_choices)

  if (selectedCount < minimumChoices) {
    return { valid: false, reason: 'minimum' }
  }

  if (Number.isFinite(maximumChoices) && selectedCount > maximumChoices) {
    return { valid: false, reason: 'maximum' }
  }

  return { valid: true, reason: null }
}

const calculatePreviewUnitPrice = (product, selectedIds) => {
  const selectedChoiceIds = new Set(normalizeNumericIds(selectedIds))
  const contextualChoices = new Map()

  for (const step of product.customization_steps || []) {
    for (const choice of step.choices || []) {
      const choiceId = Number(choice.product_step_choice_id)
      if (selectedChoiceIds.has(choiceId)) {
        contextualChoices.set(choiceId, choice)
      }
    }
  }

  const supplementTotal = Array.from(contextualChoices.values()).reduce(
    (total, choice) => total + parsePrice(choice.extra_price),
    0
  )

  return roundPrice(parsePrice(product.price) + supplementTotal)
}

const buildConfigurationSignature = (productId, selectedIds) =>
  `${Number(productId)}:${normalizeNumericIds(selectedIds).join(',')}`

const mergeConfiguredCartLine = (cart, line) => {
  const selectedChoiceIds = getSelectedChoiceIds(line)
  const configurationSignature = buildConfigurationSignature(
    getProductId(line),
    selectedChoiceIds
  )
  let merged = false

  const nextCart = (Array.isArray(cart) ? cart : []).map((cartLine) => {
    const cartLineSelectedChoiceIds = getSelectedChoiceIds(cartLine)
    const cartLineSignature = buildConfigurationSignature(
      getProductId(cartLine),
      cartLineSelectedChoiceIds
    )

    if (cartLineSignature !== configurationSignature) {
      return { ...cartLine }
    }

    merged = true
    return {
      ...cartLine,
      configurationSignature: cartLineSignature,
      selectedChoiceIds: cartLineSelectedChoiceIds,
      qty: Number(cartLine.qty || 0) + Number(line.qty || 0),
      subtotal: roundPrice(
        parsePrice(cartLine.subtotal) + parsePrice(line.subtotal)
      ),
    }
  })

  if (merged) return nextCart

  return [
    ...nextCart,
    {
      ...line,
      configurationSignature,
      selectedChoiceIds,
    },
  ]
}

const buildCheckoutItems = (cart) =>
  (Array.isArray(cart) ? cart : []).map((line) => ({
    product_id: getProductId(line),
    quantity: Number(line.qty || line.quantity),
    selected_product_step_choice_ids: getSelectedChoiceIds(line),
  }))

module.exports = {
  validateStep,
  calculatePreviewUnitPrice,
  buildConfigurationSignature,
  mergeConfiguredCartLine,
  buildCheckoutItems,
}
