const { parsePrice, roundPrice, formatPrice } = require('./price-functions')

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
