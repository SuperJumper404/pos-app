const { isStaffAccess } = require('./staffRoles')

const KIOSK_MODULE = 'borne'
const KIOSK_HOME_PATH = '/borne'

const normalizePath = (path = '') =>
  path.length > 1 ? String(path).replace(/\/+$/, '') : String(path)

const isKioskOnlyUser = (user = {}) => {
  if (!isStaffAccess(user.access)) return false
  if (user.is_primary_admin) return false
  if (!Array.isArray(user.module_permissions)) return false

  return (
    user.module_permissions.length === 1 &&
    user.module_permissions[0] === KIOSK_MODULE
  )
}

const isKioskRoute = (route = {}) =>
  normalizePath(route.path || '') === KIOSK_HOME_PATH || route.name === 'borne'

const getKioskHomePath = () => KIOSK_HOME_PATH

module.exports = {
  KIOSK_MODULE,
  getKioskHomePath,
  isKioskOnlyUser,
  isKioskRoute,
}
