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

const createComponentInputId = (prefix, vueUid) => `${prefix}-${vueUid}`

const normalizeActive = (value) => ![false, 0, '0', 'false'].includes(value)

const positiveInteger = (value, label) => {
  const normalized = Number(value)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${label} invalide.`)
  }
  return normalized
}

const nonNegativeInteger = (value, label) => {
  const normalized = Number(value)
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new TypeError(`${label} invalide.`)
  }
  return normalized
}

const serializeProductCustomizationConfig = (config) => {
  if (!Array.isArray(config)) {
    throw new TypeError('La configuration doit être un tableau.')
  }

  const stepIds = new Set()
  const choiceIds = new Set()

  return config.map((step, stepIndex) => {
    const stepId = positiveInteger(step && step.step_id, "L'étape")
    if (stepIds.has(stepId)) {
      throw new TypeError(`L'étape ${stepId} est dupliquée.`)
    }
    stepIds.add(stepId)

    const minimumChoices = nonNegativeInteger(
      step.minimum_choices,
      'Le minimum'
    )
    const maximumChoices = positiveInteger(step.maximum_choices, 'Le maximum')
    if (minimumChoices > maximumChoices) {
      throw new TypeError('Le minimum ne peut pas dépasser le maximum.')
    }
    if (!Array.isArray(step.choices)) {
      throw new TypeError(`Les choix de l'étape ${stepId} sont invalides.`)
    }

    return {
      step_id: stepId,
      position: stepIndex,
      minimum_choices: minimumChoices,
      maximum_choices: maximumChoices,
      active: normalizeActive(step.active),
      choices: step.choices.map((choice, choiceIndex) => {
        const choiceId = positiveInteger(
          choice && choice.step_choice_id,
          'Le choix'
        )
        if (choiceIds.has(choiceId)) {
          throw new TypeError(`Le choix ${choiceId} est dupliqué.`)
        }
        choiceIds.add(choiceId)
        return {
          step_choice_id: choiceId,
          position: choiceIndex,
          extra_price: roundPrice(choice.extra_price).toFixed(2),
          active: normalizeActive(choice.active),
        }
      }),
    }
  })
}

module.exports = {
  validateStep,
  calculatePreviewUnitPrice,
  buildConfigurationSignature,
  mergeConfiguredCartLine,
  buildCheckoutItems,
  createComponentInputId,
  serializeProductCustomizationConfig,
}
