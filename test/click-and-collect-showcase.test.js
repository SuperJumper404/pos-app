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

assert.match(pageSource, /v-if="socialLinks\.length"/)
assert.match(pageSource, /aria-label="Ouvrir Instagram"/)
assert.match(pageSource, /aria-label="Ouvrir Facebook"/)
assert.match(pageSource, /aria-label="Ouvrir TikTok"/)
assert.match(pageSource, /aria-label="Ouvrir Snapchat"/)
assert.match(pageSource, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/)
assert.match(pageSource, /<h2 class="font-weight-bold mb-3">/)
assert.match(pageSource, /<h2 class="text-center font-weight-bold mb-1">/)
assert.match(pageSource, /<small>SmartEat\.fr . 2026<\/small>/)
assert.doesNotMatch(pageSource, /@keyframes scroll-right/)
assert.match(pageSource, /<v-icon large color="white" class="bullhorn">/)
assert.match(pageSource, /\.product-showcase__track\s*\{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/)
assert.match(pageSource, /\.product-showcase__card\s*\{[\s\S]*?flex: 1 1/)
const practicalIndex = pageSource.indexOf('class="establishment-practical"')
const storyIndex = pageSource.indexOf('class="establishment-story"')
const showcaseIndex = pageSource.indexOf('class="product-showcase"')

assert.ok(practicalIndex >= 0, 'la section pratique doit exister')
assert.ok(storyIndex > practicalIndex, 'la présentation suit les informations pratiques')
assert.ok(showcaseIndex > storyIndex, 'la galerie suit la présentation')
assert.match(pageSource, /class="hero-order-action"/)
assert.match(pageSource, /:class="\{ 'is-today': i === currentDayIndex \}"/)
assert.match(pageSource, /\.establishment-practical[\s\S]*?display: grid;/)
assert.match(pageSource, /\.practical-hours__row\.is-today/)
assert.match(
  pageSource,
  /@media \(min-width: 768px\)[\s\S]*?\.hero-order-action[\s\S]*?display: inline-flex;/
)
assert.match(
  pageSource,
  /\.hero-order-action\s*\{[\s\S]*?display: none !important;/
)
assert.match(
  pageSource,
  /@media \(min-width: 768px\)[\s\S]*?\.hero-order-action[\s\S]*?display: inline-flex !important;/
)
assert.match(
  pageSource,
  /@media \(min-width: 768px\)[\s\S]*?\.order-cta[\s\S]*?display: none;/
)
assert.match(
  pageSource,
  /@media \(min-width: 768px\)[\s\S]*?\.order-cta[\s\S]*?display: none !important;/
)
assert.match(pageSource, /@media \(prefers-reduced-motion: reduce\)/)
assert.match(
  pageSource,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.social-icon,[\s\S]*?\.v-btn svg[\s\S]*?transition: none !important;/
)
const script = pageSource.match(/<script>([\s\S]*?)<\/script>/)[1]
const moduleRef = { exports: {} }

vm.runInNewContext(script.replace('export default', 'module.exports ='), {
  module: moduleRef,
  exports: moduleRef.exports,
  console: { log() {} },
})

const page = moduleRef.exports

function computed(name, context) {
  return page.computed[name].call(context)
}

async function createMountedPage(products) {
  let requestedUrl = ''
  const instance = {
    ...page.data(),
    $route: { params: { shopId: '42', shopName: 'Chez-Nous' } },
    $nuxt: { error(error) { throw error } },
    $store: {
      dispatch() { return Promise.resolve(true) },
      get() { return { id: 8 } },
    },
    $axios: {
      get(url) {
        requestedUrl = url
        return Promise.resolve({ data: { data: products } })
      },
    },
  }

  Object.entries(page.methods).forEach(([name, method]) => {
    instance[name] = method.bind(instance)
  })

  await page.mounted.call(instance)
  return { instance, requestedUrl }
}

;(async () => {
  const emptyPublicData = {
    shopInfo: {
      shop_hours: null,
      shop_social_media: null,
      shop_status: null,
    },
    isKitchenClosed: false,
  }

  assert.deepStrictEqual(Array.from(computed('shopHours', emptyPublicData)), [])
  assert.deepStrictEqual(
    { ...computed('shopSocialMedia', emptyPublicData) },
    {}
  )
  assert.strictEqual(computed('shopStatus', emptyPublicData), '')
  assert.deepStrictEqual(
    Array.from(computed('socialLinks', {
      ...emptyPublicData,
      shopSocialMedia: {},
    })),
    []
  )
  assert.strictEqual(
    computed('isRestaurantOpen', {
      ...emptyPublicData,
      shopHours: [],
    }),
    false
  )
  assert.strictEqual(
    computed('isRestaurantOpen', {
      isKitchenClosed: false,
      currentDayIndex: 0,
      shopHours: [{ isOpen: true, from: null, to: 24 }],
    }),
    false
  )
  assert.strictEqual(
    page.methods.formatOpeningHours({ isOpen: true, from: null, to: 18 }),
    'Horaires non renseignés'
  )
  assert.strictEqual(
    page.methods.formatOpeningHours({ isOpen: false }),
    'Fermé'
  )
  assert.strictEqual(
    page.methods.formatOpeningHours({ dayName: 'Lundi' }),
    'Horaires non renseignés'
  )
  assert.deepStrictEqual(
    Array.from(
      computed('socialLinks', {
        shopSocialMedia: {
          instagram: 'https://instagram.com/smarteat',
          facebook: '',
          tiktok: '   ',
          snapchat: 'https://snapchat.com/add/smarteat',
        },
      }),
      ({ name, href }) => ({ name, href })
    ),
    [
      { name: 'Instagram', href: 'https://instagram.com/smarteat' },
      { name: 'Snapchat', href: 'https://snapchat.com/add/smarteat' },
    ]
  )

  const products = [
    { id: 1, name: 'Burger', image: 'burger.jpg', price: 12.5 },
    { id: 2, name: 'Sans photo', image: '', price: 8 },
    { id: 3, name: 'Par defaut', image: 'default.png', price: 9 },
    { id: 4, name: 'Tacos', image: 'tacos.jpg', price: 11 },
  ]

  const { instance, requestedUrl } = await createMountedPage(products)

  assert.strictEqual(
    requestedUrl,
    '/baseurl/api/v1/products/click-and-collect/42'
  )
  assert.deepStrictEqual(
    Array.from(instance.showcaseProducts, (product) => product.id),
    [1, 4]
  )

  console.log('click-and-collect showcase tests passed')
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
