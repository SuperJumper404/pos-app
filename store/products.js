import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataProduct: [],
  detailProduct: [],
  message: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
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
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
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
      .then((response) => {
        dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
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
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
}
