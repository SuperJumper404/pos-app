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
  },
}
export const plugins = [EasyAccess()]
const persistAuthenticatedUser = (dispatch, response) => {
  const user = response.data.data[0]
  localStorage.setItem('idUser', user.id)
  localStorage.setItem('access', user.access)
  localStorage.setItem('token', user.token)
  localStorage.setItem('shopid', user.shopid)
  dispatch('set/user.id', user.id)
  dispatch('set/user.access', user.access)
  dispatch('set/user.token', user.token)
  dispatch('set/user.shopid', user.shopid)
  dispatch('setAuthentication', true, { root: true })
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
        console.log('RR', error.response)
        dispatch('set/message', error.response.data.message)
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
  clearAuthenticatedUser({ dispatch }) {
    dispatch('set/user.id', null)
    dispatch('set/user.access', null)
    dispatch('set/user.token', null)
    dispatch('set/user.shopid', null)
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
