<template>
  <v-app dark>
    <v-navigation-drawer
      v-if="
        !isKioskPage &&
        $route.path != '/register' &&
        $route.path != '/login' &&
        $route.name != 'activation-token-email-position-access' &&
        $route.name != null &&
        isStaffUser
      "
      v-model="drawer"
      :mini-variant="miniVariant"
      :clipped="clipped"
      :width="256"
      :mini-variant-width="72"
      :class="[
        'app-side-drawer',
        { 'side-nav-mini-rail': miniVariant },
      ]"
      fixed
      app
    >
      <div class="side-drawer-brand" :class="{ 'side-drawer-brand--mini': miniVariant }">
        <div class="side-drawer-brand__mark">
          <v-icon color="primary">mdi-storefront-outline</v-icon>
        </div>
        <div v-if="!miniVariant" class="side-drawer-brand__copy">
          <strong>Smart Eat</strong>
          <span>Back office</span>
        </div>
      </div>

      <v-list nav dense class="side-nav-list">
        <template v-for="(group, groupIndex) in navigationGroups">
          <v-subheader
            v-if="!miniVariant && group.items.length"
            :key="`section-${group.key}`"
            class="side-nav-section-title"
          >
            {{ group.title }}
          </v-subheader>

          <v-list-item
            v-for="item in group.items"
            :key="`${group.key}-${item.routeName || item.name || item.title}`"
            :to="item.to ? item.to : ''"
            :title="item.title"
            :aria-label="item.title"
            router
            exact
            active-class="side-nav-item--active"
            :class="[
              'cursor',
              'side-nav-item',
              {
                'side-nav-item--danger': item.name === 'logout',
                'side-nav-item--after-section':
                  miniVariant && groupIndex > 0 && item === group.items[0],
              },
            ]"
            @click="item.name == 'logout' ? logout() : ''"
          >
            <v-list-item-action class="side-nav-item__action">
              <span class="side-nav-item__icon">
                <v-icon>{{ item.icon }}</v-icon>
                <span
                  v-if="
                    miniVariant &&
                    item.routeName === 'orders' &&
                    pendingOrderCount > 0
                  "
                  class="side-nav-mini-badge"
                >
                  {{ pendingOrderBadge }}
                </span>
              </span>
            </v-list-item-action>
            <v-list-item-content v-if="!miniVariant" class="side-nav-item__content">
              <v-list-item-title class="side-nav-item__title">
                <span>{{ item.title }}</span>
                <v-avatar
                  v-if="
                    !miniVariant &&
                    item.routeName === 'orders' &&
                    pendingOrderCount > 0
                  "
                  color="primary"
                  size="24"
                  class="side-nav-item__badge"
                >
                  <span class="white--text text-caption font-weight-bold">
                    {{ pendingOrderBadge }}
                  </span>
                </v-avatar>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar
      v-if="
        !isKioskPage &&
        $route.path != '/register' &&
        $route.path != '/login' &&
        $route.name != 'activation-token-email-position-access' &&
        $route.name != null
      "
      :clipped-left="clipped"
      class="app-top-bar"
      flat
      fixed
      app
    >
      <div class="top-bar-left-actions">
        <v-btn
          v-if="isStaffUser"
          icon
          class="top-bar-icon-button top-bar-menu-button"
          :aria-label="drawerToggleLabel"
          @click.stop="cycleDrawerState"
        >
          <v-icon>{{ drawerToggleIcon }}</v-icon>
        </v-btn>
        <v-btn
          v-if="isStaffUser"
          icon
          class="top-bar-icon-button"
          aria-label="Retour"
          @click="previousPage()"
        >
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
      </div>

      <div class="top-bar-page-chip">
        <span class="top-bar-page-icon">
          <v-icon>{{ currentPage.icon }}</v-icon>
        </span>
        <v-toolbar-title class="top-bar-page-title">
          {{ currentPage.title }}
        </v-toolbar-title>
      </div>
      <v-spacer />
      <div class="top-bar-right-actions">
        <v-btn
          v-if="showFloatingHomeButton"
          class="toolbar-home-button"
          fab
          width="52"
          height="52"
          color="primary"
          aria-label="Retour a l'accueil"
          @click="goToInternalHome"
        >
          <v-icon>mdi-home</v-icon>
        </v-btn>
        <v-btn
          v-if="showTerminalPayment"
          class="toolbar-terminal-button"
          icon
          color="primary"
          aria-label="Ouvrir le paiement TPE"
          title="Paiement TPE"
          @click="terminalDialog = true"
        >
          <v-icon>mdi-contactless-payment</v-icon>
        </v-btn>
        <v-btn
          v-if="!isStaffUser && canAccessModule(userAccess, 'orders')"
          icon
          class="top-bar-icon-button"
          aria-label="Voir les commandes"
          @click="$router.push('/orders')"
        >
          <v-icon color="primary">mdi-order-bool-descending</v-icon>
        </v-btn>
        <!-- md -->
        <v-btn
          v-if="canAccessModule(userAccess, 'cart')"
          icon
          disabled
          class="top-bar-icon-button d-md-block d-sm-none d-none"
          aria-label="Panier"
        >
          <v-badge color="success" :content="`${indexCart}`" overlap top
            ><v-icon color="success">mdi-cart-minus</v-icon></v-badge
          >
        </v-btn>
        <!-- sm to xs -->
        <v-btn
          v-if="canAccessModule(userAccess, 'cart')"
          icon
          class="top-bar-icon-button d-md-none d-sm-block d-block"
          aria-label="Ouvrir le panier"
          @click="cartBtn"
        >
          <v-badge color="success" :content="`${indexCart}`" overlap top
            ><v-icon color="success">mdi-cart-minus</v-icon></v-badge
          >
        </v-btn>
        <v-btn
          v-if="!isStaffUser"
          icon
          class="top-bar-icon-button top-bar-icon-button--danger"
          aria-label="Deconnexion"
          @click="logout"
        >
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </div>
    </v-app-bar>
    <v-main>
      <!-- <v-container fluid> -->
      <nuxt />
      <!-- </v-container> -->
    </v-main>
    <AppNotifications />
    <StandaloneTerminalDialog
      v-if="isStaffUser && !isKioskPage"
      v-model="terminalDialog"
      :reader="currentTerminalReader"
      @recovery-change="terminalRecovery = $event"
    />
  </v-app>
</template>
<script>
import listdashboard from '@/helpers/listdashboard'
import StandaloneTerminalDialog from '@/components/terminal/StandaloneTerminalDialog.vue'
const {
  canAccessModule: canUseModule,
  getAccessibleNavigationItems,
  isStaffAccess,
} = require('@/helpers/staffRoles')
const {
  countPendingOrders,
  formatPendingOrderBadge,
} = require('@/helpers/orderNotifications')
const { isKioskRoute } = require('@/helpers/kioskAccess')
const { attemptStorageKey, readAttempt, canUseStandaloneTerminal } = require('@/helpers/standaloneTerminal')
export default {
  components: { StandaloneTerminalDialog },
  mixins: [listdashboard],
  middleware: ['courier', 'delivery'],
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
      terminalDialog: false,
      terminalRecovery: false,
    }
  },
  computed: {
    terminalIdentity() {
      return attemptStorageKey(this.idUser)
    },
    currentTerminalReader() {
      return this.$store.get('stripeTerminal/currentReader') || null
    },
    showTerminalPayment() {
      return canUseStandaloneTerminal({
        user: this.idUser, reader: this.currentTerminalReader,
        path: this.$route.path, hasRecovery: this.terminalRecovery,
      })
    },
    isKioskPage() {
      return isKioskRoute(this.$route)
    },
    navigationItems() {
      return getAccessibleNavigationItems(
        this.userAccess,
        [...this.list.filter(item => item.to !== '/livraison'), {
          title: 'Livraison', to: '/livraison', routeName: 'livraison', moduleKey: 'delivery', icon: 'mdi-truck-delivery-outline',
        }],
        this.modulePermissions,
        this.isPrimaryAdmin
      )
    },
    navigationGroups() {
      const groups = [
        {
          key: 'service',
          title: 'Service',
          routeNames: [
            'index',
            'products',
            'caisse-menu',
            'orders',
            'livraison',
            'cashregister',
          ],
          names: [],
        },
        {
          key: 'pilotage',
          title: 'Pilotage',
          routeNames: ['history', 'statistics', 'clients'],
          names: [],
        },
        {
          key: 'gestion',
          title: 'Gestion',
          routeNames: ['stocks', 'reports', 'staff', 'tables'],
          names: [],
        },
        {
          key: 'parametres',
          title: 'Parametres',
          routeNames: ['settings', 'bornes'],
          names: ['logout'],
        },
      ]
      const assignedRouteNames = new Set(
        groups.flatMap((group) => group.routeNames)
      )
      const assignedNames = new Set(groups.flatMap((group) => group.names))

      return groups
        .map((group) => ({
          ...group,
          items: this.navigationItems.filter((item) => {
            if (group.names.includes(item.name)) return true
            if (group.routeNames.includes(item.routeName)) return true
            if (group.key !== 'parametres') return false

            return (
              !assignedRouteNames.has(item.routeName) &&
              !assignedNames.has(item.name)
            )
          }),
        }))
        .filter((group) => group.items.length)
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
    modulePermissions() {
      return Array.isArray(this.idUser && this.idUser.module_permissions)
        ? this.idUser.module_permissions
        : null
    },
    isPrimaryAdmin() {
      return Boolean(this.idUser && this.idUser.is_primary_admin)
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
    drawerToggleIcon() {
      if (!this.drawer) return 'mdi-menu'
      if (this.miniVariant) return 'mdi-dock-left'

      return 'mdi-menu-open'
    },
    drawerToggleLabel() {
      if (!this.drawer) return 'Ouvrir le menu'
      if (this.miniVariant) return 'Fermer le menu'

      return 'Reduire le menu'
    },
    internalHomePaths() {
      return ['/']
    },
    publicClientPaths() {
      return [
        '/cart',
        '/ordersStatuses',
        '/table-access',
        '/click-and-collect',
      ]
    },
    showFloatingHomeButton() {
      if (!this.isStaffUser) return false
      if (!this.$vuetify.breakpoint.smAndUp) return false

      const path = this.$route.path
      if (this.internalHomePaths.includes(path)) return false

      return !this.publicClientPaths.some(
        (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
      )
    },
    currentPage() {
      if (this.$route.name === 'history-terminal-ticket-id') return { title: 'Ticket de paiement', icon: 'mdi-receipt-text-check-outline' }
      if (this.$route.path === '/livraison') return { title: 'Livraison', icon: 'mdi-truck-delivery-outline' }
      const title = this.list.find(
        (item) => item.routeName === this.$route.name
      ) || {
        title: this.$route.name,
        icon: '',
      }
      return title
    },
  },
  watch: {
    terminalIdentity() {
      this.terminalDialog = false
      this.terminalRecovery = false
      if (this.ordersPollingReady) this.syncTerminalAccess()
    },
    '$route.path'() {
      if (this.ordersPollingReady) this.syncTerminalAccess()
    },
    userAccess() {
      this.syncOrdersPolling()
    },
  },
  mounted() {
    this.ordersPollingReady = true
    this.syncOrdersPolling()
    this.syncTerminalAccess()
    if (typeof window !== 'undefined') window.addEventListener('focus', this.syncTerminalAccess)
  },
  beforeDestroy() {
    this.stopOrdersPolling()
    if (typeof window !== 'undefined') window.removeEventListener('focus', this.syncTerminalAccess)
  },
  methods: {
    async syncTerminalAccess() {
      const permitted = canUseStandaloneTerminal({ user: this.idUser, path: this.$route.path, hasRecovery: true })
      if (!permitted) {
        this.terminalDialog = false
        this.terminalRecovery = false
        return
      }
      this.terminalRecovery = Boolean(readAttempt(typeof localStorage === 'undefined' ? null : localStorage, this.terminalIdentity))
      try { await this.$store.dispatch('stripeTerminal/getCurrentReader') } catch (_) {}
    },
    canAccessModule(access, moduleKey) {
      return canUseModule(
        access,
        moduleKey,
        this.modulePermissions,
        this.isPrimaryAdmin
      )
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
    cycleDrawerState() {
      if (!this.drawer) {
        this.drawer = true
        this.miniVariant = false
        return
      }

      if (!this.miniVariant) {
        this.miniVariant = true
        return
      }

      this.miniVariant = false
      this.drawer = false
    },
    goToInternalHome() {
      this.$router.push('/')
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
<style scoped>
.toolbar-terminal-button {
  width: 44px !important;
  height: 44px !important;
  background: var(--se-color-primary-soft);
}

.toolbar-terminal-button:focus-visible {
  outline: 2px solid var(--se-color-primary);
  outline-offset: 2px;
}

.app-top-bar {
  background: rgba(255, 255, 255, 0.96) !important;
  border-bottom: 1px solid var(--se-color-border-soft) !important;
  color: var(--se-color-text) !important;
}

::v-deep .app-top-bar .v-toolbar__content {
  gap: 14px;
  min-height: 58px;
  padding-left: 18px !important;
  padding-right: 18px !important;
}

.top-bar-left-actions,
.top-bar-right-actions {
  align-items: center;
  display: inline-flex;
  gap: 6px;
}

.top-bar-left-actions {
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-pill);
  padding: 3px;
}

.top-bar-right-actions {
  justify-content: flex-end;
}

.top-bar-icon-button {
  color: var(--se-color-text-muted) !important;
  height: 36px !important;
  transition:
    background-color var(--se-transition-fast),
    color var(--se-transition-fast),
    transform var(--se-transition-fast);
  width: 36px !important;
}

.top-bar-icon-button:hover {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
}

.top-bar-icon-button--danger:hover {
  background: var(--se-color-danger-soft) !important;
  color: var(--se-color-danger) !important;
}

.top-bar-page-chip {
  align-items: center;
  display: inline-flex;
  gap: 10px;
  min-width: 0;
}

.top-bar-page-icon {
  align-items: center;
  background: var(--se-color-primary-soft);
  border: 1px solid rgba(25, 118, 210, 0.08);
  border-radius: var(--se-radius-md);
  color: var(--se-color-primary);
  display: inline-flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.top-bar-page-icon .v-icon {
  color: currentColor;
  font-size: 23px;
}

.top-bar-page-title {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-semibold);
  letter-spacing: 0;
  line-height: 1.2;
  max-width: min(42vw, 420px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-side-drawer {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 42%, #f3f7fb 100%) !important;
  border-right: 1px solid var(--se-color-border-soft) !important;
}

.side-nav-mini-rail {
  box-shadow: 4px 0 16px rgba(18, 24, 38, 0.04) !important;
}

.side-drawer-brand {
  align-items: center;
  display: flex;
  gap: 10px;
  min-height: 64px;
  padding: 14px 14px 10px;
}

.side-drawer-brand--mini {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.side-drawer-brand__mark {
  align-items: center;
  background: var(--se-color-primary-soft);
  border: 1px solid rgba(25, 118, 210, 0.08);
  border-radius: var(--se-radius-md);
  color: var(--se-color-primary);
  display: inline-flex;
  flex: 0 0 38px;
  height: 38px;
  justify-content: center;
  transition:
    background-color var(--se-transition-fast),
    transform var(--se-transition-fast);
  width: 38px;
}

.side-drawer-brand--mini .side-drawer-brand__mark {
  height: 42px;
  width: 42px;
}

.side-drawer-brand__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.side-drawer-brand__copy strong {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-bold);
  line-height: 1.1;
}

.side-drawer-brand__copy span {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-medium);
  line-height: 1.25;
  margin-top: 2px;
}

.side-nav-list {
  padding: 4px 10px 14px;
}

.side-nav-section-title {
  color: var(--se-color-text-muted) !important;
  font-size: 0.6875rem;
  font-weight: var(--se-weight-bold);
  height: 26px;
  letter-spacing: 0;
  line-height: 26px;
  padding: 12px 10px 4px !important;
  text-transform: none;
}

.side-nav-item {
  border-radius: var(--se-radius-md);
  color: var(--se-color-text-body) !important;
  margin: 3px 0;
  min-height: 42px;
  padding: 0 10px !important;
  transition:
    background-color var(--se-transition-fast),
    color var(--se-transition-fast),
    transform var(--se-transition-fast);
}

.side-nav-item:hover {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
  transform: translateX(2px);
}

.side-nav-item:focus-visible {
  box-shadow: var(--se-focus-ring);
  outline: 0;
}

.side-nav-item--active {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
  font-weight: var(--se-weight-bold);
}

.side-nav-item--active .side-nav-item__icon {
  box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.12);
}

.side-nav-item--danger:hover,
.side-nav-item--danger.side-nav-item--active {
  background: var(--se-color-danger-soft) !important;
  color: var(--se-color-danger) !important;
}

.side-nav-item--after-section {
  margin-top: 13px;
}

.side-nav-item__action {
  align-items: center;
  justify-content: center;
  margin: 0 12px 0 0 !important;
  min-width: 34px !important;
}

.side-nav-item__icon {
  align-items: center;
  border-radius: var(--se-radius-sm);
  display: inline-flex;
  height: 32px;
  justify-content: center;
  position: relative;
  transition:
    background-color var(--se-transition-fast),
    box-shadow var(--se-transition-fast),
    transform var(--se-transition-fast);
  width: 32px;
}

.side-nav-item--active .side-nav-item__icon,
.side-nav-item:hover .side-nav-item__icon {
  background: #ffffff;
}

.side-nav-item__icon .v-icon {
  color: currentColor !important;
  font-size: 21px;
}

.side-nav-mini-badge {
  align-items: center;
  background: var(--se-color-success);
  border: 2px solid #ffffff;
  border-radius: var(--se-radius-pill);
  color: #ffffff;
  display: inline-flex;
  font-size: 0.625rem;
  font-weight: var(--se-weight-bold);
  height: 18px;
  justify-content: center;
  line-height: 1;
  min-width: 18px;
  padding: 0 4px;
  position: absolute;
  right: -8px;
  top: -7px;
}

.side-nav-item__content {
  min-width: 0;
}

.side-nav-item__title {
  align-items: center;
  color: inherit;
  display: flex;
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-semibold);
  gap: 8px;
  justify-content: space-between;
  letter-spacing: 0;
  line-height: 1.25;
}

.side-nav-item__badge {
  flex: 0 0 auto;
}

::v-deep .app-side-drawer.v-navigation-drawer--mini-variant .v-list-item {
  justify-content: center;
  padding: 0 !important;
}

::v-deep .side-nav-mini-rail .v-list-item {
  min-height: 48px;
}

::v-deep .app-side-drawer.v-navigation-drawer--mini-variant .side-nav-list {
  padding-left: 12px;
  padding-right: 12px;
}

::v-deep .app-side-drawer.v-navigation-drawer--mini-variant .side-nav-item__action {
  margin: 0 !important;
}

::v-deep .side-nav-mini-rail .side-nav-item__icon {
  height: 40px;
  width: 40px;
}

::v-deep .side-nav-mini-rail .side-nav-item--active .side-nav-item__icon {
  background: var(--se-color-primary) !important;
  color: #ffffff !important;
  box-shadow: 0 6px 12px rgba(25, 118, 210, 0.2);
}

::v-deep .side-nav-mini-rail .side-nav-item:hover {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .side-nav-item {
    transition: none;
  }
}

.toolbar-home-button {
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 5px 14px rgba(25, 118, 210, 0.2);
}

.toolbar-home-button .v-icon {
  font-size: 28px;
}

@media (max-width: 720px) {
  ::v-deep .app-top-bar .v-toolbar__content {
    gap: 8px;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .top-bar-left-actions {
    gap: 2px;
  }

  .top-bar-icon-button {
    height: 34px !important;
    width: 34px !important;
  }

  .top-bar-page-icon {
    height: 34px;
    width: 34px;
  }

  .top-bar-page-title {
    font-size: var(--se-font-body);
    max-width: 34vw;
  }
}
</style>
