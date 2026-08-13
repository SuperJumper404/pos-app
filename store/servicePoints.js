import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const readToken = () =>
  typeof localStorage === 'undefined' ? '' : localStorage.getItem('token')

export const state = () => ({
  items: [],
  selectedId: null,
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

export const actions = {
  getAll({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/service-points', {
        headers: { Authorization: `Bearer ${readToken()}` },
      })
      .then((response) => {
        const items = response.data.data || []
        const counter = items.find((point) => point.system_key === 'counter')
        dispatch('set/items', items)
        if (!this.state.servicePoints.selectedId && counter) {
          dispatch('set/selectedId', counter.id)
        }
        return items
      })
      .catch((error) => {
        dispatch('set/items', [])
        dispatch('set/message', error.response?.data?.message || '')
        return []
      })
  },
  select({ dispatch }, id) {
    dispatch('set/selectedId', id == null ? null : Number(id))
  },
}
