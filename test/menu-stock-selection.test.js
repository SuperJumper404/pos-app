const assert = require('assert')
const fs = require('fs')

const source = fs.readFileSync('pages/menus.vue', 'utf8')

assert.match(source, /const productTracksStock = \(product/)
assert.match(
  source,
  /if \(productTracksStock\(params\) && Number\(params\.stock\) < 1\)/
)

console.log('menu stock selection tests passed')
