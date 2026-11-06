export const namespaced = true
export const state = () => ({ items: [], total: 0, metrics: {}, capabilities: {}, needsImport: false,
  selected: null, candidates: [], query: { q: '', filter: 'all', page: 1, pageSize: 25, sortBy: 'lastOrderAt', sortDesc: true },
  loading: { list: false, detail: false, candidates: false, action: false, export: false },
  errors: { list: '', detail: '', candidates: '', action: '', export: '' },
  sequence: { list: 0, detail: 0, candidates: 0, action: 0, export: 0 }, epoch: 0, owner: null })
const identity = root => JSON.stringify(root.users && root.users.user)
export const mutations = {
  RESET(current) { Object.assign(current, { ...state(), epoch: current.epoch + 1 }) },
  OWNER(current, owner) { current.owner = owner },
  QUERY(current, query) { current.query = { ...current.query, ...query } },
  START(current, lane) { current.sequence[lane]++; current.loading[lane] = true; current.errors[lane] = '' },
  DONE(current, lane) { current.loading[lane] = false },
  ERROR(current, { lane, error }) { current.errors[lane] = error },
  LIST(current, result) {
    current.items = result.items || []; current.total = result.total || 0; current.metrics = result.metrics || {}
    current.capabilities = result.capabilities || {}; current.needsImport = result.needsImport === true
  },
  DETAIL(current, result) { current.selected = result },
  CANDIDATES(current, result) { current.candidates = result.items || [] },
  CLEAR_DETAIL(current) { current.sequence.detail++; current.sequence.candidates++; current.selected = null; current.loading.detail = false; current.loading.candidates = false; current.errors.detail = ''; current.candidates = [] },
}
async function request(host, context, { lane, path = '', method = 'get', data, params, mutation, csv = false }) {
  const { state, rootState, commit } = context
  const user = rootState.users && rootState.users.user
  if (!user || !user.id || user.access == null || ![0, 1, 4, 5].includes(Number(user.access)) || ['service_point', 'customer'].includes(user.session_subject)) return null
  const owner = identity(rootState)
  if (state.owner !== owner) { commit('RESET'); commit('OWNER', owner) }
  commit('START', lane)
  const epoch = state.epoch; const sequence = state.sequence[lane]
  const current = () => epoch === state.epoch && sequence === state.sequence[lane] && owner === identity(rootState)
  try {
    const response = await host.$axios.request({ method, url: `/baseurl/api/v1/clients${path}`, data, params,
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      ...(csv ? { responseType: 'text', transformResponse: [value => value] } : {}) })
    if (!current()) return null
    const result = csv ? response.data : response.data && response.data.data
    if (result == null || (!csv && typeof result !== 'object')) throw new Error('Réponse clients invalide. Réessayez.')
    if (mutation) commit(mutation, result)
    return result
  } catch (error) {
    if (current()) commit('ERROR', { lane, error: error.response?.data?.message || error.message || 'Les clients sont indisponibles. Réessayez.' })
    return null
  } finally { if (current()) commit('DONE', lane) }
}
export const actions = {
  reset({ commit }) { commit('RESET') },
  clearDetail({ commit }) { commit('CLEAR_DETAIL') },
  load(context, query = {}) {
    // Scope reset precedes query so a first request retains its explicit search.
    if (context.state.owner !== identity(context.rootState)) { context.commit('RESET'); context.commit('OWNER', identity(context.rootState)) }
    context.commit('QUERY', query)
    return request(this, context, { lane: 'list', params: { ...context.state.query }, mutation: 'LIST' })
  },
  detail(context, id) {
    context.commit('CLEAR_DETAIL')
    return request(this, context, { lane: 'detail', path: `/${encodeURIComponent(id)}`, mutation: 'DETAIL' })
  },
  searchCandidates(context, q) {
    return request(this, context, { lane: 'candidates', params: { q, page: 1, pageSize: 25 }, mutation: 'CANDIDATES' })
  },
  exportCsv(context) { return request(this, context, { lane: 'export', path: '/export', params: { ...context.state.query }, csv: true }) },
  reconcile(context, dryRun = true) {
    return request(this, context, { lane: 'action', path: '/reconcile', method: 'post', data: { dryRun } })
  },
  linkContact(context, { contactKey, customerId }) {
    return request(this, context, { lane: 'action', path: `/contacts/${encodeURIComponent(contactKey)}/link`, method: 'post', data: { customerId } })
  },
}
