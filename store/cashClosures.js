import EasyAccess, { defaultMutations } from 'vuex-easy-access'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

export const cashClosureCanClose = (closure = {}) => Number(closure.orders_count || 0) > 0 ||
  ['remittances_count', 'adjustments_count', 'refunds_count'].some(key => Number(closure.courier_cash?.[key] || 0) > 0)

export const cashClosureRows = (closure = {}) => {
  const snapshot = closure.courier_cash
  if (!snapshot) return []
  const labels = {
    register_cash_sales_cents: 'Ventes especes - origine caisse',
    courier_cash_sales_cents: 'Ventes especes - origine livreur',
    collected_cents: 'Encaissements livreurs de la periode',
    received_cents: 'Remises physiques recues en caisse',
    outstanding_cents: 'Especes restant chez les livreurs',
    manual_refunded_cents: 'Remboursements manuels confirmes',
    cash_refunded_by_register_cents: 'Restitutions especes du tiroir (sorties)',
    cash_refunded_by_courier_cents: 'Restitutions especes par les livreurs',
    external_card_refunded_cents: 'Remboursements TPE independant declares',
  }
  return Object.entries(labels).filter(([key]) => Object.prototype.hasOwnProperty.call(snapshot, key))
    .map(([key, label]) => ({ key, label, cents: snapshot[key] }))
}

export const state = () => ({
  current: null,
  history: [],
  detail: null,
  message: '',
})

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

export const actions = {
  getCurrent({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/reports/z/current', {
        headers: authHeaders(),
      })
      .then((response) => {
        dispatch('set/current', response.data.data)
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          "Impossible de recuperer l'apercu Ticket Z."
        dispatch('set/message', message)
        dispatch('set/current', null)
        return false
      })
  },
  closeCurrent({ dispatch }) {
    return this.$axios
      .post(
        '/baseurl/api/v1/reports/z/close',
        {},
        {
          headers: authHeaders(),
          skipGlobalErrorNotification: true,
        }
      )
      .then((response) => {
        dispatch('set/detail', response.data.data)
        dispatch('set/message', response.data.message)
        dispatch('notifications/success', 'Ticket Z cree.', { root: true })
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          'Impossible de cloturer la caisse.'
        dispatch('set/message', message)
        dispatch('notifications/error', message, { root: true })
        return false
      })
  },
  getHistory({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/reports/z', {
        headers: authHeaders(),
      })
      .then((response) => {
        dispatch('set/history', response.data.data)
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          'Impossible de recuperer les Tickets Z.'
        dispatch('set/message', message)
        dispatch('set/history', [])
        return false
      })
  },
  getDetail({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/reports/z/${params}`, {
        headers: authHeaders(),
      })
      .then((response) => {
        dispatch('set/detail', response.data.data)
        return true
      })
      .catch((error) => {
        const message =
          error.response?.data?.message ||
          'Impossible de recuperer le Ticket Z.'
        dispatch('set/message', message)
        dispatch('set/detail', null)
        return false
      })
  },
}
