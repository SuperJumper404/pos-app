import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import { v4 as uuidv4 } from 'uuid'
const {
  appendOrderSentEntry,
  filterTodayOrderEntries,
  getOrderIds,
} = require('../helpers/ordersSent')
const {
  buildCheckoutItems,
  buildCheckoutPayloadSignature,
} = require('../helpers/customizations')
const { roundPrice } = require('../helpers/price-functions')

const readStoredOrdersSent = () => {
  if (typeof localStorage === 'undefined') return []

  try {
    const ordersSent = JSON.parse(localStorage.getItem('ordersSent')) || []
    return Array.isArray(ordersSent) ? ordersSent : []
  } catch (error) {
    return []
  }
}

const writeStoredOrdersSent = (ordersSent) => {
  if (typeof localStorage === 'undefined') return

  localStorage.setItem('ordersSent', JSON.stringify(ordersSent))
}

const CHECKOUT_ATTEMPT_UNRESOLVED = 'CHECKOUT_ATTEMPT_UNRESOLVED'
const SAFE_PREWRITE_ERROR_CODES = new Set([
  'CHECKOUT_REQUEST_INVALID',
  'INSUFFICIENT_STOCK',
  'KITCHEN_CLOSED',
  'PRODUCT_NOT_FOUND',
  'PRODUCT_UNAVAILABLE',
  'SHOP_NOT_FOUND',
  'STRIPE_CONNECT_INCOMPLETE',
  'STRIPE_PAYMENT_DISABLED',
])

const isSafePrewriteErrorCode = (code) =>
  typeof code === 'string' &&
  (code.startsWith('CUSTOMIZATION_') || SAFE_PREWRITE_ERROR_CODES.has(code))

const readAuthToken = () =>
  typeof localStorage === 'undefined' ? '' : localStorage.getItem('token')

const buildCheckoutPayload = (params, clientOrderToken) => ({
  client_order_token: clientOrderToken,
  expected_total: roundPrice(
    params.total == null ? params.expected_total : params.total
  ),
  customer: params.customer,
  customerID: params.customerID,
  payment: params.payment,
  remark: params.remark,
  phone: params.phone,
  items: buildCheckoutItems(params.dataCart),
})

const cloneCheckoutCart = (cart) => {
  if (!Array.isArray(cart)) return null
  return JSON.parse(JSON.stringify(cart))
}

const buildCheckoutAttemptPayload = (params, publicPayload) => ({
  ...publicPayload,
  dataCart: cloneCheckoutCart(params.dataCart),
  stripe: params.stripe === true,
})

const buildCheckoutError = (error) => {
  const responseData = error?.response?.data
  const domainData =
    responseData && responseData.data && typeof responseData.data === 'object'
      ? responseData.data
      : {}

  return {
    status: error?.response?.status || responseData?.code || null,
    code: domainData.code || null,
    message:
      responseData?.message ||
      error?.message ||
      'Impossible d’envoyer la commande.',
    ...domainData,
  }
}

const clearCheckoutAttempt = (dispatch) => {
  dispatch('set/clientOrderToken', null)
  dispatch('set/clientOrderSignature', null)
  dispatch('set/clientOrderPayload', null)
  dispatch('set/clientOrderOrderId', null)
  dispatch('set/clientOrderAuthRedirect', false)
  dispatch('set/clientOrderStatus', 'idle')
}

const unresolvedCheckoutResult = (state) => ({
  ok: false,
  data: null,
  error: {
    code: CHECKOUT_ATTEMPT_UNRESOLVED,
    message:
      'La tentative de commande précédente doit être résolue avant de modifier la commande.',
    attempt_payload: state.clientOrderPayload,
    attempt_order_id: state.clientOrderOrderId,
  },
})

// Fonction pour supprimer les commandes qui ne sont pas du jour
const removeOldOrders = () => {
  const todayOrders = filterTodayOrderEntries(readStoredOrdersSent())

  // Réécrire dans le localStorage uniquement les commandes du jour
  writeStoredOrdersSent(todayOrders)
  return todayOrders
}

export const state = () => ({
  dataCart: null,
  indexCart: 0,
  totalCart: 0,
  insertId: 0,
  allOrdersSent: [],
  message: '',
  clientOrderToken: null,
  clientOrderSignature: null,
  clientOrderPayload: null,
  clientOrderOrderId: null,
  clientOrderAuthRedirect: false,
  clientOrderStatus: 'idle',
})

removeOldOrders()
export const mutations = {
  ...defaultMutations(state()),
  MARK_CHECKOUT_AUTH_REDIRECT(currentState, active) {
    currentState.clientOrderAuthRedirect = active === true
  },
  HYDRATE_ORDERS_SENT(state) {
    state.allOrdersSent = getOrderIds(removeOldOrders())
  },
  ADD_ORDER_SENT(state, insertId) {
    const todayOrders = removeOldOrders()
    const nextOrders = appendOrderSentEntry(todayOrders, insertId)
    writeStoredOrdersSent(nextOrders)
    state.allOrdersSent = getOrderIds(nextOrders)
  },
}

export const plugins = [EasyAccess()]
export const actions = {
  setTotal({ dispatch }, params) {
    dispatch('set/totalCart', params)
  },
  setIndex({ dispatch }, params) {
    dispatch('set/indexCart', params)
  },
  setTocart({ dispatch }, params) {
    dispatch('set/dataCart', params)
  },
  hydrateOrdersSent({ commit }) {
    commit('HYDRATE_ORDERS_SENT')
  },
  markOrderSent({ commit }, insertId) {
    commit('ADD_ORDER_SENT', insertId)
  },
  async checkoutOrder({ state, dispatch, commit }, params = {}) {
    const stripe = params.stripe === true
    const signature = buildCheckoutPayloadSignature(params)
    const previousAttemptStatus = state.clientOrderStatus || 'idle'
    const previousOrderId = state.clientOrderOrderId
    const isFirstAttempt =
      previousAttemptStatus === 'idle' &&
      !state.clientOrderToken &&
      !previousOrderId
    let clientOrderToken = state.clientOrderToken

    if (clientOrderToken && state.clientOrderSignature !== signature) {
      const isConfirmedReprice =
        params.repriceConfirmation === true &&
        state.clientOrderStatus === 'reprice_required'
      const canSafelyReplace = ['idle', 'prewrite_rejected'].includes(
        state.clientOrderStatus
      )

      if (!isConfirmedReprice && !canSafelyReplace) {
        return unresolvedCheckoutResult(state)
      }
      if (!isConfirmedReprice) {
        clearCheckoutAttempt(dispatch)
        clientOrderToken = null
      }
    }

    if (!clientOrderToken) {
      clientOrderToken = uuidv4()
      dispatch('set/clientOrderToken', clientOrderToken)
    }

    const payload = buildCheckoutPayload(params, clientOrderToken)
    const endpoint = stripe
      ? '/baseurl/api/v1/stripe/payment-intents/qr-table'
      : '/baseurl/api/v1/orders/checkout'

    dispatch('set/clientOrderSignature', signature)
    dispatch(
      'set/clientOrderPayload',
      buildCheckoutAttemptPayload(params, payload)
    )
    dispatch('set/clientOrderAuthRedirect', false)
    dispatch('set/clientOrderStatus', 'pending')

    try {
      const response = await this.$axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${readAuthToken()}`,
        },
      })
      const data = response && response.data ? response.data.data : null
      if (data && data.orderId) commit('ADD_ORDER_SENT', data.orderId)
      dispatch('set/message', response?.data?.message || '')
      if (stripe) {
        if (data && data.orderId) {
          dispatch('set/clientOrderOrderId', data.orderId)
        }
        dispatch('set/clientOrderStatus', 'stripe_prepared')
      } else {
        clearCheckoutAttempt(dispatch)
        dispatch('notifications/success', 'Commande envoyée avec succès.', {
          root: true,
        })
      }
      return { ok: true, data, error: null }
    } catch (error) {
      const checkoutError = buildCheckoutError(error)
      const isAuthenticationRejection = [401, 403].includes(
        Number(checkoutError.status)
      )
      const unsafeAuthenticationStatus =
        previousOrderId || previousAttemptStatus === 'stripe_prepared'
          ? 'stripe_prepared'
          : 'uncertain'
      const status = isAuthenticationRejection
        ? isFirstAttempt
          ? 'prewrite_rejected'
          : unsafeAuthenticationStatus
        : state.clientOrderOrderId
        ? 'stripe_prepared'
        : checkoutError.code === 'ORDER_REPRICE_REQUIRED'
        ? 'reprice_required'
        : isSafePrewriteErrorCode(checkoutError.code)
        ? 'prewrite_rejected'
        : 'uncertain'
      dispatch('set/clientOrderStatus', status)
      dispatch('set/message', checkoutError.message)
      return { ok: false, data: null, error: checkoutError }
    }
  },
  abandonCheckout({ state, dispatch }, options = {}) {
    if (
      options.safe !== true &&
      (state.clientOrderOrderId ||
        ['pending', 'uncertain', 'stripe_prepared'].includes(
          state.clientOrderStatus
        ))
    ) {
      return unresolvedCheckoutResult(state)
    }

    clearCheckoutAttempt(dispatch)
    return { ok: true, data: null, error: null }
  },
  markCheckoutAuthRedirect({ dispatch }, active = true) {
    dispatch('set/clientOrderAuthRedirect', active === true)
    return { ok: true, data: null, error: null }
  },
  completeCheckout({ dispatch }) {
    clearCheckoutAttempt(dispatch)
    return { ok: true, data: null, error: null }
  },
  async cancelStripeCheckout({ dispatch }, orderId) {
    if (!orderId) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'STRIPE_ORDER_ID_REQUIRED',
          message: 'La commande Stripe à annuler est introuvable.',
        },
      }
    }

    try {
      const response = await this.$axios.post(
        `/baseurl/api/v1/stripe/payment-intents/qr-table/${orderId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${readAuthToken()}` },
        }
      )
      dispatch('set/message', response?.data?.message || '')
      return {
        ok: true,
        data: response && response.data ? response.data.data : null,
        error: null,
      }
    } catch (error) {
      const checkoutError = buildCheckoutError(error)
      dispatch('set/message', checkoutError.message)
      return { ok: false, data: null, error: checkoutError }
    }
  },
  postOrder({ dispatch, commit }, params) {
    return this.$axios
      .post('/baseurl/api/v1/orders', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('NEw ORder Repoonse from Back ENd', response.data)
        dispatch('set/insertId', response.data.data.insertId)
        commit('ADD_ORDER_SENT', response.data.data.insertId)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Commande envoyée avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        console.log('Error Post Order', error)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  postDetailOrder({ dispatch }, params) {
    return this.$axios
      .post('/baseurl/api/v1/detailorder', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Détail de commande ajouté.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        console.log('Error Detail Order', error.response)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  createStripeQrTablePayment({ dispatch, commit }, params) {
    return this.$axios
      .post('/baseurl/api/v1/stripe/payment-intents/qr-table', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        const data = response.data.data
        if (data && data.orderId) {
          commit('ADD_ORDER_SENT', data.orderId)
        }
        return data
      })
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        dispatch(
          'notifications/error',
          error.response?.data?.message || 'Paiement Stripe indisponible.',
          { root: true }
        )
        return null
      })
  },
  markStripeOrderPayAtCounter({ dispatch, commit }, orderId) {
    return this.$axios
      .post(
        `/baseurl/api/v1/stripe/payment-intents/qr-table/${orderId}/pay-at-counter`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => {
        commit('ADD_ORDER_SENT', orderId)
        dispatch('set/message', response.data.message)
        dispatch(
          'notifications/success',
          'Commande envoyée. Paiement au comptoir à la fin.',
          { root: true }
        )
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        dispatch(
          'notifications/error',
          error.response?.data?.message || 'Impossible d’envoyer la commande.',
          { root: true }
        )
        return false
      })
  },
}
