import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  message: null,
  shop_name: '',
  shop_adress: '',
  shop_phone: '',
  shop_mail: '',
  shop_description: '',
  shop_hours: '',
  shop_payment_methods: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  getShopInfo({ dispatch }) {
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
        dispatch('set/shop_adress', response.data.data[0].shop_adress)
        dispatch('set/shop_phone', response.data.data[0].shop_phone)
        dispatch('set/shop_mail', response.data.data[0].shop_mail)
        dispatch('set/shop_description', response.data.data[0].shop_description)
        console.log('Open Hours', JSON.parse(response.data.data[0].hours))
        dispatch('set/shop_hours', JSON.parse(response.data.data[0].hours))
        dispatch(
          'set/shop_payment_methods',
          JSON.parse(response.data.data[0].shop_payment_methods)
        )
        return true
      })
      .catch((error) => {
        console.log('Error', error)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  updateShopInfo({ dispatch }, params) {
    return this.$axios
      .patch('/baseurl/api/v1/setShopInfo', params.data, {
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
