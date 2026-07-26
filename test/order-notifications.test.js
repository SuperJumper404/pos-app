const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  countPendingOrders,
  formatPendingOrderBadge,
} = require('../helpers/orderNotifications')
const layoutSource = fs.readFileSync(
  path.join(root, 'layouts', 'default.vue'),
  'utf8'
)

assert.strictEqual(
  countPendingOrders([{ status: 1 }, { status: '1' }, { status: 2 }, null]),
  2
)
assert.strictEqual(countPendingOrders(null), 0)
assert.strictEqual(formatPendingOrderBadge(0), '0')
assert.strictEqual(formatPendingOrderBadge(12), '12')
assert.strictEqual(formatPendingOrderBadge(100), '99+')

assert.match(layoutSource, /pendingOrderCount/)
assert.match(layoutSource, /orders\/getAllOrder/)
assert.match(layoutSource, /this\.\$route\.path === ['"]\/orders['"]/)
assert.match(
  layoutSource,
  /if \(this\.ordersPollingInFlight\) return false[\s\S]*?try \{[\s\S]*?await this\.\$store\.dispatch\(['"]orders\/getAllOrder['"]\)[\s\S]*?finally \{[\s\S]*?this\.ordersPollingInFlight = false/,
  'le polling doit empêcher le chevauchement des requêtes et toujours libérer son verrou'
)
assert.match(
  layoutSource,
  /startOrdersPolling\(\)[\s\S]*?if \(this\.userAccess !== 0\) return/,
  'le layout ne doit pas démarrer de polling pour un utilisateur non-admin'
)
assert.match(
  layoutSource,
  /watch:\s*\{[\s\S]*?userAccess\(\)[\s\S]*?syncOrdersPolling\(\)/,
  'le polling doit réagir à une connexion ou déconnexion sans remonter le layout'
)
assert.match(
  layoutSource,
  /startOrdersPolling\(\)[\s\S]*?if \(this\.ordersPolling\) return/,
  'le layout ne doit jamais créer plusieurs timers de commandes'
)
assert.match(layoutSource, /beforeDestroy\(\)[\s\S]*?stopOrdersPolling\(\)/)

console.log('order notification tests passed')
