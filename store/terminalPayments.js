import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const { positiveId, validAmount, validAttemptKey, validStandalonePayment } = require('../helpers/standaloneTerminal')
const { terminalErrorMessage } = require('../helpers/stripeTerminal')
const baseUrl = '/baseurl/api/v1/stripe/terminal'
const requests = new WeakMap()
const metadata = state => {
  if (!requests.has(state)) requests.set(state, { session: 0, payment: 0, active: 0 })
  return requests.get(state)
}
const identity = rootState => {
  const user = rootState && rootState.users && rootState.users.user
  return user && user.id && user.shopid ? `${user.shopid}:${user.id}:${user.token || ''}` : null
}
const invalid = (code = 'TERMINAL_INVALID_INPUT') => { const error = new Error(code); error.code = code; throw error }
const requiredId = value => { if (!positiveId(value)) invalid(); return value }
const config = () => ({
  headers: { Authorization: `Bearer ${typeof localStorage === 'undefined' ? '' : localStorage.getItem('token') || ''}` },
  skipGlobalErrorNotification: true,
})
const normalizeError = error => {
  const code = error && error.response && error.response.data && error.response.data.error || error && error.code || 'TERMINAL_REQUEST_FAILED'
  return { code, message: terminalErrorMessage(code) || 'Impossible de vérifier le paiement. Réessayez avec la même tentative.' }
}
const run = async (context, send, validate, paymentRequest = false) => {
  const { state, dispatch, rootState } = context
  const request = metadata(state)
  const session = request.session
  const owner = identity(rootState)
  const generation = paymentRequest ? ++request.payment : null
  const fresh = () => request.session === session && owner === identity(rootState) &&
    (!paymentRequest || request.payment === generation)
  if (paymentRequest) {
    request.active += 1
    dispatch('set/loading', true)
    dispatch('set/error', null)
  }
  try {
    if (!owner) invalid('TERMINAL_FORBIDDEN')
    const response = await send()
    const envelope = response && response.data
    if (!envelope || envelope.success !== true || !Number.isInteger(envelope.code) ||
      envelope.code < 200 || envelope.code >= 300 || !validate(envelope.data)) invalid('TERMINAL_INVALID_RESPONSE')
    if (!fresh()) return false
    if (paymentRequest) dispatch('set/activePayment', envelope.data)
    return envelope.data
  } catch (error) {
    if (paymentRequest && fresh()) dispatch('set/error', normalizeError(error))
    return false
  } finally {
    if (paymentRequest && request.session === session) {
      request.active -= 1
      dispatch('set/loading', request.active > 0)
    }
  }
}
const validSource = item => Boolean(item && (positiveId(item.archiveId) || (item.archiveId === null && positiveId(item.orderId))) &&
  (item.orderId === undefined || positiveId(item.orderId)))
const sourceKey = item => positiveId(item.archiveId) ? `archive:${item.archiveId}` : `order:${item.orderId}`
const validAttachment = item => Boolean(validSource(item) &&
  typeof item.orderNumber === 'string' && Number.isSafeInteger(item.amountCents) && item.amountCents >= 0 &&
  typeof item.attachedAt === 'string' && typeof item.available === 'boolean')
const validAttachmentResult = result => Boolean(result && validStandalonePayment(result.payment) &&
  Array.isArray(result.attachments) && result.attachments.every(validAttachment) &&
  new Set(result.attachments.map(sourceKey)).size === result.attachments.length)
const attachmentResultFor = id => result => validAttachmentResult(result) && result.payment.id === id
const pageParams = (input = {}) => ({
  search: typeof input.search === 'string' ? input.search.slice(0, 200) : '',
  page: positiveId(input.page) ? input.page : 1,
  itemsPerPage: [10, 25, 50].includes(input.itemsPerPage) ? input.itemsPerPage : 10,
})

export const state = () => ({ activePayment: null, loading: false, error: null })
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  startPayment(context, input) {
    return run(context, () => {
      if (!input || !validAmount(input.amountCents) || !validAttemptKey(input.attemptKey)) invalid()
      return this.$axios.post(`${baseUrl}/standalone-payments`, {
        amountCents: input.amountCents, attemptKey: input.attemptKey,
      }, config())
    }, validStandalonePayment, true)
  },
  refreshPayment(context, id) {
    return run(context, () => this.$axios.get(`${baseUrl}/standalone-payments/${requiredId(id)}`, config()),
      payment => validStandalonePayment(payment) && payment.id === id, true)
  },
  getPayment(context, id) {
    return run(context, () => this.$axios.get(`${baseUrl}/standalone-payments/${requiredId(id)}`, config()),
      payment => validStandalonePayment(payment) && payment.id === id)
  },
  cancelPayment(context, id) {
    return run(context, () => this.$axios.post(`${baseUrl}/standalone-payments/${requiredId(id)}/cancel`, {}, config()),
      payment => validStandalonePayment(payment) && payment.id === id, true)
  },
  getAttachments(context, id) {
    return run(context, () => this.$axios.get(`${baseUrl}/standalone-payments/${requiredId(id)}/attachments`, config()), attachmentResultFor(id))
  },
  searchCandidates(context, input = {}) {
    return run(context, () => this.$axios.get(`${baseUrl}/standalone-payments/attachment-candidates`, {
      ...config(), params: { ...pageParams(input), includeActive: true },
    }), result => Boolean(result && Number.isSafeInteger(result.total) && result.total >= 0 &&
      Array.isArray(result.items) && result.items.every(item => validSource(item) &&
        typeof item.orderNumber === 'string' && Number.isSafeInteger(item.amountCents) && item.amountCents >= 0)))
  },
  addAttachments(context, input) {
    const id = input && input.id
    return run(context, () => {
      requiredId(id)
      const ids = input.archiveIds === undefined ? [] : input.archiveIds
      const orderIds = input.orderIds === undefined ? [] : input.orderIds
      if (![ids, orderIds].every(values => Array.isArray(values) && values.every(positiveId) && new Set(values).size === values.length) || ids.length + orderIds.length < 1 || ids.length + orderIds.length > 50) invalid()
      return this.$axios.post(`${baseUrl}/standalone-payments/${id}/attachments`, { archiveIds: ids, ...(orderIds.length && { orderIds }) }, config())
    }, attachmentResultFor(id))
  },
  removeAttachment(context, input) {
    const id = input && input.id
    return run(context, () => this.$axios.delete(
      `${baseUrl}/standalone-payments/${requiredId(id)}/attachments/${input.orderId === undefined ? requiredId(input.archiveId) : `orders/${requiredId(input.orderId)}`}`, config()
    ), attachmentResultFor(id))
  },
  resetSession({ state, dispatch }) {
    const request = metadata(state)
    request.session += 1
    request.payment += 1
    request.active = 0
    dispatch('set/activePayment', null)
    dispatch('set/error', null)
    dispatch('set/loading', false)
  },
}
