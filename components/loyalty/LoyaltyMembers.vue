<template>
  <section aria-label="Clients adhérents">
    <div class="d-flex flex-wrap align-center mb-4">
      <v-text-field v-model="search" outlined dense clearable hide-details label="Nom, téléphone ou numéro de carte" maxlength="128" prepend-inner-icon="mdi-magnify" />
      <v-btn text class="text-none ml-3" :loading="loyalty.membersBusy" @click="load">Actualiser</v-btn>
    </div>
    <v-alert v-if="loyalty.membersError" type="error" text role="alert">{{ loyalty.membersError }}</v-alert>
    <v-data-table :headers="headers" :items="loyalty.members" :server-items-length="loyalty.membersTotal" :options.sync="options" :loading="loyalty.membersBusy" :footer-props="{ 'items-per-page-options': [25, 50, 100] }" item-key="id" disable-sort no-data-text="Aucun adhérent trouvé." @click:row="$emit('select', $event)">
      <template #[`item.walletRegistered`]="{ item }"><span>{{ item.walletRegistered ? 'Enregistrée' : 'Non enregistrée' }}</span></template>
      <template #[`item.actions`]="{ item }"><v-btn text small class="text-none" @click.stop="$emit('select', item)">Consulter</v-btn><v-btn text small class="text-none" @click.stop="$emit('notify', item)">Notifier</v-btn></template>
    </v-data-table>
    <p class="text-body-2 text--secondary mt-3">Une carte enregistrée indique qu’un appareil Apple Wallet est connu. L’adhésion reste active si le client retire sa carte de Wallet.</p>
  </section>
</template>
<script>
export default {
  props: { refreshKey: { type: Number, default: 0 } },
  data: () => ({ search: '', timer: null, options: { page: 1, itemsPerPage: 25 },
    headers: [{ text: 'Client', value: 'name' }, { text: 'Téléphone', value: 'phone' }, { text: 'Carte', value: 'cardNumber' }, { text: 'Solde', value: 'balance' }, { text: 'Réservés', value: 'reserved' }, { text: 'Disponibles', value: 'available' }, { text: 'Apple Wallet', value: 'walletRegistered' }, { text: 'Actions', value: 'actions' }] }),
  computed: { loyalty() { return this.$store.state.loyalty } },
  watch: {
    options: { deep: true, immediate: true, handler() { this.load() } },
    refreshKey() { this.load() },
    search() { clearTimeout(this.timer); this.timer = setTimeout(() => { if (this.options.page !== 1) this.options.page = 1; else this.load() }, 300) },
  },
  beforeDestroy() { clearTimeout(this.timer) },
  methods: { load() { return this.$store.dispatch('loyalty/loadMembers', { page: this.options.page, pageSize: this.options.itemsPerPage, search: this.search || '' }) } },
}
</script>
