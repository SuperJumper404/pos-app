/* eslint-disable no-new-func */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../middleware/auth.js'), 'utf8')
const executable = source
  .replace(/export default (?:async )?function/, 'async function authMiddleware')
  .concat('\nreturn authMiddleware\n')

const authMiddleware = new Function(executable)()

assert.ok(source.includes("postTableAccess"))
assert.ok(source.includes("await store.dispatch('users/postTableAccess', storedQrToken)"))
assert.ok(source.includes("users/ensureAuthenticatedStorage"))

const run = async ({ authenticated, access, path, name }) => {
  const redirects = []
  await authMiddleware({
    store: {
      state: {
        authenticated,
        users: {
          user: { access },
        },
      },
    },
    redirect(target) {
      redirects.push(target)
    },
    route: { path, name },
    router: {},
  })
  return redirects
}

;(async () => {
assert.deepStrictEqual(
  await run({ authenticated: false, access: null, path: '/', name: 'index' }),
  ['/login']
)

assert.deepStrictEqual(
  await run({ authenticated: true, access: 2, path: '/settings', name: 'settings' }),
  ['/menus']
)

assert.deepStrictEqual(
  await run({ authenticated: true, access: 2, path: '/menus', name: 'menus' }),
  []
)

assert.deepStrictEqual(
  await run({
    authenticated: true,
    access: 2,
    path: '/caisse/menu',
    name: 'caisse-menu',
  }),
  ['/menus']
)

assert.deepStrictEqual(
  await run({ authenticated: true, access: 2, path: '/menus/', name: 'menus' }),
  []
)

assert.deepStrictEqual(
  await run({ authenticated: true, access: 3, path: '/tables', name: 'tables' }),
  ['/menus']
)

assert.deepStrictEqual(
  await run({ authenticated: true, access: 0, path: '/settings', name: 'settings' }),
  []
)

console.log('auth middleware tests passed')
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
