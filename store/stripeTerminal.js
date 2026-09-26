import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const baseUrl = '/baseurl/api/v1/stripe/terminal'

const requestConfig = () => ({
  headers: {
    Authorization: `Bearer ${typeof localStorage === 'undefined' ? '' : localStorage.getItem('token') || ''}`,
  },
  skipGlobalErrorNotification: true,
})

const normalizeError = (error) => {
  const data = error && error.response && error.response.data
  const code = data && data.error
  const message = data && data.message
  return {
    code: typeof code === 'string' && /^TERMINAL_[A-Z_]+$/.test(code)
      ? code
      : 'TERMINAL_REQUEST_FAILED',
    message: typeof message === 'string' && message.trim()
      ? message.trim().slice(0, 300)
      : 'Impossible de contacter le terminal.',
  }
}

const runRequest = async (dispatch, send, onSuccess) => {
  dispatch('set/loading', true)
  dispatch('set/error', null)
  try {
    const response = await send()
    const dto = response.data.data
    onSuccess(dto)
    return dto
  } catch (error) {
    dispatch('set/error', normalizeError(error))
    return false
  } finally {
    dispatch('set/loading', false)
  }
}

const readerPayload = (input) => ({
  registrationCode: input.registrationCode,
  label: input.label,
  assignedUserId: input.assignedUserId,
  ...(input.address && {
    address: {
      line1: input.address.line1,
      postalCode: input.address.postalCode,
      city: input.address.city,
      country: input.address.country,
    },
  }),
})

const updateReader = (dispatch, state, reader) => {
  const readers = state.readers.filter((item) => item.id !== reader.id)
  dispatch('set/readers', [...readers, reader])
  if (state.currentReader && state.currentReader.id === reader.id) {
    dispatch('set/currentReader', reader)
  }
}

export const state = () => ({
  readers: [],
  currentReader: null,
  activePayment: null,
  loading: false,
  error: null,
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

export const actions = {
  getReaders({ dispatch }) {
    return runRequest(
      dispatch,
      () => this.$axios.get(`${baseUrl}/readers`, requestConfig()),
      (readers) => dispatch('set/readers', readers)
    )
  },
  registerReader({ dispatch, state }, input) {
    return runRequest(
      dispatch,
      () => this.$axios.post(`${baseUrl}/readers`, readerPayload(input), requestConfig()),
      (reader) => updateReader(dispatch, state, reader)
    )
  },
  assignReader({ dispatch, state }, { id, assignedUserId }) {
    return runRequest(
      dispatch,
      () => this.$axios.patch(`${baseUrl}/readers/${encodeURIComponent(id)}/assignment`, { assignedUserId }, requestConfig()),
      (reader) => updateReader(dispatch, state, reader)
    )
  },
  setReaderActive({ dispatch, state }, { id, isActive }) {
    return runRequest(
      dispatch,
      () => this.$axios.patch(`${baseUrl}/readers/${encodeURIComponent(id)}/status`, { isActive }, requestConfig()),
      (reader) => updateReader(dispatch, state, reader)
    )
  },
  refreshReaders({ dispatch }) {
    return runRequest(
      dispatch,
      () => this.$axios.post(`${baseUrl}/readers/refresh`, {}, requestConfig()),
      (readers) => dispatch('set/readers', readers)
    )
  },
  getCurrentReader({ dispatch }) {
    return runRequest(
      dispatch,
      () => this.$axios.get(`${baseUrl}/current-reader`, requestConfig()),
      (reader) => dispatch('set/currentReader', reader)
    )
  },
  startPayment({ dispatch }, input) {
    const payload = {
      orderIds: input.orderIds,
      ...(input.discountType !== undefined && { discountType: input.discountType }),
      ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
    }
    return runRequest(
      dispatch,
      () => this.$axios.post(`${baseUrl}/payments`, payload, requestConfig()),
      (payment) => dispatch('set/activePayment', payment)
    )
  },
  refreshPayment({ dispatch }, id) {
    return runRequest(
      dispatch,
      () => this.$axios.get(`${baseUrl}/payments/${encodeURIComponent(id)}`, requestConfig()),
      (payment) => dispatch('set/activePayment', payment)
    )
  },
  cancelPayment({ dispatch }, id) {
    return runRequest(
      dispatch,
      () => this.$axios.post(`${baseUrl}/payments/${encodeURIComponent(id)}/cancel`, {}, requestConfig()),
      (payment) => dispatch('set/activePayment', payment)
    )
  },
  resetPayment({ dispatch }) {
    dispatch('set/activePayment', null)
    dispatch('set/error', null)
  },
}
