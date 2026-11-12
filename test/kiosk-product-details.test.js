/* eslint-disable no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const Vue = require('vue')
const Vuetify = require('vuetify')
const compiler = require('vue-template-compiler')
const { createRenderer } = require('vue-server-renderer')
const customizations = require('../helpers/customizations')

Vue.use(Vuetify)
const root = path.resolve(__dirname, '..')
const renderer = createRenderer()
const child = { render: (h) => h('div') }

const loadComponent = (file, dependencies) => {
  const parsed = compiler.parseComponent(
    fs.readFileSync(path.join(root, file), 'utf8')
  )
  const script = parsed.script.content
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace('export default', 'return')
  const localRequire = (name) =>
    require(name.startsWith('@/') ? path.join(root, name.slice(2)) : name)
  // eslint-disable-next-line no-new-func
  const options = new Function('require', ...Object.keys(dependencies), script)(
    localRequire,
    ...Object.values(dependencies)
  )
  return { ...options, ...compiler.compileToFunctions(parsed.template.content) }
}

const wizardOptions = loadComponent(
  'components/products/ProductCustomizationWizard.vue',
  { ...customizations, CustomizationChoiceCard: child, CustomizationSummary: child }
)
const Wizard = Vue.extend(wizardOptions)
const kiosk = loadComponent('pages/borne.vue', {
  price: {},
  ProductCustomizationWizard: Wizard,
})
const createWizard = (product, props = {}) =>
  new Wizard({
    vuetify: new Vuetify(),
    propsData: { product, showProductDetails: true, ...props },
  })

const product = {
  id: 7,
  name: 'Falafel',
  price: 6.9,
  description: 'Galettes de pois chiches, crudités et pain pita.',
  customization_steps: [
    { product_step_id: 10, position: 0, active: false, choices: [] },
    {
      product_step_id: 20,
      position: 1,
      name: 'Sauces',
      minimum_choices: 0,
      maximum_choices: 8,
      choices: [{ product_step_choice_id: 21, name: 'Barbecue', active: true }],
    },
    {
      product_step_id: 30,
      position: 2,
      name: 'Boissons',
      minimum_choices: 0,
      maximum_choices: 1,
      choices: [{ product_step_choice_id: 31, name: 'Eau', active: true }],
    },
  ],
}

const findNode = (node, predicate) => {
  if (predicate(node)) return node
  for (const childNode of node.children || node.componentOptions?.children || []) {
    const found = findNode(childNode, predicate)
    if (found) return found
  }
  return null
}

const run = async () => {
  const wizard = createWizard(product, { productImage: '/falafel.jpg' })
  let html = await renderer.renderToString(wizard)
  assert.ok(html.includes(product.description), 'show the product description on opening')
  assert.ok(html.indexOf(product.description) < html.indexOf('Sauces'))
  const image = findNode(wizard._render(), (node) => node.componentOptions?.tag === 'v-img')
  assert.strictEqual(image.componentOptions.propsData.src, '/falafel.jpg')
  assert.ok(html.includes('Étape 1 / 2'), 'use the first visible step after skipped steps')
  wizard.goForward()
  await Vue.nextTick()
  html = await renderer.renderToString(wizard)
  assert.ok(!html.includes(product.description), 'later steps leave room for choices')
  wizard.goForward()
  await Vue.nextTick()
  html = await renderer.renderToString(wizard)
  assert.ok(!html.includes(product.description), 'the summary does not repeat the description')
  wizard.goBack()
  wizard.goBack()
  await Vue.nextTick()
  assert.ok((await renderer.renderToString(wizard)).includes(product.description))
  wizard.$destroy()

  const normalWizard = createWizard(product, { showProductDetails: false })
  assert.ok(!(await renderer.renderToString(normalWizard)).includes(product.description))
  normalWizard.$destroy()

  const longDescription = `${'Une recette généreuse avec des légumes frais. '.repeat(12)}Fin de la description.`
  const longWizard = createWizard({ ...product, description: longDescription })
  html = await renderer.renderToString(longWizard)
  assert.ok(html.includes('Voir plus'))
  assert.ok(!html.includes('Fin de la description.'))
  const expandButton = findNode(longWizard._render(), (node) =>
    Boolean(node.data?.attrs && 'aria-expanded' in node.data.attrs)
  )
  expandButton.componentOptions.listeners.click()
  await Vue.nextTick()
  html = await renderer.renderToString(longWizard)
  assert.ok(html.includes('Fin de la description.'))
  assert.ok(html.includes('Voir moins'))
  longWizard.product = { ...product, id: 8, description: longDescription }
  await Vue.nextTick()
  assert.ok(!(await renderer.renderToString(longWizard)).includes('Fin de la description.'))
  longWizard.$destroy()

  const emptyWizard = createWizard({ ...product, description: '   ' })
  assert.ok(!(await renderer.renderToString(emptyWizard)).includes('Présentation du produit'))
  emptyWizard.$destroy()
  const escapedWizard = createWizard({ ...product, description: '<b>Fait maison</b>' })
  assert.ok((await renderer.renderToString(escapedWizard)).includes('&lt;b&gt;Fait maison&lt;/b&gt;'))
  escapedWizard.$destroy()

  const simpleProduct = { ...product, customization_steps: [] }
  const simpleWizard = createWizard(simpleProduct)
  html = await renderer.renderToString(simpleWizard)
  assert.ok(html.includes(simpleProduct.description))
  assert.ok(html.includes('Ajouter au panier'))
  assert.ok(!html.includes('Votre sélection'))
  assert.ok(!html.includes('Résumé'))
  assert.ok(!html.includes('Étape'))
  assert.ok(!html.includes('Continuer'))
  assert.strictEqual(simpleWizard.backButtonLabel, 'Annuler')

  const vm = {
    checkoutInteractionLocked: false,
    isKitchenClosed: false,
    cartItems: [],
    selectedChoices: [123],
    selectedProduct: null,
    customizationDialog: false,
  }
  for (const method of ['openProduct', 'closeCustomization', 'confirmCustomization', 'addToCart']) {
    vm[method] = kiosk.methods[method].bind(vm)
  }
  vm.openProduct(simpleProduct)
  assert.strictEqual(vm.cartItems.length, 0, 'opening a simple product must not add it')
  assert.strictEqual(vm.customizationDialog, true)
  assert.strictEqual(vm.selectedProduct.id, simpleProduct.id)
  vm.closeCustomization()
  assert.strictEqual(vm.cartItems.length, 0, 'canceling adds nothing')
  vm.openProduct(simpleProduct)
  simpleWizard.$on('confirm', vm.confirmCustomization)
  simpleWizard.confirmCustomization()
  assert.strictEqual(vm.cartItems.length, 1)
  assert.strictEqual(vm.cartItems[0].price, 6.9)
  assert.strictEqual(vm.cartItems[0].qty, 1)
  assert.deepStrictEqual(vm.cartItems[0].selectedChoiceIds, [])
  assert.strictEqual(vm.customizationDialog, false)
  assert.strictEqual(vm.selectedProduct, null)
  simpleWizard.$destroy()

  vm.openProduct(product)
  assert.deepStrictEqual(vm.selectedChoices, [])
  vm.closeCustomization()
  for (const blocked of [
    { checkoutInteractionLocked: true },
    { isKitchenClosed: true },
    { unavailable: true },
  ]) {
    vm.checkoutInteractionLocked = Boolean(blocked.checkoutInteractionLocked)
    vm.isKitchenClosed = Boolean(blocked.isKitchenClosed)
    vm.openProduct({ ...simpleProduct, archived: blocked.unavailable ? 1 : 0 })
    assert.strictEqual(vm.customizationDialog, false, 'preserve kiosk availability guards')
    assert.strictEqual(vm.cartItems.length, 1)
  }

  const skippedWizard = createWizard({
    ...product,
    customization_steps: [{ active: false, choices: [] }],
  })
  html = await renderer.renderToString(skippedWizard)
  assert.ok(html.includes(product.description))
  assert.ok(!html.includes('Votre sélection'))
  assert.ok(!html.includes('Étape'))
  skippedWizard.$destroy()
  console.log('kiosk product details behavior tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
