<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="350">
      <v-card class="pa-3">
        <div class="text-center">
          <v-icon size="80" color="warning">mdi-information-outline</v-icon>
        </div>
        <v-card-title class="justify-center">
          <h3>
            Encaisser la table <br />
            {{ id }} ?
          </h3>
          <h6>commandes : {{ ordersToArchive.join(', ') }}</h6>
        </v-card-title>
        <v-card-text class="text-center">
          <p>Assurez vous d'avoir encaissé avant de valider</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            :loading="loadingBtn"
            color="#e53935"
            dark
            class="text-capitalize"
            @click="btnYes"
            >Valider</v-btn
          >
          <v-btn color="primary" class="text-capitalize" @click="btnNo"
            >Annuler</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
export default {
  middleware: 'auth',
  data() {
    return {
      id: this.$route.params.id,
      dialog: this.$route.query.modals,
      ordersToArchive: this.$route.query.orders,
      loadingBtn: false,
    }
  },
  head() {
    return {
      title: 'Payout Order',
    }
  },
  mounted() {
    console.log('Ordres to Archives', this.ordersToArchive)
  },
  methods: {
    btnNo() {
      this.dialog = false
      this.$router.push('/cashregister')
    },
    async btnYes() {
      this.loadingBtn = true
      const ordersToArchive = this.ordersToArchive.map(async (x) => {
        return await this.$store.dispatch('orders/archiveOrder', { id: x })
      })
      console.log('OrderToArchive', ordersToArchive)
      await Promise.all(ordersToArchive).finally(async () => {
        this.dialog = false
        this.loadingBtn = false
        await this.$store
          .dispatch('orders/getAllOrder', { refresh: Date.now() })
          .then(() => {
            this.$router.push({
              path: '/cashregister',
              query: {},
              force: true,
            })
          })
      })
    },
  },
}
</script>
