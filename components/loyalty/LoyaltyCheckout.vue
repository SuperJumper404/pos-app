<template>
  <section class="pa-3 mb-3" aria-label="Fidélité de cette commande">
    <div class="d-flex align-center"><v-icon left color="primary">mdi-card-account-details-outline</v-icon><h2 class="subtitle-1 font-weight-bold">Votre fidélité</h2></div>
    <v-alert v-if="loyalty.error" type="warning" dense text>{{ loyalty.error }}</v-alert>
    <template v-if="!hasPhoneAccess">
      <p class="mt-2 mb-2">Retrouvez vos points sans quitter votre panier.</p>
      <v-btn v-if="!identifying && !guest" text color="primary" class="text-none" @click="identify">Utiliser ma fidélité</v-btn>
      <v-btn v-if="!guest" text class="text-none" @click="guest = true; identifying = false">Continuer sans compte</v-btn>
      <p v-if="guest" class="mb-0 text--secondary">Commande en invité. <v-btn text small class="text-none" @click="identify">Utiliser ma fidélité</v-btn></p>
      <LoyaltyPhoneAccess v-if="identifying && loyalty.program && loyalty.canEnroll" :shop-id="shopId" :enrollment-enabled="loyalty.program.enabled" :disabled="disabled" @joined="onJoined" />
      <p v-else-if="identifying && !loyalty.busy" class="mt-2 text--secondary">{{ loyalty.program && !loyalty.program.enabled ? 'Le restaurant n’a pas activé son programme de fidélité.' : 'Scannez le QR de votre table pour rejoindre la fidélité.' }}</p>
    </template>
    <template v-else>
      <v-alert v-if="joined" type="success" text dense>Votre carte est créée. Vous pouvez maintenant l’ajouter à Apple Wallet.</v-alert>
      <p class="mt-2 mb-1"><strong>{{ loyalty.member.available }} points disponibles</strong></p>
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
export default {
  components: { LoyaltyPhoneAccess },
  props: { shopId: { type: Number, required: true }, disabled: { type: Boolean, default: false } },
  data: () => ({ identifying: false, guest: false, rewardId: null, confirming: false, confirmedReward: null, joined: false }),
  computed: {
    loyalty() { return this.$store.state.loyalty },
    hasPhoneAccess() { return this.loyalty.phoneSession && this.loyalty.phoneSession.shopId === this.shopId && this.loyalty.member },
    phoneIdentity() { return this.loyalty.phoneSession ? `${this.loyalty.phoneSession.shopId}:${this.loyalty.phoneSession.memberId}` : '' },
    usableRewards() { return this.loyalty.member ? this.loyalty.member.rewards.filter(row => row.available).map(row => ({ ...row, label: `${row.name} · ${row.points} points` })) : [] },
    chosenReward() { return this.usableRewards.find(row => row.id === this.rewardId) },
  },
  watch: {
    shopId() { this.initialize() },
    phoneIdentity() { this.removeReward() },
  },
  mounted() { this.initialize() },
  beforeDestroy() { this.$store.dispatch('loyalty/reset') },
  methods: {
    onJoined() { this.joined = true; this.identifying = false },
    async initialize() {
      this.identifying = false
      this.guest = false
      await this.$store.dispatch('loyalty/reset')
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
