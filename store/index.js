import EasyAccess, { defaultMutations } from 'vuex-easy-access'
const config = require('../config/config.json')

function getHost() {
  const env = process.env.ENV
  const currentEnvConfig = config.environments[env]
  console.log(currentEnvConfig)
  return currentEnvConfig
}
console.log(config)
console.log('HOST', getHost())
export const state = () => ({
  authenticated: false,
  staticURL: getHost().backEndPoint.replace(/\/+$/, ''),
  stateDialog: false,
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  setDialog({ dispatch }, params) {
    dispatch('set/stateDialog', params)
  },
}
