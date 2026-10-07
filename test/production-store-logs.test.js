const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const storeSource = fs.readFileSync(path.join(root, 'store', 'index.js'), 'utf8')
const packageJson = require('../package.json')

assert.doesNotMatch(
  storeSource,
  /console\.log\s*\(/,
  'root store must not print environment config before the console-log toggle plugin is installed'
)
assert.match(packageJson.scripts.test, /test\/production-store-logs\.test\.js/)

console.log('production store log tests passed')
