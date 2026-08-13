const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)
const statisticsPath = path.join(root, 'pages', 'statistics.vue')
const indexSource = fs.readFileSync(path.join(root, 'pages', 'index.vue'), 'utf8')

assert.ok(fs.existsSync(statisticsPath), 'la page Mes statistiques doit exister')

const statisticsSource = fs.readFileSync(statisticsPath, 'utf8')

assert.match(
  dashboardSource,
  /title:\s*['"]Mes statistiques['"][\s\S]*?routeName:\s*['"]statistics['"][\s\S]*?to:\s*['"]\/statistics['"]/,
  'Mes statistiques doit etre disponible dans la navigation'
)
assert.match(
  statisticsSource,
  /history\/getMetrics/,
  'les statistiques doivent charger les metriques sur la nouvelle page'
)
assert.doesNotMatch(
  indexSource,
  /history\/getMetrics/,
  "la page d'accueil ne doit plus porter le contenu des statistiques"
)

console.log('statistics navigation tests passed')
