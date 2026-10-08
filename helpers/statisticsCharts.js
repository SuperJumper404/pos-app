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
  'déc.',
]

const roundMoney = (value) =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100

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

const formatCurrency = (value) =>
  `${roundMoney(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`

const buildPaymentRevenueChartConfig = (series = []) => {
  const rows = Array.isArray(series) ? series : []
  const labels = rows.map((row) => formatChartDate(row.date))
  const paymentMethods = collectPaymentMethods(rows)
  const maxTotal = roundMoney(Math.max(0, ...rows.map((row) => Number(row.total) || 0)))
  const paymentDatasets = paymentMethods.map((method, index) => ({
    type: 'bar',
    label: method,
    data: rows.map((row) => roundMoney(row.payments && row.payments[method])),
    backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
    borderColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
    borderRadius: 6,
    borderSkipped: false,
    maxBarThickness: 44,
    stack: 'payments',
    order: 2,
  }))

  return {
    maxTotal,
    paymentMethods,
    data: {
      labels,
      datasets: [
        ...paymentDatasets,
        {
          type: 'line',
          label: 'Total jour',
          data: rows.map((row) => roundMoney(row.total)),
          borderColor: '#121826',
          backgroundColor: '#ffffff',
          borderWidth: 2,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#121826',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.32,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxHeight: 10,
            boxWidth: 10,
            color: '#1f2933',
            font: {
              family: 'Poppins, sans-serif',
              size: 12,
              weight: '600',
            },
            usePointStyle: true,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            color: '#687386',
            font: {
              family: 'Poppins, sans-serif',
              size: 11,
              weight: '600',
            },
            maxRotation: 0,
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          suggestedMax: maxTotal || undefined,
          grid: {
            color: '#e8edf3',
          },
          ticks: {
            color: '#687386',
            callback(value) {
              return formatCurrency(value)
            },
            font: {
              family: 'Poppins, sans-serif',
              size: 11,
              weight: '600',
            },
          },
        },
      },
    },
  }
}

module.exports = {
  buildPaymentRevenueChartConfig,
  formatChartDate,
}
