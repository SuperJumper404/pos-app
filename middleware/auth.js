export default function ({ store, redirect, route, router }) {
  if (!store.state.authenticated) {
    return redirect('/login')
  }

  const allowedPaths = ['/menus', '/ordersStatuses', '/login', '/cart']
  const allowedPathName = ['orders-detail-id']
  const normalizedPath =
    route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path

  const isClientAccess =
    store.state.users.user.access === 2 || store.state.users.user.access === 3

  if (
    isClientAccess &&
    !allowedPaths.includes(normalizedPath) &&
    !allowedPathName.includes(route.name)
  ) {
    return redirect('/menus')
  }
}
