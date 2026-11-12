<template>
  <section aria-label="Personnalisation de la carte Wallet">
    <v-alert v-if="program.appleWalletAvailable === false" type="info" text>Apple Wallet n’est pas encore configuré pour ce restaurant. Vous pouvez préparer le programme et les visuels avant sa mise en service.</v-alert>
    <v-alert v-if="message" type="success" text role="status">{{ message }}</v-alert>
    <v-alert v-if="error || loyalty.assetsError" type="error" text role="alert">{{ error || loyalty.assetsError }}</v-alert>
    <v-row>
      <v-col cols="12" md="7">
        <v-form ref="styleForm" @submit.prevent="saveStyle">
          <h2 class="text-h6 mb-4">Identité de la carte</h2>
          <v-row dense><v-col cols="12" sm="6"><v-text-field v-model="backgroundColor" outlined dense label="Couleur de fond" :rules="[color]" :disabled="working" /></v-col><v-col cols="12" sm="6"><v-text-field v-model="foregroundColor" outlined dense label="Couleur du texte" :rules="[color]" :disabled="working" /></v-col></v-row>
          <v-text-field v-model="logoUrl" outlined dense label="Logo Google Wallet (URL HTTPS facultative)" type="url" :disabled="working" />
          <v-btn type="submit" outlined class="text-none mb-6" :loading="loyalty.busy" :disabled="working">Enregistrer la carte</v-btn>
        </v-form>
        <h2 class="text-h6 mb-3">Visuels Apple Wallet</h2>
        <p>Importez une image PNG ou JPEG, puis validez son recadrage. Vous pouvez changer le logo et la bannière séparément.</p>
        <h3 class="subtitle-1 mb-2">Icône des notifications Apple Wallet</h3>
        <p class="text-body-2">Choisissez une image carrée pour représenter votre restaurant dans les notifications de la carte.</p>
        <ImageCropper v-model="icon" :ratio="1" output-mime-type="image/png" />
        <h3 class="subtitle-1 mt-5 mb-2">Logo</h3>
        <ImageCropper v-model="logo" :ratio="160 / 50" output-mime-type="image/png" />
        <h3 class="subtitle-1 mt-5 mb-2">Bannière de la carte</h3>
        <ImageCropper v-model="strip" :ratio="375 / 144" output-mime-type="image/png" />
        <v-btn color="primary" class="text-none mt-4" :disabled="working || (!icon && !logo && !strip)" :loading="publishing" @click="publish">Publier le visuel</v-btn>
      </v-col>
      <v-col cols="12" md="5">
        <h2 class="text-h6 mb-4">Aperçu de la carte</h2>
        <div class="wallet-card-preview" role="group" aria-label="Aperçu illustratif de la carte Apple Wallet" :style="{ backgroundColor, color: foregroundColor }">
          <div class="wallet-card-header">
            <div class="wallet-card-identity"><img v-if="logoPreview" :src="logoPreview" alt="Logo du programme" class="wallet-card-logo"><strong>{{ program.name }}</strong></div>
            <div class="wallet-card-points"><span class="wallet-card-field-label">POINTS</span><strong>{{ cardPreview.balance }}</strong></div>
          </div>
          <div v-if="stripPreview || cardPreview.progress" class="wallet-card-banner">
            <img v-if="stripPreview" :src="stripPreview" alt="Bannière publiée" class="wallet-card-strip">
            <div v-if="cardPreview.progress" class="wallet-card-progress" role="progressbar"
              :aria-label="`Progression vers ${cardPreview.progress.rewardName}`" :aria-valuemin="0" :aria-valuenow="cardPreview.progress.value" :aria-valuemax="cardPreview.progress.max">
              <div class="wallet-card-progress-track"><div class="wallet-card-progress-fill" :style="{ width: `${cardPreview.progress.ratio * 100}%` }" /></div>
            </div>
          </div>
          <span class="wallet-card-field-label">RÉCOMPENSE</span><p class="wallet-card-reward">{{ cardPreview.rewardText }}</p>
          <p class="wallet-card-number">Carte 0000 0000 0000 0000</p>
        </div>
        <p class="text-body-2 text--secondary mt-3">Exemple avec un solde illustratif. Le client verra ses propres points, son numéro et son QR. Le rendu peut varier selon l’appareil.</p>
        <p v-if="!cardPreview.progress" class="text-body-2 text--secondary">Ajoutez une récompense active dans « Programme et offres » pour afficher la progression.</p>
        <h3 class="subtitle-1 mt-5 mb-2">Icône de notification publiée</h3>
        <img v-if="iconPreview" :src="iconPreview" alt="Icône de notification du restaurant" width="38" height="38">
        <p v-else class="text-body-2 text--secondary">Aucune icône personnalisée publiée.</p>
      </v-col>
    </v-row>
  </section>
</template>
<script>
import ImageCropper from '@/components/ImageCropper.vue'
const { buildWalletImageVariants } = require('@/helpers/loyaltyWalletImages')
const { buildWalletCardPreview } = require('@/helpers/loyaltyWalletPreview')
export default {
  components: { ImageCropper },
  props: { program: { type: Object, required: true } },
  data() { return { icon: null, logo: null, strip: null, iconPreview: '', logoPreview: '', stripPreview: '', backgroundColor: this.program.backgroundColor, foregroundColor: this.program.foregroundColor, logoUrl: this.program.logoUrl || '', publishing: false, message: '', error: '', sequence: 0 } },
  computed: {
    loyalty() { return this.$store.state.loyalty },
    working() { return this.publishing || this.loyalty.busy || this.loyalty.assetsBusy },
    cardPreview() { return buildWalletCardPreview(this.program) },
  },
  watch: { 'program.walletAssetVersion': { immediate: true, handler() { this.loadPreviews() } } },
  beforeDestroy() { this.sequence++; this.releasePreviews() },
  methods: {
    color(value) { return /^#[a-fA-F0-9]{6}$/.test(value) || 'Utilisez le format #RRGGBB' },
    releasePreviews() { for (const key of ['iconPreview', 'logoPreview', 'stripPreview']) { if (this[key]) URL.revokeObjectURL(this[key]); this[key] = '' } },
    async loadPreviews() {
      const sequence = ++this.sequence
      this.releasePreviews()
      if (!this.program.walletAssetVersion) return
      await Promise.all(['icon', 'logo', 'strip'].map(async kind => {
        const blob = await this.$store.dispatch('loyalty/loadWalletAssetPreview', `/baseurl/api/v1/loyalty/wallet/assets/${this.program.walletAssetVersion}/${kind}.png`)
        if (blob && sequence === this.sequence && !this._isDestroyed) this[`${kind}Preview`] = URL.createObjectURL(blob)
      }))
    },
    async saveStyle() {
      if (!this.$refs.styleForm.validate() || this.working) return
      this.message = ''; const result = await this.$store.dispatch('loyalty/saveProgram', { ...this.program, backgroundColor: this.backgroundColor, foregroundColor: this.foregroundColor, logoUrl: this.logoUrl })
      if (result && !this._isDestroyed) { this.$emit('saved', result); this.message = 'Carte enregistrée.' }
    },
    async publish() {
      if (this.working || (!this.icon && !this.logo && !this.strip)) return
      this.publishing = true; this.message = ''; this.error = ''
      try {
        const body = new FormData()
        for (const kind of ['icon', 'logo', 'strip']) if (this[kind]) {
          for (const file of await buildWalletImageVariants(this[kind], { kind })) body.append(file.name, file.blob, `${file.name}.png`)
        }
        const result = await this.$store.dispatch('loyalty/uploadWalletAssets', body)
        if (result && !this._isDestroyed) { this.$emit('saved', { ...this.program, walletAssetVersion: result.assetVersion }); this.message = 'Visuel publié. La mise à jour des cartes est en attente.' }
      } catch (error) { this.error = error.message }
      finally { this.publishing = false }
    },
  },
}
</script>
<style scoped>
.wallet-card-preview { max-width: 360px; padding: 20px; border: 1px solid var(--se-color-border); border-radius: 12px; overflow: hidden; }
.wallet-card-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.wallet-card-identity { display: flex; flex-direction: column; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
.wallet-card-logo { width: 88px; max-height: 36px; object-fit: contain; }
.wallet-card-points { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.wallet-card-points strong { font-size: 26px; line-height: 1.15; }
.wallet-card-field-label { display: block; font-size: 11px; letter-spacing: .06em; opacity: .85; margin-bottom: 4px; }
.wallet-card-banner { position: relative; aspect-ratio: 375 / 144; background-color: inherit; margin: 0 -20px 20px; }
.wallet-card-strip { display: block; width: 100%; height: 100%; object-fit: cover; }
.wallet-card-progress { position: absolute; inset: auto 0 0; height: 22.222222%; background: rgba(0, 0, 0, .68); }
.wallet-card-progress-track { position: absolute; left: 4.266667%; right: 4.266667%; bottom: 37.5%; height: 18.75%; border-radius: 999px; background: rgba(255, 255, 255, .22); overflow: hidden; }
.wallet-card-progress-fill { height: 100%; border-radius: inherit; background: #fff; }
.wallet-card-reward { margin: 0 0 20px; line-height: 1.45; overflow-wrap: anywhere; }
.wallet-card-number { margin: 0; font-size: 12px; text-align: center; font-variant-numeric: tabular-nums; }
</style>
