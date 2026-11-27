<template>
  <section v-if="status.available || message" aria-labelledby="mollie-connect-title">
    <v-divider class="my-5" />
    <h4 id="mollie-connect-title">Mollie Connect</h4>

    <v-alert v-if="message" dense text type="warning" class="mt-3 mb-0">
      {{ message }}
    </v-alert>

    <template v-if="status.available">
      <p v-if="status.connection" class="mb-0 mt-2">
        Compte associé à cet établissement
        <strong>{{ status.connection.name }}</strong>
      </p>

      <template v-if="status.pending">
        <v-alert dense text type="info" class="mt-3 mb-0">
          Confirmez que <strong>{{ status.pending.name }}</strong>
          ({{ status.pending.organizationId }}) est le compte Mollie de cet établissement.
        </v-alert>
        <v-btn
          color="primary"
          class="mt-3 text-none"
          :loading="busy === 'confirm'"
          :disabled="Boolean(busy)"
          @click="confirmConnection"
        >
          Confirmer le compte
        </v-btn>
      </template>

      <v-btn
        class="mt-3 text-none"
        :text="Boolean(status.pending || status.connection)"
        color="primary"
        :loading="busy === 'authorize'"
        :disabled="Boolean(busy)"
        @click="openMollie"
      >
        {{ status.pending || status.connection ? 'Relancer la connexion' : 'Connecter Mollie' }}
      </v-btn>
    </template>
  </section>
</template>

<script>
const returnMessages = {
  cancelled: 'L’autorisation a été annulée. Vous pouvez relancer la connexion.',
  expired: 'Cette autorisation a expiré. Relancez la connexion Mollie.',
  failed: 'Mollie n’a pas pu terminer l’autorisation. Relancez la connexion.',
}

export default {
  data: () => ({
    status: { available: false, connection: null, pending: null },
    busy: '',
    message: '',
  }),
  async mounted() {
    const { mollie, ...query } = this.$route.query
    if (typeof mollie === 'string') {
      this.message = Object.prototype.hasOwnProperty.call(returnMessages, mollie)
        ? returnMessages[mollie]
        : ''
      const { path, hash } = this.$route
      await this.$router.replace({ path, query, hash }).catch(() => {})
    }
    try {
      await this.loadStatus()
      if (mollie === 'confirm' && !this.status.pending && !this.status.connection) {
        this.message = 'Rechargez les réglages ou relancez l’autorisation Mollie.'
      }
    } catch (_) {
      if (mollie) this.message = 'Impossible de vérifier la connexion Mollie.'
    }
  },
  methods: {
    requestOptions() {
      return {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        skipGlobalErrorNotification: true,
      }
    },
    async loadStatus() {
      const { data } = await this.$axios.get('/baseurl/api/v1/mollie/connect/status', this.requestOptions())
      this.status = data.data
    },
    async openMollie() {
      this.busy = 'authorize'
      this.message = ''
      try {
        const { data } = await this.$axios.post('/baseurl/api/v1/mollie/connect/authorize', {}, this.requestOptions())
        window.location.assign(data.data.url)
      } catch (_) {
        this.message = 'Impossible d’ouvrir l’autorisation Mollie. Réessayez.'
        this.busy = ''
      }
    },
    async confirmConnection() {
      if (!this.status.pending) return
      const pendingId = this.status.pending.id
      this.busy = 'confirm'
      this.message = ''
      try {
        await this.$axios.post('/baseurl/api/v1/mollie/connect/confirm', { pendingId }, this.requestOptions())
        await this.loadStatus()
      } catch (error) {
        this.message = error.response?.data?.message || 'Impossible de vérifier l’association du compte Mollie.'
      } finally {
        this.busy = ''
      }
    },
  },
}
</script>
