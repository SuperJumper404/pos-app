import { buildDeliveryApi } from './delivery'

export const namespaced = true
export const state = () => ({ member: null, program: null, members: [], selected: null, busy: false, error: '', epoch: 0 })
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
  },
  PROGRAM(current, program) { current.program = program },
  MEMBERS(current, members) { current.members = Array.isArray(members) ? members : [] },
  SELECTED(current, member) { current.selected = member },
}

async function request(host, context, { personal = false, method = 'get', path, body, mutation }) {
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
    if (personal) result = await host.$customerApi.request({ method, path, body, shopId: account.shopId, csrfToken: account.session.csrfToken })
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

export const actions = {
  reset({ commit }) { commit('RESET') },
  loadMember(context) { return request(this, context, { personal: true, path: '/customer/loyalty', mutation: 'MEMBER' }) },
  enroll(context) { return request(this, context, { personal: true, method: 'post', path: '/customer/loyalty', body: {}, mutation: 'MEMBER' }) },
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
  loadMembers(context) { return request(this, context, { path: '/loyalty/members', mutation: 'MEMBERS' }) },
  memberHistory(context, id) { return request(this, context, { path: `/loyalty/members/${encodeURIComponent(id)}`, mutation: 'SELECTED' }) },
  lookup(context, qr) { return request(this, context, { method: 'post', path: '/loyalty/lookup', body: { qr: String(qr || '').trim() }, mutation: 'SELECTED' }) },
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
