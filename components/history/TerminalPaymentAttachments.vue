<template>
  <v-dialog :value="value" max-width="780" scrollable aria-labelledby="terminal-attachments-title" @input="!$event && closeDialog()">
    <v-card class="terminal-attachments se-modal">
      <v-card-title class="terminal-attachments__heading se-modal-title">
        <div class="se-modal-title__copy">
          <h2 id="terminal-attachments-title">Commandes jointes</h2>
          <p v-if="payment" class="se-modal-title__subtitle">Paiement TPE #{{ payment.id }} · {{ money(payment.amountCents) }}</p>
        </div>
        <v-spacer />
        <v-btn icon class="terminal-attachments__touch se-modal-icon" aria-label="Fermer les commandes jointes" @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text class="terminal-attachments__body">
        <p class="terminal-attachments__notice">Liens informatifs, même pour un paiement annulé. Aucun montant ni statut de commande n’est modifié.</p>
        <v-alert v-if="errorMessage" type="error" text dense role="alert">{{ errorMessage }}</v-alert>
        <v-progress-linear v-if="loadingPayment" indeterminate color="primary" class="mb-4" aria-label="Chargement des pièces jointes" />
        <ul v-if="attachments.length" class="terminal-attachments__list" aria-label="Commandes déjà jointes">
          <li v-for="item in attachments" :key="sourceKey(item)" class="terminal-attachments__item">
            <div>
              <v-btn v-if="item.available" outlined class="text-none terminal-attachments__reference se-modal-action se-modal-action--secondary" :to="item.archiveId ? `/history/ticket/${item.archiveId}` : `/orders/detail/${item.orderId}`">#{{ item.orderNumber }}<v-icon small right>mdi-open-in-new</v-icon></v-btn>
              <strong v-else>#{{ item.orderNumber }}</strong>
              <span v-if="!item.available" class="text-caption d-block">Commande d’origine indisponible</span>
            </div>
            <span class="terminal-attachments__money">{{ money(item.amountCents) }}</span>
            <v-btn v-if="canModify" icon class="terminal-attachments__touch se-modal-icon se-modal-icon--warning" :disabled="busy" :aria-label="`Retirer le lien avec la commande ${item.orderNumber}`" :title="`Retirer le lien avec la commande ${item.orderNumber}`" @click="removeAttachment(item)"><v-icon>mdi-link-off</v-icon></v-btn>
          </li>
        </ul>
        <p v-else-if="!loadingPayment" class="terminal-attachments__empty">Aucune commande jointe. Ce paiement peut rester sans pièce jointe.</p>

        <template v-if="canModify">
          <h3 class="terminal-attachments__subtitle">Ajouter des commandes en cours ou archivées</h3>
          <v-text-field v-model="search" outlined dense hide-details clearable class="se-search-field mb-3" placeholder="Rechercher une commande" aria-label="Rechercher une commande à joindre" prepend-inner-icon="mdi-magnify" :disabled="busy" />
          <v-alert v-if="candidatesError" text dense type="error">{{ candidatesError }} <v-btn depressed color="primary" class="se-modal-action se-modal-action--primary" @click="loadCandidates"><v-icon left>mdi-refresh</v-icon>Réessayer</v-btn></v-alert>
          <v-data-table v-model="selectedCandidates" :headers="headers" :items="candidateRows" item-key="sourceKey" selectable-key="isSelectable" show-select :options.sync="candidateOptions" :server-items-length="candidatesTotal" :loading="loadingCandidates" :footer-props="{ 'items-per-page-options': [10, 25, 50], 'items-per-page-text': 'Commandes par page' }" disable-sort no-data-text="Aucune commande correspondante" loading-text="Chargement des commandes…" dense>
            <template #[`header.data-table-select`]="{ props, on }"><v-checkbox :input-value="props.value" :indeterminate="props.indeterminate" :disabled="busy || !hasSelectableCandidates" hide-details dense color="primary" class="terminal-attachments__select" aria-label="Sélectionner les commandes de cette page" @change="on.input($event)" @click.stop /></template>
            <template #[`item.data-table-select`]="{ item, isSelected, select }"><v-checkbox :input-value="isSelected" :disabled="busy || !item.isSelectable" hide-details dense color="primary" class="terminal-attachments__select" :aria-label="`Joindre la commande ${item.orderNumber}`" @change="select($event)" @click.stop /></template>
            <template #[`item.orderNumber`]="{ item }"><strong>#{{ item.orderNumber }}</strong><span v-if="!item.isSelectable" class="text-caption d-block">Déjà jointe</span></template>
            <template #[`item.tableName`]="{ item }">{{ item.tableName || '—' }}</template>
            <template #[`item.orderStatus`]="{ item }"><span>{{ item.archiveId ? 'Archivée' : orderStatusText(item.orderStatus) }}</span></template>
            <template #[`item.amountCents`]="{ item }"><span class="terminal-attachments__money">{{ money(item.amountCents) }}</span></template>
          </v-data-table>
        </template>
      </v-card-text>
      <v-card-actions class="terminal-attachments__actions se-modal-actions">
        <v-btn outlined class="text-none terminal-attachments__touch se-modal-action se-modal-action--secondary" @click="closeDialog">Fermer</v-btn>
        <v-spacer />
        <v-btn v-if="canModify" depressed color="primary" class="text-none terminal-attachments__touch se-modal-action se-modal-action--primary" :loading="busy" :disabled="busy || !selectedCandidates.length || selectedCandidates.length > 50" @click="addSelected"><v-icon left>mdi-link-plus</v-icon>Ajouter {{ selectedCandidates.length || '' }} commande{{ selectedCandidates.length > 1 ? 's' : '' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
const { attemptStorageKey, formatTerminalAmount } = require('@/helpers/standaloneTerminal')
export default {
  props: { value: { type: Boolean, default: false }, paymentId: { type: Number, default: null } },
  data: () => ({
    payment: null, attachments: [], candidates: [], candidatesTotal: 0,
    selectedCandidates: [], search: '', errorMessage: '', candidatesError: '',
    busy: false, loadingPayment: false, loadingCandidates: false,
    detailVersion: 0, candidateVersion: 0, searchTimer: null,
    candidateOptions: { page: 1, itemsPerPage: 10 },
    headers: [{ text: 'Commande', value: 'orderNumber' }, { text: 'Statut', value: 'orderStatus' }, { text: 'Table', value: 'tableName' }, { text: 'Client', value: 'customer' }, { text: 'Montant', value: 'amountCents', align: 'end' }],
  }),
  computed: {
    userScope() { return attemptStorageKey(this.$store.get('users/user')) },
    canModify() { return Boolean(this.payment) },
    hasSelectableCandidates() { return this.candidateRows.some(item => item.isSelectable) },
    candidateRows() {
      const joined = this.joinedSources()
      return this.candidates.map(item => ({ ...item, sourceKey: this.sourceKey(item), isSelectable: !joined.has(this.sourceKey(item)) }))
    },
  },
  watch: {
    value(open) { if (open) this.openDialog(); else this.invalidate() },
    paymentId() { if (this.value) this.openDialog() },
    userScope() { this.closeDialog(); this.payment = null; this.attachments = []; this.candidates = [] },
    search() {
      this.selectedCandidates = []
      this.candidateOptions.page = 1
      this.queueCandidates()
    },
    candidateOptions: { deep: true, handler() { if (this.value) this.queueCandidates() } },
  },
  beforeDestroy() { this.invalidate() },
  methods: {
    sourceKey(item) { return item.archiveId ? `archive:${item.archiveId}` : `order:${item.orderId}` },
    joinedSources() {
      return new Set(this.attachments.flatMap(item => [item.archiveId && `archive:${item.archiveId}`, item.orderId && `order:${item.orderId}`].filter(Boolean)))
    },
    orderStatusText(status) { return ({ 1: 'En attente', 2: 'En préparation', 3: 'Terminée', 4: 'Annulée' })[status] || 'En cours' },
    money(cents) { return `${formatTerminalAmount(cents)} €` },
    invalidate() {
      this.detailVersion += 1
      this.candidateVersion += 1
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = null
      this.busy = false
      this.loadingPayment = false
      this.loadingCandidates = false
    },
    openDialog() {
      this.invalidate()
      this.payment = null
      this.attachments = []
      this.candidates = []
      this.selectedCandidates = []
      this.search = ''
      this.candidateOptions.page = 1
      this.errorMessage = ''
      this.loadPayment()
      this.loadCandidates()
    },
    async loadPayment() {
      const generation = ++this.detailVersion
      const scope = this.userScope
      this.loadingPayment = true
      this.errorMessage = ''
      const result = await this.$store.dispatch('terminalPayments/getAttachments', this.paymentId)
      if (generation !== this.detailVersion || scope !== this.userScope) return
      this.loadingPayment = false
      if (!result) { this.errorMessage = 'Impossible de charger les pièces jointes. Fermez puis réessayez.'; return }
      this.payment = result.payment
      this.attachments = result.attachments
    },
    queueCandidates() {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.candidateVersion += 1
      this.searchTimer = setTimeout(() => { this.searchTimer = null; this.loadCandidates() }, 300)
    },
    async loadCandidates() {
      const generation = ++this.candidateVersion
      const scope = this.userScope
      this.loadingCandidates = true
      this.candidatesError = ''
      const result = await this.$store.dispatch('terminalPayments/searchCandidates', {
        search: this.search || '', page: this.candidateOptions.page, itemsPerPage: this.candidateOptions.itemsPerPage,
      })
      if (generation !== this.candidateVersion || scope !== this.userScope) return
      this.loadingCandidates = false
      if (!result) { this.candidatesError = 'Recherche des commandes indisponible.'; return }
      this.candidates = result.items
      this.candidatesTotal = result.total
    },
    async mutateAttachments(action, payload) {
      if (this.busy || !this.canModify) return
      const generation = ++this.detailVersion
      const scope = this.userScope
      this.busy = true
      this.errorMessage = ''
      const result = await this.$store.dispatch(action, payload)
      if (generation !== this.detailVersion || scope !== this.userScope) return
      this.busy = false
      if (!result) { this.errorMessage = 'Modification impossible. Réessayez ; les pièces jointes déjà enregistrées sont conservées.'; return }
      this.payment = result.payment
      this.attachments = result.attachments
      this.selectedCandidates = []
      this.$emit('changed')
    },
    async addSelected() {
      const joined = this.joinedSources()
      const selected = this.selectedCandidates.filter(item => !joined.has(this.sourceKey(item)))
      const archiveIds = [...new Set(selected.filter(item => item.archiveId).map(item => item.archiveId))]
      const orderIds = [...new Set(selected.filter(item => !item.archiveId).map(item => item.orderId))]
      if (!archiveIds.length && !orderIds.length || archiveIds.length + orderIds.length > 50) return
      await this.mutateAttachments('terminalPayments/addAttachments', { id: this.paymentId, archiveIds, ...(orderIds.length && { orderIds }) })
    },
    async removeAttachment(item) {
      await this.mutateAttachments('terminalPayments/removeAttachment', { id: this.paymentId, ...(item.orderId ? { orderId: item.orderId } : { archiveId: item.archiveId }) })
    },
    closeDialog() { this.invalidate(); this.$emit('input', false) },
  },
}
</script>

<style scoped>
.terminal-attachments__body { padding: 0 24px 16px !important; }
.terminal-attachments__notice { color: var(--se-color-text-muted); line-height: 1.6; margin: 0 0 16px; }
.terminal-attachments__list { list-style: none; padding: 0; margin: 0; }
.terminal-attachments__item { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 6px 0; border-bottom: 1px solid var(--se-color-border-soft); }
.terminal-attachments__item > div { min-width: 0; flex: 1; }
.terminal-attachments__reference { max-width: 100%; }
.terminal-attachments__money { white-space: nowrap; font-variant-numeric: tabular-nums; }
.terminal-attachments__empty { padding: 16px 0; margin: 0; color: var(--se-color-text-muted); }
.terminal-attachments__subtitle { font-size: 1rem; font-weight: 600; margin: 24px 0 12px; color: var(--se-color-text); }
.terminal-attachments__actions { padding: 12px 24px 20px; border-top: 1px solid var(--se-color-border-soft); gap: 8px; }
.terminal-attachments__touch { min-width: 44px !important; min-height: 44px !important; }
.terminal-attachments__select { margin: 0; padding: 0; min-height: 44px; align-items: center; }
.terminal-attachments__touch:focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 2px; }
@media (max-width: 480px) { .terminal-attachments__body { padding-left: 16px !important; padding-right: 16px !important; } .terminal-attachments__actions { padding-left: 16px; padding-right: 16px; } }
</style>
