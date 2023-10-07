<template>
  <v-container>
    <v-card outlined class="d-flex align-center mt-10">
      <v-card-title class="pa-5 d-block" style="width: 50%%">
        <h3>Welcome</h3>
        <h1>LE MOOD</h1>
        <!-- <h5 v-if="accessUser === 0">You are logged in as administrator.</h5>
        <h5 v-else-if="accessUser === 1">You are logged in as cashier.</h5>
        <h5 v-else>You are logged in as customer.</h5> -->
      </v-card-title>
    </v-card>
    <Loading v-if="loadPage && !accessUser" />
  </v-container>
</template>
<script>
import listdashboard from '@/helpers/listdashboard'
import Loading from '@/components/loading'
export default {
  components: {
    Loading,
  },
  mixins: [listdashboard],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: ['auth'],
  data() {
    return {
      loadPage: false,
      accessUser: 0,
    }
  },
  head() {
    return {
      title: 'Dashboard',
    }
  },
  computed: {
    totalProduct() {
      console.log('Init Product')
      return this.$store.get('products/dataProduct')
    },
    totalCategory() {
      return this.$store.get('categories/dataCategories')
    },
    totalStock() {
      return this.$store.get('stocks/dataStock')
    },
    totalOrder() {
      return this.$store.get('orders/dataOrders')
    },
  },
  mounted() {
    // Initialisation des variables
    this.loadPage = true
    this.accessUser = parseInt(localStorage.getItem('access'))
    const apiCalls = []

    // Configurer les appels API en fonction du niveau d'accès de l'utilisateur
    if (this.accessUser === 2) {
      this.$router.push('/menus')
      apiCalls.push(
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('orders/getAllOrder')
      )
    }

    if (this.accessUser === 0) {
      apiCalls.push(
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('categories/getAllCategories'),
        this.$store.dispatch('stocks/getAllStock'),
        this.$store.dispatch('orders/getAllOrder'),
        this.$store.dispatch('tables/getAllTables'),
        this.$store.dispatch('shop/getShopInfo')
      )
    }

    // Affichage d'un message de confirmation dans la console
    console.log('Initialisation du magasin effectuée avec succès')

    // Attendre que tous les appels API soient terminés avant de désactiver loadPage
    Promise.all(apiCalls).finally(() => {
      this.loadPage = false
    })
  },
}
</script>
