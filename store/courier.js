import { buildDeliveryApi } from './delivery'
const { v4: newKey } = require('uuid')
const { isCourierUser } = require('../helpers/staffRoles')
const { isTokenExpired } = require('../helpers/sessionAuth')

export const namespaced = true
export const state = () => ({ identity: null, epoch: 0, missions: [], available: null, balance: null,
  pending: {}, reads: {}, busy: {}, error: null, recoveryError: null, order: [], missionSequence: 0, missionFreshness: {} })
const initialState = state
const user = root => root.users && root.users.user
export const courierIdentity = root => JSON.stringify([root.authenticated !== false, user(root) && [
  user(root).shopid, user(root).id, user(root).access, user(root).status, user(root).session_subject, user(root).token,
]])
const authorized = root => root.authenticated !== false && isCourierUser(user(root)) &&
  !isTokenExpired(user(root).token || (typeof localStorage !== 'undefined' && localStorage.getItem('token')))
const validId = id => typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id)
const closed = row => ['delivered', 'failed', 'canceled'].includes(row.deliveryStatus)
const missionFresh = (state, id, sequence) => (state.missionFreshness[id] || 0) <= sequence
const protectMissions = (state, ids) => {
  if (!ids.length) return
  state.missionSequence++
  state.missionFreshness = { ...state.missionFreshness, ...Object.fromEntries(ids.map(id => [id, state.missionSequence])) }
}
const safeMission = (row, actor) => {
  if (!row || !validId(row.id) || String(row.shopId) !== String(actor.shopid) || String(row.courierId) !== String(actor.id)) return null
  const result = { ...row }
  if (closed(row)) { delete result.addressSnapshot; delete result.contactSnapshot; delete result.items }
  return result
}
const api = store => store.$deliveryApi || (store.$deliveryApi = buildDeliveryApi({ baseURL: process.env.privateURL }))
const unwrap = response => {
  if (!response || !response.data || response.data.success === false || response.data.data == null) throw new Error('Reponse livreur indisponible.')
  return response.data.data
}
const statusOf = error => error.response && error.response.status || 0
const terminalDenial = error => [401, 403].includes(statusOf(error))
const recoveryStorageKey = 'smarteat.courier.collections.v1'
const recoveryFields = ['courierId', 'deliveryId', 'expectedVersion', 'idempotencyKey', 'method', 'shopId']
const recoveryFailure = () => new Error('Reprise de paiement indisponible sur cet appareil. Contactez le restaurant avant tout nouvel encaissement.')
function readRecovery() {
  try {
    if (typeof localStorage === 'undefined') throw recoveryFailure()
    const raw = localStorage.getItem(recoveryStorageKey)
    if (raw && raw.length > 16000) throw recoveryFailure()
    const entries = JSON.parse(raw || '[]')
    if (!Array.isArray(entries) || entries.length > 32 || entries.some(row => !row ||
      Object.keys(row).sort().join(',') !== recoveryFields.join(',') || !validId(row.deliveryId) ||
      !Number.isSafeInteger(row.shopId) || row.shopId <= 0 || !Number.isSafeInteger(row.courierId) || row.courierId <= 0 ||
      !Number.isSafeInteger(row.expectedVersion) || row.expectedVersion < 1 ||
      typeof row.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(row.idempotencyKey) ||
      !['cash', 'external_card'].includes(row.method))) throw recoveryFailure()
    return entries
  } catch (error) { throw recoveryFailure() }
}
function saveRecovery(actor, deliveryId, body, remove = false) {
  const entries = readRecovery().filter(row => row.idempotencyKey !== body.idempotencyKey)
  if (!remove) {
    if (entries.length >= 32) throw recoveryFailure()
    entries.push({ shopId: Number(actor.shopid), courierId: Number(actor.id), deliveryId,
      idempotencyKey: body.idempotencyKey, method: body.method, expectedVersion: body.expectedVersion })
  }
  try { localStorage.setItem(recoveryStorageKey, JSON.stringify(entries)) } catch (error) { throw recoveryFailure() }
}
const canCommand = (row, operation) => row && !closed(row) && row.deliveryStatus !== 'issue' &&
  row.acceptanceStatus === 'accepted' && Array.isArray(row.allowedActions) && row.allowedActions.includes(operation) &&
  (operation !== 'pickup' || (row.deliveryStatus === 'assigned' && Number(row.preparationStatus) === 3)) &&
  (operation !== 'deliver' || (row.deliveryStatus === 'in_transit' && row.remainingDueCents === 0)) &&
  (operation !== 'collectPayment' || (row.deliveryStatus === 'in_transit' && Number(row.preparationStatus) === 3 &&
    row.paymentStatus === 'unpaid' && Number.isSafeInteger(row.remainingDueCents) && row.remainingDueCents > 0))

export const mutations = {
  RESET(state, identity) { Object.assign(state, { ...initialState(), identity, epoch: state.epoch + 1 }) },
  ERROR(state, error) { state.error = error },
  RECOVERY_ERROR(state, error) { state.recoveryError = error },
  PENDING(state, { deliveryId, pending }) {
    const entries = { ...state.pending }
    if (pending) entries[deliveryId] = pending; else delete entries[deliveryId]
    state.pending = entries
  },
  BUSY(state, { key, value }) { state.busy = { ...state.busy, [key]: value } },
  READ(state, { key, token }) { state.reads = { ...state.reads, [key]: token } },
  PROTECT_MISSION(state, deliveryId) { protectMissions(state, [deliveryId]) },
  TRACK_MISSION(state, deliveryId) {
    if (!Object.hasOwn(state.missionFreshness, deliveryId)) state.missionFreshness = { ...state.missionFreshness, [deliveryId]: state.missionSequence }
  },
  MISSIONS(state, { rows, sequence }) {
    const current = new Map(state.missions.map(row => [row.id, row]))
    const incoming = new Map(rows.map(row => [row.id, row]))
    const fresh = id => missionFresh(state, id, sequence)
    const next = rows.map(row => fresh(row.id) ? row : current.get(row.id)).filter(Boolean)
    state.missions.forEach((row, index) => {
      if (!fresh(row.id) && !next.some(item => item.id === row.id)) next.splice(Math.min(index, next.length), 0, row)
    })
    // List omissions/closures fence older details; a concurrent detail fences only its own list row.
    protectMissions(state, [...new Set([...current.keys(), ...Object.keys(state.missionFreshness), ...incoming.keys()])]
      .filter(id => fresh(id) && (!incoming.has(id) || closed(incoming.get(id)))))
    state.missions = next
    state.order = state.order.filter(id => next.some(row => row.id === id))
  },
  MISSION(state, { deliveryId, row, sequence = state.missionSequence }) {
    if (!missionFresh(state, deliveryId, sequence)) return
    state.missions = !row ? state.missions.filter(item => item.id !== deliveryId)
      : state.missions.some(item => item.id === deliveryId) ? state.missions.map(item => item.id === deliveryId ? row : item) : [...state.missions, row]
    protectMissions(state, [deliveryId])
  },
  AVAILABLE(state, available) { state.available = available },
  BALANCE(state, balance) { state.balance = balance },
  ORDER(state, ids) { state.order = ids },
}

export const actions = {
  initialize({ state, rootState, commit }) {
    const identity = authorized(rootState) ? courierIdentity(rootState) : null
    if (state.identity !== identity) {
      commit('RESET', identity)
      if (identity) {
        try {
          for (const row of readRecovery().filter(row => String(row.shopId) === String(user(rootState).shopid) && String(row.courierId) === String(user(rootState).id))) {
            commit('PENDING', { deliveryId: row.deliveryId, pending: { operation: 'collectPayment', status: 'unresolved',
              body: { method: row.method, expectedVersion: row.expectedVersion, idempotencyKey: row.idempotencyKey } } })
          }
        } catch (error) { commit('RECOVERY_ERROR', error.message) }
      }
    }
    return identity
  },
  async read({ state, rootState, commit, dispatch }, { resource, deliveryId }) {
    const initialIdentity = courierIdentity(rootState)
    await dispatch('initialize')
    if (!state.identity || initialIdentity !== courierIdentity(rootState)) { await dispatch('initialize'); return null }
    const identity = state.identity; const epoch = state.epoch
    const key = `${resource}:${deliveryId || ''}`; const token = newKey()
    const current = () => state.identity === identity && state.epoch === epoch && authorized(rootState) && courierIdentity(rootState) === identity
    const paths = { missions: '/courier/deliveries', availability: '/courier/availability', balance: '/courier/cash-balance', detail: `/courier/deliveries/${deliveryId}` }
    if (!paths[resource] || (resource === 'detail' && !validId(deliveryId))) return null
    if (resource === 'detail') commit('TRACK_MISSION', deliveryId)
    const sequence = state.missionSequence
    commit('READ', { key, token }); commit('BUSY', { key, value: true })
    try {
      const result = unwrap(await api(this).request({ path: paths[resource] }))
      if (!current() || state.reads[key] !== token) return null
      if (resource === 'missions') {
        if (!Array.isArray(result)) throw new Error('Missions indisponibles.')
        commit('MISSIONS', { rows: result.map(row => safeMission(row, user(rootState))).filter(Boolean), sequence })
        return state.missions
      } else if (resource === 'detail') {
        if (!missionFresh(state, deliveryId, sequence)) return null
        const row = safeMission(result, user(rootState))
        commit('MISSION', { deliveryId, row, sequence })
        if (!row) return null
      } else if (resource === 'availability') {
        if (String(result.courierId) !== String(user(rootState).id) || typeof result.available !== 'boolean') throw new Error('Disponibilite indisponible.')
        commit('AVAILABLE', result.available)
      } else {
        if (String(result.courierId) !== String(user(rootState).id) || String(result.shopId) !== String(user(rootState).shopid)) throw new Error('Solde indisponible.')
        commit('BALANCE', result)
      }
      return result
    } catch (error) {
      if (current() && state.reads[key] === token) {
        if (terminalDenial(error)) commit('RESET', null)
        else {
          if (resource === 'missions') commit('MISSIONS', { rows: [], sequence })
          if (resource === 'detail') commit('MISSION', { deliveryId, row: null, sequence })
          if (resource === 'availability') commit('AVAILABLE', null)
          if (resource === 'balance') commit('BALANCE', null)
        }
        commit('ERROR', 'Lecture impossible. Actualisez avant de continuer.')
      }
      return null
    } finally {
      if (current() && (state.reads[key] === token || !state.reads[key])) commit('BUSY', { key, value: false })
      if (courierIdentity(rootState) !== identity || !authorized(rootState)) await dispatch('initialize')
    }
  },
  loadMissions({ dispatch }) { return dispatch('read', { resource: 'missions' }) },
  loadAvailability({ dispatch }) { return dispatch('read', { resource: 'availability' }) },
  loadCashBalance({ dispatch }) { return dispatch('read', { resource: 'balance' }) },
  async setAvailability({ state, rootState, commit, dispatch }, available) {
    const start = courierIdentity(rootState)
    await dispatch('initialize')
    if (!state.identity || start !== courierIdentity(rootState) || typeof available !== 'boolean' || state.busy.availability) return null
    const identity = state.identity; const epoch = state.epoch
    const current = () => state.identity === identity && state.epoch === epoch && courierIdentity(rootState) === identity && authorized(rootState)
    commit('BUSY', { key: 'availability', value: true })
    commit('BUSY', { key: 'availability:', value: false })
    commit('READ', { key: 'availability:', token: newKey() })
    try {
      const result = unwrap(await api(this).request({ method: 'patch', path: '/courier/availability', body: { available } }))
      if (!current()) return null
      if (String(result.courierId) !== String(user(rootState).id) || typeof result.available !== 'boolean') throw new Error('Disponibilite indisponible.')
      commit('READ', { key: 'availability:', token: newKey() })
      commit('BUSY', { key: 'availability:', value: false })
      commit('AVAILABLE', result.available); return result
    } catch (error) {
      if (current()) {
        if (terminalDenial(error)) commit('RESET', null)
        else commit('AVAILABLE', null)
        commit('ERROR', 'Disponibilite non confirmee. Actualisez son etat.')
      }
      return null
    } finally {
      if (current()) commit('BUSY', { key: 'availability', value: false })
      if (courierIdentity(rootState) !== identity || !authorized(rootState)) await dispatch('initialize')
    }
  },
  reorder({ state, commit }, { deliveryId, direction }) {
    const active = state.missions.filter(row => !closed(row)).map(row => row.id)
    const ids = [...state.order.filter(id => active.includes(id)), ...active.filter(id => !state.order.includes(id))]
    const index = ids.indexOf(deliveryId); const next = index + direction
    if (![-1, 1].includes(direction) || index < 0 || next < 0 || next >= ids.length) return
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    commit('ORDER', ids)
  },
  pickup({ dispatch }, input) { return dispatch('command', { ...input, operation: 'pickup' }) },
  collectPayment({ dispatch }, input) { return dispatch('command', { ...input, operation: 'collectPayment' }) },
  deliver({ dispatch }, input) { return dispatch('command', { ...input, operation: 'deliver' }) },
  reportIssue({ dispatch }, input) { return dispatch('command', { ...input, operation: 'reportIssue' }) },
  async command({ state, rootState, commit, dispatch }, input) {
    const start = courierIdentity(rootState)
    await dispatch('initialize')
    if (!state.identity || start !== courierIdentity(rootState)) { await dispatch('initialize'); return null }
    const { operation, deliveryId } = input
    const paths = { pickup: 'pickup', collectPayment: 'collect-payment', deliver: 'deliver', reportIssue: 'report-issue' }
    if (!paths[operation] || !validId(deliveryId) || state.busy[deliveryId]) return null
    let pending = state.pending[deliveryId]
    const recovering = Boolean(pending)
    if (pending && pending.operation !== operation) return null
    if (operation === 'collectPayment' && (state.recoveryError || (!pending && !['cash', 'external_card'].includes(input.method)))) return null
    const identity = state.identity; const epoch = state.epoch; const actor = { ...user(rootState) }
    const current = () => state.identity === identity && state.epoch === epoch && courierIdentity(rootState) === identity && authorized(rootState)
    commit('BUSY', { key: deliveryId, value: true }); commit('PROTECT_MISSION', deliveryId); commit('ERROR', null)
    let sequence = state.missionSequence
    try {
      // A fresh authority read precedes both new money and explicit same-key recovery.
      if (operation === 'collectPayment' && !await dispatch('read', { resource: 'detail', deliveryId })) return null
      if (!current()) return null
      if (!pending) {
        const row = state.missions.find(row => row.id === deliveryId)
        if (!canCommand(row, operation)) return null
        const body = { expectedVersion: row.version, idempotencyKey: newKey() }
        if (operation === 'collectPayment') body.method = input.method
        if (operation === 'reportIssue') {
          if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 1000) return null
          body.reason = input.reason.trim()
        }
        if (operation === 'collectPayment') {
          try { saveRecovery(actor, deliveryId, body) } catch (error) { commit('RECOVERY_ERROR', error.message); return null }
        }
        pending = { operation, body, status: 'sending' }
      }
      commit('PENDING', { deliveryId, pending: { ...pending, status: 'sending' } })
      sequence = state.missionSequence
      const result = unwrap(await api(this).request({ method: 'post', path: `/courier/deliveries/${deliveryId}/${paths[operation]}`, body: pending.body }))
      if (!current()) return null
      const row = safeMission(result.delivery || result, actor)
      if (!row || row.id !== deliveryId) throw new Error('Resultat a verifier.')
      const previous = state.missions.find(item => item.id === deliveryId)
      // Confirmed closure outranks a pre-commit active read, but never revives a removed mission.
      const publicationSequence = closed(row) && previous && !closed(previous) && row.version > previous.version ? state.missionSequence : sequence
      const fresh = missionFresh(state, deliveryId, publicationSequence)
      commit('MISSION', { deliveryId, row, sequence: publicationSequence })
      if (operation === 'collectPayment') saveRecovery(actor, deliveryId, pending.body, true)
      commit('PENDING', { deliveryId, pending: null })
      if (operation === 'collectPayment' || operation === 'deliver') await dispatch('loadCashBalance')
      return fresh ? result : null
    } catch (error) {
      if (!current()) return null
      const status = statusOf(error)
      const uncertain = !status || status >= 500 || status === 408 || status === 429 ||
        (recovering && [401, 403, 404].includes(status))
      if (pending) {
        if (!uncertain && operation === 'collectPayment') {
          try { saveRecovery(actor, deliveryId, pending.body, true) } catch (failure) { commit('RECOVERY_ERROR', failure.message) }
        }
        commit('PENDING', { deliveryId, pending: uncertain ? { ...pending, status: 'unresolved' } : null })
      }
      commit('MISSION', { deliveryId, row: null, sequence: status === 404 ? state.missionSequence : sequence })
      if (terminalDenial(error)) commit('RESET', null)
      else if (!uncertain) await dispatch('read', { resource: 'detail', deliveryId })
      commit('ERROR', uncertain ? 'Resultat non confirme. Verifiez avant de poursuivre.' : 'Mission modifiee ou action refusee. Relisez son etat puis confirmez a nouveau.')
      return null
    } finally {
      if (current()) commit('BUSY', { key: deliveryId, value: false })
      if (courierIdentity(rootState) !== identity || !authorized(rootState)) await dispatch('initialize')
    }
  },
}
