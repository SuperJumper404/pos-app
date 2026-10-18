import axios from 'axios'
import settle from 'axios/lib/core/settle'
import buildURL from 'axios/lib/helpers/buildURL'
const { buildCheckoutItems } = require('../helpers/customizations')

export const namespaced = true
export const state = () => ({ shopId: null, enabled: false, loaded: false, epoch: 0, quoteSequence: 0,
  currentQuote: null, error: null, discount: { type: 'none', value: 0 }, profiles: [], addresses: [], posDraft: null })
const initialState = state
const validShop = value => Number.isInteger(value) && value > 0
const validId = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
const bearer = () => typeof localStorage === 'undefined' ? '' : localStorage.getItem('token') || ''
const postalBody = payload => ({ address: Object.fromEntries(['street', 'postalCode', 'city', 'country']
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
    DELIVERY_DISABLED: 'La livraison est suspendue. Votre panier est conserve.',
    DELIVERY_OUT_OF_RANGE: 'Cette adresse est hors du rayon de livraison. Corrigez l\'adresse ou choisissez un autre mode.',
    DELIVERY_MINIMUM_NOT_MET: 'Le minimum de produits pour la livraison n\'est pas atteint. Votre panier est conserve.',
    DELIVERY_ADDRESS_INVALID: 'Validez une adresse postale precise avant de continuer.',
  }
  const code = dto && (dto.error || (dto.data && dto.data.code))
  const error = new Error(messages[code] || dto && dto.message || failure.message || 'Livraison indisponible. Reessayez.')
  error.code = dto && (dto.error || (dto.data && dto.data.code)) || 'DELIVERY_UNAVAILABLE'
  error.candidates = dto && dto.data && Array.isArray(dto.data.candidates) ? dto.data.candidates.map(candidate => ({
    providerId: candidate.providerId, providerLabel: candidate.providerLabel,
  })) : []
  return error
}

export const mutations = {
  RESET(state, shopId) { Object.assign(state, { ...initialState(), shopId, epoch: state.epoch + 1 }) },
  AVAILABILITY(state, enabled) { state.enabled = enabled === true; state.loaded = true },
  QUOTE_START(state) { state.quoteSequence++; state.currentQuote = null; state.error = null },
  QUOTE(state, quote) { state.currentQuote = quote },
  ERROR(state, error) { state.error = error },
  DISCOUNT(state, discount) { state.discount = { type: discount.type, value: discount.value } },
  PROFILES(state, profiles) { state.profiles = profiles },
  ADDRESSES(state, addresses) { state.addresses = addresses },
  POS_DRAFT(state, draft) { state.posDraft = draft },
}

export const actions = {
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
