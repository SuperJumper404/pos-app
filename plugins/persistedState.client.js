import createPersistedState from 'vuex-persistedstate'
const {
  parsePersistedState,
  sanitizePersistedState,
  serializePersistedState,
} = require('../helpers/persistedState')

export default ({ store }) => {
  createPersistedState({
    filter: ({ type }) => !/^(customer|loyalty|delivery|courier)\//.test(type),
    getState(key, storage) {
      const rawState = storage.getItem(key)
      const state = parsePersistedState(rawState)

      if (rawState && !state) {
        storage.removeItem(key)
      }

      return sanitizePersistedState(state)
    },
    setState(key, state, storage) {
      storage.setItem(key, serializePersistedState(sanitizePersistedState(state)))
    },
  })(store)
}
