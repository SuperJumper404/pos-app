import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import { v4 as uuidv4 } from 'uuid'
const {
  appendOrderSentEntry,
  filterTodayOrderEntries,
  getOrderIds,
} = require('../helpers/ordersSent')
const { buildCheckoutItems } = require('../helpers/customizations')
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
})

removeOldOrders()
export const mutations = {
  ...defaultMutations(state()),
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
    let clientOrderToken = state.clientOrderToken
    if (!clientOrderToken) {
      clientOrderToken = uuidv4()
      dispatch('set/clientOrderToken', clientOrderToken)
    }

    const payload = {
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
    }
    const endpoint = stripe
      ? '/baseurl/api/v1/stripe/payment-intents/qr-table'
      : '/baseurl/api/v1/orders/checkout'

    try {
      const response = await this.$axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${
            typeof localStorage === 'undefined'
              ? ''
              : localStorage.getItem('token')
          }`,
        },
      })
      const data = response && response.data ? response.data.data : null
      if (data && data.orderId) commit('ADD_ORDER_SENT', data.orderId)
      dispatch('set/message', response?.data?.message || '')
      if (!stripe) {
        dispatch('set/clientOrderToken', null)
        dispatch('notifications/success', 'Commande envoyée avec succès.', {
          root: true,
        })
      }
      return { ok: true, data, error: null }
    } catch (error) {
      const responseData = error?.response?.data
      const domainData =
        responseData &&
        responseData.data &&
        typeof responseData.data === 'object'
          ? responseData.data
          : {}
      const checkoutError = {
        status: error?.response?.status || responseData?.code || null,
        code: domainData.code || null,
        message:
          responseData?.message ||
          error?.message ||
          'Impossible d’envoyer la commande.',
        ...domainData,
      }
      dispatch('set/message', checkoutError.message)
      return { ok: false, data: null, error: checkoutError }
    }
  },
  abandonCheckout({ dispatch }) {
    dispatch('set/clientOrderToken', null)
  },
  completeCheckout({ dispatch }) {
    dispatch('set/clientOrderToken', null)
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
