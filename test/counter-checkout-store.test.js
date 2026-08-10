const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const cartStoreSource = fs.readFileSync(path.join(root, 'store', 'cart.js'), 'utf8')
const packageJson = require('../package.json')

assert.match(
  cartStoreSource,
  /buildCounterPayBeforePayment/,
  'cart store must use the shared counter pay-before helper'
)
assert.match(
  cartStoreSource,
  /checkoutCounterPayBefore\(\{ dispatch \}, params = \{\}\)[\s\S]*dispatch\('checkoutOrder', \{[\s\S]*payment: buildCounterPayBeforePayment\(params\.payment\),[\s\S]*stripe: false/,
  'checkoutCounterPayBefore must submit through checkoutOrder with a paid counter payment mode'
)
assert.match(
  packageJson.scripts.test,
  /test\/counter-checkout-store\.test\.js/,
  'npm test must include the counter checkout store test'
)

console.log('counter checkout store tests passed')
