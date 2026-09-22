import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const qrBootstrapFactory =
  typeof require === 'function'
    ? require('../helpers/qrSessionBootstrap')
    : { createQrSessionBootstrap: null }
const sessionAuth =
  typeof require === 'function'
    ? require('../helpers/sessionAuth')
    : { isTokenExpired: () => false }
const { isTokenExpired } = sessionAuth
let tableAccessRequest = null
let tableAccessRequestToken = null
let qrSessionBootstrap = null
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
    service_point_name: null,
    order_source: null,
    qrSessionReady: false,
    qrSessionToken: null,
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
    currentState.user.service_point_name = null
    currentState.user.order_source = null
    currentState.user.qrSessionReady = false
    currentState.user.qrSessionToken = null
  },
}
export const plugins = [EasyAccess()]
const persistAuthStorage = (user) => {
  if (typeof localStorage === 'undefined' || !user) return false

  const servicePointSession = user.session_subject === 'service_point'
  if (servicePointSession || user.id == null) {
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
  localStorage.setItem(
    'service_point_name',
    servicePointSession
      ? user.username || user.service_point_name || ''
      : ''
  )
  localStorage.setItem('order_source', user.source || user.order_source || '')
  if (servicePointSession && user.qrSessionToken) {
    localStorage.setItem('table_access_token', user.qrSessionToken)
  }
  return true
}
const persistAuthenticatedUser = (dispatch, response) => {
  const payload = response.data.data
  const user = Array.isArray(payload) ? payload[0] : payload
  const servicePointSession = user.session_subject === 'service_point'
  persistAuthStorage(user)
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
  dispatch(
    'set/user.service_point_name',
    servicePointSession ? user.username || user.service_point_name || null : null
  )
  dispatch('set/user.order_source', user.source || null)
  return user
}
const restoreAuthenticatedUser = (dispatch) => {
  const token = localStorage.getItem('token')
  const access = localStorage.getItem('access')
  const shopid = localStorage.getItem('shopid')
  const sessionSubject = localStorage.getItem('session_subject') || 'staff'

  if (!token || !access || !shopid || isTokenExpired(token)) return false

  dispatch('set/user.id', localStorage.getItem('idUser'))
  dispatch('set/user.access', Number(access))
  dispatch('set/user.token', token)
  dispatch('set/user.shopid', Number(shopid))
  dispatch('set/user.module_permissions', JSON.parse(localStorage.getItem('module_permissions') || 'null'))
  dispatch('set/user.is_primary_admin', localStorage.getItem('is_primary_admin') === '1')
  dispatch('set/user.session_subject', sessionSubject)
  dispatch('set/user.service_point_id', localStorage.getItem('service_point_id') || null)
  dispatch('set/user.service_point_name', localStorage.getItem('service_point_name') || null)
  dispatch('set/user.order_source', localStorage.getItem('order_source') || null)
  dispatch('setAuthentication', true, { root: true })
  return true
}
export const actions = {
  ensureAuthenticatedStorage({ dispatch, state, rootState }) {
    const user = state.user || {}
    if (
      !user.token ||
      user.access === null ||
      user.shopid === null ||
      isTokenExpired(user.token)
    ) {
      return false
    }

    if (!rootState || !rootState.authenticated) {
      dispatch('setAuthentication', true, { root: true })
    }
    return persistAuthStorage(user)
  },
  restoreAuthenticatedUser({ dispatch }) {
    try {
      return restoreAuthenticatedUser(dispatch)
    } catch (error) {
      return false
    }
  },
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
        localStorage.removeItem('table_access_token')
        qrSessionBootstrap = null
        persistAuthenticatedUser(dispatch, response)
        dispatch('set/user.qrSessionReady', false)
        dispatch('set/user.qrSessionToken', null)
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
    const normalizedToken = String(token || '').trim()
    if (!normalizedToken) return Promise.resolve(false)
    if (tableAccessRequest && tableAccessRequestToken === normalizedToken) {
      return tableAccessRequest
    }

    tableAccessRequestToken = normalizedToken
    tableAccessRequest = this.$axios
      .post('/baseurl/api/v1/table-access', { token: normalizedToken })
      .then((response) => {
        localStorage.setItem('table_access_token', normalizedToken)
        persistAuthenticatedUser(dispatch, response)
        dispatch('set/user.qrSessionReady', false)
        dispatch('set/user.qrSessionToken', normalizedToken)
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
      .finally(() => {
        tableAccessRequest = null
        tableAccessRequestToken = null
      })
    return tableAccessRequest
  },
  bootstrapTableAccess({ dispatch }, token) {
    if (!qrSessionBootstrap) {
      qrSessionBootstrap = qrBootstrapFactory.createQrSessionBootstrap({
        authenticate: (qrToken) => dispatch('postTableAccess', qrToken),
        loadInitialData: () =>
          Promise.all([
            dispatch('shop/getCurrentShopInfo', null, { root: true }),
            dispatch('products/getProducts', null, { root: true }),
            dispatch('servicePoints/getAll', null, { root: true }),
          ]),
      })
    }

    return qrSessionBootstrap(token)
      .then((result) => {
        dispatch('set/user.qrSessionReady', true)
        dispatch('set/user.qrSessionToken', String(token || '').trim())
        return result
      })
      .catch((error) => {
        dispatch('set/user.qrSessionReady', false)
        throw error
      })
  },
  postClickAndCollectAccess({ dispatch }, shopId) {
    return this.$axios
      .post(`/baseurl/api/v1/shopInfo/click-and-collect/${shopId}/session`)
      .then((response) => {
        localStorage.removeItem('table_access_token')
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
    qrSessionBootstrap = null
    tableAccessRequest = null
    tableAccessRequestToken = null
    dispatch('set/user.id', null)
    dispatch('set/user.access', null)
    dispatch('set/user.token', null)
    dispatch('set/user.shopid', null)
    dispatch('set/user.module_permissions', null)
    dispatch('set/user.is_primary_admin', false)
    dispatch('set/user.session_subject', null)
    dispatch('set/user.service_point_id', null)
    dispatch('set/user.service_point_name', null)
    dispatch('set/user.order_source', null)
    dispatch('set/user.qrSessionReady', false)
    dispatch('set/user.qrSessionToken', null)
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
        localStorage.removeItem('service_point_name')
        localStorage.removeItem('order_source')
        localStorage.removeItem('table_access_token')
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
