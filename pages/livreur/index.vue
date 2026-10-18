<template>
  <v-container class="courier-workspace">
    <header class="courier-heading">
      <h1>Mes missions</h1>
      <v-btn icon :loading="refreshing" title="Actualiser les missions et le solde" aria-label="Actualiser les missions et le solde" @click="refresh"><v-icon>mdi-refresh</v-icon></v-btn>
    </header>
    <v-alert v-if="courier.error" type="error" text role="alert">{{ courier.error }}</v-alert>
    <template v-if="scopeReady">
      <section class="courier-availability" aria-label="Disponibilite">
        <v-switch :input-value="courier.available === true" :disabled="courier.available === null || availabilityBusy" :loading="availabilityBusy" hide-details
                  :label="courier.available === null ? 'Disponibilite inconnue' : courier.available ? 'Disponible' : 'Indisponible'" @change="setAvailability" />
      </section>
      <v-alert v-if="courier.recoveryError" type="error" text role="alert">{{ courier.recoveryError }}</v-alert>
      <section v-if="pendingEntries.length" class="courier-recovery" aria-label="Actions a verifier">
        <h2>Actions a verifier</h2>
        <div v-for="entry in pendingEntries" :key="entry.deliveryId" class="courier-recovery-row">
          <span>Mission {{ entry.deliveryId }}</span>
          <v-btn outlined :loading="Boolean(courier.busy[entry.deliveryId])" :disabled="Boolean(courier.busy[entry.deliveryId])" @click="recover(entry)">
            <v-icon left>mdi-refresh</v-icon>{{ entry.pending.operation === 'collectPayment' ? "Verifier l'encaissement" : "Verifier l'action" }}
          </v-btn>
        </div>
      </section>
      <v-skeleton-loader v-if="refreshing && !courier.missions.length" type="list-item-three-line, list-item-three-line" />
      <p v-else-if="!activeMissions.length" class="courier-empty">Aucune mission en cours.</p>
      <div v-if="activeMissions.length" class="courier-missions">
        <div v-for="(mission, index) in activeMissions" :key="`${actorKey}:${mission.id}`" class="courier-mission-row">
          <div class="courier-order" aria-label="Ordre de passage">
            <v-btn icon :disabled="index === 0 || missionBusy" title="Monter la mission" aria-label="Monter la mission" @click="reorder(mission.id, -1)"><v-icon>mdi-arrow-up</v-icon></v-btn>
            <v-btn icon :disabled="index === activeMissions.length - 1 || missionBusy" title="Descendre la mission" aria-label="Descendre la mission" @click="reorder(mission.id, 1)"><v-icon>mdi-arrow-down</v-icon></v-btn>
          </div>
          <CourierMission :mission="mission" />
        </div>
      </div>
      <section class="courier-cash" aria-label="Solde et remises">
        <h2>Especes a remettre</h2>
        <template v-if="courier.balance">
          <p class="courier-cash-amount">{{ money(courier.balance.remainingDueCents) }}</p>
          <dl class="courier-cash-summary">
            <div><dt>Encaissees</dt><dd>{{ money(courier.balance.collectedCents) }}</dd></div>
            <div><dt>Remises confirmees</dt><dd>{{ money(courier.balance.receivedCents) }}</dd></div>
            <div><dt>Ecart</dt><dd>{{ money(courier.balance.discrepancyCents) }}</dd></div>
            <div><dt>Excedent</dt><dd>{{ money(courier.balance.surplusCents) }}</dd></div>
          </dl>
          <p v-if="!courier.balance.remittances.length">Aucune remise confirmee.</p>
          <ul v-else class="courier-remittances">
            <li v-for="row in courier.balance.remittances" :key="row.remittanceId">
              <span>{{ date(row.createdAt) }}</span><span>Recu {{ money(row.receivedCents) }} · Ecart {{ money(row.discrepancyCents) }}</span>
            </li>
          </ul>
        </template>
        <p v-else>Solde indisponible.</p>
      </section>
      <section v-if="closedMissions.length" class="courier-closed" aria-label="Missions terminees">
        <h2>Missions terminees</h2>
        <CourierMission v-for="mission in closedMissions" :key="`${actorKey}:${mission.id}`" :mission="mission" />
      </section>
    </template>
  </v-container>
</template>

<script>
import CourierMission from '@/components/delivery/CourierMission.vue'
import { courierIdentity } from '@/store/courier'
const { isCourierUser } = require('@/helpers/staffRoles')
export default {
  components: { CourierMission },
  layout: 'courier',
  middleware: ['auth', 'courier'],
  data: () => ({ refreshing: false }),
  computed: {
    courier() { return this.$store.state.courier },
    actorKey() { return courierIdentity(this.$store.state) },
    authorized() { return this.$store.state.authenticated !== false && isCourierUser(this.$store.state.users.user) },
    scopeReady() { return this.authorized && this.courier.identity === this.actorKey },
    availabilityBusy() { return Boolean(this.courier.busy.availability || this.courier.busy['availability:']) },
    missionBusy() { return Object.values(this.courier.busy).some(Boolean) },
    activeMissions() {
      const rows = this.courier.missions.filter(row => !['delivered', 'failed', 'canceled'].includes(row.deliveryStatus))
      const order = [...this.courier.order, ...rows.map(row => row.id).filter(id => !this.courier.order.includes(id))]
      return rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    },
    closedMissions() { return this.courier.missions.filter(row => ['delivered', 'failed', 'canceled'].includes(row.deliveryStatus)) },
    pendingEntries() { return Object.entries(this.courier.pending).filter(([, pending]) => pending.status === 'unresolved').map(([deliveryId, pending]) => ({ deliveryId, pending })) },
  },
  watch: { actorKey() { this.refresh() } },
  mounted() { this.refresh() },
  methods: {
    async refresh() {
      const identity = this.actorKey
      await this.$store.dispatch('courier/initialize')
      if (identity !== this.actorKey || this._isDestroyed) return
      if (!this.authorized) return this.$router.replace('/login')
      this.refreshing = true
      try {
        for (const action of ['loadMissions', 'loadAvailability', 'loadCashBalance']) {
          if (identity !== this.actorKey || this._isDestroyed) return
          await this.$store.dispatch(`courier/${action}`)
        }
      } finally { if (identity === this.actorKey) this.refreshing = false }
    },
    setAvailability(value) { return this.$store.dispatch('courier/setAvailability', value) },
    reorder(deliveryId, direction) { return this.$store.dispatch('courier/reorder', { deliveryId, direction }) },
    recover({ deliveryId, pending }) { return this.$store.dispatch(`courier/${pending.operation}`, { deliveryId }) },
    money(cents) { return Number.isSafeInteger(cents) ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) : 'Indisponible' },
    date(value) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString('fr-FR') : '' },
  },
}
</script>

<style scoped>
.courier-workspace { max-width: 900px; padding-bottom: 32px; color: var(--se-color-text); }
.courier-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.courier-heading h1 { font-size: 24px; font-weight: 600; overflow-wrap: anywhere; }
.courier-workspace h2 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.courier-availability { margin-bottom: 24px; }
.courier-availability ::v-deep .v-input { margin-top: 0; min-height: 44px; }
.courier-missions { display: grid; gap: 16px; }
.courier-mission-row { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 8px; align-items: start; }
.courier-order { display: flex; flex-direction: column; border-right: 1px solid var(--se-color-border-soft); }
.courier-cash, .courier-closed, .courier-recovery { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--se-color-border); }
.courier-cash-amount { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.courier-cash-summary { margin-bottom: 16px; }
.courier-cash-summary > div, .courier-remittances li, .courier-recovery-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; margin-bottom: 12px; }
.courier-cash-summary dd { margin: 0; font-variant-numeric: tabular-nums; }
.courier-remittances { list-style: none; padding: 0; }
.courier-closed > .v-card { margin-bottom: 12px; }
.courier-empty { margin: 24px 0; }
.courier-workspace ::v-deep .v-btn { min-height: 44px; letter-spacing: 0; text-transform: none; max-width: 100%; white-space: normal; }
.courier-workspace ::v-deep .v-btn__content { white-space: normal; overflow-wrap: anywhere; }
.courier-workspace ::v-deep .v-btn--icon { width: 44px; height: 44px; flex: 0 0 44px; }
.courier-workspace ::v-deep .v-btn:focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 2px; }
</style>
