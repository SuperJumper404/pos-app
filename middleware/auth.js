const kioskAccess = typeof require === 'function'
  ? require('../helpers/kioskAccess')
  : {
      canAccessKiosk: () => false,
      isKioskOnlyUser: () => false,
      isKioskRoute: () => false,
    }

const {
  canAccessKiosk,
  isKioskOnlyUser,
  isKioskRoute,
} = kioskAccess

export default function ({ store, redirect, route, router }) {
  if (!store.state.authenticated) {
    return redirect('/login')
  }

  const currentUser = store.state.users.user || {}
  if (isKioskRoute(route) && !canAccessKiosk(currentUser)) {
    return redirect([2, 3].includes(Number(currentUser.access)) ? '/menus' : '/')
  }

  if (isKioskOnlyUser(currentUser) && !isKioskRoute(route)) {
    return redirect('/borne')
  }

  const allowedPaths = ['/menus', '/ordersStatuses', '/login', '/cart']
  const allowedPathName = ['orders-detail-id']
  const normalizedPath =
    route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path

  const isServicePointSession = currentUser.session_subject === 'service_point'
  const isClientAccess =
    !isServicePointSession && (currentUser.access === 2 || currentUser.access === 3)

  if (
    isClientAccess &&
    !allowedPaths.includes(normalizedPath) &&
    !allowedPathName.includes(route.name)
  ) {
    return redirect('/menus')
  }
}
