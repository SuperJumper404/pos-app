<template>
  <v-app class="tracking-page" light>
    <v-main>
      <div class="tracking-content">
        <header class="tracking-header"><img src="/logo.png" alt="Smart Eat" width="48" height="48"><h1>Suivi de livraison</h1></header>
        <v-skeleton-loader v-if="loading" type="heading, list-item-three-line" />
        <v-alert v-if="error" text :type="unavailable ? 'warning' : 'error'" role="alert">{{ error }}</v-alert>
        <template v-if="view">
          <section aria-label="Commande" class="tracking-section" aria-live="polite">
            <h2>{{ view.reference }}</h2>
            <p class="tracking-stage"><v-icon color="primary" class="mr-2">{{ stage.icon }}</v-icon>{{ stage.label }}</p>
          </section>
          <section class="tracking-section" aria-label="Restaurant">
            <h2>{{ view.restaurant.name }}</h2>
            <p>{{ view.restaurant.address }}</p>
            <v-btn v-if="phone" :href="`tel:${phone}`" outlined><v-icon left>mdi-phone-outline</v-icon>Appeler le restaurant</v-btn>
          </section>
          <section class="tracking-section" aria-label="Adresse de livraison">
            <h2>Adresse de livraison</h2>
            <p>{{ view.addressSnapshot.street }}<br>{{ view.addressSnapshot.postalCode }} {{ view.addressSnapshot.city }}</p>
          </section>
          <section class="tracking-section" aria-label="Paiement">
            <h2>Paiement</h2>
            <dl><div><dt>Total</dt><dd>{{ money(view.payment.totalCents) }}</dd></div><div><dt>{{ paymentLabel }}</dt><dd>{{ money(view.payment.remainingDueCents) }} a regler</dd></div></dl>
          </section>
        </template>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import { readTrackingFragment, buildTrackingApi, startTrackingPoll } from '@/helpers/deliveryTracking.js'

export default {
  layout: 'empty',
  data() { return { loading: true, view: null, error: '', unavailable: false } },
  head() { return { title: 'Suivi de livraison', meta: [{ hid: 'referrer', name: 'referrer', content: 'no-referrer' }, { hid: 'robots', name: 'robots', content: 'noindex, nofollow' }] } },
  computed: {
    stage() {
      return ({ received: { label: 'Commande recue', icon: 'mdi-check-circle-outline' }, preparing: { label: 'En preparation', icon: 'mdi-chef-hat' }, ready: { label: 'Commande prete', icon: 'mdi-package-variant-closed' },
        in_delivery: { label: 'En livraison', icon: 'mdi-truck-delivery-outline' }, delivered: { label: 'Livree', icon: 'mdi-check-circle-outline' }, restaurant_intervention: { label: 'Intervention du restaurant', icon: 'mdi-phone-outline' } })[this.view.stage] || { label: 'Suivi indisponible', icon: 'mdi-information-outline' }
    },
    phone() { return this.view && String(this.view.restaurant.phone || '').replace(/[^+\d]/g, '') },
    paymentLabel() { return ({ paid: 'Paye', refunded: 'Rembourse', unpaid: 'A regler' })[this.view.payment.status] || 'Paiement en attente' },
  },
  mounted() {
    const token = readTrackingFragment(window)
    if (!token) { this.failed(true); return }
    this.stopTracking = startTrackingPoll({ token, api: buildTrackingApi({ baseURL: process.env.privateURL }), document,
      onData: view => { this.loading = false; this.view = view; this.error = ''; this.unavailable = false }, onError: this.failed })
  },
  beforeDestroy() { if (this.stopTracking) this.stopTracking(); this.view = null },
  methods: {
    money(cents) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100) },
    failed(terminal) {
      this.loading = false
      this.unavailable = terminal
      if (terminal) this.view = null
      this.error = terminal ? 'Ce lien de suivi est indisponible ou expire. Contactez le restaurant.' : 'Connexion interrompue. Nouvelle tentative dans un instant.'
    },
  },
}
</script>

<style scoped>
.tracking-page { background: var(--se-color-bg); color: var(--se-color-text-body); font-family: Poppins, sans-serif; letter-spacing: 0; }
.tracking-content { max-width: 720px; margin: 0 auto; padding: 28px 24px 48px; overflow-wrap: anywhere; }
.tracking-header { display: flex; gap: 16px; align-items: center; margin-bottom: 28px; }
.tracking-header img { flex: 0 0 48px; object-fit: contain; }
.tracking-page h1 { font-size: 1.5rem; line-height: 1.3; margin: 0; }
.tracking-page h2 { font-size: 1.125rem; line-height: 1.4; margin-bottom: 12px; }
.tracking-section { padding: 24px 0; border-top: 1px solid var(--se-color-border); }
.tracking-stage { font-size: 1.125rem; font-weight: 600; margin: 0; }
.tracking-page dl div { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.tracking-page dd { margin: 0; font-variant-numeric: tabular-nums; }
.tracking-page .v-btn { min-height: 44px; height: auto; max-width: 100%; text-transform: none; letter-spacing: 0; }
.tracking-page ::v-deep .v-btn__content { white-space: normal; overflow-wrap: anywhere; }
.tracking-page :focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 3px; }
@media (max-width: 600px) { .tracking-content { padding: 24px 16px 40px; } }
</style>
