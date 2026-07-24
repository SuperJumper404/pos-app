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

console.log('admin navigation tests passed')
