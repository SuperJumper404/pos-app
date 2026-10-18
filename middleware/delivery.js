import authenticate from '@/middleware/auth'
const { canOperateDelivery, isDeliveryAdmin } = require('../helpers/staffRoles')

export default async function (context) {
  const { store, route, redirect } = context
  const path = (route.path || '').replace(/\/+$/, '').toLowerCase() || '/'
  if (!['/livraison', '/settings', '/staff'].includes(path)) return
  if (!store.state.authenticated) {
    await authenticate(context)
    if (!store.state.authenticated) return
  }
  const user = store.state.users && store.state.users.user
  if (path === '/livraison' && !canOperateDelivery(user)) return redirect('/login')
  if (['/settings', '/staff'].includes(path) && !isDeliveryAdmin(user)) return redirect('/login')
}
