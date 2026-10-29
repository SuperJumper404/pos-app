const { isTerminalMethod } = require('@/helpers/stripeTerminal')

export default {
  data: () => ({ checkoutTerminalIdentity: null }),
  computed: {
    checkoutCashierIdentity() {
      const user = this.$store.get('users/user')
      return this.$store.get('authenticated') && user && user.id && user.shopid &&
        [0, 1, 4, 5].includes(Number(user.access)) && user.session_subject !== 'service_point'
        ? `${user.shopid}:${user.id}` : null
    },
    checkoutTerminalReader() {
      const user = this.$store.get('users/user')
      const reader = this.$store.get('stripeTerminal/currentReader')
      return this.checkoutCashierIdentity && this.checkoutTerminalIdentity === this.checkoutCashierIdentity &&
        reader && reader.isActive && reader.assignedUserId === Number(user.id) ? reader : null
    },
  },
  watch: {
    checkoutCashierIdentity() { this.refreshCheckoutTerminal() },
  },
  mounted() { this.refreshCheckoutTerminal() },
  methods: {
    async refreshCheckoutTerminal() {
      const identity = this.checkoutCashierIdentity
      this.checkoutTerminalIdentity = null
      if (!identity) return
      try {
        const reader = await this.$store.dispatch('stripeTerminal/getCurrentReader')
        if (identity === this.checkoutCashierIdentity && reader !== false) this.checkoutTerminalIdentity = identity
      } catch (error) { /* Payment choices remain available when the TPE cannot be loaded. */ }
    },
    isCheckoutTerminalMethod: isTerminalMethod,
    terminalCheckoutLocation(orderId, wantsReceipt, discount = {}) {
      if (!Number.isSafeInteger(Number(orderId)) || Number(orderId) <= 0) throw new TypeError('Commande introuvable.')
      return {
        path: `/cashregister/payout/${Number(orderId)}`,
        query: {
          modals: 'true', orders: [Number(orderId)], terminal: '1', collectOnly: '1',
          receipt: wantsReceipt ? '1' : '0', returnTo: this.$route.path,
          ...(discount.type ? { discountType: discount.type, discountValue: String(discount.value || 0) } : {}),
        },
      }
    },
  },
}
