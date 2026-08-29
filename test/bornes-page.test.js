const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const bornesPage = fs.readFileSync(path.join(root, 'pages', 'bornes.vue'), 'utf8')
const staffPage = fs.readFileSync(path.join(root, 'pages', 'staff', 'index.vue'), 'utf8')
const servicePointsStore = fs.readFileSync(
  path.join(root, 'store', 'servicePoints.js'),
  'utf8'
)
const listdashboard = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)

assert.match(listdashboard, /title:\s*'Bornes'/)
assert.match(listdashboard, /routeName:\s*'bornes'/)
assert.match(listdashboard, /to:\s*'\/bornes'/)

assert.match(bornesPage, /Ajouter une borne/)
assert.match(bornesPage, /Identifiant/)
assert.match(bornesPage, /PIN/)
assert.match(bornesPage, /Regenerer le PIN/)
assert.match(bornesPage, /Actif/)
assert.match(bornesPage, /Desactive/)
assert.match(bornesPage, /servicePoints\/getKiosks/)
assert.match(bornesPage, /servicePoints\/createKiosk/)
assert.match(bornesPage, /servicePoints\/updateKiosk/)
assert.match(bornesPage, /servicePoints\/regenerateKioskPin/)
assert.match(bornesPage, /mdi-open-in-new/)
assert.match(bornesPage, /Ouvrir l'acces borne/)
assert.match(bornesPage, /openKioskAccess\(item\)/)
assert.match(bornesPage, /window\.open/)
assert.match(bornesPage, /'_blank'/)
assert.match(bornesPage, /'noopener'/)
assert.doesNotMatch(bornesPage, /Supprimer/)

assert.doesNotMatch(staffPage, /Borne associ/)
assert.doesNotMatch(staffPage, /Créer une borne/)
assert.doesNotMatch(staffPage, /CrÃ©er une borne/)
assert.doesNotMatch(staffPage, /createKioskServicePoint/)

assert.match(servicePointsStore, /getKiosks/)
assert.match(servicePointsStore, /updateKiosk/)
assert.match(servicePointsStore, /regenerateKioskPin/)

console.log('bornes page tests passed')
