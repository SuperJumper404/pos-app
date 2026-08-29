/* eslint-disable no-new-func, no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  canAccessKiosk,
  getKioskHomePath,
  isKioskOnlyUser,
  isKioskRoute,
} = require(path.join(root, 'helpers', 'kioskAccess.js'))

assert.strictEqual(getKioskHomePath(), '/borne')
assert.strictEqual(
  canAccessKiosk({
    access: 1,
    module_permissions: ['borne'],
    is_primary_admin: false,
  }),
  false
)
assert.strictEqual(
  canAccessKiosk({
    access: 2,
    session_subject: 'service_point',
    source: 'borne',
  }),
  true
)
assert.strictEqual(
  canAccessKiosk({
    access: 1,
    module_permissions: ['orders'],
    is_primary_admin: false,
  }),
  false
)
assert.strictEqual(
  isKioskOnlyUser({
    access: 2,
    session_subject: 'service_point',
    source: 'borne',
  }),
  true,
  'borne service point sessions must be kiosk-only'
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
assert.match(middlewareSource, /canAccessKiosk/)
assert.match(middlewareSource, /redirect\('\/borne'\)/)

const executableMiddleware = middlewareSource
  .replace(/export default function/, 'function authMiddleware')
  .concat('\nreturn authMiddleware\n')
const authMiddleware = new Function('require', executableMiddleware)(require)
const runMiddleware = (user, route) => {
  const redirects = []
  authMiddleware({
    store: {
      state: {
        authenticated: true,
        users: { user },
      },
    },
    redirect(target) {
      redirects.push(target)
    },
    route,
    router: {},
  })
  return redirects
}

assert.deepStrictEqual(
  runMiddleware(
    { access: 1, module_permissions: ['orders'], is_primary_admin: false },
    { path: '/borne', name: 'borne' }
  ),
  ['/']
)
assert.deepStrictEqual(
  runMiddleware(
    { access: 1, module_permissions: ['borne'], is_primary_admin: false },
    { path: '/borne', name: 'borne' }
  ),
  ['/']
)
assert.deepStrictEqual(
  runMiddleware(
    { access: 2, session_subject: 'service_point', source: 'borne' },
    { path: '/borne', name: 'borne' }
  ),
  []
)
assert.deepStrictEqual(
  runMiddleware(
    { access: 0, module_permissions: [], is_primary_admin: true },
    { path: '/borne', name: 'borne' }
  ),
  []
)
assert.deepStrictEqual(
  runMiddleware(
    { access: 2, module_permissions: ['borne'], is_primary_admin: false },
    { path: '/borne', name: 'borne' }
  ),
  ['/menus']
)

const homeSource = fs.readFileSync(path.join(root, 'pages', 'index.vue'), 'utf8')
assert.match(homeSource, /isKioskOnlyUser/)
assert.match(homeSource, /this\.\$router\.replace\('\/borne'\)/)

console.log('kiosk auth middleware tests passed')
