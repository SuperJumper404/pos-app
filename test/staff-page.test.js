const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pagePath = path.join(root, 'pages', 'staff', 'index.vue')
const storePath = path.join(root, 'store', 'staff.js')

assert.strictEqual(
  fs.existsSync(pagePath),
  true,
  'the Staff / Equipe page must exist'
)
assert.strictEqual(
  fs.existsSync(storePath),
  true,
  'the staff store must exist'
)

const page = fs.readFileSync(pagePath, 'utf8')
const store = fs.readFileSync(storePath, 'utf8')
const tables = fs.readFileSync(path.join(root, 'pages', 'tables', 'index.vue'), 'utf8')

assert.match(page, /ROLE_OPTIONS/)
assert.match(page, /v-model="form\.access"/)
assert.match(page, /Ajouter un utilisateur/)
assert.match(page, /form\.pin/)
assert.doesNotMatch(page, /E-mail requis/)
assert.match(store, /getAll[\s\S]*?\/users/)
assert.match(store, /create[\s\S]*?\/register/)
assert.match(store, /update[\s\S]*?\/user\/\$\{id\}/)
assert.match(store, /remove[\s\S]*?\/user\/\$\{id\}/)
assert.match(tables, /Number\(x\.access\)\s*===\s*2/)

console.log('staff page tests passed')
