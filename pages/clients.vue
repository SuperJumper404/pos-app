<template>
  <v-container fluid class="clients-page pa-5">
    <header class="clients-page__header mb-5">
      <div><h1>Clients et fidélité</h1><p class="mb-0 mt-1 text--secondary">Retrouvez les achats, le compte et la fidélité de vos clients.</p></div>
    </header>
    <v-tabs v-if="isAdmin" v-model="tab" class="clients-page__tabs mb-5" aria-label="Gestion des clients">
      <v-tab class="text-none"><v-icon small left>mdi-account-multiple-outline</v-icon>Clients</v-tab>
      <v-tab class="text-none"><v-icon small left>mdi-card-account-details-outline</v-icon>Programme de fidélité</v-tab>
    </v-tabs>
    <keep-alive>
      <ClientDirectory v-if="tab === 0 || !isAdmin" :key="`clients-${staffScope}`" />
      <LoyaltyProgram v-else :key="`programme-${staffScope}`" />
    </keep-alive>
  </v-container>
</template>
<script>
import ClientDirectory from '@/components/clients/ClientDirectory.vue'
import LoyaltyProgram from '@/components/loyalty/LoyaltyProgram.vue'
const { isDeliveryAdmin } = require('@/helpers/staffRoles')
export default {
  components: { ClientDirectory, LoyaltyProgram },
  middleware: 'auth',
  data: () => ({ tab: 0 }),
  computed: {
    isAdmin() { return isDeliveryAdmin(this.$store.state.users.user) },
    staffScope() { return JSON.stringify(this.$store.state.users.user) },
  },
  watch: {
    '$route.query.tab': { immediate: true, handler(value) { this.tab = value === 'programme' && this.isAdmin ? 1 : 0 } },
    tab(value) {
      const next = value === 1 ? 'programme' : undefined
      if (this.$router && this.$route.query.tab !== next) this.$router.replace({ query: { ...this.$route.query, tab: next } }).catch(() => {})
    },
    staffScope() { this.$store.dispatch('clients/reset'); this.$store.dispatch('loyalty/reset'); this.tab = 0 },
  },
  beforeDestroy() { this.$store.dispatch('clients/reset'); this.$store.dispatch('loyalty/reset') },
}
</script>
<style scoped>
.clients-page { background: var(--se-color-analytics-bg, #f7f9fc); min-height: 100%; }
.clients-page__header h1 { font-size: var(--se-font-title, 1.5rem); font-weight: 600; line-height: 1.3; }
.clients-page__tabs { border-bottom: 1px solid var(--se-color-border); }
@media (max-width: 600px) {
  .clients-page__tabs ::v-deep .v-tab { min-width: 0; max-width: none; flex: 1 1 50%; white-space: normal; letter-spacing: normal; text-align: center; font-size: 0.8rem; }
  .clients-page__tabs ::v-deep .v-tabs-bar { height: 56px; }
}
</style>
