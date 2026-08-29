import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataXMLformatToPrint: '',
  ticketType: '',
  message: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  postPrintingJob({ dispatch }, params) {
    dispatch('notifications/success', 'Impression envoyée.', { root: true })
    try {
      Promise.resolve(
        this.$axios.post('/baseurl/api/v1/pushprintingjob', params, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
      ).catch(() => {})
    } catch (error) {
      // The job was attempted; printer transport errors are intentionally ignored.
    }
    return true
  },
}
