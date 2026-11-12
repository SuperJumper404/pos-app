<template>
  <section aria-label="Annuaire clients">
    <v-row dense class="mb-4">
      <v-col v-for="metric in metrics" :key="metric.label" cols="12" sm="6" md="3">
        <v-card outlined class="client-metric pa-4">
          <div class="d-flex align-center mb-2"><v-icon small color="primary" class="mr-2">{{ metric.icon }}</v-icon><span class="text--secondary">{{ metric.label }}</span></div>
          <strong>{{ metric.value }}</strong>
        </v-card>
      </v-col>
    </v-row>
    <v-alert v-if="directory.errors.list" type="error" text role="alert">{{ directory.errors.list }}<v-btn text class="text-none" @click="load">Réessayer</v-btn></v-alert>
    <v-alert v-if="directory.errors.export" type="error" text>{{ directory.errors.export }}</v-alert>
    <v-alert v-if="completed" type="success" text role="status">Rapprochement terminé. Les cartes et les points sont conservés.</v-alert>
    <v-card outlined>
      <div class="client-directory-toolbar pa-4">
        <v-text-field v-model="search" outlined dense hide-details aria-label="Rechercher un client" placeholder="Rechercher un nom, téléphone, email ou carte" prepend-inner-icon="mdi-magnify" clearable class="se-search-field clients-search-field client-directory-search" />
        <v-select v-model="filter" :items="filters" outlined dense hide-details label="Afficher" class="client-directory-filter" />
        <div class="client-directory-actions">
          <v-btn outlined class="text-none" :loading="directory.loading.list" @click="load"><v-icon left small>mdi-refresh</v-icon>Actualiser</v-btn>
          <v-btn v-if="directory.capabilities.reconcile" outlined class="text-none" :disabled="directory.loading.action" @click="previewReconciliation"><v-icon left small>mdi-account-convert-outline</v-icon>Rapprocher l’historique</v-btn>
          <v-btn color="primary" depressed class="text-none" :disabled="!directory.total" :loading="directory.loading.export" @click="downloadCsv"><v-icon left small>mdi-download</v-icon>Télécharger CSV</v-btn>
        </div>
      </div>
      <v-data-table :headers="headers" :items="directory.items" item-key="id" :server-items-length="directory.total" :options.sync="options" :header-props="{ sortByText: 'Trier par' }"
        :loading="directory.loading.list" :footer-props="footer" no-data-text="Aucun client à afficher." no-results-text="Aucun client ne correspond à votre recherche."
        loading-text="Chargement des clients…" @click:row="openClient">
        <template #[`item.name`]="{ item }">
          <div class="client-identity py-3">
            <button type="button" class="client-name" @click.stop="openClient(item)">{{ item.name || item.phone || 'Client sans nom' }}</button>
            <div v-if="item.phone" class="mt-1"><a :href="`tel:${item.phone}`" @click.stop>{{ item.phone }}</a></div>
            <div v-if="item.email" class="text--secondary client-email">{{ item.email }}</div>
            <div class="text-caption text--secondary mt-1">{{ sourceLabel(item) }}</div>
          </div>
        </template>
        <template #[`item.totalSpent`]="{ item }">{{ formatCurrency(item.totalSpent) }}</template>
        <template #[`item.averageSpent`]="{ item }">{{ formatCurrency(item.averageSpent) }}</template>
        <template #[`item.lastOrderAt`]="{ item }">{{ item.lastVisitLabel }}</template>
        <template #[`item.loyalty`]="{ item }">
          <div v-if="item.loyalty"><strong>{{ item.loyalty.available }} points</strong><div class="text-caption text--secondary">{{ item.loyalty.reserved }} réservés</div></div>
          <span v-else class="text--secondary">Sans carte</span>
        </template>
        <template #[`item.actions`]="{ item }"><v-btn text color="primary" class="text-none" @click.stop="openClient(item)">Consulter<v-icon right small>mdi-chevron-right</v-icon></v-btn></template>
      </v-data-table>
    </v-card>
    <ClientDetail :id="selectedId || ''" :value="Boolean(selectedId)" @input="!$event && (selectedId = null)" @updated="load" />
    <v-dialog v-model="reconcileDialog" max-width="560" :persistent="directory.loading.action">
      <v-card>
        <v-card-title class="se-modal-title">Rapprocher les contacts historiques</v-card-title>
        <v-card-text>
          <v-progress-linear v-if="directory.loading.action" indeterminate class="mb-4" />
          <v-alert v-if="directory.errors.action" type="error" text>{{ directory.errors.action }}</v-alert>
          <template v-if="preview">
            <p>{{ preview.created }} contacts à enregistrer et {{ preview.linked }} correspondances à rattacher.</p>
            <p v-if="preview.ambiguous">{{ preview.ambiguous }} cas ambigus resteront à examiner dans les fiches clients.</p>
            <p class="mb-0">Les cartes, les points et les montants des commandes sont conservés. Aucun compte de connexion n’est créé.</p>
          </template>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text class="text-none" :disabled="directory.loading.action" @click="reconcileDialog = false">Annuler</v-btn><v-btn color="primary" depressed class="text-none" :disabled="!preview || directory.loading.action" :loading="directory.loading.action" @click="applyReconciliation">Confirmer le rapprochement</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<script>
import price from '@/helpers/price'
import ClientDetail from '@/components/clients/ClientDetail.vue'
export default {
  components: { ClientDetail },
  mixins: [price],
  data() {
    const query = this.$store.state.clients.query
    return { search: query.q, filter: query.filter, selectedId: null, searchTimer: null, reconcileDialog: false, preview: null, completed: false,
      options: { page: query.page, itemsPerPage: query.pageSize, sortBy: [query.sortBy], sortDesc: [query.sortDesc] },
      footer: { 'items-per-page-options': [10, 25, 50, 100], 'items-per-page-text': 'Clients par page', 'page-text': '{0}–{1} sur {2}' } }
  },
  computed: {
    directory() { return this.$store.state.clients },
    staffScope() { return JSON.stringify(this.$store.state.users.user) },
    metrics() {
      const data = this.directory.metrics
      return [
        { icon: 'mdi-account-multiple-outline', label: 'Nombre de clients', value: data.clientCount || 0 },
        { icon: 'mdi-phone-check-outline', label: 'Commandes avec / sans numéro', value: `${data.ordersWithPhone || 0} / ${data.ordersWithoutPhone || 0}` },
        { icon: 'mdi-account-clock-outline', label: 'Clients inactifs depuis 30 jours', value: data.inactiveOver30Days || 0 },
        { icon: 'mdi-repeat', label: 'Taux de retour', value: `${data.returnRate || 0}%` },
      ]
    },
    filters() {
      return [{ text: 'Tous les clients', value: 'all' },
        ...(this.directory.capabilities.manageLoyalty ? [{ text: 'Avec fidélité', value: 'members' }, { text: 'Sans fidélité', value: 'nonmembers' }, { text: 'À rapprocher', value: 'unmatched' }] : []),
        { text: 'Inactifs depuis 30 jours', value: 'inactive' }]
    },
    headers() {
      return [{ text: 'Client', value: 'name' }, { text: 'Commandes', value: 'orderCount' }, { text: 'Total dépensé', value: 'totalSpent' },
        { text: 'Panier moyen', value: 'averageSpent' }, { text: 'Dernière visite', value: 'lastOrderAt' },
        ...(this.directory.capabilities.manageLoyalty ? [{ text: 'Fidélité', value: 'loyalty', sortable: false }] : []),
        { text: '', value: 'actions', sortable: false }]
    },
  },
  watch: {
    search() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.firstPage(), 300) },
    filter() { this.firstPage() },
    options: { deep: true, handler() { this.load() } },
    staffScope() { clearTimeout(this.searchTimer); this.selectedId = null; this.reconcileDialog = false; this.completed = false; this.search = ''; this.filter = 'all'; this.firstPage() },
  },
  mounted() { this.load() },
  deactivated() { clearTimeout(this.searchTimer); this.selectedId = null; this.$store.dispatch('clients/clearDetail') },
  beforeDestroy() { clearTimeout(this.searchTimer); this.$store.dispatch('clients/clearDetail') },
  methods: {
    firstPage() { if (this.options.page === 1) this.load(); else this.options = { ...this.options, page: 1 } },
    load() { return this.$store.dispatch('clients/load', { q: this.search || '', filter: this.filter, page: this.options.page,
      pageSize: this.options.itemsPerPage, sortBy: this.options.sortBy[0] || 'lastOrderAt', sortDesc: this.options.sortDesc[0] ?? true }) },
    sourceLabel(item) { return item.verified ? 'Compte vérifié' : item.source === 'historical' ? 'Contact historique' : 'Fiche client' },
    openClient(item) { this.selectedId = item.id },
    async previewReconciliation() { this.preview = null; this.completed = false; this.reconcileDialog = true; this.preview = await this.$store.dispatch('clients/reconcile', true) },
    async applyReconciliation() {
      const result = await this.$store.dispatch('clients/reconcile', false)
      if (result) { this.reconcileDialog = false; this.completed = true; this.firstPage() }
    },
    async downloadCsv() {
      const csv = await this.$store.dispatch('clients/exportCsv')
      if (typeof csv !== 'string' || this._isDestroyed) return
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url; link.download = 'clients-fidelite.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
    },
  },
}
</script>
<style scoped>
.client-metric { height: 100%; }
.client-metric strong { font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.client-directory-toolbar, .client-directory-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.client-directory-search { flex: 1 1 280px; }
.client-directory-filter { flex: 0 1 220px; }
.client-directory-actions { margin-left: auto; }
.client-directory-actions .v-btn { min-height: 44px; }
.client-identity { max-width: 280px; }
.client-name { color: var(--se-color-text); font-weight: 600; text-align: left; overflow-wrap: anywhere; min-height: 32px; }
.client-name:hover { color: var(--se-color-primary); text-decoration: underline; }
.client-name:focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 3px; }
.client-email { overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .client-directory-search, .client-directory-filter { flex-basis: 100%; }
  .client-directory-actions { width: 100%; margin-left: 0; }
  .client-directory-actions .v-btn { flex: 1 1 auto; }
  .client-identity { max-width: 100%; }
}
</style>
