<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="350">
      <v-card class="pa-3">
        <div class="text-center">
          <v-icon size="80" color="warning">mdi-information-outline</v-icon>
        </div>
        <v-card-title class="justify-center">
          <h3>Supprimer le produit</h3>
        </v-card-title>
        <v-card-text class="text-center">
          <p>Etes-vous sur de supprimer ce produit?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            :loading="loadingBtn"
            color="#e53935"
            dark
            class="text-none"
            @click="btnYes"
            >Oui, supprimer ! <v-icon small right>mdi-trash-can</v-icon></v-btn
          >
          <v-btn color="primary" class="text-none" @click="btnNo"
            >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
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
      loadingBtn: false,
    }
  },

  methods: {
    btnNo() {
      this.dialog = false
      this.$router.push('/products')
    },
    async btnYes() {
      this.loadingBtn = true
      const res = await this.$store.dispatch('products/deleteProduct', this.id)
      if (res) {
        this.dialog = false
        this.loadingBtn = false
        this.$router.push('/products')
      } else {
        this.dialog = false
        this.loadingBtn = false
        this.$router.push('/products')
      }
    },
  },
}
</script>
