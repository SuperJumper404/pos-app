const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

const normalizeVatBreakdown = (details) => {
  const groups = new Map()

  ;(Array.isArray(details) ? details : []).forEach((detail) => {
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
  normalizeVatBreakdown,
}
