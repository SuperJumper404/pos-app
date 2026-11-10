<template>
  <section class="pa-3 mb-3" aria-label="Fidélité de cette commande">
    <div class="d-flex align-center"><v-icon left color="primary">mdi-card-account-details-outline</v-icon><h2 class="subtitle-1 font-weight-bold">Votre fidélité</h2></div>
    <v-alert v-if="loyalty.error" type="warning" dense text>{{ loyalty.error }}</v-alert>
    <template v-if="!hasPhoneAccess">
      <p class="mt-2 mb-2">Retrouvez vos points sans quitter votre panier.</p>
      <v-btn v-if="!identifying && !guest" text color="primary" class="text-none" @click="identify">Utiliser ma fidélité</v-btn>
      <v-btn v-if="!guest" text class="text-none" @click="guest = true; identifying = false">Continuer sans compte</v-btn>
      <p v-if="guest" class="mb-0 text--secondary">Commande en invité. <v-btn text small class="text-none" @click="identify">Utiliser ma fidélité</v-btn></p>
      <LoyaltyPhoneAccess v-if="phone == null && identifying && loyalty.program && loyalty.canEnroll" :shop-id="shopId" :enrollment-enabled="loyalty.program.enabled" :disabled="disabled" @joined="onJoined" />
      <template v-else-if="phone != null && identifying && loyalty.program && loyalty.canEnroll">
        <p class="mt-2 mb-2">Utilisez le numéro de téléphone renseigné dans votre commande pour {{ loyalty.program.enabled ? 'rejoindre la fidélité ou retrouver votre carte' : 'retrouver votre carte' }}.</p>
        <v-checkbox v-if="loyalty.program.enabled" v-model="marketingConsent" label="Recevoir les offres du restaurant dans Wallet (facultatif)" :disabled="disabled || submitting || loyalty.busy" />
        <v-btn color="primary" class="text-none" :loading="submitting" :disabled="disabled || loyalty.busy || !completeCheckoutPhone" @click="enrollCheckoutPhone">{{ loyalty.program.enabled ? 'Rejoindre ou retrouver ma carte' : 'Retrouver ma carte' }}</v-btn>
      </template>
      <p v-else-if="identifying && !loyalty.busy" class="mt-2 text--secondary">{{ loyalty.program && !loyalty.program.enabled ? 'Le restaurant n’a pas activé son programme de fidélité.' : 'Scannez le QR de votre table pour rejoindre la fidélité.' }}</p>
    </template>
    <template v-else>
      <v-alert v-if="joined" type="success" text dense>Votre carte est créée. Vous pouvez maintenant l’ajouter à Apple Wallet.</v-alert>
      <p v-if="!hidePoints" class="mt-2 mb-1"><strong>{{ loyalty.member.available }} points disponibles</strong></p>
      <p class="mb-2 text--secondary">Vos points seront attribués après confirmation du paiement.</p>
      <template v-if="usableRewards.length">
        <v-select v-model="rewardId" :items="usableRewards" item-text="label" item-value="id" outlined dense label="Utiliser une récompense" :disabled="disabled || loyalty.busy" clearable @change="rewardChanged" />
        <v-btn v-if="rewardId && !confirmedReward" outlined class="text-none" :disabled="disabled || loyalty.busy" @click="confirming = true">Valider ma récompense</v-btn>
        <v-alert v-if="confirmedReward" type="info" text dense>{{ confirmedReward.name }} · {{ confirmedReward.points }} points seront réservés à la validation de la commande. Le total final sera recalculé par le restaurant avant le paiement.<v-btn text small :disabled="disabled" @click="removeReward">Retirer</v-btn></v-alert>
      </template>
      <v-btn text class="text-none" color="primary" :to="{ path: '/compte/fidelite', query: { shopId } }">Voir mes récompenses</v-btn>
      <v-btn v-if="joined" outlined class="text-none mt-2" :to="{ path: '/compte/fidelite', query: { shopId }, hash: '#wallet' }">Ajouter ma carte à Apple Wallet</v-btn>
    </template>
    <v-dialog v-model="confirming" max-width="460"><v-card><v-card-title class="subtitle-1 se-modal-title">Utiliser mes points</v-card-title><v-card-text v-if="chosenReward">Confirmez-vous l’utilisation de {{ chosenReward.points }} points pour « {{ chosenReward.name }} » ? Aucun point ne sera dépensé avant le paiement.</v-card-text><v-card-actions><v-spacer /><v-btn text @click="confirming = false">Annuler</v-btn><v-btn color="primary" :disabled="disabled" @click="confirmReward">Confirmer</v-btn></v-card-actions></v-card></v-dialog>
  </section>
</template>
<script>
import LoyaltyPhoneAccess from '@/components/loyalty/LoyaltyPhoneAccess.vue'
import { completePhone, phoneOwner, matchingFrozenPhoneSession } from '@/helpers/clientPhone'
export default {
  components: { LoyaltyPhoneAccess },
  props: { shopId: { type: Number, required: true }, disabled: { type: Boolean, default: false }, phone: { type: String, default: null }, hidePoints: { type: Boolean, default: false } },
  data: () => ({ identifying: false, guest: false, rewardId: null, confirming: false, confirmedReward: null, joined: false, marketingConsent: false, submitting: false, initialization: 0, enrollmentSequence: 0 }),
  computed: {
    loyalty() { return this.$store.state.loyalty },
    completeCheckoutPhone() { return completePhone(this.phone) },
    hasPhoneAccess() { return this.loyalty.phoneSession && this.loyalty.phoneSession.shopId === this.shopId && this.loyalty.member },
    phoneIdentity() { return this.loyalty.phoneSession ? `${this.loyalty.phoneSession.shopId}:${this.loyalty.phoneSession.memberId}` : '' },
    usableRewards() { return this.loyalty.member ? this.loyalty.member.rewards.filter(row => row.available).map(row => ({ ...row, label: `${row.name} · ${row.points} points` })) : [] },
    chosenReward() { return this.usableRewards.find(row => row.id === this.rewardId) },
  },
  watch: {
    shopId() { this.initialize() },
    phoneIdentity() { this.removeReward() },
    phone: { sync: true, handler() { this.enrollmentSequence++; this.submitting = false; this.joined = false; this.marketingConsent = false; this.removeReward() } },
  },
  mounted() { this.initialize() },
  beforeDestroy() { this.initialization++; this.enrollmentSequence++; this.$store.dispatch('loyalty/reset') },
  methods: {
    onJoined() { this.joined = true; this.identifying = false },
    async enrollCheckoutPhone() {
      if (this.disabled || this.submitting || this.loyalty.busy || !completePhone(this.phone)) return
      const sequence = ++this.enrollmentSequence
      const phone = this.phone
      this.submitting = true
      try {
        const member = await this.$store.dispatch('loyalty/enrollPhone', { shopId: this.shopId, phone: phone.trim(), countryCode: 'FR', marketingConsent: this.marketingConsent })
        if (member && !this._isDestroyed && sequence === this.enrollmentSequence && phone === this.phone) this.onJoined()
      } finally { if (!this._isDestroyed && sequence === this.enrollmentSequence) this.submitting = false }
    },
    async initialize() {
      const initialization = ++this.initialization
      const shopId = this.shopId
      const owner = phoneOwner(this.$store.state)
      const enrollmentSequence = this.enrollmentSequence
      const currentProof = { session: this.loyalty.phoneSession, member: this.loyalty.member, program: this.loyalty.program, canEnroll: this.loyalty.canEnroll }
      const keepProof = this.phone != null && matchingFrozenPhoneSession(this.$store.state, { phone: this.phone, shopId, ...currentProof })
      this.identifying = false
      this.guest = false
      // Advance the epoch without briefly dropping a matching frozen checkout's proof.
      this.$store.dispatch('loyalty/reset')
      if (keepProof) this.$store.commit('loyalty/PHONE_RESULT', currentProof)
      const epoch = this.loyalty.epoch
      if (this.phone != null) {
        // Read programme metadata without adopting a previous phone's cookie proof.
        const user = this.$store.state.users && this.$store.state.users.user || {}
        try {
          const result = await this.$customerApi.request({ path: '/customer/loyalty/phone', shopId, tableSessionToken: user.token })
          if (this._isDestroyed || initialization !== this.initialization || shopId !== this.shopId || owner !== phoneOwner(this.$store.state) ||
            enrollmentSequence !== this.enrollmentSequence || epoch !== this.loyalty.epoch) return
          if (matchingFrozenPhoneSession(this.$store.state, { phone: this.phone, shopId, session: result.session, member: result.member })) this.$store.commit('loyalty/PHONE_RESULT', result)
          else if (!keepProof) this.$store.commit('loyalty/MEMBER', { program: result.program, canEnroll: result.canEnroll })
          this.$store.commit('loyalty/PHONE_SHOP_ID', shopId)
        } catch (_) { /* Checkout remains available without programme metadata. */ }
        return
      }
      await this.$store.dispatch('loyalty/loadPhoneMember', { shopId: this.shopId })
    },
    identify() { this.guest = false; this.identifying = true },
    rewardChanged() { this.confirmedReward = null; this.$emit('reward', null) },
    removeReward() { this.rewardId = null; this.confirmedReward = null; this.confirming = false; this.$emit('reward', null) },
    confirmReward() {
      if (!this.confirming || !this.chosenReward || this.disabled) return
      this.confirmedReward = this.chosenReward
      this.confirming = false
      this.$emit('reward', { rewardId: this.chosenReward.id, confirmed: true, pointsCost: this.chosenReward.points, programVersion: this.loyalty.member.program.version })
    },
  },
}
</script>
