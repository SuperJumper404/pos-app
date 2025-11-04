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
  shop_profile_image: '',
  shop_status: '',
  shop_printer_ip: '',
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
        dispatch('set/shop_status', response.data.data[0].shop_status)
        dispatch('set/shop_mail', response.data.data[0].shop_mail)
        dispatch('set/shop_description', response.data.data[0].shop_description)
        console.log('Open Hours', JSON.parse(response.data.data[0].hours))
        dispatch('set/shop_hours', JSON.parse(response.data.data[0].hours))
        dispatch('set/shop_printer_ip', response.data.data[0].shop_printer_ip)
        dispatch(
          'set/shop_payment_methods',
          JSON.parse(response.data.data[0].shop_payment_methods)
        )
        dispatch(
          'set/shop_profile_image',
          response.data.data[0].shop_profile_image
        )
        return true
      })
      .catch((error) => {
        console.log('Error', error)
        dispatch('set/message', error.response)
        return false
      })
  },
  getShopInfoClickAndCollect({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/shopInfo/click-and-collect/ ${params}`)
      .then((response) => {
        console.log('Shop Info received CLick and Collect', response)
        // dispatch('set/insertId', response.data.data.insertId)
        dispatch('set/shop_name', response.data.data.shop_name)
        dispatch('set/shop_adress', response.data.data.shop_adress)
        dispatch('set/shop_phone', response.data.data.shop_phone)
        dispatch('set/shop_status', response.data.data.shop_status)
        dispatch('set/shop_mail', response.data.data.shop_mail)
        dispatch('set/shop_description', response.data.data.shop_description)
        console.log('Open Hours', JSON.parse(response.data.data.hours))
        dispatch('set/shop_hours', JSON.parse(response.data.data.hours))
        dispatch(
          'set/shop_payment_methods',
          JSON.parse(response.data.data.shop_payment_methods)
        )
        dispatch(
          'set/shop_profile_image',
          response.data.data.shop_profile_image
        )
        return true
      })
      .catch((error) => {
        console.log('Error', error)
        dispatch('set/message', error.response)
        return false
      })
  },
  updateShopInfo({ dispatch }, params) {
    return this.$axios
      .patch('/baseurl/api/v1/updateShopInfo', params.data, {
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
