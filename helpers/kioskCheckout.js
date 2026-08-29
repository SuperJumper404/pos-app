const { roundPrice } = require('./price-functions')
const { buildConfigurationSignature } = require('./customizations')
const {
  isCounterPaymentAllowed,
  isStripePaymentRequired,
} = require('./checkoutAccess')

const KIOSK_SOURCE = 'borne'

const requiredText = (value, label) => {
  const normalized = String(value || '').trim()
  if (!normalized) throw new TypeError(`${label} est obligatoire.`)
  return normalized
}

const buildKioskCheckoutPayload = ({
  customer,
  phone,
  servicePointId,
  total,
  payment,
  isTakeaway,
  dataCart,
  stripe = false,
  repriceConfirmation = false,
} = {}) => {
  const normalizedServicePointId = Number(servicePointId || 0)
  if (!normalizedServicePointId) {
    throw new TypeError('Le service point de la borne est obligatoire.')
  }
  if (!Array.isArray(dataCart) || dataCart.length === 0) {
    throw new TypeError('Le panier est vide.')
  }

  return {
    customer: requiredText(customer, 'Le nom'),
    phone: requiredText(phone, 'Le numero'),
    servicePointId: normalizedServicePointId,
    total: roundPrice(total),
    payment: requiredText(payment, 'Le paiement'),
    remark: '',
    isTakeaway: isTakeaway === true,
    dataCart,
    stripe: stripe === true,
    ...(repriceConfirmation === true ? { repriceConfirmation: true } : {}),
    source: KIOSK_SOURCE,
  }
}

const getKioskOrderReference = (result = {}) => {
  const data = result.data || result
  const orderId = data.orderId || data.insertId || data.id || null
  return {
    orderId,
    orderNumber: String(data.orderNumber || data.ordernumber || orderId || ''),
  }
}

const buildKioskCartLine = (product = {}, customization = {}) => {
  const selectedChoiceIds = Array.from(
    new Set(
      (customization.selectedChoiceIds || [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  ).sort((left, right) => left - right)
  const selections = (customization.selections || []).map((selection) => ({
    ...selection,
  }))
  const price = roundPrice(
    customization.unitPrice == null ? product.price : customization.unitPrice
  )

  return {
    ...product,
    selectedChoiceIds,
    selections,
    customizationList: selections.map((selection) => ({
      ...selection,
      name: selection.choice_name || selection.name,
      price: selection.extra_price,
    })),
    configurationSignature: buildConfigurationSignature(
      product.id,
      selectedChoiceIds
    ),
    price,
    qty: 1,
    subtotal: price,
  }
}

const isKioskProductAvailable = (product = {}) => {
  const hidden = [true, 1, '1', 'true'].includes(product.is_hidden)
  const archived = Number(product.archived || 0) !== 0
  const outOfStock = product.stock != null && Number(product.stock) < 1

  return !(
    hidden ||
    archived ||
    outOfStock ||
    product.customization_available === false
  )
}

const getKioskPaymentAvailability = (mode) => ({
  counter: isCounterPaymentAllowed(mode),
  stripe: isStripePaymentRequired(mode),
})

const getKioskStripeReturnOutcome = (order = {}) => {
  if (order.payment_status === 'paid') return 'paid'
  if (['failed', 'canceled'].includes(order.payment_status)) return 'failed'
  return 'pending'
}

module.exports = {
  KIOSK_SOURCE,
  buildKioskCartLine,
  buildKioskCheckoutPayload,
  getKioskPaymentAvailability,
  getKioskOrderReference,
  getKioskStripeReturnOutcome,
  isKioskProductAvailable,
}
