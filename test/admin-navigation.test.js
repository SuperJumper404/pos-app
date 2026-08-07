const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)
const productsSource = fs.readFileSync(
  path.join(root, 'pages', 'products', 'index.vue'),
  'utf8'
)
const defaultLayoutSource = fs.readFileSync(
  path.join(root, 'layouts', 'default.vue'),
  'utf8'
)
const packageJson = require('../package.json')

assert.match(
  dashboardSource,
  /title:\s*['"](?:Étapes produits|Ã‰tapes produits)['"][\s\S]*?routeName:\s*['"]customizations['"][\s\S]*?isAdmin:\s*false/,
  'Étapes produits doit rester connu du layout sans apparaître dans le menu'
)
assert.match(
  productsSource,
  /Gérer les étapes/,
  'la page Produits doit proposer le bouton Gérer les étapes'
)
assert.match(
  productsSource,
  /openCustomizationSteps\(\)[\s\S]*?this\.\$router\.push\(['"]\/customizations['"]\)/,
  'le bouton doit ouvrir la page des étapes produits'
)
assert.match(packageJson.scripts.test, /test\/admin-navigation\.test\.js/)
assert.match(packageJson.scripts.test, /test\/order-notifications\.test\.js/)
assert.match(
  defaultLayoutSource,
  /@click\.stop="miniVariant = !miniVariant"/,
  'the drawer toggle must collapse the sidebar to mini icon mode'
)
assert.match(
  defaultLayoutSource,
  /<v-list-item-content\s+v-if="!miniVariant">/,
  'mini sidebar mode must hide navigation labels'
)
assert.match(
  defaultLayoutSource,
  /v-if="!miniVariant && item\.routeName === 'orders' && pendingOrderCount > 0"/,
  'mini sidebar mode must hide the text badge area and keep only icons'
)

console.log('admin navigation tests passed')
