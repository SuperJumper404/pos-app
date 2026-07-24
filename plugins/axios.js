export default function ({ $axios, redirect, store, router }) {
  const clearAuth = () => {
    localStorage.removeItem('idUser')
    localStorage.removeItem('access')
    localStorage.removeItem('token')
    localStorage.removeItem('shopid')
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

  $axios.onError((error) => {
    const status = error.response && error.response.status
    const backendMessage =
      error.response && error.response.data && error.response.data.message
    const message = backendMessage || errorMessageByStatus(status)

    if (!error.config || !error.config.skipGlobalErrorNotification) {
      store.dispatch('notifications/error', message)
    }

    if (status === 401) {
      console.log('Store Instance', store)
      store.dispatch('cart/markCheckoutAuthRedirect', true)
      clearAuth()
      //   await store.dispatch('set/user.id', null)
      //   await store.dispatch('set/user.access', null)
      //   await store.dispatch('set/user.token', null)
      //   await store.dispatch('set/alertSuccess', true)
      //   await store.dispatch('set/user.shopid', null)
      //   await router.push('/login')
      redirect('/login')
    }
  })
}
