const PERSISTED_STATE_TTL = 24 * 60 * 60 * 1000

const sanitizePersistedState = (state) => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return state

  const nextState = { ...state }
  delete nextState.staticURL
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
