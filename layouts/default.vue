<template>
  <v-app dark>
    <v-navigation-drawer
      v-if="
        $route.path != '/register' &&
        $route.path != '/login' &&
        $route.name != 'activation-token-email-position-access' &&
        $route.name != null &&
        idUser.access === 0
      "
      v-model="drawer"
      :mini-variant="miniVariant"
      :clipped="clipped"
      fixed
      app
    >
      <!-- active-class="deep-purple--text text--accent-4" -->
      <v-list nav>
        <v-list-item
          v-for="(item, i) in navigationAdminItems"
          :key="i"
          :to="item.to ? item.to : ''"
          router
          exact
          active-class="primary--text text--accent-4"
          :class="'cursor list'"
          @click="item.name == 'logout' ? logout() : ''"
        >
          <v-list-item-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title v-text="item.title" />
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
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
      <v-app-bar-nav-icon
        v-if="idUser.access === 0"
        @click.stop="drawer = !drawer"
      />
      <v-btn v-if="idUser.access === 0" icon @click="previousPage()">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn v-if="idUser.access === 0" icon @click.stop="clipped = !clipped">
        <v-icon>{{ currentPage.icon }}</v-icon>
      </v-btn>

      <v-toolbar-title>{{ currentPage.title }}</v-toolbar-title>
      <v-spacer />
      <v-btn
        v-if="idUser.access !== 0 && idUser.access !== 2"
        icon
        @click="$router.push('/orders')"
      >
        <v-icon color="primary">mdi-order-bool-descending</v-icon>
      </v-btn>
      <!-- md -->
      <v-btn
        v-if="idUser.access !== 0"
        icon
        disabled
        class="d-md-block d-sm-none d-none"
      >
        <v-badge color="green" :content="`${indexCart}`" overlap top
          ><v-icon color="success">mdi-cart-minus</v-icon></v-badge
        >
      </v-btn>
      <!-- sm to xs -->
      <v-btn
        v-if="idUser.access !== 0"
        icon
        class="d-md-none d-sm-block d-block"
        @click="cartBtn"
      >
        <v-badge color="green" :content="`${indexCart}`" overlap top
          ><v-icon color="success">mdi-cart-minus</v-icon></v-badge
        >
      </v-btn>
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
import listdashboard from '@/helpers/listdashboard'
export default {
  mixins: [listdashboard],
  data() {
    return {
      clipped: false,
      drawer: false,
      fixed: false,

      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'Vuetify.js',
    }
  },
  computed: {
    navigationAdminItems() {
      return this.list.filter((item) => item.isAdmin === true)
    },
    idUser() {
      return this.$store.get('users/user')
    },
    indexCart() {
      return this.$store.get('cart/indexCart')
    },
    totalCart() {
      return this.$store.get('cart/totalCart')
    },
    currentPage() {
      const title = this.list.find(
        (item) => item.routeName === this.$route.name
      ) || {
        title: this.$route.name,
        icon: '',
      }
      console.log('Current Page Title', title, 'route', this.$route)
      return title
    },
  },
  mounted() {
    console.log('Mixins List Dashbord', this.list)
    console.log('route', this.$route)
    console.log('router', this.$router)
    console.log('currentPage', this.shopInfo)
  },
  methods: {
    previousPage() {
      if (this.$route.path === '/') return

      this.$router.back()
    },
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
