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
  /mainModuleCards\(\)[\s\S]*?'caisse-menu'[\s\S]*?'orders'[\s\S]*?'cashregister'[\s\S]*?'history'[\s\S]*?'statistics'[\s\S]*?'reports'/,
  "l'accueil doit mettre Menu, Commandes, Tiroir-caisse, Historique, Statistiques et Rapports en avant"
)
assert.match(
  indexSource,
  /secondaryModuleCards\(\)[\s\S]*?mainRouteNames[\s\S]*?this\.moduleCards\.filter/,
  "les autres modules doivent rester en acces secondaires"
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
assert.match(
  indexSource,
  /\.home-dashboard__content\s*\{[\s\S]*?width:\s*100%/,
  "l'accueil doit prendre toute la largeur disponible"
)
assert.doesNotMatch(
  indexSource,
  /\.home-dashboard__content\s*\{[\s\S]*?max-width:\s*1160px/,
  "l'accueil ne doit plus etre limite a une colonne centree"
)
assert.match(
  indexSource,
  /module-card--main[\s\S]*?align-items:\s*center;[\s\S]*?min-height:\s*246px/,
  'les modules principaux doivent etre beaucoup plus grands'
)
assert.match(
  indexSource,
  /module-card--main\s*\{[\s\S]*?text-align:\s*center/,
  'les modules principaux doivent centrer leur contenu'
)
assert.match(
  indexSource,
  /module-card--main \.module-card__icon[\s\S]*?font-size:\s*48px/,
  'les icones des modules principaux doivent etre tres visibles'
)
assert.match(
  indexSource,
  /main-modules-grid[\s\S]*?margin:\s*-10px/,
  'les cartes principales doivent etre plus espacees'
)
assert.match(
  indexSource,
  /module-card--secondary[\s\S]*?align-items:\s*center;[\s\S]*?min-height:\s*86px/,
  'les modules secondaires doivent rester petits en bas'
)
assert.match(
  indexSource,
  /secondary-modules-grid[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?overflow-x:\s*auto;[\s\S]*?white-space:\s*nowrap/,
  'les modules secondaires doivent rester sur une seule ligne centree'
)
assert.match(
  indexSource,
  /secondary-module-col[\s\S]*?flex:\s*0 0 132px/,
  'les modules secondaires doivent garder une largeur compacte fixe'
)
assert.match(packageJson.scripts.test, /test\/home-dashboard\.test\.js/)

console.log('home dashboard tests passed')
