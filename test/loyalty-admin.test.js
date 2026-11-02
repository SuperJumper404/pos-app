const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { test } = require('node:test')
const { canAccessModule, getAccessibleNavigationItems } = require('../helpers/staffRoles')
function load(relative) {
  const filename = path.join(__dirname, '..', relative)
  assert(fs.existsSync(filename), `${relative} must exist`)
  let source = fs.readFileSync(filename, 'utf8')
  if (relative.endsWith('.vue')) {
    const sfc = require('vue-template-compiler').parseComponent(source)
    assert.deepEqual(require('vue-template-compiler').compile(sfc.template.content).errors, [])
    source = sfc.script.content
  }
  const code = require('@babel/core').transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  const module = { exports: {} }
  vm.compileFunction(code, ['module', 'exports', 'require'])(module, module.exports, name => name.startsWith('@/components/') ? {} : name === './delivery' ? { buildDeliveryApi: () => ({}) } : require(name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name))
  return module.exports
}
function store(host) {
  const module = load('store/loyalty.js'); const state = module.state()
  const rootState = { users: { user: { id: 2, shopid: 7, access: 0, token: 'staff-admin-token' } } }
  const context = { state, rootState, commit: (name, value) => module.mutations[name](state, value) }
  return { state, rootState, run: (name, input) => module.actions[name].call(host, context, input) }
}
test('loyalty administration navigation is exclusive to administrators and keeps hidden catalog modules hidden', () => {
  assert.equal(canAccessModule(0, 'loyalty', [], false), true)
  for (const role of [null, 1, 2, 3, 4, 5, 6]) assert.equal(canAccessModule(role, 'loyalty', ['loyalty'], true), false)
  const items = load('helpers/listdashboard.js').default.computed.list.call({ shopId: 7, shop_name: 'Restaurant' })
  const visible = getAccessibleNavigationItems(0, items, [], true)
  assert(visible.some(item => item.to === '/fidelite'))
  assert(visible.every(item => !['categories', 'customizations', 'stocks'].includes(item.moduleKey)))
})
test('admin upload preserves FormData and artwork previews use an authenticated Blob request', async () => {
  const calls = []
  const s = store({ $axios: { request: input => { calls.push(input); return { data: input.responseType === 'blob' ? new Blob(['png']) : { success: true, data: { assetVersion: 'v' } } } } } })
  const body = new FormData(); body.append('strip', new Blob(['png']), 'strip.png')
  assert.equal((await s.run('uploadWalletAssets', body)).assetVersion, 'v')
  assert.equal(calls[0].data, body)
  assert.equal((calls[0].headers || {}).Authorization, 'Bearer staff-admin-token')
  assert.equal((calls[0].headers || {})['Content-Type'], undefined, 'the browser sets the multipart boundary')
  const result = await s.run('loadWalletAssetPreview', '/baseurl/api/v1/loyalty/wallet/assets/00000000-0000-4000-8000-000000000001/strip.png')
  assert(result instanceof Blob); assert.equal(calls[1].responseType, 'blob')
  assert.equal((calls[1].headers || {}).Authorization, 'Bearer staff-admin-token')
})

test('missing administrator credentials never send an anonymous Wallet upload', async () => {
  const calls = []
  const s = store({ $axios: { request: input => { calls.push(input); return { data: { data: { assetVersion: 'v' } } } } } })
  s.rootState.users.user.token = null
  const body = new FormData(); body.append('logo', new Blob(['png']), 'logo.png')
  assert.equal(await s.run('uploadWalletAssets', body), null)
  assert.equal(calls.length, 0)
  assert(s.state.assetsError)
  assert.equal(s.state.assetsBusy, false)
})

test('notification icons have authenticated previews and old artwork without an icon stays usable', async () => {
  const calls = []
  const s = store({ $axios: { request: input => { calls.push(input); return Promise.reject(Object.assign(new Error('Not found'), { response: { status: 404 } })) } } })
  const preview = await s.run('loadWalletAssetPreview', '/baseurl/api/v1/loyalty/wallet/assets/00000000-0000-4000-8000-000000000001/icon.png')
  assert.equal(preview, null)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].headers.Authorization, 'Bearer staff-admin-token')
  assert.equal(s.state.assetsError, '')
})

test('an optional missing icon stays harmless through the real Axios and Nuxt error interceptor', async () => {
  const http = require('http'); const client = require('axios').create()
  const server = http.createServer((req, res) => { res.writeHead(404); res.end('Not Found') })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  // Nuxt Axios invokes onError callbacks before the caller receives a rejection.
  client.onError = fn => client.interceptors.response.use(undefined, error => fn(error) || Promise.reject(error))
  load('plugins/axios.js').default({ $axios: client, redirect() {}, store: { dispatch() {} } })
  const s = store({ $axios: { request: input => client.request({ ...input, url: `http://127.0.0.1:${server.address().port}` }) } })
  try {
    const result = await s.run('loadWalletAssetPreview', '/baseurl/api/v1/loyalty/wallet/assets/00000000-0000-4000-8000-000000000001/icon.png')
    assert.equal(result, null)
    assert.equal(s.state.assetsError, '', 'a missing optional icon must not show an unavailable-program alert')
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})

test('editor publishes a notification icon without requiring another logo or banner', async () => {
  const options = load('components/loyalty/LoyaltyCardEditor.vue').default
  const ctx = { ...options.data.call({ program: {} }), working: false, icon: new Blob(['icon']),
    $emit() {}, $store: { dispatch: (action, body) => {
      assert.equal(action, 'loyalty/uploadWalletAssets')
      assert.deepEqual([...body.keys()], ['icon', 'icon2x', 'icon3x'])
      return { assetVersion: 'new-icon' }
    } },
  }
  const oldImage = global.Image; const oldDocument = global.document
  global.Image = class { constructor() { this.width = 600; this.height = 600 } get src() { return this.source } set src(value) { this.source = value; this.onload() } }
  global.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob(['png'])) }) }
  try {
    await options.methods.publish.call(ctx)
    assert.match(ctx.message, /Visuel publié/)
    assert.equal(ctx.publishing, false)
  } finally { global.Image = oldImage; global.document = oldDocument }
  const source = fs.readFileSync(path.join(__dirname, '../components/loyalty/LoyaltyCardEditor.vue'), 'utf8')
  assert.match(source, /Icône des notifications Apple Wallet/)
  assert.match(source, /Logo Google Wallet/)
})
test('a late administrator list result cannot replace a newer filter or a different restaurant', async () => {
  const replies = []
  const s = store({ $deliveryApi: { request: input => new Promise(resolve => replies.push({ input, resolve })) } })
  const first = s.run('loadMembers', { page: 1, pageSize: 25, search: 'old' })
  const second = s.run('loadMembers', { page: 2, pageSize: 25, search: 'new' })
  assert.equal(replies.length, 2)
  replies[1].resolve({ data: { data: { items: [{ id: 'new' }], total: 50, page: 2 } } }); await second
  replies[0].resolve({ data: { data: { items: [{ id: 'old' }], total: 1 } } }); await first
  assert.equal(s.state.members[0].id, 'new'); assert.equal(s.state.membersTotal, 50)
})
test('all new admin components compile and a campaign uses the previewed draft for confirmation', async () => {
  load('components/loyalty/LoyaltyMembers.vue'); load('components/loyalty/LoyaltyCardEditor.vue')
  const options = load('components/loyalty/LoyaltyCampaigns.vue').default
  const calls = []
  const ctx = { ...options.data(), recipient: null, loyalty: { busy: false }, $emit() {}, $store: { dispatch: (action, input) => {
    calls.push({ action, input }); return action === 'loyalty/createCampaignDraft' ? { id: '12', recipientCount: 3, message: input.message } : { id: '12', status: 'queued' }
  } } }
  for (const [name, fn] of Object.entries(options.methods)) ctx[name] = fn.bind(ctx)
  ctx.message = 'Une nouvelle offre vous attend.'; await ctx.preview()
  assert.equal(ctx.draft.recipientCount, 3)
  await ctx.send()
  assert.equal(calls.find(call => call.action === 'loyalty/sendCampaign').input.campaignId, '12')
  assert.equal(calls.find(call => call.action === 'loyalty/sendCampaign').input.confirmed, true)
})
