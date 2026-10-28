import { operatorIdentity } from '@/store/delivery'

export default {
  data: () => ({
    expressDeliveryDialog: false,
    expressDeliveryMounted: false,
    expressIsDelivery: false,
    expressDeliveryResolution: null,
    expressDeliveryQuote: null,
    expressDeliveryReady: false,
    expressDeliveryEpoch: 0,
    expressDeliveryBasis: null,
    expressDeliveryActorEpoch: 0,
    expressCheckoutRequest: 0,
  }),
  computed: {
    canUseDeliveryService() { return false },
    expressDeliveryShopId() { return Number(this.$store.state.users?.user?.shopid) || 0 },
    expressDeliveryDiscount() { return { type: this.expressDiscountType, value: this.expressDiscountValue } },
    expressDeliveryLocked() { return this.hasUnsafeCheckoutAttempt || this.expressPaymentLoading !== null },
    expressDeliveryUnavailable() {
      const state = this.$store.state.delivery
      return Boolean(state && state.shopId === this.expressDeliveryShopId && state.loaded && !state.enabled && !state.error)
    },
    expressDeliveryValid() {
      return this.isExpressDeliveryCurrent()
    },
  },
  created() {
    if (!this.canUseDeliveryService) return
    this.stopDeliveryActorWatch = this.$store.watch(
      root => [root.users?.user, operatorIdentity(root), root.users?.user?.token],
      (next, previous) => {
        if (!next.some((value, index) => value !== previous[index])) return
        this.expressDeliveryActorEpoch++
        this.$store.commit('delivery/RESET', this.expressDeliveryShopId || null)
        this.resetExpressDelivery()
        this.expressCustomer = ''; this.expressPhone = ''; this.expressRemark = ''
      }, { sync: true })
  },
  beforeDestroy() { this.stopDeliveryActorWatch?.() },
  methods: {
    openExpressDeliveryDialog() {
      if (!this.canUseDeliveryService || this.isOrderEditActive || this.expressDeliveryLocked || this.expressDeliveryUnavailable) return
      this.expressServiceDialog = false
      const retry = this.expressDeliveryMounted && this.$store.state.delivery?.error
      this.expressDeliveryMounted = true
      this.expressDeliveryDialog = true
      if (retry) this.$nextTick(() => this.$refs.expressDelivery?.retryAvailability())
    },
    confirmExpressDelivery() {
      if (!this.isExpressDeliveryCurrent(false)) return
      this.expressDeliveryBasis = this.currentExpressDeliveryBasis()
      this.expressIsDelivery = true
      this.expressIsTakeaway = true
      this.expressDeliveryDialog = false
    },
    resetExpressDelivery() {
      this.expressCheckoutRequest++
      if (this.expressIsDelivery) {
        this.expressPaymentLoading = null
        this.expressReceiptPrinting = false
        this.expressPaymentDialog = false
        this.expressReceiptDialog = false
        this.pendingExpressPaymentMethod = null
      }
      this.expressDeliveryDialog = false
      this.expressDeliveryMounted = false
      this.expressIsDelivery = false
      this.expressDeliveryReady = false
      this.expressDeliveryResolution = null
      this.expressDeliveryQuote = null
      this.expressDeliveryBasis = null
      this.expressDeliveryEpoch++
    },
    beginExpressCheckout() {
      if (!this.expressIsDelivery) return null
      return { request: ++this.expressCheckoutRequest, actorEpoch: this.expressDeliveryActorEpoch }
    },
    isExpressCheckoutActorCurrent(context) {
      return !context || (!this._isDestroyed && !this._isBeingDestroyed && context.actorEpoch === this.expressDeliveryActorEpoch)
    },
    isExpressCheckoutCurrent(context) {
      return this.isExpressCheckoutActorCurrent(context) && (!context || context.request === this.expressCheckoutRequest)
    },
    currentExpressDeliveryBasis() {
      return JSON.stringify([this.expressDeliveryShopId, this.cartItem, this.expressDeliveryDiscount,
        this.expressDeliveryResolution, this.expressDeliveryQuote?.quoteToken])
    },
    isExpressDeliveryCurrent(checkBasis = true) {
      const state = this.$store.state.delivery
      return Boolean(this.canUseDeliveryService && !this.expressDeliveryLocked && state?.shopId === this.expressDeliveryShopId && state.enabled &&
        this.expressDeliveryReady && this.$refs.expressDelivery?.ready && this.expressCustomer.trim() && this.expressPhone.trim() &&
        this.expressDeliveryResolution?.addressResolutionToken && this.expressDeliveryQuote?.quoteToken &&
        Date.parse(this.expressDeliveryResolution.expiresAt) > Date.now() && Date.parse(this.expressDeliveryQuote.expiresAt) > Date.now() &&
        (!checkBasis || !this.expressIsDelivery || this.expressDeliveryBasis === this.currentExpressDeliveryBasis()))
    },
    validateExpressDelivery() {
      if (this.isExpressDeliveryCurrent()) return true
      if (!this.expressDeliveryLocked) {
        this.expressDeliveryReady = false
        this.expressPaymentDialog = false
        this.openExpressDeliveryDialog()
      }
      return false
    },
    buildExpressDeliveryPayload() {
      if (!this.expressIsDelivery) return {}
      return {
        fulfillmentType: 'delivery',
        deliveryQuoteToken: this.expressDeliveryQuote?.quoteToken,
        addressResolutionToken: this.expressDeliveryResolution?.addressResolutionToken,
        deliveryAddressSnapshot: this.expressDeliveryResolution?.addressSnapshot,
        deliveryDetails: {
          complement: this.expressDeliveryResolution?.complement || '',
          instructions: this.expressDeliveryResolution?.instructions || '',
        },
        repriceConfirmation: this.clientOrderStatus === 'reprice_required' && this.expressDeliveryValid,
      }
    },
    async recoverExpressDelivery(result) {
      if (!this.expressIsDelivery) return
      if (this.hasUnsafeCheckoutAttempt) {
        this.restorePersistedCheckoutCart()
        this.openCart()
      } else if (this.clientOrderStatus === 'reprice_required') {
        this.expressDeliveryReady = false
        this.expressDeliveryDialog = true
        const epoch = this.expressDeliveryEpoch
        // The checkout child must receive locked=false before it can accept a replacement quote.
        await this.$nextTick()
        if (epoch !== this.expressDeliveryEpoch || !this.expressIsDelivery || this.expressDeliveryLocked) return
        const quote = result?.error?.server_quote
        if (quote?.quoteToken) this.$refs.expressDelivery?.acceptServerQuote(quote)
        else this.$refs.expressDelivery?.refreshQuote()
      }
    },
  },
}
