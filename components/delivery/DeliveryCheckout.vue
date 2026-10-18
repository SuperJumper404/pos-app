<template>
  <section class="delivery-checkout">
    <v-select :value="value" :items="modes" label="Mode de remise" outlined :disabled="disabled || locked" @change="selectMode" />
    <template v-if="value === 'delivery'">
      <v-alert v-if="!available && !locked" type="warning" text role="alert">La livraison est indisponible. Votre panier est conserve.</v-alert>
      <template v-if="!locked">
        <template v-if="site">
          <div class="delivery-account-actions">
            <span v-if="session"><v-icon small>mdi-account-check-outline</v-icon> Compte connecte</span>
            <v-btn v-if="session" text :disabled="disabled" @click="logout">Continuer en invite</v-btn>
            <v-btn v-else text :disabled="disabled" @click="loginOpen = !loginOpen"><v-icon left>mdi-account-outline</v-icon>{{ loginOpen ? 'Continuer en invite' : 'Se connecter' }}</v-btn>
          </div>
          <CustomerCodeLogin v-if="loginOpen && !session" :shop-id="shopId" />
          <v-alert v-if="accountError" type="warning" text>{{ accountError }}</v-alert>
        </template>
        <template v-else>
          <v-text-field v-model="customerQuery" label="Client : nom ou contact" outlined :disabled="disabled" @keydown.enter.prevent="searchCustomers">
            <template #append><v-btn icon :disabled="disabled || searching" aria-label="Trouver un client" title="Trouver un client" @click="searchCustomers"><v-icon>mdi-magnify</v-icon></v-btn></template>
          </v-text-field>
          <v-select :value="profileId" :items="profiles" item-text="name" item-value="id" label="Fiche client" outlined clearable :disabled="disabled" @change="selectProfile" />
          <v-expansion-panels flat>
            <v-expansion-panel><v-expansion-panel-header>Creer une fiche client</v-expansion-panel-header><v-expansion-panel-content>
              <v-text-field v-model="newCustomer.name" label="Nom" outlined />
              <v-text-field v-model="newCustomer.contactPhone" label="Telephone" type="tel" outlined />
              <v-btn text :disabled="disabled || !newCustomer.name.trim() || searching" @click="createCustomer"><v-icon left>mdi-account-plus-outline</v-icon>Creer</v-btn>
            </v-expansion-panel-content></v-expansion-panel>
          </v-expansion-panels>
        </template>
        <v-select :value="selectedAddressId" :items="addressOptions" item-text="label" item-value="id" label="Adresse de livraison" outlined :disabled="disabled" @change="selectAddress" />
        <DeliveryAddressInput :key="addressContext" ref="addressInput" :value="selectedAddress" :context-key="addressContext" :resolver="resolveAddress" :disabled="disabled || !available" @resolved="onResolved" />
        <v-btn v-if="selectedAddress && !resolution" text :disabled="disabled || !available || loading" @click="resolveStored"><v-icon left>mdi-map-marker-check-outline</v-icon>Valider cette adresse</v-btn>
        <v-btn v-if="site && session && resolution && !selectedAddressId" text :disabled="disabled || saving" @click="saveAddress"><v-icon left>mdi-content-save-outline</v-icon>Ajouter au carnet</v-btn>
      </template>
      <v-alert v-if="error" type="error" text role="alert">{{ error }}</v-alert>
      <div v-if="currentQuote" class="delivery-totals" aria-live="polite">
        <div><span>Produits</span><span>{{ money(currentQuote.itemsTotalCents) }}</span></div>
        <div v-if="currentQuote.itemsDiscountCents"><span>Remise produits</span><span>-{{ money(currentQuote.itemsDiscountCents) }}</span></div>
        <div><span>Livraison</span><span>{{ money(currentQuote.deliveryFeeCents) }}</span></div>
        <div class="font-weight-bold"><span>Total</span><span>{{ money(currentQuote.grandTotalCents) }}</span></div>
      </div>
      <v-btn v-if="!locked && resolution && !currentQuote" text :loading="loading" :disabled="disabled || !available" @click="refreshQuote"><v-icon left>mdi-refresh</v-icon>Actualiser le devis</v-btn>
      <v-btn v-if="!locked && currentQuote && !ready" block color="primary" :disabled="disabled || loading || !available" @click="confirmQuote"><v-icon left>mdi-check</v-icon>Confirmer ce total</v-btn>
      <p v-if="ready" role="status"><v-icon small color="success">mdi-check-circle-outline</v-icon> Total confirme</p>
    </template>
  </section>
</template>

<script>
import DeliveryAddressInput from '@/components/delivery/DeliveryAddressInput.vue'
import CustomerCodeLogin from '@/components/customer/CustomerCodeLogin.vue'

export default {
  components: { DeliveryAddressInput, CustomerCodeLogin },
  props: {
    shopId: { type: Number, required: true },
    cart: { type: Array, default: () => [] },
    discount: { type: Object, default: () => ({ type: 'none', value: 0 }) },
    value: { type: String, default: 'takeaway' },
    site: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
  },
  data: () => ({ resolution: null, currentQuote: null, confirmedBasis: null, sequence: 0, loading: false,
    error: '', loginOpen: false, selectedAddressId: null, profileId: null, customerQuery: '', searching: false,
    newCustomer: { name: '', contactPhone: '' }, saving: false, expiryTimer: null }),
  computed: {
    delivery() { return this.$store.state.delivery },
    available() { return this.delivery.shopId === this.shopId && this.delivery.enabled },
    account() { return this.$store.state.customer },
    session() { return this.site && this.account && this.account.shopId === this.shopId ? this.account.session : null },
    accountError() { return this.account && this.account.error && this.account.error.message },
    modes() { return [...(this.site ? [] : [{ text: 'Sur place', value: 'dine_in' }]), { text: 'Emporter', value: 'takeaway' },
      ...(this.available || this.value === 'delivery' ? [{ text: 'Livraison', value: 'delivery', disabled: !this.available }] : [])] },
    profiles() { return this.delivery.profiles },
    addresses() { return this.session ? this.account.addresses : this.profileId ? this.delivery.addresses : [] },
    addressOptions() { return [{ id: null, label: 'Nouvelle adresse' }, ...this.addresses] },
    selectedAddress() { return this.addresses.find(address => address.id === this.selectedAddressId) || null },
    addressContext() { return `${this.shopId}:${this.session ? this.account.epoch : this.profileId || 'guest'}:${this.selectedAddressId || 'new'}` },
    basis() { return JSON.stringify({ shop: this.shopId, cart: this.cart, discount: this.discount, resolution: this.resolution, account: this.session && this.session.customerId }) },
    ready() { return Boolean(!this.locked && this.available && !this.loading && this.currentQuote &&
      this.confirmedBasis === this.basis && Date.parse(this.currentQuote.expiresAt) > Date.now()) },
  },
  watch: {
    cart: { deep: true, handler() { this.refreshQuote() } },
    discount: { deep: true, handler() { this.refreshQuote() } },
    shopId() { this.openShop() },
    value(value) { if (value === 'delivery') this.refreshQuote(); else this.invalidate() },
    session() { if (this.locked) return; this.selectedAddressId = null; this.resolution = null; this.invalidate(); this.loadBook() },
    ready(value) { this.$emit('ready', value) },
  },
  mounted() { this.openShop() },
  beforeDestroy() { this.sequence++; clearTimeout(this.expiryTimer) },
  methods: {
    money(cents) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) },
    invalidate() { if (this.locked) return; this.sequence++; this.confirmedBasis = null; this.currentQuote = null; this.loading = false; clearTimeout(this.expiryTimer); this.$emit('quote', null); this.$emit('ready', false) },
    selectMode(mode) { if (!this.locked && (!this.site || mode !== 'dine_in') && (mode !== 'delivery' || this.available)) this.$emit('input', mode) },
    async openShop() {
      if (this.locked) return
      this.invalidate()
      this.resolution = null
      this.selectedAddressId = null
      this.profileId = null
      await this.$store.dispatch('delivery/loadSettings', this.shopId)
      if (this.site && this.account.shopId !== this.shopId) await this.$store.dispatch('customer/loadSession', { shopId: this.shopId })
      await this.loadBook()
    },
    loadBook() { if (this.session) return this.$store.dispatch('customer/loadAddresses') },
    async logout() { await this.$store.dispatch('customer/logout'); this.loginOpen = false },
    async searchCustomers() {
      this.searching = true
      this.error = ''
      try { await this.$store.dispatch('delivery/searchCustomers', this.customerQuery) }
      catch (_) { this.error = 'Le carnet client est indisponible. Saisissez une adresse pour cette commande.' }
      finally { this.searching = false }
    },
    async createCustomer() {
      this.searching = true
      try {
        const profile = await this.$store.dispatch('delivery/createCustomer', this.newCustomer)
        if (profile) { this.$store.commit('delivery/PROFILES', [profile]); await this.selectProfile(profile.id) }
      } catch (_) { this.error = 'La fiche client ne peut pas etre creee. Reessayez.' }
      finally { this.searching = false }
    },
    async selectProfile(id) {
      this.profileId = id
      this.selectedAddressId = null
      this.resolution = null
      this.invalidate()
      this.$emit('customer', this.profiles.find(profile => profile.id === id) || null)
      if (id) {
        try { await this.$store.dispatch('delivery/loadAddresses', id) }
        catch (_) { this.error = 'Le carnet est indisponible. Saisissez une adresse pour cette commande.' }
      }
    },
    async selectAddress(id) {
      this.selectedAddressId = id
      this.resolution = null
      this.invalidate()
      await this.$nextTick()
      if (id) await this.resolveStored()
    },
    resolveStored() { return this.$refs.addressInput && this.$refs.addressInput.resolve() },
    resolveAddress(body) { return this.$store.dispatch('delivery/resolveAddress', { ...body, personal: this.site, ...(body.addressId && !this.session ? { customerId: this.profileId } : {}) }) },
    // The shared input emits resolved(null) on teardown when the attempt locks.
    onResolved(resolution) { if (this.locked) return null; this.resolution = resolution; this.$emit('address', resolution); return this.refreshQuote() },
    async refreshQuote() {
      if (this.locked) return null
      this.invalidate()
      if (this.value !== 'delivery' || !this.available || !this.resolution || !this.cart.length) return null
      const sequence = this.sequence
      const basis = this.basis
      this.error = ''
      this.loading = true
      const result = await this.$store.dispatch('delivery/quote', { cart: this.cart, resolution: this.resolution, discount: this.discount })
      if (this._isDestroyed || sequence !== this.sequence || basis !== this.basis) return null
      this.loading = false
      this.currentQuote = result
      this.error = result ? '' : this.delivery.error || 'Le devis est indisponible. Votre panier est conserve.'
      this.$emit('quote', result)
      return result
    },
    confirmQuote() {
      if (this.disabled || this.locked || !this.available || !this.currentQuote || this.loading) return
      if (Date.parse(this.currentQuote.expiresAt) <= Date.now()) { this.refreshQuote(); return }
      this.confirmedBasis = this.basis
      this.$emit('ready', true)
      clearTimeout(this.expiryTimer)
      this.expiryTimer = setTimeout(() => { this.confirmedBasis = null; this.$emit('ready', false) }, Math.max(1, Math.min(300000, Date.parse(this.currentQuote.expiresAt) - Date.now())))
    },
    async saveAddress() {
      if (!this.session || !this.resolution || this.saving) return
      this.saving = true
      try {
        const fresh = await this.$refs.addressInput.resolve()
        if (fresh) await this.$store.dispatch('customer/saveAddress', { addressResolutionToken: fresh.addressResolutionToken,
          complement: fresh.complement, instructions: fresh.instructions })
      } finally { this.saving = false }
    },
    acceptServerQuote(quote) {
      this.invalidate()
      if (this.locked || !quote || quote.shopId !== this.shopId) return
      this.currentQuote = quote
      this.$emit('quote', quote)
      this.error = 'Le prix a change. Confirmez le nouveau total avant de payer.'
    },
  },
}
</script>

<style scoped>
.delivery-checkout { min-width: 0; margin-block: 16px; }
.delivery-checkout .v-btn { min-height: 44px; height: auto; white-space: normal; }
.delivery-checkout ::v-deep .v-btn__content { white-space: normal; }
.delivery-account-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.delivery-totals { margin-block: 16px; font-variant-numeric: tabular-nums; }
.delivery-totals > div { display: flex; justify-content: space-between; gap: 12px; padding-block: 4px; }
.delivery-totals span { overflow-wrap: anywhere; }
</style>
