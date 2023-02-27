<template>
  <v-app dark>
    <v-app-bar
      v-if="
        $route.path != '/register' &&
        $route.path != '/login' &&
        $route.name != 'activation-token-email-position-access' &&
        $route.name != null
      "
      :clipped-left="clipped"
      fixed
      app
    >
      <v-tabs
        centered
        icons-and-text
        bg-color="primary"
        grow
        style="font-weight: bold"
      >
        <v-tab to="/menus">
          Menus
          <v-icon>mdi-silverware-clean</v-icon>
        </v-tab>
        <v-tab to="/ordersStatuses">
          Mes commandes
          <v-icon>mdi-order-bool-ascending</v-icon>
        </v-tab>
      </v-tabs>
      <v-btn v-if="idUser.access !== 0" icon @click="logout">
        <v-icon color="red lighten-2">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <!-- <v-container fluid> -->
      <nuxt />
      <!-- </v-container> -->
    </v-main>
  </v-app>
</template>
<script>
import * as parameters from '../config/parameters'
export default {
  data() {
    return {
      parameters,
      clipped: false,
      drawer: false,
      fixed: false,
      admin: [
        {
          icon: 'mdi-home',
          title: 'Dashboard',
          to: '/',
        },
        {
          icon: 'mdi-bookmark',
          title: 'Products',
          to: '/products',
        },
        {
          icon: 'mdi-bookmark',
          title: 'Categories',
          to: '/categories',
        },
        {
          icon: 'mdi-food',
          title: 'Menus',
          to: '/menus',
        },
        {
          icon: 'mdi-order-bool-descending',
          title: 'Orders',
          to: '/orders',
        },
        {
          icon: 'mdi-apps',
          title: 'Stocks',
          to: '/stocks',
        },
        {
          icon: 'mdi-notebook',
          title: 'Reports',
          to: '/reports',
        },

        {
          icon: 'mdi-table-chair',
          title: 'Tables',
          to: '/tables',
        },
        {
          icon: 'mdi-logout',
          title: 'Logout',
        },
      ],
      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'Vuetify.js',
    }
  },
  computed: {
    idUser() {
      return this.$store.get('users/user')
    },
    indexCart() {
      return this.$store.get('cart/indexCart')
    },
    totalCart() {
      return this.$store.get('cart/totalCart')
    },
  },
  mounted() {},
  methods: {
    cartBtn() {
      this.$store.dispatch('setDialog', true)
    },
    logout() {
      const res = this.$store.dispatch('users/postLogout')
      if (res) {
        this.$router.push('/login')
      }
    },
  },
}
</script>
