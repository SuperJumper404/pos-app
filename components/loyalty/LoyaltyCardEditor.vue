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
          <v-text-field v-model="logoUrl" outlined dense label="Logo en ligne (URL HTTPS facultative)" type="url" :disabled="working" />
          <v-btn type="submit" outlined class="text-none mb-6" :loading="loyalty.busy" :disabled="working">Enregistrer la carte</v-btn>
        </v-form>
        <h2 class="text-h6 mb-3">Visuels Apple Wallet</h2>
        <p>Importez une image PNG ou JPEG, puis validez son recadrage. Vous pouvez changer le logo et la bannière séparément.</p>
        <h3 class="subtitle-1 mb-2">Logo</h3>
        <ImageCropper v-model="logo" :ratio="160 / 50" output-mime-type="image/png" />
        <h3 class="subtitle-1 mt-5 mb-2">Bannière de la carte</h3>
        <ImageCropper v-model="strip" :ratio="375 / 144" output-mime-type="image/png" />
        <v-btn color="primary" class="text-none mt-4" :disabled="working || (!logo && !strip)" :loading="publishing" @click="publish">Publier le visuel</v-btn>
      </v-col>
      <v-col cols="12" md="5">
        <h2 class="text-h6 mb-4">Aperçu de la carte</h2>
        <div class="wallet-card-preview" :style="{ backgroundColor, color: foregroundColor }">
          <div class="d-flex align-center mb-4"><img v-if="logoPreview" :src="logoPreview" alt="Logo du programme" class="wallet-card-logo mr-3"><strong>{{ program.name }}</strong></div>
          <img v-if="stripPreview" :src="stripPreview" alt="Bannière publiée" class="wallet-card-strip mb-4">
          <p class="text-h5 mb-1">0 points</p><p class="mb-0">Carte 0000 0000 0000 0000</p>
        </div>
        <p class="text-body-2 text--secondary mt-3">Exemple de présentation. Le client verra ses propres points, son numéro et son QR. Le rendu peut varier selon l’appareil.</p>
      </v-col>
    </v-row>
  </section>
</template>
<script>
import ImageCropper from '@/components/ImageCropper.vue'
const { buildWalletImageVariants } = require('@/helpers/loyaltyWalletImages')
export default {
  components: { ImageCropper },
  props: { program: { type: Object, required: true } },
  data() { return { logo: null, strip: null, logoPreview: '', stripPreview: '', backgroundColor: this.program.backgroundColor, foregroundColor: this.program.foregroundColor, logoUrl: this.program.logoUrl || '', publishing: false, message: '', error: '', sequence: 0 } },
  computed: { loyalty() { return this.$store.state.loyalty }, working() { return this.publishing || this.loyalty.busy || this.loyalty.assetsBusy } },
  watch: { 'program.walletAssetVersion': { immediate: true, handler() { this.loadPreviews() } } },
  beforeDestroy() { this.sequence++; this.releasePreviews() },
  methods: {
    color(value) { return /^#[a-fA-F0-9]{6}$/.test(value) || 'Utilisez le format #RRGGBB' },
    releasePreviews() { for (const key of ['logoPreview', 'stripPreview']) { if (this[key]) URL.revokeObjectURL(this[key]); this[key] = '' } },
    async loadPreviews() {
      const sequence = ++this.sequence
      this.releasePreviews()
      if (!this.program.walletAssetVersion) return
      await Promise.all(['logo', 'strip'].map(async kind => {
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
      if (this.working || (!this.logo && !this.strip)) return
      this.publishing = true; this.message = ''; this.error = ''
      try {
        const body = new FormData()
        for (const kind of ['logo', 'strip']) if (this[kind]) {
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
.wallet-card-preview { max-width: 360px; padding: 24px; border: 1px solid var(--se-color-border); border-radius: 12px; overflow: hidden; }
.wallet-card-logo { width: 100px; max-height: 40px; object-fit: contain; }
.wallet-card-strip { display: block; width: 100%; height: auto; }
</style>
