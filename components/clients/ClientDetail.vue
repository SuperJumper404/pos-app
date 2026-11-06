<template>
  <v-dialog :value="value" :fullscreen="$vuetify.breakpoint.xsOnly" scrollable max-width="980" @input="$emit('input', $event)">
    <v-card>
      <v-card-title class="se-modal-title">{{ client ? client.name || client.phone || 'Fiche client' : 'Fiche client' }}<v-spacer /><v-btn icon aria-label="Fermer la fiche client" @click="$emit('input', false)"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
      <v-card-text>
        <v-alert v-if="directory.errors.detail" type="error" text>{{ directory.errors.detail }}<v-btn text class="text-none" @click="load">Réessayer</v-btn></v-alert>
        <v-skeleton-loader v-if="directory.loading.detail" type="article, table" />
        <template v-else-if="client">
          <div class="client-detail-contact mb-5">
            <v-chip small outlined>{{ client.verified ? 'Compte vérifié' : client.source === 'historical' ? 'Contact historique' : 'Fiche client' }}</v-chip>
            <a v-if="client.phone" :href="`tel:${client.phone}`"><v-icon small left>mdi-phone-outline</v-icon>{{ client.phone }}</a>
            <a v-if="client.email" :href="`mailto:${client.email}`">{{ client.email }}</a>
          </div>
          <v-row class="mb-4"><v-col cols="6" sm="3"><div class="text--secondary">Commandes</div><strong>{{ client.orderCount }}</strong></v-col><v-col cols="6" sm="3"><div class="text--secondary">Total dépensé</div><strong>{{ formatCurrency(client.totalSpent) }}</strong></v-col><v-col cols="6" sm="3"><div class="text--secondary">Panier moyen</div><strong>{{ formatCurrency(client.averageSpent) }}</strong></v-col><v-col cols="6" sm="3"><div class="text--secondary">Dernière visite</div><strong>{{ client.lastVisitLabel }}</strong></v-col></v-row>
          <p v-if="client.aliases.length" class="text--secondary">Noms utilisés : {{ client.aliases.join(', ') }}</p>
          <p v-if="client.firstOrderAt" class="text--secondary">Première commande : {{ formatDate(client.firstOrderAt) }}</p>
          <v-tabs v-model="tab" class="mb-4"><v-tab class="text-none">Achats</v-tab><v-tab v-if="directory.capabilities.manageLoyalty" class="text-none">Fidélité</v-tab></v-tabs>
          <v-data-table v-if="tab === 0" :headers="orderHeaders" :items="directory.selected.orders" item-key="id" :items-per-page="10" :footer-props="footer" no-data-text="Aucune commande archivée pour ce client.">
            <template #[`item.created`]="{ item }">{{ formatDate(item.created) }}</template>
            <template #[`item.total`]="{ item }">{{ formatCurrency(item.total) }}</template>
            <template #[`item.orderNumber`]="{ item }"><nuxt-link :to="`/history/ticket/${item.id}`">{{ item.orderNumber || item.id }}</nuxt-link></template>
          </v-data-table>
          <section v-else-if="directory.capabilities.manageLoyalty" aria-label="Carte et mouvements de fidélité">
            <p v-if="!client.loyalty" class="py-4">Ce client n’a pas de carte de fidélité. Il peut rejoindre le programme depuis son parcours client.</p>
            <template v-else>
              <v-row class="mb-4"><v-col cols="4"><div class="text--secondary">Solde</div><strong>{{ client.loyalty.balance }} points</strong></v-col><v-col cols="4"><div class="text--secondary">Réservés</div><strong>{{ client.loyalty.reserved }} points</strong></v-col><v-col cols="4"><div class="text--secondary">Disponibles</div><strong>{{ client.loyalty.available }} points</strong></v-col></v-row>
              <p class="client-card-number text--secondary">Carte : {{ client.loyalty.cardNumber || client.loyalty.id }}</p>
              <v-btn outlined class="text-none mb-4" @click="notifyMember"><v-icon left>mdi-bell-outline</v-icon>Préparer une notification</v-btn>
              <v-alert v-if="loyalty.error" type="error" text>{{ loyalty.error }}<v-btn text class="text-none" @click="loadMember">Réessayer</v-btn></v-alert>
              <v-progress-linear v-if="loyalty.busy" indeterminate class="mb-4" />
              <v-data-table :headers="pointHeaders" :items="member ? member.history : []" :loading="loyalty.busy" :items-per-page="10" :footer-props="footer" no-data-text="Aucun mouvement de points.">
                <template #[`item.createdAt`]="{ item }">{{ formatDate(item.createdAt) }}</template>
                <template #[`item.kind`]="{ item }">{{ movementLabel(item.kind) }}</template>
              </v-data-table>
              <v-form ref="adjustForm" class="client-detail-section mt-6 pt-5" @submit.prevent="adjust">
                <h2 class="subtitle-1 mb-4">Corriger les points</h2>
                <v-text-field v-model.number="adjustment" outlined dense type="number" label="Points à ajouter ou retirer" hint="Un nombre négatif retire des points." persistent-hint :rules="[integer]" :disabled="loyalty.busy" />
                <v-textarea v-model="reason" outlined dense rows="2" label="Motif obligatoire" maxlength="1000" :rules="[required]" :disabled="loyalty.busy" />
                <v-btn type="submit" outlined color="primary" class="text-none" :loading="loyalty.busy" :disabled="!member">Confirmer la correction</v-btn>
              </v-form>
            </template>
          </section>
          <section v-if="directory.capabilities.reconcile && client.reconciliation.canLink" class="client-detail-section mt-6 pt-5">
            <h2 class="subtitle-1 mb-3">Rattacher cet historique</h2>
            <p>Choisissez la fiche client à laquelle appartiennent ces achats. Les cartes et les points ne sont pas fusionnés.</p>
            <v-autocomplete v-model="target" :items="candidates" item-value="customerId" :item-text="candidateLabel" :search-input.sync="targetSearch" :loading="directory.loading.candidates" outlined dense clearable no-filter label="Rechercher une fiche client existante" no-data-text="Aucune fiche correspondante." :disabled="directory.loading.action" />
            <v-alert v-if="directory.errors.action || directory.errors.candidates" type="error" text>{{ directory.errors.action || directory.errors.candidates }}</v-alert>
            <v-btn color="primary" depressed class="text-none" :disabled="!target || directory.loading.action" :loading="directory.loading.action" @click="link">Rattacher à la fiche choisie</v-btn>
          </section>
          <v-alert v-else-if="client.reconciliation.status === 'ambiguous'" type="info" text class="mt-5">Cette fiche possède déjà des données rattachées. Les comptes et les cartes restent séparés.</v-alert>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
<script>
import price from '@/helpers/price'
export default {
  mixins: [price],
  props: { value: Boolean, id: { type: String, default: '' } },
  data: () => ({ tab: 0, adjustment: null, reason: '', target: null, targetSearch: '', searchTimer: null,
    footer: { 'items-per-page-text': 'Lignes par page', 'page-text': '{0}–{1} sur {2}' },
    orderHeaders: [{ text: 'Date', value: 'created' }, { text: 'Commande', value: 'orderNumber' }, { text: 'Montant', value: 'total' }],
    pointHeaders: [{ text: 'Date', value: 'createdAt' }, { text: 'Mouvement', value: 'kind' }, { text: 'Points', value: 'points' }, { text: 'Motif', value: 'reason' }],
  }),
  computed: {
    directory() { return this.$store.state.clients },
    client() { return this.directory.selected && this.directory.selected.client },
    loyalty() { return this.$store.state.loyalty },
    member() { return this.client && this.client.loyalty && this.loyalty.selected && this.loyalty.selected.id === this.client.loyalty.id ? this.loyalty.selected : null },
    candidates() {
      const candidates = [...(this.directory.selected?.candidates || []), ...this.directory.candidates]
      return [...new Map(candidates.filter(item => item.customerId && item.source !== 'historical' && item.customerId !== this.client?.customerId).map(item => [item.customerId, item])).values()]
    },
  },
  watch: {
    value: { immediate: true, handler(open, previous) { if (open) { this.tab = 0; this.load() } else if (previous) { clearTimeout(this.searchTimer); this.$store.dispatch('clients/clearDetail'); this.$store.dispatch('loyalty/reset') } } },
    id() { if (this.value) { this.tab = 0; this.load() } },
    tab(value) { if (value === 1 && this.client?.loyalty) this.loadMember() },
    targetSearch(value) { clearTimeout(this.searchTimer); if (this.value && value && value !== this.target) this.searchTimer = setTimeout(() => this.$store.dispatch('clients/searchCandidates', value), 300) },
  },
  beforeDestroy() { clearTimeout(this.searchTimer); if (this.value) { this.$store.dispatch('clients/clearDetail'); this.$store.dispatch('loyalty/reset') } },
  methods: {
    notifyMember() { if (this.directory.capabilities.manageLoyalty && this.client?.loyalty) this.$emit('notify', { ...this.client.loyalty, name: this.client.name }) },
    required(value) { return typeof value === 'string' && !!value.trim() || 'Champ obligatoire' },
    integer(value) { return Number.isSafeInteger(value) && value !== 0 || 'Saisissez un entier non nul' },
    async load() { this.target = null; this.targetSearch = ''; this.adjustment = null; this.reason = ''; await this.$store.dispatch('clients/detail', this.id) },
    loadMember() { this.$store.dispatch('loyalty/reset'); if (this.client?.loyalty) return this.$store.dispatch('loyalty/memberHistory', this.client.loyalty.id) },
    async adjust() {
      if (!this.member || !this.$refs.adjustForm.validate()) return
      const clientId = this.id
      const result = await this.$store.dispatch('loyalty/adjust', { memberId: this.member.id, points: this.adjustment, reason: this.reason })
      if (result && this.value && this.id === clientId) { this.adjustment = null; this.reason = ''; await this.$store.dispatch('clients/detail', clientId); this.$emit('updated') }
    },
    candidateLabel(item) { return [item.name || 'Client', item.phone || item.email].filter(Boolean).join(' · ') },
    async link() {
      if (!this.target || !this.client) return
      const clientId = this.id; const target = this.target
      for (const contactKey of this.client.reconciliation.contactKeys || []) {
        const result = await this.$store.dispatch('clients/linkContact', { contactKey, customerId: target })
        if (!result || !this.value || this.id !== clientId) return
      }
      await this.$store.dispatch('clients/detail', clientId); this.$emit('updated')
    },
    formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date) },
    movementLabel(kind) { return { earn: 'Points gagnés', spend: 'Récompense utilisée', reserve: 'Réservation', release: 'Libération', restore: 'Restitution', refund: 'Remboursement', adjustment: 'Correction', expire: 'Expiration' }[kind] || 'Mouvement' },
  },
}
</script>
<style scoped>
.client-detail-contact { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.client-detail-contact a, .client-card-number { overflow-wrap: anywhere; }
.client-detail-section { border-top: 1px solid var(--se-color-border); }
strong { font-variant-numeric: tabular-nums; }
</style>
