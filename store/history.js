import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataArchivedOrders: [],
  // dataArchivedOrdersByUserId: [],
  message: '',
  detailArchivedOrder: [],
  receipToken: '',
  metrics: '',
  // AllDetailOrders: [],
  lastCreatedOrder: null,
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  getAllArchivedOrders({ dispatch }) {
    return this.$axios
      .get(`/baseurl/api/v1/orders/archives`, {
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
        dispatch('set/dataArchivedOrders', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response)
        dispatch('set/dataArchivedOrders', [])
        return false
      })
  },
  // getArchivedOrdersByUserId({ dispatch }, params) {
  //   return this.$axios
  //     .get(`/baseurl/api/v1/orders/archive?userId=${params.userId}`, {
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem('token')}`,
  //       },
  //     })
  //     .then((response) => {
  //       dispatch('set/dataArchivedOrdersByUserId', response.data.data)
  //       return true
  //     })
  //     .catch((error) => {
  //       dispatch('set/message', error.response.data.data)
  //       dispatch('set/dataArchivedOrdersByUserId', [])
  //       return false
  //     })
  // },
  getDetailArchivedOrder({ dispatch }, params) {
    console.log('Archived Order Store Call with', params)
    return this.$axios
      .get(`/baseurl/api/v1/detailorder/archive/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/detailArchivedOrder', response.data.data)
        return true
      })
  },
  getOrderByToken({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/orderbytoken/${params}`, {})
      .then((response) => {
        console.log(params)
        console.log('res token', response.data)
        dispatch('set/detailArchivedOrder', response.data.data.orderDetail)
        dispatch(
          'shop/set/shop_name',
          response.data.data.shopInfo[0].shop_name,
          {
            root: true,
          }
        )
        dispatch(
          'shop/set/shop_adress',
          response.data.data.shopInfo[0].shop_adress,
          { root: true }
        )
        dispatch(
          'shop/set/shop_phone',
          response.data.data.shopInfo[0].shop_phone,
          {
            root: true,
          }
        )
        dispatch(
          'shop/set/activate_tva',
          response.data.data.shopInfo[0].activate_tva,
          {
            root: true,
          }
        )

        return true
      })
  },
  getMetrics({ dispatch }, params) {
    console.log('GET METRICS=> ', params)
    return this.$axios
      .get(`/baseurl/api/v1/metrics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params,
      })
      .then((response) => {
        dispatch('set/metrics', response.data.data)
        return true
      })
  },
}

// getAllDetailOrders({ dispatch }, params) {
//   const requests = params.map((element) => {
//     return this.$axios.get(`/baseurl/api/v1/detailorder/${element}`, {
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem('token')}`,
//       },
//     })
//   })

//   Promise.all(requests)
//     .then((responses) => {
//       const allData = responses.map((response) => response.data.data)
//       console.log('All Order responses', allData)
//       dispatch('set/AllDetailOrders', allData)
//     })
//     .catch((error) => {
//       console.error('Error getting all order details:', error)
//     })

//   return true
// },
// updateOrder({ dispatch }, params) {
//   return this.$axios
//     .patch(`/baseurl/api/v1/orders/${params.id}`, params.data, {
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem('token')}`,
//       },
//     })
//     .then(() => {
//       // dispatch('set/message', response.data.message)
//       return true
//     })
//     .catch((error) => {
//       dispatch('set/message', error.response.data.message)
//       return false
//     })
// },
// deleteOrder({ dispatch }, params) {
//   return this.$axios
//     .post(
//       `/baseurl/api/v1/orders/delete/${params.id}`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       }
//     )
//     .then(() => {
//       return true
//     })
//     .catch((error) => {
//       console.error('Error delete')
//       dispatch('set/message', error.response.data.message)
//       return false
//     })
// },
// archiveOrder({ dispatch }, params) {
//   return this.$axios
//     .post(
//       `/baseurl/api/v1/orders/archive/${params.id}`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       }
//     )
//     .then(() => {
//       return true
//     })
//     .catch((error) => {
//       console.error('Error to Archive order ')
//       dispatch('set/message', error.response.data.message)
//       return false
//     })
// },
