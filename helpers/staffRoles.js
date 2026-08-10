const ACCESS = {
  ADMIN: 0,
  CASHIER: 1,
  TABLE_QR: 2,
  CLICK_AND_COLLECT: 3,
  SERVER: 4,
  KITCHEN: 5,
}

const ROLE_OPTIONS = [
  { text: 'Admin', value: ACCESS.ADMIN },
  { text: 'Caissier', value: ACCESS.CASHIER },
  { text: 'Serveur', value: ACCESS.SERVER },
  { text: 'Cuisine', value: ACCESS.KITCHEN },
]

const ROLE_LABELS = {
  [ACCESS.ADMIN]: 'Admin',
  [ACCESS.CASHIER]: 'Caissier',
  [ACCESS.TABLE_QR]: 'Table QR',
  [ACCESS.CLICK_AND_COLLECT]: 'Click-and-Collect',
  [ACCESS.SERVER]: 'Serveur',
  [ACCESS.KITCHEN]: 'Cuisine',
}

const MODULES_BY_ACCESS = {
  [ACCESS.ADMIN]: new Set([
    'home',
    'products',
    'menus',
    'orders',
    'cashregister',
    'history',
    'tables',
    'settings',
    'website',
    'staff',
  ]),
  [ACCESS.CASHIER]: new Set(['menus', 'orders', 'cashregister', 'history']),
  [ACCESS.TABLE_QR]: new Set(['menus', 'cart']),
  [ACCESS.CLICK_AND_COLLECT]: new Set(['menus', 'cart']),
  [ACCESS.SERVER]: new Set(['menus', 'orders', 'cart']),
  [ACCESS.KITCHEN]: new Set(['orders']),
}

const isStaffAccess = (access) => ROLE_OPTIONS.some(
  (role) => role.value === Number(access)
)

const isTableQrAccess = (access) => Number(access) === ACCESS.TABLE_QR

const getRoleLabel = (access) => ROLE_LABELS[Number(access)] || 'Inconnu'

const canAccessModule = (access, moduleKey) => {
  const modules = MODULES_BY_ACCESS[Number(access)]
  return Boolean(modules && modules.has(moduleKey))
}

const getAccessibleNavigationItems = (access, items = []) => items.filter(
  (item) => item.name === 'logout' || (
    item.to && canAccessModule(access, item.moduleKey)
  )
)

module.exports = {
  ACCESS,
  ROLE_OPTIONS,
  canAccessModule,
  getAccessibleNavigationItems,
  getRoleLabel,
  isStaffAccess,
  isTableQrAccess,
}
