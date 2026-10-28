import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import { v4 as uuidv4 } from 'uuid'
import { buildTrackingApi } from '@/helpers/deliveryTracking.js'
const {
  appendOrderSentEntry,
  filterTodayOrderEntries,
  getOrderIds,
} = require('../helpers/ordersSent')
const {
  buildCheckoutItems,
} = require('../helpers/customizations')
const {
  buildCounterPayBeforePayment,
  buildCheckoutIntentSignature,
  createDeliveryConfirmationSecret,
  deliveryDetails,
} = require('../helpers/counterCheckout')
const { roundPrice } = require('../helpers/price-functions')

const readStoredOrdersSent = () => {
  if (typeof localStorage === 'undefined') return []

  try {
    const ordersSent = JSON.parse(localStorage.getItem('ordersSent')) || []
    return Array.isArray(ordersSent) ? ordersSent : []
  } catch (error) {
    return []
  }
}

const writeStoredOrdersSent = (ordersSent) => {
  if (typeof localStorage === 'undefined') return

  localStorage.setItem('ordersSent', JSON.stringify(ordersSent))
}

const CHECKOUT_ATTEMPT_UNRESOLVED = 'CHECKOUT_ATTEMPT_UNRESOLVED'
// A remount shares this live guard; persisted/reloaded attempts have no surviving request.
const liveDeliveryCheckouts = new WeakSet()
const deliveryConfirmations = new WeakMap()
const deliveryTrackingResults = new WeakMap()
const trackingIdentity = (root, state) => [root.cart || state, root.users?.user?.shopid,
  root.users?.user?.id, root.users?.user?.session_subject, root.authenticated]
const sameIdentity = (left, right) => left.every((value, index) => value === right[index])
const trackingCustomerIdentity = root => {
  const customer = root.customer
  const session = customer?.session
  return [customer, customer?.epoch, customer?.shopId, session?.subject, session?.shopId, session?.customerId,
    Boolean(session && typeof session.customerId === 'string' && /^[1-9]\d{0,19}$/.test(session.customerId) &&
      /^[a-f0-9]{64}$/i.test(session.csrfToken) && Date.parse(session.expiresAt) > Date.now())]
}
const trackingCustomerCurrent = (root, authority) => !authority ||
  (sameIdentity(authority.identity, trackingCustomerIdentity(root)) && authority.identity[2] === authority.shopId &&
    authority.identity[3] === 'customer' && authority.identity[4] === authority.shopId &&
    authority.identity[5] === authority.customerId && authority.identity[6] === true)
const trackingRecord = (store, state, rootState, commit) => {
  let record = deliveryConfirmations.get(state)
  if (record) return record
  record = { generation: state.deliveryTrackingGeneration, confirmation: null, pending: null }
  record.advance = () => {
    record.confirmation = null
    record.generation++
    commit('DELIVERY_TRACKING_GENERATION', record.generation)
  }
  deliveryConfirmations.set(state, record)
  if (typeof store.watch === 'function') {
    // Synchronous invalidation also catches A -> B -> A within a single render tick.
    record.stop = store.watch(root => [...trackingIdentity(root, state),
      root.cart?.clientOrderToken, root.cart?.clientOrderPayload, root.cart?.clientOrderSignature], (next, previous) => {
      if (!sameIdentity(next.slice(0, 5), previous.slice(0, 5)) ||
        next.some((value, index) => index >= 5 && value !== previous[index] && (value != null || record.pending))) record.advance()
      if (next[0] !== state) { record.stop(); record.stopCustomer() }
    }, { sync: true })
    // SESSION refresh keeps authority; owner/epoch/clear transitions do not, even away and back.
    record.stopCustomer = store.watch(trackingCustomerIdentity, (next, previous) => {
      if (record.customerAuthority && !sameIdentity(next, previous)) record.advance()
    }, { sync: true })
  }
  return record
}
const trackingFrameCurrent = (store, rootState, state, record, frame) =>
  record.generation === frame.generation && sameIdentity(frame.identity, trackingIdentity(store.state || rootState, state)) &&
  trackingCustomerCurrent(store.state || rootState, frame.customerAuthority)
const trackingConfirmation = (store, rootState, state, record) => {
  const context = record.confirmation
  return context && trackingFrameCurrent(store, rootState, state, record, context) ? context : null
}
const SAFE_PREWRITE_ERROR_CODES = new Set([
  'CHECKOUT_REQUEST_INVALID',
  'INSUFFICIENT_STOCK',
  'KITCHEN_CLOSED',
  'PRODUCT_NOT_FOUND',
  'PRODUCT_UNAVAILABLE',
  'SHOP_NOT_FOUND',
  'STRIPE_CONNECT_INCOMPLETE',
  'STRIPE_PAYMENT_DISABLED',
  'DELIVERY_DISABLED',
  'DELIVERY_ADDRESS_INVALID',
  'DELIVERY_OUT_OF_RANGE',
  'DELIVERY_MINIMUM_NOT_MET',
  'DELIVERY_REQUEST_INVALID',
  'DELIVERY_FORBIDDEN',
])

const isSafePrewriteErrorCode = (code) =>
  typeof code === 'string' &&
  (code.startsWith('CUSTOMIZATION_') || SAFE_PREWRITE_ERROR_CODES.has(code))

const normalizeErrorMessage = (message) =>
  String(message || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

const isAlreadyProcessedStripeReplay = (error) =>
  Number(error?.status) === 409 &&
  error?.orderId &&
  (error?.code === 'CHECKOUT_ALREADY_PROCESSED' ||
    normalizeErrorMessage(error?.message).includes(
      'commande a deja ete traitee'
    ))

const readAuthToken = () =>
  typeof localStorage === 'undefined' ? '' : localStorage.getItem('token')

const buildCheckoutPayload = (params, clientOrderToken) => ({
  ...(params.loyaltyRewardId ? { loyalty_reward_id: params.loyaltyRewardId, loyalty_confirmed: params.loyaltyConfirmed === true } : {}),
  client_order_token: clientOrderToken,
  expected_total: roundPrice(
    params.total == null ? params.expected_total : params.total
  ),
  ...(params.discountType
    ? { discount_type: params.discountType }
    : {}),
  ...(params.discountValue != null
    ? { discount_value: params.fulfillmentType === 'delivery' ? params.discountValue : roundPrice(params.discountValue) }
    : {}),
  customer: params.customer,
  ...(params.servicePointId || params.service_point_id
    ? { service_point_id: params.servicePointId || params.service_point_id }
    : { customerID: params.customerID }),
  payment: params.payment,
  is_takeaway: params.isTakeaway === true,
  remark: params.remark,
  phone: params.phone,
  ...(params.source ? { source: params.source } : {}),
  items: buildCheckoutItems(params.dataCart),
  ...(params.fulfillmentType === 'delivery' ? {
    fulfillment_type: 'delivery',
    delivery_quote_token: params.deliveryQuoteToken,
    address_resolution_token: params.addressResolutionToken,
    delivery_confirmation_secret: params.deliveryConfirmationSecret,
    delivery_address_details: deliveryDetails(params.deliveryDetails),
  } : params.fulfillmentType ? { fulfillment_type: params.fulfillmentType } : {}),
})

const cloneCheckoutCart = (cart) => {
  if (!Array.isArray(cart)) return null
  return JSON.parse(JSON.stringify(cart))
}

const buildCheckoutAttemptPayload = (params, publicPayload) => ({
  ...publicPayload,
  dataCart: cloneCheckoutCart(params.dataCart),
  stripe: params.stripe === true,
  ...(params.fulfillmentType === 'delivery' && params.deliveryAddressSnapshot ? { deliveryAddressSnapshot: {
    street: params.deliveryAddressSnapshot.street, postalCode: params.deliveryAddressSnapshot.postalCode,
    city: params.deliveryAddressSnapshot.city, country: params.deliveryAddressSnapshot.country,
  } } : {}),
  ...(params.customerSession ? { customerContextId: params.customerSession.customerId,
    customerContextShopId: params.customerSession.shopId } : {}),
})

const publicAttemptPayload = (payload) => {
  const { dataCart, stripe, customerContextId, customerContextShopId, deliveryAddressSnapshot, ...body } = payload
  return JSON.parse(JSON.stringify(body))
}

const buildCheckoutError = (error) => {
  const responseData = error?.response?.data
  const domainData =
    responseData && responseData.data && typeof responseData.data === 'object'
      ? responseData.data
      : {}

  return {
    status: error?.response?.status || responseData?.code || null,
    code: domainData.code || null,
    message:
      responseData?.message ||
      error?.message ||
      'Impossible d’envoyer la commande.',
    ...domainData,
  }
}

const clearCheckoutAttempt = (dispatch) => {
  dispatch('set/clientOrderToken', null)
  dispatch('set/clientOrderSignature', null)
  dispatch('set/clientOrderPayload', null)
  dispatch('set/clientOrderOrderId', null)
  dispatch('set/clientOrderAuthRedirect', false)
  dispatch('set/clientOrderStatus', 'idle')
}

const unresolvedCheckoutResult = (state) => ({
  ok: false,
  data: null,
  error: {
    code: CHECKOUT_ATTEMPT_UNRESOLVED,
    message:
      'La tentative de commande précédente doit être résolue avant de modifier la commande.',
    attempt_payload: state.clientOrderPayload,
    attempt_order_id: state.clientOrderOrderId,
  },
})

// Fonction pour supprimer les commandes qui ne sont pas du jour
const removeOldOrders = () => {
  const todayOrders = filterTodayOrderEntries(readStoredOrdersSent())

  // Réécrire dans le localStorage uniquement les commandes du jour
  writeStoredOrdersSent(todayOrders)
  return todayOrders
}

export const state = () => ({
  dataCart: null,
  indexCart: 0,
  totalCart: 0,
  insertId: 0,
  allOrdersSent: [],
  message: '',
  clientOrderToken: null,
  clientOrderSignature: null,
  clientOrderPayload: null,
  clientOrderOrderId: null,
  clientOrderAuthRedirect: false,
  clientOrderStatus: 'idle',
  deliveryTrackingGeneration: 0,
})

removeOldOrders()
export const mutations = {
  ...defaultMutations(state()),
  DELIVERY_TRACKING_GENERATION(state, generation) {
    state.deliveryTrackingGeneration = generation
  },
  MARK_CHECKOUT_AUTH_REDIRECT(currentState, active) {
    currentState.clientOrderAuthRedirect = active === true
  },
  HYDRATE_ORDERS_SENT(state) {
    state.allOrdersSent = getOrderIds(removeOldOrders())
  },
  ADD_ORDER_SENT(state, insertId) {
    const todayOrders = removeOldOrders()
    const nextOrders = appendOrderSentEntry(todayOrders, insertId)
    writeStoredOrdersSent(nextOrders)
    state.allOrdersSent = getOrderIds(nextOrders)
  },
}

export const plugins = [EasyAccess()]
export const actions = {
  hasDeliveryTrackingConfirmation({ state, rootState, commit }) {
    return Boolean(trackingConfirmation(this, rootState, state, trackingRecord(this, state, rootState, commit)))
  },
  deliveryTrackingContext({ state, rootState, commit }, data) {
    const record = trackingRecord(this, state, rootState, commit)
    const result = data && deliveryTrackingResults.get(data)
    if (!result || result.record !== record ||
      !trackingFrameCurrent(this, rootState, state, record, result)) return null
    const context = trackingConfirmation(this, rootState, state, record)
    return { generation: record.generation, shopId: rootState.users?.user?.shopid, confirmationId: context?.id || null,
      isCurrent: () => trackingFrameCurrent(this, rootState, state, record, result) }
  },
  async rotateDeliveryTracking({ state, rootState, commit }, expectedId) {
    const record = trackingRecord(this, state, rootState, commit)
    const context = trackingConfirmation(this, rootState, state, record)
    const current = () => Boolean(context) && (!expectedId || context.id === expectedId) &&
      trackingConfirmation(this, rootState, state, record) === context
    if (!current() || context.busy) throw Object.assign(new Error('Confirmation privee indisponible.'), { isCurrent: current })
    context.busy = true
    if (!context.key) context.key = uuidv4()
    try {
      const result = await buildTrackingApi({ baseURL: process.env.privateURL }).rotate({ deliveryId: context.deliveryId,
        idempotencyKey: context.key, privateCheckoutContext: context.privateCheckoutContext })
      if (!current()) return { discarded: true, isCurrent: current }
      context.key = null
      return { ...result, isCurrent: current }
    } catch (error) {
      if (!current()) return { discarded: true, isCurrent: current }
      throw Object.assign(error, { isCurrent: current })
    } finally { context.busy = false }
  },
  setTotal({ dispatch }, params) {
    dispatch('set/totalCart', params)
  },
  setIndex({ dispatch }, params) {
    dispatch('set/indexCart', params)
  },
  setTocart({ dispatch }, params) {
    dispatch('set/dataCart', params)
  },
  hydrateOrdersSent({ commit }) {
    commit('HYDRATE_ORDERS_SENT')
  },
  markOrderSent({ commit }, insertId) {
    commit('ADD_ORDER_SENT', insertId)
  },
  async checkoutOrder({ state, rootState, dispatch, commit }, params = {}) {
    const stripe = params.stripe === true
    const signature = params.retryOriginal === true
      ? state.clientOrderSignature : buildCheckoutIntentSignature(params)
    const previousAttemptStatus = state.clientOrderStatus || 'idle'
    const previousOrderId = state.clientOrderOrderId
    const deliveryAttempt = params.fulfillmentType === 'delivery' || state.clientOrderPayload?.fulfillment_type === 'delivery'
    const tracking = deliveryAttempt ? trackingRecord(this, state, rootState, commit) : null
    if (deliveryAttempt && (liveDeliveryCheckouts.has(state) ||
      (previousAttemptStatus === 'pending' && params.retryOriginal !== true))) return unresolvedCheckoutResult(state)
    if (params.customerSession && params.customerSession.shopId !== rootState.users?.user?.shopid) return unresolvedCheckoutResult(state)
    const isFirstAttempt =
      previousAttemptStatus === 'idle' &&
      !state.clientOrderToken &&
      !previousOrderId
    let clientOrderToken = state.clientOrderToken

    if (clientOrderToken && state.clientOrderSignature !== signature) {
      const isConfirmedReprice =
        params.repriceConfirmation === true &&
        state.clientOrderStatus === 'reprice_required'
      const canSafelyReplace = ['idle', 'prewrite_rejected'].includes(
        state.clientOrderStatus
      )

      if (!isConfirmedReprice && !canSafelyReplace) {
        return unresolvedCheckoutResult(state)
      }
      if (!isConfirmedReprice) {
        clearCheckoutAttempt(dispatch)
        clientOrderToken = null
      }
    }
    if (state.clientOrderStatus === 'reprice_required' && params.fulfillmentType === 'delivery' && params.repriceConfirmation !== true) return unresolvedCheckoutResult(state)

    if (!clientOrderToken) {
      clientOrderToken = uuidv4()
      dispatch('set/clientOrderToken', clientOrderToken)
    }

    const originalPayload = state.clientOrderPayload
    const preserveDeliveryAttempt = originalPayload && originalPayload.fulfillment_type === 'delivery' &&
      !['idle', 'prewrite_rejected', 'reprice_required'].includes(previousAttemptStatus)
    const payload = preserveDeliveryAttempt || params.retryOriginal === true
      ? publicAttemptPayload(originalPayload)
      : buildCheckoutPayload({ ...params, ...(params.fulfillmentType === 'delivery' ? {
        deliveryConfirmationSecret: originalPayload && originalPayload.delivery_confirmation_secret || createDeliveryConfirmationSecret(),
      } : {}) }, clientOrderToken)
    const endpoint = stripe
      ? '/baseurl/api/v1/stripe/payment-intents/qr-table'
      : '/baseurl/api/v1/orders/checkout'

    dispatch('set/clientOrderSignature', signature)
    if (!preserveDeliveryAttempt && params.retryOriginal !== true) dispatch(
      'set/clientOrderPayload', buildCheckoutAttemptPayload(params, payload))
    if (payload.fulfillment_type === 'delivery') liveDeliveryCheckouts.add(state)
    dispatch('set/clientOrderAuthRedirect', false)
    dispatch('set/clientOrderStatus', 'pending')
    const customerAuthority = tracking && state.clientOrderPayload?.customerContextId ? {
      identity: trackingCustomerIdentity(rootState), customerId: state.clientOrderPayload.customerContextId,
      shopId: state.clientOrderPayload.customerContextShopId,
    } : null
    const trackingFrame = tracking && { generation: tracking.generation, identity: trackingIdentity(rootState, state),
      token: payload.client_order_token, payload: state.clientOrderPayload, customerAuthority }
    if (tracking) { tracking.pending = trackingFrame; tracking.customerAuthority = customerAuthority }
    const currentTracking = () => tracking && trackingFrameCurrent(this, rootState, state, tracking, trackingFrame) &&
      state.clientOrderToken === trackingFrame.token && state.clientOrderPayload === trackingFrame.payload

    try {
      const response = payload.fulfillment_type === 'delivery' || params.customerSession
        ? await dispatch('delivery/checkoutRequest', { endpoint, payload, customerSession: params.customerSession }, { root: true })
        : await this.$axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${readAuthToken()}`,
        },
      })
      let data = response && response.data ? response.data.data : null
      const trackingCurrent = currentTracking()
      if (tracking) tracking.pending = null
      if (tracking && data) {
        if (trackingCurrent) {
          if (data.delivery?.id) {
            tracking.advance()
            tracking.confirmation = { id: uuidv4(), generation: tracking.generation, identity: trackingFrame.identity,
              customerAuthority: trackingFrame.customerAuthority,
              deliveryId: data.delivery.id, privateCheckoutContext: { clientOrderToken: trackingFrame.token,
                confirmationSecret: payload.delivery_confirmation_secret }, busy: false, key: null }
          }
          deliveryTrackingResults.set(data, { record: tracking, generation: tracking.generation, identity: trackingFrame.identity,
            customerAuthority: trackingFrame.customerAuthority })
        } else {
          const { tracking_url: ignoredTrackingUrl, ...financialData } = data
          data = financialData
        }
      }
      if (data && data.orderId) commit('ADD_ORDER_SENT', data.orderId)
      dispatch('set/message', response?.data?.message || '')
      if (stripe) {
        if (data && data.orderId) {
          dispatch('set/clientOrderOrderId', data.orderId)
        }
        dispatch('set/clientOrderStatus', 'stripe_prepared')
      } else {
        clearCheckoutAttempt(dispatch)
        dispatch('notifications/success', 'Commande envoyée avec succès.', {
          root: true,
        })
      }
      return { ok: true, data, error: null }
    } catch (error) {
      const trackingCurrent = currentTracking()
      if (tracking) tracking.pending = null
      const checkoutError = buildCheckoutError(error)
      if (!checkoutError.code && typeof error?.response?.data?.error === 'string') checkoutError.code = error.response.data.error
      if (payload.fulfillment_type === 'delivery' && checkoutError.checkout_resolved === true && checkoutError.orderId &&
        ['paid', 'refunded'].includes(checkoutError.payment_status)) {
        commit('ADD_ORDER_SENT', checkoutError.orderId)
        clearCheckoutAttempt(dispatch)
        const data = { orderId: checkoutError.orderId, checkout_resolved: true, payment_status: checkoutError.payment_status }
        if (trackingCurrent) deliveryTrackingResults.set(data, { record: tracking, generation: tracking.generation, identity: trackingFrame.identity,
          customerAuthority: trackingFrame.customerAuthority })
        return { ok: true, data, error: null }
      }
      if (stripe && payload.fulfillment_type !== 'delivery' && isAlreadyProcessedStripeReplay(checkoutError)) {
        commit('ADD_ORDER_SENT', checkoutError.orderId)
        clearCheckoutAttempt(dispatch)
        dispatch('set/message', checkoutError.message)
        return { ok: false, data: null, error: checkoutError }
      }

      const isAuthenticationRejection = [401, 403].includes(
        Number(checkoutError.status)
      )
      const unsafeAuthenticationStatus =
        previousOrderId || previousAttemptStatus === 'stripe_prepared'
          ? 'stripe_prepared'
          : 'uncertain'
      const status = isAuthenticationRejection
        ? isFirstAttempt
          ? 'prewrite_rejected'
          : unsafeAuthenticationStatus
        : state.clientOrderOrderId
        ? 'stripe_prepared'
        : ['ORDER_REPRICE_REQUIRED', 'DELIVERY_QUOTE_CHANGED'].includes(checkoutError.code)
        ? 'reprice_required'
        : isSafePrewriteErrorCode(checkoutError.code)
        ? 'prewrite_rejected'
        : 'uncertain'
      dispatch('set/clientOrderStatus', status)
      dispatch('set/message', checkoutError.message)
      return { ok: false, data: null, error: checkoutError }
    } finally {
      liveDeliveryCheckouts.delete(state)
    }
  },
  retryCheckout({ state, rootState, dispatch }) {
    const payload = state.clientOrderPayload
    if (!payload || !state.clientOrderToken || liveDeliveryCheckouts.has(state) ||
      (state.clientOrderStatus === 'pending' && payload.fulfillment_type !== 'delivery')) return unresolvedCheckoutResult(state)
    const customer = rootState.customer
    let session = null
    if (payload.customerContextId) {
      const shopId = rootState.users.user.shopid
      session = customer && customer.shopId === shopId ? customer.session : null
      if (!session || session.subject !== 'customer' || session.shopId !== shopId || payload.customerContextShopId !== shopId ||
        session.customerId !== payload.customerContextId || !session.csrfToken) return unresolvedCheckoutResult(state)
    }
    return dispatch('checkoutOrder', { retryOriginal: true, stripe: payload.stripe === true, customerSession: session })
  },
  checkoutCounterPayBefore({ dispatch }, params = {}) {
    return dispatch('checkoutOrder', {
      ...params,
      payment: buildCounterPayBeforePayment(params.payment),
      stripe: false,
    })
  },
  abandonCheckout({ state, dispatch }, options = {}) {
    if (
      options.safe !== true &&
      (state.clientOrderOrderId ||
        ['pending', 'uncertain', 'stripe_prepared'].includes(
          state.clientOrderStatus
        ))
    ) {
      return unresolvedCheckoutResult(state)
    }

    clearCheckoutAttempt(dispatch)
    return { ok: true, data: null, error: null }
  },
  markCheckoutAuthRedirect({ dispatch }, active = true) {
    dispatch('set/clientOrderAuthRedirect', active === true)
    return { ok: true, data: null, error: null }
  },
  completeCheckout({ dispatch }) {
    clearCheckoutAttempt(dispatch)
    return { ok: true, data: null, error: null }
  },
  async cancelStripeCheckout({ dispatch }, orderId) {
    if (!orderId) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'STRIPE_ORDER_ID_REQUIRED',
          message: 'La commande Stripe à annuler est introuvable.',
        },
      }
    }

    try {
      const response = await this.$axios.post(
        `/baseurl/api/v1/stripe/payment-intents/qr-table/${orderId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${readAuthToken()}` },
        }
      )
      dispatch('set/message', response?.data?.message || '')
      return {
        ok: true,
        data: response && response.data ? response.data.data : null,
        error: null,
      }
    } catch (error) {
      const checkoutError = buildCheckoutError(error)
      dispatch('set/message', checkoutError.message)
      return { ok: false, data: null, error: checkoutError }
    }
  },
  postOrder({ dispatch, commit }, params) {
    return this.$axios
      .post('/baseurl/api/v1/orders', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('NEw ORder Repoonse from Back ENd', response.data)
        dispatch('set/insertId', response.data.data.insertId)
        commit('ADD_ORDER_SENT', response.data.data.insertId)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Commande envoyée avec succès.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        console.log('Error Post Order', error)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  postDetailOrder({ dispatch }, params) {
    return this.$axios
      .post('/baseurl/api/v1/detailorder', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Détail de commande ajouté.', {
          root: true,
        })
        return true
      })
      .catch((error) => {
        console.log('Error Detail Order', error.response)
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  createStripeQrTablePayment({ dispatch, commit }, params) {
    return this.$axios
      .post('/baseurl/api/v1/stripe/payment-intents/qr-table', params, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        const data = response.data.data
        if (data && data.orderId) {
          commit('ADD_ORDER_SENT', data.orderId)
        }
        return data
      })
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        dispatch(
          'notifications/error',
          error.response?.data?.message || 'Paiement Stripe indisponible.',
          { root: true }
        )
        return null
      })
  },
  markStripeOrderPayAtCounter({ dispatch, commit }, orderId) {
    return this.$axios
      .post(
        `/baseurl/api/v1/stripe/payment-intents/qr-table/${orderId}/pay-at-counter`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => {
        commit('ADD_ORDER_SENT', orderId)
        dispatch('set/message', response.data.message)
        dispatch(
          'notifications/success',
          'Commande envoyée. Paiement au comptoir à la fin.',
          { root: true }
        )
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        dispatch(
          'notifications/error',
          error.response?.data?.message || 'Impossible d’envoyer la commande.',
          { root: true }
        )
        return false
      })
  },
}
