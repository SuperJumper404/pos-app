const {
  clearStoredAuth,
  getTokenExpiresAt,
  isQrSession,
  isTokenExpired,
} = require('../helpers/sessionAuth')

export default ({ store, redirect }) => {
  let expiryTimer = null

  const expireSession = async () => {
    const user = (store.state.users && store.state.users.user) || {}
    const qrSession = isQrSession(user) || Boolean(localStorage.getItem('table_access_token'))

    try {
      await store.dispatch('cart/markCheckoutAuthRedirect', true)
      await store.dispatch('clearAuthentication')
      await store.dispatch('users/clearAuthenticatedUser')
    } finally {
      clearStoredAuth(localStorage)
      redirect(qrSession ? '/session-expired' : '/login')
    }
  }

  const scheduleExpiry = () => {
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = null

    const user = (store.state.users && store.state.users.user) || {}
    const token = user.token || localStorage.getItem('token')
    if (!token || isTokenExpired(token)) {
      if (store.state.authenticated) expireSession()
      return
    }

    const expiresAt = getTokenExpiresAt(token)
    if (expiresAt === null) return
    const delay = Math.max(expiresAt - Date.now(), 0)
    expiryTimer = setTimeout(expireSession, delay)
  }

  store.watch(
    () => [
      store.state.authenticated,
      store.state.users && store.state.users.user && store.state.users.user.token,
    ],
    scheduleExpiry,
    { immediate: true }
  )
}
