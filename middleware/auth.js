export default function ({ store, redirect, route, router }) {
  console.log('Route path', route)
  console.log('Access', store.state)
  if (!store.state.authenticated) {
    return redirect('/login')
  }

  const allowedPaths = ['/menus', '/ordersStatuses', '/login', '/cart']
  const allowedPathName = ['orders-detail-id']

  if (
    store.state.users.user.access === 2 &&
    store.state.users.user.access === 3 &&
    !allowedPaths.includes(route.path) &&
    !allowedPathName.includes(route.name)
  ) {
    return redirect('/menus')
  }
}
