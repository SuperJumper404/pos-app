const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  buildCashierReceiptPayload,
  buildCashierEscPos,
  buildCashierCloudXml,
} = require('../helpers/cashierReceipt')

const payload = buildCashierReceiptPayload({
  order: {
    id: 42,
    ordernumber: '1042',
    is_takeaway: 1,
    taken_by_name: 'Alice',
    cash_register_number: 'Caisse 2',
    service_point_name: 'Comptoir',
    payment: 'Carte',
    subtotal: 12,
  },
  details: [
    { name: 'Boisson', qty: 1, total: 6, total_ht: 5, total_vat: 1, vat_rate: 20 },
    { name: 'Plat', qty: 2, total: 6, total_ht: 5.45, total_vat: 0.55, vat_rate: 10 },
  ],
  shopInfo: {
    shop_name: 'Le Comptoir',
    shop_adress: '1 rue du Test',
    shop_phone: '0102030405',
    shop_siret: '123',
    shop_naf: '5610A',
    shop_vat_number: 'FR123',
    receipt_review_qr_url: 'https://example.test/avis',
    receipt_review_qr_label: 'Votre avis',
    cash_register_number: 'Caisse 2',
    activate_tva: true,
  },
})

assert.strictEqual(payload.itemCount, 3)
assert.strictEqual(payload.saleMode, 'À emporter')
assert.strictEqual(payload.sellerName, 'Alice')
assert.strictEqual(payload.cashRegisterNumber, 'Caisse 2')
assert.strictEqual(payload.shopInfo.shop_naf, '5610A')
assert.strictEqual(payload.shopInfo.shop_vat_number, 'FR123')
assert.strictEqual(payload.vatBreakdown.length, 2)

const escPos = buildCashierEscPos(payload).toString('latin1')
const cloudXml = buildCashierCloudXml(payload)
for (const value of ['NAF', '5610A', 'FR123', 'Alice', 'Caisse 2', 'emporter']) {
  assert.ok(escPos.includes(value), `ESC/POS doit contenir ${value}`)
  assert.ok(cloudXml.includes(value), `XML doit contenir ${value}`)
}
assert.ok(cloudXml.includes('Votre avis'))
assert.ok(cloudXml.includes('https://example.test/avis'))

const emptyPayload = buildCashierReceiptPayload({
  order: { id: 43, subtotal: 5 },
  details: [{ name: 'Produit', qty: 1, total: 5 }],
  shopInfo: { shop_name: 'Test' },
})
const emptyEscPos = buildCashierEscPos(emptyPayload).toString('latin1')
const emptyXml = buildCashierCloudXml(emptyPayload)
for (const output of [emptyEscPos, emptyXml]) {
  assert.ok(!output.includes('NAF'))
  assert.ok(!output.includes('TVA intracommunautaire'))
  assert.ok(!output.includes('Vendeur'))
  assert.ok(!output.includes('Caisse :'))
  assert.ok(!output.includes('QR'))
}

const settingsSource = fs.readFileSync(
  path.join(__dirname, '..', 'pages', 'settings.vue'),
  'utf8'
)
for (const field of [
  'shop_naf',
  'shop_vat_number',
  'receipt_review_qr_url',
  'receipt_review_qr_label',
  'cash_register_number',
]) {
  assert.ok(settingsSource.includes(field), `Réglages manquants: ${field}`)
}
assert.ok(!settingsSource.includes('receipt_display_settings'))
assert.ok(!settingsSource.includes('receipt_footer_message'))
console.log('receipt settings tests passed')
