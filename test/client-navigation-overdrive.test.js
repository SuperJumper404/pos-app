const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../layouts/clientside.vue'),
  'utf8'
)
const packageJson = require('../package.json')

assert.match(
  source,
  /class="client-top-bar"/,
  'client layout must expose a polished top bar class'
)
assert.match(
  source,
  /class="client-nav-shell"[\s\S]*?<v-tabs[\s\S]*?class="client-segmented-tabs"/,
  'client layout must wrap menu tabs in a segmented shell'
)
assert.match(
  source,
  /<v-tabs[\s\S]*?hide-slider/,
  'client segmented tabs must hide the default underline'
)
assert.match(
  source,
  /class="client-nav-tab"[\s\S]*?class="client-nav-tab__icon"[\s\S]*?mdi-silverware-clean[\s\S]*?class="client-nav-tab__label"[\s\S]*?Menus/,
  'Menus tab must use the shared segmented tab structure'
)
assert.match(
  source,
  /class="client-nav-tab"[\s\S]*?class="client-nav-tab__icon"[\s\S]*?mdi-order-bool-ascending[\s\S]*?class="client-nav-tab__label"[\s\S]*?Mes commandes/,
  'Mes commandes tab must use the shared segmented tab structure'
)
assert.match(
  source,
  /\.client-top-bar\s*\{[\s\S]*?background:\s*#ffffff\s*!important[\s\S]*?border-bottom:\s*1px solid #e8edf3/,
  'client top bar must use a flat white surface with a soft divider'
)
assert.match(
  source,
  /::v-deep \.client-top-bar \.v-toolbar__content\s*\{[\s\S]*?align-items:\s*center[\s\S]*?padding:\s*5px 12px\s*!important/,
  'client top bar must keep balanced vertical padding'
)
assert.match(
  source,
  /\.client-nav-shell\s*\{[\s\S]*?background:\s*#f8fafc[\s\S]*?border:\s*1px solid #dfe5ee[\s\S]*?border-radius:\s*999px/,
  'client nav shell must look like a restrained segmented control'
)
assert.match(
  source,
  /\.client-nav-shell\s*\{[\s\S]*?margin-bottom:\s*8px/,
  'client nav shell must put the extra breathing room under the chip'
)
assert.match(
  source,
  /\.client-nav-shell\s*\{[\s\S]*?margin-top:\s*8px/,
  'client nav shell must keep a little breathing room above the chip'
)
assert.match(
  source,
  /\.client-nav-shell\s*\{[\s\S]*?padding:\s*4px 4px 8px/,
  'client nav shell must keep extra internal padding at the bottom'
)
assert.match(
  source,
  /\.client-nav-tab\.v-tab--active\s*\{[\s\S]*?background:\s*#1976d2\s*!important[\s\S]*?color:\s*#ffffff\s*!important/,
  'active client nav tab must use the primary action color'
)
assert.match(
  source,
  /@media \(max-width:\s*599px\)[\s\S]*?\.client-nav-shell\s*\{[\s\S]*?width:\s*calc\(100vw - 24px\)/,
  'mobile client nav shell must stay inside the viewport'
)
assert.doesNotMatch(
  source,
  /mdi-logout|@click="logout"|postLogout/,
  'client navigation must not expose a logout action'
)
assert.match(packageJson.scripts.test, /test\/client-navigation-overdrive\.test\.js/)

console.log('client navigation overdrive tests passed')
