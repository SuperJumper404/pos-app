const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../components/forms.vue'),
  'utf8'
)

assert.ok(
  !source.includes('this.$route.query.username'),
  'login form must not read username from query params'
)
assert.ok(
  !source.includes('this.$route.query.password'),
  'login form must not read password from query params'
)
assert.ok(
  !source.includes('await this.sumitforms()'),
  'login form must not auto-submit from mounted query params'
)

console.log('login query credential tests passed')
