const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  buildCashierReceiptPayload,
  buildCashierEscPos,
  buildCashierCloudXml,
  formatReceiptProductHeader,
  formatReceiptProductLine,
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
assert.strictEqual(
  formatReceiptProductHeader(true),
  'QTE PRODUIT        TVA     PRIX'
)
assert.strictEqual(
  formatReceiptProductLine(payload.details[0], true),
  '1x  Boisson          20%   6,00'
)

const escPos = buildCashierEscPos(payload).toString('latin1')
const cloudXml = buildCashierCloudXml(payload)
for (const value of ['NAF', '5610A', 'FR123', 'Alice', 'Caisse 2', 'emporter']) {
  assert.ok(escPos.includes(value), `ESC/POS doit contenir ${value}`)
  assert.ok(cloudXml.includes(value), `XML doit contenir ${value}`)
}
assert.ok(escPos.includes('QTE PRODUIT        TVA     PRIX'))
assert.ok(cloudXml.includes('QTE PRODUIT        TVA     PRIX'))
assert.ok(escPos.includes('20%'))
assert.ok(cloudXml.includes('20%'))
assert.ok(!escPos.includes('PRIX\n\n'))
assert.ok(!cloudXml.includes('PRIX\n\n'))
for (const output of [escPos, cloudXml]) {
  assert.ok(output.includes('TVA : FR123'))
  assert.ok(!output.includes('TVA intracommunautaire'))
  assert.ok(
    output.indexOf('Votre avis') < output.indexOf('À très bientôt'),
    'Le QR d\'avis doit être placé avant le message de fin'
  )
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

const kioskOrderPayload = buildCashierReceiptPayload({
  order: {
    id: 44,
    ordernumber: 'B44',
    source: 'borne',
    order_source: 'borne',
    payment: 'Paiement au comptoir',
    subtotal: 9.5,
  },
  details: [{ name: 'Menu borne', qty: 1, total: 9.5 }],
  shopInfo: { shop_name: 'Borne Test' },
  ticketKind: 'commande',
})
const kioskEscPos = buildCashierEscPos(kioskOrderPayload).toString('latin1')
const kioskXml = buildCashierCloudXml(kioskOrderPayload)
for (const output of [kioskEscPos, kioskXml]) {
  assert.ok(output.includes('TICKET DE COMMANDE'))
  assert.ok(output.includes('A PAYER AU COMPTOIR'))
  assert.ok(!output.includes('Ticket de caisse'))
  assert.ok(!output.includes('Made with smarteat.fr'))
}
console.log('receipt settings tests passed')
