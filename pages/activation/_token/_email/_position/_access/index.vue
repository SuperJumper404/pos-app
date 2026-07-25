<template>
  <div style="height: 100%">
    <!-- Success Activation -->
    <div
      v-if="status == 'ok'"
      class="d-flex justify-center"
      style="height: 100%"
    >
      <div class="align-self-center">
        <!-- <h1>
          <i class="fa fa-thumbs-up" aria-hidden="true"></i>
        </h1> -->
        <h4>OK!</h4>
        <p>Votre compte a bien été activé !</p>
        <v-btn color="primary" @click="$router.push('/login')">
          Aller à la page de connexion
        </v-btn>
      </div>
    </div>
    <!-- Failed Activation -->
    <div
      v-if="status == 'failed'"
      class="d-flex justify-center"
      style="height: 100%"
    >
      <div class="align-self-center">
        <!-- <h1 class="text-muted">
          <b-icon icon="emoji-frown-fill" class="text-dark" />
        </h1> -->
        <h4>Échec de l'activation</h4>
        <p>
          Le lien d'activation est peut-être expiré ou incorrect. Demandez un
          nouveau lien d'activation, puis réessayez.
        </p>
        <v-btn color="primary" @click="$router.push('/')">
          Retour au tableau de bord
        </v-btn>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  auth: false,
  data: () => ({
    status: 'loading',
  }),

  mounted() {
    setTimeout(() => {
      this.$axios
        .get(
          `/baseurl/api/v1/activate/${this.$route.params.token}/${this.$route.params.email}/${this.$route.params.position}/${this.$route.params.access}`
        )
        .then(() => {
          this.status = 'ok'
        })
        .catch((error) => {
          this.status = 'failed' || error.response
        })
    }, 1000)
  },
}
</script>
