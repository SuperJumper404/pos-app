const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
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
  const rootState = { users: { user: { id: 2, shopid: 7, access: 0 } } }
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
  const s = store({ $axios: { request: async input => { calls.push(input); return { data: input.responseType === 'blob' ? new Blob(['png']) : { success: true, data: { assetVersion: 'v' } } } } } })
  const body = new FormData(); body.append('strip', new Blob(['png']), 'strip.png')
  assert.equal((await s.run('uploadWalletAssets', body)).assetVersion, 'v')
  assert.equal(calls[0].data, body)
  const result = await s.run('loadWalletAssetPreview', '/baseurl/api/v1/loyalty/wallet/assets/00000000-0000-4000-8000-000000000001/strip.png')
  assert(result instanceof Blob); assert.equal(calls[1].responseType, 'blob')
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
  const ctx = { ...options.data(), recipient: null, loyalty: { busy: false }, $emit() {}, $store: { dispatch: async (action, input) => {
    calls.push({ action, input }); return action === 'loyalty/createCampaignDraft' ? { id: '12', recipientCount: 3, message: input.message } : { id: '12', status: 'queued' }
  } } }
  for (const [name, fn] of Object.entries(options.methods)) ctx[name] = fn.bind(ctx)
  ctx.message = 'Une nouvelle offre vous attend.'; await ctx.preview()
  assert.equal(ctx.draft.recipientCount, 3)
  await ctx.send()
  assert.equal(calls.find(call => call.action === 'loyalty/sendCampaign').input.campaignId, '12')
  assert.equal(calls.find(call => call.action === 'loyalty/sendCampaign').input.confirmed, true)
})
