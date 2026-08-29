const assert = require('assert')
const fs = require('fs')

const source = fs.readFileSync('pages/products/index.vue', 'utf8')

assert.match(
  source,
  /class="product-card__handle"[\s\S]*?mdi-arrow-up[\s\S]*?mdi-arrow-down/,
  'products page must use the shared left reorder handle'
)

assert.match(
  source,
  /grid-template-columns:\s*44px\s+128px\s+minmax\(0,\s*1fr\)/,
  'desktop product cards must reserve the left reorder handle column'
)

assert.match(
  source,
  /\.product-card__handle\s*\{[\s\S]*?border-right:\s*1px solid var\(--se-color-border-soft\)/,
  'product reorder handle must use the standard border-soft divider'
)

assert.doesNotMatch(
  source,
  /\.product-order-buttons\s*\{[\s\S]*?border-radius:\s*var\(--se-radius-pill\)/,
  'products page must not use the old pill reorder controls'
)
