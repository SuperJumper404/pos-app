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
assert.match(
  menusSource,
  /:outlined="category === activeMobileCategory"/,
  'only the active category chip must be outlined'
)
assert.match(
  menusSource,
  /:color="undefined"/,
  'category chips must not use filled colors'
)
assert.match(
  menusSource,
  /text-color="black"/,
  'category chips must use black text'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?border-radius:\s*12px\s*!important/,
  'category chips must use a 12px radius'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?font-size:\s*1rem\s*!important/,
  'category chip text must be larger'
)
assert.match(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?flex:\s*0 0 auto/,
  'mobile category bar must remain fixed above the product scroller'
)
assert.match(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?padding:\s*14px 16px/,
  'mobile category bar must keep spacious padding'
)
assert.match(
  menusSource,
  /\.mobile-category-bar\s*\{[\s\S]*?gap:\s*18px/,
  'mobile category bar must keep spacious chip gaps'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?min-height:\s*32px\s*!important/,
  'category chips must be at least 32px high'
)
assert.match(
  menusSource,
  /\.mobile-category-chip\s*\{[\s\S]*?padding:\s*0 12px\s*!important/,
  'category chips must use 12px horizontal padding'
)
assert.match(
  menusSource,
  /\.mobile-category-chip--active\s*::v-deep\s*\.v-chip\s*\{[\s\S]*?border-color:\s*#000\s*!important/,
  'only the selected category chip must use a black outline'
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
