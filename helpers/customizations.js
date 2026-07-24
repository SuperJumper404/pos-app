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

const isEnabled = (value) => ![false, 0, '0', 'false'].includes(value)

const hasAvailableChoice = (step) =>
  (step && Array.isArray(step.choices) ? step.choices : []).some(
    (choice) =>
      isEnabled(choice.active) &&
      (choice.choice_type !== 'linked_product' || choice.available !== false)
  )

const isVisibleWizardStep = (step) => {
  if (!step || !isEnabled(step.active)) return false
  return Number(step.minimum_choices) > 0 || hasAvailableChoice(step)
}

const nextVisibleStepIndex = (steps, currentIndex) => {
  const normalizedSteps = Array.isArray(steps) ? steps : []
  for (
    let index = Number(currentIndex) + 1;
    index < normalizedSteps.length;
    index += 1
  ) {
    if (isVisibleWizardStep(normalizedSteps[index])) return index
  }
  return normalizedSteps.length
}

const findStepIndexById = (steps, productStepId) =>
  (Array.isArray(steps) ? steps : []).findIndex(
    (step) => step && String(step.product_step_id) === String(productStepId)
  )

const numericPosition = (value) => {
  if (value === undefined || value === null || value === '') {
    return Number.MAX_SAFE_INTEGER
  }
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : Number.MAX_SAFE_INTEGER
}

const selectionText = (value) =>
  value === undefined || value === null ? '' : String(value).trim()

const isSnapshotSelection = (selection) =>
  selection &&
  typeof selection === 'object' &&
  (selectionText(selection.step_name) ||
    selectionText(selection.stepName) ||
    selection.choice_name !== undefined ||
    selection.choiceName !== undefined)

const groupCustomizationSelections = (selections) => {
  const normalizedSelections = (Array.isArray(selections) ? selections : [])
    .map((selection, index) => ({ selection, index }))
    .filter(({ selection }) => selection && typeof selection === 'object')
  const snapshots = normalizedSelections.filter(({ selection }) =>
    isSnapshotSelection(selection)
  )
  const source = snapshots.length
    ? snapshots
    : normalizedSelections.filter(({ selection }) =>
        selectionText(selection.name)
      )

  if (!source.length) return []

  const orderedSelections = source.slice().sort((left, right) => {
    if (!snapshots.length) return left.index - right.index
    const leftSelection = left.selection
    const rightSelection = right.selection
    return (
      numericPosition(
        leftSelection.step_position === undefined
          ? leftSelection.stepPosition
          : leftSelection.step_position
      ) -
        numericPosition(
          rightSelection.step_position === undefined
            ? rightSelection.stepPosition
            : rightSelection.step_position
        ) ||
      numericPosition(
        leftSelection.choice_position === undefined
          ? leftSelection.choicePosition
          : leftSelection.choice_position
      ) -
        numericPosition(
          rightSelection.choice_position === undefined
            ? rightSelection.choicePosition
            : rightSelection.choice_position
        ) ||
      left.index - right.index
    )
  })
  const groups = []
  const groupsByKey = new Map()

  for (const { selection } of orderedSelections) {
    const stepName = snapshots.length
      ? selectionText(selection.step_name || selection.stepName) ||
        'Personnalisation'
      : 'Personnalisation'
    const stepId =
      selection.product_customization_step_id ||
      selection.product_step_id ||
      selection.step_id ||
      selection.productStepId
    const groupKey = snapshots.length
      ? `${stepId == null ? 'name' : `id:${stepId}`}:${stepName}`
      : 'legacy'
    let group = groupsByKey.get(groupKey)
    if (!group) {
      group = { stepName, choices: [] }
      groupsByKey.set(groupKey, group)
      groups.push(group)
    }

    const name = snapshots.length
      ? selectionText(
          selection.choice_name === undefined
            ? selection.choiceName === undefined
              ? selection.name
              : selection.choiceName
            : selection.choice_name
        )
      : selectionText(selection.name)
    if (!name) continue
    const rawPrice = snapshots.length
      ? selection.unit_extra_price === undefined
        ? selection.extra_price === undefined
          ? selection.price
          : selection.extra_price
        : selection.unit_extra_price
      : selection.price
    group.choices.push({ name, price: roundPrice(rawPrice) })
  }

  return groups.filter((group) => group.choices.length)
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
      return {
        ...cartLine,
        configurationSignature: cartLineSignature,
        selectedChoiceIds: cartLineSelectedChoiceIds,
      }
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

const replaceConfiguredCartLine = (cart, lineIndex, line) => {
  const normalizedCart = Array.isArray(cart) ? cart : []
  const normalizedIndex = Number(lineIndex)
  if (
    !Number.isInteger(normalizedIndex) ||
    normalizedIndex < 0 ||
    normalizedIndex >= normalizedCart.length
  ) {
    return normalizedCart.map((cartLine) => ({ ...cartLine }))
  }

  return mergeConfiguredCartLine(
    normalizedCart.filter((_, index) => index !== normalizedIndex),
    line
  )
}

const buildCheckoutItems = (cart) =>
  (Array.isArray(cart) ? cart : []).map((line) => ({
    product_id: getProductId(line),
    quantity: Number(line.qty || line.quantity),
    selected_product_step_choice_ids: getSelectedChoiceIds(line),
  }))

const normalizedText = (value) => (value == null ? '' : String(value).trim())

const buildCheckoutPayloadSignature = (input = {}) => {
  const items = buildCheckoutItems(input.dataCart)
    .map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      selected_product_step_choice_ids: normalizeNumericIds(
        item.selected_product_step_choice_ids
      ),
    }))
    .sort((left, right) => {
      if (left.product_id !== right.product_id) {
        return left.product_id - right.product_id
      }
      const leftChoices = left.selected_product_step_choice_ids.join(',')
      const rightChoices = right.selected_product_step_choice_ids.join(',')
      const choiceOrder = leftChoices.localeCompare(rightChoices)
      return choiceOrder || left.quantity - right.quantity
    })
  const customer = input.customer
  const customerName =
    customer && typeof customer === 'object' ? customer.name : customer

  return JSON.stringify({
    customer: normalizedText(customerName),
    customer_id: Number(
      input.customerID ||
        (customer && typeof customer === 'object' ? customer.id : 0)
    ),
    phone: normalizedText(input.phone),
    remark: normalizedText(input.remark),
    payment: normalizedText(input.payment).toLowerCase(),
    flow: input.stripe === true ? 'stripe' : 'order',
    expected_total: roundPrice(
      input.total == null ? input.expected_total : input.total
    ),
    items,
  })
}

const applyServerQuoteToCart = (cart, serverQuote) => {
  const quoteBySignature = new Map()
  for (const item of (serverQuote && serverQuote.items) || []) {
    quoteBySignature.set(
      buildConfigurationSignature(
        item.product_id,
        item.selected_choice_ids || item.selected_product_step_choice_ids
      ),
      item
    )
  }

  return (Array.isArray(cart) ? cart : []).map((line) => {
    const selectedChoiceIds = getSelectedChoiceIds(line)
    const configurationSignature = buildConfigurationSignature(
      getProductId(line),
      selectedChoiceIds
    )
    const quote = quoteBySignature.get(configurationSignature)
    if (!quote) {
      return { ...line, configurationSignature, selectedChoiceIds }
    }

    const price = roundPrice(quote.unit_price)
    const qty = Number(line.qty || quote.quantity || 0)
    return {
      ...line,
      configurationSignature,
      selectedChoiceIds,
      price,
      qty,
      subtotal: roundPrice(price * qty),
    }
  })
}

const findCartTargetForCheckoutError = (cart, error) => {
  const normalizedCart = Array.isArray(cart) ? cart : []
  const details = error && typeof error === 'object' ? error : {}
  const positiveIdOrZero = (value) => {
    const normalized = Number(value)
    return Number.isInteger(normalized) && normalized > 0 ? normalized : 0
  }
  const productId = positiveIdOrZero(details.product_id)
  const productStepId = positiveIdOrZero(details.product_step_id)
  const choiceId = positiveIdOrZero(
    details.product_step_choice_id || details.choice_id
  )
  const targets = new Map()
  const addTarget = (lineIndex, stepId) => {
    const normalizedStepId = Number(stepId)
    if (!Number.isInteger(normalizedStepId) || normalizedStepId <= 0) return
    targets.set(`${lineIndex}:${normalizedStepId}`, {
      lineIndex,
      productStepId: normalizedStepId,
    })
  }

  if (productStepId > 0 || choiceId > 0) {
    normalizedCart.forEach((line, lineIndex) => {
      if (productId > 0 && getProductId(line) !== productId) return
      const selections = Array.isArray(line.selections) ? line.selections : []
      const steps = Array.isArray(line.customization_steps)
        ? line.customization_steps
        : []

      if (choiceId > 0) {
        const matchingSelections = selections.filter(
          (selection) =>
            Number(selection.product_step_choice_id) === choiceId &&
            (productStepId <= 0 ||
              Number(selection.product_step_id) === productStepId)
        )
        matchingSelections.forEach((selection) =>
          addTarget(lineIndex, productStepId || selection.product_step_id)
        )
        return
      }

      if (
        steps.some((step) => Number(step.product_step_id) === productStepId)
      ) {
        addTarget(lineIndex, productStepId)
      }
    })
  } else if (Array.isArray(details.shortages)) {
    const shortageIds = new Set(
      details.shortages
        .map((shortage) => Number(shortage && shortage.product_id))
        .filter((shortageId) => shortageId > 0)
    )
    normalizedCart.forEach((line, lineIndex) => {
      const selections = Array.isArray(line.selections) ? line.selections : []
      selections
        .filter((selection) =>
          shortageIds.has(Number(selection.linked_product_id))
        )
        .forEach((selection) => addTarget(lineIndex, selection.product_step_id))
    })
  }

  const matches = Array.from(targets.values())
  return matches.length === 1 ? matches[0] : null
}

const createComponentInputId = (prefix, vueUid) => `${prefix}-${vueUid}`

const normalizeActive = (value) => ![false, 0, '0', 'false'].includes(value)

const isInvalidNumericInput = (value) =>
  !['number', 'string'].includes(typeof value) ||
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '')

const positiveInteger = (value, label) => {
  if (isInvalidNumericInput(value)) throw new TypeError(`${label} invalide.`)
  const normalized = Number(value)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${label} invalide.`)
  }
  return normalized
}

const nonNegativeInteger = (value, label) => {
  if (isInvalidNumericInput(value)) throw new TypeError(`${label} invalide.`)
  const normalized = Number(value)
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new TypeError(`${label} invalide.`)
  }
  return normalized
}

const decimalPrice = (value) => {
  if (isInvalidNumericInput(value)) {
    throw new TypeError('Le supplément est invalide.')
  }
  const rawValue = String(value).trim()
  if (
    typeof value === 'string' &&
    !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(rawValue)
  ) {
    throw new TypeError('Le supplément est invalide.')
  }
  const normalized = Number(rawValue.replace(',', '.'))
  if (!Number.isFinite(normalized)) {
    throw new TypeError('Le supplément est invalide.')
  }
  return roundPrice(normalized).toFixed(2)
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
          extra_price: decimalPrice(choice.extra_price),
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
}
