const QR_SESSION_SUBJECT = 'service_point'

const decodeBase64Url = (value) => {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8')
    }
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    )
  } catch (error) {
    return null
  }
}

const getTokenExpiresAt = (token) => {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]) || '{}')
    const expiresAt = Number(payload.exp)
    return Number.isFinite(expiresAt) ? expiresAt * 1000 : null
  } catch (error) {
    return null
  }
}

const isTokenExpired = (token, now = Date.now()) => {
  if (!token) return true
  const expiresAt = getTokenExpiresAt(token)
  return expiresAt === null || expiresAt <= now
}

const isQrSession = (user = {}) =>
  user.session_subject === QR_SESSION_SUBJECT

const clearStoredAuth = (storage, { preserveTableAccessToken = true } = {}) => {
  if (!storage) return

  ;[
    'idUser',
    'access',
    'token',
    'shopid',
    'module_permissions',
    'is_primary_admin',
    'session_subject',
    'service_point_id',
    'service_point_name',
    'order_source',
  ].forEach((key) => storage.removeItem(key))

  if (!preserveTableAccessToken) storage.removeItem('table_access_token')
}

module.exports = {
  QR_SESSION_SUBJECT,
  clearStoredAuth,
  getTokenExpiresAt,
  isQrSession,
  isTokenExpired,
}
