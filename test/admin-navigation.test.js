const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)
const staffRolesSource = fs.readFileSync(
  path.join(root, 'helpers', 'staffRoles.js'),
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
  /routeName:\s*['"]categories['"][\s\S]*?hiddenFromMainNavigation:\s*true/,
  'Categories ne doit pas apparaitre dans le menu lateral ni sur l accueil'
)
assert.match(
  dashboardSource,
  /routeName:\s*['"]customizations['"][\s\S]*?hiddenFromMainNavigation:\s*true/,
  'Etapes produits ne doit pas apparaitre dans le menu lateral ni sur l accueil'
)
assert.match(
  dashboardSource,
  /title:\s*['"]Stocks['"][\s\S]*?routeName:\s*['"]stocks['"][\s\S]*?to:\s*['"]\/stocks['"][\s\S]*?moduleKey:\s*['"]stocks['"]/,
  'Stock doit apparaitre dans le menu principal pour les utilisateurs autorises'
)
assert.doesNotMatch(
  dashboardSource,
  /routeName:\s*['"]stocks['"][\s\S]*?hiddenFromMainNavigation:\s*true/,
  'Stock ne doit plus etre masque de la navigation principale'
)
assert.match(
  staffRolesSource,
  /getAccessibleNavigationItems[\s\S]*?!item\.hiddenFromMainNavigation/,
  'la navigation principale doit filtrer les modules masques'
)
assert.match(
  dashboardSource,
  /title:\s*['"]Mes clients['"][\s\S]*?routeName:\s*['"]clients['"][\s\S]*?to:\s*['"]\/clients['"][\s\S]*?moduleKey:\s*['"]clients['"]/,
  'Mes clients doit apparaitre comme module principal'
)
assert.match(
  staffRolesSource,
  /clients:\s*['"]history['"]/,
  'Mes clients doit reutiliser la permission Historique'
)

assert.match(
  productsSource,
  /(?:Ajouter catégorie|Ajouter catÃ©gorie|Gérer les catégories|GÃ©rer les catÃ©gories)/,
  'la page Produits doit proposer le bouton de gestion des catÃ©gories'
)
assert.match(
  productsSource,
  /openNewCategory\(\)[\s\S]*?this\.\$router\.push\(['"]\/categories['"]\)/,
  'le bouton de gestion des catÃ©gories doit ouvrir la page CatÃ©gories'
)
assert.match(
  dashboardSource,
  /title:\s*['"](?:Catégories|CatÃ©gories)['"][\s\S]*?routeName:\s*['"]categories['"][\s\S]*?isAdmin:\s*false/,
  'CatÃ©gories doit rester accessible sans prendre une entrÃ©e admin latÃ©rale'
)

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
assert.doesNotMatch(
  dashboardSource,
  /Comptoir express/,
  'Comptoir express doit rester un mode de Menus, pas une entrée séparée'
)
assert.match(
  defaultLayoutSource,
  /<v-app-bar-nav-icon[\s\S]*?v-if="isStaffUser"/,
  'staff users must receive an app bar navigation icon'
)
assert.match(
  defaultLayoutSource,
  /<v-list-item-content\s+v-if="!miniVariant"[\s\S]*?class="side-nav-item__content"/,
  'mini sidebar mode must hide navigation labels'
)
assert.match(
  defaultLayoutSource,
  /v-if="[\s\S]*?!miniVariant[\s\S]*?item\.routeName === 'orders'[\s\S]*?pendingOrderCount > 0[\s\S]*?"/,
  'mini sidebar mode must hide the text badge area and keep only icons'
)
assert.match(
  defaultLayoutSource,
  /navigationGroups\(\)[\s\S]*?title:\s*'Service'[\s\S]*?title:\s*'Pilotage'[\s\S]*?title:\s*'Gestion'[\s\S]*?title:\s*'Parametres'/,
  'the side menu must organize primary navigation into service, pilotage, gestion and parametres sections'
)
assert.match(
  defaultLayoutSource,
  /v-for="\(\s*group,\s*groupIndex\s*\) in navigationGroups"[\s\S]*?<v-subheader[\s\S]*?{{ group\.title }}/,
  'the side menu must render a visible section label for each navigation group'
)
assert.match(
  defaultLayoutSource,
  /:title="item\.title"[\s\S]*?:aria-label="item\.title"/,
  'mini sidebar items must keep accessible labels while visual text is hidden'
)
assert.match(
  defaultLayoutSource,
  /side-nav-mini-badge[\s\S]*?pendingOrderCount > 0/,
  'mini sidebar mode must show a compact pending order indicator'
)
assert.match(
  defaultLayoutSource,
  /side-nav-mini-rail/,
  'mini sidebar mode must use a dedicated premium rail treatment'
)
assert.match(
  defaultLayoutSource,
  /class="app-top-bar"[\s\S]*?class="top-bar-left-actions"[\s\S]*?class="top-bar-page-chip"[\s\S]*?class="top-bar-right-actions"/,
  'the top navigation header must use the premium cockpit structure'
)
assert.match(
  defaultLayoutSource,
  /class="top-bar-page-icon"[\s\S]*?currentPage\.icon[\s\S]*?class="top-bar-page-title"/,
  'the top navigation header must show the current page icon in a soft block beside the title'
)

console.log('admin navigation tests passed')
