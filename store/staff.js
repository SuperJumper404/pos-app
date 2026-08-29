import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const { isStaffAccess } = require('../helpers/staffRoles')

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const errorMessage = (error) =>
  error?.response?.data?.message || 'Une erreur est survenue.'

const staffPayload = (params) => ({
  username: params.username,
  access: params.access,
  status: params.status,
  module_permissions: params.module_permissions,
  service_point_id: params.service_point_id,
})

export const state = () => ({
  data: [],
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

export const actions = {
  async getAll({ dispatch }) {
    try {
      const response = await this.$axios.get('/baseurl/api/v1/users', {
        headers: authHeaders(),
      })
      const users = Array.isArray(response.data.data) ? response.data.data : []
      const staff = users
        .filter((user) => isStaffAccess(user.access))
        .sort((first, second) => Number(second.is_primary_admin) - Number(first.is_primary_admin))
      dispatch(
        'set/data',
        staff
      )
      return true
    } catch (error) {
      const message = errorMessage(error)
      dispatch('set/message', message)
      dispatch('set/data', [])
      dispatch('notifications/error', message, { root: true })
      return false
    }
  },

  async create({ dispatch }, params) {
    try {
      const response = await this.$axios.post('/baseurl/api/v1/register', staffPayload(params), {
        headers: authHeaders(),
      })
      dispatch('notifications/success', response.data.message, { root: true })
      return response.data.data || true
    } catch (error) {
      const message = errorMessage(error)
      dispatch('set/message', message)
      dispatch('notifications/error', message, { root: true })
      return false
    }
  },

  async update({ dispatch }, { id, data }) {
    try {
      const response = await this.$axios.patch(`/baseurl/api/v1/user/${id}`, staffPayload(data), {
        headers: authHeaders(),
      })
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    } catch (error) {
      const message = errorMessage(error)
      dispatch('set/message', message)
      dispatch('notifications/error', message, { root: true })
      return false
    }
  },

  async provisionCredentials({ dispatch }, { id }) {
    try {
      const response = await this.$axios.patch(
        `/baseurl/api/v1/user/${id}/staff-credentials`,
        {},
        { headers: authHeaders() }
      )
      dispatch('notifications/success', response.data.message, { root: true })
      return response.data.data
    } catch (error) {
      const message = errorMessage(error)
      dispatch('set/message', message)
      dispatch('notifications/error', message, { root: true })
      return false
    }
  },

  async remove({ dispatch }, id) {
    try {
      const response = await this.$axios.delete(`/baseurl/api/v1/user/${id}`, {
        headers: authHeaders(),
      })
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    } catch (error) {
      const message = errorMessage(error)
      dispatch('set/message', message)
      dispatch('notifications/error', message, { root: true })
      return false
    }
  },
}
