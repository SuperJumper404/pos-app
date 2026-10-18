const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

const normalizeDeliveryCharge = (charge) => {
  if (charge == null) return null
  const { feeCents, totalExclTaxCents, taxCents, vatRate } = charge
  if (![feeCents, totalExclTaxCents, taxCents].every(value => Number.isSafeInteger(value) && value >= 0) ||
    totalExclTaxCents + taxCents !== feeCents || typeof vatRate !== 'number' || !Number.isFinite(vatRate) || vatRate < 0) {
    throw new TypeError('Invalid delivery fiscal snapshot')
  }
  return { feeCents, totalExclTaxCents, taxCents, vatRate,
    fiscalPolicy: { mode: 'configured_rate', vatRate } }
}

const deliveryChargeFor = (order = {}) => normalizeDeliveryCharge(
  order.financials?.delivery_charge || order.delivery_charge
)

const normalizeVatBreakdown = (details, deliveryCharge) => {
  const groups = new Map()
  const charges = (Array.isArray(deliveryCharge) ? deliveryCharge : [deliveryCharge])
    .filter(Boolean).map(normalizeDeliveryCharge).filter(charge => charge.feeCents > 0)
  const rows = [...(Array.isArray(details) ? details : []), ...charges.map(charge => ({
    vatRate: charge.vatRate, totalHt: charge.totalExclTaxCents / 100,
    totalVat: charge.taxCents / 100, totalTtc: charge.feeCents / 100,
  }))]

  rows.forEach((detail) => {
    const vatRate = toNumber(
      detail.vat_rate !== undefined ? detail.vat_rate : detail.vatRate
    )
    const totalHt = toNumber(
      detail.total_ht !== undefined ? detail.total_ht : detail.totalHt
    )
    const totalVat = toNumber(
      detail.total_vat !== undefined ? detail.total_vat : detail.totalVat
    )
    const totalTtc = toNumber(
      detail.total !== undefined
        ? detail.total
        : detail.total_ttc !== undefined
        ? detail.total_ttc
        : detail.totalTtc
    )
    if (vatRate === null || totalHt === null || totalVat === null || totalTtc === null) return

    const current = groups.get(vatRate) || {
      vatRate,
      totalHt: 0,
      totalVat: 0,
      totalTtc: 0,
    }
    current.totalHt = roundMoney(current.totalHt + totalHt)
    current.totalVat = roundMoney(current.totalVat + totalVat)
    current.totalTtc = roundMoney(current.totalTtc + totalTtc)
    groups.set(vatRate, current)
  })

  return [...groups.values()].sort((left, right) => left.vatRate - right.vatRate)
}

module.exports = {
  deliveryChargeFor,
  normalizeDeliveryCharge,
  normalizeVatBreakdown,
}
