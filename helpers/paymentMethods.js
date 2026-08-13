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
    aliases: [],
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
}
