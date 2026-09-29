import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const { sortArchivedOrdersByArchiveDate } = require('@/helpers/history')

const hasSettlementId = (value) =>
  value !== null && value !== undefined && value !== ''

export const normalizeArchivedHistory = (orders = []) => {
  const settlementItems = new Map()
  const legacyItems = []

  orders.forEach((order) => {
    const settlementId = order.cash_register_settlement_id
    if (!hasSettlementId(settlementId)) {
      legacyItems.push({
        ...order,
        historyKey: `archive-${order.id}`,
        isSettlement: false,
      })
      return
    }

    if (!settlementItems.has(String(settlementId))) {
      const tableReference = order.settlement_table_reference || order.username || ''
      settlementItems.set(String(settlementId), {
        ...order,
        id: Number(settlementId) || settlementId,
        historyKey: `settlement-${settlementId}`,
        isSettlement: true,
        historyLabel: `Encaissement table ${tableReference}`,
        ordernumber: `Encaissement table ${tableReference}`,
        username: tableReference,
        subtotal: order.settlement_total_amount,
        payment: order.settlement_payment_method,
        used_payment_method: order.settlement_payment_method,
        payment_status: 'paid',
        status: 3,
        created: order.settlement_created_at || order.archived_at || order.created,
        archived_at: order.settlement_created_at || order.archived_at,
        archivedOrders: [],
      })
    }

    const item = settlementItems.get(String(settlementId))
    if (!item.archivedOrders.some((archivedOrder) => String(archivedOrder.id) === String(order.id))) {
      item.archivedOrders.push(order)
    }
  })

  return sortArchivedOrdersByArchiveDate([
    ...settlementItems.values(),
    ...legacyItems,
  ])
}
export const state = () => ({
  dataArchivedOrders: [],
  // dataArchivedOrdersByUserId: [],
  message: '',
  detailArchivedOrder: [],
  receipToken: '',
  metrics: '',
  // AllDetailOrders: [],
  lastCreatedOrder: null,
  cashRegisterSettlement: null,
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
        const normalizedHistory = normalizeArchivedHistory(
          response.data.data
        )
        const lastCreatedOrder = normalizedHistory
          .map(function (e) {
            return e.archived_at || e.created
          })
          .sort()
          .reverse()[0]

        dispatch('set/lastCreatedOrder', lastCreatedOrder)
        dispatch('set/dataArchivedOrders', normalizedHistory)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response)
        dispatch('set/dataArchivedOrders', [])
        return false
      })
  },
  getCashRegisterSettlement({ dispatch }, id) {
    return this.$axios
      .get(`/baseurl/api/v1/cash-register/settlements/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/cashRegisterSettlement', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response)
        dispatch('set/cashRegisterSettlement', null)
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
