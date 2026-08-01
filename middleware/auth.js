export default function ({ store, redirect, route, router }) {
  console.log('Route path', route)
  console.log('Access', store.state)
  if (!store.state.authenticated) {
    return redirect('/login')
  }

  const allowedPaths = ['/menus', '/ordersStatuses', '/login', '/cart']
  const allowedPathName = ['orders-detail-id']

  const isClientAccess =
    store.state.users.user.access === 2 || store.state.users.user.access === 3

  if (
    isClientAccess &&
    !allowedPaths.includes(route.path) &&
    !allowedPathName.includes(route.name)
  ) {
    return redirect('/menus')
  }
}
