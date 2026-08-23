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
assert.match(tokens, /--se-color-warning:\s*#ffa014;/)
assert.match(tokens, /--se-color-danger:\s*#d83b3b;/)
assert.match(tokens, /--se-font-body:\s*1rem;/)
assert.match(tokens, /--se-touch-target:\s*44px;/)
assert.match(tokens, /--se-radius-md:\s*8px;/)
assert.match(tokens, /\.se-search-field\s*\{/)
assert.match(tokens, /\.se-search-field \.v-input__slot\s*\{[\s\S]*border-radius:\s*var\(--se-radius-pill\)/)
assert.match(tokens, /\.se-search-field \.v-icon\s*\{[\s\S]*color:\s*var\(--se-color-primary\)/)

const settings = read('pages/settings.vue')
assert.doesNotMatch(settings, /mdi-tiktokbvcbcv/)

const nuxtConfig = read('nuxt.config.js')
const designSidecar = read('.impeccable/design.json')
assert.doesNotMatch(nuxtConfig, /success:\s*'#2e7d32'/)
assert.match(nuxtConfig, /success:\s*'#00e676'/)
assert.match(nuxtConfig, /warning:\s*'#ffa014'/)
assert.doesNotMatch(design, /success:\s*"#2e7d32"/)
assert.match(design, /success:\s*"#00e676"/)
assert.match(design, /warning:\s*"#ffa014"/)
assert.doesNotMatch(designSidecar, /"canonical":\s*"#2e7d32"/)
assert.match(designSidecar, /"canonical":\s*"#00e676"/)
assert.match(designSidecar, /"canonical":\s*"#ffa014"/)

const statusChip = read('components/design-system/SeStatusChip.vue')
assert.match(statusChip, /statusMap/)
assert.match(statusChip, /se-status-chip--success/)
assert.match(statusChip, /se-status-chip--warning/)
assert.match(statusChip, /se-status-chip--danger/)
assert.match(statusChip, /aria-label/)

const pageHeader = read('components/design-system/SePageHeader.vue')
assert.match(pageHeader, /se-page-header/)
assert.match(pageHeader, /<slot name="actions"/)

const searchSurfaces = [
  'pages/clients.vue',
  'pages/history/index.vue',
  'pages/orders/index.vue',
  'pages/stocks/index.vue',
]

searchSurfaces.forEach((filePath) => {
  const source = read(filePath)
  assert.match(source, /class="[^"]*se-search-field/)
  assert.match(source, /prepend-inner-icon="mdi-magnify"/)
  assert.doesNotMatch(source, /append-icon="mdi-card-search"/)
  assert.doesNotMatch(source, /\slabel="Rechercher/)
})

assert.match(read('pages/clients.vue'), /clients-search-field/)

function listVueFiles(directory) {
  const absoluteDirectory = path.join(root, directory)
  if (!fs.existsSync(absoluteDirectory)) return []

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name)
    const normalizedPath = relativePath.split(path.sep).join('/')
    if (entry.isDirectory()) return listVueFiles(relativePath)
    return entry.name.endsWith('.vue') ? [normalizedPath] : []
  })
}

const visibleSearchFieldFiles = listVueFiles('pages')
  .concat(listVueFiles('components'))
  .filter((filePath) => {
    const source = read(filePath)
    return /<v-text-field[\s\S]*?(?:searchFilter|v-model="search"|Rechercher|Recherche|mdi-card-search)/i.test(source)
  })

assert.deepStrictEqual(
  visibleSearchFieldFiles.sort(),
  searchSurfaces.sort(),
  'Every visible search field must use the shared se-search-field pattern'
)
