// This is a completeness gate only. The API remains authoritative for validity.
const completePhone = value => {
  const input = String(value || '').trim()
  if (!/^(?:\+|00)?[\d ()-]+$/.test(input)) return ''
  let phone = input.replace(/[ ()-]/g, '').replace(/^00/, '+')
  if (/^0[1-9]\d{8}$/.test(phone)) phone = `+33${phone.slice(1)}`
  if (phone.startsWith('+33')) return /^\+33[1-9]\d{8}$/.test(phone) ? phone : ''
  if (phone.startsWith('+1')) return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone) ? phone : ''
  if (phone.startsWith('+44')) return /^\+44[1-9]\d{9}$/.test(phone) ? phone : ''
  return /^\+[1-9]\d{6,14}$/.test(phone) ? phone : ''
}
const availablePoints = result => result && result.status === 'resolved' ? Number(result.loyalty && result.loyalty.available || 0) : null
const phoneOwner = root => JSON.stringify([root.authenticated, root.users && root.users.user])
const matchingFrozenPhoneSession = (root, { phone, shopId, session, member } = {}) => {
  const cart = root.cart || {}
  const payload = cart.clientOrderPayload
  const user = root.users && root.users.user || {}
  if (root.authenticated === false || user.session_subject !== 'service_point' || (user.source || user.order_source) !== 'table_qr' ||
    Number(user.shopid) !== Number(shopId) || !cart.clientOrderToken || !['pending', 'uncertain', 'stripe_prepared'].includes(cart.clientOrderStatus) ||
    !payload || payload.fulfillment_type === 'delivery' || payload.customerContextSubject !== 'loyalty' || Number(payload.customerContextShopId) !== Number(shopId) ||
    !completePhone(phone) || completePhone(payload.phone) !== completePhone(phone) ||
    (payload.service_point_id != null && String(payload.service_point_id) !== String(user.service_point_id)) ||
    !session || session.subject !== 'loyalty' || Number(session.shopId) !== Number(shopId) || !session.csrfToken ||
    String(session.customerId) !== String(payload.customerContextId) || String(session.memberId) !== String(payload.loyaltyContextMemberId) ||
    !member || String(member.id) !== String(session.memberId)) return false
  return true
}

// Pages supply phoneLookupInput/Enabled and, optionally, name and invalidation hooks.
const phoneLookupMixin = {
  data: () => ({ clientPhoneTimer: null, clientPhoneGeneration: 0 }),
  computed: {
    phoneLookupScope() { return JSON.stringify([phoneOwner(this.$store.state), this.phoneLookupEnabled]) },
    clientPhoneResult() { return this.phoneLookupEnabled && this.$store.state.clientPhone && this.$store.state.clientPhone.result || null },
    clientPhonePoints() { return availablePoints(this.clientPhoneResult) },
    clientPhoneMessage() {
      if (!this.phoneLookupEnabled) return ''
      const state = this.$store.state.clientPhone || {}
      if (state.busy) return 'Recherche du client…'
      if (state.result && state.result.status === 'ambiguous') return 'Plusieurs fiches correspondent à ce téléphone. Le restaurant pourra les rapprocher.'
      return state.error || ''
    },
  },
  watch: {
    phoneLookupInput: { sync: true, handler() { this.queueClientPhoneLookup(true) } },
    phoneLookupScope: { sync: true, handler() { this.queueClientPhoneLookup(true) } },
  },
  mounted() { this.queueClientPhoneLookup(false) },
  beforeDestroy() {
    clearTimeout(this.clientPhoneTimer)
    this.clientPhoneGeneration++
    this.$store.dispatch('clientPhone/reset')
    if (this.invalidatePhoneLoyalty) this.invalidatePhoneLoyalty()
  },
  methods: {
    queueClientPhoneLookup(invalidate) {
      clearTimeout(this.clientPhoneTimer)
      const generation = ++this.clientPhoneGeneration
      this.$store.dispatch('clientPhone/reset')
      if (invalidate && this.invalidatePhoneLoyalty) this.invalidatePhoneLoyalty()
      const phone = completePhone(this.phoneLookupInput)
      if (!this.phoneLookupEnabled || !phone) return
      const scope = this.phoneLookupScope
      this.clientPhoneTimer = setTimeout(async () => {
        if (this._isDestroyed || generation !== this.clientPhoneGeneration || scope !== this.phoneLookupScope) return
        const result = await this.$store.dispatch('clientPhone/resolve', { phone, ...(this.phoneLookupName ? { name: this.phoneLookupName } : {}) })
        if (!this._isDestroyed && generation === this.clientPhoneGeneration && scope === this.phoneLookupScope && this.onClientPhoneResolved) this.onClientPhoneResolved(result)
      }, 400)
    },
  },
}
module.exports = { completePhone, availablePoints, phoneOwner, matchingFrozenPhoneSession, phoneLookupMixin }
