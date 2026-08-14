const kioskAccess = typeof require === 'function'
  ? require('../helpers/kioskAccess')
  : {
      isKioskOnlyUser: () => false,
      isKioskRoute: () => false,
    }

const {
  isKioskOnlyUser,
  isKioskRoute,
} = kioskAccess

export default function ({ store, redirect, route, router }) {
  if (!store.state.authenticated) {
    return redirect('/login')
  }

  const currentUser = store.state.users.user || {}
  if (isKioskOnlyUser(currentUser) && !isKioskRoute(route)) {
    return redirect('/borne')
  }

  const allowedPaths = ['/menus', '/ordersStatuses', '/login', '/cart']
  const allowedPathName = ['orders-detail-id']
  const normalizedPath =
    route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path

  const isClientAccess =
    currentUser.access === 2 || currentUser.access === 3

  if (
    isClientAccess &&
    !allowedPaths.includes(normalizedPath) &&
    !allowedPathName.includes(route.name)
  ) {
    return redirect('/menus')
  }
}
