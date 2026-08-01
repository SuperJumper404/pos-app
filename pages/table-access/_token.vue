<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" class="text-center">
        <Loading v-if="loading" />
        <v-alert v-else-if="error" outlined text type="error">
          {{ message }}
        </v-alert>
        <v-btn v-if="error" color="primary" class="text-none" to="/login">
          Retour a la connexion
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
    }
  },
  computed: {
    message() {
      return this.$store.get('users/message') || 'Token QR invalide.'
    },
  },
  async mounted() {
    const ok = await this.$store.dispatch(
      'users/postTableAccess',
      this.$route.params.token
    )
    this.loading = false
    if (ok) {
      this.$router.replace('/menus')
      return
    }
    this.error = true
  },
}
</script>
