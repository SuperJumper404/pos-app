import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const isSameDay = (date1, date2) => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

// Fonction pour supprimer les commandes qui ne sont pas du jour
const removeOldOrders = () => {
  const ordersSent = JSON.parse(localStorage.getItem('ordersSent')) || []

  // Filtrer les commandes pour ne garder que celles du jour
  const todayOrders = ordersSent.filter((order) =>
    isSameDay(order.date, Date.now())
  )

  // Réécrire dans le localStorage uniquement les commandes du jour
  localStorage.setItem('ordersSent', JSON.stringify(todayOrders))
}

export const state = () => ({
  dataCart: null,
  indexCart: 0,
  totalCart: 0,
  insertId: 0,
  allOrdersSent: [],
  message: '',
})

removeOldOrders()
export const mutations = {
  ...defaultMutations(state()),
  ADD_ORDER_SENT(state, insertId) {
    // Ajout de la commande à l'état global (Vuex)
    if (!state.allOrdersSent.includes(insertId)) {
      state.allOrdersSent.push(insertId)
    }

    // Récupérer les commandes précédemment stockées dans le localStorage
    const ordersSent = JSON.parse(localStorage.getItem('ordersSent')) || []

    // Ajouter la nouvelle commande si elle n'est pas déjà présente
    if (!ordersSent.some((order) => order.insertId === insertId)) {
      ordersSent.push({ insertId, date: Date.now() })

      // Stocker les commandes mises à jour dans le localStorage sous forme de tableau
      localStorage.setItem('ordersSent', JSON.stringify(ordersSent))
    }

    const allOrders =
      JSON.parse(localStorage.getItem('ordersSent')).map(
        (order) => order.insertId
      ) || []
    state.allOrdersSent = [...new Set([...state.allOrdersSent, ...allOrders])]
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
        return true
      })
      .catch((error) => {
        console.log('Error Detail Order', error.response)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
}
