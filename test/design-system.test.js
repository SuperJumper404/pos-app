const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), 'utf8')
}

function exists(filePath) {
  return fs.existsSync(path.join(root, filePath))
}

assert.ok(exists('DESIGN.md'), 'DESIGN.md documents the visual system')
assert.ok(
  exists('.impeccable/design.json'),
  '.impeccable/design.json feeds the live design panel'
)
assert.ok(
  exists('assets/scss/design-system.scss'),
  'design-system.scss exposes shared tokens'
)
assert.ok(
  exists('components/design-system/SeStatusChip.vue'),
  'SeStatusChip standardizes semantic status chips'
)
assert.ok(
  exists('components/design-system/SePageHeader.vue'),
  'SePageHeader standardizes operational page headers'
)

const design = read('DESIGN.md')
assert.match(design, /## 1\. Overview/)
assert.match(design, /## 2\. Colors/)
assert.match(design, /## 3\. Typography/)
assert.match(design, /## 4\. Elevation/)
assert.match(design, /## 5\. Components/)
assert.match(design, /## 6\. Do's and Don'ts/)

const tokens = read('assets/scss/design-system.scss')
assert.match(tokens, /--se-color-primary:\s*#1976d2;/)
assert.match(tokens, /--se-color-success:\s*#00e676;/)
assert.match(tokens, /--se-color-danger:\s*#d83b3b;/)
assert.match(tokens, /--se-font-body:\s*1rem;/)
assert.match(tokens, /--se-touch-target:\s*44px;/)
assert.match(tokens, /--se-radius-md:\s*8px;/)

const styles = read('assets/css/styles.css')
assert.match(styles, /font-display:\s*swap;/)
assert.doesNotMatch(
  styles,
  /\*\s*\{[^}]*box-shadow:\s*none\s*!important;/s,
  'global reset must not remove every Vuetify shadow'
)

const settings = read('pages/settings.vue')
assert.doesNotMatch(settings, /mdi-tiktokbvcbcv/)

const nuxtConfig = read('nuxt.config.js')
const designSidecar = read('.impeccable/design.json')
assert.doesNotMatch(nuxtConfig, /success:\s*'#2e7d32'/)
assert.match(nuxtConfig, /success:\s*'#00e676'/)
assert.doesNotMatch(design, /success:\s*"#2e7d32"/)
assert.match(design, /success:\s*"#00e676"/)
assert.doesNotMatch(designSidecar, /"canonical":\s*"#2e7d32"/)
assert.match(designSidecar, /"canonical":\s*"#00e676"/)

const statusChip = read('components/design-system/SeStatusChip.vue')
assert.match(statusChip, /statusMap/)
assert.match(statusChip, /se-status-chip--success/)
assert.match(statusChip, /se-status-chip--warning/)
assert.match(statusChip, /se-status-chip--danger/)
assert.match(statusChip, /aria-label/)

const pageHeader = read('components/design-system/SePageHeader.vue')
assert.match(pageHeader, /se-page-header/)
assert.match(pageHeader, /<slot name="actions"/)
