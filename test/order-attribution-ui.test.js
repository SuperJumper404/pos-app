const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
for (const file of [
  'pages/orders/index.vue',
  'pages/orders/detail/_id.vue',
  'pages/history/index.vue',
]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  assert.match(source, /Prise par/)
  assert.match(source, /Preparee par/)
  assert.match(source, /Non attribuee/)
}

console.log('order attribution UI tests passed')
