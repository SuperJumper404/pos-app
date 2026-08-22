const assert = require('assert')
const fs = require('fs')
const path = require('path')

const settingsSource = fs.readFileSync(
  path.join(__dirname, '..', 'pages', 'settings.vue'),
  'utf8'
)
const shopStoreSource = fs.readFileSync(
  path.join(__dirname, '..', 'store', 'shop.js'),
  'utf8'
)

for (const field of [
  'shop_naf',
  'shop_vat_number',
  'receipt_review_qr_url',
  'receipt_review_qr_label',
  'cash_register_number',
]) {
  assert.match(settingsSource, new RegExp(`v-model="formShop\\.${field}"`))
  assert.ok(shopStoreSource.includes(`'set/${field}'`))
}
assert.ok(!settingsSource.includes('Aperçu du ticket de caisse'))
assert.ok(!settingsSource.includes('<qr-code'))
assert.match(
  settingsSource,
  /<v-form ref="form" v-model="valid" @submit\.prevent="submitShopEdit">/
)
assert.match(settingsSource, /type="submit"/)
assert.match(
  settingsSource,
  /<v-col cols="6">[\s\S]*Avis client sur le ticket de caisse/
)
assert.ok(
  settingsSource.indexOf('Réseaux Sociaux') <
    settingsSource.indexOf('Avis client sur le ticket de caisse'),
  'Le groupe Avis client doit être placé après les réseaux sociaux'
)
assert.match(
  settingsSource,
  /Ventes, TVA et paiements[\s\S]*shop_payment_methods[\s\S]*discount_percentages[\s\S]*shop_vat_number[\s\S]*activate_tva/
)
for (const heading of [
  "Informations de l'établissement",
  'Photo de votre établissement',
  "Horaires d'ouvertures",
  "Réglages de l'imprimante",
  'Encaissement à table via mobile',
  'Réseaux Sociaux',
]) {
  assert.ok(settingsSource.includes(heading), `Groupe manquant: ${heading}`)
}
assert.ok(
  (settingsSource.match(/<v-card outlined class="pa-4(?: [^"]+)?">/g) || []).length >= 7,
  'Les groupes de réglages doivent utiliser le même style de carte'
)
assert.ok(!settingsSource.includes('receipt_display_settings'))
assert.ok(!settingsSource.includes('receipt_footer_message'))
console.log('receipt settings page tests passed')
