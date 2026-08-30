const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8')

function loadHelper() {
  const source = read('helpers/shopThemes.js')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/export default[\s\S]*$/, '')

  const module = { exports: {} }
  const wrapped = `${source}
module.exports = {
  DEFAULT_SHOP_THEME,
  SHOP_THEME_PRESETS,
  SHOP_THEME_COLOR_FIELDS,
  normalizeShopTheme,
  shopThemeToCssVars,
}`

  require('vm').runInNewContext(wrapped, { module, exports: module.exports })
  return module.exports
}

const {
  DEFAULT_SHOP_THEME,
  SHOP_THEME_PRESETS,
  SHOP_THEME_COLOR_FIELDS,
  normalizeShopTheme,
  shopThemeToCssVars,
} = loadHelper()

assert.strictEqual(DEFAULT_SHOP_THEME.preset, 'default')
assert.ok(SHOP_THEME_PRESETS.default)
assert.deepStrictEqual(
  Object.keys(SHOP_THEME_PRESETS),
  ['default', 'bistrotVert', 'comptoirRouge', 'noirModerne']
)
assert.strictEqual(SHOP_THEME_PRESETS.bistrotVert.label, 'Bistrot Vert')
assert.strictEqual(SHOP_THEME_PRESETS.comptoirRouge.label, 'Comptoir Rouge')
assert.strictEqual(SHOP_THEME_PRESETS.noirModerne.label, 'Noir Moderne')
assert.strictEqual(
  normalizeShopTheme(SHOP_THEME_PRESETS.noirModerne.theme).preset,
  'noirModerne'
)
assert.ok(SHOP_THEME_COLOR_FIELDS.find((field) => field.key === 'primary'))
assert.strictEqual(normalizeShopTheme(null).colors.primary, '#1976d2')
assert.strictEqual(
  normalizeShopTheme({ colors: { primary: '#abc', warning: 'orange' } }).colors
    .warning,
  '#ffa014'
)
assert.deepStrictEqual(
  shopThemeToCssVars({
    colors: { ...DEFAULT_SHOP_THEME.colors, primary: '#123456' },
  })['--se-color-primary'],
  '#123456'
)
assert.strictEqual(
  shopThemeToCssVars(DEFAULT_SHOP_THEME)['--se-color-border-soft'],
  '#e8edf3'
)

const plugin = read('plugins/shopTheme.client.js')
assert.match(plugin, /shopThemeToCssVars/)
assert.match(plugin, /document\.documentElement\.style\.setProperty/)
assert.match(plugin, /vuetify\.framework\.theme\.themes/)
assert.match(plugin, /store\.watch/)

const store = read('store/shop.js')
assert.match(store, /shop_theme/)
assert.match(store, /normalizeShopTheme/)
assert.match(store, /set\/shop_theme/)

const nuxtConfig = read('nuxt.config.js')
assert.match(nuxtConfig, /plugins\/shopTheme\.client\.js/)

const settings = read('pages/settings.vue')
assert.match(settings, /SHOP_THEME_PRESETS/)
assert.match(settings, /formShop\.shop_theme/)
assert.match(settings, /themeJson/)
assert.match(settings, /themeJsonDialog/)
assert.match(settings, /themeJsonDraft/)
assert.match(settings, /themeJsonError/)
assert.match(
  settings,
  /themeJson:\s*JSON\.stringify\(normalizeShopTheme\(\),\s*null,\s*2\)/,
  'settings must show the default theme JSON before async shop data loads'
)
assert.match(settings, /Theme du restaurant/)
assert.match(settings, /settings-theme-card/)
assert.match(settings, /settings-theme-controls/)
assert.match(settings, /settings-theme-select-col/)
assert.match(settings, /settings-theme-select/)
assert.match(settings, /settings-theme-edit-button/)
assert.match(
  settings,
  /\.settings-theme-select-col\s*\{[\s\S]*?max-width:\s*320px/,
  'theme preset dropdown must stay compact on desktop'
)
assert.match(settings, /v-select[\s\S]*themePresetOptions/)
assert.doesNotMatch(settings, /v-textarea[\s\S]*v-model="themeJson"/)
assert.match(settings, /<v-btn[\s\S]*@click="openThemeJsonDialog"[\s\S]*Edit/)
assert.match(settings, /<v-dialog[\s\S]*v-model="themeJsonDialog"/)
assert.match(settings, /v-textarea[\s\S]*v-model="themeJsonDraft"/)
assert.match(settings, /@click="closeThemeJsonDialog"[\s\S]*Annuler/)
assert.match(settings, /@click="applyThemeJsonDraft"[\s\S]*Appliquer/)
assert.doesNotMatch(settings, /v-text-field[\s\S]*type="color"/)
assert.match(settings, /JSON\.parse\(this\.themeJsonDraft\)/)
assert.match(settings, /JSON du th.me invalide/)
assert.match(settings, /this\.formShop\.shop_theme = normalizeShopTheme/)
assert.match(settings, /data: this\.formShop/)

const menuPage = read('pages/menus.vue')
const kioskPage = read('pages/borne.vue')
const clickCollectPage = read('pages/click-and-collect/_shopId/_shopName.vue')

assert.match(menuPage, /var\(--se-color-primary\)/)
assert.match(menuPage, /var\(--se-color-bg\)/)
assert.match(menuPage, /var\(--se-color-surface\)/)
assert.match(menuPage, /var\(--se-color-border\)/)
assert.match(menuPage, /var\(--se-color-text\)/)

assert.match(kioskPage, /var\(--se-color-primary\)/)
assert.match(kioskPage, /var\(--se-color-bg\)/)
assert.match(kioskPage, /var\(--se-color-surface\)/)
assert.match(kioskPage, /var\(--se-color-border\)/)
assert.match(kioskPage, /var\(--se-color-text\)/)

assert.match(clickCollectPage, /shop_theme/)
assert.match(clickCollectPage, /var\(--se-color-primary\)/)
assert.match(clickCollectPage, /var\(--se-color-bg\)/)

console.log('frontend shop theme tests passed')
