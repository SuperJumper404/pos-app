const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const Vue = require('vue')
const compiler = require('vue-template-compiler')

const root = path.resolve(__dirname, '..')
const componentPath = path.join(root, 'components', 'settings', 'StripeTerminalReaders.vue')
const page = fs.readFileSync(path.join(root, 'pages', 'settings.vue'), 'utf8')

assert.ok(fs.existsSync(componentPath), 'The Settings reader component must exist')
const source = fs.readFileSync(componentPath, 'utf8')
const parsed = compiler.parseComponent(source)
const template = compiler.compile(parsed.template.content)
assert.deepStrictEqual(template.errors, [])
const pageTemplate = compiler.compile(compiler.parseComponent(page).template.content)
const findComponent = (node) => {
  if (!node) return null
  if (node.tag === 'StripeTerminalReaders') return node
  for (const child of node.children || []) {
    const found = findComponent(child)
    if (found) return found
  }
  return null
}
const readerNode = findComponent(pageTemplate.ast)
assert.ok(readerNode, 'Settings must render the reader component')
assert.strictEqual(readerNode.attrsMap['v-if'], 'isAdmin')
assert.strictEqual(readerNode.attrsMap[':stripe-ready'], 'stripeReady')
assert.strictEqual(readerNode.attrsMap[':is-admin'], 'isAdmin')
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
assert.strictEqual(component.props.isAdmin.default, false)
const findNode = (node, predicate) => {
  if (!node) return null
  if (predicate(node)) return node
  for (const child of node.children || []) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return null
}
const dialog = findNode(template.ast, (node) => node.tag === 'v-dialog')
const dialogTitle = findNode(dialog, (node) => node.tag === 'v-card-title')
assert.strictEqual(dialog.attrsMap['aria-labelledby'], 'terminal-register-title')
assert.strictEqual(dialogTitle.attrsMap.id, 'terminal-register-title')
const dialogControls = []
const collectControls = (node) => {
  if (!node) return
  if (['v-text-field', 'v-select', 'v-btn'].includes(node.tag)) dialogControls.push(node)
  for (const child of node.children || []) collectControls(child)
}
collectControls(dialog)
assert.ok(dialogControls.length >= 8)
for (const control of dialogControls) {
  assert.ok((control.attrsMap[':disabled'] || '').includes('!stripeReady'),
    `${control.tag} must disable on Connect loss`)
}
const reader = {
  id: 7, label: 'S710 caisse', serialNumber: 's710-1', deviceType: 'stripe_s710',
  status: 'online', assignedUserId: 4, assignedServicePointId: null,
  isActive: true,
}
const deferred = () => {
  let settle
  const promise = new Promise((resolve) => { settle = resolve })
  return { promise, resolve: settle }
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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(gated.calls[1].payload || null)), { silent: true })
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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(staffFailure.calls[3].payload || null)), { silent: true })
  assert.strictEqual(staffFailure.instance.listError, '')

  const staleStaff = makeInstance({ ready: true })
  staleStaff.responses['staff/getAll'] = undefined
  await staleStaff.instance.loadData()
  assert.strictEqual(staleStaff.instance.staffLoaded, false)
  staleStaff.responses['staff/getAll'] = true
  await staleStaff.instance.refreshReaders()
  assert.deepStrictEqual(staleStaff.calls.map((call) => call.name), [
    'stripeTerminal/getReaders', 'staff/getAll',
    'stripeTerminal/refreshReaders', 'staff/getAll',
  ])
  assert.strictEqual(staleStaff.instance.staffLoaded, true)

  staffFailure.state.staff = [
    { id: 1, username: 'Admin', access: 0, status: 1 },
    { id: 2, username: 'Caisse', access: 1, status: '1' },
    { id: 3, username: 'Cuisine', access: 5, status: 1 },
    { id: 4, username: 'Ancienne caisse', access: 1, status: 0 },
    { id: 5, username: 'Compte désactivé', access: 0, status: '0' },
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

  const pendingRegistration = deferred()
  const concurrent = makeInstance({ ready: true })
  concurrent.responses['stripeTerminal/registerReader'] = pendingRegistration.promise
  concurrent.instance.registrationCode = 'first-code'
  concurrent.instance.readerLabel = 'Caisse'
  concurrent.instance.assignedUserId = 4
  concurrent.instance.address = { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR' }
  const firstAttempt = concurrent.instance.registerReader()
  assert.strictEqual(concurrent.instance.busy, true)
  concurrent.instance.registrationCode = 'second-code'
  await concurrent.instance.registerReader()
  assert.strictEqual(concurrent.instance.registrationCode, '')
  assert.strictEqual(concurrent.instance.busy, true)
  assert.strictEqual(concurrent.calls.length, 1)
  pendingRegistration.resolve(false)
  await firstAttempt
  assert.strictEqual(concurrent.instance.busy, false)

  const obsoleteRegistration = deferred()
  const reconnectedForm = makeInstance({ ready: true })
  reconnectedForm.responses['stripeTerminal/registerReader'] = obsoleteRegistration.promise
  reconnectedForm.instance.registrationCode = 'old-code'
  reconnectedForm.instance.readerLabel = 'Ancien'
  reconnectedForm.instance.assignedUserId = 4
  reconnectedForm.instance.address = { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR' }
  const oldAttempt = reconnectedForm.instance.registerReader()
  reconnectedForm.instance.stripeReady = false
  reconnectedForm.instance.resetConnection()
  assert.strictEqual(reconnectedForm.instance.registrationCode, '')
  reconnectedForm.instance.stripeReady = true
  reconnectedForm.instance.registrationCode = 'new-code'
  obsoleteRegistration.resolve(false)
  await oldAttempt
  assert.strictEqual(reconnectedForm.instance.registrationCode, 'new-code')

  const postalField = source.match(/<v-text-field\s+v-model="address\.postalCode"[\s\S]*?\/>/)
  assert.ok(postalField)
  assert.match(postalField[0], /:rules="\[postalCodeRule\]"/)
  assert.match(postalField[0], /maxlength="5"/)
  assert.match(postalField[0], /inputmode="numeric"/)
  assert.strictEqual(typeof first.instance.postalCodeRule, 'function')
  assert.strictEqual(first.instance.postalCodeRule('75001'), true)
  for (const value of ['7500', '750011', '75A01', '']) {
    assert.strictEqual(first.instance.postalCodeRule(value), 'Code postal : 5 chiffres requis.')
  }

  const inactive = makeInstance({ ready: true, readers: [{ ...reader, isActive: false }] })
  const inactiveReader = inactive.state.readers[0]
  inactive.instance.startAssignment(inactiveReader)
  assert.strictEqual(inactive.instance.editingReaderId, null)
  await inactive.instance.assignReader(inactiveReader, 5)
  assert.deepStrictEqual(inactive.calls, [])
  const assignButton = source.match(/<v-btn\s+icon\s+color="primary"\s+:disabled="([^"]+)"\s+:aria-label="`Réaffecter \$\{reader\.label\}`"/)
  assert.ok(assignButton && assignButton[1].includes('!reader.isActive'))
  const saveAssignment = source.match(/<v-btn\s+icon\s+color="primary"\s+:disabled="([^"]+)"\s+:aria-label="`Enregistrer l'affectation de \$\{reader\.label\}`"/)
  assert.ok(saveAssignment && saveAssignment[1].includes('!reader.isActive'))

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

  const firstReaders = deferred()
  const firstStaff = deferred()
  const reconnectedReaders = deferred()
  const reconnectedStaff = deferred()
  const queues = {
    'stripeTerminal/getReaders': [firstReaders.promise, reconnectedReaders.promise],
    'staff/getAll': [firstStaff.promise, reconnectedStaff.promise],
  }
  const reactiveCalls = []
  const ReactiveComponent = Vue.extend(component)
  ReactiveComponent.prototype.$store = {
    get: (key) => key === 'stripeTerminal/readers' ? [] : [],
    dispatch: (name, payload) => {
      reactiveCalls.push({ name, payload })
      return queues[name].shift()
    },
  }
  const previousSilent = Vue.config.silent
  Vue.config.silent = true
  const omittedAdmin = new ReactiveComponent({ propsData: { stripeReady: true } })
  assert.strictEqual(omittedAdmin.isAdmin, false)
  assert.deepStrictEqual(reactiveCalls, [])
  omittedAdmin.$destroy()
  const reactive = new ReactiveComponent({ propsData: { isAdmin: true, stripeReady: false } })
  assert.deepStrictEqual(reactiveCalls, [])
  reactive.stripeReady = true
  await Vue.nextTick()
  assert.strictEqual(reactiveCalls.length, 2)
  assert.strictEqual(reactive.busy, true)
  reactive.dialogOpen = true
  reactive.registrationCode = 'one-time-code'
  reactive.readerLabel = 'Caisse'
  reactive.assignedUserId = 4
  reactive.address = { line1: '1 rue A', postalCode: '75001', city: 'Paris', country: 'FR' }
  reactive.editingReaderId = 7
  reactive.assignmentUserId = 4
  reactive.stripeReady = false
  await Vue.nextTick()
  assert.strictEqual(reactive.dialogOpen, false)
  assert.strictEqual(reactive.registrationCode, '')
  assert.strictEqual(reactive.readerLabel, '')
  assert.strictEqual(reactive.assignedUserId, null)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(reactive.address)), {
    line1: '', postalCode: '', city: '', country: 'FR',
  })
  assert.strictEqual(reactive.editingReaderId, null)
  assert.strictEqual(reactive.assignmentUserId, null)
  assert.strictEqual(reactive.loadAttempted, false)
  reactive.stripeReady = true
  await Vue.nextTick()
  assert.strictEqual(reactiveCalls.length, 4)
  reconnectedReaders.resolve([reader])
  reconnectedStaff.resolve(true)
  await Vue.nextTick()
  await Promise.resolve()
  assert.strictEqual(reactive.listLoaded, true)
  assert.strictEqual(reactive.busy, false)
  assert.strictEqual(reactive.staffLoaded, true)
  firstReaders.resolve([])
  firstStaff.resolve(false)
  await Vue.nextTick()
  await Promise.resolve()
  assert.strictEqual(reactive.listLoaded, true)
  assert.strictEqual(reactive.staffLoaded, true)
  reactive.$destroy()
  Vue.config.silent = previousSilent
}

run().then(() => console.log('stripe terminal settings tests passed')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
