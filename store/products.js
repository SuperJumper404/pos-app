import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataProduct: [],
  detailProduct: [],
  message: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const getErrorMessage = (error, fallback) =>
  (error &&
    error.response &&
    error.response.data &&
    error.response.data.message) ||
  fallback

export const actions = {
  getProducts({ dispatch }) {
    return this.$axios
      .get(`/baseurl/api/v1/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/dataProduct', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.data)
        dispatch('set/dataProduct', [])
        return false
      })
  },
  getDetailProduct({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/product/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/detailProduct', response.data.data)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.data)
        dispatch('set/detailProduct', [])
        return false
      })
  },
  postProducts({ dispatch }, params) {
    return this.$axios
      .post('baseurl/api/v1/product', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Produit créé avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          getErrorMessage(error, 'Impossible de créer le produit.')
        )
        return false
      })
  },
  updateProduct({ dispatch }, params) {
    return this.$axios
      .patch(`/baseurl/api/v1/product/${params.id}`, params.data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then(async (response) => {
        dispatch('set/message', response.data.message)
        if (params.refresh !== false) await dispatch('getProducts')
        if (params.notify !== false) {
          dispatch('notifications/success', 'Produit mis à jour avec succès.', {
            root: true,
          })
        }
        return true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          getErrorMessage(error, 'Impossible de mettre à jour le produit.')
        )
        return false
      })
  },
  updateProductCustomizationConfig({ dispatch }, params) {
    return this.$axios
      .put(
        `/baseurl/api/v1/products/${params.id}/customization-config`,
        params.data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then(async (response) => {
        dispatch('set/message', response.data.message)
        await dispatch('getProducts')
        dispatch('notifications/success', response.data.message, {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          getErrorMessage(
            error,
            'Impossible de mettre à jour la configuration du produit.'
          )
        )
        return false
      })
  },
  reorderProducts({ dispatch }, ids) {
    return this.$axios
      .patch(
        '/baseurl/api/v1/products/order',
        { ids },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then(async (response) => {
        dispatch('set/message', response.data.message)
        await dispatch('getProducts')
        dispatch('notifications/success', 'Ordre des produits mis à jour.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          getErrorMessage(error, "Impossible de modifier l'ordre des produits.")
        )
        return false
      })
  },
  deleteProduct({ dispatch }, params) {
    return this.$axios
      .delete(`/baseurl/api/v1/product/${params}`, {
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
}
