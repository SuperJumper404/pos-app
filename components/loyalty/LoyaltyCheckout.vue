<template>
  <section class="pa-3 mb-3" aria-label="Fidélité de cette commande">
    <div class="d-flex align-center"><v-icon left color="primary">mdi-card-account-details-outline</v-icon><h2 class="subtitle-1 font-weight-bold">Votre fidélité</h2></div>
    <v-alert v-if="loyalty.error" type="warning" dense text>{{ loyalty.error }}</v-alert>
    <template v-if="!account.session || account.shopId !== shopId">
      <p class="mt-2 mb-2">Retrouvez vos points sans quitter votre panier.</p>
      <v-btn v-if="!identifying && !guest" text color="primary" class="text-none" @click="identify">Utiliser ma fidélité</v-btn>
      <v-btn v-if="!guest" text class="text-none" @click="guest = true; identifying = false">Continuer sans compte</v-btn>
      <p v-if="guest" class="mb-0 text--secondary">Commande en invité. <v-btn text small class="text-none" @click="identify">Utiliser ma fidélité</v-btn></p>
      <customer-code-login v-if="identifying" :key="account.epoch" @authenticated="authenticated" />
    </template>
    <template v-else-if="loyalty.member">
      <p class="mt-2 mb-1"><strong>{{ loyalty.member.available }} points disponibles</strong></p>
      <p class="mb-2 text--secondary">Vos points seront attribués après confirmation du paiement.</p>
      <template v-if="usableRewards.length">
        <v-select v-model="rewardId" :items="usableRewards" item-text="label" item-value="id" outlined dense label="Utiliser une récompense" :disabled="disabled || loyalty.busy" clearable @change="rewardChanged" />
        <v-btn v-if="rewardId && !confirmedReward" outlined class="text-none" :disabled="disabled || loyalty.busy" @click="confirming = true">Valider ma récompense</v-btn>
        <v-alert v-if="confirmedReward" type="info" text dense>{{ confirmedReward.name }} · {{ confirmedReward.points }} points seront réservés à la validation de la commande. Le total final sera recalculé par le restaurant avant le paiement.<v-btn text small :disabled="disabled" @click="removeReward">Retirer</v-btn></v-alert>
      </template>
      <v-btn text class="text-none" color="primary" :to="{ path: '/compte/fidelite', query: { shopId } }">Voir mes récompenses</v-btn>
    </template>
    <template v-else-if="loyalty.program && loyalty.program.enabled">
      <p class="mt-2">Rejoignez {{ loyalty.program.name }} pour cumuler des points dans ce restaurant.</p>
      <v-btn outlined class="text-none" :loading="loyalty.busy" @click="$store.dispatch('loyalty/enroll')">Rejoindre le programme</v-btn>
    </template>
    <p v-else-if="!loyalty.busy" class="mt-2 mb-0 text--secondary">Le programme n’est pas disponible dans ce restaurant.</p>
    <v-dialog v-model="confirming" max-width="460"><v-card><v-card-title class="subtitle-1">Utiliser mes points</v-card-title><v-card-text v-if="chosenReward">Confirmez-vous l’utilisation de {{ chosenReward.points }} points pour « {{ chosenReward.name }} » ? Aucun point ne sera dépensé avant le paiement.</v-card-text><v-card-actions><v-spacer /><v-btn text @click="confirming = false">Annuler</v-btn><v-btn color="primary" :disabled="disabled" @click="confirmReward">Confirmer</v-btn></v-card-actions></v-card></v-dialog>
  </section>
</template>
<script>
import CustomerCodeLogin from '@/components/customer/CustomerCodeLogin.vue'
export default {
  components: { CustomerCodeLogin },
  props: { shopId: { type: Number, required: true }, disabled: { type: Boolean, default: false } },
  data: () => ({ identifying: false, guest: false, sequence: 0, rewardId: null, confirming: false, confirmedReward: null }),
  computed: {
    account() { return this.$store.state.customer },
    loyalty() { return this.$store.state.loyalty },
    usableRewards() { return this.loyalty.member ? this.loyalty.member.rewards.filter(row => row.available).map(row => ({ ...row, label: `${row.name} · ${row.points} points` })) : [] },
    chosenReward() { return this.usableRewards.find(row => row.id === this.rewardId) },
  },
  watch: {
    shopId() { this.initialize() },
    'account.session'(session) { if (session && this.account.shopId === this.shopId) this.authenticated() },
    'account.epoch'() { this.$store.dispatch('loyalty/reset'); this.removeReward() },
  },
  mounted() { this.initialize() },
  beforeDestroy() { this.sequence++ },
  methods: {
    async initialize() {
      const sequence = ++this.sequence
      this.identifying = false
      this.guest = false
      await this.$store.dispatch('loyalty/reset')
      if (this.account.shopId !== this.shopId || !this.account.channelsLoaded) await this.$store.dispatch('customer/loadSession', { shopId: this.shopId })
      if (sequence !== this.sequence || this._isDestroyed) return
      if (this.account.session) await this.$store.dispatch('loyalty/loadMember')
    },
    identify() { this.guest = false; this.identifying = true },
    authenticated() { this.identifying = false; return this.$store.dispatch('loyalty/loadMember') },
    rewardChanged() { this.confirmedReward = null; this.$emit('reward', null) },
    removeReward() { this.rewardId = null; this.confirmedReward = null; this.confirming = false; this.$emit('reward', null) },
    confirmReward() {
      if (!this.confirming || !this.chosenReward || this.disabled) return
      this.confirmedReward = this.chosenReward
      this.confirming = false
      this.$emit('reward', { rewardId: this.chosenReward.id, confirmed: true })
    },
  },
}
</script>
