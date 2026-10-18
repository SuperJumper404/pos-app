<template>
  <section class="courier-payment" aria-label="Paiement">
    <p v-if="mission.paymentStatus === 'paid'">Payee</p>
    <p v-else-if="mission.paymentStatus === 'refunded'">Remboursee</p>
    <p v-else>Reste a payer : <strong>{{ money(mission.remainingDueCents) }}</strong></p>
    <template v-if="canCollect">
      <v-select v-model="method" :items="methods" label="Moyen de paiement" :disabled="blocked" outlined hide-details />
      <p v-if="method === 'external_card'" class="courier-card-note">Carte sur TPE independant : declaration manuelle.</p>
      <v-btn color="primary" class="mt-3" :disabled="blocked || !method" :loading="busy" data-action="collect" @click="collect">
        <v-icon left>mdi-cash-check</v-icon>Confirmer l'encaissement
      </v-btn>
    </template>
  </section>
</template>

<script>
export default {
  props: { mission: { type: Object, required: true } },
  data: () => ({ method: 'cash', methods: [{ text: 'Especes', value: 'cash' }, { text: 'Carte externe (declaration manuelle)', value: 'external_card' }] }),
  computed: {
    busy() { return Boolean(this.$store.state.courier.busy[this.mission.id]) },
    blocked() { return this.busy || Boolean(this.$store.state.courier.pending[this.mission.id]) || Boolean(this.$store.state.courier.recoveryError) },
    canCollect() { return this.mission.deliveryStatus === 'in_transit' && this.mission.acceptanceStatus === 'accepted' &&
      this.mission.paymentStatus === 'unpaid' && this.mission.remainingDueCents > 0 &&
      Number(this.mission.preparationStatus) === 3 && (this.mission.allowedActions || []).includes('collectPayment') },
  },
  methods: {
    money(cents) { return Number.isSafeInteger(cents) ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) : 'Indisponible' },
    collect() { return this.$store.dispatch('courier/collectPayment', { deliveryId: this.mission.id, method: this.method }) },
  },
}
</script>

<style scoped>
.courier-payment { margin-top: 16px; font-variant-numeric: tabular-nums; }
.courier-card-note { margin: 8px 0 0; }
.courier-payment ::v-deep .v-select__selection { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
</style>
