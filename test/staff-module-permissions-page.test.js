const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const page = fs.readFileSync(
  path.join(root, 'pages', 'staff', 'index.vue'),
  'utf8'
)
const store = fs.readFileSync(path.join(root, 'store', 'staff.js'), 'utf8')

assert.match(page, /MODULE_OPTIONS/)
assert.match(page, /applyRolePreset/)
assert.match(page, /module_permissions/)
assert.match(page, /readonly/)
assert.match(page, /showCredentialPin \? 'text' : 'password'/)
assert.match(store, /module_permissions/)
assert.doesNotMatch(store, /regenerate_login_id/)

console.log('staff module permission page tests passed')
