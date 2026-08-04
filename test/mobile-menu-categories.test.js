const assert = require('assert')
const fs = require('fs')
const path = require('path')

const menusSource = fs.readFileSync(
  path.join(__dirname, '../pages/menus.vue'),
  'utf8'
)
const packageJson = require('../package.json')

assert.match(
  menusSource,
  /mobile-category-bar/,
  'mobile menus must expose a horizontal category bar'
)
assert.match(
  menusSource,
  /activeMobileCategory:\s*null/,
  'mobile menus must track the active category'
)
assert.match(
  menusSource,
  /ensureActiveMobileCategory\(\)[\s\S]*?this\.activeMobileCategory\s*=\s*this\.categories\[0\]/,
  'mobile menus must select the first category by default'
)
assert.match(
  menusSource,
  /mobile-category-section/,
  'mobile menus must keep category sections available below the horizontal bar'
)
assert.doesNotMatch(
  menusSource,
  /getProductPerCategorie\(activeMobileCategory\)/,
  'mobile category tabs must not filter the menu content'
)
assert.match(
  menusSource,
  /scrollToMobileCategory\(category\)/,
  'mobile category tabs must scroll to the selected category section'
)
assert.match(
  menusSource,
  /<v-chip[\s\S]*?mobile-category-chip/,
  'mobile category tabs must use Vuetify chips'
)
assert.match(
  menusSource,
  /:outlined="category !== activeMobileCategory"/,
  'inactive category chips must be outlined'
)
assert.match(
  menusSource,
  /:color="category === activeMobileCategory \? 'primary' : undefined"/,
  'active category chip must be filled with the primary color'
)
assert.match(
  menusSource,
  /class="menu-content-row mt-5"/,
  'menu content row must be targetable for mobile spacing'
)
assert.match(
  menusSource,
  /\.menu-content-row\s*\{[\s\S]*?margin-top:\s*0\s*!important/,
  'mobile menu must remove the empty top spacing'
)
assert.match(packageJson.scripts.test, /test\/mobile-menu-categories\.test\.js/)

console.log('mobile menu categories tests passed')
