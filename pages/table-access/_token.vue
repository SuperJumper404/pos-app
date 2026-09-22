<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" class="text-center">
        <Loading v-if="loading" />
        <v-alert v-else-if="error" outlined text type="error">
          {{ message }}
        </v-alert>
        <v-btn v-if="error" color="primary" class="text-none" to="/qr-scan-failed">
          Scanner a nouveau le QR code
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'

export default {
  components: { Loading },
  layout: 'empty',
  data() {
    return {
      loading: true,
      error: false,
      errorMessage: '',
      handshakeAttempt: 0,
    }
  },
  computed: {
    message() {
      return (
        this.errorMessage ||
        this.$store.get('users/message') ||
        'Token QR invalide.'
      )
    },
  },
  mounted() {
    this.startHandshake()
  },
  methods: {
    async startHandshake() {
      const attempt = ++this.handshakeAttempt
      this.loading = true
      this.error = false
      this.errorMessage = ''

      try {
        await this.$store.dispatch(
          'users/bootstrapTableAccess',
          this.$route.params.token
        )

        if (attempt !== this.handshakeAttempt) return
        this.loading = false
        this.$router.replace('/menus')
      } catch (error) {
        if (attempt !== this.handshakeAttempt) return
        this.loading = false
        this.error = true
        this.errorMessage = error.message || 'Connexion QR impossible.'
      }
    },
  },
}
</script>
