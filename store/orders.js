import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataOrders: [],
  dataOrdersByUserId: [],
  message: '',
  detailOrder: [],
  lastCreatedOrder: null,
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
        dispatch('set/dataOrders', error.response.data.data)
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
        dispatch('set/dataOrdersByUserId', error.response.data.data)
        return false
      })
  },
  getDetailOrder({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/detailorder/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/detailOrder', response.data.data)
        return true
      })
  },
  updateOrder({ dispatch }, params) {
    return this.$axios
      .patch(`/baseurl/api/v1/orders/${params.id}`, params.data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then(() => {
        // dispatch('set/message', response.data.message)
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
      .then(() => {
        return true
      })
      .catch((error) => {
        console.error('Error delete')
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
}
