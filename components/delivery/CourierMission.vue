<template>
  <v-card outlined class="courier-mission">
    <v-card-title class="courier-mission-heading">
      <h3>{{ mission.orderReference }}</h3><v-chip small :color="statusColor" label>{{ statusLabel }}</v-chip>
    </v-card-title>
    <v-card-text>
      <template v-if="!closed">
        <p v-if="mission.contactSnapshot" class="courier-recipient">{{ mission.contactSnapshot.name }}</p>
        <p v-if="address" class="courier-address">{{ address }}</p>
        <CustomerAddressSummary v-else-if="mission.addressSnapshot && mission.addressSnapshot.provider === 'google_places'"
                                :value="{ id: mission.id, label: 'Adresse de livraison', addressSnapshot: mission.addressSnapshot }" :loader="loadAddress" :context-key="$store.state.courier.identity || ''" />
        <div v-if="address && mission.addressSnapshot && mission.addressSnapshot.provider === 'google_places'" class="courier-google-attribution"><img src="/google-maps-attribution.png" alt="Google Maps" height="18"></div>
        <dl v-if="mission.addressSnapshot" class="courier-access">
          <div v-for="field in accessFields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ mission.addressSnapshot[field.key] }}</dd></div>
        </dl>
        <div class="courier-links">
          <v-btn v-if="phoneUrl" :href="phoneUrl" outlined><v-icon left>mdi-phone-outline</v-icon>Appeler</v-btn>
          <v-btn v-if="mapsUrl" :href="mapsUrl" target="_blank" rel="noopener noreferrer" outlined><v-icon left>mdi-directions</v-icon>Itineraire</v-btn>
        </div>
        <ul v-if="mission.items && mission.items.length" class="courier-items">
          <li v-for="(item, index) in mission.items" :key="index">
            <span>{{ item.quantity }} × {{ item.name }}</span>
            <small v-for="(choice, choiceIndex) in item.customizations" :key="choiceIndex">{{ choice.step }} : {{ choice.choice }}</small>
          </li>
        </ul>
        <v-alert v-if="mission.deliveryStatus === 'issue'" type="warning" text>Intervention du restaurant en cours.</v-alert>
        <p v-if="mission.deliveryStatus === 'assigned' && Number(mission.preparationStatus) !== 3">Preparation en cours.</p>
      </template>
      <CourierPayment :key="mission.id" :mission="mission" />
      <div v-if="!closed" class="courier-mission-actions">
        <v-btn v-if="can('pickup')" color="primary" :loading="busy" :disabled="blocked" data-action="pickup" @click="command('pickup')"><v-icon left>mdi-package-variant-closed-check</v-icon>Recuperer</v-btn>
        <v-btn v-if="can('deliver')" color="primary" :loading="busy" :disabled="blocked" data-action="deliver" @click="command('deliver')"><v-icon left>mdi-check</v-icon>Confirmer la livraison</v-btn>
        <v-btn v-if="can('reportIssue')" outlined :disabled="blocked" data-action="issue" @click="issueOpen = !issueOpen"><v-icon left>mdi-alert-outline</v-icon>Signaler un probleme</v-btn>
      </div>
      <div v-if="issueOpen && !closed && mission.deliveryStatus !== 'issue'" class="courier-issue">
        <v-textarea v-model="reason" label="Motif du probleme" :maxlength="1000" :disabled="blocked" rows="2" auto-grow outlined hide-details />
        <v-btn color="warning" :loading="busy" :disabled="blocked || !reason.trim()" data-action="report-issue" @click="reportIssue"><v-icon left>mdi-send-outline</v-icon>Confirmer le signalement</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import CourierPayment from '@/components/delivery/CourierPayment.vue'
import CustomerAddressSummary from '@/components/customer/CustomerAddressSummary.vue'
export default {
  components: { CourierPayment, CustomerAddressSummary },
  props: { mission: { type: Object, required: true } },
  data: () => ({ issueOpen: false, reason: '' }),
  computed: {
    closed() { return ['delivered', 'failed', 'canceled'].includes(this.mission.deliveryStatus) },
    busy() { return Boolean(this.$store.state.courier.busy[this.mission.id]) },
    blocked() { return this.busy || Boolean(this.$store.state.courier.pending[this.mission.id]) },
    statusLabel() { return { assigned: 'A recuperer', in_transit: 'En livraison', issue: 'Probleme', delivered: 'Livree', failed: 'Echec', canceled: 'Annulee' }[this.mission.deliveryStatus] || 'Indisponible' },
    statusColor() { return { issue: 'warning', delivered: 'success', failed: 'error', canceled: 'grey' }[this.mission.deliveryStatus] || 'primary' },
    address() { const row = this.mission.addressSnapshot; return row && [row.street || row.line1, row.postalCode, row.city, row.country].filter(Boolean).join(', ') || '' },
    accessFields() { return [{ key: 'complement', label: 'Complement' }, { key: 'apartment', label: 'Appartement' }, { key: 'building', label: 'Batiment' },
      { key: 'floor', label: 'Etage' }, { key: 'intercom', label: 'Interphone' }, { key: 'instructions', label: 'Consignes' }].filter(field => this.mission.addressSnapshot && this.mission.addressSnapshot[field.key]) },
    phoneUrl() {
      const raw = this.mission.contactSnapshot && this.mission.contactSnapshot.phone
      if (this.closed || typeof raw !== 'string' || !/^\+?[\d\s().-]{6,30}$/.test(raw)) return null
      const phone = raw.replace(/[\s().-]/g, '')
      return /^\+?\d{6,15}$/.test(phone) ? `tel:${encodeURIComponent(phone)}` : null
    },
    mapsUrl() {
      if (this.closed) return null
      const row = this.mission.addressSnapshot
      if (row && row.provider === 'google_places' && row.placeId) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(this.address || 'Livraison')}&destination_place_id=${encodeURIComponent(row.placeId)}`
      return this.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(this.address)}` : null
    },
  },
  methods: {
    async loadAddress() {
      if (this.closed) return null
      const result = await this.$store.dispatch('courier/read', { resource: 'detail', deliveryId: this.mission.id })
      return result && result.addressSnapshot ? { addressSnapshot: result.addressSnapshot, displayStatus: result.addressDisplayStatus || 'ready' } : null
    },
    can(action) { return this.mission.deliveryStatus !== 'issue' && this.mission.acceptanceStatus === 'accepted' &&
      (this.mission.allowedActions || []).includes(action) && (action !== 'pickup' || Number(this.mission.preparationStatus) === 3) },
    command(action) { return this.$store.dispatch(`courier/${action}`, { deliveryId: this.mission.id }) },
    async reportIssue() {
      const result = await this.$store.dispatch('courier/reportIssue', { deliveryId: this.mission.id, reason: this.reason })
      if (result) { this.reason = ''; this.issueOpen = false }
    },
  },
}
</script>

<style scoped>
.courier-mission { min-width: 0; border-radius: 8px; }
.courier-google-attribution { padding: 10px 10px 5px; }
.courier-mission-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.courier-mission-heading h3 { font-size: 18px; font-weight: 600; overflow-wrap: anywhere; line-height: 1.4; min-width: 0; }
.courier-mission p, .courier-access dd, .courier-items li { overflow-wrap: anywhere; }
.courier-recipient { font-weight: 600; margin-bottom: 4px; }
.courier-access { margin-bottom: 16px; }
.courier-access > div { margin-bottom: 8px; }
.courier-access dt { font-weight: 600; }
.courier-access dd { margin: 0; white-space: pre-wrap; }
.courier-links, .courier-mission-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.courier-items { padding-left: 20px; margin: 16px 0; }
.courier-items small { display: block; }
.courier-issue { display: grid; gap: 12px; margin-top: 16px; }
</style>
