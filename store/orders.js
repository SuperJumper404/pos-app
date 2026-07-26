import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataOrders: [],
  dataOrdersByUserId: [],
  message: '',
  detailOrder: [],
  detailOrderRequestId: 0,
  AllDetailOrders: [],
  lastCreatedOrder: null,
  complementaryOrder: null,
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  getAllOrder({ dispatch }) {
    return this.$axios
      .get(`/baseurl/api/v1/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        const lastCreatedOrder = response.data.data
          .map(function (e) {
            return e.created
          })
          .sort()
          .reverse()[0]

        dispatch('set/lastCreatedOrder', lastCreatedOrder)
        dispatch('set/dataOrders', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.data)
        dispatch('set/dataOrders', [])
        return false
      })
  },
  getOrdersByUserId({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/ordersbyUserId?userId=${params.userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/dataOrdersByUserId', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.data)
        dispatch('set/dataOrdersByUserId', [])
        return false
      })
  },
  getDetailOrder({ dispatch, state }, params) {
    const requestId = Number(state.detailOrderRequestId || 0) + 1
    dispatch('set/detailOrderRequestId', requestId)
    dispatch('set/detailOrder', [])
    return this.$axios
      .get(`/baseurl/api/v1/detailorder/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        if (state.detailOrderRequestId !== requestId) return false
        dispatch('set/detailOrder', response.data.data)
        return true
      })
      .catch((error) => {
        if (state.detailOrderRequestId !== requestId) return false
        const message =
          error.response?.data?.message ||
          error.message ||
          'Impossible de récupérer la commande.'
        dispatch('set/detailOrder', [])
        dispatch('set/message', message)
        return false
      })
  },
  getAllDetailOrders({ dispatch }, params) {
    const requests = params.map((element) => {
      return this.$axios.get(`/baseurl/api/v1/detailorder/${element}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
    })

    Promise.all(requests)
      .then((responses) => {
        const allData = responses.map((response) => response.data.data)
        console.log('All Order responses', allData)
        dispatch('set/AllDetailOrders', allData)
      })
      .catch((error) => {
        console.error('Error getting all order details:', error)
      })

    return true
  },
  updateOrder({ dispatch }, params) {
    return this.$axios
      .patch(`/baseurl/api/v1/orders/${params.id}`, params.data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', response.data.message, { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  deleteOrder({ dispatch }, params) {
    return this.$axios
      .post(
        `/baseurl/api/v1/orders/delete/${params.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => {
        dispatch('set/message', response.data.message)
        if (params.notify !== false) {
          dispatch('notifications/success', 'Commande supprimée avec succès.', {
            root: true,
          })
        }
        return true
      })
      .catch((error) => {
        console.error('Error delete')
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  archiveOrder({ dispatch }, params) {
    return this.$axios
      .post(
        `/baseurl/api/v1/orders/archive/${params.id}`,
        { payment_method: params.payment_method },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Commande archivée avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        console.error('Error to Archive order ')
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  refundStripeOrder({ dispatch }, params) {
    return this.$axios
      .post(
        `/baseurl/api/v1/stripe/refunds/orders/${params.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Commande remboursée.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        dispatch(
          'notifications/error',
          error.response?.data?.message || 'Remboursement impossible.',
          { root: true }
        )
        return false
      })
  },
}
