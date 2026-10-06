function smartPrintEnabled(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function normalizePaymentMethod(method) {
  return String(method || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
}

function isCashPaymentMethod(method) {
  const value = normalizePaymentMethod(method)
  return value.includes('espece') || value.includes('cash')
}

function buildCashDrawerRequest() {
  return {
    action: 'open_cash_drawer',
    ticketType: 'caisse',
    source: 'pos_cashregister',
  }
}

function sendCashDrawerOpen({
  smartPrint,
  printerIp,
  fetchImplementation,
} = {}) {
  if (!smartPrintEnabled(smartPrint)) return false

  const host = String(printerIp || '').trim()
  if (!host) throw new Error('Adresse SmartEat Printing App manquante.')

  const requestFetch =
    fetchImplementation ||
    (typeof fetch === 'function' ? fetch.bind(globalThis) : null)

  if (!requestFetch) throw new Error('Impression locale indisponible.')

  Promise.resolve(
    requestFetch(`http://${host}:8989/cash-drawer/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCashDrawerRequest()),
    })
  ).catch(() => {})

  return true
}

module.exports = {
  buildCashDrawerRequest,
  isCashPaymentMethod,
  sendCashDrawerOpen,
}
