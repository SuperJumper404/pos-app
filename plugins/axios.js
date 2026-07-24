const {
  parsePersistedState,
  serializePersistedState,
} = require('../helpers/persistedState')

const clearAuthState = (state) => {
  if (!state || typeof state !== 'object') return

  state.authenticated = false
  const user = state.users && state.users.user
  if (!user || typeof user !== 'object') return

  user.id = null
  user.access = null
  user.token = null
  user.shopid = null
}

const isAuthStateCleared = (state) => {
  if (!state || state.authenticated !== false) return false

  const user = state.users && state.users.user
  return (
    !user ||
    (user.id === null &&
      user.access === null &&
      user.token === null &&
      user.shopid === null)
  )
}

const sanitizedAuthSnapshot = (state) => {
  if (!state || typeof state !== 'object') return state

  const users = state.users
  const user = users && users.user
  return {
    ...state,
    authenticated: false,
    ...(users && {
      users: {
        ...users,
        ...(user && {
          user: {
            ...user,
            id: null,
            access: null,
            token: null,
            shopid: null,
          },
        }),
      },
    }),
  }
}

export default function ({ $axios, redirect, store }) {
  const clearAuth = () => {
    localStorage.removeItem('idUser')
    localStorage.removeItem('access')
    localStorage.removeItem('token')
    localStorage.removeItem('shopid')
  }

  const markAuthRedirect = async () => {
    try {
      await store.dispatch('cart/markCheckoutAuthRedirect', true)
    } catch (error) {
      try {
        store.commit('cart/MARK_CHECKOUT_AUTH_REDIRECT', true)
      } catch (commitError) {
        try {
          if (store.state && store.state.cart) {
            store.state.cart.clientOrderAuthRedirect = true
          }
        } catch (stateError) {
          // Persisted auth is still scrubbed below before redirecting.
        }
      }
    }
  }

  const clearStoreAuth = async () => {
    try {
      await store.dispatch('orderEdit/cancel')
    } catch (error) {
      // Authentication cleanup must continue if no edit module is available.
    }

    try {
      await store.dispatch('clearAuthentication')
    } catch (error) {
      // The direct state fallback below still removes the expired session.
    }

    try {
      await store.dispatch('users/clearAuthenticatedUser')
    } catch (error) {
      // The direct state fallback below still removes the expired session.
    }

    if (!isAuthStateCleared(store.state)) {
      try {
        store.commit('CLEAR_AUTHENTICATION_STATE')
        store.commit('users/CLEAR_AUTHENTICATED_USER')
      } catch (error) {
        try {
          clearAuthState(store.state)
        } catch (stateError) {
          // Persisted auth is still scrubbed below before redirecting.
        }
      }
    }
  }

  const persistClearedAuth = () => {
    const persistedState = parsePersistedState(localStorage.getItem('vuex'))
    const stateToPersist = sanitizedAuthSnapshot(store.state || persistedState)

    if (!stateToPersist) {
      localStorage.removeItem('vuex')
      return
    }

    try {
      localStorage.setItem('vuex', serializePersistedState(stateToPersist))
    } catch (error) {
      localStorage.removeItem('vuex')
    }
  }

  const errorMessageByStatus = (status) => {
    const messages = {
      400: 'La demande est invalide.',
      401: 'Session expirée, veuillez vous reconnecter.',
      403: "Vous n'avez pas les droits nécessaires.",
      404: 'Ressource introuvable.',
      422: "L'action demandée est impossible.",
      500: 'Erreur serveur, veuillez réessayer plus tard.',
    }

    return messages[status] || 'Une erreur est survenue.'
  }

  $axios.onError(async (error) => {
    const status = error.response && error.response.status
    const backendMessage =
      error.response && error.response.data && error.response.data.message
    const message = backendMessage || errorMessageByStatus(status)

    if (!error.config || !error.config.skipGlobalErrorNotification) {
      store.dispatch('notifications/error', message)
    }

    if (status === 401) {
      await markAuthRedirect()
      await clearStoreAuth()
      persistClearedAuth()
      clearAuth()
      redirect('/login')
    }
  })
}
