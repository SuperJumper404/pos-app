const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const compiler = require('vue-template-compiler')

const root = path.resolve(__dirname, '..')
const componentPath = path.join(root, 'components', 'settings', 'StripeTerminalReaders.vue')
const page = fs.readFileSync(path.join(root, 'pages', 'settings.vue'), 'utf8')

assert.ok(fs.existsSync(componentPath), 'The Settings reader component must exist')
const source = fs.readFileSync(componentPath, 'utf8')
const parsed = compiler.parseComponent(source)
const template = compiler.compile(parsed.template.content)
assert.deepStrictEqual(template.errors, [])
assert.match(page, /<StripeTerminalReaders\s+v-if="isAdmin"\s+:stripe-ready="stripeReady"\s*\/>/)
assert.ok(page.indexOf('<StripeTerminalReaders') > page.indexOf('Connecter Stripe'))
assert.match(page, /import StripeTerminalReaders from '@\/components\/settings\/StripeTerminalReaders'/)

for (const token of [
  'Connecter TPE', 'Code d’enregistrement', 'Nom du terminal', 'Adresse',
  'Code postal', 'Ville', 'Pays', 'Caissier', 'Aucun TPE connecté',
  'En ligne', 'Hors ligne', 'Actif', 'Inactif', 'Désactiver', 'Réactiver',
  'Réaffecter', 'mdi-refresh', 'mdi-account-switch', 'mdi-power',
  'v-tooltip', 'aria-label', 'v-skeleton-loader', 'v-alert',
]) {
  assert.ok(source.includes(token), `Missing reader UI: ${token}`)
}
assert.match(source, /<v-dialog[\s\S]*<v-form/)
assert.doesNotMatch(source, /\$axios|fetch\(/)
assert.match(page, /isAdmin\(\)/)

const script = parsed.script.content.replace('export default', 'return')
const component = vm.compileFunction(script, [])()
const reader = {
  id: 7, label: 'S710 caisse', serialNumber: 's710-1', deviceType: 'stripe_s710',
  status: 'online', assignedUserId: 4, assignedServicePointId: null,
  isActive: true,
}

const makeInstance = ({ ready = false, admin = true, readers = [] } = {}) => {
  const calls = []
  const state = { readers, loading: false, error: null, staff: [] }
  const responses = {}
  const instance = {
    ...component.data(),
    stripeReady: ready,
    isAdmin: admin,
    $refs: { registrationForm: { validate: () => true, resetValidation: () => {} } },
    $store: {
      get: (key) => ({
        'stripeTerminal/readers': state.readers,
        'stripeTerminal/loading': state.loading,
        'stripeTerminal/error': state.error,
        'staff/data': state.staff,
      })[key],
      dispatch: (name, payload) => {
        calls.push({ name, payload })
        return Promise.resolve(Object.hasOwnProperty.call(responses, name) ? responses[name] : true)
      },
    },
  }
  for (const [name, method] of Object.entries(component.methods)) {
    instance[name] = method.bind(instance)
  }
  for (const [name, getter] of Object.entries(component.computed)) {
    Object.defineProperty(instance, name, { get: () => getter.call(instance) })
  }
  return { instance, calls, responses, state }
}

const run = async () => {
  const gated = makeInstance()
  await gated.instance.loadData()
  assert.deepStrictEqual(gated.calls, [])
  gated.instance.stripeReady = true
  await gated.instance.loadData()
  assert.deepStrictEqual(gated.calls.map((call) => call.name), [
    'stripeTerminal/getReaders', 'staff/getAll',
  ])
  await gated.instance.loadData()
  assert.strictEqual(gated.calls.length, 2)

  const staffFailure = makeInstance({ ready: true })
  staffFailure.responses['staff/getAll'] = false
  await staffFailure.instance.loadData()
  assert.ok(staffFailure.instance.listError)
  staffFailure.responses['staff/getAll'] = true
  await staffFailure.instance.refreshReaders()
  assert.deepStrictEqual(staffFailure.calls.map((call) => call.name), [
    'stripeTerminal/getReaders', 'staff/getAll',
    'stripeTerminal/refreshReaders', 'staff/getAll',
  ])
  assert.strictEqual(staffFailure.instance.listError, '')

  staffFailure.state.staff = [
    { id: 1, username: 'Admin', access: 0 },
    { id: 2, username: 'Caisse', access: 1 },
    { id: 3, username: 'Cuisine', access: 5 },
  ]
  assert.deepStrictEqual(staffFailure.instance.cashiers.map((cashier) => cashier.id), [1, 2])

  const nonAdmin = makeInstance({ ready: true, admin: false })
  await nonAdmin.instance.loadData()
  assert.deepStrictEqual(nonAdmin.calls, [])

  const first = makeInstance({ ready: true })
  first.instance.registrationCode = ' 1234 '
  first.instance.readerLabel = ' Caisse '
  first.instance.assignedUserId = 4
  first.instance.address = { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR' }
  await first.instance.registerReader()
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first.calls[0])), {
    name: 'stripeTerminal/registerReader',
    payload: {
      registrationCode: '1234', label: 'Caisse', assignedUserId: 4,
      address: { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR' },
    },
  })
  assert.strictEqual(first.instance.registrationCode, '')

  const subsequent = makeInstance({ ready: true, readers: [reader] })
  subsequent.responses['stripeTerminal/registerReader'] = false
  subsequent.instance.registrationCode = '5678'
  subsequent.instance.readerLabel = 'Bar'
  subsequent.instance.assignedUserId = 4
  subsequent.instance.dialogOpen = true
  await subsequent.instance.registerReader()
  assert.strictEqual(subsequent.instance.registrationCode, '')
  assert.ok(!Object.hasOwnProperty.call(subsequent.calls[0].payload, 'address'))
  assert.strictEqual(subsequent.instance.dialogOpen, true)
  assert.ok(subsequent.instance.actionError)

  const actions = makeInstance({ ready: true, readers: [reader] })
  actions.instance.staffLoaded = true
  await actions.instance.assignReader(reader, 5)
  await actions.instance.setReaderActive(reader)
  await actions.instance.refreshReaders()
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actions.calls)), [
    { name: 'stripeTerminal/assignReader', payload: { id: 7, assignedUserId: 5 } },
    { name: 'stripeTerminal/setReaderActive', payload: { id: 7, isActive: false } },
    { name: 'stripeTerminal/refreshReaders' },
  ])
}

run().then(() => console.log('stripe terminal settings tests passed')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
