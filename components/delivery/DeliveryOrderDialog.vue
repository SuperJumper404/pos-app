<template>
  <v-dialog :value="value" max-width="680" scrollable :persistent="locked" @input="$emit('input', $event)">
    <v-card class="delivery-order-dialog">
      <v-card-title class="delivery-order-title">
        <span>Livraison</span>
        <v-btn icon :disabled="locked" aria-label="Fermer la livraison" title="Fermer la livraison" @click="$emit('input', false)"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text class="delivery-order-body">
        <div class="delivery-order-contact">
          <v-text-field :value="customer" label="Client" outlined :disabled="locked" required prepend-inner-icon="mdi-account-outline" @input="$emit('update:customer', $event)" />
          <v-text-field :value="phone" label="Telephone" type="tel" outlined :disabled="locked" required prepend-inner-icon="mdi-phone-outline" @input="$emit('update:phone', $event)" />
        </div>
        <v-textarea :value="remark" label="Note commande" outlined rows="2" auto-grow :disabled="locked" prepend-inner-icon="mdi-note-text-outline" @input="$emit('update:remark', $event)" />
        <DeliveryCheckout ref="checkout" :shop-id="shopId" :cart="cart" :discount="discount" value="delivery" hide-mode
          :customer-draft="{ name: customer, contactPhone: phone }" :locked="locked"
          @customer="selectCustomer" @address="$emit('address', $event)" @quote="$emit('quote', $event)" @ready="onReady" />
      </v-card-text>
      <v-card-actions class="delivery-order-actions">
        <v-btn text :disabled="locked" @click="$emit('input', false)">Retour</v-btn>
        <v-spacer />
        <v-btn color="primary" :disabled="!canConfirm" @click="confirm"><v-icon left>mdi-check</v-icon>Valider la livraison</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import DeliveryCheckout from '@/components/delivery/DeliveryCheckout.vue'

export default {
  components: { DeliveryCheckout },
  props: {
    value: { type: Boolean, default: false },
    shopId: { type: Number, required: true },
    customer: { type: String, default: '' },
    phone: { type: String, default: '' },
    remark: { type: String, default: '' },
    cart: { type: Array, default: () => [] },
    discount: { type: Object, required: true },
    locked: { type: Boolean, default: false },
  },
  data: () => ({ quoteReady: false }),
  computed: {
    ready() { return this.quoteReady && Boolean(this.$refs.checkout && this.$refs.checkout.ready) },
    canConfirm() { return !this.locked && this.ready && Boolean(this.customer.trim() && this.phone.trim()) },
  },
  methods: {
    selectCustomer(profile) {
      if (this.locked || !profile) return
      this.$emit('update:customer', profile.name)
      this.$emit('update:phone', profile.contactPhone || '')
    },
    onReady(value) { this.quoteReady = value; this.$emit('ready', value) },
    confirm() { if (this.canConfirm) this.$emit('confirm') },
    acceptServerQuote(quote) { this.$refs.checkout?.acceptServerQuote(quote) },
    refreshQuote() { this.$refs.checkout?.refreshQuote() },
    retryAvailability() { return this.$refs.checkout?.openShop() },
  },
}
</script>

<style scoped>
.delivery-order-title { display: flex; justify-content: space-between; gap: 12px; }
.delivery-order-dialog > .delivery-order-body { padding-top: 16px; }
.delivery-order-body ::v-deep .v-expansion-panels { margin-bottom: 16px; }
.delivery-order-contact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.delivery-order-actions { flex-wrap: wrap; gap: 8px; padding: 16px 24px; }
.delivery-order-actions .v-btn { min-height: 44px; letter-spacing: 0; }
@media (max-width: 599px) {
  .delivery-order-contact { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .delivery-order-actions { padding: 12px; }
}
</style>
