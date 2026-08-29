import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  message: '',
  alertSuccess: false,
  alertError: false,
  user: {
    id: null,
    access: null,
    token: null,
    shopid: null,
    module_permissions: null,
    is_primary_admin: false,
    session_subject: null,
    service_point_id: null,
    order_source: null,
  },
  userDetail: [],
})
export const mutations = {
  ...defaultMutations(state()),
  CLEAR_AUTHENTICATED_USER(currentState) {
    currentState.user.id = null
    currentState.user.access = null
    currentState.user.token = null
    currentState.user.shopid = null
    currentState.user.module_permissions = null
    currentState.user.is_primary_admin = false
    currentState.user.session_subject = null
    currentState.user.service_point_id = null
    currentState.user.order_source = null
  },
}
export const plugins = [EasyAccess()]
const persistAuthenticatedUser = (dispatch, response) => {
  const payload = response.data.data
  const user = Array.isArray(payload) ? payload[0] : payload
  const servicePointSession = user.session_subject === 'service_point'
  if (servicePointSession) {
    localStorage.removeItem('idUser')
  } else {
    localStorage.setItem('idUser', user.id)
  }
  localStorage.setItem('access', user.access)
  localStorage.setItem('token', user.token)
  localStorage.setItem('shopid', user.shopid)
  localStorage.setItem(
    'module_permissions',
    JSON.stringify(Array.isArray(user.module_permissions) ? user.module_permissions : null)
  )
  localStorage.setItem('is_primary_admin', user.is_primary_admin ? '1' : '0')
  localStorage.setItem('session_subject', user.session_subject || 'staff')
  localStorage.setItem('service_point_id', user.service_point_id || '')
  localStorage.setItem('order_source', user.source || '')
  dispatch('set/user.id', servicePointSession ? null : user.id)
  dispatch('set/user.access', user.access)
  dispatch('set/user.token', user.token)
  dispatch('set/user.shopid', user.shopid)
  dispatch('setAuthentication', true, { root: true })
  dispatch(
    'set/user.module_permissions',
    Array.isArray(user.module_permissions) ? user.module_permissions : null
  )
  dispatch('set/user.is_primary_admin', Boolean(user.is_primary_admin))
  dispatch('set/user.session_subject', user.session_subject || 'staff')
  dispatch('set/user.service_point_id', user.service_point_id || null)
  dispatch('set/user.order_source', user.source || null)
  return user
}
export const actions = {
  postRegister({ dispatch }, params) {
    params.shopid = localStorage.getItem('shopid')
    return this.$axios
      .post('/baseurl/api/v1/register', params)
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', response.data.message, { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  postLogin({ dispatch }, params) {
    return this.$axios
      .post('/baseurl/api/v1/login', params)
      .then((response) => {
        console.log('REspondse DAta', response.data.data)
        persistAuthenticatedUser(dispatch, response)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', response.data.message, { root: true })
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message || 'Connexion impossible.'
        dispatch('set/message', message)
        return false
      })
  },
  postTableAccess({ dispatch }, token) {
    return this.$axios
      .post('/baseurl/api/v1/table-access', { token })
      .then((response) => {
        persistAuthenticatedUser(dispatch, response)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', response.data.message, {
          root: true,
        })
        return true
      })
      .catch((error) => {
        const message =
          error.response && error.response.data
            ? error.response.data.message
            : 'Token QR invalide.'
        dispatch('set/message', message)
        dispatch('set/alertError', true)
        return false
      })
  },
  postClickAndCollectAccess({ dispatch }, shopId) {
    return this.$axios
      .post(`/baseurl/api/v1/shopInfo/click-and-collect/${shopId}/session`)
      .then((response) => {
        const user = persistAuthenticatedUser(dispatch, response)
        dispatch('set/message', response.data.message)
        return user || true
      })
      .catch((error) => {
        dispatch(
          'set/message',
          error.response?.data?.message || 'Click & Collect indisponible.'
        )
        return false
      })
  },
  clearAuthenticatedUser({ dispatch }) {
    dispatch('set/user.id', null)
    dispatch('set/user.access', null)
    dispatch('set/user.token', null)
    dispatch('set/user.shopid', null)
    dispatch('set/user.module_permissions', null)
    dispatch('set/user.is_primary_admin', false)
    dispatch('set/user.session_subject', null)
    dispatch('set/user.service_point_id', null)
    dispatch('set/user.order_source', null)
    return true
  },
  postLogout({ dispatch }) {
    const id = localStorage.getItem('idUser')
    return this.$axios
      .post(
        '/baseurl/api/v1/logout',
        { id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => {
        dispatch('orderEdit/cancel', null, { root: true })
        localStorage.removeItem('idUser')
        localStorage.removeItem('access')
        localStorage.removeItem('token')
        localStorage.removeItem('shopid')
        localStorage.removeItem('module_permissions')
        localStorage.removeItem('is_primary_admin')
        localStorage.removeItem('session_subject')
        localStorage.removeItem('service_point_id')
        localStorage.removeItem('order_source')
        dispatch('clearAuthenticatedUser')
        dispatch('clearAuthentication', null, { root: true })
        dispatch('set/message', response.data.message)
        dispatch('set/alertSuccess', true)
        dispatch('notifications/success', response.data.message, { root: true })
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)

        return false || error.response
      })
  },
  detailUser({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/user/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/userDetail', response.data.data)
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
      })
  },
}
