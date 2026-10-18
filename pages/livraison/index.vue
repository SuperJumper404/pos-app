<template>
  <v-container fluid class="delivery-workspace">
    <header class="delivery-heading">
      <h1>Livraison</h1>
      <v-btn icon :loading="busy" title="Actualiser la livraison" aria-label="Actualiser la livraison" @click="refresh"><v-icon>mdi-refresh</v-icon></v-btn>
    </header>
    <template v-if="scopeReady">
      <v-tabs v-model="tab" show-arrows class="mb-5">
        <v-tab v-for="item in tabs" :key="item.value" :disabled="item.value === 'settings' && !admin">{{ item.text }}</v-tab>
      </v-tabs>
      <v-alert v-if="error" type="error" text role="alert">{{ error }}</v-alert>
      <DeliveryDispatch v-show="tab === 0" :key="`dispatch:${actorKey}`" />
      <DeliveryCouriers v-show="tab === 1" :key="`couriers:${actorKey}`" />
      <DeliveryCashRemittances v-show="tab === 2" :key="`cash:${actorKey}`" />
      <DeliverySettings v-if="admin" v-show="tab === 3" :key="`settings:${actorKey}`" />
    </template>
  </v-container>
</template>

<script>
import DeliveryDispatch from '@/components/delivery/DeliveryDispatch.vue'
import DeliveryCouriers from '@/components/delivery/DeliveryCouriers.vue'
import DeliveryCashRemittances from '@/components/delivery/DeliveryCashRemittances.vue'
import DeliverySettings from '@/components/delivery/DeliverySettings.vue'
import { operatorIdentity } from '@/store/delivery'
const { isDeliveryAdmin, canOperateDelivery } = require('@/helpers/staffRoles')

export default {
  components: { DeliveryDispatch, DeliveryCouriers, DeliveryCashRemittances, DeliverySettings },
  middleware: ['auth', 'delivery'],
  data: () => ({ tab: 0, tabs: [{ value: 'missions', text: 'Commandes' }, { value: 'couriers', text: 'Livreurs' },
    { value: 'cash', text: "Remises d'especes" }, { value: 'settings', text: 'Reglages' }] }),
  computed: {
    admin() { return isDeliveryAdmin(this.$store.state.users.user) },
    actorKey() { return operatorIdentity(this.$store.state) },
    authorized() { return this.$store.state.authenticated !== false && canOperateDelivery(this.$store.state.users.user) },
    scopeReady() { return this.authorized && this.$store.state.delivery.operator.identity === this.actorKey },
    error() { return this.$store.state.delivery.operator.error },
    busy() { return this.$store.state.delivery.operator.loading > 0 },
  },
  watch: { actorKey() { this.refresh() } },
  mounted() { this.refresh() },
  methods: {
    async refresh() {
      const identity = this.actorKey
      await this.$store.dispatch('delivery/operatorInitialize')
      if (identity !== this.actorKey || this._isDestroyed) return
      if (!this.authorized) return this.$router.replace('/login')
      for (const resource of ['missions', 'couriers', 'holders', ...(this.admin ? ['settings'] : [])]) {
        if (identity !== this.actorKey || this._isDestroyed) return
        await this.$store.dispatch('delivery/operatorLoad', { resource })
      }
    },
  },
}
</script>

<style scoped>
.delivery-workspace { max-width: 1600px; }
.delivery-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.delivery-heading h1 { font-size: 24px; font-weight: 600; }
.delivery-workspace ::v-deep .v-btn { min-height: 44px; }
.delivery-workspace ::v-deep .v-btn--icon { width: 44px; height: 44px; }
.delivery-workspace ::v-deep .v-tab { min-height: 48px; letter-spacing: 0; text-transform: none; }
.delivery-workspace ::v-deep td { font-variant-numeric: tabular-nums; }
.delivery-workspace ::v-deep .v-card { border-radius: 8px; }
.delivery-workspace ::v-deep .v-card__title { font-size: 18px; overflow-wrap: anywhere; }
</style>
