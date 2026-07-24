import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import {
  buildOrderEditPayload,
  isOrderEditDirty,
  mapEditableOrderToCart,
} from '@/helpers/orderEdit'

export const state = () => ({
  active: false,
  orderId: null,
  orderNumber: '',
  contentRevision: null,
  originalCart: [],
  dirty: false,
  paymentProvider: null,
  paymentStatus: null,
  paymentRefresh: null,
  payment: null,
  loading: false,
  message: '',
})

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})
const clone = (value) => JSON.parse(JSON.stringify(value))
const apiError = (error) => {
  const response = error && error.response && error.response.data
  const data = response && response.data && typeof response.data === 'object'
    ? response.data
    : {}
  return {
    status: error && error.response ? error.response.status : null,
    message: (response && response.message) || error.message ||
      'Impossible de modifier la commande.',
    ...data,
  }
}

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const clear = (dispatch) => {
  dispatch('set/active', false)
  dispatch('set/orderId', null)
  dispatch('set/orderNumber', '')
  dispatch('set/contentRevision', null)
  dispatch('set/originalCart', [])
  dispatch('set/dirty', false)
  dispatch('set/paymentProvider', null)
  dispatch('set/paymentStatus', null)
  dispatch('set/paymentRefresh', null)
  dispatch('set/payment', null)
  dispatch('set/message', '')
}

export const actions = {
  begin({ dispatch }, { editable, cart }) {
    const originalCart = clone(cart)
    dispatch('set/active', true)
    dispatch('set/orderId', Number(editable.order_id))
    dispatch('set/orderNumber', String(editable.order_number))
    dispatch('set/contentRevision', editable.content_revision)
    dispatch('set/originalCart', originalCart)
    dispatch('set/dirty', false)
    dispatch('set/paymentProvider', editable.payment_provider || null)
    dispatch('set/paymentStatus', editable.payment_status)
    dispatch('set/paymentRefresh', null)
    dispatch('set/payment', null)
    dispatch('cart/setTocart', clone(cart), { root: true })
    dispatch('cart/setTotal', Number(editable.total), { root: true })
    dispatch(
      'cart/setIndex',
      cart.reduce((sum, line) => sum + Number(line.qty || 0), 0),
      { root: true }
    )
    return { ok: true, data: editable, error: null }
  },

  async load({ dispatch, rootState }, orderId) {
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.get(
        `/baseurl/api/v1/orders/${orderId}/edit`,
        { headers: authHeaders() }
      )
      if (
        !Array.isArray(rootState.products.dataProduct) ||
        rootState.products.dataProduct.length === 0
      ) {
        await dispatch('products/getProducts', null, { root: true })
      }
      const editable = response.data.data
      const cart = mapEditableOrderToCart(
        editable,
        rootState.products.dataProduct || []
      )
      return dispatch('begin', { editable, cart })
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      dispatch('notifications/error', normalized.message, { root: true })
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  updateDirty({ dispatch, state }, cart) {
    dispatch('set/dirty', isOrderEditDirty(state.originalCart, cart))
  },

  async save({ dispatch, state, rootState }) {
    const cart = Array.isArray(rootState.cart.dataCart)
      ? rootState.cart.dataCart
      : []
    const payload = buildOrderEditPayload({
      contentRevision: state.contentRevision,
      expectedTotal: rootState.cart.totalCart,
      cart,
    })
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.patch(
        `/baseurl/api/v1/orders/${state.orderId}/items`,
        payload,
        { headers: authHeaders() }
      )
      const data = response.data.data
      dispatch('set/contentRevision', data.content_revision)
      dispatch('set/originalCart', clone(cart))
      dispatch('set/dirty', false)
      dispatch('set/paymentStatus', data.payment_status)
      dispatch('set/paymentRefresh', data.payment_refresh || null)
      dispatch('set/payment', data.payment || null)
      return { ok: true, data, error: null }
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      if (normalized.payment_refresh) {
        dispatch('set/paymentRefresh', normalized.payment_refresh)
      }
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  async regeneratePayment({ dispatch, state }) {
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.post(
        `/baseurl/api/v1/stripe/payment-intents/orders/${state.orderId}/regenerate`,
        {},
        { headers: authHeaders() }
      )
      dispatch('set/paymentRefresh', 'succeeded')
      dispatch('set/paymentStatus', 'requires_payment')
      dispatch('set/payment', response.data.data)
      return { ok: true, data: response.data.data, error: null }
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  cancel({ dispatch, state }) {
    const clearCart = state.active === true
    clear(dispatch)
    if (clearCart) {
      dispatch('cart/setTocart', null, { root: true })
      dispatch('cart/setTotal', 0, { root: true })
      dispatch('cart/setIndex', 0, { root: true })
    }
    return { ok: true, data: null, error: null }
  },

  complete({ dispatch }) {
    return dispatch('cancel')
  },
}
