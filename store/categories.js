import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataCategories: [],
  detailCategory: [],
  message: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const categoryPayload = (params) => {
  if (!params || !params.image) return params
  const form = new FormData()
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      form.append(key, params[key])
    }
  })
  return form
}

export const actions = {
  getAllCategories({ dispatch }) {
    return this.$axios
      .get(`/baseurl/api/v1/categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: {
          shopid: localStorage.getItem('shopid'),
        },
      })
      .then((response) => {
        dispatch('set/dataCategories', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          error.response?.data?.message || 'Catégories indisponibles.'
        )
        dispatch('set/dataCategories', [])
        return false
      })
  },
  getDetailCategory({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/category/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/detailCategory', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.data)
        dispatch('set/detailCategory', [])
        return false
      })
  },
  postCategory({ dispatch }, params) {
    return this.$axios
      .post('/baseurl/api/v1/category', categoryPayload(params), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('Response postCategory', response)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Catégorie créée avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        console.log('Error postCategory', error)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  patchCategory({ dispatch }, params) {
    return this.$axios
      .patch(`/baseurl/api/v1/category/${params.id}`, categoryPayload(params.data), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Catégorie mise à jour avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  reorderCategories({ dispatch }, ids) {
    return this.$axios
      .patch(
        '/baseurl/api/v1/categories/order',
        { ids },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then(async (response) => {
        dispatch('set/message', response.data.message)
        await dispatch('getAllCategories')
        dispatch('notifications/success', 'Ordre des catégories mis à jour.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          error.response?.data?.message ||
            "Impossible de modifier l'ordre des catégories."
        )
        return false
      })
  },
  deleteCategory({ dispatch }, params) {
    return this.$axios
      .delete(`/baseurl/api/v1/category/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Catégorie supprimée avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
}
