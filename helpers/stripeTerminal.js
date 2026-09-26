const isTerminalMethod = (method) => {
  const value = method && typeof method === 'object'
    ? method.payment_provider || method.value || method.payment_method
    : method
  return typeof value === 'string' &&
    ['stripe_terminal', 'terminal', 'stripe terminal'].includes(value.trim().toLowerCase())
}

const isTerminalPaymentPending = (payment) =>
  Boolean(payment && ['creating', 'processing'].includes(payment.status))

const terminalPaymentMessage = (payment) => {
  const status = payment && payment.status
  if (status === 'failed') {
    return terminalErrorMessage(payment.failureCode) || TERMINAL_ERROR_MESSAGES.TERMINAL_PAYMENT_FAILED
  }
  const messages = {
    creating: 'Preparation du paiement sur le terminal.',
    processing: 'Paiement en cours sur le terminal.',
    succeeded: 'Paiement accepte.',
    canceled: 'Paiement annule.',
  }
  return messages[status] || 'Statut du paiement indisponible.'
}

const TERMINAL_ERROR_MESSAGES = {
  TERMINAL_INVALID_INPUT: 'Parametres du terminal invalides.',
  TERMINAL_FORBIDDEN: 'Acces au terminal refuse.',
  TERMINAL_INVALID_ASSIGNEE: 'Le compte assigne doit etre un employe actif du restaurant.',
  TERMINAL_ASSIGNMENT_CONFLICT: 'Cette affectation de terminal est deja utilisee.',
  TERMINAL_READER_NOT_FOUND: 'Terminal introuvable.',
  TERMINAL_READER_INACTIVE: 'Ce terminal est desactive.',
  TERMINAL_REGISTRATION_BUSY: 'Une connexion de terminal est deja en cours.',
  TERMINAL_INVALID_ORDERS: 'Ces commandes ne peuvent pas etre encaissees sur le terminal.',
  TERMINAL_ORDER_BUSY: 'Une commande a deja un paiement sur un autre terminal.',
  TERMINAL_NO_READER: 'Aucun terminal actif ne vous est assigne.',
  TERMINAL_READER_OFFLINE: 'Le terminal est hors ligne.',
  TERMINAL_READER_BUSY: 'Le terminal est occupe.',
  TERMINAL_CONNECT_NOT_READY: 'Le compte Stripe du restaurant ne permet pas les paiements.',
  TERMINAL_PAYMENT_NOT_FOUND: 'Paiement terminal introuvable.',
  TERMINAL_PAYMENT_CREATING: 'La preparation du paiement est en cours.',
  TERMINAL_RECOVERY_REQUIRED: 'Ce paiement doit etre verifie avant une nouvelle tentative.',
  TERMINAL_PAYMENT_FAILED: 'Le paiement sur le terminal a echoue.',
  TERMINAL_STRIPE_ERROR: 'Le service Stripe est indisponible.',
  TERMINAL_CLEANUP_FAILED: 'Une verification du terminal est necessaire.',
  TERMINAL_INTERNAL_ERROR: 'Impossible de gerer le terminal.',
  TERMINAL_INVALID_RESPONSE: 'Reponse du terminal invalide.',
  TERMINAL_REQUEST_FAILED: 'Impossible de contacter le terminal.',
}

const terminalErrorMessage = (code) =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(TERMINAL_ERROR_MESSAGES, code)
    ? TERMINAL_ERROR_MESSAGES[code]
    : null

module.exports = {
  terminalErrorMessage,
  isTerminalMethod,
  isTerminalPaymentPending,
  terminalPaymentMessage,
}
