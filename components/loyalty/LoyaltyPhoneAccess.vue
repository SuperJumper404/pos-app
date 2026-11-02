<template>
  <v-form ref="form" class="loyalty-phone-access" @submit.prevent="submit">
    <p>{{ enrollmentEnabled ? 'Votre numéro de téléphone suffit pour rejoindre la fidélité ou retrouver votre carte.' : 'Retrouvez votre carte avec votre numéro de téléphone. Les nouvelles adhésions sont suspendues.' }}</p>
    <v-text-field v-model="phone" outlined label="Numéro de téléphone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" placeholder="06 12 34 56 78" hint="Pour un numéro étranger, indiquez aussi l’indicatif pays." persistent-hint :rules="[phoneRule]" :disabled="disabled || submitting || loyalty.busy" />
    <v-checkbox v-if="enrollmentEnabled" v-model="marketingConsent" label="Recevoir les offres du restaurant dans Wallet (facultatif)" :disabled="disabled || submitting || loyalty.busy" />
    <v-btn type="submit" color="primary" class="text-none" :loading="submitting" :disabled="disabled || loyalty.busy">{{ enrollmentEnabled ? 'Rejoindre ou retrouver ma carte' : 'Retrouver ma carte' }}</v-btn>
  </v-form>
</template>
<script>
export default {
  props: { shopId: { type: Number, required: true }, disabled: { type: Boolean, default: false }, enrollmentEnabled: { type: Boolean, default: true } },
  data: () => ({ phone: '', marketingConsent: false, submitting: false }),
  computed: { loyalty() { return this.$store.state.loyalty } },
  methods: {
    phoneRule(value) { return typeof value === 'string' && /^\+?[\d ()-]{6,31}$/.test(value.trim()) || 'Saisissez votre numéro de téléphone.' },
    async submit() {
      if (this.disabled || this.submitting || this.loyalty.busy || !this.$refs.form.validate()) return
      this.submitting = true
      try {
        const member = await this.$store.dispatch('loyalty/enrollPhone', { shopId: this.shopId, phone: this.phone.trim(), countryCode: 'FR', marketingConsent: this.marketingConsent })
        if (member && !this._isDestroyed) this.$emit('joined', member)
      } finally { if (!this._isDestroyed) this.submitting = false }
    },
  },
}
</script>
