import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const { terminalErrorMessage } = require('../helpers/stripeTerminal')
const baseUrl = '/baseurl/api/v1/stripe/terminal'
const requestsByState = new WeakMap()
const paymentStatuses = ['creating', 'processing', 'succeeded', 'failed', 'canceled']

const requestState = (state) => {
  if (!requestsByState.has(state)) {
    requestsByState.set(state, {
      active: 0, readers: 0, currentReader: 0, payment: 0, error: 0,
    })
  }
  return requestsByState.get(state)
}

const requestConfig = () => ({
  headers: {
    Authorization: `Bearer ${typeof localStorage === 'undefined' ? '' : localStorage.getItem('token') || ''}`,
  },
  skipGlobalErrorNotification: true,
})

const terminalError = (code) => {
  const error = new Error(code)
  error.code = code
  return error
}

const normalizeError = (error) => {
  const backend = error && error.response && error.response.data
  const candidate = backend && backend.error || error && error.code
  const code = terminalErrorMessage(candidate) ? candidate : 'TERMINAL_REQUEST_FAILED'
  return { code, message: terminalErrorMessage(code) }
}

const validId = (id) => Number.isSafeInteger(id) && id > 0
const validObject = (value) => value && typeof value === 'object' && !Array.isArray(value)
const hasFields = (value, fields) => fields.every((field) =>
  Object.prototype.hasOwnProperty.call(value, field))
const validReader = (reader) => validObject(reader) && validId(reader.id) &&
  hasFields(reader, ['serialNumber', 'deviceType', 'assignedUserId', 'assignedServicePointId']) &&
  typeof reader.label === 'string' && reader.label.trim() &&
  ['online', 'offline'].includes(reader.status) && typeof reader.isActive === 'boolean' &&
  (reader.serialNumber === null || typeof reader.serialNumber === 'string') &&
  (reader.deviceType === null || typeof reader.deviceType === 'string') &&
  (reader.assignedUserId == null || validId(reader.assignedUserId)) &&
  (reader.assignedServicePointId == null || validId(reader.assignedServicePointId))
const validReaders = (readers) => Array.isArray(readers) && readers.every(validReader)
const validPayment = (payment) => validObject(payment) && validId(payment.id) &&
  hasFields(payment, ['failureCode', 'failureMessage']) &&
  validId(payment.readerId) && paymentStatuses.includes(payment.status) &&
  Number.isSafeInteger(payment.amountCents) && payment.amountCents >= 0 &&
  payment.currency === 'eur' && Array.isArray(payment.orderIds) &&
  payment.orderIds.length > 0 && payment.orderIds.every(validId) &&
  new Set(payment.orderIds).size === payment.orderIds.length &&
  (payment.failureCode === null || typeof payment.failureCode === 'string') &&
  (payment.failureMessage === null || typeof payment.failureMessage === 'string')
const validEnvelope = (response) => {
  const data = response && response.data
  return validObject(data) && data.success === true &&
    Number.isInteger(data.code) && data.code >= 200 && data.code < 300 &&
    Object.prototype.hasOwnProperty.call(data, 'data')
}

const requiredId = (value) => {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  if (!validId(id)) throw terminalError('TERMINAL_INVALID_INPUT')
  return id
}

const readerPayload = (input) => {
  if (!validObject(input) || typeof input.registrationCode !== 'string' ||
    !input.registrationCode.trim() || typeof input.label !== 'string' ||
    !input.label.trim()) throw terminalError('TERMINAL_INVALID_INPUT')
  const payload = {
    registrationCode: input.registrationCode,
    label: input.label,
    assignedUserId: requiredId(input.assignedUserId),
  }
  if (input.address !== undefined) {
    const address = input.address
    if (!validObject(address) || !['line1', 'postalCode', 'city'].every(
      (key) => typeof address[key] === 'string' && address[key].trim()
    ) || address.country !== 'FR') throw terminalError('TERMINAL_INVALID_INPUT')
    payload.address = {
      line1: address.line1, postalCode: address.postalCode,
      city: address.city, country: address.country,
    }
  }
  return payload
}

const paymentPayload = (input) => {
  if (!validObject(input) || !Array.isArray(input.orderIds) || !input.orderIds.length ||
    !input.orderIds.every(validId) || new Set(input.orderIds).size !== input.orderIds.length) {
    throw terminalError('TERMINAL_INVALID_INPUT')
  }
  const { discountType, discountValue } = input
  if (discountType !== undefined && !['none', 'percent', 'amount'].includes(discountType)) {
    throw terminalError('TERMINAL_INVALID_INPUT')
  }
  if (discountValue !== undefined &&
    (discountType === 'amount'
      ? !Number.isSafeInteger(discountValue) || discountValue < 0
      : discountType === 'percent'
        ? !Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100
        : discountValue !== 0)) throw terminalError('TERMINAL_INVALID_INPUT')
  return {
    orderIds: input.orderIds,
    ...(discountType !== undefined && { discountType }),
    ...(discountValue !== undefined && { discountValue }),
  }
}

const runRequest = async ({ dispatch, state }, scope, send, validDto, onSuccess, options = {}) => {
  const request = requestState(state)
  const generation = ++request[scope]
  const errorGeneration = ++request.error
  request.active += 1
  dispatch('set/loading', true)
  dispatch('set/error', null)
  try {
    const response = await send()
    if (!validEnvelope(response) || !validDto(response.data.data)) {
      throw terminalError('TERMINAL_INVALID_RESPONSE')
    }
    const dto = response.data.data
    if (options.onValidated) options.onValidated(dto, request)
    const samePayment = options.paymentId === undefined ||
      !state.activePayment || state.activePayment.id === options.paymentId
    if (request[scope] === generation && samePayment) onSuccess(dto, request)
    return dto
  } catch (error) {
    if (request.error === errorGeneration && request[scope] === generation) {
      dispatch('set/error', normalizeError(error))
    }
    return false
  } finally {
    request.active -= 1
    if (request.active === 0) dispatch('set/loading', false)
  }
}

const updateReader = (dispatch, state, reader) => {
  const found = state.readers.some((item) => item.id === reader.id)
  const readers = state.readers.map((item) => item.id === reader.id ? reader : item)
  dispatch('set/readers', found ? readers : [...readers, reader])
}

const invalidateCurrentReader = (dispatch, state, reader, request) => {
  request.currentReader += 1
  if (state.currentReader && state.currentReader.id === reader.id) {
    dispatch('set/currentReader', null)
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
  getReaders(context) {
    const { dispatch, state } = context
    return runRequest(context, 'readers',
      () => this.$axios.get(`${baseUrl}/readers`, requestConfig()),
      validReaders,
      (readers, request) => {
        dispatch('set/readers', readers)
        if (state.currentReader) {
          const current = readers.find((reader) => reader.id === state.currentReader.id)
          if (!current || !current.isActive ||
            current.assignedUserId !== state.currentReader.assignedUserId) {
            request.currentReader += 1
            dispatch('set/currentReader', null)
          }
        }
      })
  },
  registerReader(context, input) {
    const { dispatch, state } = context
    return runRequest(context, 'readers',
      () => this.$axios.post(`${baseUrl}/readers`, readerPayload(input), requestConfig()),
      validReader,
      (reader) => updateReader(dispatch, state, reader),
      { onValidated: (reader, request) => invalidateCurrentReader(dispatch, state, reader, request) })
  },
  assignReader(context, input) {
    const { dispatch, state } = context
    return runRequest(context, 'readers',
      () => {
        if (!validObject(input)) throw terminalError('TERMINAL_INVALID_INPUT')
        const id = requiredId(input.id)
        const assignedUserId = requiredId(input.assignedUserId)
        return this.$axios.patch(`${baseUrl}/readers/${id}/assignment`, { assignedUserId }, requestConfig())
      }, validReader,
      (reader) => updateReader(dispatch, state, reader),
      { onValidated: (reader, request) => invalidateCurrentReader(dispatch, state, reader, request) })
  },
  setReaderActive(context, input) {
    const { dispatch, state } = context
    return runRequest(context, 'readers',
      () => {
        if (!validObject(input) || typeof input.isActive !== 'boolean') {
          throw terminalError('TERMINAL_INVALID_INPUT')
        }
        const id = requiredId(input.id)
        return this.$axios.patch(`${baseUrl}/readers/${id}/status`, { isActive: input.isActive }, requestConfig())
      }, validReader,
      (reader) => updateReader(dispatch, state, reader),
      { onValidated: (reader, request) => invalidateCurrentReader(dispatch, state, reader, request) })
  },
  refreshReaders(context) {
    const { dispatch } = context
    return runRequest(context, 'readers',
      () => this.$axios.post(`${baseUrl}/readers/refresh`, {}, requestConfig()),
      validReaders, (readers) => dispatch('set/readers', readers))
  },
  getCurrentReader(context) {
    const { dispatch } = context
    return runRequest(context, 'currentReader',
      () => this.$axios.get(`${baseUrl}/current-reader`, requestConfig()),
      (reader) => reader === null || validReader(reader),
      (reader) => dispatch('set/currentReader', reader))
  },
  startPayment(context, input) {
    const { dispatch } = context
    return runRequest(context, 'payment',
      () => this.$axios.post(`${baseUrl}/payments`, paymentPayload(input), requestConfig()),
      validPayment, (payment) => dispatch('set/activePayment', payment))
  },
  refreshPayment(context, input) {
    const { dispatch } = context
    let paymentId
    return runRequest(context, 'payment',
      () => {
        paymentId = requiredId(input)
        return this.$axios.get(`${baseUrl}/payments/${paymentId}`, requestConfig())
      }, (payment) => validPayment(payment) && payment.id === paymentId,
      (payment) => dispatch('set/activePayment', payment),
      { get paymentId() { return paymentId } })
  },
  cancelPayment(context, input) {
    const { dispatch } = context
    let paymentId
    return runRequest(context, 'payment',
      () => {
        paymentId = requiredId(input)
        return this.$axios.post(`${baseUrl}/payments/${paymentId}/cancel`, {}, requestConfig())
      }, (payment) => validPayment(payment) && payment.id === paymentId,
      (payment) => dispatch('set/activePayment', payment),
      { get paymentId() { return paymentId } })
  },
  resetPayment({ dispatch, state }) {
    const request = requestState(state)
    request.payment += 1
    request.error += 1
    dispatch('set/activePayment', null)
    dispatch('set/error', null)
  },
}
