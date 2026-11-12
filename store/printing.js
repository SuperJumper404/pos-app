import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  dataXMLformatToPrint: '',
  ticketType: '',
  message: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  async postPrintingJobChecked(context, params) {
    const response = await this.$axios.post('/baseurl/api/v1/pushprintingjob', params, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      skipGlobalErrorNotification: true,
    })
    if (!response || response.status < 200 || response.status >= 300 || response.data?.success === false) {
      throw new Error("L'impression n'a pas pu être envoyée.")
    }
    return true
  },
  postPrintingJob({ dispatch }, params) {
    dispatch('notifications/success', 'Impression envoyée.', { root: true })
    const { awaitResult = false, ...printJob } = params
    try {
      const request = this.$axios.post(
        '/baseurl/api/v1/pushprintingjob',
        printJob,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      if (awaitResult) return Promise.resolve(request)
      Promise.resolve(request).catch(() => {})
    } catch (error) {
      if (awaitResult) return Promise.reject(error)
      // The job was attempted; printer transport errors are intentionally ignored.
    }
    return true
  },
}
