const assert = require('assert')
const {
  buildStableTableDomain,
  buildStableTableEmail,
  buildStableTableLogin,
  normalizeIdentityPart,
} = require('../helpers/tableIdentity')

assert.strictEqual(normalizeIdentityPart(' Table 1 ', 'fallback'), 'table-1')
assert.strictEqual(normalizeIdentityPart('Étage Café', 'fallback'), 'etage-cafe')
assert.strictEqual(normalizeIdentityPart('', 'fallback'), 'fallback')

assert.strictEqual(
  buildStableTableLogin({ shopId: 12, shopName: 'Ignored', tableName: 'Table 1' }),
  'table-1-shop-12'
)

assert.strictEqual(
  buildStableTableDomain('Café Démo'),
  'cafe-demo.com'
)

assert.strictEqual(
  buildStableTableEmail({ shopId: 12, shopName: 'Demo Shop', tableName: ' Table 1 ' }),
  buildStableTableEmail({ shopId: 12, shopName: 'Demo Shop', tableName: 'table-1' })
)

assert.notStrictEqual(
  buildStableTableEmail({ shopId: 12, shopName: 'Demo Shop', tableName: 'Table 1' }),
  buildStableTableEmail({ shopId: 13, shopName: 'Demo Shop', tableName: 'Table 1' })
)

assert.strictEqual(
  buildStableTableEmail({ shopName: 'Boutique Maroc', tableName: 'Terrasse 2' }),
  'terrasse-2-boutique-maroc@boutique-maroc.com'
)

console.log('tableIdentity tests passed')
