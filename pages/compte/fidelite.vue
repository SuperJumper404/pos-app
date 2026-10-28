<template>
  <div>
    <div class="customer-section-heading"><h1>Ma fidélité</h1><v-btn v-if="shopId" text :to="{ path: '/compte', query: { shopId } }">Mon compte</v-btn></div>
    <v-skeleton-loader v-if="opening" type="heading, paragraph, actions" />
    <v-alert v-else-if="!shopId" type="warning" text>Ouvrez votre carte depuis le restaurant de votre choix.</v-alert>
    <customer-code-login v-else-if="!account.session" :key="account.epoch" />
    <template v-else>
      <v-alert v-if="loyalty.error" type="error" text role="alert">{{ loyalty.error }}<v-btn text @click="refresh">Réessayer</v-btn></v-alert>
      <v-card v-if="member" outlined class="pa-5 mb-5" :style="cardStyle">
        <div class="customer-section-heading mb-2"><h2 class="mb-0">{{ member.program.name }}</h2><img v-if="member.program.logoUrl" :src="member.program.logoUrl" alt="" width="52" height="52" class="loyalty-logo"></div>
        <p>{{ account.shop ? account.shop.shop_name : 'Votre restaurant' }}</p>
        <p class="text-h4 font-weight-bold mb-2">{{ member.balance }} points</p>
        <p v-if="member.reserved">{{ member.reserved }} points réservés · {{ member.available }} disponibles</p>
        <div class="loyalty-qr"><qr-code :text="member.qr" :size="180" /></div>
        <p class="mt-3 mb-0">Présentez ce QR à la caisse pour retrouver votre fidélité.</p>
      </v-card>
      <template v-if="member">
        <section class="customer-section">
          <h2>Vos récompenses</h2>
          <p v-if="!member.rewards.length">Le restaurant n’a pas encore publié de récompense.</p>
          <div v-for="reward in member.rewards" :key="reward.id" class="loyalty-reward">
            <div><h3>{{ reward.name }}</h3><p class="mb-1">{{ reward.points }} points · {{ rewardDescription(reward) }}</p><p v-if="reward.conditions" class="mb-1">{{ reward.conditions }}</p><p v-if="reward.minPaidCents" class="mb-1">Dès {{ money(reward.minPaidCents) }} d’achat.</p><p v-if="reward.expiresAt" class="mb-1">Valable jusqu’au {{ date(reward.expiresAt) }}.</p><p class="mb-0 text--secondary">{{ reward.stackable ? 'Cumulable avec les autres remises.' : 'Non cumulable avec les autres remises.' }}</p></div>
            <v-chip small :color="reward.available ? 'success' : undefined" :outlined="!reward.available">{{ rewardState(reward) }}</v-chip>
          </div>
          <p v-if="nextReward" class="mt-4">Prochain palier : {{ nextReward.name }} à {{ nextReward.points }} points.</p>
          <v-progress-linear v-if="nextReward" :value="Math.min(100, member.available / nextReward.points * 100)" height="8" rounded :aria-label="`Progression vers ${nextReward.name}`" />
        </section>
        <section class="customer-section">
          <h2>Emportez votre carte</h2>
          <p>Apple Wallet et Google Wallet affichent la même adhésion et le même solde.</p>
          <div class="customer-actions">
            <button v-if="appleArtwork" type="button" class="wallet-add-button" :disabled="loyalty.busy" aria-label="Ajouter à Apple Wallet" @click="addWallet('apple')"><img src="/wallet/apple-wallet-fr.svg" alt="Ajouter à Apple Wallet" height="48" @error="appleArtwork = false"></button>
            <v-btn v-else outlined :loading="adding === 'apple'" :disabled="loyalty.busy" @click="addWallet('apple')">Télécharger ma carte Apple Wallet</v-btn>
            <button type="button" class="wallet-add-button" :disabled="loyalty.busy" :aria-busy="adding === 'google'" aria-label="Ajouter à Google Wallet" @click="addWallet('google')"><img src="/wallet/google-wallet-fr.svg" alt="Ajouter à Google Wallet" height="48"></button>
          </div>
          <v-alert v-if="walletMessage" type="info" text class="mt-3" role="status">{{ walletMessage }}</v-alert>
        </section>
        <section class="customer-section">
          <h2>Historique des points</h2>
          <p v-if="!member.history.length">Aucun mouvement pour le moment.</p>
          <ul class="loyalty-history"><li v-for="movement in member.history" :key="movement.id"><div><strong>{{ movementLabel(movement.kind) }}</strong><p class="mb-0 text--secondary">{{ date(movement.createdAt) }}<span v-if="movement.reason && movement.kind === 'adjustment'"> · {{ movement.reason }}</span></p></div><strong>{{ movement.points > 0 ? '+' : '' }}{{ movement.points }}</strong></li></ul>
        </section>
      </template>
      <section v-else-if="loyalty.program && loyalty.program.enabled" class="customer-section"><h2>{{ loyalty.program.name }}</h2><p>Adhérez gratuitement pour cumuler des points dans ce restaurant. L’adhésion ne vous inscrit pas aux communications marketing.</p><v-btn color="primary" :loading="loyalty.busy" @click="$store.dispatch('loyalty/enroll')">Rejoindre le programme</v-btn></section>
      <v-alert v-else-if="!loyalty.busy && !loyalty.error" type="info" text>Le restaurant n’a pas activé son programme de fidélité.</v-alert>
      <section class="customer-section"><h2>Commander sur place</h2><p>Scanner le QR de votre table pour commencer une commande. Aucune table précédente n’est sélectionnée depuis cette page.</p><v-btn text :loading="loyalty.busy" @click="refresh"><v-icon left>mdi-refresh</v-icon>Actualiser mes points</v-btn></section>
    </template>
  </div>
</template>
<script>
import CustomerCodeLogin from '@/components/customer/CustomerCodeLogin.vue'
import QrCode from 'vue-qrcode-component/src/QRCode.vue'
export default {
  components: { CustomerCodeLogin, QrCode },
  layout: 'customer',
  data: () => ({ opening: true, adding: '', walletMessage: '', sequence: 0, appleArtwork: true }),
  computed: {
    account() { return this.$store.state.customer },
    loyalty() { return this.$store.state.loyalty },
    member() { return this.loyalty.member },
    shopId() { const value = this.$route.query.shopId; return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null },
    nextReward() { return this.member && this.member.rewards.filter(reward => reward.points > this.member.available && (!reward.expiresAt || Date.parse(reward.expiresAt) > Date.now())).sort((a, b) => a.points - b.points)[0] },
    cardStyle() { return this.member ? { backgroundColor: this.member.program.backgroundColor, color: this.member.program.foregroundColor } : {} },
  },
  watch: {
    shopId() { this.open() },
    'account.epoch'() { this.$store.dispatch('loyalty/reset'); this.walletMessage = '' },
    'account.session'(session) { if (session && session.shopId === this.shopId) this.refresh() },
  },
  mounted() { this.open() },
  beforeDestroy() { this.sequence++; this.$store.dispatch('loyalty/reset') },
  methods: {
    async open() {
      const sequence = ++this.sequence
      this.opening = true
      await this.$store.dispatch('loyalty/reset')
      await this.$store.dispatch('customer/loadSession', { shopId: this.shopId })
      if (sequence === this.sequence && !this._isDestroyed) this.opening = false
    },
    refresh() { return this.$store.dispatch('loyalty/loadMember') },
    money(cents) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) },
    date(value) { return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : '' },
    rewardDescription(reward) { return reward.type === 'percent' ? `${reward.value} % de réduction` : reward.type === 'product' ? 'Produit offert' : `${this.money(reward.value)} de réduction` },
    rewardState(reward) {
      if (reward.available) return 'Disponible'
      if (reward.expiresAt && Date.parse(reward.expiresAt) <= Date.now()) return 'Expirée'
      if (!this.member.program.enabled) return 'Programme suspendu'
      return `Encore ${Math.max(0, reward.points - this.member.available)} points`
    },
    movementLabel(kind) { return { earn: 'Points gagnés', spend: 'Récompense utilisée', redeem: 'Récompense utilisée', restore: 'Points restitués', refund: 'Remboursement', expire: 'Expiration', adjustment: 'Correction manuelle', reserve: 'Points réservés', release: 'Réservation libérée' }[kind] || 'Mouvement de points' },
    async addWallet(provider) {
      this.adding = provider
      this.walletMessage = ''
      try {
        const result = await this.$store.dispatch('loyalty/wallet', provider)
        if (!result || this._isDestroyed) return
        if (result.available === false) { this.walletMessage = 'La carte Wallet n’est pas configurée pour ce restaurant.'; return }
        if (result.mode === 'development') this.walletMessage = 'Carte de test : cette carte appartient à l’environnement de développement.'
        if (provider === 'google' && typeof result.url === 'string' && result.url.startsWith('https://pay.google.com/gp/v/save/')) window.location.assign(result.url)
        else if (provider === 'apple' && typeof result.passBase64 === 'string') {
          const bytes = Uint8Array.from(atob(result.passBase64), value => value.charCodeAt(0))
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.apple.pkpass' }))
          const link = document.createElement('a')
          link.href = url
          link.download = 'carte-fidelite.pkpass'
          document.body.appendChild(link)
          link.click()
          link.remove()
          setTimeout(() => URL.revokeObjectURL(url), 60000)
        } else this.walletMessage = 'La carte Wallet n’est pas configurée pour ce restaurant.'
      } finally { this.adding = '' }
    },
  },
}
</script>
<style scoped>
.loyalty-logo { object-fit: contain; }
.wallet-add-button { display: inline-flex; align-items: center; background: transparent; border: 0; padding: 0; min-height: 48px; cursor: pointer; }
.wallet-add-button img { display: block; max-width: 100%; }
.wallet-add-button:disabled { opacity: .5; cursor: wait; }
.loyalty-qr { display: inline-block; padding: 12px; background: white; }
.loyalty-reward { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 0; border-bottom: 1px solid var(--se-color-border); }
.loyalty-reward > div { flex: 1 1 240px; }
.loyalty-history { padding: 0; list-style: none; }
.loyalty-history li { display: flex; justify-content: space-between; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--se-color-border); }
</style>
