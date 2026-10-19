import axios from 'axios'
import settle from 'axios/lib/core/settle'
import buildURL from 'axios/lib/helpers/buildURL'
const { v4: operatorKey } = require('uuid')
const { buildCheckoutItems } = require('../helpers/customizations')
const { canOperateDelivery, isDeliveryAdmin } = require('../helpers/staffRoles')
const operatorState = () => ({ identity: null, sequence: 0, missions: [], couriers: [], holders: [], settings: null,
  balances: {}, eligibility: {}, eligibilityChecks: {}, pending: {}, reads: {}, error: null, loading: 0 })

export const namespaced = true
export const state = () => ({ shopId: null, enabled: false, loaded: false, epoch: 0, quoteSequence: 0,
  currentQuote: null, error: null, discount: { type: 'none', value: 0 }, profiles: [], addresses: [], posDraft: null, operator: operatorState() })
const initialState = state
const validShop = value => Number.isInteger(value) && value > 0
const validId = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
const bearer = () => typeof localStorage === 'undefined' ? '' : localStorage.getItem('token') || ''
const postalBody = payload => payload.selectionToken !== undefined ? { selectionToken: payload.selectionToken } : ({ address: Object.fromEntries(['street', 'postalCode', 'city', 'country']
  .map(key => [key, payload.address && payload.address[key]])), ...(payload.candidateId ? { candidate_id: payload.candidateId } : {}) })

// A separate Axios instance keeps personal HTTP failures out of the staff logout interceptor.
export function buildDeliveryApi({ baseURL, adapter, fetch: fetchRequest = globalThis.fetch }) {
  const browserAdapter = async config => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeout)
    try {
      const response = await fetchRequest(buildURL(new URL(config.url, config.baseURL).href, config.params), {
        method: config.method.toUpperCase(), headers: config.headers, body: config.data,
        credentials: config.withCredentials ? 'include' : 'omit', signal: controller.signal,
      })
      const result = { config, status: response.status, statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()), data: await response.text() }
      return await new Promise((resolve, reject) => settle(resolve, reject, result))
    } finally { clearTimeout(timer) }
  }
  const transport = new axios.Axios({ baseURL, adapter: adapter || browserAdapter, timeout: 15000, withCredentials: false,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    transformRequest: [body => body === undefined ? undefined : JSON.stringify(body)],
    transformResponse: [body => typeof body === 'string' ? JSON.parse(body) : body],
    validateStatus: status => status >= 200 && status < 300 })
  return { request: ({ method = 'get', path, body, csrfToken, credentials = false, params }) => transport.request({
    method, url: `/baseurl/api/v1${path}`, data: body, params, withCredentials: credentials,
    headers: { Authorization: `Bearer ${bearer()}`, ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
  }) }
}
const api = store => store.$deliveryApi || (store.$deliveryApi = buildDeliveryApi({ baseURL: process.env.privateURL }))
const unwrap = response => response && response.data && response.data.data
const asError = failure => {
  const dto = failure.response && failure.response.data
  const messages = {
    DELIVERY_GEOCODING_UNAVAILABLE: 'La recherche d\'adresse est indisponible. Reessayez.',
    DELIVERY_GEOCODING_RATE_LIMITED: 'La recherche d\'adresse est occupee. Patientez puis reessayez.',
    DELIVERY_DISABLED: 'La livraison est suspendue. Votre panier est conserve.',
    DELIVERY_OUT_OF_RANGE: 'Cette adresse est hors du rayon de livraison. Corrigez l\'adresse ou choisissez un autre mode.',
    DELIVERY_MINIMUM_NOT_MET: 'Le minimum de produits pour la livraison n\'est pas atteint. Votre panier est conserve.',
    DELIVERY_ADDRESS_INVALID: 'Validez une adresse postale precise avant de continuer.',
    DELIVERY_VERSION_CONFLICT: 'Le dossier a change. Relisez son etat actuel puis confirmez a nouveau.',
    COURIER_CASH_VERSION_CONFLICT: 'Le solde a change. Verifiez le nouvel attendu avant de confirmer.',
    DELIVERY_REFUND_CUSTODY_INSUFFICIENT: 'La source ne detient plus assez d\'especes pour cette restitution complete. Verifiez le solde ; une restitution par la caisse reste distincte.',
    DELIVERY_REFUND_NOT_ALLOWED: 'Ce paiement ne permet pas ce remboursement manuel. Relisez le paiement actuel.',
    DELIVERY_TERMINAL_HISTORY_REQUIRED: 'Correction refusee : historique operationnel valide indisponible.',
    DELIVERY_UTC_SESSION_REQUIRED: 'Activation indisponible : la session de base doit etre UTC. Faites verifier la base horaire des anciennes archives et clotures avant activation.',
  }
  const code = dto && (dto.error || (dto.data && dto.data.code))
  const error = new Error(messages[code] || dto && dto.message || failure.message || 'Livraison indisponible. Reessayez.')
  error.code = dto && (dto.error || (dto.data && dto.data.code)) || 'DELIVERY_UNAVAILABLE'
  error.status = failure.response ? failure.response.status : 0
  error.candidates = dto && dto.data && Array.isArray(dto.data.candidates) ? dto.data.candidates.map(candidate => ({
    providerId: candidate.providerId, providerLabel: candidate.providerLabel,
  })) : []
  return error
}

const actorIdentity = user => JSON.stringify([user && user.shopid, user && user.id, user && user.access,
  user && user.status, user && user.session_subject, user && user.module_permissions])
const operatorUser = rootState => rootState.users && rootState.users.user
export const operatorIdentity = rootState => JSON.stringify([rootState.authenticated !== false, actorIdentity(operatorUser(rootState))])
const assertOperator = (rootState, admin = false) => {
  const user = operatorUser(rootState)
  if (rootState.authenticated === false || !(admin ? isDeliveryAdmin(user) : canOperateDelivery(user))) throw new Error('Acces livraison refuse.')
  return user
}
const commandSlot = input => `${input.operation}:${input.deliveryId || input.courierId}`
const clone = value => JSON.parse(JSON.stringify(value))

export const mutations = {
  RESET(state, shopId) { Object.assign(state, { ...initialState(), shopId, epoch: state.epoch + 1, operator: state.operator }) },
  AVAILABILITY(state, enabled) { state.enabled = enabled === true; state.loaded = true },
  QUOTE_START(state) { state.quoteSequence++; state.currentQuote = null; state.error = null },
  QUOTE(state, quote) { state.currentQuote = quote },
  ERROR(state, error) { state.error = error },
  DISCOUNT(state, discount) { state.discount = { type: discount.type, value: discount.value } },
  PROFILES(state, profiles) { state.profiles = profiles },
  ADDRESSES(state, addresses) { state.addresses = addresses },
  POS_DRAFT(state, draft) { state.posDraft = draft },
  OPERATOR_RESET(state, identity) { state.operator = { ...operatorState(), identity, sequence: state.operator.sequence + 1 } },
  OPERATOR_ERROR(state, error) { state.operator.error = error },
  OPERATOR_PENDING(state, { slot, pending }) { state.operator.pending = { ...state.operator.pending, [slot]: pending } },
  OPERATOR_ELIGIBILITY_CHECK(state, { deliveryId, check }) {
    state.operator.eligibilityChecks = { ...state.operator.eligibilityChecks, [deliveryId]: check }
    if (['loading', 'failed'].includes(check.status)) state.operator.eligibility = { ...state.operator.eligibility, [deliveryId]: null }
  },
  OPERATOR_READING(state, { key, token, delta }) {
    state.operator.reads = { ...state.operator.reads, [key]: token }
    state.operator.loading += delta
  },
  OPERATOR_DATA(state, { resource, result, courierId, deliveryId }) {
    const operator = state.operator
    if (resource === 'balance') operator.balances = { ...operator.balances, [courierId]: result }
    else if (resource === 'eligibility') operator.eligibility = { ...operator.eligibility, [deliveryId]: result }
    else if (resource === 'detail') {
      const index = operator.missions.findIndex(row => row.id === deliveryId)
      operator.missions = index < 0 ? [...operator.missions, result] : operator.missions.map(row => row.id === deliveryId ? result : row)
    } else operator[resource] = result
  },
}

export const actions = {
  operatorInitialize({ state, rootState, commit }) {
    const identity = rootState.authenticated !== false && canOperateDelivery(operatorUser(rootState)) ? operatorIdentity(rootState) : null
    if (state.operator.identity !== identity) commit('OPERATOR_RESET', identity)
    return identity
  },
  async operatorLoad({ state, rootState, commit, dispatch }, input) {
    const { resource, courierId, deliveryId } = input
    const initialIdentity = operatorIdentity(rootState)
    await dispatch('operatorInitialize')
    if (initialIdentity !== operatorIdentity(rootState)) { await dispatch('operatorInitialize'); return null }
    assertOperator(rootState, resource === 'settings')
    const requests = {
      missions: { path: '/deliveries' }, couriers: { path: '/delivery/couriers' },
      holders: { path: '/delivery/couriers', params: { financialHolders: true } },
      settings: { path: '/delivery/settings' },
      balance: { path: `/delivery/couriers/${courierId}/cash-balance` },
      detail: { path: `/deliveries/${deliveryId}` }, eligibility: { path: `/deliveries/${deliveryId}/refund-eligibility` },
    }
    if (!requests[resource] || (['detail', 'eligibility'].includes(resource) && !validId(deliveryId)) ||
      (resource === 'balance' && (!Number.isSafeInteger(courierId) || courierId <= 0))) throw new Error('Lecture livraison invalide.')
    const identity = state.operator.identity
    const sequence = state.operator.sequence
    const key = `${resource}:${courierId || deliveryId || ''}`
    const token = operatorKey()
    const confirmationId = typeof input.confirmationId === 'string' && input.confirmationId ? input.confirmationId : null
    const eligibilityCheck = status => commit('OPERATOR_ELIGIBILITY_CHECK', { deliveryId, check: { token, confirmationId, status } })
    const current = () => state.operator.identity === identity && state.operator.sequence === sequence && operatorIdentity(rootState) === identity
    commit('OPERATOR_READING', { key, token, delta: 1 })
    if (resource === 'eligibility') eligibilityCheck('loading')
    try {
      const result = unwrap(await api(this).request(requests[resource]))
      if (!current() || state.operator.reads[key] !== token) return null
      if (result == null) throw new Error('Reponse livraison invalide.')
      commit('OPERATOR_DATA', { resource, result, courierId, deliveryId })
      if (resource === 'eligibility') eligibilityCheck('ready')
      return result
    } catch (failure) {
      if (current() && state.operator.reads[key] === token) {
        if (resource === 'eligibility') eligibilityCheck('failed')
        commit('OPERATOR_ERROR', asError(failure).message)
      }
      return null
    } finally { if (current()) commit('OPERATOR_READING', { key, token: state.operator.reads[key], delta: -1 }) }
  },
  async operatorCommand({ state, rootState, commit, dispatch }, input) {
    const { operation, deliveryId, courierId, reconfirm = false } = input
    const initialIdentity = operatorIdentity(rootState)
    await dispatch('operatorInitialize')
    if (initialIdentity !== operatorIdentity(rootState)) { await dispatch('operatorInitialize'); return null }
    assertOperator(rootState, ['correctTerminal', 'adjust'].includes(operation))
    const operator = state.operator
    const identity = operator.identity
    const sequence = operator.sequence
    const current = () => state.operator.identity === identity && state.operator.sequence === sequence && operatorIdentity(rootState) === identity
    const slot = commandSlot(input)
    let pending = operator.pending[slot]
    if (pending && (pending.status === 'sending' || (pending.status === 'conflict' && (!reconfirm || !pending.reloaded)))) return null
    if (!pending || pending.status === 'conflict') {
      const mission = operator.missions.find(row => row.id === deliveryId)
      const body = { idempotencyKey: operatorKey() }
      let path
      if (['assign', 'reportIssue', 'resolveIssue', 'correctTerminal'].includes(operation)) {
        if (!mission || !validId(deliveryId)) return null
        if (operation !== 'correctTerminal' && !mission.allowedActions.includes(operation)) return null
        if (operation === 'correctTerminal' && !['delivered', 'failed', 'canceled'].includes(mission.deliveryStatus)) return null
        Object.assign(body, { expectedVersion: mission.version })
        if (operation !== 'assign') body.reason = input.reason
        if (operation === 'assign') body.courierId = input.courierId
        if (operation === 'resolveIssue') {
          body.action = input.action
          if (input.action === 'retry') body.courierId = input.courierId
          body.physicalTransferConfirmed = input.physicalTransferConfirmed === true
        }
        path = `/deliveries/${deliveryId}/${{ assign: 'assign', reportIssue: 'report-issue', resolveIssue: 'resolve-issue', correctTerminal: 'correct-terminal' }[operation]}`
      } else if (operation === 'remit') {
        const balance = operator.balances[courierId]
        if (!balance || !Number.isSafeInteger(input.receivedCents) || input.receivedCents < 0 || Number(operatorUser(rootState).id) === courierId) return null
        Object.assign(body, { expectedBalanceVersion: balance.version, receivedCents: input.receivedCents })
        path = `/delivery/couriers/${courierId}/remittances`
      } else if (operation === 'refund') {
        const eligibility = operator.eligibility[deliveryId]
        const check = operator.eligibilityChecks[deliveryId]
        if (!input.eligibilityReadId || !check || check.status !== 'ready' || check.confirmationId !== input.eligibilityReadId ||
          !eligibility || !eligibility.eligible || !eligibility.returnSources.includes(input.returnSource)) return null
        Object.assign(body, { reason: input.reason, returnSource: input.returnSource })
        path = `/deliveries/${deliveryId}/refund`
      } else if (operation === 'adjust') {
        Object.assign(body, { collectionId: input.collectionId || null, remittanceId: input.remittanceId || null, deltaDueCents: input.deltaDueCents, reason: input.reason })
        path = `/delivery/couriers/${courierId}/adjustments`
      } else throw new Error('Commande livraison invalide.')
      if (['refund', 'adjust', 'reportIssue', 'resolveIssue', 'correctTerminal'].includes(operation) &&
        (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 2000)) return null
      pending = { path, body: clone(body), status: 'sending', originalCourierId: operation === 'refund' ? operator.eligibility[deliveryId].originalCourierId : null }
      if (operation === 'refund') commit('OPERATOR_ELIGIBILITY_CHECK', { deliveryId, check: { ...operator.eligibilityChecks[deliveryId], status: 'consumed' } })
    }
    commit('OPERATOR_PENDING', { slot, pending: { ...pending, status: 'sending' } })
    commit('OPERATOR_ERROR', null)
    let originalHolderBalance = null
    const refresh = async () => {
      const reads = []
      if (deliveryId) reads.push({ resource: 'detail', deliveryId })
      if (operation === 'refund') {
        reads.push({ resource: 'eligibility', deliveryId, confirmationId: input.eligibilityReadId })
        if (pending.originalCourierId != null) reads.push({ resource: 'balance', courierId: pending.originalCourierId })
      }
      if (['remit', 'adjust'].includes(operation)) reads.push({ resource: 'balance', courierId })
      let loaded = true
      for (const read of reads) {
        if (!current()) return false
        const result = await dispatch('operatorLoad', read)
        if (!result) loaded = false
        if (operation === 'refund' && read.resource === 'balance') originalHolderBalance = result
      }
      return loaded
    }
    try {
      const result = unwrap(await api(this).request({ method: 'post', path: pending.path, body: pending.body }))
      if (!current()) return null
      if (!result) throw new Error('Confirmation serveur indisponible.')
      commit('OPERATOR_PENDING', { slot, pending: null })
      await refresh()
      if (!current()) return null
      return operation === 'refund' ? { ...result, originalCourierId: pending.originalCourierId, originalHolderBalance } : result
    } catch (failure) {
      if (!current()) return null
      const error = asError(failure)
      const conflict = error.status >= 400 && error.status < 500
      commit('OPERATOR_PENDING', { slot, pending: { ...pending, status: conflict ? 'conflict' : 'unresolved', reloaded: false } })
      const reloaded = await refresh()
      if (!current()) return null
      commit('OPERATOR_PENDING', { slot, pending: { ...pending, status: conflict ? 'conflict' : 'unresolved', reloaded } })
      commit('OPERATOR_ERROR', conflict ? error.message : 'Confirmation inconnue. Reprenez la meme tentative pour en verifier le resultat.')
      return null
    }
  },
  async operatorAvailability({ rootState, dispatch }, { courierId, available }) {
    const identity = operatorIdentity(rootState)
    await dispatch('operatorInitialize')
    if (identity !== operatorIdentity(rootState)) { await dispatch('operatorInitialize'); return null }
    assertOperator(rootState)
    try {
      const result = unwrap(await api(this).request({ method: 'patch', path: `/delivery/couriers/${courierId}/availability`, body: { available } }))
      if (identity !== operatorIdentity(rootState)) return null
      await dispatch('operatorLoad', { resource: 'couriers' })
      return identity === operatorIdentity(rootState) ? result : null
    } catch (failure) { if (identity !== operatorIdentity(rootState)) return null; await dispatch('operatorLoad', { resource: 'couriers' }); throw asError(failure) }
  },
  async operatorSaveSettings({ rootState, state, dispatch, commit }, settings) {
    const initialIdentity = operatorIdentity(rootState)
    await dispatch('operatorInitialize')
    if (initialIdentity !== operatorIdentity(rootState)) { await dispatch('operatorInitialize'); return null }
    assertOperator(rootState, true)
    const identity = state.operator.identity
    const sequence = state.operator.sequence
    const body = { ...clone(settings), expectedRevision: settings.revision }
    delete body.shopId
    try {
      const result = unwrap(await api(this).request({ method: 'put', path: '/delivery/settings', body }))
      if (sequence !== state.operator.sequence || identity !== operatorIdentity(rootState)) return null
      commit('OPERATOR_DATA', { resource: 'settings', result })
      return result
    } catch (failure) {
      if (sequence === state.operator.sequence && identity === operatorIdentity(rootState)) {
        await dispatch('operatorLoad', { resource: 'settings' })
        if (sequence === state.operator.sequence && identity === operatorIdentity(rootState)) commit('OPERATOR_ERROR', asError(failure).message)
      }
      return null
    }
  },
  resetForShop({ commit }, shopId) { commit('RESET', validShop(shopId) ? shopId : null) },
  setDiscount({ commit }, discount) { commit('DISCOUNT', discount) },
  async loadSettings({ state, commit }, shopId = state.shopId) {
    if (!validShop(shopId)) return null
    if (shopId !== state.shopId) commit('RESET', shopId)
    const epoch = state.epoch
    try {
      const result = unwrap(await api(this).request({ path: '/delivery/availability' }))
      if (epoch !== state.epoch) return null
      commit('AVAILABILITY', result && result.enabled === true)
      return { enabled: state.enabled }
    } catch (failure) {
      if (epoch === state.epoch) { commit('AVAILABILITY', false); commit('ERROR', asError(failure).message) }
      return null
    }
  },
  async suggestAddresses({ state, rootState, dispatch }, payload) {
    const customer = rootState.customer
    if (payload.personal !== false && !payload.customerId && customer && customer.shopId === state.shopId && customer.session) return dispatch('customer/suggestAddresses', payload, { root: true })
    const { epoch, shopId } = state
    const identity = operatorIdentity(rootState)
    try {
      const result = unwrap(await api(this).request({ method: 'post', path: '/delivery/address-suggestions', body: { input: payload.input, sessionToken: payload.sessionToken } }))
      return epoch === state.epoch && shopId === state.shopId && identity === operatorIdentity(rootState) ? result : null
    } catch (failure) {
      if (epoch !== state.epoch || shopId !== state.shopId || identity !== operatorIdentity(rootState)) return null
      throw asError(failure)
    }
  },
  async displayAddress({ dispatch }, payload) {
    const result = await dispatch('resolveAddress', payload)
    if (!result) return null
    return { addressSnapshot: Object.fromEntries(['provider', 'placeId', 'street', 'postalCode', 'city', 'country', 'complement', 'instructions'].filter(key => typeof result.addressSnapshot[key] === 'string').map(key => [key, result.addressSnapshot[key]])), displayStatus: 'ready' }
  },
  async resolveAddress({ state, rootState, dispatch }, payload) {
    const customer = rootState.customer
    if (payload.personal !== false && !payload.customerId && customer && customer.shopId === state.shopId && customer.session) {
      return dispatch('customer/resolveAddress', payload, { root: true })
    }
    if (payload.addressId) {
      if (!validId(payload.customerId) || !validId(payload.addressId)) throw new Error('Selectionnez une adresse de cette fiche client.')
      return unwrap(await api(this).request({ method: 'post', path: `/delivery/customers/${payload.customerId}/addresses/${payload.addressId}/resolve`, body: {} }))
    }
    try { return unwrap(await api(this).request({ method: 'post', path: '/delivery/address-resolutions', body: postalBody(payload) })) }
    catch (failure) { throw asError(failure) }
  },
  async quote({ state, commit }, { cart, resolution, discount = { type: 'none', value: 0 } }) {
    commit('QUOTE_START')
    const { epoch, quoteSequence } = state
    try {
      const result = unwrap(await api(this).request({ method: 'post', path: '/delivery/quotes', body: {
        items: buildCheckoutItems(cart), address_resolution_token: resolution.addressResolutionToken, discount,
      } }))
      if (epoch !== state.epoch || quoteSequence !== state.quoteSequence) return null
      if (!result || result.shopId !== state.shopId || !Number.isSafeInteger(result.grandTotalCents)) throw new Error('Devis invalide.')
      commit('QUOTE', result)
      return result
    } catch (failure) {
      if (epoch === state.epoch && quoteSequence === state.quoteSequence) commit('ERROR', asError(failure).message)
      return null
    }
  },
  checkoutRequest(context, { endpoint, payload, customerSession }) {
    const session = customerSession && customerSession.shopId === context.rootState.users.user.shopid ? customerSession : null
    return api(this).request({ method: 'post', path: endpoint.replace('/baseurl/api/v1', ''), body: payload,
      credentials: Boolean(session), csrfToken: session && session.csrfToken })
  },
  async searchCustomers({ state, commit }, query) {
    const epoch = state.epoch
    const result = unwrap(await api(this).request({ path: '/delivery/customers', params: { q: query } }))
    if (epoch === state.epoch) commit('PROFILES', result)
    return epoch === state.epoch ? result : null
  },
  async createCustomer(context, payload) {
    return unwrap(await api(this).request({ method: 'post', path: '/delivery/customers', body: {
      name: payload.name, contactPhone: payload.contactPhone,
    } }))
  },
  async loadAddresses({ state, commit }, customerId) {
    if (!validId(customerId)) return null
    const epoch = state.epoch
    const result = unwrap(await api(this).request({ path: `/delivery/customers/${customerId}/addresses` }))
    if (epoch === state.epoch) commit('ADDRESSES', result)
    return epoch === state.epoch ? result : null
  },
}
