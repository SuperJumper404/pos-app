export const namespaced = true

export const state = () => ({
  shopId: null,
  shop: null,
  session: null,
  addresses: [],
  challenge: null,
  channels: { email: false, whatsapp: false },
  channelsLoaded: false,
  busy: false,
  error: null,
  epoch: 0,
})

const validShop = value => Number.isInteger(value) && value > 0 && value <= 2147483647
const validId = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
const personalError = error => ({ code: error.code || 'CUSTOMER_UNAVAILABLE', message: error.message })
const localError = (message) => ({ code: 'CUSTOMER_REQUEST_INVALID', message })
const validSession = (session, shopId) => session && session.subject === 'customer' &&
  session.shopId === shopId && validId(session.customerId) && /^[a-f0-9]{64}$/i.test(session.csrfToken) &&
  Date.parse(session.expiresAt) > Date.now()

export const mutations = {
  RESET(state, shopId) {
    const epoch = state.epoch + 1
    Object.assign(state, { ...moduleState(), shopId, epoch })
  },
  PRIVATE_RESET(state) {
    state.epoch++
    state.session = null
    state.addresses = []
    state.challenge = null
    state.busy = false
  },
  BUSY(state, value) { state.busy = value },
  ERROR(state, error) { state.error = error },
  SHOP(state, shop) {
    state.shop = shop && shop.shop_name ? {
      shop_name: shop.shop_name,
      shop_profile_image: shop.shop_profile_image || '',
    } : null
  },
  CHANNELS(state, channels) {
    state.channels = { email: channels.email === true, whatsapp: channels.whatsapp === true }
    state.channelsLoaded = true
  },
  SESSION(state, session) { state.session = session },
  AUTHENTICATED(state, session) {
    state.epoch++
    state.session = session
    state.addresses = []
    state.challenge = null
    state.busy = false
  },
  CHALLENGE(state, challenge) { state.challenge = challenge },
  ADDRESSES(state, addresses) { state.addresses = addresses },
}

const moduleState = state

// Every reply (including failures/finally) belongs to the captured tenant/session epoch.
async function scoped(api, context, work, apply, { busy = true, propagate = false, reportError = true } = {}) {
  const { state, commit } = context
  if (!validShop(state.shopId) || (busy && state.busy)) return null
  const epoch = state.epoch
  const shopId = state.shopId
  const session = state.session
  const current = () => epoch === state.epoch && shopId === state.shopId
  const request = (method, path, body, personal = true) => api.request({
    method, path, body,
    ...(personal ? { shopId, csrfToken: session && session.csrfToken } : {}),
  })
  if (busy) commit('BUSY', true)
  commit('ERROR', null)
  try {
    const result = await work(request, { shopId, session })
    if (!current()) return null
    if (apply) apply(result)
    return result
  } catch (error) {
    if (!current()) return null
    const sessionInvalid = error.status === 401 && error.code !== 'CUSTOMER_CODE_INVALID'
    if (sessionInvalid) commit('PRIVATE_RESET')
    if (reportError || sessionInvalid) commit('ERROR', personalError(error))
    if (propagate) throw error
    return null
  } finally {
    if (current() && busy) commit('BUSY', false)
  }
}

const verification = (state, payload, purpose) => {
  const challenge = state.challenge
  return challenge && challenge.purpose === purpose && challenge.challengeId === payload.challengeId &&
    /^\d{6}$/.test(payload.code) && Date.parse(challenge.expiresAt) > Date.now()
}

export const actions = {
  resetForShop({ commit }, shopId) {
    commit('RESET', validShop(shopId) ? shopId : null)
  },
  loadSession(context, { shopId }) {
    context.commit('RESET', validShop(shopId) ? shopId : null)
    if (!validShop(shopId)) {
      context.commit('ERROR', localError('Le restaurant est manquant ou invalide.'))
      return null
    }
    return scoped(this.$customerApi, context, request => Promise.allSettled([
      request('get', `/shopInfo/click-and-collect/${shopId}`, undefined, false),
      request('get', '/customer-auth/channels', undefined, false),
      request('get', '/customer-auth/session'),
    ]), results => {
      const [shop, channels, session] = results
      if (shop.status === 'fulfilled') context.commit('SHOP', shop.value)
      if (channels.status === 'fulfilled') context.commit('CHANNELS', channels.value)
      if (session.status === 'fulfilled' && validSession(session.value, shopId)) context.commit('SESSION', session.value)
      const failure = results.find(result => result.status === 'rejected' && result.reason.status !== 401)
      if (failure) context.commit('ERROR', personalError(failure.reason))
    })
  },
  loadChannels(context) {
    return scoped(this.$customerApi, context,
      request => request('get', '/customer-auth/channels', undefined, false),
      channels => context.commit('CHANNELS', channels), { busy: false })
  },
  clearChallenge({ commit }) {
    commit('CHALLENGE', null)
    commit('ERROR', null)
  },
  requestCode(context, { channel, destination, purpose = 'login', countryCode }) {
    const { state, commit } = context
    if (!['login', 'link'].includes(purpose) || !state.channelsLoaded || state.channels[channel] !== true ||
      typeof destination !== 'string' || !destination.trim() || (purpose === 'link' && !state.session)) {
      commit('ERROR', localError('Choisissez un canal disponible et un contact valide.'))
      return null
    }
    const previous = state.challenge
    if (previous && previous.channel === channel && previous.destination === destination &&
      previous.purpose === purpose && Date.parse(previous.resendAfter) > Date.now()) return null
    const browserBinding = this.$customerApi.browserBinding()
    return scoped(this.$customerApi, context, (request, { shopId }) => request('post',
      purpose === 'link' ? '/customer-auth/link/challenges' : '/customer-auth/challenges', {
        channel, destination: destination.trim(), browserBinding,
        ...(countryCode ? { countryCode } : {}),
        ...(purpose === 'login' ? { shopId } : {}),
      }, purpose === 'link'), challenge => {
      commit('CHALLENGE', { ...challenge, browserBinding, channel, destination, purpose })
      if (challenge.status === 'failed') commit('ERROR', localError('L\'envoi du code a echoue. Reessayez ou choisissez un autre canal.'))
    })
  },
  verifyCode(context, payload) {
    if (!verification(context.state, payload, 'login')) return null
    const { browserBinding } = context.state.challenge
    return scoped(this.$customerApi, context, async (request, { shopId }) => {
      const session = await request('post', '/customer-auth/verify', { ...payload, shopId, browserBinding }, false)
      if (!validSession(session, shopId)) throw new Error('La session client recue est invalide. Reessayez.')
      return session
    }, session => context.commit('AUTHENTICATED', session))
  },
  linkIdentity(context, payload) {
    if (!context.state.session || !verification(context.state, payload, 'link')) return null
    const { browserBinding } = context.state.challenge
    return scoped(this.$customerApi, context,
      request => request('post', '/customer-auth/link/verify', { ...payload, browserBinding }),
      () => context.commit('CHALLENGE', null))
  },
  logout(context) {
    if (!context.state.session) return null
    return scoped(this.$customerApi, context,
      request => request('post', '/customer-auth/logout', {}),
      () => context.commit('PRIVATE_RESET'))
  },
  loadAddresses(context) {
    if (!context.state.session) return null
    return scoped(this.$customerApi, context,
      request => request('get', '/customer/addresses'),
      addresses => context.commit('ADDRESSES', addresses))
  },
  async saveAddress(context, payload) {
    if (!context.state.session || (payload.id && !validId(payload.id))) return null
    const fields = ['addressResolutionToken', 'complement', 'instructions', 'makeDefault']
    const body = Object.fromEntries(fields.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]))
    const result = await scoped(this.$customerApi, context,
      request => request(payload.id ? 'patch' : 'post', `/customer/addresses${payload.id ? `/${payload.id}` : ''}`, body))
    if (result) await context.dispatch('loadAddresses')
    return result
  },
  async deleteAddress(context, id) {
    if (!context.state.session || !validId(id)) return null
    const result = await scoped(this.$customerApi, context,
      request => request('delete', `/customer/addresses/${id}`, {}))
    if (result) await context.dispatch('loadAddresses')
    return result
  },
  suggestAddresses(context, payload) {
    if (!context.state.session) return null
    return scoped(this.$customerApi, context, request => request('post', '/customer/address-suggestions', { input: payload.input, sessionToken: payload.sessionToken }), null,
      { busy: false, propagate: true, reportError: false })
  },
  async displayAddress(context, payload) {
    const result = await context.dispatch('resolveAddress', payload)
    if (!result) return null
    return { addressSnapshot: Object.fromEntries(['provider', 'placeId', 'street', 'postalCode', 'city', 'country', 'complement', 'instructions'].filter(key => typeof result.addressSnapshot[key] === 'string').map(key => [key, result.addressSnapshot[key]])), displayStatus: 'ready' }
  },
  resolveAddress(context, payload) {
    if (!context.state.session) return null
    const body = payload.addressId ? { addressId: payload.addressId } : payload.selectionToken !== undefined ? { selectionToken: payload.selectionToken } : {
      address: Object.fromEntries(['street', 'postalCode', 'city', 'country'].map(key => [key, payload.address[key]])),
      ...(payload.candidateId ? { candidateId: payload.candidateId } : {}),
    }
    return scoped(this.$customerApi, context,
      request => request('post', '/customer/address-resolutions', body), null,
      { busy: false, propagate: true, reportError: false })
  },
}
