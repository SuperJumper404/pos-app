<template>
  <div class="delivery-address-input">
    <v-autocomplete
      :value="googleChoice" :search-input.sync="query" :items="suggestions" item-text="label" item-value="placeId"
      return-object no-filter clearable outlined label="Adresse" autocomplete="off" maxlength="255"
      :disabled="disabled" :loading="searching || resolving" :menu-props="{ maxHeight: 320, contentClass: 'delivery-address-menu' }"
      :no-data-text="searching ? 'Recherche en cours...' : searched ? 'Aucune adresse trouvee' : 'Adresse'"
      @change="chooseSuggestion"
    >
      <template #item="{ item }"><v-icon class="mr-3">mdi-map-marker-outline</v-icon><span class="customer-wrap">{{ item.label }}</span></template>
      <template #append-item><div class="google-attribution"><img src="/google-maps-attribution.png" alt="Google Maps" height="18"></div></template>
    </v-autocomplete>
    <div v-if="googleChoice || (value && value.addressSnapshot && value.addressSnapshot.provider === 'google_places')" class="google-attribution"><img src="/google-maps-attribution.png" alt="Google Maps" height="18"></div>
    <v-expansion-panels flat>
      <v-expansion-panel>
        <v-expansion-panel-header>Complement et consignes</v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-text-field v-model="draft.complement" label="Appartement, etage, batiment" autocomplete="address-line2" outlined maxlength="200" :disabled="disabled" />
          <v-textarea v-model="draft.instructions" label="Consignes de remise" outlined rows="2" maxlength="500" :disabled="disabled" />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <p v-if="resolving" role="status">Validation de l'adresse...</p>
    <v-alert v-if="error" type="error" text role="alert">{{ error }}</v-alert>
    <v-list v-if="candidates.length" aria-label="Adresses proposees">
      <v-list-item v-for="candidate in candidates" :key="candidate.providerId" :disabled="disabled || resolving" @click="chooseCandidate(candidate)">
        <v-list-item-icon><v-icon>mdi-map-marker-outline</v-icon></v-list-item-icon>
        <v-list-item-content><span class="customer-wrap">{{ candidate.providerLabel }}</span></v-list-item-content>
      </v-list-item>
    </v-list>
    <p v-if="resolution" role="status"><v-icon small color="success">mdi-check-circle-outline</v-icon> Adresse validee</p>
    <v-btn v-if="error && !candidates.length" text :disabled="disabled || resolving || searching" @click="retry"><v-icon left>mdi-refresh</v-icon>Reessayer</v-btn>
  </div>
</template>

<script>
const { v4: sessionKey } = require('uuid')
const empty = () => ({ street: '', postalCode: '', city: '', country: 'FR', complement: '', instructions: '' })
const postal = address => Object.fromEntries(['street', 'postalCode', 'city', 'country'].map(key => [key, String(address[key] || '').trim()]))

export default {
  props: {
    value: { type: Object, default: null },
    resolver: { type: Function, required: true },
    suggester: { type: Function, default: null },
    disabled: { type: Boolean, default: false },
    contextKey: { type: [String, Number], default: '' },
  },
  data() {
    const snapshot = this.value && this.value.addressSnapshot
    return { draft: { ...empty(), ...postal(snapshot || {}), country: (snapshot && snapshot.country) || 'FR',
      complement: (snapshot && snapshot.complement) || '', instructions: (snapshot && snapshot.instructions) || '' },
    query: snapshot ? [snapshot.street, snapshot.postalCode, snapshot.city].filter(Boolean).join(', ') : '',
    googleChoice: null, suggestions: [], searching: false, searched: false, sessionToken: null, syncing: false, postalEdited: false, expiryTimer: null,
    resolution: null, candidates: [], selectedCandidate: null, error: '', resolving: false, sequence: 0, timer: null }
  },
  computed: {
    complete() { return Boolean(this.draft.street.trim() && /^\d{5}$/.test(this.draft.postalCode) && this.draft.city.trim() && this.draft.country === 'FR') },
    unchangedPostal() { return !this.postalEdited && this.value && (this.value.addressSnapshot.provider === 'google_places' || JSON.stringify(postal(this.draft)) === JSON.stringify(postal(this.value.addressSnapshot))) },
    postalKey() { return JSON.stringify(postal(this.draft)) },
    currentCandidateId() {
      return this.selectedCandidate && this.selectedCandidate.postalKey === this.postalKey && this.selectedCandidate.contextKey === this.contextKey
        ? this.selectedCandidate.id : null
    },
  },
  watch: {
    draft: { deep: true, handler() {
      if (this.syncing) return
      const pending = this.pendingResolution
      if (this.resolving && pending && pending.sequence === this.sequence && pending.contextKey === this.contextKey && pending.postalKey === this.postalKey) return
      if (this.resolution && (this.googleChoice || this.unchangedPostal) && this.postalKey === JSON.stringify(postal(this.resolution.addressSnapshot))) { this.applyPrivate(); return }
      this.schedule()
    } },
    query() { if (!this.syncing && (!this.googleChoice || this.query !== this.googleChoice.label)) { this.postalEdited = true; this.scheduleSearch() } },
    disabled(value) { if (value) { clearTimeout(this.timer); this.sequence++; this.syncing = false; this.searching = false; this.resolving = false; this.suggestions = [] } },
    contextKey() {
      this.invalidate(); this.sessionToken = null; this.postalEdited = true; this.syncing = true
      this.draft = empty(); this.query = ''
      this.$nextTick(() => { this.syncing = false })
    },
    value() {
      this.invalidate()
      this.postalEdited = false
      this.draft = { ...empty(), ...(this.value && this.value.addressSnapshot) }
      this.syncing = true
      this.query = this.value ? [this.draft.street, this.draft.postalCode, this.draft.city].filter(Boolean).join(', ') : ''
      this.$nextTick(() => { this.syncing = false })
    },
  },
  beforeDestroy() { this.invalidate() },
  methods: {
    invalidate(keepCandidate = false) {
      clearTimeout(this.timer)
      clearTimeout(this.expiryTimer)
      this.sequence++
      this.resolution = null
      this.candidates = []
      if (!keepCandidate) this.selectedCandidate = null
      this.error = ''
      this.resolving = false
      this.searching = false
      this.suggestions = []
      this.googleChoice = null
      this.$emit('resolved', null)
    },
    applyPrivate() {
      if (!this.resolution) return null
      this.resolution = { ...this.resolution, complement: this.draft.complement, instructions: this.draft.instructions,
        addressSnapshot: { ...this.resolution.addressSnapshot, complement: this.draft.complement, instructions: this.draft.instructions } }
      this.$emit('resolved', this.resolution)
      return this.resolution
    },
    scheduleSearch() {
      const previousChoice = this.googleChoice
      const query = this.query
      this.invalidate()
      if (previousChoice) {
        // Vuetify clears search on its next tick when the selected model is removed.
        const sequence = this.sequence
        this.syncing = true
        this.$nextTick(() => setTimeout(() => {
          if (sequence !== this.sequence || this._isDestroyed) return
          if (!this.query) this.query = query
          this.$nextTick(() => { if (sequence === this.sequence) this.syncing = false })
        }, 0))
      }
      this.searched = false
      if (this.suggester && !this.disabled && this.query && this.query.trim().length >= 3) this.timer = setTimeout(() => this.search(), 300)
    },
    async search() {
      clearTimeout(this.timer)
      if (!this.suggester || this.disabled || this._isDestroyed || !this.query || this.query.trim().length < 3) return
      const sequence = ++this.sequence
      const { query, contextKey } = this
      const current = () => sequence === this.sequence && contextKey === this.contextKey && query === this.query && !this._isDestroyed && !this.disabled
      if (!this.sessionToken) this.sessionToken = sessionKey()
      this.searching = true
      this.error = ''
      try {
        const result = await this.suggester({ input: query.trim(), sessionToken: this.sessionToken })
        if (current()) { this.suggestions = result && Array.isArray(result.suggestions) ? result.suggestions.slice(0, 5) : []; this.searched = true }
      } catch (error) { if (current()) this.error = error.message || 'Recherche d\'adresse indisponible. Reessayez.' }
      finally { if (current()) this.searching = false }
    },
    async chooseSuggestion(choice) {
      this.invalidate()
      this.sessionToken = null
      if (!choice || typeof choice.selectionToken !== 'string' || this.disabled) return null
      this.syncing = true
      this.googleChoice = choice
      this.suggestions = [choice]
      this.query = choice.label
      await this.$nextTick()
      this.syncing = false
      return this.resolve()
    },
    retry() { if (this.suggester && this.query) { this.sessionToken = null; return this.search() } return this.resolve() },
    schedule() {
      this.invalidate(Boolean(this.currentCandidateId))
      if (this.complete && !this.disabled) this.timer = setTimeout(() => this.resolve(), 300)
    },
    chooseCandidate(candidate) { return this.resolve(candidate.providerId) },
    resolve(candidateId) {
      const pending = this.pendingResolution
      if (pending && pending.sequence === this.sequence && pending.contextKey === this.contextKey &&
        pending.postalKey === this.postalKey && pending.query === this.query && pending.candidateId === candidateId && !this.disabled) return pending.promise
      const promise = this.performResolve(candidateId)
      const record = { sequence: this.sequence, contextKey: this.contextKey, postalKey: this.postalKey, query: this.query, candidateId }
      record.promise = promise.finally(() => { if (this.pendingResolution === record) this.pendingResolution = null })
      this.pendingResolution = record
      return record.promise
    },
    async performResolve(candidateId) {
      clearTimeout(this.timer)
      if (this.disabled || this._isDestroyed) return null
      const choice = this.googleChoice
      if ((choice || this.unchangedPostal) && this.resolution && Date.parse(this.resolution.expiresAt) > Date.now()) return this.applyPrivate()
      if (choice && this.resolution) { this.invalidate(); this.error = 'Validez de nouveau cette adresse.'; return null }
      if ((!this.complete && !(this.value && this.value.id && this.unchangedPostal) && !choice) || this.disabled || this._isDestroyed) return null
      if (!choice && this.suggester && this.query && !this.unchangedPostal) return null
      const sequence = ++this.sequence
      const { postalKey, contextKey } = this
      const selectedId = typeof candidateId === 'string' ? candidateId : this.currentCandidateId
      const current = () => sequence === this.sequence && !this._isDestroyed && postalKey === this.postalKey && contextKey === this.contextKey
      this.resolution = null
      this.error = ''
      this.resolving = true
      const request = choice ? { selectionToken: choice.selectionToken } : this.unchangedPostal ? { addressId: this.value.id } : {
        address: postal(this.draft), ...(selectedId ? { candidateId: selectedId } : {}),
      }
      try {
        const result = await this.resolver(request)
        if (!current() || !result) return null
        if (choice || (this.value && this.value.addressSnapshot.provider === 'google_places')) {
          this.syncing = true
          this.draft = { ...this.draft, ...postal(result.addressSnapshot) }
          if (!choice) this.query = [this.draft.street, this.draft.postalCode, this.draft.city].filter(Boolean).join(', ')
          await this.$nextTick()
          this.syncing = false
          if (sequence !== this.sequence || this._isDestroyed || contextKey !== this.contextKey) return null
        }
        this.candidates = []
        this.selectedCandidate = selectedId && !request.addressId ? { id: selectedId, postalKey, contextKey } : null
        this.resolution = {
          ...result,
          addressId: this.value ? this.value.id : null,
          complement: this.draft.complement,
          instructions: this.draft.instructions,
          addressSnapshot: { ...result.addressSnapshot, complement: this.draft.complement, instructions: this.draft.instructions },
        }
        this.$emit('resolved', this.resolution)
        if (choice || (this.value && this.value.addressSnapshot.provider === 'google_places')) {
          const ttl = Math.max(0, Math.min(900000, Date.parse(result.expiresAt) - Date.now()))
          this.expiryTimer = setTimeout(() => { this.invalidate(); this.error = 'Validez de nouveau cette adresse.' }, ttl)
        }
        return this.resolution
      } catch (error) {
        if (!current()) return null
        this.error = error.message || 'Adresse indisponible. Reessayez.'
        if (choice) this.googleChoice = null
        this.candidates = error.candidates || []
        if (this.candidates.length) this.selectedCandidate = null
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
.google-attribution { padding: 10px 10px 5px; min-height: 33px; text-align: right; }
.google-attribution img { width: auto; max-width: 100%; display: inline-block; }
.delivery-address-input ::v-deep .v-expansion-panel-header { min-height: 44px; padding: 12px 0; }
.delivery-address-input ::v-deep .v-expansion-panel-content__wrap { padding: 0; }
</style>

<style>
.delivery-address-menu .customer-wrap { white-space: normal; overflow-wrap: anywhere; padding: 10px 0; }
.delivery-address-menu .v-list-item { min-height: 48px; }
</style>
