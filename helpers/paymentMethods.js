const PAYMENT_METHOD_OPTIONS = [
  {
    text: 'Carte bancaire',
    value: 'Carte bancaire',
    icon: 'mdi-credit-card-outline',
    aliases: ['Carte', 'Carte Bleu', 'Carte Bleu ', 'CB'],
  },
  {
    text: 'Espèces',
    value: 'Espèces',
    icon: 'mdi-cash',
    aliases: ['Espèce', 'Espèces '],
  },
  {
    text: 'Ticket resto',
    value: 'Ticket resto',
    icon: 'mdi-ticket-confirmation-outline',
    aliases: ['Ticket Restaurant', 'Tickets Restaurants'],
  },
  {
    text: 'Chèque',
    value: 'Chèque',
    icon: 'mdi-file-document-outline',
    aliases: ['Cheque', 'Cheques', 'Chèques'],
  },
]

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

const findPaymentMethodOption = (method) => {
  const normalized = normalizeText(method)
  return PAYMENT_METHOD_OPTIONS.find((option) => {
    const names = [option.text, option.value, ...(option.aliases || [])]
    return names.some((name) => normalizeText(name) === normalized)
  })
}

const normalizePaymentMethod = (method) => {
  const candidate = method && typeof method === 'object'
    ? method.value || method.text || method.name
    : method
  const option = findPaymentMethodOption(candidate)
  return option ? option.value : String(candidate || '').trim()
}

const normalizePaymentMethods = (methods) => {
  const source = Array.isArray(methods) ? methods : []
  const normalized = source.map(normalizePaymentMethod).filter(Boolean)
  return [...new Set(normalized)]
}

const normalizePaymentSummary = (rows) => {
  const source = Array.isArray(rows) ? rows : []
  const grouped = new Map()

  source.forEach((row) => {
    const payment = normalizePaymentMethod(row && row.payment)
    if (!payment) return

    const key = normalizeText(payment)
    const hasOrderCount =
      Object.prototype.hasOwnProperty.call(row || {}, 'orders_count')
    const existing = grouped.get(key) || {
      ...row,
      payment,
      total: 0,
      ...(hasOrderCount ? { orders_count: 0 } : {}),
    }
    const next = {
      ...existing,
      payment,
      total:
        Math.round(
          ((Number(existing.total) || 0) + (Number(row.total) || 0)) * 100
        ) / 100,
    }

    if (
      hasOrderCount ||
      Object.prototype.hasOwnProperty.call(existing, 'orders_count')
    ) {
      next.orders_count =
        (Number(existing.orders_count) || 0) +
        (Number(row && row.orders_count) || 0)
    }

    grouped.set(key, next)
  })

  return Array.from(grouped.values())
}

const getPaymentMethodOptions = (methods) => {
  const normalized = normalizePaymentMethods(methods)
  const active = normalized.length
    ? normalized
    : PAYMENT_METHOD_OPTIONS.map((option) => option.value)
  return active
    .map((method) => findPaymentMethodOption(method))
    .filter(Boolean)
}

module.exports = {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodOptions,
  normalizePaymentMethod,
  normalizePaymentMethods,
  normalizePaymentSummary,
}
