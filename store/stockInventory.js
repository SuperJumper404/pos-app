import EasyAccess, { defaultMutations } from 'vuex-easy-access'

export const state = () => ({
  dataItems: [],
  lowItems: [],
  detailItem: null,
  movements: [],
  shoppingList: [],
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const errorMessage = (error, fallback) =>
  (error &&
    error.response &&
    error.response.data &&
    error.response.data.message) ||
  fallback

export const actions = {
  getItems({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/stock/items', { headers: authHeaders() })
      .then((response) => {
        dispatch('set/dataItems', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de charger le stock.'))
        dispatch('set/dataItems', [])
        return false
      })
  },
  createIngredient({ dispatch }, data) {
    return this.$axios
      .post('/baseurl/api/v1/stock/ingredients', data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Ingredient cree avec succes.', { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de creer l'ingredient."))
        return false
      })
  },
  getLowItems({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/stock/low', { headers: authHeaders() })
      .then((response) => {
        dispatch('set/lowItems', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de charger les stocks bas.'))
        return false
      })
  },
  updateItem({ dispatch }, { id, data }) {
    return this.$axios
      .patch(`/baseurl/api/v1/stock/items/${id}`, data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de modifier l'article."))
        return false
      })
  },
  getItemDetail({ dispatch }, id) {
    return this.$axios
      .get(`/baseurl/api/v1/stock/items/${id}`, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/detailItem', response.data.data.item)
        dispatch('set/movements', response.data.data.movements || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de charger l'article."))
        return false
      })
  },
  replenishItem({ dispatch }, { id, data }) {
    return this.$axios
      .post(`/baseurl/api/v1/stock/items/${id}/replenishments`, data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Stock reapprovisionne.', { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de reapprovisionner.'))
        return false
      })
  },
  inventoryItem({ dispatch }, { id, data }) {
    return this.$axios
      .post(`/baseurl/api/v1/stock/items/${id}/inventories`, data, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible d'enregistrer l'inventaire."))
        return false
      })
  },
  bulkInventory({ dispatch }, items) {
    return this.$axios
      .post('/baseurl/api/v1/stock/inventory/bulk', { items }, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Inventaire enregistre.', { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible d'enregistrer l'inventaire."))
        return false
      })
  },
  archiveIngredient({ dispatch }, id) {
    return this.$axios
      .post(`/baseurl/api/v1/stock/items/${id}/archive`, {}, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible d'archiver l'ingredient."))
        return false
      })
  },
  deleteIngredient({ dispatch }, id) {
    return this.$axios
      .delete(`/baseurl/api/v1/stock/items/${id}`, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, "Impossible de supprimer l'ingredient."))
        return false
      })
  },
  generateShoppingList({ dispatch }) {
    return this.$axios
      .post('/baseurl/api/v1/stock/shopping-list/generate', {}, { headers: authHeaders() })
      .then((response) => {
        dispatch('set/shoppingList', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de generer la liste de courses.'))
        return false
      })
  },
  getShoppingList({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/stock/shopping-list', { headers: authHeaders() })
      .then((response) => {
        dispatch('set/shoppingList', response.data.data || [])
        return true
      })
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de charger la liste de courses.'))
        dispatch('set/shoppingList', [])
        return false
      })
  },
  setShoppingListTaken({ dispatch }, { id, taken }) {
    return this.$axios
      .patch(`/baseurl/api/v1/stock/shopping-list/${id}/taken`, { taken }, { headers: authHeaders() })
      .then(() => true)
      .catch((error) => {
        dispatch('set/message', errorMessage(error, 'Impossible de mettre a jour la ligne.'))
        return false
      })
  },
}
