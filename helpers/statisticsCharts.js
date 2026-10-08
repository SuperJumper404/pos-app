const CHART_HEIGHT = 80
const PAYMENT_COLORS = [
  '#1976d2',
  '#00a86b',
  '#ffa014',
  '#7e22ce',
  '#d83b3b',
  '#687386',
]
const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'dec.',
]

const roundMoney = (value) =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100

const chartNumber = (value) => Number(Number(value).toFixed(12))

const formatChartDate = (date) => {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(date || '')
  return `${parsed.getDate()} ${MONTHS[parsed.getMonth()]}`
}

const collectPaymentMethods = (rows) => {
  const methods = []
  rows.forEach((row) => {
    Object.keys((row && row.payments) || {}).forEach((method) => {
      if (!methods.includes(method)) methods.push(method)
    })
  })
  return methods
}

const buildPaymentRevenueChart = (series = []) => {
  const rows = Array.isArray(series) ? series : []
  const methods = collectPaymentMethods(rows)
  const maxTotal = Math.max(0, ...rows.map((row) => Number(row.total) || 0))
  const step = rows.length > 1 ? 80 / (rows.length - 1) : 0

  const chartRows = rows.map((row, rowIndex) => {
    let cursor = CHART_HEIGHT
    const segments = methods
      .map((method) => {
        const amount = roundMoney(row.payments && row.payments[method])
        if (!amount || !maxTotal) return null
        const height = (amount / maxTotal) * CHART_HEIGHT
        cursor -= height
        return {
          method,
          amount,
          y: chartNumber(cursor),
          height: chartNumber(height),
        }
      })
      .filter(Boolean)

    return {
      date: row.date,
      label: formatChartDate(row.date),
      total: roundMoney(row.total),
      x: rows.length > 1 ? 10 + rowIndex * step : 50,
      segments,
    }
  })

  const linePoints = chartRows.map((row) => ({
    x: chartNumber(row.x),
    y: chartNumber(
      maxTotal ? CHART_HEIGHT - (row.total / maxTotal) * CHART_HEIGHT : CHART_HEIGHT
    ),
  }))

  return {
    labels: chartRows.map((row) => row.label),
    methods,
    colors: methods.reduce((acc, method, index) => {
      acc[method] = PAYMENT_COLORS[index % PAYMENT_COLORS.length]
      return acc
    }, {}),
    maxTotal: roundMoney(maxTotal),
    rows: chartRows,
    linePoints,
  }
}

module.exports = {
  CHART_HEIGHT,
  buildPaymentRevenueChart,
  formatChartDate,
}
