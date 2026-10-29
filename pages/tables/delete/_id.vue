<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="420">
      <v-card class="pa-3 se-modal">
        <div class="text-center">
          <v-icon size="64" color="error">mdi-delete-alert</v-icon>
        </div>
        <v-card-title class="justify-center se-modal-title">
          <h3>Supprimer la table?</h3>
        </v-card-title>
        <v-card-text class="text-center">
          <p>Êtes-vous sûr de vouloir supprimer cette table ?</p>
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
            >Supprimer la table <v-icon small right>mdi-trash-can</v-icon></v-btn
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
  head() {
    return {
      title: 'Supprimer la table',
    }
  },
  methods: {
    btnNo() {
      this.dialog = false
      this.$router.push('/tables')
    },
    async btnYes() {
      this.loadingBtn = true
      console.log('Id to delete', this.id)
      const res = await this.$axios
        .delete(`/baseurl/api/v1/service-points/tables/${this.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
        .then((response) => {
          console.log('Tripke')
          // dispatch('set/message', response.data.message)
          return true
        })
        .catch((error) => {
          console.log('Tripke', error.response.data)

          // dispatch('set/message', error.response.data.message)
          return false
        })
      if (res) {
        this.dialog = false
        this.loadingBtn = false
        this.$router.push('/tables')
      } else {
        this.dialog = false
        this.loadingBtn = false
        this.$router.push('/tables')
      }
    },
  },
}
</script>
