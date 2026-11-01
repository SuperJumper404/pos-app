<template>
  <section class="loyalty-kiosk py-4" aria-label="Ma fidélité">
    <h2 class="subtitle-1 font-weight-bold mb-3">Ma fidélité</h2>
    <v-alert v-if="error" type="warning" text dense role="alert">{{ error }}</v-alert>
    <form v-if="!member" @submit.prevent="lookup">
      <v-select v-model="kind" :items="searchModes" outlined dense label="Retrouver ma carte avec" :disabled="disabled || busy" />
      <v-text-field v-model="value" outlined :type="kind === 'phone' ? 'tel' : 'text'" inputmode="numeric" :label="kind === 'phone' ? 'Numéro de téléphone' : 'Numéro de carte'" maxlength="32" autocomplete="off" :disabled="disabled || busy" />
      <v-btn type="submit" outlined block large class="text-none" :disabled="disabled || !value.trim()" :loading="busy">Retrouver ma carte</v-btn>
      <p class="text-body-2 text--secondary mt-3 mb-0">Pas encore adhérent ? Rejoignez le programme sur votre téléphone en scannant le QR de votre table.</p>
    </form>
    <template v-else>
      <div class="d-flex align-center justify-space-between mb-2">
        <div><strong>{{ member.available }} points disponibles</strong><div class="text-body-2 text--secondary">Carte {{ member.cardNumber }}</div></div>
        <v-btn text small class="text-none" :disabled="disabled || busy" @click="reset()">Changer</v-btn>
      </div>
      <p class="text-body-2">Vous cumulerez des points après le paiement de cette commande.</p>
      <v-select v-if="availableRewards.length" v-model="rewardId" :items="availableRewards" item-text="label" item-value="id" outlined label="Utiliser une récompense" clearable :disabled="disabled || busy" @change="previewReward" />
      <v-alert v-if="confirmed" type="success" text dense role="status">Récompense choisie : {{ money(quote.discountCents) }} de remise.<v-btn text small :disabled="disabled || busy" @click="removeReward">Retirer</v-btn></v-alert>
    </template>
    <v-dialog v-model="confirming" max-width="460" :persistent="busy || disabled">
      <v-card>
        <v-card-title class="subtitle-1 se-modal-title">Utiliser mes points</v-card-title>
        <v-card-text v-if="quote">Utiliser {{ quote.pointsCost }} points pour une remise de {{ money(quote.discountCents) }} ? Le total à payer sera de {{ money(quote.totalCents) }}.</v-card-text>
        <v-card-actions><v-spacer /><v-btn text class="text-none" @click="confirming = false">Annuler</v-btn><v-btn color="primary" class="text-none" :disabled="disabled || busy" @click="confirmReward">Confirmer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<script>
const { buildCheckoutItems } = require('@/helpers/customizations')
export default {
  props: {
    servicePointId: { type: [Number, String], required: true }, items: { type: Array, required: true },
    isTakeaway: { type: Boolean, default: false }, grossTotal: { type: Number, required: true },
    disabled: { type: Boolean, default: false }, attemptKey: { type: [Number, String], default: 0 },
  },
  data: () => ({ kind: 'phone', value: '', member: null, rewardId: null, quote: null, confirmed: false, confirming: false, busy: false, error: '', sequence: 0, idleTimer: null,
    searchModes: [{ text: 'Téléphone', value: 'phone' }, { text: 'Numéro de carte', value: 'card' }] }),
  computed: {
    availableRewards() { return this.member ? (this.member.rewards || []).filter(row => row.available).map(row => ({ ...row, label: `${row.name} · ${row.points} points` })) : [] },
    basketKey() { return JSON.stringify([this.servicePointId, this.isTakeaway, this.grossTotal, this.items]) },
  },
  watch: {
    attemptKey() { this.reset() },
    basketKey() { this.reset() },
    disabled(value) { if (value) clearTimeout(this.idleTimer); else this.touch() },
  },
  mounted() { document.addEventListener('pointerdown', this.touch); document.addEventListener('keydown', this.touch); this.touch() },
  beforeDestroy() { this.sequence++; clearTimeout(this.idleTimer); document.removeEventListener('pointerdown', this.touch); document.removeEventListener('keydown', this.touch) },
  methods: {
    money(cents) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) },
    touch() { clearTimeout(this.idleTimer); if (!this.disabled) this.idleTimer = setTimeout(() => { this.reset(); this.$emit('idle') }, 120000) },
    reset(clearInput = true) {
      this.sequence++; this.member = null; this.rewardId = null; this.quote = null; this.confirmed = false; this.confirming = false; this.busy = false; this.error = ''
      if (clearInput) this.value = ''
      this.$emit('change', null); this.$emit('busy', false)
    },
    emitSelection() {
      this.$emit('change', this.member ? { memberId: this.member.id, cardNumber: this.member.cardNumber, rewardId: this.confirmed ? this.rewardId : null,
        confirmed: this.confirmed, expectedDiscountCents: this.confirmed ? this.quote.discountCents : 0,
        totalCents: this.confirmed ? this.quote.totalCents : Math.round(this.grossTotal * 100) } : null)
    },
    async lookup() {
      if (this.disabled || this.busy || !this.value.trim()) return
      const input = { kind: this.kind, value: this.value.trim(), countryCode: 'FR', servicePointId: this.servicePointId }
      this.reset(false)
      const sequence = this.sequence
      this.busy = true; this.$emit('busy', true)
      try {
        const member = await this.$store.dispatch('loyalty/lookupKiosk', input)
        if (sequence !== this.sequence || this._isDestroyed) return
        this.member = member; this.emitSelection()
        if (!member) this.error = 'Aucune carte trouvée. Vous pouvez continuer sans fidélité.'
      } catch (error) { if (sequence === this.sequence) this.error = error.message }
      finally { if (sequence === this.sequence) { this.busy = false; this.$emit('busy', false) } }
    },
    async previewReward() {
      this.confirmed = false; this.quote = null; this.confirming = false; this.emitSelection()
      if (!this.rewardId || !this.member || this.disabled) return
      const sequence = ++this.sequence
      this.busy = true; this.error = ''; this.$emit('busy', true)
      try {
        const quote = await this.$store.dispatch('loyalty/previewKiosk', { memberId: this.member.id, rewardId: this.rewardId, items: buildCheckoutItems(this.items),
          isTakeaway: this.isTakeaway, expectedTotal: this.grossTotal, servicePointId: this.servicePointId })
        if (sequence !== this.sequence || this._isDestroyed) return
        this.quote = quote; this.confirming = !!quote
      } catch (error) { if (sequence === this.sequence) this.error = error.message }
      finally { if (sequence === this.sequence) { this.busy = false; this.$emit('busy', false) } }
    },
    confirmReward() { if (!this.quote || this.disabled || this.busy) return; this.confirmed = true; this.confirming = false; this.emitSelection() },
    removeReward() { this.rewardId = null; this.quote = null; this.confirmed = false; this.confirming = false; this.emitSelection() },
  },
}
</script>
