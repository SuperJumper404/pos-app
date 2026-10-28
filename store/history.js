import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const { sortArchivedOrdersByArchiveDate, validHistoryPage } = require('@/helpers/history')
const { attemptStorageKey } = require('@/helpers/standaloneTerminal')
const entryRequests = new WeakMap()
const historyIdentity = rootState => {
  const user = rootState && rootState.users && rootState.users.user
  return { key: attemptStorageKey(user), token: user && user.token }
}
export const state = () => ({
  dataArchivedOrders: [],
  entries: [],
  entriesTotal: 0,
  entriesOwner: null,
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
  async getEntries({ state, rootState, dispatch }, input = {}) {
    const owner = historyIdentity(rootState)
    const generation = (entryRequests.get(state) || 0) + 1
    entryRequests.set(state, generation)
    const fresh = () => entryRequests.get(state) === generation && historyIdentity(rootState).key === owner.key &&
      historyIdentity(rootState).token === owner.token
    if (state.entriesOwner !== owner.key) {
      dispatch('set/entries', [])
      dispatch('set/entriesTotal', 0)
      dispatch('set/entriesOwner', owner.key)
    }
    if (!owner.key) return false
    const sortBy = ['eventAt', 'ordernumber', 'username', 'customer', 'taken_by_name', 'prepared_by_name', 'subtotal', 'payment_status', 'status'].includes(input.sortBy) ? input.sortBy : 'eventAt'
    try {
      const response = await this.$axios.get('/baseurl/api/v1/stripe/terminal/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        skipGlobalErrorNotification: true,
        params: {
          search: typeof input.search === 'string' ? input.search.slice(0, 200) : '',
          page: Number.isSafeInteger(input.page) && input.page > 0 ? input.page : 1,
          itemsPerPage: [10, 25, 50].includes(input.itemsPerPage) ? input.itemsPerPage : 10,
          sortBy, sortDesc: input.sortDesc !== false,
        },
      })
      const envelope = response && response.data
      if (!envelope || envelope.success !== true || !validHistoryPage(envelope.data)) throw new Error('Invalid history response')
      if (!fresh()) return false
      dispatch('set/entries', envelope.data.items)
      dispatch('set/entriesTotal', envelope.data.total)
      dispatch('set/message', '')
      return envelope.data
    } catch (_) {
      if (fresh()) dispatch('set/message', 'Impossible de charger l’historique. Actualisez pour réessayer.')
      return false
    }
  },
  async getEntryDetails({ rootState }, id) {
    const owner = historyIdentity(rootState)
    if (!owner.key || !Number.isSafeInteger(id) || id <= 0) return false
    try {
      const response = await this.$axios.get(`/baseurl/api/v1/detailorder/archive/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, skipGlobalErrorNotification: true,
      })
      if (historyIdentity(rootState).key !== owner.key || historyIdentity(rootState).token !== owner.token ||
        !response.data || !Array.isArray(response.data.data)) return false
      return response.data.data
    } catch (_) { return false }
  },
  getAllArchivedOrders({ dispatch }) {
    return this.$axios
      .get(`/baseurl/api/v1/orders/archives`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        const sortedArchivedOrders = sortArchivedOrdersByArchiveDate(
          response.data.data
        )
        const lastCreatedOrder = sortedArchivedOrders
          .map(function (e) {
            return e.archived_at || e.created
          })
          .sort()
          .reverse()[0]

        dispatch('set/lastCreatedOrder', lastCreatedOrder)
        dispatch('set/dataArchivedOrders', sortedArchivedOrders)
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
