const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const configSource = fs.readFileSync(path.join(root, 'nuxt.config.js'), 'utf8')
const packageJson = require('../package.json')

assert.match(
  configSource,
  /splitChunks:\s*\{[\s\S]*?layouts:\s*false,[\s\S]*?pages:\s*false,[\s\S]*?commons:\s*false,[\s\S]*?\}/,
  'Nuxt splitChunks must keep the previous bundled build behavior'
)
assert.match(packageJson.scripts.test, /test\/nuxt-build-chunks\.test\.js/)

console.log('nuxt build chunks tests passed')
