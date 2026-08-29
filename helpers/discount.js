const { roundPrice } = require('./price-functions')

const DEFAULT_DISCOUNT_PERCENTAGES = [5, 10, 15, 20]
const DISCOUNT_PERCENTAGE_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

const normalizeDiscountPercentages = (values) => {
  const source = Array.isArray(values) ? values : []
  const normalized = source
    .map((value) => roundPrice(value))
    .filter((value) => value > 0 && value <= 100)
  const unique = [...new Set(normalized)].sort((left, right) => left - right)
  return unique.length ? unique : [...DEFAULT_DISCOUNT_PERCENTAGES]
}

const calculateDiscount = ({ subtotal, type, value }) => {
  const base = roundPrice(subtotal)
  const normalizedType = ['percent', 'amount'].includes(type) ? type : 'none'
  const normalizedValue = Math.max(0, roundPrice(value))
  const amount = normalizedType === 'percent'
    ? roundPrice(base * Math.min(normalizedValue, 100) / 100)
    : normalizedType === 'amount' ? Math.min(base, normalizedValue) : 0

  return {
    type: normalizedType,
    value: normalizedValue,
    amount: roundPrice(amount),
    total: roundPrice(base - amount),
  }
}

module.exports = {
  DEFAULT_DISCOUNT_PERCENTAGES,
  DISCOUNT_PERCENTAGE_OPTIONS,
  calculateDiscount,
  normalizeDiscountPercentages,
}
