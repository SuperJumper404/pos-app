<template>
  <section class="loyalty-program">
    <v-alert v-if="!isAdmin" type="warning" text>La gestion du programme est réservée à l’administrateur du restaurant.</v-alert>
    <template v-else>
      <v-alert v-if="loyalty.error" type="error" text>{{ loyalty.error }}<v-btn text @click="load">Réessayer</v-btn></v-alert>
      <v-alert v-if="saved" type="success" text role="status">Programme enregistré.</v-alert>
      <v-skeleton-loader v-if="opening" type="heading, paragraph, actions" />
      <template v-else-if="draft">
        <v-tabs v-model="tab" class="mb-5" show-arrows><v-tab class="text-none">Programme et offres</v-tab><v-tab class="text-none">Carte Wallet</v-tab><v-tab class="text-none">Notifications</v-tab></v-tabs>
        <v-form v-if="tab === 0" ref="programForm" @submit.prevent="save">
          <v-card outlined class="pa-5 mb-4">
            <h2 class="text-h6 mb-3">Règles de points</h2>
            <v-switch v-model="draft.enabled" label="Activer le programme de fidélité" :disabled="loyalty.busy" />
            <v-row><v-col cols="12" md="6"><v-text-field v-model="draft.name" outlined dense label="Nom du programme" maxlength="120" :rules="[required]" /></v-col><v-col cols="12" md="3"><v-text-field v-model.number="draft.pointsPerEuro" outlined dense type="number" min="0" max="10000" step="0.001" label="Points par euro" :rules="[nonnegative]" /></v-col><v-col cols="12" md="3"><v-select v-model="draft.rounding" outlined dense :items="roundings" label="Arrondi des points" /></v-col></v-row>
            <p>Les points sont calculés sur le montant payé après remises. Ils sont attribués après la validation du paiement.</p>
            <v-checkbox v-model="draft.includeTips" label="Inclure les pourboires dans les points gagnés" class="mt-0" />
            <v-autocomplete v-model="draft.excludedProductIds" :items="catalog" item-text="name" item-value="id" outlined dense multiple chips small-chips deletable-chips label="Produits exclus du calcul des points" hint="Laissez vide pour inclure tous les produits." persistent-hint />
            <p class="mt-4 mb-0 text--secondary">En cas de remboursement, les points dépensés sont restitués au prorata et les points gagnés restent acquis.</p>
          </v-card>
          <v-card outlined class="pa-5 mb-4">
            <div class="d-flex flex-wrap align-center justify-space-between mb-4"><h2 class="text-h6">Récompenses</h2><v-btn outlined class="text-none" :disabled="loyalty.busy" @click="addReward"><v-icon left>mdi-plus</v-icon>Ajouter une récompense</v-btn></div>
            <p v-if="!draft.rewards.length">Aucune récompense. Créez celles qui correspondent à votre restaurant.</p>
            <section v-for="(reward, index) in draft.rewards" :key="reward.id" class="loyalty-admin-reward py-4">
              <div class="d-flex align-center justify-space-between mb-3"><h3 class="subtitle-1">Récompense {{ index + 1 }}</h3><v-btn icon :disabled="loyalty.busy" :aria-label="`Supprimer la récompense ${index + 1}`" @click="draft.rewards.splice(index, 1)"><v-icon>mdi-delete-outline</v-icon></v-btn></div>
              <v-row dense><v-col cols="12" md="6"><v-text-field v-model="reward.name" outlined dense label="Nom de la récompense" :rules="[required]" maxlength="120" /></v-col><v-col cols="12" md="3"><v-select v-model="reward.type" outlined dense :items="rewardTypes" label="Type" /></v-col><v-col cols="12" md="3"><v-text-field v-model.number="reward.points" outlined dense type="number" min="1" label="Coût en points" :rules="[positive]" /></v-col><v-col v-if="reward.type !== 'product'" cols="12" md="4"><v-text-field v-model.number="reward.value" outlined dense type="number" min="1" :max="reward.type === 'percent' ? 100 : undefined" :label="reward.type === 'percent' ? 'Réduction (%)' : 'Réduction (centimes)'" :rules="[positive]" /></v-col><v-col v-else cols="12" md="4"><v-autocomplete v-model="reward.productId" :items="catalog" item-text="name" item-value="id" outlined dense label="Produit offert" :rules="[positive]" /></v-col><v-col cols="12" md="4"><v-text-field v-model.number="reward.minPaidCents" outlined dense type="number" min="0" label="Achat minimum (centimes)" :rules="[nonnegative]" /></v-col><v-col cols="12" md="4"><v-text-field :value="reward.expiresAt ? reward.expiresAt.slice(0, 10) : ''" type="date" outlined dense label="Date de fin (facultative)" @input="reward.expiresAt = $event ? `${$event}T23:59:59Z` : null" /></v-col><v-col cols="12"><v-textarea v-model="reward.conditions" outlined dense rows="2" label="Conditions affichées au client" maxlength="1000" /><v-checkbox v-model="reward.stackable" label="Cumulable avec d’autres remises" class="mt-0" /></v-col></v-row>
            </section>
          </v-card>
          <v-btn type="submit" color="primary" class="text-none" :loading="loyalty.busy">Enregistrer le programme</v-btn>
        </v-form>
        <LoyaltyCardEditor v-if="tab === 1" :program="draft" @saved="draft = $event" />
        <LoyaltyCampaigns v-if="tab === 2" :recipient="recipient" @clear-recipient="$emit('clear-recipient')" />
      </template>
      <v-alert v-else-if="!loyalty.error" type="info" text>Le programme n’a pas pu être chargé. <v-btn text class="text-none" :disabled="loyalty.busy" @click="load">Réessayer</v-btn></v-alert>
    </template>
  </section>
</template>
<script>
import LoyaltyCardEditor from '@/components/loyalty/LoyaltyCardEditor.vue'
import LoyaltyCampaigns from '@/components/loyalty/LoyaltyCampaigns.vue'
const { isDeliveryAdmin } = require('@/helpers/staffRoles')
export default {
  components: { LoyaltyCardEditor, LoyaltyCampaigns },
  props: { recipient: { type: Object, default: null } },
  data() { return { opening: true, draft: null, saved: false, loadingVersion: 0, tab: this.recipient ? 2 : 0,
    roundings: [{ text: 'Inférieur', value: 'floor' }, { text: 'Au plus proche', value: 'nearest' }, { text: 'Supérieur', value: 'ceil' }],
    rewardTypes: [{ text: 'Produit offert', value: 'product' }, { text: 'Réduction fixe', value: 'fixed' }, { text: 'Pourcentage', value: 'percent' }],
  } },
  computed: {
    loyalty() { return this.$store.state.loyalty },
    isAdmin() { return isDeliveryAdmin(this.$store.state.users.user) },
    catalog() { return (this.$store.state.products.dataProduct || []).map(product => ({ id: Number(product.id), name: product.name })) },
    staffScope() { const user = this.$store.state.users.user; return JSON.stringify([user.id, user.shopid, user.access, user.module_permissions, user.session_subject]) },
  },
  watch: {
    staffScope() { this.$store.dispatch('loyalty/reset'); this.draft = null; this.tab = 0; this.load() },
    recipient(value) { if (value) this.tab = 2 },
  },
  mounted() { this.load() },
  activated() { if (!this.draft && !this.loyalty.busy) return this.load() },
  beforeDestroy() { this.loadingVersion++; this.$store.dispatch('loyalty/reset') },
  methods: {
    required(value) { return typeof value === 'string' && !!value.trim() || 'Champ obligatoire' },
    nonnegative(value) { return Number.isFinite(value) && value >= 0 || 'Saisissez un nombre positif ou nul' },
    positive(value) { return Number.isSafeInteger(value) && value > 0 || 'Saisissez un entier supérieur à zéro' },
    integer(value) { return Number.isSafeInteger(value) && value !== 0 || 'Saisissez un entier non nul' },
    color(value) { return /^#[a-fA-F0-9]{6}$/.test(value) || 'Utilisez une couleur au format #RRGGBB' },
    async load() {
      if (!this.isAdmin) { this.opening = false; return }
      const version = ++this.loadingVersion
      this.opening = true
      const result = await this.$store.dispatch('loyalty/loadProgram')
      if (version !== this.loadingVersion || this._isDestroyed) return
      if (result && !this._isDestroyed) this.draft = JSON.parse(JSON.stringify(result))
      if (result && !this._isDestroyed) {
        try { await this.$store.dispatch('products/getProducts') } catch (_) { /* Program settings remain editable if the catalogue is unavailable. */ }
      }
      if (version === this.loadingVersion && !this._isDestroyed) this.opening = false
    },
    addReward() { this.draft.rewards.push({ id: `reward_${Date.now()}_${this.draft.rewards.length}`, name: '', type: 'fixed', points: 1, value: 1, productId: null, minPaidCents: 0, expiresAt: null, stackable: false, conditions: '' }) },
    async save() {
      this.saved = false
      if (!this.$refs.programForm.validate()) return
      const result = await this.$store.dispatch('loyalty/saveProgram', this.draft)
      if (result && !this._isDestroyed) { this.draft = JSON.parse(JSON.stringify(result)); this.saved = true }
    },
  },
}
</script>
<style scoped>
.loyalty-admin-reward + .loyalty-admin-reward { border-top: 1px solid var(--se-color-border); }
</style>
