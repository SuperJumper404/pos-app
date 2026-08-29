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
assert.ok(
  settingsSource.includes('settings-page'),
  'La page reglages doit utiliser le layout overdrive dedie'
)
assert.ok(
  settingsSource.includes('settings-actionbar'),
  'La page reglages doit garder les actions principales dans le flux'
)
assert.ok(
  settingsSource.includes('settingsDirtyLabel'),
  'La page reglages doit exposer un etat de modification lisible'
)
assert.ok(!settingsSource.includes('settings-hero__meta'))
assert.ok(!settingsSource.includes('settings-hero__status'))
assert.ok(!settingsSource.includes('settings-state-pill'))
assert.ok(!settingsSource.includes('settingsSummaryItems'))
assert.strictEqual(
  (settingsSource.match(/Voir le site de mon restaurant/g) || []).length,
  1,
  'Le lien public doit etre dans la carte photo'
)
for (const label of [
  "Copier l'URL du site",
  "Copier l'URL click and collect",
]) {
  assert.ok(settingsSource.includes(label), `Bouton manquant: ${label}`)
}
for (const token of [
  'publicWebsiteUrl',
  'clickAndCollectUrl',
  'copyPublicUrl',
  'copiedPublicUrlType',
  'mdi-content-copy',
  'mdi-check',
]) {
  assert.ok(settingsSource.includes(token), `Copie URL publique manquante: ${token}`)
}
assert.ok(!settingsSource.includes('Voir le site\n'))
assert.ok(settingsSource.includes('settings-field'))
assert.ok(!settingsSource.includes('settings-cockpit'))
assert.ok(!settingsSource.includes('settings-savebar'))
assert.ok(!settingsSource.includes('settingsPulseClass'))
assert.ok(!settingsSource.includes('settings-nav'))
assert.ok(!settingsSource.includes('sectionRefs'))
assert.ok(
  settingsSource.includes('settings-main-grid'),
  'La page reglages doit utiliser une grille stable pour les panneaux'
)
assert.ok(
  /Horaires d'ouvertures[\s\S]*settings-hours-row[\s\S]*settings-hours-day[\s\S]*settings-hours-time/.test(
    settingsSource
  ),
  'La section horaires doit utiliser une grille compacte dediee'
)
assert.ok(
  /<v-row class="settings-main-grid">[\s\S]*<v-col cols="12" md="6" lg="6">[\s\S]*<v-card id="media"[\s\S]*<v-col cols="12" md="6" lg="6">[\s\S]*<v-card[\s\S]*id="horaires"/.test(
    settingsSource
  ),
  'La photo et les horaires doivent partager la grille haute en 50/50'
)
assert.ok(
  settingsSource.includes('settings-hours-card'),
  'La section horaires doit garder une classe dediee pour le polish UI'
)
assert.ok(
  settingsSource.includes('settings-hours-list'),
  'Les lignes horaires doivent etre regroupees dans une zone resserree'
)
assert.ok(
  settingsSource.includes('max-width: 620px'),
  'La section horaires doit limiter sa largeur interne'
)
assert.ok(
  settingsSource.includes('white-space: nowrap'),
  'Les jours comme Dimanche ne doivent pas passer sur deux lignes'
)
assert.ok(
  !settingsSource.includes('justify-content: space-evenly'),
  'Les horaires ne doivent plus etre etires sur toute la carte'
)
assert.ok(!settingsSource.includes('style="width: 100px"'))
assert.ok(!settingsSource.includes('style="width: 60px"'))
assert.ok(
  settingsSource.includes('settings-social-grid'),
  'Les reseaux sociaux doivent utiliser une grille propre'
)
assert.ok(
  settingsSource.includes('settings-section-title'),
  'Les panneaux doivent utiliser des titres iconifies coherents'
)
for (const icon of [
  'mdi-store-outline',
  'mdi-text-box-outline',
  'mdi-phone-outline',
  'mdi-map-marker-outline',
  'mdi-card-account-details-outline',
  'mdi-percent-outline',
  'mdi-receipt-text-outline',
  'mdi-cash-register',
]) {
  assert.ok(settingsSource.includes(`prepend-inner-icon="${icon}"`))
}
assert.match(
  settingsSource,
  /<v-textarea[\s\S]*v-model="formShop\.shop_description"[\s\S]*rows="3"[\s\S]*auto-grow/,
  'La description doit utiliser une zone de texte multi-lignes compacte'
)
assert.ok(
  !settingsSource.includes('position: sticky'),
  'Les actions ne doivent plus flotter au-dessus des champs'
)
assert.ok(!settingsSource.includes('style="max-width: 50%"'))
assert.ok(!settingsSource.includes('max-width="20%"'))
for (const field of [
  'shop_name',
  'shop_description',
  'shop_phone',
  'shop_status',
  'shop_adress',
  'shop_siret',
  'shop_naf',
]) {
  assert.match(
    settingsSource,
    new RegExp(`<v-col cols="12" md="6">[\\s\\S]*v-model="formShop\\.${field}"`)
  )
}
assert.match(
  settingsSource,
  /<v-col cols="12" md="6">[\s\S]*Avis client sur le ticket de caisse/
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
  (settingsSource.match(/<v-card(?: id="[^"]+")? outlined class="pa-4[^"]*"/g) || [])
    .length >= 7,
  'Les groupes de réglages doivent utiliser le même style de carte'
)
assert.ok(!settingsSource.includes('receipt_display_settings'))
assert.ok(!settingsSource.includes('receipt_footer_message'))
process.stdout.write('receipt settings page tests passed\n')
