<template>
  <section aria-label="Reglages livraison">
    <v-progress-linear v-if="!form" indeterminate />
    <v-form v-else @submit.prevent="save">
      <v-switch v-model="form.enabled" label="Accepter de nouvelles livraisons" :disabled="saving" />
      <v-alert v-if="!form.enabled" type="info" text>Les missions deja acceptees continuent pendant la suspension.</v-alert>
      <h2>Depart du restaurant</h2>
      <p v-if="form.origin && form.origin.provider === 'google_places'"><v-icon small color="success">mdi-map-marker-check-outline</v-icon> Adresse du restaurant validee</p>
      <p v-else-if="form.origin">Position validee : {{ form.origin.latitude }}, {{ form.origin.longitude }}</p>
      <v-btn text :disabled="saving" @click="editingOrigin = !editingOrigin"><v-icon left>mdi-map-marker-edit-outline</v-icon>{{ editingOrigin ? 'Conserver la position precedente' : 'Valider une nouvelle adresse' }}</v-btn>
      <DeliveryAddressInput v-if="editingOrigin" :resolver="resolveOrigin" :suggester="suggestAddresses" :disabled="saving" :context-key="operator.identity" @resolved="onResolved" />
      <h2 class="mt-6">Tarification</h2>
      <v-row dense class="mt-2">
        <v-col cols="12" sm="6"><v-text-field v-model.number="form.maxDistanceMeters" type="number" min="0" step="1" label="Rayon maximal (metres)" outlined dense :disabled="saving" /></v-col>
        <v-col cols="12" sm="6"><v-text-field :value="euros(form.minimumItemsCents)" inputmode="decimal" label="Minimum produits TTC (EUR)" outlined dense :disabled="saving" @input="form.minimumItemsCents = cents($event)" /></v-col>
      </v-row>
      <div v-for="(band, index) in form.bands" :key="index" class="fee-band">
        <v-text-field v-model.number="band.upToMeters" type="number" min="1" step="1" :label="`Palier ${index + 1} : jusqu'a (metres)`" outlined dense :disabled="saving" />
        <v-text-field :value="euros(band.feeCents)" inputmode="decimal" label="Frais TTC (EUR)" outlined dense :disabled="saving" @input="band.feeCents = cents($event)" />
        <v-btn icon :disabled="saving" title="Supprimer ce palier" aria-label="Supprimer ce palier" @click="form.bands.splice(index, 1)"><v-icon>mdi-delete-outline</v-icon></v-btn>
      </div>
      <v-btn text :disabled="saving || form.bands.length >= 100" @click="form.bands.push({ upToMeters: null, feeCents: 0 })"><v-icon left>mdi-plus</v-icon>Ajouter un palier</v-btn>
      <v-select v-model="form.fiscalPolicy.vatRate" :items="vatRates" label="TVA explicite des frais" clearable outlined dense class="mt-4" :disabled="saving" />
      <v-switch v-model="form.freeDeliveryEnabled" label="Activer la gratuite a partir d'un seuil" :disabled="saving" />
      <v-text-field v-if="form.freeDeliveryEnabled" :value="euros(form.freeDeliveryThresholdCents)" inputmode="decimal" label="Seuil produits TTC pour la gratuite (EUR)" outlined dense :disabled="saving" @input="form.freeDeliveryThresholdCents = cents($event)" />
      <v-alert v-if="validationError" type="warning" text>{{ validationError }}</v-alert>
      <v-alert v-if="saved" type="success" text>Reglages enregistres, revision {{ saved }}.</v-alert>
      <v-btn color="primary" type="submit" :loading="saving" :disabled="Boolean(validationError) || saving"><v-icon left>mdi-content-save-outline</v-icon>Enregistrer les reglages</v-btn>
    </v-form>
  </section>
</template>

<script>
import DeliveryAddressInput from '@/components/delivery/DeliveryAddressInput.vue'
const { isDeliveryAdmin } = require('@/helpers/staffRoles')
const clone = value => JSON.parse(JSON.stringify(value))
const validCents = value => Number.isSafeInteger(value) && value >= 0
export default {
  components: { DeliveryAddressInput },
  data: () => ({ form: null, saving: false, saved: null, editingOrigin: false, originResolution: null,
    vatRates: [{ text: '5,5 %', value: 5.5 }, { text: '10 %', value: 10 }, { text: '20 %', value: 20 }] }),
  computed: {
    operator() { return this.$store.state.delivery.operator },
    settings() { return this.operator.settings },
    validationError() {
      const value = this.form
      if (!value) return 'Chargement des reglages.'
      if (!Number.isInteger(value.maxDistanceMeters) || value.maxDistanceMeters < 0 || value.maxDistanceMeters > 4294967295 || !validCents(value.minimumItemsCents)) return 'Renseignez un rayon entier et un minimum positif ou nul.'
      if (value.freeDeliveryEnabled && !validCents(value.freeDeliveryThresholdCents)) return 'Renseignez le seuil de gratuite.'
      const point = value.origin
      if (point && (point.provider === 'google_places' ? !point.placeId : !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180)) return 'Validez la position du restaurant.'
      if (value.fiscalPolicy.mode !== 'configured_rate' || (value.fiscalPolicy.vatRate !== null && ![5.5, 10, 20].includes(value.fiscalPolicy.vatRate))) return 'Selectionnez la TVA des frais.'
      let previous = 0
      for (const band of value.bands) {
        if (!Number.isInteger(band.upToMeters) || band.upToMeters <= previous || band.upToMeters > value.maxDistanceMeters || !validCents(band.feeCents)) return 'Les paliers doivent etre croissants, couvrir le rayon et avoir des frais TTC valides.'
        previous = band.upToMeters
      }
      if (value.bands.length && previous !== value.maxDistanceMeters) return 'Le dernier palier doit atteindre exactement le rayon maximal.'
      if (value.enabled && (!point || !value.maxDistanceMeters || !value.bands.length || value.fiscalPolicy.vatRate === null)) return 'Avant activation, validez la position, le rayon, les paliers et la TVA explicite des frais.'
      if (this.editingOrigin && !this.originResolution) return 'Validez la nouvelle adresse ou conservez la position precedente.'
      return ''
    },
  },
  watch: {
    settings: { immediate: true, handler(value) { if (value) this.useSettings(value) } },
    editingOrigin(value) { if (!value && this.settings) { this.form.origin = clone(this.settings.origin); this.originResolution = null } },
  },
  methods: {
    useSettings(value) { this.form = clone(value); this.originResolution = null; this.saved = null; this.editingOrigin = false },
    euros(value) { return validCents(value) ? (value / 100).toFixed(2) : '' },
    cents(value) { const text = String(value).replace(',', '.'); if (!/^\d+(\.\d{1,2})?$/.test(text)) return null; const [whole, part = ''] = text.split('.'); const amount = Number(whole) * 100 + Number(part.padEnd(2, '0')); return validCents(amount) ? amount : null },
    resolveOrigin(payload) { return this.$store.dispatch('delivery/resolveAddress', { ...payload, personal: false }) },
    suggestAddresses(payload) { return this.$store.dispatch('delivery/suggestAddresses', { ...payload, personal: false }) },
    onResolved(value) { this.originResolution = value; if (value) this.form.origin = value.addressSnapshot.provider === 'google_places'
      ? { provider: 'google_places', placeId: value.addressSnapshot.placeId } : { latitude: value.addressSnapshot.latitude, longitude: value.addressSnapshot.longitude } },
    async save() {
      if (!isDeliveryAdmin(this.$store.state.users.user) || this.validationError || this.saving) return
      this.saving = true; this.saved = null
      const payload = clone(this.form)
      if (!payload.freeDeliveryEnabled) payload.freeDeliveryThresholdCents = null
      if (this.originResolution) payload.originResolutionToken = this.originResolution.addressResolutionToken
      const result = await this.$store.dispatch('delivery/operatorSaveSettings', payload)
      if (result) { this.useSettings(result); this.saved = result.revision }
      this.saving = false
    },
  },
}
</script>

<style scoped>
section { max-width: 960px; }
h2 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.fee-band { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 44px; gap: 12px; }
@media (max-width: 480px) { .fee-band { grid-template-columns: minmax(0, 1fr) 44px; } .fee-band .v-input:first-child { grid-column: 1 / -1; } }
</style>
