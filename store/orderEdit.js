import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import {
  cartToOrderEditPayload,
  editableOrderToCart,
  isOrderEditDirty,
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

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})
const clone = (value) => JSON.parse(JSON.stringify(value || []))
const apiError = (error) => {
  const response = error && error.response && error.response.data
  const data = response && response.data && typeof response.data === 'object'
    ? response.data
    : {}

  return {
    status: error && error.response ? error.response.status : null,
    message:
      (response && response.message) ||
      error.message ||
      'Impossible de modifier la commande.',
    ...data,
  }
}

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

const startSession = (dispatch, editable, cart) => {
  dispatch('set/active', true)
  dispatch('set/orderId', Number(editable.order_id))
  dispatch('set/orderNumber', String(editable.order_number))
  dispatch('set/contentRevision', editable.content_revision)
  dispatch('set/originalCart', clone(cart))
  dispatch('set/dirty', false)
  dispatch('set/paymentProvider', editable.payment_provider || null)
  dispatch('set/paymentStatus', editable.payment_status)
  dispatch('set/paymentRefresh', null)
  dispatch('set/payment', null)
  dispatch('cart/setTocart', clone(cart), { root: true })
  dispatch('cart/setTotal', Number(editable.total), { root: true })
  dispatch(
    'cart/setIndex',
    cart.reduce((total, line) => total + Number(line.qty || 0), 0),
    { root: true }
  )
}

export const actions = {
  async begin({ dispatch, rootState }, orderId) {
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
      const cart = editableOrderToCart(
        editable,
        rootState.products.dataProduct || []
      )
      startSession(dispatch, editable, cart)
      return { ok: true, data: editable, error: null }
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      dispatch('notifications/error', normalized.message, { root: true })
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  updateDirty({ dispatch, state, rootState }, cart) {
    const currentCart = cart || rootState.cart.dataCart || []
    dispatch('set/dirty', isOrderEditDirty(state.originalCart, currentCart))
  },

  async save({ dispatch, state, rootState }) {
    const cart = Array.isArray(rootState.cart.dataCart)
      ? rootState.cart.dataCart
      : []
    const payload = cartToOrderEditPayload({
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
      dispatch('complete')
      return { ok: true, data, error: null }
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  async retryPayment({ dispatch, state }, requestedOrderId) {
    const orderId = Number(requestedOrderId || state.orderId)
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.post(
        `/baseurl/api/v1/stripe/orders/${orderId}/replacement-payment`,
        {},
        { headers: authHeaders() }
      )
      const data = response.data.data
      dispatch('complete')
      return { ok: true, data, error: null }
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
