import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const DEFAULT_TIMEOUT = 5000

export const state = () => ({
  items: [],
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const buildNotification = (payload, type) => {
  const notification =
    typeof payload === 'string' ? { message: payload } : { ...payload }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    timeout: DEFAULT_TIMEOUT,
    ...notification,
  }
}

export const actions = {
  push({ state, dispatch }, payload) {
    const notification = buildNotification(payload, payload.type || 'info')
    dispatch('set/items', [...state.items, notification])
    return notification.id
  },
  success({ dispatch }, payload) {
    return dispatch('push', {
      ...(typeof payload === 'string' ? { message: payload } : payload),
      type: 'success',
    })
  },
  error({ dispatch }, payload) {
    return dispatch('push', {
      ...(typeof payload === 'string' ? { message: payload } : payload),
      type: 'error',
      timeout: 7000,
    })
  },
  warning({ dispatch }, payload) {
    return dispatch('push', {
      ...(typeof payload === 'string' ? { message: payload } : payload),
      type: 'warning',
    })
  },
  info({ dispatch }, payload) {
    return dispatch('push', {
      ...(typeof payload === 'string' ? { message: payload } : payload),
      type: 'info',
    })
  },
  remove({ state, dispatch }, id) {
    dispatch(
      'set/items',
      state.items.filter((item) => item.id !== id)
    )
  },
  clear({ dispatch }) {
    dispatch('set/items', [])
  },
}
