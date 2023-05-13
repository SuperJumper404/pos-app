import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataOrders: [],
  dataOrdersByUserId: [],
  message: '',
  detailOrder: [],
  AllDetailOrders: [],
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
  archiveOrder({ dispatch }, params) {
    return this.$axios
      .post(
        `/baseurl/api/v1/orders/archive/${params.id}`,
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
        console.error('Error to Archive order ')
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
}
