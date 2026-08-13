const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const page = fs.readFileSync(
  path.join(root, 'pages', 'staff', 'index.vue'),
  'utf8'
)
const store = fs.readFileSync(path.join(root, 'store', 'staff.js'), 'utf8')

assert.match(page, /text: 'ID caisse', value: 'staff_login_id'/)
assert.match(page, /staff_pin/)
assert.match(page, /showCredentialPin/)
assert.match(page, /mdi-eye/)
assert.doesNotMatch(page, /regenerateLoginId/)
assert.doesNotMatch(page, /credentialsPin/)
assert.match(page, /const isCreating = !this\.isEditing/)
assert.match(store, /provisionCredentials/)
assert.match(store, /staff-credentials/)

console.log('staff credentials page tests passed')
