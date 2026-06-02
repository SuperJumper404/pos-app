import createPersistedState from 'vuex-persistedstate'
const {
  parsePersistedState,
  serializePersistedState,
} = require('../helpers/persistedState')

export default ({ store }) => {
  createPersistedState({
    getState(key, storage) {
      const rawState = storage.getItem(key)
      const state = parsePersistedState(rawState)

      if (rawState && !state) {
        storage.removeItem(key)
      }

      return state
    },
    setState(key, state, storage) {
      storage.setItem(key, serializePersistedState(state))
    },
  })(store)
}
