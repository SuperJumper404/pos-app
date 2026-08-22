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

const isStaffAccess = (access) => ROLE_OPTIONS.some(
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
  if (isPrimaryAdmin) return true
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
    item.to && canAccessModule(
      access,
      item.moduleKey,
      modulePermissions,
      isPrimaryAdmin,
      item.legacyModuleKey
    )
  )
)

module.exports = {
  ACCESS,
  ROLE_OPTIONS,
  MODULE_OPTIONS,
  STAFF_MODULE_KEYS,
  canAccessModule,
  getRoleModuleDefaults,
  getAccessibleNavigationItems,
  getRoleLabel,
  isStaffAccess,
  isTableQrAccess,
}
