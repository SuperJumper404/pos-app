import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  message: null,
  shop_name: '',
  shop_adress: '',
  shop_phone: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  getShopInfo({ dispatch }, params) {
    return this.$axios
      .get('/baseurl/api/v1/shopInfo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('Shop Info received', response)
        // dispatch('set/insertId', response.data.data.insertId)
        dispatch('set/shop_name', response.data.data[0].shop_name)
        dispatch('set/shop_adress', response.data.data[0].adress)
        dispatch('set/shop_phone', response.data.data[0].admin_phone)
        return true
      })
      .catch((error) => {
        console.log('Error', error)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
}
