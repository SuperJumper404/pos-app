import authenticate from '@/middleware/auth'
const { isCourierUser, isCourierRoute, isPublicDeliveryTracking } = require('../helpers/staffRoles')

export default async function (context) {
  const { store, route, redirect } = context
  if (typeof store.dispatch === 'function') await store.dispatch('courier/initialize')
  if (isPublicDeliveryTracking(route)) return
  if (!store.state.authenticated && isCourierRoute(route)) {
    await authenticate(context)
    if (!store.state.authenticated) return
  }
  const user = store.state.users && store.state.users.user
  if (isCourierRoute(route) && !isCourierUser(user)) return redirect('/login')
  if (isCourierUser(user) && !isCourierRoute(route)) return redirect('/livreur')
}
