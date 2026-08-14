const { roundPrice } = require('./price-functions')

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
    source: KIOSK_SOURCE,
  }
}

const getKioskOrderReference = (result = {}) => {
  const data = result.data || {}
  const orderId = data.orderId || data.insertId || data.id || null
  return {
    orderId,
    orderNumber: String(data.orderNumber || data.ordernumber || orderId || ''),
  }
}

module.exports = {
  KIOSK_SOURCE,
  buildKioskCheckoutPayload,
  getKioskOrderReference,
}
