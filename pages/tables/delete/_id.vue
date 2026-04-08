<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="350">
      <v-card class="pa-3">
        <div class="text-center">
          <v-icon size="80" color="warning">mdi-information-outline</v-icon>
        </div>
        <v-card-title class="justify-center">
          <h3>Supprimer la table?</h3>
        </v-card-title>
        <v-card-text class="text-center">
          <p>Etes vous sur de vouloir supprimer cette table?</p>
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
            >Non <v-icon small right>mdi-close-circle</v-icon></v-btn
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
        .delete(`/baseurl/api/v1/user/${this.id}`, {
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
