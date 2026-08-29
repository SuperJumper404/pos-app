const assert = require('assert')
const fs = require('fs')

const tablesPage = fs.readFileSync('pages/tables/index.vue', 'utf8')

assert.ok(
  tablesPage.includes('grid-template-columns: minmax(0, 1fr) 272px auto;'),
  'tables page reserves a wider column for enlarged QR codes'
)

assert.ok(
  tablesPage.includes('min-height: 256px;'),
  'tables page gives enlarged QR codes enough vertical space'
)

assert.ok(
  tablesPage.includes('height: 224px;') && tablesPage.includes('width: 224px;'),
  'tables QR previews render much larger than the old 140px size'
)
