const assert = require('assert')
const fs = require('fs')
const path = require('path')

const menusSource = fs.readFileSync(
  path.join(__dirname, '../pages/menus.vue'),
  'utf8'
)
const cartSource = fs.readFileSync(
  path.join(__dirname, '../pages/cart.vue'),
  'utf8'
)
const packageJson = require('../package.json')

function cssBlock(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = menusSource.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing CSS block: ${selector}`)
  return match[1]
}

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
  /clientServiceSubtitle\(\)[\s\S]*service_point_name[\s\S]*return tableName \|\| ''/,
  'client menu must display only the scanned table name without a Table prefix'
)
assert.doesNotMatch(
  menusSource,
  /client-service-banner|client-service-icon|client-service-copy/,
  'client menu must not show the large table banner above the menu'
)
assert.match(
  menusSource,
  /class="client-cart-table"[\s\S]*?mdi-table-chair[\s\S]*?\{\{ clientServiceSubtitle \}\}[\s\S]*?class="client-cart-summary"/,
  'desktop client cart must show the scanned table above the cart summary'
)
assert.doesNotMatch(
  menusSource,
  /client_service_mode|loadClientServiceChoice|resetClientServiceChoice|openClientServiceDialog|selectClientService|persistClientServiceChoice|clientServiceDialog|clientServiceMode/,
  'client menu must not keep the removed dine-in/takeaway choice flow'
)
assert.doesNotMatch(
  cartSource,
  /localStorage\.getItem\('client_service_mode'\)/,
  'QR table checkout must not reuse the removed takeaway choice'
)
assert.match(
  cartSource,
  /if \(this\.isQrClient\) \{\s*this\.formuser\.isTakeaway = false\s*\}/,
  'QR table checkout must always stay dine-in'
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
  /\.client-category-nav\s*\{[\s\S]*?position:\s*sticky[\s\S]*?top:\s*0/,
  'client category navigation must stay visible while scrolling the menu'
)
assert.match(
  menusSource,
  /@media \(max-width:\s*599px\)[\s\S]*?\.client-category-nav\s*\{[\s\S]*?position:\s*fixed[\s\S]*?top:\s*56px[\s\S]*?left:\s*0[\s\S]*?right:\s*0/,
  'client mobile category navigation must be fixed under the main menu tabs while scrolling'
)
assert.match(
  menusSource,
  /\.menu-page-container--client\s*\.menu-panel-card\s*\{[\s\S]*?overflow:\s*visible/,
  'client menu card must allow sticky category navigation to attach to the viewport'
)
assert.match(
  menusSource,
  /\.client-category-view\s*\.mobile-category-bar\s*\{[\s\S]*?flex:\s*1 1 auto/,
  'client mobile categories must scroll inside the space between both arrows'
)
assert.match(
  menusSource,
  /\.client-category-view\s*\.mobile-category-bar\s*\{[\s\S]*?min-width:\s*0/,
  'client mobile category bar must be allowed to shrink between arrows'
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
  cssBlock('.mobile-category-bar'),
  /position:\s*sticky/,
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
  /\.client-category-view\s*\.mobile-category-products\s*\{[\s\S]*?overflow-y:\s*visible/,
  'client mobile products must use page scroll instead of a short product scroller'
)
assert.doesNotMatch(
  cssBlock('.client-category-view .mobile-category-products'),
  /background:/,
  'client mobile product columns must not paint a background behind overflowing cards'
)
assert.match(
  menusSource,
  /\.client-category-view\s*\{[\s\S]*?height:\s*auto/,
  'client mobile category view must grow with product cards'
)
assert.doesNotMatch(
  menusSource,
  /client-category-nav::after/,
  'client category navigation must not render a shadow underneath'
)
assert.doesNotMatch(
  menusSource,
  /#f6f8fb/,
  'client menu must not use the grey panel background'
)
assert.doesNotMatch(
  menusSource,
  /#ffe9b5/,
  'client checkout button must not use the old yellow background'
)
assert.match(
  menusSource,
  /\.client-mobile-checkout-button\s*\{[\s\S]*?background:\s*#1976d2\s*!important[\s\S]*?color:\s*#ffffff\s*!important/,
  'client checkout button must use the primary action color'
)
assert.match(
  menusSource,
  /class="client-mobile-checkout-count"[\s\S]*?<v-icon color="primary">mdi-shopping-outline<\/v-icon>/,
  'client checkout count icon must remain visible on the light count badge'
)
assert.match(
  menusSource,
  /<span class="cart-order-btn__label">\s*Commander\s*<\/span>/,
  'desktop cart submit button must keep the Commander label'
)
assert.match(
  menusSource,
  /<span class="cart-order-btn__label">\s*Commander\s*<\/span>[\s\S]*?<span class="cart-order-btn__total">\s*\{\{ formatCurrency\(total\) \}\}\s*<\/span>/,
  'desktop cart submit button must show the total amount instead of a trailing icon'
)
assert.doesNotMatch(
  menusSource,
  /mdi-silverware-fork-knife/,
  'desktop cart submit button must not keep the old trailing icon'
)
assert.match(
  menusSource,
  /<span class="client-mobile-checkout-label">Voir ma commande<\/span>/,
  'mobile client checkout button must keep the Voir ma commande label'
)
assert.match(
  menusSource,
  /\.menu-page-container--client\s*\{[\s\S]*?background:\s*transparent/,
  'client menu page background must stay transparent'
)
assert.match(
  menusSource,
  /@media \(max-width:\s*599px\)[\s\S]*?\.menu-page-container--client\s*\.menu-panel-card\s*\{[\s\S]*?background:\s*transparent\s*!important[\s\S]*?box-shadow:\s*none\s*!important/,
  'mobile client menu card must not paint a grey panel or shadow around products'
)
assert.match(
  menusSource,
  /class="menu-cart-column"/,
  'menu cart column must be targetable for desktop sticky positioning'
)
assert.match(
  menusSource,
  /@media \(min-width:\s*600px\)[\s\S]*?\.menu-page-container--client\s*\.menu-cart-column\s*\.menu-panel-card\s*\{[\s\S]*?position:\s*fixed[\s\S]*?right:\s*24px[\s\S]*?top:\s*92px/,
  'desktop client cart must float fixed while the menu scrolls'
)
assert.match(
  menusSource,
  /@media \(min-width:\s*600px\)[\s\S]*?\.menu-page-container--client\s*\.menu-cart-column\s*\.menu-panel-card\s*\{[\s\S]*?width:\s*min\(calc\(33\.333vw - 32px\),\s*420px\)/,
  'desktop client floating cart must keep a bounded right-column width'
)
assert.match(
  menusSource,
  /@media \(min-width:\s*600px\)[\s\S]*?\.menu-page-container--client\s*\.menu-cart-column\s*\.express-cart-items-scroll\s*\{[\s\S]*?overflow-y:\s*auto/,
  'sticky desktop client cart must keep its items scrollable inside the panel'
)
assert.match(
  menusSource,
  /\.express-cart-items-scroll\s*\{[\s\S]*?padding-bottom:\s*14px/,
  'cart items scroller must keep breathing room at the bottom'
)
assert.match(
  menusSource,
  /cart-item-row[\s\S]*?mt-2[\s\S]*?mb-2/,
  'cart item rows must keep bottom breathing room around product images'
)
assert.match(
  menusSource,
  /\.cart-item-actions\s*\{[\s\S]*?gap:\s*4px/,
  'cart quantity controls must use a compact regular gap'
)
assert.match(
  menusSource,
  /\.cart-action-btn\s*\{[\s\S]*?height:\s*34px\s*!important[\s\S]*?width:\s*34px\s*!important/,
  'cart plus and minus buttons must use the lighter compact design'
)
assert.match(
  menusSource,
  /\.cart-qty-btn\s*\{[\s\S]*?height:\s*36px\s*!important[\s\S]*?min-width:\s*36px\s*!important[\s\S]*?width:\s*36px\s*!important/,
  'cart quantity button must stay proportional without overpowering the row'
)
assert.match(
  menusSource,
  /\.cart-qty-btn\s*\{[\s\S]*?font-size:\s*1\.12rem\s*!important/,
  'cart quantity number must be visually prominent inside the compact button'
)
assert.doesNotMatch(
  menusSource,
  /client-service-grid|client-service-tile|client-service-dialog|client-service-chevron/,
  'removed client service modal styles must not remain in the menu page'
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
