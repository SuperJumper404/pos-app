<template>
  <v-app>
    <v-app-bar app flat class="courier-toolbar">
      <v-icon color="primary" class="mr-3">mdi-truck-delivery-outline</v-icon>
      <v-toolbar-title>Livraisons</v-toolbar-title>
      <v-spacer />
      <v-btn icon :loading="leaving" title="Se deconnecter" aria-label="Se deconnecter" @click="logout"><v-icon>mdi-logout</v-icon></v-btn>
    </v-app-bar>
    <v-main><nuxt /></v-main>
  </v-app>
</template>

<script>
export default {
  middleware: ['auth', 'courier'],
  data: () => ({ leaving: false }),
  methods: {
    async logout() {
      if (this.leaving) return
      this.leaving = true
      try {
        const result = await this.$store.dispatch('users/postLogout')
        await this.$store.dispatch('courier/initialize')
        if (result === true) this.$router.replace('/login')
      } finally { this.leaving = false }
    },
  },
}
</script>

<style scoped>
.courier-toolbar { background: var(--se-color-surface) !important; border-bottom: 1px solid var(--se-color-border-soft); }
.courier-toolbar ::v-deep .v-btn--icon { width: 44px; height: 44px; }
</style>
