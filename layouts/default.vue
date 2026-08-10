<template>
  <v-app dark>
    <v-navigation-drawer
      v-if="
        $route.path != '/register' &&
        $route.path != '/login' &&
        $route.name != 'activation-token-email-position-access' &&
        $route.name != null &&
        isStaffUser
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
          v-for="(item, i) in navigationItems"
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
          <v-list-item-content v-if="!miniVariant">
            <v-list-item-title class="d-flex align-center">
              <span>{{ item.title }}</span>
              <v-avatar
                v-if="
                  !miniVariant &&
                  item.routeName === 'orders' &&
                  pendingOrderCount > 0
                "
                color="primary"
                size="26"
                class="ml-3 flex-shrink-0"
              >
                <span class="white--text text-caption font-weight-bold">
                  {{ pendingOrderBadge }}
                </span>
              </v-avatar>
            </v-list-item-title>
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
        v-if="isStaffUser"
        @click.stop="drawer = !drawer"
      />
      <v-btn v-if="isStaffUser" icon @click="previousPage()">
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn
        v-if="isStaffUser"
        icon
        @click.stop="miniVariant = !miniVariant"
      >
        <v-icon>{{ miniVariant ? 'mdi-menu-open' : currentPage.icon }}</v-icon>
      </v-btn>

      <v-toolbar-title>{{ currentPage.title }}</v-toolbar-title>
      <v-spacer />
      <v-btn
        v-if="!isStaffUser && canAccessModule(userAccess, 'orders')"
        icon
        @click="$router.push('/orders')"
      >
        <v-icon color="primary">mdi-order-bool-descending</v-icon>
      </v-btn>
      <!-- md -->
      <v-btn
        v-if="canAccessModule(userAccess, 'cart')"
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
        v-if="canAccessModule(userAccess, 'cart')"
        icon
        class="d-md-none d-sm-block d-block"
        @click="cartBtn"
      >
        <v-badge color="green" :content="`${indexCart}`" overlap top
          ><v-icon color="success">mdi-cart-minus</v-icon></v-badge
        >
      </v-btn>
      <v-btn v-if="!isStaffUser" icon @click="logout">
        <v-icon color="red lighten-2">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <!-- <v-container fluid> -->
      <nuxt />
      <!-- </v-container> -->
    </v-main>
    <AppNotifications />
  </v-app>
</template>
<script>
import listdashboard from '@/helpers/listdashboard'
const {
  canAccessModule: canUseModule,
  getAccessibleNavigationItems,
  isStaffAccess,
} = require('@/helpers/staffRoles')
const {
  countPendingOrders,
  formatPendingOrderBadge,
} = require('@/helpers/orderNotifications')
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
      ordersPolling: null,
      ordersPollingInFlight: false,
      ordersPollingReady: false,
    }
  },
  computed: {
    navigationItems() {
      return getAccessibleNavigationItems(this.userAccess, this.list)
    },
    idUser() {
      return this.$store.get('users/user')
    },
    userAccess() {
      const access = this.idUser && this.idUser.access
      return access === undefined || access === null ? null : Number(access)
    },
    isStaffUser() {
      return isStaffAccess(this.userAccess)
    },
    indexCart() {
      return this.$store.get('cart/indexCart')
    },
    totalCart() {
      return this.$store.get('cart/totalCart')
    },
    pendingOrderCount() {
      return countPendingOrders(this.$store.get('orders/dataOrders'))
    },
    pendingOrderBadge() {
      return formatPendingOrderBadge(this.pendingOrderCount)
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
  watch: {
    userAccess() {
      this.syncOrdersPolling()
    },
  },
  mounted() {
    console.log('Mixins List Dashbord', this.list)
    console.log('route', this.$route)
    console.log('router', this.$router)
    console.log('currentPage', this.shopInfo)
    this.ordersPollingReady = true
    this.syncOrdersPolling()
  },
  beforeDestroy() {
    this.stopOrdersPolling()
  },
  methods: {
    canAccessModule(access, moduleKey) {
      return canUseModule(access, moduleKey)
    },
    async refreshPendingOrders() {
      const isAdmin = Number(this.idUser && this.idUser.access) === 0
      if (!isAdmin || this.$route.path === '/orders') return false
      if (this.ordersPollingInFlight) return false

      this.ordersPollingInFlight = true
      try {
        await this.$store.dispatch('orders/getAllOrder')
        return true
      } catch {
        return false
      } finally {
        this.ordersPollingInFlight = false
      }
    },
    startOrdersPolling() {
      if (this.ordersPolling) return
      if (this.userAccess !== 0) return

      this.refreshPendingOrders()
      this.ordersPolling = setInterval(this.refreshPendingOrders, 15000)
    },
    syncOrdersPolling() {
      if (!this.ordersPollingReady) return

      if (this.userAccess === 0) this.startOrdersPolling()
      else this.stopOrdersPolling()
    },
    stopOrdersPolling() {
      if (this.ordersPolling) clearInterval(this.ordersPolling)
      this.ordersPolling = null
    },
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
