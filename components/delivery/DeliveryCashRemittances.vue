<template>
  <section aria-label="Remises d'especes">
    <v-select :value="courierId" :items="holders" item-text="username" item-value="id" label="Detenteur des fonds" outlined dense :disabled="sending" @change="selectHolder" />
    <v-alert v-if="balanceError" type="error" text>{{ balanceError }}</v-alert>
    <template v-if="balance">
      <dl class="cash-summary">
        <div><dt>Especes encaissees</dt><dd>{{ money(balance.collectedCents) }}</dd></div>
        <div><dt>Remises recues</dt><dd>{{ money(balance.receivedCents) }}</dd></div>
        <div><dt>Solde attendu actuel</dt><dd>{{ money(balance.remainingDueCents) }}</dd></div>
        <div><dt>Ecarts cumules</dt><dd>{{ money(balance.discrepancyCents) }}</dd></div>
        <div><dt>Excedent a rapprocher</dt><dd>{{ money(balance.surplusCents) }}</dd></div>
      </dl>
      <v-form class="cash-receipt" @submit.prevent="confirmRemittance(Boolean(pending && pending.status === 'conflict'))">
        <v-text-field v-model="received" label="Especes reellement recues (EUR)" inputmode="decimal" outlined dense :disabled="locked" />
        <v-btn type="submit" color="primary" :loading="sending" :disabled="!remittanceValid || sending || (pending && pending.status === 'conflict' && !pending.reloaded)"><v-icon left>mdi-cash-check</v-icon>{{ locked ? 'Reprendre la tentative' : pending ? 'Confirmer le nouvel attendu' : 'Confirmer la remise' }}</v-btn>
      </v-form>
      <v-alert v-if="pending" type="warning" text>{{ pending.status === 'conflict' ? 'Le solde serveur a ete relu. Verifiez l\'attendu actuel avant une nouvelle confirmation.' : 'Confirmation inconnue : la meme demande est conservee. Verifiez son resultat avant une nouvelle remise.' }}</v-alert>
      <v-alert v-if="result" type="success" text role="status"><div>Remise #{{ result.remittanceId }}</div><div>Attendu : {{ money(result.expectedCents) }} / recu : {{ money(result.receivedCents) }}</div><div>Ecart : {{ money(result.discrepancyCents) }} / nouveau solde : {{ money(result.remainingDueCents) }}</div></v-alert>
      <h2 class="mt-6 mb-3">Remises confirmees</h2>
      <v-data-table :headers="remittanceHeaders" :items="balance.remittances" item-key="remittanceId" dense :items-per-page="10" no-data-text="Aucune remise confirmee.">
        <template #[`item.expectedCents`]="{ item }">{{ money(item.expectedCents) }}</template><template #[`item.receivedCents`]="{ item }">{{ money(item.receivedCents) }}</template><template #[`item.discrepancyCents`]="{ item }">{{ money(item.discrepancyCents) }}</template>
      </v-data-table>
      <h2 class="mt-6 mb-3">Encaissements et solde par source</h2>
      <v-data-table :headers="sourceHeaders" :items="balance.collections" item-key="collectionId" dense :items-per-page="10" no-data-text="Aucune source d'especes.">
        <template #[`item.collectedCents`]="{ item }">{{ money(item.collectedCents) }}</template><template #[`item.allocatedCents`]="{ item }">{{ money(item.allocatedCents) }}</template><template #[`item.refundedCents`]="{ item }">{{ money(item.refundedCents) }}</template><template #[`item.remainingDueCents`]="{ item }">{{ money(item.remainingDueCents) }}</template>
      </v-data-table>
      <h2 class="mt-6 mb-3">Regularisations</h2>
      <v-data-table :headers="adjustmentHeaders" :items="balance.adjustments" item-key="adjustmentId" dense :items-per-page="10" no-data-text="Aucune regularisation."><template #[`item.deltaDueCents`]="{ item }">{{ money(item.deltaDueCents) }}</template></v-data-table>
      <v-expansion-panels v-if="admin" flat class="mt-3"><v-expansion-panel><v-expansion-panel-header>Regularisation administrative</v-expansion-panel-header><v-expansion-panel-content>
        <v-select v-model="collectionId" :items="collectionOptions" label="Encaissement source" outlined dense clearable :disabled="adjustLocked" />
        <v-select v-model="remittanceId" :items="remittanceOptions" label="Remise source" outlined dense clearable :disabled="adjustLocked" />
        <v-text-field v-model="delta" label="Variation du solde du (+ / - EUR)" inputmode="decimal" outlined dense :disabled="adjustLocked" />
        <v-textarea v-model="reason" label="Motif de regularisation" rows="2" outlined maxlength="2000" :disabled="adjustLocked" />
        <v-alert v-if="adjustPending" type="warning" text>Une tentative est conservee. Verifiez le solde serveur avant de confirmer.</v-alert>
        <v-btn color="primary" :disabled="!adjustValid || adjustSending || (adjustPending && adjustPending.status === 'conflict' && !adjustPending.reloaded)" :loading="adjustSending" @click="confirmAdjustment(Boolean(adjustPending && adjustPending.status === 'conflict'))">{{ adjustLocked ? 'Reprendre la tentative' : 'Confirmer la regularisation' }}</v-btn>
      </v-expansion-panel-content></v-expansion-panel></v-expansion-panels>
      <h2 class="mt-6 mb-3">Restitutions confirmees</h2>
      <v-data-table :headers="refundHeaders" :items="balance.refunds" item-key="refundId" dense :items-per-page="10" no-data-text="Aucune restitution confirmee."><template #[`item.amountCents`]="{ item }">{{ money(item.amountCents) }}</template><template #[`item.dueReductionCents`]="{ item }">{{ money(item.dueReductionCents) }}</template></v-data-table>
    </template>
    <v-progress-linear v-else-if="busy" indeterminate />
  </section>
</template>

<script>
const { isDeliveryAdmin } = require('@/helpers/staffRoles')
const parseAmount = value => {
  const text = String(value).trim().replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.replace('-', '').split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents * (text.startsWith('-') ? -1 : 1) : null
}
export default {
  data: () => ({ courierId: null, received: '', result: null, balanceError: '', collectionId: null, remittanceId: null, delta: '', reason: '',
    remittanceHeaders: [{ text: 'Date UTC', value: 'createdAt' }, { text: 'Remise', value: 'remittanceId' }, { text: 'Attendu', value: 'expectedCents' }, { text: 'Recu', value: 'receivedCents' }, { text: 'Ecart', value: 'discrepancyCents' }],
    sourceHeaders: [{ text: 'Encaissement', value: 'collectionId' }, { text: 'Encaisse', value: 'collectedCents' }, { text: 'Affecte aux remises', value: 'allocatedCents' }, { text: 'Restitue par le livreur', value: 'refundedCents' }, { text: 'Solde du', value: 'remainingDueCents' }],
    adjustmentHeaders: [{ text: 'Date UTC', value: 'createdAt' }, { text: 'Source encaissement', value: 'collectionId' }, { text: 'Source remise', value: 'remittanceId' }, { text: 'Variation', value: 'deltaDueCents' }, { text: 'Motif', value: 'reason' }],
    refundHeaders: [{ text: 'Date UTC', value: 'createdAt' }, { text: 'Restitution', value: 'refundId' }, { text: 'Source', value: 'returnSource' }, { text: 'Montant', value: 'amountCents' }, { text: 'Reduction du solde', value: 'dueReductionCents' }] }),
  computed: {
    operator() { return this.$store.state.delivery.operator },
    admin() { return isDeliveryAdmin(this.$store.state.users.user) },
    busy() { return this.operator.loading > 0 },
    holders() { return this.operator.holders },
    balance() { return this.operator.balances[this.courierId] },
    pending() { return this.operator.pending[`remit:${this.courierId}`] },
    locked() { return Boolean(this.pending && ['sending', 'unresolved'].includes(this.pending.status)) },
    sending() { return Boolean(this.pending && this.pending.status === 'sending') },
    remittanceValid() { const amount = parseAmount(this.received); return this.locked || Boolean(this.balance && this.balance.remainingDueCents > 0 && amount !== null && amount >= 0 && Number(this.$store.state.users.user.id) !== this.courierId) },
    collectionOptions() { return (this.balance && this.balance.collections || []).map(row => ({ text: `#${row.collectionId} / ${this.money(row.remainingDueCents)}`, value: row.collectionId })) },
    remittanceOptions() { return (this.balance && this.balance.remittances || []).map(row => ({ text: `#${row.remittanceId} / ${this.money(row.receivedCents)}`, value: row.remittanceId })) },
    adjustPending() { return this.operator.pending[`adjust:${this.courierId}`] },
    adjustLocked() { return Boolean(this.adjustPending && ['sending', 'unresolved'].includes(this.adjustPending.status)) },
    adjustSending() { return Boolean(this.adjustPending && this.adjustPending.status === 'sending') },
    adjustValid() { return this.adjustLocked || Boolean(this.admin && this.reason.trim() && (this.collectionId || this.remittanceId) && parseAmount(this.delta)) },
  },
  methods: {
    money(cents) { return ((cents || 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) },
    async selectHolder(courierId) {
      this.courierId = courierId; this.received = ''; this.result = null; this.balanceError = ''; this.collectionId = null; this.remittanceId = null; this.delta = ''; this.reason = ''
      const result = await this.$store.dispatch('delivery/operatorLoad', { resource: 'balance', courierId })
      if (!result) this.balanceError = 'Solde indisponible. Actualisez avant toute remise.'
    },
    async confirmRemittance(reconfirm = false) {
      if (!this.remittanceValid) return
      this.result = await this.$store.dispatch('delivery/operatorCommand', { operation: 'remit', courierId: this.courierId, receivedCents: parseAmount(this.received), reconfirm })
    },
    async confirmAdjustment(reconfirm = false) {
      if (!this.admin || !this.adjustValid) return
      const result = await this.$store.dispatch('delivery/operatorCommand', { operation: 'adjust', courierId: this.courierId, collectionId: this.collectionId,
        remittanceId: this.remittanceId, deltaDueCents: parseAmount(this.delta), reason: this.reason, reconfirm })
      if (result) { this.delta = ''; this.reason = '' }
    },
  },
}
</script>

<style scoped>
h2 { font-size: 18px; font-weight: 600; }
.cash-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 16px 0 24px; }
.cash-summary dd { margin: 6px 0 0; font-weight: 600; font-size: 18px; font-variant-numeric: tabular-nums; }
.cash-receipt { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.cash-receipt .v-input { max-width: 320px; flex: 1 1 220px; }
.cash-receipt .v-btn { height: auto; min-height: 44px; white-space: normal; }
::v-deep .v-btn__content { white-space: normal; }
</style>
