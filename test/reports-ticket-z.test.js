const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../pages/reports.vue'),
  'utf8'
)

assert.ok(source.includes('v-tabs'))
assert.ok(source.includes('Commandes'))
assert.ok(source.includes('Cloture Z'))
assert.ok(source.includes('Historique Z'))
assert.ok(source.includes('currentClosure'))
assert.ok(source.includes('closureHistory'))
assert.ok(source.includes('closeClosureDialog'))
assert.ok(source.includes('cashClosures/getCurrent'))
assert.ok(source.includes('cashClosures/getHistory'))
assert.ok(source.includes('cashClosures/closeCurrent'))
assert.ok(source.includes('Cloturer la caisse'))
assert.ok(source.includes('Ticket Z'))
assert.ok(source.includes('payments_summary'))
assert.ok(source.includes('vat_summary'))
assert.ok(source.includes(':disabled="closingClosure || !canCloseClosure"'))

console.log('reports ticket z tests passed')
