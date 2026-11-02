import { buildDeliveryApi } from './delivery'

export const namespaced = true
export const state = () => ({ member: null, program: null, canEnroll: false, phoneShopId: null, phoneShop: null, phoneSession: null, members: [], membersTotal: 0, membersBusy: false, membersError: '', assetsBusy: false, assetsError: '', campaigns: [], campaignsTotal: 0, selected: null, busy: false, error: '', epoch: 0 })
const initial = state
const staffIdentity = root => JSON.stringify(root.users && root.users.user)
const personalIdentity = root => {
  const account = root.customer || {}
  return JSON.stringify([account.shopId, account.epoch, account.session && account.session.customerId])
}
const errors = {
  LOYALTY_DISABLED: 'Le programme de fidélité est suspendu.',
  LOYALTY_INSUFFICIENT_POINTS: 'Le solde disponible ne permet plus cette récompense. Actualisez la carte.',
  LOYALTY_NOT_FOUND: 'Carte ou commande introuvable dans ce restaurant.',
  LOYALTY_LOOKUP_AMBIGUOUS: 'Plusieurs cartes correspondent à ce téléphone. Utilisez le numéro de carte.',
  LOYALTY_RATE_LIMITED: 'Trop de recherches. Patientez une minute avant de réessayer.',
  LOYALTY_TABLE_REQUIRED: 'Scannez le QR de votre table pour rejoindre le programme.',
  LOYALTY_PHONE_REQUIRED: 'Actualisez la page et renseignez votre numéro de téléphone pour rejoindre la fidélité.',
  LOYALTY_SESSION_INVALID: 'Retrouvez votre carte avec votre numéro de téléphone depuis le QR de votre table.',
  LOYALTY_CSRF_FORBIDDEN: 'Actualisez votre carte puis réessayez.',
  CUSTOMER_DESTINATION_INVALID: 'Saisissez un numéro de téléphone valide, avec son indicatif pour un numéro étranger.',
  LOYALTY_IMAGE_INVALID: 'Le visuel est invalide. Choisissez une image PNG ou JPEG et recadrez-la avant de publier.',
  LOYALTY_CAMPAIGN_EMPTY: 'Aucun adhérent ayant accepté les offres ne dispose actuellement d’une carte Apple Wallet enregistrée.',
  LOYALTY_CAMPAIGN_RATE_LIMITED: 'Patientez cinq minutes entre deux envois.',
  LOYALTY_CAMPAIGN_CONFLICT: 'Ce message a déjà été préparé. Actualisez avant de recommencer.',
  LOYALTY_FORBIDDEN: 'Vous n’avez pas les droits nécessaires.',
  LOYALTY_INVALID: 'Vérifiez les champs saisis puis réessayez.',
  LOYALTY_REWARD_CONDITIONS: 'La commande ne remplit pas les conditions de cette récompense.',
  LOYALTY_NOT_STACKABLE: 'Cette récompense ne peut pas être cumulée avec la remise de la commande.',
  LOYALTY_REWARD_UNAVAILABLE: 'Cette récompense n’est plus disponible. Actualisez votre fidélité.',
  LOYALTY_RESERVATION_EXPIRED: 'La réservation des points a expiré. Choisissez de nouveau votre récompense.',
  LOYALTY_ALREADY_RESERVED: 'Une récompense est déjà réservée sur cette vente. Retrouvez la carte pour la consulter.',
  LOYALTY_ORDER_ASSIGNED: 'Cette vente est déjà associée à une autre carte de fidélité.',
  LOYALTY_PAYMENT_ACTIVE: 'Le paiement a déjà commencé. Terminez ou annulez ce paiement avant de changer la fidélité.',
  LOYALTY_WALLET_UNAVAILABLE: 'Cette carte Wallet n’est pas configurée. Vos points restent disponibles.',
  LOYALTY_WALLET_NOT_CONFIGURED: 'Cette carte Wallet n’est pas configurée. Vos points restent disponibles.',
}
const errorMessage = failure => {
  const dto = failure.response && failure.response.data
  const code = failure.code || (dto && dto.error)
  return errors[code] || 'La fidélité est indisponible. Réessayez ; vous pouvez poursuivre votre commande.'
}
export const mutations = {
  RESET(current) { Object.assign(current, { ...initial(), epoch: current.epoch + 1 }) },
  BUSY(current, busy) { current.busy = busy },
  ERROR(current, error) { current.error = error },
  MEMBER(current, result) {
    current.member = result && result.id ? result : result && result.member || null
    current.program = result && result.program || null
    current.canEnroll = !!(result && result.canEnroll)
  },
  PROGRAM(current, program) { current.program = program },
  PHONE_SHOP_ID(current, shopId) { current.phoneShopId = shopId },
  PHONE_SHOP(current, shop) { current.phoneShop = shop && shop.shop_name ? { shop_name: shop.shop_name, shop_profile_image: shop.shop_profile_image || '' } : null },
  PHONE_RESULT(current, result) {
    current.member = result && result.member || null
    current.program = result && result.program || current.member && current.member.program || null
    current.phoneSession = result && result.session || null
    if (result && typeof result.canEnroll === 'boolean') current.canEnroll = result.canEnroll
  },
  MEMBERS(current, result) { current.members = Array.isArray(result) ? result : result && result.items || []; current.membersTotal = Array.isArray(result) ? result.length : result && result.total || 0 },
  MEMBERS_BUSY(current, value) { current.membersBusy = value },
  MEMBERS_ERROR(current, value) { current.membersError = value },
  ASSETS_BUSY(current, value) { current.assetsBusy = value },
  ASSETS_ERROR(current, value) { current.assetsError = value },
  CAMPAIGNS(current, result) { current.campaigns = result && result.items || []; current.campaignsTotal = result && result.total || 0 },
  SELECTED(current, member) { current.selected = member },
}

async function request(host, context, { personal = false, tableContext = false, method = 'get', path, body, mutation }) {
  const { state, rootState, commit } = context
  if (state.busy) return null
  const account = rootState.customer || {}
  if (personal && (!account.session || account.session.shopId !== account.shopId)) return null
  const epoch = state.epoch
  const identity = personal ? personalIdentity(rootState) : staffIdentity(rootState)
  const current = () => epoch === state.epoch && identity === (personal ? personalIdentity(rootState) : staffIdentity(rootState))
  commit('BUSY', true)
  commit('ERROR', '')
  try {
    let result
    if (personal) {
      const user = rootState.users && rootState.users.user || {}
      const token = tableContext && user.session_subject === 'service_point' && (user.source || user.order_source) === 'table_qr' && Number(user.shopid) === Number(account.shopId) ? user.token : undefined
      result = await host.$customerApi.request({ method, path, body, shopId: account.shopId, csrfToken: account.session.csrfToken, ...(token ? { tableSessionToken: token } : {}) })
    }
    else {
      const api = host.$deliveryApi || (host.$deliveryApi = buildDeliveryApi({ baseURL: process.env.privateURL }))
      const response = await api.request({ method, path, body })
      result = response && response.data && response.data.data
    }
    if (!current()) return null
    if (mutation) commit(mutation, result)
    return result
  } catch (failure) {
    if (!current()) return null
    if (personal && failure.status === 401) {
      commit('MEMBER', null)
      commit('BUSY', false)
      commit('customer/PRIVATE_RESET', null, { root: true })
    }
    commit('ERROR', errorMessage(failure))
    return null
  } finally { if (current()) commit('BUSY', false) }
}

async function kioskRequest(host, context, path, body) {
  const identity = staffIdentity(context.rootState)
  const api = host.$deliveryApi || (host.$deliveryApi = buildDeliveryApi({ baseURL: process.env.privateURL }))
  try {
    const response = await api.request({ method: 'post', path, body })
    return identity === staffIdentity(context.rootState) ? response && response.data && response.data.data : null
  } catch (error) {
    if (identity !== staffIdentity(context.rootState)) return null
    throw new Error(errorMessage(error))
  }
}
const memberRequests = new WeakMap()
const tableCredential = (rootState, shopId) => {
  const user = rootState.users && rootState.users.user || {}
  return user.session_subject === 'service_point' && (user.source || user.order_source) === 'table_qr' && Number(user.shopid) === shopId ? user.token : undefined
}
async function phoneRequest(host, context, { shopId = context.state.phoneShopId, method = 'get', path = '/customer/loyalty/phone', body, membership = false } = {}) {
  const { state, rootState, commit } = context
  if (!Number.isInteger(shopId) || shopId < 1 || state.busy) return null
  const epoch = state.epoch; const identity = staffIdentity(rootState)
  const current = () => epoch === state.epoch && shopId === state.phoneShopId && identity === staffIdentity(rootState)
  commit('PHONE_SHOP_ID', shopId); commit('BUSY', true); commit('ERROR', '')
  try {
    const result = await host.$customerApi.request({ method, path, body, shopId, csrfToken: state.phoneSession && state.phoneSession.csrfToken,
      ...(tableCredential(rootState, shopId) ? { tableSessionToken: tableCredential(rootState, shopId) } : {}) })
    if (!current()) return null
    if (membership) {
      if (result && result.session && (result.session.subject !== 'loyalty' || result.session.shopId !== shopId || !result.member || result.session.memberId !== result.member.id)) throw new Error('Invalid loyalty session')
      commit('PHONE_RESULT', result)
    }
    return result
  } catch (error) {
    if (current()) {
      if (error.status === 401) commit('PHONE_RESULT', { member: null, session: null, program: state.program })
      commit('ERROR', errorMessage(error))
    }
    return null
  } finally { if (current()) commit('BUSY', false) }
}
async function adminTransfer(host, context, { path, data, responseType }) {
  const { state, rootState, commit } = context
  const epoch = state.epoch; const identity = staffIdentity(rootState)
  const current = () => epoch === state.epoch && identity === staffIdentity(rootState)
  if (data && state.assetsBusy) return null
  const token = rootState.users && rootState.users.user && rootState.users.user.token
  if (typeof token !== 'string' || !token.trim()) { commit('ASSETS_ERROR', errors.LOYALTY_FORBIDDEN); return null }
  if (data) { commit('ASSETS_BUSY', true); commit('ASSETS_ERROR', '') }
  try {
    const response = await host.$axios.request({ method: data ? 'post' : 'get', url: `${process.env.privateURL}${path}`, headers: { Authorization: `Bearer ${token}` }, ...(data ? { data } : {}), ...(responseType ? { responseType } : {}), skipGlobalErrorNotification: true })
    if (!current()) return null
    return responseType === 'blob' ? response.data : response.data && response.data.data
  } catch (error) { if (responseType === 'blob' && error.response && error.response.status === 404) return null; if (current()) commit('ASSETS_ERROR', errorMessage(error)); return null }
  finally { if (data && current()) commit('ASSETS_BUSY', false) }
}
export const actions = {
  reset({ commit }) { commit('RESET') },
  async loadPhoneMember(context, { shopId = context.state.phoneShopId } = {}) {
    const result = await phoneRequest(this, context, { shopId, membership: true })
    if (!result) return null
    const epoch = context.state.epoch; const identity = staffIdentity(context.rootState)
    try {
      const shop = await this.$customerApi.request({ path: `/shopInfo/click-and-collect/${shopId}` })
      if (epoch === context.state.epoch && shopId === context.state.phoneShopId && identity === staffIdentity(context.rootState)) context.commit('PHONE_SHOP', shop)
    } catch (_) { /* A missing public logo does not block the loyalty card. */ }
    return result.member || result
  },
  async enrollPhone(context, { shopId = context.state.phoneShopId, phone, countryCode = 'FR', marketingConsent = false } = {}) {
    if (!tableCredential(context.rootState, shopId)) { context.commit('ERROR', errors.LOYALTY_TABLE_REQUIRED); return null }
    const result = await phoneRequest(this, context, { shopId, method: 'post', body: { phone, countryCode, marketingConsent }, membership: true })
    return result && result.member
  },
  phoneWallet(context, provider) {
    if (!['apple', 'google'].includes(provider) || !context.state.phoneSession) return null
    return phoneRequest(this, context, { method: 'post', path: `/customer/loyalty/phone/wallet/${provider}`, body: {} })
  },
  setPhoneMarketingConsent(context, marketingConsent) {
    if (typeof marketingConsent !== 'boolean' || !context.state.phoneSession) return null
    return phoneRequest(this, context, { method: 'patch', path: '/customer/loyalty/phone/preferences', body: { marketingConsent }, membership: true })
  },
  loadMember(context) { return request(this, context, { personal: true, tableContext: true, path: '/customer/loyalty', mutation: 'MEMBER' }) },
  enroll(context, { marketingConsent = false } = {}) { return request(this, context, { personal: true, tableContext: true, method: 'post', path: '/customer/loyalty', body: { marketingConsent }, mutation: 'MEMBER' }) },
  setMarketingConsent(context, marketingConsent) { return request(this, context, { personal: true, method: 'patch', path: '/customer/loyalty/preferences', body: { marketingConsent }, mutation: 'MEMBER' }) },
  wallet(context, provider) {
    if (!['apple', 'google'].includes(provider)) return null
    return request(this, context, { personal: true, method: 'post', path: `/customer/loyalty/wallet/${provider}`, body: {} })
  },
  loadProgram(context) { return request(this, context, { path: '/loyalty/program', mutation: 'PROGRAM' }) },
  saveProgram(context, program) {
    const body = Object.fromEntries(['enabled', 'name', 'pointsPerEuro', 'rounding', 'includeTips', 'excludedProductIds', 'rewards', 'logoUrl', 'backgroundColor', 'foregroundColor']
      .filter(key => program[key] !== undefined).map(key => [key, program[key]]))
    return request(this, context, { method: 'put', path: '/loyalty/program', body, mutation: 'PROGRAM' })
  },
  async loadMembers(context, { page = 1, pageSize = 25, search = '' } = {}) {
    const { state, rootState, commit } = context
    const ticket = (memberRequests.get(state) || 0) + 1; memberRequests.set(state, ticket)
    const epoch = state.epoch; const identity = staffIdentity(rootState)
    const current = () => epoch === state.epoch && identity === staffIdentity(rootState) && ticket === memberRequests.get(state)
    commit('MEMBERS_BUSY', true); commit('MEMBERS_ERROR', '')
    try {
      const api = this.$deliveryApi || (this.$deliveryApi = buildDeliveryApi({ baseURL: process.env.privateURL }))
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
      const response = await api.request({ method: 'get', path: `/loyalty/members?${query}` })
      const result = response && response.data && response.data.data
      if (!current()) return null
      commit('MEMBERS', result); return result
    } catch (error) { if (current()) commit('MEMBERS_ERROR', errorMessage(error)); return null }
    finally { if (current()) commit('MEMBERS_BUSY', false) }
  },
  uploadWalletAssets(context, data) { return adminTransfer(this, context, { path: '/baseurl/api/v1/loyalty/wallet/assets', data }) },
  loadWalletAssetPreview(context, path) {
    if (typeof path !== 'string' || !/^\/baseurl\/api\/v1\/loyalty\/wallet\/assets\/[a-f0-9-]{36}\/(?:icon|logo|strip)(?:@2x|@3x)?\.png$/.test(path)) return null
    return adminTransfer(this, context, { path, responseType: 'blob' })
  },
  createCampaignDraft(context, body) { return request(this, context, { method: 'post', path: '/loyalty/campaigns', body }) },
  sendCampaign(context, { campaignId, confirmed }) { return request(this, context, { method: 'post', path: `/loyalty/campaigns/${encodeURIComponent(campaignId)}/send`, body: { confirmed } }) },
  loadCampaigns(context, { page = 1, pageSize = 25 } = {}) { return request(this, context, { path: `/loyalty/campaigns?page=${page}&pageSize=${pageSize}`, mutation: 'CAMPAIGNS' }) },
  memberHistory(context, id) { return request(this, context, { path: `/loyalty/members/${encodeURIComponent(id)}`, mutation: 'SELECTED' }) },
  lookup(context, input) { return request(this, context, { method: 'post', path: '/loyalty/lookup', body: typeof input === 'string' ? { qr: input.trim() } : input, mutation: 'SELECTED' }) },
  lookupKiosk(context, input) { return kioskRequest(this, context, '/loyalty/kiosk/lookup', input) },
  previewKiosk(context, input) { return kioskRequest(this, context, '/loyalty/kiosk/preview', input) },
  adjust(context, { memberId, points, reason }) {
    if (!Number.isSafeInteger(points) || !points || typeof reason !== 'string' || !reason.trim()) return null
    return request(this, context, { method: 'post', path: `/loyalty/members/${encodeURIComponent(memberId)}/adjustments`, body: { points, reason: reason.trim() }, mutation: 'SELECTED' })
  },
  attach(context, { orderId, qr }) { return request(this, context, { method: 'post', path: `/loyalty/orders/${encodeURIComponent(orderId)}/attach`, body: { qr } }) },
  reserve(context, { orderId, rewardId, confirmed }) {
    if (confirmed !== true) return null
    return request(this, context, { method: 'post', path: `/loyalty/orders/${encodeURIComponent(orderId)}/reserve`, body: { rewardId, confirmed: true } })
  },
  release(context, orderId) { return request(this, context, { method: 'post', path: `/loyalty/orders/${encodeURIComponent(orderId)}/release`, body: {} }) },
}
