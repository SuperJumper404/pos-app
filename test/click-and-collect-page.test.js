const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const pagePath = path.join(
  __dirname,
  '..',
  'pages',
  'click-and-collect',
  '_shopId',
  '_shopName.vue'
)
const pageSource = fs.readFileSync(pagePath, 'utf8')
const scriptMatch = pageSource.match(/<script>([\s\S]*?)<\/script>/)

assert.ok(scriptMatch, 'la page click-and-collect doit exposer son composant')
assert.ok(
  pageSource.includes('class="restaurant-profile-summary"'),
  'les informations restaurant doivent etre rendues sous la photo'
)
assert.ok(
  !/<v-img[\s\S]*class="hero-content"[\s\S]*<\/v-img>/.test(pageSource),
  'les informations restaurant ne doivent plus etre superposees a la photo'
)
assert.ok(
  pageSource.indexOf('class="restaurant-story"') <
    pageSource.indexOf('class="opening-hours-section"'),
  'la section A propos doit etre affichee avant les horaires'
)
assert.ok(
  pageSource.includes('CLICK & COLLECT'),
  'le bouton de commande doit reprendre le libelle click and collect'
)
assert.ok(
  pageSource.includes('hero-image-backdrop'),
  "l'image doit avoir un fond visuel pour rester lisible sans etre coupee"
)
assert.ok(
  pageSource.indexOf('class="restaurant-phone-link"') <
    pageSource.indexOf('class="restaurant-status-message"'),
  'le message status doit etre affiche sous le numero de telephone'
)
assert.ok(
  pageSource.includes('restaurant-address-link'),
  "le lien adresse doit avoir un style dedie pour aligner correctement l'icone"
)
assert.ok(
  /--cc-sticky-z:\s*60/.test(pageSource),
  'le bouton mobile doit rester au-dessus du contenu'
)
assert.ok(
  /bottom:\s*max\(12px,\s*env\(safe-area-inset-bottom\)\)/.test(pageSource),
  'le bouton mobile doit etre remonte au-dessus du bord bas mobile'
)

const moduleRef = { exports: {} }
vm.runInNewContext(scriptMatch[1].replace('export default', 'module.exports ='), {
  module: moduleRef,
  exports: moduleRef.exports,
  console: { log() {} },
})

const page = moduleRef.exports

function computed(name, context) {
  assert.strictEqual(
    typeof page.computed[name],
    'function',
    `la page doit definir le computed ${name}`
  )
  return page.computed[name].call(context)
}

const missingShopStore = {
  $store: {
    get() {
      return undefined
    },
  },
}

assert.deepStrictEqual(
  { ...computed('shopInfo', missingShopStore) },
  {},
  'un module shop absent ne doit pas casser le rendu initial'
)
assert.strictEqual(
  computed('clickAndCollectServicePoint', missingShopStore),
  undefined,
  'un point de service absent doit simplement desactiver le CTA'
)
assert.strictEqual(
  computed('isKitchenClosed', missingShopStore),
  undefined,
  "l'etat cuisine absent doit rester neutre"
)

const flatShopStoreValues = {
  'shop/shop': undefined,
  'shop/shop_name': 'Restaurant Demo',
  'shop/shop_adress': '13 Rue Boulevard de la Corniche',
  'shop/shop_phone': '06.12.34.56.78',
  'shop/shop_description': 'Cuisine maison',
  'shop/shop_hours': [{ day_name: 'Lundi', isOpen: true, from: 9, to: 18 }],
  'shop/shop_social_media': { instagram: 'https://instagram.com/demo' },
  'shop/shop_profile_image': 'demo.jpg',
  'shop/shop_status': 'Ouverture prochaine',
  'shop/clickAndCollectServicePoint': 7,
  'shop/kitchen_closed': false,
}
const flatShopContext = {
  $store: {
    get(pathName) {
      return flatShopStoreValues[pathName]
    },
  },
}

assert.deepStrictEqual(
  { ...computed('shopInfo', flatShopContext) },
  {
    shop_name: 'Restaurant Demo',
    shop_adress: '13 Rue Boulevard de la Corniche',
    shop_phone: '06.12.34.56.78',
    shop_description: 'Cuisine maison',
    shop_hours: [{ day_name: 'Lundi', isOpen: true, from: 9, to: 18 }],
    shop_social_media: { instagram: 'https://instagram.com/demo' },
    shop_profile_image: 'demo.jpg',
    shop_status: 'Ouverture prochaine',
  },
  'la page doit pouvoir lire le module shop plat existant'
)
assert.strictEqual(
  computed('clickAndCollectServicePoint', flatShopContext),
  7,
  'le CTA doit utiliser le point de service click-and-collect du store existant'
)

const emptyShop = {
  shopInfo: {
    shop_hours: null,
    shop_social_media: null,
    shop_status: null,
  },
  isKitchenClosed: false,
}

assert.deepStrictEqual(
  Array.from(computed('shopHours', emptyShop)),
  [],
  'des horaires absents doivent produire une liste vide'
)
assert.strictEqual(
  computed('shopStatus', emptyShop),
  '',
  'un statut absent ne doit pas casser le rendu'
)
assert.deepStrictEqual(
  { ...computed('shopSocialMedia', emptyShop) },
  {},
  'des reseaux sociaux absents doivent produire un objet vide'
)

const socialLinks = computed('socialLinks', {
  shopSocialMedia: {
    instagram: ' https://instagram.com/smarteat ',
    facebook: '',
    tiktok: '   ',
    snapchat: 'https://snapchat.com/add/smarteat',
  },
})

assert.deepStrictEqual(
  Array.from(socialLinks, ({ name, href, brandClass, color, backgroundColor }) => ({
    name,
    href,
    brandClass,
    color,
    backgroundColor,
  })),
  [
    {
      name: 'Instagram',
      href: 'https://instagram.com/smarteat',
      brandClass: 'social-action--instagram',
      color: '#E1306C',
      backgroundColor: '',
    },
    {
      name: 'Snapchat',
      href: 'https://snapchat.com/add/smarteat',
      brandClass: 'social-action--snapchat',
      color: '#000000',
      backgroundColor: '#FFFC00',
    },
  ],
  'les liens sociaux valides doivent garder leur couleur de marque'
)

assert.strictEqual(
  computed('isRestaurantOpen', {
    ...emptyShop,
    shopHours: [],
    currentDayIndex: 0,
  }),
  false,
  'un restaurant sans horaires ne doit pas etre annonce ouvert'
)

const currentDayIndex = computed('currentDayIndex', {})
assert.ok(
  Number.isInteger(currentDayIndex) && currentDayIndex >= 0 && currentDayIndex <= 6,
  "l'index du jour courant doit rester compatible avec les horaires du lundi au dimanche"
)

assert.strictEqual(
  page.methods.formatOpeningHours({ isOpen: true, from: null, to: 18 }),
  'Horaires non renseign\u00E9s'
)
assert.strictEqual(page.methods.formatOpeningHours({ isOpen: false }), 'Ferm\u00E9')
assert.strictEqual(
  page.methods.formatOpeningHours({ isOpen: true, from: 9, to: 18 }),
  '09:00 - 18:00'
)
assert.strictEqual(
  page.methods.formatOpeningHours({ isOpen: true, from: 0, to: 0 }),
  'Ferm\u00E9'
)
assert.strictEqual(page.methods.getDayName({ day_name: 'Mardi' }, 0), 'Mardi')
assert.strictEqual(page.methods.getDayName({ day: 'Mercredi' }, 0), 'Mercredi')
assert.strictEqual(page.methods.getDayName({}, 0), 'Lundi')
assert.strictEqual(
  page.methods.shopProfileImageSrc.call(
    {
      shopProfileImageFailed: true,
      fallbackHeroImage: 'fallback.jpg',
      staticURL: 'http://static.test',
    },
    'demo.jpg'
  ),
  'fallback.jpg'
)
assert.strictEqual(
  page.methods.shopProfileImageSrc.call(
    {
      shopProfileImageFailed: false,
      fallbackHeroImage: 'fallback.jpg',
      staticURL: 'http://static.test',
    },
    'demo.jpg'
  ),
  'http://static.test/api/v1/imgprofile/demo.jpg'
)

const dispatchedActions = []
page.mounted.call({
  $route: { params: { shopId: '12', shopName: 'demo' } },
  $router: { push() {} },
  $store: {
    dispatch(action, payload) {
      dispatchedActions.push({ action, payload })
    },
  },
})
assert.deepStrictEqual(dispatchedActions, [
  { action: 'shop/getShopInfoClickAndCollect', payload: '12' },
])
