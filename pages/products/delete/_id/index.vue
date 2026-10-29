<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="420">
      <v-card class="pa-3 se-modal">
        <div class="text-center">
          <v-icon size="64" color="error">mdi-delete-alert</v-icon>
        </div>
        <v-card-title class="justify-center se-modal-title">
          <h3>Supprimer le produit</h3>
        </v-card-title>
        <v-card-text class="text-center">
          <p>Êtes-vous sûr de vouloir supprimer ce produit ?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn class="se-modal-action se-modal-action--secondary" @click="btnNo">
            <v-icon small left>mdi-arrow-left</v-icon>Annuler
          </v-btn>
          <v-btn
            :loading="loadingBtn"
            color="error"
            dark
            class="se-modal-action se-modal-action--danger"
            @click="btnYes"
            >Supprimer le produit <v-icon small right>mdi-trash-can</v-icon></v-btn
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
