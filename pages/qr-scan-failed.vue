<template>
  <v-container class="fill-height qr-scan-failed">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" class="text-center">
        <v-icon size="76" color="warning">mdi-qrcode-scan</v-icon>
        <h1 class="text-h5 mt-4">Scan du QR code impossible</h1>
        <p class="mt-3">
          Ce QR code n'est plus valide ou n'a pas pu être lu.
          Scannez à nouveau le QR code affiché sur votre table pour continuer.
        </p>
        <v-btn color="primary" class="text-none" @click="restartScan">
          <v-icon left>mdi-camera-outline</v-icon>
          Scanner à nouveau
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  layout: 'empty',
  methods: {
    restartScan() {
      localStorage.removeItem('table_access_token')
      localStorage.removeItem('token')
      this.$router.push('/qr-scan-failed?retry=1')
    },
  },
}
</script>
