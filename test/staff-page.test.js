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
assert.match(page, /\{\{ isPrimaryAdmin\(item\) \? 'Admin principal' : roleLabel\(item\.access\) \}\}/)
assert.match(page, /v-model="form\.access"/)
assert.match(page, /Ajouter un utilisateur/)
assert.match(page, /v-checkbox[\s\S]*?form\.module_permissions/)
assert.match(page, /v-if="isEditing"[\s\S]*?:value="form\.staff_login_id"/)
assert.match(page, /label="ID caisse"[\s\S]*?readonly/)
assert.match(page, /v-if="!isPrimaryAdmin\(item\)"[\s\S]*?mdi-key-variant/)
assert.match(page, /v-if="!isPrimaryAdmin\(item\)"[\s\S]*?mdi-delete/)
assert.match(page, /v-if="!isEditingPrimaryAdmin"/)
assert.match(page, /isEditingPrimaryAdmin\(\)/)
assert.match(page, /is_primary_admin: this\.isPrimaryAdmin\(user\)/)
assert.match(page, /const data = this\.isEditingPrimaryAdmin[\s\S]*?username: this\.form\.username/)
assert.doesNotMatch(page, /label="E-mail"/)
assert.doesNotMatch(page, /form\.email/)
assert.doesNotMatch(page, /form\.phone/)
assert.doesNotMatch(page, /form\.password/)
assert.doesNotMatch(page, /form\.pin/)
assert.doesNotMatch(page, /E-mail requis/)
assert.match(store, /getAll[\s\S]*?\/users/)
assert.match(store, /is_primary_admin/)
assert.doesNotMatch(store, /Number\(user\.is_primary_admin\)\s*!==\s*1/)
assert.match(
  store,
  /sort\(\(first, second\) => Number\(second\.is_primary_admin\) - Number\(first\.is_primary_admin\)\)/
)
assert.match(store, /create[\s\S]*?\/register/)
assert.match(store, /update[\s\S]*?\/user\/\$\{id\}/)
assert.match(store, /remove[\s\S]*?\/user\/\$\{id\}/)
assert.match(tables, /tables\/getAllTables/)
assert.doesNotMatch(tables, /Number\(x\.access\)\s*===\s*2/)

console.log('staff page tests passed')
