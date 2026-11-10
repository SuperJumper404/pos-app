const parseDeclarationCents = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null
}

const reconciliationRows = (value) => {
  if (!value) return []
  return [
    { key: 'cash', label: 'Espèces', expected: value.expected_cash_cents,
      declared: value.declared_cash_cents, difference: value.cash_difference_cents },
    { key: 'card', label: 'Carte', expected: value.expected_card_cents,
      declared: value.declared_card_cents, difference: value.card_difference_cents },
  ]
}

module.exports = { parseDeclarationCents, reconciliationRows }
