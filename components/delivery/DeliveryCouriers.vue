<template>
  <section aria-label="Livreurs">
    <div class="couriers-heading"><h2>Livreurs</h2><v-btn v-if="canManageAccounts" text to="/staff?create=courier"><v-icon left>mdi-account-plus-outline</v-icon>Ajouter un livreur</v-btn></div>
    <v-alert v-if="error" type="error" text role="alert">{{ error }}</v-alert>
    <v-data-table :headers="headers" :items="couriers" :loading="busy" :items-per-page="20" dense no-data-text="Aucun compte livreur.">
      <template #[`item.status`]="{ item }"><v-chip small :color="Number(item.status) === 1 ? 'success' : undefined">{{ Number(item.status) === 1 ? 'Actif' : 'Desactive' }}</v-chip></template>
      <template #[`item.available`]="{ item }"><v-switch :input-value="Number(item.available) === 1" :label="Number(item.available) === 1 ? 'Disponible' : 'Indisponible'" :disabled="Number(item.status) !== 1 || saving === item.id" hide-details class="my-2" @change="setAvailable(item, $event)" /></template>
      <template #[`item.actions`]="{ item }"><v-btn v-if="canManageAccounts" icon :to="`/staff?courier=${item.id}`" title="Gerer le compte et le PIN" aria-label="Gerer le compte et le PIN"><v-icon>mdi-account-edit-outline</v-icon></v-btn></template>
    </v-data-table>
  </section>
</template>

<script>
const { isDeliveryAdmin } = require('@/helpers/staffRoles')
export default {
  data: () => ({ saving: null, error: '', headers: [{ text: 'Livreur', value: 'username' }, { text: 'Compte', value: 'status' },
    { text: 'Disponibilite manuelle', value: 'available' }, { text: 'Missions affectees', value: 'missionCount' }, { text: 'Compte / PIN', value: 'actions', sortable: false }] }),
  computed: {
    canManageAccounts() { return isDeliveryAdmin(this.$store.state.users.user) },
    couriers() { return this.$store.state.delivery.operator.couriers },
    busy() { return this.$store.state.delivery.operator.loading > 0 },
  },
  methods: {
    async setAvailable(item, available) {
      this.saving = item.id; this.error = ''
      try { await this.$store.dispatch('delivery/operatorAvailability', { courierId: item.id, available: Boolean(available) }) }
      catch (failure) { this.error = failure.message }
      finally { this.saving = null }
    },
  },
}
</script>

<style scoped>
.couriers-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
h2 { font-size: 20px; font-weight: 600; }
</style>
