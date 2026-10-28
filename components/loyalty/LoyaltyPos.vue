<template>
  <v-card outlined class="my-3">
    <v-card-title class="subtitle-1"><v-icon left>mdi-card-account-details-outline</v-icon>Fidélité client</v-card-title>
    <v-card-text>
      <v-alert v-if="loyalty.error" type="error" dense text>{{ loyalty.error }}</v-alert>
      <form @submit.prevent="lookup">
        <v-text-field v-model="qr" outlined dense label="Scanner le QR de fidélité" hint="Utilisez votre lecteur QR ou collez l’identifiant de la carte." persistent-hint autocomplete="off" :disabled="loyalty.busy" />
        <v-btn type="submit" outlined class="text-none mt-2" :loading="loyalty.busy" :disabled="!qr.trim()">Retrouver la carte</v-btn>
      </form>
      <template v-if="member">
        <p class="mt-4"><strong>{{ member.program.name }} · {{ member.available }} points disponibles</strong></p>
        <v-btn v-if="!attached" color="primary" class="text-none" :loading="loyalty.busy" @click="attach">Associer à la vente</v-btn>
        <p v-else role="status"><v-icon small color="success">mdi-check</v-icon>Carte associée à cette vente.</p>
        <template v-if="attached">
          <v-select v-model="rewardId" :items="availableRewards" item-text="label" item-value="id" outlined dense class="mt-3" label="Récompense à utiliser" :disabled="loyalty.busy || !!reservation" clearable />
          <v-btn v-if="rewardId && !reservation" outlined class="text-none" :disabled="loyalty.busy" @click="confirming = true">Utiliser cette récompense</v-btn>
          <v-alert v-if="reservation" type="info" text dense class="mt-3">{{ reservation.reward.name }} · {{ reservation.pointsCost }} points réservés. La remise sera vérifiée au paiement.<v-btn text small :loading="loyalty.busy" @click="release">Annuler la récompense</v-btn></v-alert>
        </template>
        <p class="mt-3 mb-0 text--secondary">Le scan ne dépense aucun point. Les points sont crédités après le paiement.</p>
      </template>
    </v-card-text>
    <v-dialog v-model="confirming" max-width="460" :persistent="loyalty.busy">
      <v-card><v-card-title class="subtitle-1">Confirmer l’utilisation des points</v-card-title><v-card-text v-if="chosenReward">Réserver {{ chosenReward.points }} points pour « {{ chosenReward.name }} » sur cette commande ? Les points seront dépensés uniquement après confirmation du paiement.</v-card-text><v-card-actions><v-spacer /><v-btn text :disabled="loyalty.busy" @click="confirming = false">Annuler</v-btn><v-btn color="primary" :loading="loyalty.busy" @click="reserve">Confirmer</v-btn></v-card-actions></v-card>
    </v-dialog>
  </v-card>
</template>
<script>
export default {
  props: { orderId: { type: [Number, String], required: true } },
  data: () => ({ qr: '', member: null, attached: false, rewardId: null, confirming: false, reservation: null, sequence: 0 }),
  computed: {
    loyalty() { return this.$store.state.loyalty },
    staffScope() { const user = this.$store.state.users.user; return JSON.stringify([user.id, user.shopid, user.access, user.module_permissions, user.session_subject]) },
    availableRewards() { return this.member ? this.member.rewards.filter(row => row.available).map(row => ({ ...row, label: `${row.name} · ${row.points} points` })) : [] },
    chosenReward() { return this.availableRewards.find(row => row.id === this.rewardId) },
  },
  watch: { orderId() { this.reset() }, staffScope() { this.reset() } },
  beforeDestroy() { this.sequence++ },
  methods: {
    reset() { this.sequence++; Object.assign(this, { member: null, attached: false, rewardId: null, confirming: false, reservation: null, qr: '' }); this.$store.dispatch('loyalty/reset') },
    async lookup() {
      const sequence = ++this.sequence
      this.attached = false
      this.reservation = null
      const member = await this.$store.dispatch('loyalty/lookup', this.qr.trim())
      if (sequence === this.sequence && !this._isDestroyed) this.member = member
    },
    async attach() {
      const sequence = this.sequence
      const result = await this.$store.dispatch('loyalty/attach', { orderId: this.orderId, qr: this.member.qr })
      if (result && sequence === this.sequence && !this._isDestroyed) {
        this.attached = true
        if (result.status === 'reserved' && result.reward) this.reservation = result
      }
    },
    async reserve() {
      if (!this.confirming || !this.chosenReward) return
      const sequence = this.sequence
      const result = await this.$store.dispatch('loyalty/reserve', { orderId: this.orderId, rewardId: this.rewardId, confirmed: true })
      if (result && sequence === this.sequence && !this._isDestroyed) { this.reservation = result; this.confirming = false; this.$emit('changed') }
    },
    async release() {
      const sequence = this.sequence
      const result = await this.$store.dispatch('loyalty/release', this.orderId)
      if (result && sequence === this.sequence && !this._isDestroyed) { this.reservation = null; this.rewardId = null; this.$emit('changed') }
    },
  },
}
</script>
