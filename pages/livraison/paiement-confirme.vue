<template>
  <v-app light>
    <v-main>
      <v-container class="payment-return">
        <h1>Paiement de la livraison</h1>
        <p>Le livreur reçoit la confirmation dès que Stripe valide le paiement.</p>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  layout: 'empty',
  head() {
    return {
      title: 'Paiement de la livraison',
      meta: [{ hid: 'robots', name: 'robots', content: 'noindex, nofollow' }],
    }
  },
}
</script>

<style scoped>
.payment-return { max-width: 560px; padding: 32px 24px; }
.payment-return h1 { margin-bottom: 12px; font-size: 26px; }
</style>
