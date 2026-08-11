const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../components/forms.vue'),
  'utf8'
)

assert.match(source, /Connexion caisse/)
assert.match(source, /Connexion admin/)
assert.match(source, /staff_login_id/)
assert.match(source, /PIN a 4 chiffres/)
assert.match(source, /postLogin[\s\S]*staff_login_id/)
assert.doesNotMatch(source, /this\.\$route\.query\.(username|password|pin)/)

console.log('staff PIN login form tests passed')
