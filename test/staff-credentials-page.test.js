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
assert.match(page, /v-model="form\.pin"/)
assert.match(page, /PIN a 4 chiffres/)
assert.match(page, /regenerateLoginId/)
assert.match(page, /const isCreating = !this\.isEditing/)
assert.match(store, /provisionCredentials/)
assert.match(store, /staff-credentials/)

console.log('staff credentials page tests passed')
