<template>
  <section aria-labelledby="address-book-heading">
    <div class="customer-section-heading">
      <h2 id="address-book-heading">Mes adresses</h2>
      <v-btn v-if="!editing" outlined :disabled="account.busy || working" @click="editAddress(null)"><v-icon left>mdi-plus</v-icon>Ajouter une adresse</v-btn>
    </div>
    <v-alert v-if="account.error" type="error" text role="alert">{{ account.error.message }}</v-alert>
    <v-alert v-if="selectionError" type="error" text role="alert">{{ selectionError }}</v-alert>
    <p v-if="!account.addresses.length && !editing">Aucune adresse enregistree.</p>
    <ul v-if="!editing" class="customer-addresses">
      <li v-for="address in account.addresses" :key="address.id" class="customer-address-row">
        <div class="customer-address-content">
          <div class="customer-actions"><h3>{{ address.label }}</h3><span v-if="address.isDefault" class="customer-default"><v-icon small>mdi-star</v-icon> Par defaut</span></div>
          <CustomerAddressSummary :value="address" :loader="displayAddress" :context-key="account.epoch" />
          <p v-if="address.addressSnapshot.complement" class="customer-wrap">{{ address.addressSnapshot.complement }}</p>
          <p v-if="address.addressSnapshot.instructions" class="customer-wrap customer-muted">{{ address.addressSnapshot.instructions }}</p>
        </div>
        <div class="customer-address-actions">
          <v-btn outlined :disabled="account.busy || working" @click="selectAddress(address)"><v-icon left>mdi-map-marker-check-outline</v-icon>Choisir</v-btn>
          <v-tooltip bottom><template #activator="{ on, attrs }"><v-btn icon class="customer-icon" :disabled="account.busy || working" :aria-label="`Modifier ${address.label}`" v-bind="attrs" v-on="on" @click="editAddress(address)"><v-icon>mdi-pencil-outline</v-icon></v-btn></template><span>Modifier</span></v-tooltip>
          <v-tooltip v-if="!address.isDefault" bottom><template #activator="{ on, attrs }"><v-btn icon class="customer-icon" :disabled="account.busy || working" :aria-label="`${address.label} par defaut`" v-bind="attrs" v-on="on" @click="makeDefault(address)"><v-icon>mdi-star-outline</v-icon></v-btn></template><span>Definir par defaut</span></v-tooltip>
          <v-tooltip bottom><template #activator="{ on, attrs }"><v-btn icon class="customer-icon" :disabled="account.busy || working" :aria-label="`Supprimer ${address.label}`" v-bind="attrs" v-on="on" @click="confirmDelete = address.id"><v-icon>mdi-delete-outline</v-icon></v-btn></template><span>Supprimer</span></v-tooltip>
        </div>
        <div v-if="confirmDelete === address.id" class="customer-delete" role="alert">
          <p>Supprimer {{ address.label }} ?</p>
          <v-btn color="error" :disabled="account.busy || working" @click="removeAddress(address.id)">Supprimer</v-btn>
          <v-btn text :disabled="account.busy || working" @click="confirmDelete = null">Annuler</v-btn>
        </div>
      </li>
    </ul>
    <form v-else novalidate @submit.prevent="save">
      <h3>{{ selected ? selected.label : 'Nouvelle adresse' }}</h3>
      <delivery-address-input
        :key="`${account.epoch}-${selected ? selected.id : 'new'}`" ref="addressInput"
        :value="selected" :resolver="resolveAddress" :suggester="suggestAddresses" :context-key="account.epoch"
        :disabled="account.busy" @resolved="resolved = $event"
      />
      <v-checkbox v-model="defaultAddress" label="Adresse par defaut" :disabled="account.busy || working" />
      <div class="customer-actions">
        <v-btn type="submit" color="primary" :disabled="account.busy" :loading="working"><v-icon left>mdi-content-save-outline</v-icon>Enregistrer</v-btn>
        <v-btn text :disabled="account.busy || working" @click="cancelEdit">Annuler</v-btn>
      </div>
      <p v-if="validationError" role="alert">{{ validationError }}</p>
    </form>
  </section>
</template>

<script>
import DeliveryAddressInput from '@/components/delivery/DeliveryAddressInput.vue'
import CustomerAddressSummary from '@/components/customer/CustomerAddressSummary.vue'
const { buildAddressDisplayQueue } = require('@/helpers/deliveryAddressDisplay')

export default {
  components: { DeliveryAddressInput, CustomerAddressSummary },
  data() { return { editing: false, selected: null, resolved: null, defaultAddress: false, working: false, confirmDelete: null, validationError: '', selectionError: '' } },
  computed: { account() { return this.$store.state.customer } },
  watch: { 'account.epoch'() { this.addressDisplayQueue.clear(); this.cancelEdit(); this.confirmDelete = null } },
  created() { this.addressDisplayQueue = buildAddressDisplayQueue(addressId => this.$store.dispatch('customer/displayAddress', { addressId })) },
  beforeDestroy() { this.addressDisplayQueue.clear() },
  methods: {
    resolveAddress(payload) { return this.$store.dispatch('customer/resolveAddress', payload) },
    suggestAddresses(payload) { return this.$store.dispatch('customer/suggestAddresses', payload) },
    displayAddress(address) { return this.addressDisplayQueue.load(address.id) },
    editAddress(address) {
      this.selected = address
      this.defaultAddress = Boolean(address && address.isDefault)
      this.resolved = null
      this.validationError = ''
      this.editing = true
    },
    cancelEdit() { this.editing = false; this.selected = null; this.resolved = null; this.validationError = '' },
    async save() {
      if (this.working || this.account.busy) return
      this.working = true
      this.validationError = ''
      const epoch = this.account.epoch
      try {
        const input = this.$refs.addressInput
        const privateOnly = this.selected && this.selected.addressSnapshot.provider === 'google_places' && input.unchangedPostal
        const result = privateOnly ? { complement: input.draft.complement, instructions: input.draft.instructions } : await input.resolve()
        if (!result || epoch !== this.account.epoch) { this.validationError = 'Verifiez et validez votre adresse.'; return }
        const saved = await this.$store.dispatch('customer/saveAddress', {
          ...(this.selected ? { id: this.selected.id } : {}),
          addressResolutionToken: result.addressResolutionToken,
          complement: result.complement, instructions: result.instructions, makeDefault: this.defaultAddress,
        })
        if (saved && epoch === this.account.epoch) this.cancelEdit()
      } finally { this.working = false }
    },
    async selectAddress(address) {
      if (this.working || this.account.busy) return
      this.working = true
      const epoch = this.account.epoch
      this.selectionError = ''
      try {
        const result = await this.resolveAddress({ addressId: address.id })
        if (result && epoch === this.account.epoch && !this._isDestroyed) this.$emit('select', { addressId: address.id, ...result })
      } catch (error) {
        if (epoch === this.account.epoch) this.selectionError = error.message
      } finally { this.working = false }
    },
    makeDefault(address) { return this.$store.dispatch('customer/saveAddress', { id: address.id, makeDefault: true }) },
    async removeAddress(id) {
      if (this.working || this.account.busy) return
      const result = await this.$store.dispatch('customer/deleteAddress', id)
      if (result) this.confirmDelete = null
    },
  },
}
</script>
