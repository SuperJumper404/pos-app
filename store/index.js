import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const config = require('../config/config.json')
console.log(config)
console.log('HOST', getHost())
function getHost() {
  const env = process.env.ENV
  const currentEnvConfig = config.environments[env]
  console.log(currentEnvConfig)
  return currentEnvConfig
}

console.log('Store env', process.env.privateURL)
export const state = () => ({
  authenticated: false,
  staticURL: getHost().backEndPoint,
  stateDialog: false,
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  setDialog({ dispatch }, params) {
    dispatch('set/stateDialog', params)
  },
}
