<template>
  <div>
    <div class="customer-section-heading">
      <h1>Mon compte</h1>
      <v-btn v-if="guestRoute" :to="guestRoute" text><v-icon left>mdi-arrow-left</v-icon>Commander en invite</v-btn>
    </div>
    <v-skeleton-loader v-if="opening" type="heading, list-item-two-line, actions" />
    <v-alert v-else-if="!account.shopId" type="warning" text role="alert">Ouvrez le compte depuis le restaurant de votre choix.</v-alert>
    <template v-else-if="!account.session">
      <customer-code-login :key="`login-${account.epoch}`" />
    </template>
    <template v-else>
      <div class="customer-section-heading">
        <p class="mb-0"><v-icon small color="success">mdi-account-check-outline</v-icon> Connecte a votre compte client</p>
        <v-btn outlined :loading="account.busy" @click="logout"><v-icon left>mdi-logout</v-icon>Me deconnecter</v-btn>
      </div>
      <section class="customer-section">
        <v-skeleton-loader v-if="loadingBook" type="list-item-three-line" />
        <customer-address-book v-else :key="`book-${account.epoch}`" @select="addressSelected" />
        <p v-if="selectedAddress" class="customer-wrap" role="status">{{ selectedAddress }} selectionnee.</p>
      </section>
      <section class="customer-section">
        <v-btn v-if="!linking" outlined @click="linking = true"><v-icon left>mdi-link-variant</v-icon>Ajouter un e-mail ou WhatsApp</v-btn>
        <template v-else>
          <customer-code-login :key="`link-${account.epoch}`" mode="link" @identity-linked="identityLinked" />
          <v-btn text :disabled="account.busy" @click="cancelLink">Annuler</v-btn>
        </template>
        <p v-if="linked" role="status"><v-icon small color="success">mdi-check</v-icon> Contact verifie et ajoute.</p>
      </section>
    </template>
  </div>
</template>

<script>
import CustomerCodeLogin from '@/components/customer/CustomerCodeLogin.vue'
import CustomerAddressBook from '@/components/customer/CustomerAddressBook.vue'

export default {
  components: { CustomerCodeLogin, CustomerAddressBook },
  layout: 'customer',
  data() { return { opening: true, loadingBook: false, linking: false, linked: false, selectedAddress: '', openSequence: 0, bookEpoch: null } },
  computed: {
    account() { return this.$store.state.customer },
    guestRoute() {
      const name = this.account.shop ? this.account.shop.shop_name : 'Restaurant'
      return this.account.shopId ? `/click-and-collect/${this.account.shopId}/${encodeURIComponent(name)}` : null
    },
  },
  watch: {
    '$route.query.shopId'(shopId) { this.openShop(shopId) },
    'account.epoch'() {
      this.linking = false
      this.linked = false
      this.selectedAddress = ''
      this.loadingBook = false
      this.bookEpoch = null
    },
    'account.session'(session) {
      if (session) this.authenticated()
      else { this.loadingBook = false; this.bookEpoch = null }
    },
  },
  mounted() { this.openShop(this.$route.query.shopId) },
  beforeDestroy() { this.openSequence++; this.$store.dispatch('customer/resetForShop', null) },
  methods: {
    async openShop(value) {
      const shopId = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : null
      const sequence = ++this.openSequence
      this.opening = true
      this.loadingBook = false
      await this.$store.dispatch('customer/loadSession', { shopId })
      if (sequence !== this.openSequence || this._isDestroyed) return
      this.opening = false
    },
    async authenticated() {
      const { session, epoch, shopId } = this.account
      if (!session || this.bookEpoch === epoch) return
      this.bookEpoch = epoch
      this.loadingBook = true
      try {
        await this.$store.dispatch('customer/loadAddresses')
      } finally {
        if (!this._isDestroyed && epoch === this.account.epoch && shopId === this.account.shopId) this.loadingBook = false
      }
    },
    logout() { return this.$store.dispatch('customer/logout') },
    cancelLink() { this.$store.dispatch('customer/clearChallenge'); this.linking = false },
    identityLinked() { this.linking = false; this.linked = true },
    addressSelected(result) {
      const address = this.account.addresses.find(address => address.id === result.addressId)
      this.selectedAddress = address ? address.label : ''
    },
  },
}
</script>
