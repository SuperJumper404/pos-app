const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const indexSource = fs.readFileSync(path.join(root, 'pages', 'index.vue'), 'utf8')
const packageJson = require('../package.json')

assert.doesNotMatch(
  indexSource,
  /this\.\$router\.push\(['"]\/statistics['"]\)/,
  "l'accueil interne ne doit plus rediriger automatiquement vers les statistiques"
)
assert.match(
  indexSource,
  /mixins:\s*\[listdashboard\]/,
  "l'accueil doit reutiliser la navigation existante"
)
assert.match(
  indexSource,
  /getAccessibleNavigationItems/,
  'les tuiles de modules doivent respecter les permissions staff'
)
assert.match(
  indexSource,
  /moduleCards\(\)[\s\S]*?filter\([\s\S]*?item\.to[\s\S]*?item\.routeName !== 'index'/,
  "les tuiles doivent exclure l'accueil et les actions sans destination"
)
assert.match(
  indexSource,
  /connectedUserLabel/,
  "le bandeau doit afficher l'utilisateur connecte"
)
assert.match(
  indexSource,
  /currentDateTime/,
  "le bandeau doit afficher la date et l'heure"
)
assert.match(
  indexSource,
  /pendingOrderCount/,
  'le bandeau doit afficher les commandes en attente'
)
assert.match(
  indexSource,
  /kitchenStatusLabel/,
  'le bandeau doit afficher le statut cuisine'
)
assert.match(
  indexSource,
  /goToModule\(module\)[\s\S]*?this\.\$router\.push\(module\.to\)/,
  'un clic sur une tuile doit naviguer vers le module'
)
assert.match(
  indexSource,
  /home-dashboard__hero/,
  "l'accueil doit avoir un bandeau principal visible"
)
assert.match(
  indexSource,
  /module-card__body/,
  'les tuiles doivent afficher un vrai bloc texte, pas seulement une icone'
)
assert.match(
  indexSource,
  /getModuleDescription\(module\)/,
  'chaque tuile doit afficher une courte aide de navigation'
)
assert.match(
  indexSource,
  /module-card__arrow/,
  'les tuiles doivent indiquer visuellement le clic'
)
assert.match(packageJson.scripts.test, /test\/home-dashboard\.test\.js/)

console.log('home dashboard tests passed')
