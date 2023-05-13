import EasyAccess, { defaultMutations } from 'vuex-easy-access'
export const state = () => ({
  //   message: '',
  //   alertSuccess: false,
  //   alertError: false,
  //   user: {
  //     id: null,
  //     access: null,
  //     token: null,
  //   },
  //   userDetail: [],
  dataTables: [],
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  getAllTables({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/dataTables', response.data.data)
        return true
      })
      .catch((error) => {
        console.error('Error Get Users')
        dispatch('set/message', error.response.data.data)
        dispatch('set/dataTables', [])
        return false
      })
  },
  postTable({ dispatch }, params) {
    return this.$axios
      .post('/baseurl/api/v1/register', params, {
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
  deleteTable(params) {
    return this.$axios
      .delete(`/baseurl/api/v1/user/${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('Tripke')
        // dispatch('set/message', response.data.message)
        return true
      })
      .catch((error) => {
        console.log('Tripke', error.response.data)

        // dispatch('set/message', error.response.data.message)
        return false
      })
  },
}

//   postRegister({ dispatch }, params) {
//     return this.$axios
//       .post('/baseurl/api/v1/register', params)
//       .then((response) => {
//         dispatch('set/message', response.data.message)
//         return true
//       })
//       .catch((error) => {
//         dispatch('set/message', error.response.data.message)
//         return false
//       })
//   },
//   postLogin({ dispatch }, params) {
//     return this.$axios
//
// .post('/baseurl/api/v1/login', params)
//       .then((response) => {
//         localStorage.setItem('idUser', response.data.data[0].id)
//         localStorage.setItem('access', response.data.data[0].access)
//         localStorage.setItem('token', response.data.data[0].token)
//         dispatch('set/user.id', response.data.data[0].id)
//         dispatch('set/user.access', response.data.data[0].access)
//         dispatch('set/user.token', response.data.data[0].token)
//         dispatch('set/message', response.data.message)
//         return true
//       })
//       .catch((error) => {
//         dispatch('set/message', error.response.data.message)
//         return false
//       })
//   },
//   postLogout({ dispatch }) {
//     const id = localStorage.getItem('idUser')
//     return this.$axios
//       .post(
//         '/baseurl/api/v1/logout',
//         { id },
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem('token')}`,
//           },
//         }
//       )
//       .then(() => {
//         localStorage.removeItem('idUser')
//         localStorage.removeItem('access')
//         localStorage.removeItem('token')
//         dispatch('set/user.id', null)
//         dispatch('set/user.access', null)
//         dispatch('set/user.token', null)
//         return true
//       })
//       .catch((error) => {
//         return false || error.response
//       })
//   },
//   detailUser({ dispatch }, params) {
//     return this.$axios
//       .get(`/baseurl/api/v1/user/${params}`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       })
//       .then((response) => {
//         dispatch('set/userDetail', response.data.data)
//       })
//       .catch((error) => {
//         dispatch('set/message', error.response.data.message)
//       })
//   },
