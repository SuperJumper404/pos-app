/* eslint-disable no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const Vue = require('vue')
const imageLibrary = require('../helpers/productImageLibrary')

const loadComponent = (filename, globals = {}) => {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  const context = {
    module: { exports: {} },
    ...imageLibrary,
    ProductImageLibraryPicker: {},
    FormData,
    ...globals,
  }
  vm.runInNewContext(
    script
      .replace(/import[\s\S]*?from ['"][^'"]+['"]\s*/g, '')
      .replace('export default', 'module.exports ='),
    context
  )
  return context.module.exports
}

const createPicker = (fetch) => {
  const timers = new Map()
  let timerId = 0
  const options = loadComponent(
    'components/products/ProductImageLibraryPicker.vue',
    {
      fetch,
      setTimeout(callback) {
        timers.set(++timerId, callback)
        return timerId
      },
      clearTimeout(id) {
        timers.delete(id)
      },
    }
  )
  const picker = new Vue(options)
  picker.config = { url: 'https://storage.example', bucket: 'images', anonKey: 'anon' }
  return {
    picker,
    timers,
    flushSearch() {
      const callbacks = Array.from(timers.values())
      timers.clear()
      return Promise.all(callbacks.map((callback) => callback()))
    },
  }
}

const response = (files) => ({ ok: true, json: () => Promise.resolve(files) })

async function run() {
  const bucket = Array.from({ length: 205 }, (_, index) => ({
    name: `image-${String(index).padStart(3, '0')}.webp`,
    metadata: { mimetype: 'image/webp' },
  }))
  bucket.push({ name: 'zz-pizza.webp', metadata: { mimetype: 'image/webp' } })
  const requests = []
  const { picker, timers, flushSearch } = createPicker((url, options) => {
    const body = JSON.parse(options.body)
    requests.push({ url, body, headers: options.headers })
    const matches = bucket.filter((file) => file.name.includes(body.search || ''))
    return Promise.resolve(response(matches.slice(body.offset, body.offset + body.limit)))
  })

  await picker.loadImages()
  assert.strictEqual(picker.filteredImages.length, 200)
  assert.strictEqual(picker.hasMore, true)
  await picker.loadImages({ append: true })
  assert.strictEqual(requests[1].body.offset, 200)
  assert.strictEqual(picker.filteredImages.length, 206)
  assert.strictEqual(picker.hasMore, false)

  picker.search = 'zz'
  await Vue.nextTick()
  picker.search = '  zz-pizza  '
  await Vue.nextTick()
  assert.strictEqual(requests.length, 2, 'typing must wait before querying Storage')
  assert.strictEqual(timers.size, 1, 'rapid typing must collapse into one request')
  await flushSearch()
  assert.strictEqual(requests[2].body.search, 'zz-pizza')
  assert.strictEqual(requests[2].body.offset, 0)
  assert.strictEqual(requests[2].url, 'https://storage.example/storage/v1/object/list/images')
  assert.strictEqual(requests[2].headers.apikey, 'anon')
  assert.strictEqual(picker.filteredImages[0].name, 'zz-pizza.webp')
  assert.strictEqual(picker.filteredImages.length, 1)

  picker.search = null
  await Vue.nextTick()
  await flushSearch()
  assert.strictEqual(requests[3].body.search, '')
  assert.strictEqual(picker.filteredImages.length, 200)
  picker.$destroy()

  // A previous request can finish while the next search is still debouncing.
  const pending = []
  const race = createPicker(() => new Promise((resolve) => pending.push(resolve)))
  const previous = race.picker.loadImages()
  race.picker.search = 'pizza'
  await Vue.nextTick()
  pending[0](response([{ name: 'old.webp' }]))
  await previous
  assert.strictEqual(race.picker.images.length, 0)
  assert.strictEqual(race.picker.loading, true)
  const latest = race.flushSearch()
  pending[1](response([{ name: 'pizza.webp' }]))
  await latest
  assert.strictEqual(race.picker.filteredImages[0].name, 'pizza.webp')
  assert.strictEqual(race.picker.loading, false)
  race.picker.search = 'cancelled'
  await Vue.nextTick()
  race.picker.$destroy()
  assert.strictEqual(race.timers.size, 0, 'closing the picker must cancel queued searches')

  const failure = createPicker(() => Promise.resolve({ ok: false }))
  await failure.picker.loadImages()
  assert.ok(failure.picker.error)
  assert.strictEqual(failure.picker.loading, false)
  failure.picker.$destroy()

  const unconfigured = createPicker(() => assert.fail('configuration is required'))
  unconfigured.picker.config = null
  unconfigured.picker.error = 'Configuration Supabase incomplete.'
  unconfigured.picker.search = 'pizza'
  await Vue.nextTick()
  assert.strictEqual(unconfigured.picker.error, 'Configuration Supabase incomplete.')
  assert.strictEqual(unconfigured.timers.size, 0)
  unconfigured.picker.$destroy()

  const choiceOptions = loadComponent('components/customizations/ChoiceEditor.vue')
  const choice = new Vue({
    ...choiceOptions,
    propsData: { value: { id: 1, choice_type: 'simple', name: 'Sauce', active: true } },
  })
  const file = new Blob(['library image'], { type: 'image/webp' })
  let cropperInput
  choice.$refs.choiceImageCropper = { loadFile: (input) => { cropperInput = input } }
  choice.imageLibraryDialog = true
  choice.useLibraryImage(file)
  assert.strictEqual(cropperInput, file)
  assert.strictEqual(choice.imageLibraryDialog, false)
  assert.strictEqual(choice.image, null, 'the selected file must be cropped before saving')

  const cropped = new Blob(['cropped choice image'], { type: 'image/webp' })
  choice.image = cropped
  choice.$refs.form = { validate: () => true }
  let saved
  choice.$on('save', (data) => { saved = data })
  choice.submit()
  assert.strictEqual(saved.get('name'), 'Sauce')
  assert.strictEqual(await saved.get('image').text(), 'cropped choice image')
  assert.strictEqual(saved.get('image').name, 'choice.webp')

  cropperInput = null
  choice.form.choice_type = 'linked_product'
  choice.useLibraryImage(file)
  assert.strictEqual(cropperInput, null, 'linked choices must keep the product image')
  choice.$destroy()
  console.log('product image library remote search and choice tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
