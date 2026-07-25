const {
  buildCheckoutItems,
  buildConfigurationSignature,
} = require('./customizations')
const { roundPrice } = require('./price-functions')

const canEditOrder = (order = {}) =>
  Number(order.status) === 1 &&
  ['unpaid', 'requires_payment'].includes(String(order.payment_status))

const canStartComplementaryOrder = (order = {}) =>
  order.payment_provider === 'stripe' && order.payment_status === 'paid'

const canUseOrderEditModal = (access, order = {}) =>
  Number(access) === 0 && canEditOrder(order)

const selectedObjects = (product, selectedIds) => {
  const selected = new Set((selectedIds || []).map(Number))
  const selections = []

  for (const step of product.customization_steps || []) {
    for (const choice of step.choices || []) {
      if (!selected.has(Number(choice.product_step_choice_id))) continue
      selections.push({
        product_step_id: Number(step.product_step_id),
        product_step_choice_id: Number(choice.product_step_choice_id),
        step_name: step.name,
        choice_name: choice.choice_name || choice.name,
        extra_price: Number(choice.extra_price || 0),
        choice_type: choice.choice_type,
        linked_product_id: choice.linked_product_id || null,
      })
    }
  }

  return selections
}

const snapshotSelections = (snapshots) =>
  (snapshots || []).map((snapshot) => ({
    product_step_id: Number(snapshot.product_customization_step_id || 0),
    product_step_choice_id:
      snapshot.product_customization_step_choice_id == null
        ? null
        : Number(snapshot.product_customization_step_choice_id),
    step_name: snapshot.step_name,
    choice_name: snapshot.choice_name || snapshot.name,
    extra_price: Number(
      snapshot.unit_extra_price != null
        ? snapshot.unit_extra_price
        : snapshot.price || 0
    ),
    choice_type: snapshot.choice_type,
    linked_product_id: snapshot.linked_product_id || null,
  }))

const editableOrderToCart = (editable = {}, products = []) =>
  (editable.items || []).map((item) => {
    const product = products.find(
      (candidate) => Number(candidate.id) === Number(item.product_id)
    )
    if (!product) {
      throw Object.assign(new Error('Produit de la commande introuvable.'), {
        code: 'PRODUCT_NOT_FOUND',
        product_id: item.product_id,
      })
    }

    const selectedChoiceIds = (item.selections || [])
      .map((selection) =>
        Number(selection.product_customization_step_choice_id)
      )
      .filter((choiceId) => Number.isInteger(choiceId) && choiceId > 0)
    const currentSelections = selectedObjects(product, selectedChoiceIds)
    const selections =
      currentSelections.length === selectedChoiceIds.length &&
      item.requires_reconfiguration !== true
        ? currentSelections
        : snapshotSelections(item.historical_customizations)

    return {
      ...product,
      selectedChoiceIds,
      selections,
      customizationList: selections.map((selection) => ({
        ...selection,
        name: selection.choice_name,
        price: selection.extra_price,
      })),
      configurationSignature: buildConfigurationSignature(
        product.id,
        selectedChoiceIds
      ),
      qty: Number(item.quantity),
      price: roundPrice(item.unit_price),
      subtotal: roundPrice(item.total),
      requiresReconfiguration: item.requires_reconfiguration === true,
    }
  })

const cartToOrderEditPayload = ({ contentRevision, expectedTotal, cart } = {}) => ({
  content_revision: contentRevision,
  expected_total: roundPrice(expectedTotal),
  items: buildCheckoutItems(cart),
})

const canonicalCart = (cart) => JSON.stringify(buildCheckoutItems(cart || []))
const isOrderEditDirty = (originalCart, currentCart) =>
  canonicalCart(originalCart) !== canonicalCart(currentCart)

module.exports = {
  canEditOrder,
  canStartComplementaryOrder,
  canUseOrderEditModal,
  editableOrderToCart,
  cartToOrderEditPayload,
  isOrderEditDirty,
}
