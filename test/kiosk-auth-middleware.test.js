const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  getKioskHomePath,
  isKioskOnlyUser,
  isKioskRoute,
} = require(path.join(root, 'helpers', 'kioskAccess.js'))

assert.strictEqual(getKioskHomePath(), '/borne')
assert.strictEqual(
  isKioskOnlyUser({
    access: 1,
    module_permissions: ['borne'],
    is_primary_admin: false,
  }),
  true,
  'only borne permission must be kiosk-only'
)
assert.strictEqual(
  isKioskOnlyUser({
    access: 1,
    module_permissions: ['borne', 'orders'],
    is_primary_admin: false,
  }),
  false,
  'mixed permissions are not kiosk-only'
)
assert.strictEqual(
  isKioskOnlyUser({
    access: 0,
    module_permissions: ['borne'],
    is_primary_admin: true,
  }),
  false,
  'primary admin is never kiosk-only'
)
assert.strictEqual(isKioskRoute({ path: '/borne', name: 'borne' }), true)
assert.strictEqual(isKioskRoute({ path: '/borne/', name: 'borne' }), true)
assert.strictEqual(isKioskRoute({ path: '/orders', name: 'orders' }), false)

const middlewareSource = fs.readFileSync(
  path.join(root, 'middleware', 'auth.js'),
  'utf8'
)
assert.match(middlewareSource, /isKioskOnlyUser/)
assert.match(middlewareSource, /isKioskRoute/)
assert.match(middlewareSource, /redirect\('\/borne'\)/)

const homeSource = fs.readFileSync(path.join(root, 'pages', 'index.vue'), 'utf8')
assert.match(homeSource, /isKioskOnlyUser/)
assert.match(homeSource, /this\.\$router\.replace\('\/borne'\)/)

console.log('kiosk auth middleware tests passed')
