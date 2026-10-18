<template>
  <section aria-label="Commandes livraison">
    <div v-if="pendingAttempts.length" class="pending-attempts mb-4" aria-label="Tentatives a verifier">
      <v-btn v-for="attempt in pendingAttempts" :key="attempt.slot" text :disabled="attempt.pending.status === 'sending'" @click="resumeAttempt(attempt)"><v-icon left>mdi-refresh-alert</v-icon>Reprendre : {{ actionLabel(attempt.operation) }} #{{ attempt.deliveryId }}</v-btn>
    </div>
    <v-row dense>
      <v-col cols="12" sm="5"><v-select v-model="filter" :items="filters" label="Etat livraison" outlined dense hide-details /></v-col>
      <v-col cols="12" sm="7"><v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Reference, adresse ou livreur" outlined dense hide-details clearable /></v-col>
    </v-row>
    <p v-if="filter === 'closed'" class="text-caption mt-3">{{ historyLabel }}</p>
    <v-data-table :headers="headers" :items="filteredMissions" :loading="busy" :items-per-page="20" item-key="id" dense class="mt-4" no-data-text="Aucune livraison dans cette vue.">
      <template #[`item.preparationStatus`]="{ item }">{{ preparationLabel(item.preparationStatus) }}</template>
      <template #[`item.paymentStatus`]="{ item }"><span>{{ paymentLabel(item.paymentStatus) }}</span><div v-if="item.remainingDueCents" class="error--text">Du : {{ money(item.remainingDueCents) }}</div></template>
      <template #[`item.deliveryStatus`]="{ item }"><v-chip small :color="item.deliveryStatus === 'issue' ? 'warning' : undefined">{{ statusLabel(item.deliveryStatus) }}</v-chip></template>
      <template #[`item.courierId`]="{ item }">{{ courierName(item.courierId) }}</template>
      <template #[`item.actions`]="{ item }">
        <v-btn icon title="Ouvrir le dossier" aria-label="Ouvrir le dossier" @click="openDetails(item)"><v-icon>mdi-text-box-search-outline</v-icon></v-btn>
        <v-menu offset-y>
          <template #activator="{ on, attrs }"><v-btn icon title="Actions livraison" aria-label="Actions livraison" v-bind="attrs" v-on="on"><v-icon>mdi-dots-vertical</v-icon></v-btn></template>
          <v-list dense><v-list-item v-for="action in actionsFor(item)" :key="action" @click="action === 'refund' ? openRefund(item) : openAction(item, action)"><v-list-item-title>{{ actionLabel(action) }}</v-list-item-title></v-list-item></v-list>
        </v-menu>
      </template>
    </v-data-table>
    <v-dialog v-model="detailsOpen" max-width="640" scrollable>
      <v-card v-if="selected"><v-card-title>{{ currentDelivery.orderReference }}</v-card-title><v-card-text>
        <p>{{ statusLabel(currentDelivery.deliveryStatus) }} / {{ paymentLabel(currentDelivery.paymentStatus) }}</p>
        <address v-if="currentDelivery.addressSnapshot">{{ currentDelivery.addressSnapshot.street }}, {{ currentDelivery.addressSnapshot.postalCode }} {{ currentDelivery.addressSnapshot.city }}<br>{{ currentDelivery.addressSnapshot.complement }}<br>{{ currentDelivery.addressSnapshot.instructions }}</address>
        <p v-if="currentDelivery.contactSnapshot">{{ currentDelivery.contactSnapshot.name }} {{ currentDelivery.contactSnapshot.phone }}</p>
        <v-simple-table dense><tbody><tr v-for="(item, index) in currentDelivery.items || []" :key="index"><td>{{ item.quantity }} x {{ item.name }}<div v-for="(choice, choiceIndex) in item.customizations || []" :key="choiceIndex" class="text-caption">{{ choice.step }} : {{ choice.choice }}</div></td></tr></tbody></v-simple-table>
        <p v-if="currentDelivery.financials" class="mt-4">Total : {{ money(Math.round(currentDelivery.financials.grand_total * 100)) }} / restant du : {{ money(currentDelivery.remainingDueCents) }}</p>
      </v-card-text><v-card-actions><v-spacer /><v-btn text @click="detailsOpen = false">Fermer</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog :value="actionOpen" max-width="560" persistent>
      <v-card><v-card-title>{{ actionLabel(operation) }}</v-card-title><v-card-text>
        <v-alert v-if="operator.error" type="error" text role="alert">{{ operator.error }}</v-alert>
        <p v-if="selected">{{ currentDelivery.orderReference }} / {{ statusLabel(currentDelivery.deliveryStatus) }} / version {{ currentDelivery.version }}</p>
        <v-alert v-if="pending" type="warning" text>{{ pending.status === 'conflict' ? 'Etat serveur relu. Une nouvelle confirmation est requise.' : 'Tentative conservee. La reprise utilise la meme demande.' }}</v-alert>
        <v-select v-if="operation === 'resolveIssue'" v-model="resolutionAction" :items="resolutions" label="Resolution" outlined dense :disabled="locked" />
        <v-select v-if="operation === 'assign' || (operation === 'resolveIssue' && resolutionAction === 'retry')" v-model="courierId" :items="availableCouriers" item-text="username" item-value="id" label="Livreur disponible" outlined dense :disabled="locked" />
        <v-textarea v-if="operation !== 'assign'" v-model="reason" label="Motif" outlined rows="3" maxlength="2000" :disabled="locked" />
        <v-checkbox v-if="operation === 'resolveIssue' && ['return', 'retry'].includes(resolutionAction)" v-model="physicalTransferConfirmed" label="Transfert physique ou retour au restaurant confirme" :disabled="locked" />
        <v-alert v-if="operation === 'correctTerminal'" type="warning" text>Reouverture en probleme avec le contexte conserve dans le journal. Paiement, stock et especes restent a traiter separement.</v-alert>
      </v-card-text><v-card-actions class="flex-wrap"><v-spacer /><v-btn text :disabled="locked" @click="actionOpen = false">Fermer</v-btn><v-btn color="primary" :loading="sending" :disabled="!actionValid || sending || (pending && pending.status === 'conflict' && !pending.reloaded)" @click="confirmAction(Boolean(pending && pending.status === 'conflict'))">{{ pending && pending.status === 'unresolved' ? 'Reprendre la tentative' : pending && pending.status === 'conflict' ? 'Confirmer le nouvel etat' : 'Confirmer' }}</v-btn></v-card-actions></v-card>
    </v-dialog>
    <v-dialog :value="refundOpen" max-width="600" persistent>
      <v-card><v-card-title>Remboursement manuel complet</v-card-title><v-card-text>
        <v-alert v-if="operator.error" type="error" text role="alert">{{ operator.error }}</v-alert>
        <v-progress-linear v-if="refundLoading" indeterminate />
        <v-alert v-if="refundReadFailed && !refundLoading" type="warning" text>Lecture de l'eligibilite indisponible. Aucune nouvelle restitution ne peut etre confirmee.</v-alert>
        <template v-if="refundEligibility && refundEligibility.eligible">
          <p>Montant complet, frais inclus : <strong>{{ money(refundEligibility.amountCents) }}</strong></p>
          <p v-if="refundEligibility.method === 'cash'">Detenteur initial : {{ courierName(refundEligibility.originalCourierId) }}.</p>
          <v-select v-model="returnSource" :items="refundSources" label="Restitution effectuee par" outlined dense :disabled="refundLocked" />
          <p v-if="returnSource === 'register'">Une restitution par la caisse laisse la detention d'especes du livreur initial inchangee.</p>
          <p v-if="returnSource === 'courier'">La restitution reduit uniquement les especes encore detenues par le livreur initial.</p>
          <v-textarea v-model="reason" label="Motif du remboursement" rows="3" outlined maxlength="2000" :disabled="refundLocked" />
          <v-checkbox v-model="refundConfirmed" :label="refundDeclaration" :disabled="refundLocked" />
        </template>
        <v-alert v-else-if="!refundLoading && !refundReadFailed && !refundResult" type="warning" text>Le paiement actuel n'est pas eligible au remboursement manuel complet.</v-alert>
        <v-alert v-if="refundPending" type="warning" text>{{ refundPending.status === 'conflict' ? 'Paiement et solde relus. Verifiez la source puis confirmez a nouveau.' : 'Resultat inconnu. Reprenez la meme tentative avant toute autre restitution.' }}</v-alert>
        <v-alert v-if="refundResult" type="success" text>Restitution enregistree : {{ money(refundResult.amountCents) }}. Declaration restaurant.</v-alert>
        <template v-if="refundResult && refundResult.method === 'cash'">
          <p v-if="refundResult.returnSource === 'register'">Restitution par la caisse : detention du livreur initial inchangee.</p>
          <p v-else>Restitution par le livreur initial enregistree.</p>
          <p v-if="refundResult.originalHolderBalance" role="status">Solde restant du detenteur initial {{ courierName(refundResult.originalCourierId) }} : <strong>{{ money(refundResult.originalHolderBalance.remainingDueCents) }}</strong></p>
          <v-alert v-else type="warning" text>Solde du detenteur initial indisponible. Verifiez son solde avant toute autre operation.</v-alert>
        </template>
      </v-card-text><v-card-actions class="flex-wrap"><v-spacer /><v-btn text :disabled="refundLocked" @click="refundOpen = false">Fermer</v-btn><v-btn v-if="!refundResult" color="primary" :loading="refundSending" :disabled="!refundValid || refundSending || (refundPending && refundPending.status === 'conflict' && !refundPending.reloaded)" @click="confirmRefund(Boolean(refundPending && refundPending.status === 'conflict'))">{{ refundLocked ? 'Reprendre la tentative' : refundPending ? 'Confirmer a nouveau' : 'Confirmer la restitution' }}</v-btn></v-card-actions></v-card>
    </v-dialog>
  </section>
</template>

<script>
import { operatorIdentity } from '@/store/delivery'
const { v4: refundReadKey } = require('uuid')
const { isDeliveryAdmin } = require('@/helpers/staffRoles')
export default {
  data: () => ({ filter: 'operational', search: '', selected: null, operation: '', actionOpen: false, detailsOpen: false,
    courierId: null, reason: '', resolutionAction: 'resume', physicalTransferConfirmed: false,
    refundOpen: false, refundLoading: false, refundReadId: null, refundReadFailed: false, returnSource: null, refundConfirmed: false, refundResult: null,
    historyLabel: 'Historique recent : jusqu\'a 100 dossiers termines, classes par creation.',
    filters: [{ text: 'Toutes les missions actives', value: 'operational' }, { text: 'A attribuer', value: 'unassigned' },
      { text: 'Attribuees / en cours', value: 'ongoing' }, { text: 'Problemes', value: 'issue' }, { text: 'Terminees recentes', value: 'closed' }],
    headers: [{ text: 'Commande', value: 'orderReference' }, { text: 'Preparation', value: 'preparationStatus' }, { text: 'Paiement', value: 'paymentStatus' },
      { text: 'Livraison', value: 'deliveryStatus' }, { text: 'Livreur', value: 'courierId' }, { text: 'Actions', value: 'actions', sortable: false }],
    resolutions: [{ text: 'Reprendre', value: 'resume' }, { text: 'Nouvelle tentative', value: 'retry' }, { text: 'Retour restaurant', value: 'return' },
      { text: 'Clore en echec', value: 'fail' }, { text: 'Annuler la livraison', value: 'cancel' }, { text: 'Livree avec impaye', value: 'confirm_unpaid_delivery' }] }),
  computed: {
    identity() { return operatorIdentity(this.$store.state) },
    operator() { return this.$store.state.delivery.operator },
    pendingAttempts() {
      return Object.entries(this.operator.pending).filter(([slot, pending]) => pending && /^(assign|reportIssue|resolveIssue|correctTerminal|refund):/.test(slot))
        .map(([slot, pending]) => ({ slot, pending, operation: slot.split(':')[0], deliveryId: slot.split(':')[1] }))
        .filter(attempt => attempt.operation !== 'correctTerminal' || isDeliveryAdmin(this.$store.state.users.user))
    },
    busy() { return this.operator.loading > 0 },
    filteredMissions() {
      const query = (this.search || '').toLocaleLowerCase()
      return this.operator.missions.filter(row => {
        const terminal = ['delivered', 'failed', 'canceled'].includes(row.deliveryStatus)
        const status = this.filter === 'operational' ? !terminal : this.filter === 'closed' ? terminal
          : this.filter === 'ongoing' ? ['assigned', 'in_transit'].includes(row.deliveryStatus) : row.deliveryStatus === this.filter
        return status && `${row.orderReference} ${this.courierName(row.courierId)} ${row.addressSnapshot && row.addressSnapshot.street || ''}`.toLocaleLowerCase().includes(query)
      })
    },
    availableCouriers() { return this.operator.couriers.filter(row => Number(row.status) === 1 && Number(row.available) === 1) },
    currentDelivery() { return this.operator.identity === this.identity ? this.operator.missions.find(row => this.selected && row.id === this.selected.id) || this.selected || {} : {} },
    pending() { return this.selected && this.operator.pending[`${this.operation}:${this.selected.id}`] },
    locked() { return Boolean(this.pending && ['sending', 'unresolved'].includes(this.pending.status)) },
    sending() { return Boolean(this.pending && this.pending.status === 'sending') },
    actionValid() { return this.locked || (this.operation === 'assign' ? Number.isSafeInteger(this.courierId) : this.reason.trim().length > 0) },
    refundEligibility() {
      const check = this.selected && this.operator.eligibilityChecks[this.selected.id]
      return this.operator.identity === this.identity && check && check.status === 'ready' && check.confirmationId === this.refundReadId ? this.operator.eligibility[this.selected.id] : null
    },
    refundPending() { return this.selected && this.operator.pending[`refund:${this.selected.id}`] },
    refundLocked() { return Boolean(this.refundPending && ['sending', 'unresolved'].includes(this.refundPending.status)) },
    refundSending() { return Boolean(this.refundPending && this.refundPending.status === 'sending') },
    refundValid() { return this.refundLocked || Boolean(this.refundOpen && !this.refundLoading && !this.refundReadFailed && this.refundEligibility && this.refundEligibility.eligible && this.returnSource && this.reason.trim() && this.refundConfirmed) },
    refundSources() { return (this.refundEligibility && this.refundEligibility.returnSources || []).map(value => ({ value, text: { register: 'Caisse du restaurant', courier: 'Livreur detenteur initial', external_card: 'TPE independant' }[value] })) },
    refundDeclaration() { return this.refundEligibility && this.refundEligibility.method === 'external_card'
      ? 'Je declare le remboursement complet effectue sur le TPE independant. Aucune verification Stripe.'
      : 'Je confirme que la totalite des especes a ete restituee au client par la source selectionnee.' },
  },
  watch: { identity() { this.resetPrivateState() } },
  beforeDestroy() { this.resetPrivateState() },
  methods: {
    resetPrivateState() { Object.assign(this.$data, this.$options.data.call(this)) },
    currentIdentity(identity) { return !this._isDestroyed && identity === this.identity },
    money(cents) { return ((cents || 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) },
    courierName(id) { const row = [...this.operator.couriers, ...this.operator.holders].find(row => row.id === id); return row ? row.username : id ? `Livreur #${id}` : 'Non attribuee' },
    preparationLabel(value) { return { 0: 'Recue', 1: 'Recue', 2: 'En preparation', 3: 'Prete' }[value] || String(value) },
    paymentLabel(value) { return { paid: 'Payee', unpaid: 'Impayee', refunded: 'Remboursee', requires_payment: 'Paiement en attente', pending: 'Paiement en attente' }[value] || value },
    statusLabel(value) { return { unassigned: 'A attribuer', assigned: 'Attribuee', in_transit: 'En livraison', issue: 'Probleme', delivered: 'Livree', failed: 'Echec', canceled: 'Annulee' }[value] || value },
    actionLabel(value) { return { assign: 'Attribuer / reattribuer', reportIssue: 'Signaler un probleme', resolveIssue: 'Resoudre le probleme', correctTerminal: 'Corriger une erreur terminale', refund: 'Remboursement manuel complet' }[value] || '' },
    actionsFor(item) {
      return [...new Set([...(item.allowedActions || []), ...(isDeliveryAdmin(this.$store.state.users.user) && ['delivered', 'failed', 'canceled'].includes(item.deliveryStatus) ? ['correctTerminal'] : []), ...(item.paymentStatus === 'paid' ? ['refund'] : []),
        ...this.pendingAttempts.filter(attempt => attempt.deliveryId === item.id).map(attempt => attempt.operation)])]
    },
    async resumeAttempt(attempt) {
      const identity = this.identity
      const item = await this.$store.dispatch('delivery/operatorLoad', { resource: 'detail', deliveryId: attempt.deliveryId })
      if (!this.currentIdentity(identity)) return
      const selected = item || { id: attempt.deliveryId, orderReference: `#${attempt.deliveryId}` }
      if (attempt.operation === 'refund') await this.openRefund(selected)
      else this.openAction(selected, attempt.operation)
    },
    async openDetails(item) { this.selected = item; this.detailsOpen = true; await this.$store.dispatch('delivery/operatorLoad', { resource: 'detail', deliveryId: item.id }) },
    openAction(item, operation) {
      this.selected = item; this.operation = operation; this.courierId = item.courierId; this.reason = ''; this.resolutionAction = 'resume'; this.physicalTransferConfirmed = false; this.actionOpen = true
    },
    async confirmAction(reconfirm = false) {
      if (!this.selected || !this.actionValid) return
      const identity = this.identity
      const result = await this.$store.dispatch('delivery/operatorCommand', { operation: this.operation, deliveryId: this.selected.id,
        courierId: this.courierId, reason: this.reason, action: this.resolutionAction, physicalTransferConfirmed: this.physicalTransferConfirmed, reconfirm })
      if (result && this.currentIdentity(identity)) this.actionOpen = false
    },
    async openRefund(item) {
      const identity = this.identity
      const readId = refundReadKey()
      this.selected = item; this.refundOpen = true; this.reason = ''; this.returnSource = null; this.refundConfirmed = false; this.refundResult = null; this.refundLoading = true; this.refundReadFailed = false; this.refundReadId = readId
      const result = await this.$store.dispatch('delivery/operatorLoad', { resource: 'eligibility', deliveryId: item.id, confirmationId: readId })
      if (!this.currentIdentity(identity) || this.refundReadId !== readId || !this.refundOpen) return
      if (result && result.eligible && result.returnSources.length === 1) this.returnSource = result.returnSources[0]
      this.refundReadFailed = !result
      this.refundLoading = false
    },
    async confirmRefund(reconfirm = false) {
      if (!this.selected || !this.refundValid) return
      const identity = this.identity
      const result = await this.$store.dispatch('delivery/operatorCommand', { operation: 'refund', deliveryId: this.selected.id, returnSource: this.returnSource, reason: this.reason, reconfirm, eligibilityReadId: this.refundReadId })
      if (this.currentIdentity(identity)) this.refundResult = result
    },
  },
}
</script>

<style scoped>
address { font-style: normal; overflow-wrap: anywhere; }
.pending-attempts { display: flex; flex-wrap: wrap; gap: 8px; }
.pending-attempts .v-btn { max-width: 100%; height: auto; min-height: 44px; }
.pending-attempts ::v-deep .v-btn__content { white-space: normal; overflow-wrap: anywhere; }
::v-deep .v-data-table__wrapper { overflow-x: auto; }
::v-deep td { overflow-wrap: anywhere; }
</style>
