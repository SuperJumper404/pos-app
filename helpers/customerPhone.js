const validateCustomerPhone = (value) => {
  const phone = String(value == null ? '' : value).trim()
  if (!phone) return 'Veuillez saisir votre numéro de téléphone.'

  const invalidMessage =
    'Numéro de téléphone invalide. Exemple : 06 12 34 56 78 ou +33 6 12 34 56 78.'
  if (!/^[+\d\s().-]+$/.test(phone)) return invalidMessage

  const normalized = phone.replace(/[\s().-]/g, '').replace(/^00/, '+')
  if (normalized.startsWith('+33')) {
    return /^\+33[1-9]\d{8}$/.test(normalized) || invalidMessage
  }

  return (
    /^0[1-9]\d{8}$/.test(normalized) ||
    /^\+[1-9]\d{7,14}$/.test(normalized) ||
    invalidMessage
  )
}

module.exports = { validateCustomerPhone }
