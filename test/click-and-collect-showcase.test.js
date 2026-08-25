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

assert.match(pageSource, /class="community-section"/)
assert.match(
  pageSource,
  /product-showcase__card:nth-child\(12\)[\s\S]*?grid-column: 1 \/ -1;/
)
assert.match(
  pageSource,
  /@media \(min-width: 768px\)[\s\S]*?product-showcase__card:nth-child\(11\),[\s\S]*?product-showcase__card:nth-child\(12\)[\s\S]*?grid-column: span 2;/
)
assert.doesNotMatch(pageSource, /product-showcase__card--offset/)
const practicalIndex = pageSource.indexOf('class="establishment-practical"')
const storyIndex = pageSource.indexOf('class="establishment-story"')
const showcaseIndex = pageSource.indexOf('class="product-showcase"')

assert.ok(practicalIndex >= 0, 'la section pratique doit exister')
assert.ok(storyIndex > practicalIndex, 'la présentation suit les informations pratiques')
assert.ok(showcaseIndex > storyIndex, 'la galerie suit la présentation')
assert.match(pageSource, /class="hero-order-action"/)
assert.match(pageSource, /:class="\{ 'is-today': i === currentDayIndex \}"/)
const script = pageSource.match(/<script>([\s\S]*?)<\/script>/)[1]
const moduleRef = { exports: {} }

vm.runInNewContext(script.replace('export default', 'module.exports ='), {
  module: moduleRef,
  exports: moduleRef.exports,
  console: { log() {} },
})

const page = moduleRef.exports

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
