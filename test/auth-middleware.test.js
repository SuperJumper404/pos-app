/* eslint-disable no-new-func */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../middleware/auth.js'), 'utf8')
const executable = source
  .replace(/export default function/, 'function authMiddleware')
  .concat('\nreturn authMiddleware\n')

const authMiddleware = new Function(executable)()

const run = ({ authenticated, access, path, name }) => {
  const redirects = []
  authMiddleware({
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

assert.deepStrictEqual(
  run({ authenticated: false, access: null, path: '/', name: 'index' }),
  ['/login']
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 2, path: '/settings', name: 'settings' }),
  ['/menus']
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 2, path: '/menus', name: 'menus' }),
  []
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 2, path: '/menus/', name: 'menus' }),
  []
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 3, path: '/tables', name: 'tables' }),
  ['/menus']
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 0, path: '/settings', name: 'settings' }),
  []
)

console.log('auth middleware tests passed')
