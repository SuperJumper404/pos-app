<template>
  <div class="delivery-address-input">
    <v-text-field v-model="draft.street" label="Numero et voie" autocomplete="address-line1" outlined maxlength="200" :disabled="disabled" />
    <v-row dense>
      <v-col cols="12" sm="4"><v-text-field v-model="draft.postalCode" label="Code postal" autocomplete="postal-code" inputmode="numeric" outlined maxlength="5" :disabled="disabled" /></v-col>
      <v-col cols="12" sm="8"><v-text-field v-model="draft.city" label="Ville" autocomplete="address-level2" outlined maxlength="120" :disabled="disabled" /></v-col>
    </v-row>
    <v-text-field v-model="draft.complement" label="Appartement, etage, batiment" autocomplete="address-line2" outlined maxlength="200" :disabled="disabled" />
    <v-textarea v-model="draft.instructions" label="Consignes de remise" outlined rows="2" maxlength="500" :disabled="disabled" />
    <p v-if="resolving" role="status">Validation de l'adresse...</p>
    <v-alert v-if="error" type="error" text role="alert">{{ error }}</v-alert>
    <v-list v-if="candidates.length" aria-label="Adresses proposees">
      <v-list-item v-for="candidate in candidates" :key="candidate.providerId" :disabled="disabled || resolving" @click="chooseCandidate(candidate)">
        <v-list-item-icon><v-icon>mdi-map-marker-outline</v-icon></v-list-item-icon>
        <v-list-item-content><span class="customer-wrap">{{ candidate.providerLabel }}</span></v-list-item-content>
      </v-list-item>
    </v-list>
    <p v-if="resolution" role="status"><v-icon small color="success">mdi-check-circle-outline</v-icon> Adresse validee</p>
    <v-btn v-if="error && !candidates.length" text :disabled="disabled || resolving" @click="resolve">Reessayer la validation</v-btn>
  </div>
</template>

<script>
const empty = () => ({ street: '', postalCode: '', city: '', country: 'FR', complement: '', instructions: '' })
const postal = address => Object.fromEntries(['street', 'postalCode', 'city', 'country'].map(key => [key, String(address[key] || '').trim()]))

export default {
  props: {
    value: { type: Object, default: null },
    resolver: { type: Function, required: true },
    disabled: { type: Boolean, default: false },
    contextKey: { type: [String, Number], default: '' },
  },
  data() {
    const snapshot = this.value && this.value.addressSnapshot
    return { draft: { ...empty(), ...postal(snapshot || {}), country: (snapshot && snapshot.country) || 'FR',
      complement: (snapshot && snapshot.complement) || '', instructions: (snapshot && snapshot.instructions) || '' },
    resolution: null, candidates: [], error: '', resolving: false, sequence: 0, timer: null }
  },
  computed: {
    complete() { return Boolean(this.draft.street.trim() && /^\d{5}$/.test(this.draft.postalCode) && this.draft.city.trim() && this.draft.country === 'FR') },
    unchangedPostal() { return this.value && JSON.stringify(postal(this.draft)) === JSON.stringify(postal(this.value.addressSnapshot)) },
  },
  watch: {
    draft: { deep: true, handler() { this.schedule() } },
    contextKey() { this.invalidate() },
    value() {
      this.invalidate()
      this.draft = { ...empty(), ...(this.value && this.value.addressSnapshot) }
    },
  },
  beforeDestroy() { this.invalidate() },
  methods: {
    invalidate() {
      clearTimeout(this.timer)
      this.sequence++
      this.resolution = null
      this.candidates = []
      this.error = ''
      this.resolving = false
      this.$emit('resolved', null)
    },
    schedule() {
      this.invalidate()
      if (this.complete && !this.disabled) this.timer = setTimeout(() => this.resolve(), 300)
    },
    chooseCandidate(candidate) { return this.resolve(candidate.providerId) },
    async resolve(candidateId) {
      clearTimeout(this.timer)
      if (!this.complete || this.disabled) return null
      const sequence = ++this.sequence
      this.resolution = null
      this.error = ''
      this.resolving = true
      const request = this.unchangedPostal ? { addressId: this.value.id } : {
        address: postal(this.draft), ...(typeof candidateId === 'string' ? { candidateId } : {}),
      }
      try {
        const result = await this.resolver(request)
        if (sequence !== this.sequence || this._isDestroyed || !result) return null
        this.candidates = []
        this.resolution = {
          ...result,
          addressId: this.value ? this.value.id : null,
          complement: this.draft.complement,
          instructions: this.draft.instructions,
          addressSnapshot: { ...result.addressSnapshot, complement: this.draft.complement, instructions: this.draft.instructions },
        }
        this.$emit('resolved', this.resolution)
        return this.resolution
      } catch (error) {
        if (sequence !== this.sequence || this._isDestroyed) return null
        this.error = error.message || 'Adresse indisponible. Reessayez.'
        this.candidates = error.candidates || []
        return null
      } finally {
        if (sequence === this.sequence) this.resolving = false
      }
    },
  },
}
</script>

<style scoped>
.delivery-address-input { min-width: 0; }
.delivery-address-input .v-list-item { min-height: 44px; }
.delivery-address-input .customer-wrap { overflow-wrap: anywhere; }
</style>
