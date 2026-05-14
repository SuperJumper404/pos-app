const parsePrice = (value) => {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(String(value).replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const roundPrice = (value) =>
  Math.round((parsePrice(value) + Number.EPSILON) * 100) / 100

const formatPrice = (value) =>
  roundPrice(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const price = {
  methods: {
    parsePrice,
    roundPrice,
    formatPrice,
    formatCurrency(value) {
      return `${formatPrice(value)} €`
    },
    conversiRp(value) {
      return formatPrice(value)
    },
  },
}

export { parsePrice, roundPrice, formatPrice }
export default price
