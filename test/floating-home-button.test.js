const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const defaultLayoutSource = fs.readFileSync(
  path.join(root, 'layouts', 'default.vue'),
  'utf8'
)
const packageJson = require('../package.json')

assert.match(
  defaultLayoutSource,
  /v-if="showFloatingHomeButton"/,
  'le bouton accueil flottant doit etre masque via une condition globale'
)
assert.match(
  defaultLayoutSource,
  /internalHomePaths\(\)\s*\{[\s\S]*?return\s+\[['"]\/['"]\]/,
  'le bouton accueil doit connaitre les routes accueil internes'
)
assert.match(
  defaultLayoutSource,
  /publicClientPaths\(\)\s*\{[\s\S]*?return\s+\[[\s\S]*?['"]\/menus['"][\s\S]*?['"]\/cart['"][\s\S]*?['"]\/ordersStatuses['"][\s\S]*?['"]\/table-access['"][\s\S]*?['"]\/click-and-collect['"][\s\S]*?\]/,
  'le bouton accueil doit exclure les routes client, publiques, QR, menu et commande'
)
assert.match(
  defaultLayoutSource,
  /showFloatingHomeButton\(\)\s*\{[\s\S]*?if\s*\(!this\.isStaffUser\)\s*return\s+false[\s\S]*?if\s*\(this\.internalHomePaths\.includes\(path\)\)\s*return\s+false[\s\S]*?return\s+!this\.publicClientPaths\.some/,
  'le bouton accueil ne doit apparaitre que cote staff et hors accueil/routes client'
)
assert.match(
  defaultLayoutSource,
  /<v-app-bar[\s\S]*?<v-spacer \/>[\s\S]*?class="toolbar-home-button"[\s\S]*?<\/v-app-bar>/,
  'le bouton accueil doit etre place dans la toolbar, a droite apres le spacer'
)
assert.match(
  defaultLayoutSource,
  /@click="goToInternalHome"/,
  'le bouton accueil flottant doit rediriger via la logique de routing interne'
)
assert.match(
  defaultLayoutSource,
  /goToInternalHome\(\)\s*\{[\s\S]*?this\.\$router\.push\('\/'\)/,
  'le bouton accueil flottant doit rediriger immediatement vers l accueil interne'
)
assert.match(
  defaultLayoutSource,
  /mdi-home/,
  'le bouton accueil flottant doit utiliser une icone maison'
)
assert.match(
  defaultLayoutSource,
  /class="toolbar-home-button"/,
  'le bouton accueil doit avoir une classe dediee dans la toolbar'
)
assert.match(
  defaultLayoutSource,
  /class="toolbar-home-button"[\s\S]*?fab[\s\S]*?width="52"[\s\S]*?height="52"/,
  'le bouton accueil dans la toolbar doit rester rond et visible sans etre trop gros'
)
assert.match(
  defaultLayoutSource,
  /\.toolbar-home-button\s*\{[\s\S]*?border:\s*2px\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.85\);[\s\S]*?box-shadow:[\s\S]*?\.toolbar-home-button\s+\.v-icon\s*\{[\s\S]*?font-size:\s*28px;/,
  'le bouton accueil dans la toolbar doit avoir une bordure claire, une elevation et une icone visible'
)
assert.doesNotMatch(
  defaultLayoutSource,
  /position:\s*fixed;[\s\S]*?bottom:/,
  'le bouton accueil ne doit plus etre positionne en bas de page'
)
assert.match(packageJson.scripts.test, /test\/floating-home-button\.test\.js/)

console.log('floating home button tests passed')
