<template>
  <section class="customer-login" :aria-labelledby="`${mode}-heading`">
    <h2 :id="`${mode}-heading`">{{ mode === 'link' ? 'Ajouter un contact' : 'Connexion a mon compte' }}</h2>
    <v-skeleton-loader v-if="!account.channelsLoaded && account.busy" type="list-item-two-line" />
    <template v-else>
      <v-alert v-if="!availableChannels.length" type="warning" text role="status">
        La connexion par code est indisponible pour le moment.
        <v-btn text :disabled="account.busy" @click="retryChannels">Reessayer</v-btn>
      </v-alert>
      <v-btn-toggle :value="channel" mandatory class="customer-channels" :aria-label="mode === 'link' ? 'Contact a ajouter' : 'Recevoir le code par'">
        <v-btn v-for="item in availableChannels" :key="item.value" :value="item.value" :disabled="submitting || account.busy" @click="chooseChannel(item.value)">
          <v-icon left>{{ item.icon }}</v-icon>{{ item.label }}
        </v-btn>
      </v-btn-toggle>
      <v-alert v-if="displayError" type="error" text role="alert">{{ displayError }}</v-alert>
      <form v-if="availableChannels.length" novalidate @submit.prevent="challenge ? verify() : sendCode()">
        <template v-if="!challenge">
          <v-text-field
            ref="destination" v-model="destination" outlined
            :label="channel === 'whatsapp' ? 'Numero WhatsApp' : 'Adresse e-mail'"
            :type="channel === 'whatsapp' ? 'tel' : 'email'"
            :autocomplete="channel === 'whatsapp' ? 'tel' : 'email'"
            :placeholder="channel === 'whatsapp' ? '+33 6 12 34 56 78' : ''"
            :disabled="submitting || account.busy" :maxlength="channel === 'whatsapp' ? 32 : 254"
          />
          <v-btn type="submit" color="primary" :disabled="!channel || account.busy" :loading="submitting">
            <v-icon left>mdi-send-outline</v-icon>Recevoir un code
          </v-btn>
        </template>
        <template v-else>
          <p class="customer-wrap" role="status">{{ deliveryMessage }}</p>
          <v-text-field
            ref="code" v-model="code" label="Code a 6 chiffres" outlined
            inputmode="numeric" autocomplete="one-time-code" maxlength="6"
            :disabled="submitting || account.busy || challenge.status === 'failed'" :error-messages="validationError ? [validationError] : []"
          />
          <p v-if="expired" role="status">Ce code a expire. Demandez un nouveau code.</p>
          <div class="customer-actions">
            <v-btn type="submit" color="primary" :disabled="expired || account.busy || challenge.status === 'failed'" :loading="submitting">
              <v-icon left>mdi-check</v-icon>{{ mode === 'link' ? 'Verifier le contact' : 'Me connecter' }}
            </v-btn>
            <v-btn text :disabled="remainingSeconds > 0 || submitting || account.busy" @click="sendCode">
              {{ remainingSeconds > 0 ? `Renvoyer dans ${remainingSeconds} s` : 'Renvoyer le code' }}
            </v-btn>
            <v-btn text :disabled="submitting || account.busy" @click="changeContact">Changer de contact</v-btn>
          </div>
        </template>
      </form>
    </template>
  </section>
</template>

<script>
export default {
  props: { mode: { type: String, default: 'login', validator: value => ['login', 'link'].includes(value) } },
  data() {
    return { channel: '', destination: '', code: '', submitting: false, validationError: '', now: Date.now(), timer: null }
  },
  computed: {
    account() { return this.$store.state.customer },
    challenge() {
      return this.account.challenge && this.account.challenge.purpose === this.mode ? this.account.challenge : null
    },
    availableChannels() {
      if (!this.account.channelsLoaded) return []
      return [
        { value: 'email', label: 'E-mail', icon: 'mdi-email-outline' },
        { value: 'whatsapp', label: 'WhatsApp', icon: 'mdi-whatsapp' },
      ].filter(item => this.account.channels[item.value])
    },
    remainingSeconds() {
      return this.challenge ? Math.max(0, Math.ceil((Date.parse(this.challenge.resendAfter) - this.now) / 1000)) : 0
    },
    expired() { return this.challenge && Date.parse(this.challenge.expiresAt) <= this.now },
    deliveryMessage() {
      if (!this.challenge) return ''
      if (this.challenge.status === 'failed') return 'Le code n\'a pas pu etre envoye.'
      if (this.challenge.status !== 'sent') return `Envoi incertain a ${this.challenge.destination}. Si vous recevez le code, vous pouvez le saisir.`
      return `Code envoye a ${this.challenge.destination}`
    },
    displayError() { return this.validationError || (this.account.error && this.account.error.message) },
  },
  watch: {
    availableChannels: {
      immediate: true,
      handler(items) { if (!items.some(item => item.value === this.channel)) this.channel = items.length ? items[0].value : '' },
    },
  },
  mounted() {
    this.timer = setInterval(() => { this.now = Date.now() }, 1000)
  },
  beforeDestroy() { clearInterval(this.timer) },
  methods: {
    focusCode() {
      this.$nextTick(() => {
        if (this._isDestroyed || !this.challenge || !this.$refs.code) return
        this.$refs.code.focus()
      })
    },
    chooseChannel(channel) {
      if (this.submitting || this.account.busy || !this.account.channels[channel] || channel === this.channel) return
      this.channel = channel
      this.destination = ''
      this.changeContact()
    },
    changeContact() {
      this.$store.dispatch('customer/clearChallenge')
      this.code = ''
      this.validationError = ''
    },
    retryChannels() { return this.$store.dispatch('customer/loadChannels') },
    async sendCode() {
      this.now = Date.now()
      if (this.submitting || this.account.busy || this.remainingSeconds > 0) return
      this.validationError = ''
      const destination = this.destination.trim()
      if (this.channel === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination) : !/^\+[\d\s()-]{7,30}$/.test(destination)) {
        this.validationError = this.channel === 'email' ? 'Saisissez une adresse e-mail valide.' : 'Saisissez un numero WhatsApp avec son indicatif pays.'
        return
      }
      this.submitting = true
      try {
        const result = await this.$store.dispatch('customer/requestCode', { channel: this.channel, destination, purpose: this.mode })
        if (result) { this.code = ''; this.now = Date.now(); if (result.status !== 'failed') this.focusCode() }
      } finally { this.submitting = false }
    },
    async verify() {
      if (this.submitting || this.account.busy || !this.challenge || this.challenge.status === 'failed') return
      this.now = Date.now()
      if (!/^\d{6}$/.test(this.code) || this.expired) {
        this.validationError = this.expired ? 'Ce code a expire. Demandez un nouveau code.' : 'Saisissez les 6 chiffres du code.'
        this.focusCode()
        return
      }
      this.validationError = ''
      this.submitting = true
      try {
        const result = await this.$store.dispatch(this.mode === 'link' ? 'customer/linkIdentity' : 'customer/verifyCode', {
          challengeId: this.challenge.challengeId, code: this.code,
        })
        if (result && !this._isDestroyed) {
          this.code = ''
          this.destination = ''
          this.$emit(this.mode === 'link' ? 'identity-linked' : 'authenticated')
        } else this.focusCode()
      } finally { this.submitting = false }
    },
  },
}
</script>
