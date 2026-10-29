<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="420">
      <v-card class="pa-3 se-modal">
        <div class="text-center">
          <v-icon size="64" color="error">mdi-delete-alert</v-icon>
        </div>
        <v-card-title class="justify-center">
          <h3>Supprimer la catégorie</h3>
        </v-card-title>
        <v-card-text class="text-center">
          <p>Êtes-vous sûr de vouloir supprimer cette catégorie ?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn class="se-modal-action se-modal-action--secondary" @click="btnNo"
            >Annuler <v-icon small right>mdi-arrow-left</v-icon></v-btn
          >
          <v-btn
            :loading="loadingBtn"
            color="error"
            dark
            class="se-modal-action se-modal-action--danger"
            @click="btnYes"
            >Supprimer la catégorie <v-icon small right>mdi-trash-can</v-icon></v-btn
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
      this.$router.push('/categories')
    },
    async btnYes() {
      this.loadingBtn = true
      const res = await this.$store.dispatch(
        'categories/deleteCategory',
        this.id
      )
      if (res) {
        this.dialog = false
        this.loadingBtn = false
        this.$router.push('/categories')
      } else {
        this.dialog = false
        this.loadingBtn = false
        this.$router.push('/categories')
      }
    },
  },
}
</script>
