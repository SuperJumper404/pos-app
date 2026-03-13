import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataXMLformatToPrint: '',
  ticketType: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  postPrintingJob({ dispatch }, params) {
    return this.$axios
      .post('/baseurl/api/v1/pushprintingjob', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('Printing Info received', response)
        return true
      })
      .catch((error) => {
        console.log('Error Sending Printing Job', error)
        dispatch('set/message', error.response)
        return false
      })
  },
}
