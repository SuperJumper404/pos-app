import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const { isStaffAccess, isDeliveryAdmin } = require('../helpers/staffRoles')
const latestRequests = new WeakMap()

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const errorMessage = (error) =>
  error?.response?.data?.message || 'Une erreur est survenue.'

const staffPayload = (params) => {
  const payload = {
    username: params.username,
    access: params.access,
    status: params.status,
    module_permissions: params.module_permissions,
    service_point_id: params.service_point_id,
  }
  if (Number(params.access) === 6) { payload.module_permissions = []; payload.service_point_id = null }
  return payload
}

export const state = () => ({
  data: [],
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

export const actions = {
  async readCredentials({ dispatch, rootState }, { id }) {
    const user = rootState && rootState.users && rootState.users.user
    if (!isDeliveryAdmin(user) || !/^[1-9]\d*$/.test(String(id))) return false
    const token = localStorage.getItem('token')
    const scope = JSON.stringify(user)
    const current = () => rootState.users.user === user && isDeliveryAdmin(user) &&
      JSON.stringify(user) === scope && localStorage.getItem('token') === token
    try {
      const response = await this.$axios.get(`/baseurl/api/v1/user/${id}/staff-credentials`, {
        headers: { Authorization: `Bearer ${token}` },
        skipGlobalErrorNotification: true,
      })
      if (!current()) return false
      const data = response.data.data || {}
      return { staff_login_id: data.staff_login_id, staff_pin: data.staff_pin, needs_regeneration: data.needs_regeneration === true }
    } catch (_) {
      if (current()) dispatch('notifications/error', 'Impossible de consulter ce PIN. Reessayez.', { root: true })
      return false
    }
  },

  async getAll({ dispatch, state, rootState }, options = {}) {
    if (rootState && !isDeliveryAdmin(rootState.users && rootState.users.user)) { dispatch('set/data', []); return false }
    const silent = options && options.silent === true
    const request = {}
    latestRequests.set(state, request)
    try {
      const response = await this.$axios.get('/baseurl/api/v1/users', {
        headers: authHeaders(),
        ...(silent && { skipGlobalErrorNotification: true }),
      })
      const users = Array.isArray(response.data.data) ? response.data.data : []
      const staff = users
        .filter((user) => isStaffAccess(user.access))
        .sort((first, second) => Number(second.is_primary_admin) - Number(first.is_primary_admin))
      if (latestRequests.get(state) !== request) return false
      dispatch(
        'set/data',
        staff
      )
      return true
    } catch (error) {
      if (latestRequests.get(state) !== request) return false
      const message = silent ? 'Impossible de charger les caissiers.' : errorMessage(error)
      dispatch('set/message', message)
      dispatch('set/data', [])
      if (!silent) dispatch('notifications/error', message, { root: true })
      return false
    }
  },

  async create({ dispatch, rootState }, params) {
    if (rootState && !isDeliveryAdmin(rootState.users && rootState.users.user)) return false
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

  async update({ dispatch, rootState }, { id, data }) {
    if (rootState && !isDeliveryAdmin(rootState.users && rootState.users.user)) return false
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

  async provisionCredentials({ dispatch, rootState }, { id }) {
    if (rootState && !isDeliveryAdmin(rootState.users && rootState.users.user)) return false
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

  async remove({ dispatch, rootState }, id) {
    if (rootState && !isDeliveryAdmin(rootState.users && rootState.users.user)) return false
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
