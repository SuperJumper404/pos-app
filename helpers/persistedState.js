const PERSISTED_STATE_TTL = 24 * 60 * 60 * 1000
const { createHash } = require('crypto')
const { Buffer } = require('buffer')
const recoveryHash = value => /^sha256:[a-f0-9]{64}$/.test(value) ? value : `sha256:${createHash('sha256').update(value).digest('hex')}`
const googleProof = token => {
  try { return JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8')).addressSnapshot?.provider === 'google_places' }
  catch (_) { return false }
}
const persistCart = cart => {
  if (!cart) return cart
  let parsed
  try { parsed = JSON.parse(cart.clientOrderSignature) } catch (_) {}
  // Checkout commits its signature before its payload; sanitize either independently.
  if (![cart.clientOrderPayload?.address_resolution_token, cart.clientOrderPayload?.delivery_quote_token,
    parsed?.addressResolutionToken, parsed?.deliveryQuoteToken].some(googleProof)) return cart
  const payload = cart.clientOrderPayload ? { ...cart.clientOrderPayload } : null
  if (payload) for (const key of ['address_resolution_token', 'delivery_quote_token']) if (typeof payload[key] === 'string') payload[key] = recoveryHash(payload[key])
  let signature = null
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const key of ['addressResolutionToken', 'deliveryQuoteToken']) if (typeof parsed[key] === 'string') parsed[key] = recoveryHash(parsed[key])
    signature = JSON.stringify(parsed)
  }
  return { ...cart, clientOrderPayload: payload, clientOrderSignature: signature }
}

const sanitizePersistedState = (state) => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return state

  const nextState = { ...state }
  delete nextState.staticURL
  delete nextState.stripeTerminal
  delete nextState.customer
  delete nextState.delivery
  delete nextState.courier
  if (nextState.cart) nextState.cart = persistCart(nextState.cart)
  return nextState
}

const isWrappedState = (value) =>
  value &&
  typeof value === 'object' &&
  Object.prototype.hasOwnProperty.call(value, 'expiresAt') &&
  Object.prototype.hasOwnProperty.call(value, 'state')

const serializePersistedState = (state, now = Date.now()) =>
  JSON.stringify({
    expiresAt: now + PERSISTED_STATE_TTL,
    state: sanitizePersistedState(state),
  })

const parsePersistedState = (rawState, now = Date.now()) => {
  if (!rawState) return undefined

  try {
    const savedState = JSON.parse(rawState)

    if (!isWrappedState(savedState)) {
      return sanitizePersistedState(savedState)
    }

    const expiresAt = Number(savedState.expiresAt)
    if (!Number.isFinite(expiresAt) || now > expiresAt) {
      return undefined
    }

    return sanitizePersistedState(savedState.state)
  } catch (error) {
    return undefined
  }
}

module.exports = {
  PERSISTED_STATE_TTL,
  parsePersistedState,
  sanitizePersistedState,
  serializePersistedState,
}
