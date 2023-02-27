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
    <!-- admin -->
    <v-row v-else-if="accessUser === 0" class="mt-5">
      <v-col v-for="items in list" :key="items.link" md="4" sm="6" cols="12">
        <v-card outlined>
          <v-app-bar flat color="grey lighten-4" light>
            <v-icon>mdi-bookmark</v-icon>
            <nuxt-link router exact :to="items.to">View more</nuxt-link>
          </v-app-bar>
          <div class="d-flex justify-space-around">
            <v-card-title>
              <h5>Total {{ items.title }}</h5>
            </v-card-title>
            <v-card-title
              v-for="itm in setDatadashboard"
              :key="itm.id"
              :class="itm.title === items.title ? '' : 'd-none'"
            >
              <h4>
                {{ itm.title === items.title ? itm.total : '' }}
              </h4>
            </v-card-title>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-column v-else class="mt-5 justify-center">
      <v-btn color="primary" @click="$router.push('/menus')">Go to menus</v-btn>
      <br />
      <v-btn color="primary" @click="$router.push('/ordersStatuses')"
        >Commandes</v-btn
      >
    </v-column>
  </v-container>
</template>
<script>
import listdashboard from '@/helpers/listdashboard'
import defaultdata from '@/helpers/defaultdata'
import Loading from '@/components/loading'
export default {
  components: {
    Loading,
  },
  mixins: [listdashboard, defaultdata],
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
    this.loadPage = true
    this.accessUser = parseInt(localStorage.getItem('access'))
    this.$store.dispatch('products/getProducts', this.setData)
    this.$store.dispatch('categories/getAllCategories', this.setData)
    this.$store.dispatch('stocks/getAllStock', this.setData)
    this.$store.dispatch('orders/getAllOrder', this.setData)
    setTimeout(() => {
      this.loadPage = false
      // admin
      if (this.accessUser === 0) {
        this.setDatadashboard.forEach((e) => {
          if (e.id === 1) {
            return (this.setDatadashboard[0].total =
              this.totalProduct.length || 0)
          } else if (e.id === 2) {
            return (this.setDatadashboard[1].total =
              this.totalCategory.length || 0)
          } else if (e.id === 3) {
            return (this.setDatadashboard[2].total =
              this.totalStock.length || 0)
          } else {
            return (this.setDatadashboard[3].total =
              this.totalOrder.length || 0)
          }
        })
      }
    }, 3000)
  },
}
</script>
