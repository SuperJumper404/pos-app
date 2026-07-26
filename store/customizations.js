import EasyAccess, { defaultMutations } from 'vuex-easy-access'

export const state = () => ({
  dataSteps: [],
  selectedStepId: null,
  loading: false,
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const authorizationHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const getErrorMessage = (error) =>
  (error.response && error.response.data && error.response.data.message) ||
  'Une erreur est survenue.'

const mutationOptions = (params) => ({
  refresh: !params || params.refresh !== false,
  notify: !params || params.notify !== false,
})

export const actions = {
  async getSteps({ dispatch }) {
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.get(
        '/baseurl/api/v1/customization-steps',
        { headers: authorizationHeaders() }
      )
      dispatch('set/dataSteps', response.data.data || [])
      dispatch('set/message', response.data.message)
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      dispatch('set/dataSteps', [])
      return false
    } finally {
      dispatch('set/loading', false)
    }
  },

  async createStep({ dispatch }, data) {
    try {
      const response = await this.$axios.post(
        '/baseurl/api/v1/customization-steps',
        data,
        { headers: authorizationHeaders() }
      )
      dispatch('set/message', response.data.message)
      await dispatch('getSteps')
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      return false
    }
  },

  async updateStep({ dispatch }, params) {
    const options = mutationOptions(params)
    try {
      const response = await this.$axios.patch(
        `/baseurl/api/v1/customization-steps/${params.id}`,
        params.data,
        { headers: authorizationHeaders() }
      )
      dispatch('set/message', response.data.message)
      if (options.refresh) await dispatch('getSteps')
      if (options.notify) {
        dispatch('notifications/success', response.data.message, {
          root: true,
        })
      }
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      return false
    }
  },

  async deleteStep({ dispatch }, id) {
    try {
      const response = await this.$axios.delete(
        `/baseurl/api/v1/customization-steps/${id}`,
        { headers: authorizationHeaders() }
      )
      dispatch('set/message', response.data.message)
      await dispatch('getSteps')
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      return false
    }
  },

  async createChoice({ dispatch }, params) {
    try {
      const response = await this.$axios.post(
        `/baseurl/api/v1/customization-steps/${params.stepId}/choices`,
        params.data,
        { headers: authorizationHeaders() }
      )
      dispatch('set/message', response.data.message)
      await dispatch('getSteps')
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      return false
    }
  },

  async updateChoice({ dispatch }, params) {
    const options = mutationOptions(params)
    try {
      const response = await this.$axios.patch(
        `/baseurl/api/v1/customization-choices/${params.id}`,
        params.data,
        { headers: authorizationHeaders() }
      )
      dispatch('set/message', response.data.message)
      if (options.refresh) await dispatch('getSteps')
      if (options.notify) {
        dispatch('notifications/success', response.data.message, {
          root: true,
        })
      }
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      return false
    }
  },

  async deleteChoice({ dispatch }, id) {
    try {
      const response = await this.$axios.delete(
        `/baseurl/api/v1/customization-choices/${id}`,
        { headers: authorizationHeaders() }
      )
      dispatch('set/message', response.data.message)
      await dispatch('getSteps')
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    } catch (error) {
      dispatch('set/message', getErrorMessage(error))
      return false
    }
  },
}
