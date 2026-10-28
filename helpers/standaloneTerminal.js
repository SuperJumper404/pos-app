const { canAccessModule, isStaffAccess } = require('./staffRoles')

const MIN_AMOUNT_CENTS = 50
const MAX_AMOUNT_CENTS = 99999999
const positiveId = value => Number.isSafeInteger(value) && value > 0
const validAmount = value => Number.isSafeInteger(value) && value >= MIN_AMOUNT_CENTS && value <= MAX_AMOUNT_CENTS
const validAttemptKey = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const statuses = ['creating', 'processing', 'succeeded', 'failed', 'canceled']

const appendAmountDigit = (amount, digit) => {
  if (!Number.isSafeInteger(amount) || amount < 0 || !/^[0-9]$/.test(String(digit))) return amount
  const next = amount * 10 + Number(digit)
  return next <= MAX_AMOUNT_CENTS ? next : amount
}
const removeAmountDigit = amount => Math.floor(amount / 10)
const formatTerminalAmount = amount => `${Math.floor(amount / 100).toLocaleString('fr-FR')},${String(amount % 100).padStart(2, '0')}`

const validStandalonePayment = payment => Boolean(payment && payment.paymentKind === 'standalone' &&
  positiveId(payment.id) && positiveId(payment.readerId) && validAmount(payment.amountCents) &&
  payment.currency === 'eur' && statuses.includes(payment.status) && validDate(payment.createdAt) &&
  (payment.confirmedAt === null || validDate(payment.confirmedAt)) &&
  (payment.status !== 'succeeded' || validDate(payment.confirmedAt)) &&
  (payment.failureCode === null || typeof payment.failureCode === 'string') &&
  (payment.failureMessage === null || typeof payment.failureMessage === 'string') &&
  (payment.cardTicket === null || (typeof payment.cardTicket === 'object' && !Array.isArray(payment.cardTicket))) &&
  Number.isSafeInteger(payment.attachmentsCount) && payment.attachmentsCount >= 0)

const attemptStorageKey = user => user && positiveId(Number(user.shopid)) && positiveId(Number(user.id))
  ? `standalone-terminal:${Number(user.shopid)}:${Number(user.id)}` : null
const validAttempt = attempt => Boolean(attempt && validAttemptKey(attempt.attemptKey) && validAmount(attempt.amountCents) &&
  (attempt.paymentId === null || positiveId(attempt.paymentId)))
const readAttempt = (storage, key) => {
  if (!storage || !key) return null
  try {
    const attempt = JSON.parse(storage.getItem(key))
    return validAttempt(attempt) ? { attemptKey: attempt.attemptKey, amountCents: attempt.amountCents, paymentId: attempt.paymentId } : null
  } catch (_) { return null }
}
const saveAttempt = (storage, key, attempt) => {
  if (!storage || !key || !validAttempt(attempt)) return false
  try {
    storage.setItem(key, JSON.stringify({ attemptKey: attempt.attemptKey, amountCents: attempt.amountCents, paymentId: attempt.paymentId }))
    return true
  } catch (_) { return false }
}
const canUseStandaloneTerminal = ({ user, reader, path = '/', hasRecovery = false }) => {
  if (!attemptStorageKey(user) || !isStaffAccess(user.access) || Number(user.status) === 0 ||
    ['service_point', 'customer'].includes(user.session_subject) ||
    !canAccessModule(user.access, 'cashregister', user.module_permissions, user.is_primary_admin)) return false
  if (/^\/(?:login|register|borne|cart|ordersStatuses|table-access|click-and-collect|activation|session-expired|qr-scan-failed)(?:\/|$)/i.test(path)) return false
  return Boolean(hasRecovery || (reader && reader.isActive && reader.status === 'online' &&
    Number(reader.assignedUserId) === Number(user.id)))
}
const terminalStatusText = status => ({
  creating: 'Préparation du paiement', processing: 'En attente sur le TPE',
  succeeded: 'Paiement reçu', failed: 'Paiement échoué', canceled: 'Paiement annulé',
}[status] || 'Vérification nécessaire')
const terminalStatusColor = status => ({ succeeded: 'success', failed: 'error', canceled: 'grey', creating: 'warning', processing: 'primary' }[status] || 'warning')

module.exports = {
  MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS, positiveId, validAmount, validAttemptKey,
  appendAmountDigit, removeAmountDigit, formatTerminalAmount, validStandalonePayment,
  attemptStorageKey, readAttempt, saveAttempt, canUseStandaloneTerminal,
  terminalStatusText, terminalStatusColor,
}
