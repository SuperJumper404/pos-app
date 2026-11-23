<template>
  <section class="courier-payment" aria-label="Paiement">
    <p v-if="mission.paymentStatus === 'paid'" role="status">Payée</p>
    <p v-else-if="mission.paymentStatus === 'refunded'">Remboursée</p>
    <p v-else>Reste à payer <strong>{{ money(mission.remainingDueCents) }}</strong></p>
    <template v-if="canCheckOnline">
      <v-alert v-if="error" type="error" text dense role="alert">{{ error }}</v-alert>
      <template v-if="activePayment">
        <div v-if="online.url" class="courier-qr">
          <p>Le client scanne le code et choisit Apple Pay sur un appareil compatible, ou règle par carte.</p>
          <div class="courier-qr-code" role="img" aria-label="QR code de paiement de la livraison">
            <QrCode :text="online.url" :size="288" error-level="M" />
          </div>
        </div>
        <p v-if="online.method === 'terminal'" role="status">
          {{ online.status === 'creating' ? 'Préparation du paiement sur le TPE.' : 'Présentez la carte sur le TPE et attendez la confirmation.' }}
        </p>
        <p v-else role="status">En attente de la confirmation Stripe.</p>
        <div class="courier-payment-actions">
          <v-btn v-if="online.status === 'creating'" outlined :disabled="blocked" @click="changePayment('start', 'terminal')">Reprendre sur le TPE</v-btn>
          <v-btn text :disabled="busy" @click="changePayment('cancel', online.method)">Annuler le paiement</v-btn>
        </div>
      </template>
      <v-btn v-else-if="needsCheck" outlined :disabled="busy" @click="changePayment('read')">Vérifier le paiement</v-btn>
      <template v-else-if="canCollect">
        <v-select v-model="method" :items="methods" label="Moyen de paiement" :disabled="blocked" outlined hide-details />
        <p v-if="method === 'external_card'" class="courier-card-note">Carte sur TPE indépendant, avec confirmation manuelle.</p>
        <v-btn color="primary" class="mt-3" :disabled="blocked || !method" :loading="busy" data-action="collect" @click="collect">
          <v-icon left>{{ actionIcon }}</v-icon>{{ actionLabel }}
        </v-btn>
      </template>
    </template>
  </section>
</template>

<script>
export default {
  components: { QrCode: () => import('vue-qrcode-component/src/QRCode.vue') },
  props: { mission: { type: Object, required: true }, hasTerminal: Boolean },
  data: () => ({ method: 'cash', online: null, error: '', needsCheck: false, poll: null }),
  computed: {
    busy() { return Boolean(this.$store.state.courier.busy[this.mission.id]) },
    blocked() { return this.busy || Boolean(this.$store.state.courier.pending[this.mission.id]) || Boolean(this.$store.state.courier.recoveryError) },
    methods() {
      return [
        { text: 'Espèces', value: 'cash' },
        ...(this.hasTerminal ? [{ text: 'Carte sur TPE Stripe', value: 'terminal' }] : []),
        { text: 'QR code · Apple Pay ou carte', value: 'qr' },
        { text: 'Carte externe (déclaration manuelle)', value: 'external_card' },
      ]
    },
    canCheckOnline() {
      return this.mission.deliveryStatus === 'in_transit' && ['unpaid', 'requires_payment'].includes(this.mission.paymentStatus) &&
        this.mission.remainingDueCents > 0 && Number(this.mission.preparationStatus) === 3
    },
    canCollect() {
      return this.canCheckOnline && this.mission.acceptanceStatus === 'accepted' &&
        this.mission.paymentStatus === 'unpaid' && (this.mission.allowedActions || []).includes('collectPayment')
    },
    activePayment() { return this.online && ['pending', 'processing', 'creating'].includes(this.online.status) },
    actionIcon() { return { qr: 'mdi-qrcode', terminal: 'mdi-contactless-payment' }[this.method] || 'mdi-cash-check' },
    actionLabel() { return { qr: 'Afficher le QR code', terminal: 'Encaisser sur le TPE' }[this.method] || "Confirmer l'encaissement" },
  },
  watch: {
    hasTerminal(assigned) {
      if (!assigned && this.method === 'terminal') this.method = 'cash'
    },
    canCheckOnline(ready) {
      if (ready) this.changePayment('read')
      else { clearTimeout(this.poll); this.online = null }
    },
  },
  mounted() { if (this.canCheckOnline) this.changePayment('read') },
  beforeDestroy() { clearTimeout(this.poll) },
  methods: {
    money(cents) { return Number.isSafeInteger(cents) ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) : 'Indisponible' },
    collect() {
      if (['qr', 'terminal'].includes(this.method)) return this.changePayment('start', this.method)
      return this.$store.dispatch('courier/collectPayment', { deliveryId: this.mission.id, method: this.method })
    },
    async changePayment(action, method) {
      clearTimeout(this.poll)
      try {
        const result = await this.$store.dispatch('courier/onlinePayment', {
          deliveryId: this.mission.id, action, method, attemptId: this.online?.attemptId,
        })
        if (!result || this._isDestroyed) return
        this.online = result
        this.needsCheck = false
        this.error = result.status === 'failed' ? result.message || 'Paiement refusé. Réessayez.' : ''
      } catch (error) {
        if (this._isDestroyed) return
        this.error = error.message
        this.needsCheck = Boolean(this.activePayment || this.needsCheck || this.mission.paymentStatus === 'requires_payment' ||
          (action === 'start' && (error.uncertain || method === 'terminal')))
      } finally {
        if (!this._isDestroyed && this.canCheckOnline && this.activePayment) {
          this.poll = setTimeout(() => this.changePayment('read'), 4000)
        }
      }
    },
  },
}
</script>

<style scoped>
.courier-payment { margin-top: 16px; font-variant-numeric: tabular-nums; }
.courier-card-note { margin: 8px 0 0; }
.courier-payment-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.courier-qr-code { width: min(100%, 312px); margin: 0 auto 16px; padding: 12px; background: #fff; }
.courier-qr-code ::v-deep canvas,
.courier-qr-code ::v-deep img { display: block; max-width: 100%; height: auto; }
.courier-payment ::v-deep .v-select__selection { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
</style>
