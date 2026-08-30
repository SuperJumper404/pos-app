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
  /loadClientServiceChoice\(\)/,
  'client menu must load a previously selected service choice'
)
assert.match(
  menusSource,
  /localStorage\.getItem\('client_service_mode'\)/,
  'client service choice must be restored from localStorage'
)
assert.match(
  menusSource,
  /if\s*\(!this\.loadClientServiceChoice\(\)\)\s*\{[\s\S]*?this\.resetClientServiceChoice\(\)/,
  'client service modal must open only when no choice was already stored'
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
assert.doesNotMatch(
  menusSource,
  /scrollIntoView/,
  'mobile category navigation must not scroll the whole page'
)
assert.match(
  menusSource,
  /ref="mobileCategoryProducts"/,
  'mobile products scroller must be addressable for category navigation'
)
assert.match(
  menusSource,
  /<v-chip[\s\S]*?mobile-category-chip/,
  'mobile category tabs must use Vuetify chips'
)
const mobileCategoryChip = menusSource.match(
  /<v-chip[\s\S]*?class="mobile-category-chip"[\s\S]*?<\/v-chip>/
)[0]
assert.match(
  menusSource,
  /:outlined="false"/,
  'category chips must use the filled active-state design'
)
assert.doesNotMatch(
  mobileCategoryChip,
  /(^|\s):?color=/,
  'category chips must keep their colors in CSS classes'
)
assert.match(
  menusSource,
  /category === activeMobileCategory \? 'white' : '#121826'/,
  'category chips must switch text contrast for the active state'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?border-radius:\s*999px\s*!important/,
  'category chips must use a pill radius'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?font-size:\s*0\.96rem\s*!important/,
  'category chip text must be larger'
)
assert.match(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?flex:\s*0 0 auto/,
  'mobile category bar must remain fixed above the product scroller'
)
assert.match(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?padding:\s*4px 2px/,
  'mobile category bar must keep spacious padding'
)
assert.match(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?gap:\s*10px/,
  'mobile category bar must keep spacious chip gaps'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?min-height:\s*40px\s*!important/,
  'category chips must be touch-friendly'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?padding:\s*0 16px\s*!important/,
  'category chips must use generous horizontal padding'
)
assert.match(
  menusSource,
  /\.mobile-category-chip--active\s*\{[\s\S]*?background:\s*#1976d2\s*!important/,
  'only the selected category chip must use the primary filled state'
)
assert.doesNotMatch(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?position:\s*sticky/,
  'mobile category bar must not stick to the top of the viewport'
)
assert.match(
  menusSource,
  /\.mobile-category-view\s*\{[\s\S]*?display:\s*flex[\s\S]*?flex-direction:\s*column/,
  'mobile menu must keep tabs and category bar in place above the product scroller'
)
assert.match(
  menusSource,
  /\.mobile-category-products\s*\{[\s\S]*?overflow-y:\s*auto/,
  'mobile products must scroll inside their own container'
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
assert.doesNotMatch(
  menusSource,
  /#fafafa/,
  'mobile menu must not use the grey #fafafa background'
)
assert.doesNotMatch(
  menusSource,
  /border-bottom:\s*1px solid rgba\(0,\s*0,\s*0,\s*0\.08\)/,
  'mobile category bar must not render an extra card-like border'
)
assert.match(packageJson.scripts.test, /test\/mobile-menu-categories\.test\.js/)

console.log('mobile menu categories tests passed')
