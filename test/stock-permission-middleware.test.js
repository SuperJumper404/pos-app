/* eslint-disable no-new-func */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '..', 'middleware', 'stocks.js'),
  'utf8'
)
const executable = source
  .replace(/export default function/, 'function stocksMiddleware')
  .concat('\nreturn stocksMiddleware\n')
const stocksMiddleware = new Function(executable)()

const run = (user) => {
  const redirects = []
  stocksMiddleware({
    store: { state: { users: { user } } },
    redirect: (target) => redirects.push(target),
  })
  return redirects
}

assert.deepStrictEqual(run({ access: 0, session_subject: 'staff' }), [])
assert.deepStrictEqual(
  run({ access: 1, session_subject: 'staff', module_permissions: ['stocks'] }),
  []
)
assert.deepStrictEqual(
  run({ access: 1, session_subject: 'staff', module_permissions: ['orders'] }),
  ['/']
)
assert.deepStrictEqual(
  run({ access: 2, session_subject: 'staff', module_permissions: ['stocks'] }),
  ['/menus']
)
assert.deepStrictEqual(
  run({ access: 1, session_subject: 'service_point', module_permissions: ['stocks'] }),
  ['/menus']
)

for (const file of ['index.vue', '_id.vue', 'newstock.vue']) {
  const page = fs.readFileSync(path.join(__dirname, '..', 'pages', 'stocks', file), 'utf8')
  assert.match(page, /middleware:\s*\['auth',\s*'stocks'\]/)
}

console.log('stock permission middleware tests passed')
