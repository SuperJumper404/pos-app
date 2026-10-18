const ACCESS = {
  ADMIN: 0,
  CASHIER: 1,
  TABLE_QR: 2,
  CLICK_AND_COLLECT: 3,
  SERVER: 4,
  KITCHEN: 5,
  COURIER: 6,
}

const ROLE_OPTIONS = [
  { text: 'Admin', value: ACCESS.ADMIN },
  { text: 'Caissier', value: ACCESS.CASHIER },
  { text: 'Serveur', value: ACCESS.SERVER },
  { text: 'Cuisine', value: ACCESS.KITCHEN },
]
const PERSONAL_ROLE_OPTIONS = [...ROLE_OPTIONS, { text: 'Livreur', value: ACCESS.COURIER }]

const ROLE_LABELS = {
  [ACCESS.ADMIN]: 'Admin',
  [ACCESS.CASHIER]: 'Caissier',
  [ACCESS.TABLE_QR]: 'Table QR',
  [ACCESS.CLICK_AND_COLLECT]: 'Click-and-Collect',
  [ACCESS.SERVER]: 'Serveur',
  [ACCESS.KITCHEN]: 'Cuisine',
  [ACCESS.COURIER]: 'Livreur',
}

const STAFF_MODULE_KEYS = [
  'home',
  'orders',
  'cashregister',
  'history',
  'catalog',
  'stocks',
  'tables',
  'reports',
  'website',
  'delivery',
]

const MODULE_OPTIONS = [
  { text: 'Accueil', value: 'home' },
  { text: 'Commandes', value: 'orders' },
  { text: 'Tiroir-caisse', value: 'cashregister' },
  { text: 'Historique', value: 'history' },
  { text: 'Produits et menus', value: 'catalog' },
  { text: 'Stock', value: 'stocks' },
  { text: 'Tables', value: 'tables' },
  { text: 'Rapports', value: 'reports' },
  { text: 'Site web', value: 'website' },
  { text: 'Livraison', value: 'delivery' },
]

const DEFAULT_MODULES_BY_ACCESS = {
  [ACCESS.ADMIN]: STAFF_MODULE_KEYS,
  [ACCESS.CASHIER]: ['orders', 'cashregister', 'history'],
  [ACCESS.TABLE_QR]: ['orders'],
  [ACCESS.CLICK_AND_COLLECT]: ['orders'],
  [ACCESS.SERVER]: ['orders'],
  [ACCESS.KITCHEN]: ['orders'],
}

const LEGACY_MODULES_BY_ACCESS = {
  [ACCESS.ADMIN]: new Set([
    'home',
    'products',
    'menus',
    'orders',
    'cashregister',
    'history',
    'clients',
    'tables',
    'website',
  ]),
  [ACCESS.CASHIER]: new Set(['menus', 'orders', 'cashregister', 'history']),
  [ACCESS.TABLE_QR]: new Set(['menus', 'cart']),
  [ACCESS.CLICK_AND_COLLECT]: new Set(['menus', 'cart']),
  [ACCESS.SERVER]: new Set(['menus', 'orders', 'cart']),
  [ACCESS.KITCHEN]: new Set(['orders']),
}

const MODULE_PERMISSION_BY_NAV_KEY = {
  home: 'home',
  categories: 'catalog',
  products: 'catalog',
  customizations: 'catalog',
  menus: 'orders',
  cart: 'orders',
  orders: 'orders',
  cashregister: 'cashregister',
  history: 'history',
  clients: 'history',
  stocks: 'stocks',
  tables: 'tables',
  reports: 'reports',
  website: 'website',
}

const PRIMARY_ADMIN_MODULES = new Set(['staff', 'settings'])

const isStaffAccess = (access) => PERSONAL_ROLE_OPTIONS.some(
  (role) => role.value === Number(access)
)

const isTableQrAccess = (access) => Number(access) === ACCESS.TABLE_QR

const getRoleLabel = (access) => ROLE_LABELS[Number(access)] || 'Inconnu'

const getRoleModuleDefaults = (access) => [
  ...(DEFAULT_MODULES_BY_ACCESS[Number(access)] || []),
]

const canAccessModule = (
  access,
  moduleKey,
  modulePermissions = null,
  isPrimaryAdmin = false,
  legacyModuleKey = moduleKey
) => {
  if (Number(access) === ACCESS.COURIER) return false
  if (moduleKey === 'delivery') return access != null && (Number(access) === ACCESS.ADMIN ||
    (Number(access) === ACCESS.CASHIER && Array.isArray(modulePermissions) && modulePermissions.includes('delivery')))
  if (access == null) return false
  if (isPrimaryAdmin && Number(access) === ACCESS.ADMIN) return true
  if (PRIMARY_ADMIN_MODULES.has(moduleKey)) return false

  if (!Array.isArray(modulePermissions)) {
    const legacyModules = LEGACY_MODULES_BY_ACCESS[Number(access)]
    return Boolean(legacyModules && legacyModules.has(legacyModuleKey))
  }

  const permissionKey = MODULE_PERMISSION_BY_NAV_KEY[moduleKey] || moduleKey
  if (!STAFF_MODULE_KEYS.includes(permissionKey)) return false
  return modulePermissions.includes(permissionKey)
}

const getAccessibleNavigationItems = (
  access,
  items = [],
  modulePermissions = null,
  isPrimaryAdmin = false
) => items.filter(
  (item) => item.name === 'logout' || (
    !item.hiddenFromMainNavigation &&
    !['categories', 'customizations', 'stocks'].includes(item.moduleKey) &&
    item.to && canAccessModule(
      access,
      item.moduleKey,
      modulePermissions,
      isPrimaryAdmin,
      item.legacyModuleKey
    )
  )
)

const isDeliveryAdmin = user => Boolean(user && user.id && user.shopid && user.access != null &&
  user.session_subject !== 'service_point' && user.session_subject !== 'customer' && Number(user.status) !== 0 && Number(user.access) === ACCESS.ADMIN)
const canOperateDelivery = user => Boolean(user && user.id && user.shopid && user.access != null &&
  user.session_subject !== 'service_point' && user.session_subject !== 'customer' && Number(user.status) !== 0 &&
  canAccessModule(user.access, 'delivery', user.module_permissions))

const isCourierUser = user => Boolean(user && user.id && user.shopid && user.access != null &&
  user.session_subject === 'staff' && Number(user.status) !== 0 && Number(user.access) === ACCESS.COURIER)
const isCourierRoute = route => /^\/livreur(?:\/|$)/i.test(String(route && route.path || ''))
const isPublicDeliveryTracking = route => /^\/livraison\/suivi(?:\/|$)/i.test(String(route && route.path || ''))

module.exports = {
  ACCESS,
  ROLE_OPTIONS,
  PERSONAL_ROLE_OPTIONS,
  MODULE_OPTIONS,
  STAFF_MODULE_KEYS,
  canAccessModule,
  getRoleModuleDefaults,
  getAccessibleNavigationItems,
  getRoleLabel,
  isStaffAccess,
  isTableQrAccess,
  canOperateDelivery,
  isDeliveryAdmin,
  isCourierUser,
  isCourierRoute,
  isPublicDeliveryTracking,
}
