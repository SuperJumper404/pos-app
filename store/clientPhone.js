import { buildDeliveryApi } from './delivery'
const { completePhone, phoneOwner } = require('../helpers/clientPhone')
export const namespaced = true
export const state = () => ({ result: null, busy: false, error: '', epoch: 0, sequence: 0, owner: null, phone: '' })
export const mutations = {
  RESET(current) { Object.assign(current, { ...state(), epoch: current.epoch + 1, sequence: current.sequence }) },
  START(current, { phone, owner }) { current.result = null; current.error = ''; current.phone = phone; current.owner = owner; current.sequence++; current.busy = true },
  RESULT(current, result) { current.result = result },
  ERROR(current, error) { current.error = error },
  IDLE(current) { current.busy = false },
}
export const actions = {
  reset({ commit }) { commit('RESET') },
  async resolve({ state, rootState, commit }, { phone, name } = {}) {
    phone = completePhone(phone)
    const user = rootState.users && rootState.users.user || {}
    const shopId = Number(user.shopid)
    const table = user.session_subject === 'service_point' && (user.source || user.order_source) === 'table_qr'
    const staff = user.session_subject === 'staff' && user.access != null && [0, 1, 4, 5].includes(Number(user.access))
    if (!phone || !Number.isInteger(shopId) || shopId < 1 || rootState.authenticated === false || (!table && !staff)) { commit('RESET'); return null }
    const owner = phoneOwner(rootState)
    commit('START', { phone, owner })
    const { epoch, sequence } = state
    let changed = false
    const stop = typeof this.watch === 'function' ? this.watch(phoneOwner, () => { changed = true; if (state.sequence === sequence) commit('RESET') }, { sync: true }) : () => {}
    const current = () => !changed && epoch === state.epoch && sequence === state.sequence && owner === phoneOwner(rootState) && phone === state.phone
    try {
      const body = { phone, countryCode: 'FR', ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}) }
      // Both staff and table QR use their existing bearer; no personal cookie/session.
      const api = this.$deliveryApi || (this.$deliveryApi = buildDeliveryApi({ baseURL: process.env.privateURL }))
      const response = await api.request({ method: 'post', path: '/clients/resolve-phone', body })
      const result = response && response.data && response.data.data
      if (!current()) return null
      if (!result || !['resolved', 'ambiguous'].includes(result.status) || completePhone(result.phone) !== phone ||
        (result.customer && Number(result.customer.shopId) !== shopId)) throw new Error('Invalid response')
      commit('RESULT', result)
      return result
    } catch (error) {
      if (current()) commit('ERROR', (error.code || error.response && error.response.data && error.response.data.error) === 'CUSTOMER_PHONE_INVALID'
        ? 'Saisissez un numéro de téléphone valide, avec son indicatif pour un numéro étranger.'
        : 'La fiche client est indisponible. Vous pouvez poursuivre la commande.')
      return null
    } finally {
      stop()
      if (current()) commit('IDLE')
      else if (state.sequence === sequence && state.epoch === epoch) commit('RESET')
    }
  },
}
