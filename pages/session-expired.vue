<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" class="text-center">
        <v-icon size="72" color="warning">mdi-timer-alert-outline</v-icon>
        <h1 class="text-h5 mt-4">Session expirée</h1>
        <p class="mt-3">
          Votre session a expiré. Votre panier est conservé comme brouillon.
          Scannez à nouveau le QR code pour continuer.
        </p>
        <v-btn color="primary" class="text-none" @click="resumeSession">
          Reprendre la commande
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  layout: 'empty',
  methods: {
    resumeSession() {
      const token = localStorage.getItem('table_access_token')
      if (token) {
        this.$router.push(`/table-access/${encodeURIComponent(token)}`)
        return
      }
      this.$router.push('/login')
    },
  },
}
</script>
