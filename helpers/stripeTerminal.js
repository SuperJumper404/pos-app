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
    return payment.failureMessage && typeof payment.failureMessage === 'string'
      ? payment.failureMessage
      : 'Le paiement sur le terminal a echoue.'
  }
  const messages = {
    creating: 'Preparation du paiement sur le terminal.',
    processing: 'Paiement en cours sur le terminal.',
    succeeded: 'Paiement accepte.',
    canceled: 'Paiement annule.',
  }
  return messages[status] || 'Statut du paiement indisponible.'
}

module.exports = {
  isTerminalMethod,
  isTerminalPaymentPending,
  terminalPaymentMessage,
}
