<template>
  <div class="address-summary" :aria-busy="status === 'loading'">
    <p v-if="addressText">{{ addressText }}</p>
    <p v-else-if="status === 'loading'" role="status">Chargement de l'adresse...</p>
    <p v-else-if="status === 'unavailable' || status === 'invalid'" role="status">
      Adresse indisponible
      <v-btn icon :loading="status === 'loading'" aria-label="Reessayer cette adresse" title="Reessayer cette adresse" @click.stop="load"><v-icon>mdi-refresh</v-icon></v-btn>
    </p>
    <p v-else>{{ value.label || 'Adresse' }}</p>
    <div v-if="snapshot.provider === 'google_places' && addressText" class="address-attribution"><img src="/google-maps-attribution.png" alt="Google Maps" height="18"></div>
  </div>
</template>

<script>
export default {
  props: { value: { type: Object, required: true }, loader: { type: Function, required: true }, contextKey: { type: [String, Number], default: '' } },
  data: () => ({ display: null, status: '', sequence: 0, observer: null }),
  computed: {
    snapshot() { return this.display || this.value.addressSnapshot || {} },
    addressText() { return [this.snapshot.street || this.snapshot.line1, this.snapshot.postalCode, this.snapshot.city].filter(Boolean).join(', ') },
    sourceKey() { const row = this.value.addressSnapshot || {}; return JSON.stringify([this.value.id, row.provider, row.placeId, row.street, row.postalCode, row.city]) },
  },
  watch: { contextKey() { this.reset() }, sourceKey() { this.reset() } },
  mounted() { this.observe() },
  beforeDestroy() { this.sequence++; if (this.observer) this.observer.disconnect() },
  methods: {
    reset() { this.sequence++; this.display = null; this.status = ''; if (this.observer) this.observer.disconnect(); this.$nextTick(() => this.observe()) },
    observe() {
      if (!this._isMounted || this._isDestroyed || this.snapshot.provider !== 'google_places' || this.addressText) return
      if (typeof IntersectionObserver === 'undefined') { this.load(); return }
      this.observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { this.observer.disconnect(); this.load() }
      })
      this.observer.observe(this.$el)
    },
    async load() {
      if (this.status === 'loading' || this._isDestroyed) return
      const sequence = ++this.sequence
      const { contextKey, sourceKey } = this
      const current = () => sequence === this.sequence && contextKey === this.contextKey && sourceKey === this.sourceKey && !this._isDestroyed
      this.status = 'loading'
      try {
        const result = await this.loader(this.value)
        if (!current()) return
        this.display = result && result.addressSnapshot || null
        this.status = result && result.displayStatus || (this.display && this.display.street ? 'ready' : 'unavailable')
      } catch (_) { if (current()) this.status = 'unavailable' }
    },
  },
}
</script>

<style scoped>
.address-summary { min-width: 0; overflow-wrap: anywhere; white-space: normal; }
.address-summary p { margin-bottom: 4px; }
.address-summary .v-btn { min-width: 44px; min-height: 44px; }
.address-attribution { padding: 10px 10px 5px; }
.address-attribution img { width: auto; max-width: 100%; }
</style>
