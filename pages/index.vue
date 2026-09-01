<template>
  <v-container fluid class="home-dashboard pa-4 pa-md-6">
    <Loading v-if="loadPage && !isInternalUser" />

    <div v-else class="home-dashboard__content">
      <section class="home-dashboard__hero">
        <div class="home-dashboard__intro">
          <div class="home-dashboard__eyebrow">Caisse active</div>
          <h1 class="home-dashboard__title">{{ shopName || 'Accueil' }}</h1>
          <div class="home-dashboard__subtitle">
            {{ connectedUserLabel }} - {{ currentDateTime }}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-tile">
            <span class="info-tile__icon info-tile__icon--primary">
              <v-icon>mdi-account-badge</v-icon>
            </span>
            <span class="info-tile__label">{{ roleLabel }}</span>
            <strong>{{ connectedUserShortLabel }}</strong>
          </div>
          <div class="info-tile">
            <span
              :class="[
                'info-tile__icon',
                kitchenClosed ? 'info-tile__icon--danger' : 'info-tile__icon--success',
              ]"
            >
              <v-icon>mdi-chef-hat</v-icon>
            </span>
            <span class="info-tile__label">Cuisine</span>
            <strong>{{ kitchenStatusLabel }}</strong>
          </div>
          <div class="info-tile">
            <span class="info-tile__icon info-tile__icon--warning">
              <v-icon>mdi-bell-ring-outline</v-icon>
            </span>
            <span class="info-tile__label">Commandes</span>
            <strong>{{ pendingOrderCount }} en attente</strong>
          </div>
          <div class="info-tile">
            <span class="info-tile__icon info-tile__icon--success">
              <v-icon>mdi-cart-minus</v-icon>
            </span>
            <span class="info-tile__label">Panier</span>
            <strong>{{ indexCart }} article(s)</strong>
          </div>
        </div>
      </section>

      <div class="home-dashboard__section-title">
        <span>Acces principaux</span>
        <small>{{ mainModuleCards.length }} module(s) prioritaire(s)</small>
      </div>

      <v-row dense class="main-modules-grid">
        <v-col
          v-for="module in mainModuleCards"
          :key="module.to"
          cols="12"
          sm="6"
          lg="4"
          class="main-module-col"
        >
          <button
            class="module-card module-card--main"
            type="button"
            @click="goToModule(module)"
          >
            <span class="module-card__icon-wrap">
              <v-icon class="module-card__icon">{{ module.icon }}</v-icon>
            </span>
            <span class="module-card__body">
              <strong>{{ module.title }}</strong>
              <small>{{ getModuleDescription(module) }}</small>
            </span>
            <v-icon class="module-card__arrow">mdi-arrow-right</v-icon>
          </button>
        </v-col>
      </v-row>

      <div
        v-if="secondaryModuleCards.length"
        class="home-dashboard__section-title home-dashboard__section-title--secondary"
      >
        <span>Autres modules</span>
        <small>{{ secondaryModuleCards.length }} acces secondaire(s)</small>
      </div>

      <div v-if="secondaryModuleCards.length" class="secondary-modules-grid">
        <div
          v-for="module in secondaryModuleCards"
          :key="module.to"
          class="secondary-module-col"
        >
          <button
            class="module-card module-card--secondary"
            type="button"
            @click="goToModule(module)"
          >
            <span class="module-card__icon-wrap">
              <v-icon class="module-card__icon">{{ module.icon }}</v-icon>
            </span>
            <span class="module-card__body">
              <strong>{{ module.title }}</strong>
            </span>
          </button>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'
import listdashboard from '@/helpers/listdashboard'
const {
  getAccessibleNavigationItems,
  getRoleLabel,
  isStaffAccess,
} = require('@/helpers/staffRoles')
const { isKioskOnlyUser } = require('@/helpers/kioskAccess')
const { countPendingOrders } = require('@/helpers/orderNotifications')

export default {
  components: {
    Loading,
  },
  mixins: [listdashboard],
  layout() {
    return isStaffAccess(parseInt(localStorage.getItem('access')))
      ? 'default'
      : 'clientside'
  },
  middleware: ['auth'],
  data() {
    return {
      loadPage: false,
      accessUser: 0,
      now: new Date(),
      clockTimer: null,
      moduleDescriptions: {
        statistics: 'Suivi du chiffre et activite',
        categories: 'Classer les produits',
        products: 'Catalogue et prix',
        customizations: 'Options produits',
        menus: 'Prise de commande',
        orders: 'Commandes en cours',
        cashregister: 'Encaissement et tiroir',
        history: 'Tickets et archives',
        stocks: 'Niveaux de stock',
        reports: 'Exports et rapports',
        staff: 'Equipe et acces',
        tables: 'Salle et tables',
        settings: 'Parametres boutique',
        website: 'Click-and-collect',
      },
    }
  },
  computed: {
    idUser() {
      return this.$store.get('users/user')
    },
    userAccess() {
      const access = this.idUser && this.idUser.access
      return access === undefined || access === null
        ? this.accessUser
        : Number(access)
    },
    isInternalUser() {
      return isStaffAccess(this.accessUser)
    },
    modulePermissions() {
      return Array.isArray(this.idUser && this.idUser.module_permissions)
        ? this.idUser.module_permissions
        : null
    },
    isPrimaryAdmin() {
      return Boolean(this.idUser && this.idUser.is_primary_admin)
    },
    moduleCards() {
      return getAccessibleNavigationItems(
        this.userAccess,
        this.list,
        this.modulePermissions,
        this.isPrimaryAdmin
      ).filter((item) => item.to && item.routeName !== 'index')
    },
    mainModuleCards() {
      const mainRoutes = [
        'caisse-menu',
        'orders',
        'cashregister',
        'history',
        'statistics',
        'reports',
      ]
      return mainRoutes
        .map((routeName) =>
          this.moduleCards.find((module) => module.routeName === routeName)
        )
        .filter(Boolean)
    },
    secondaryModuleCards() {
      const mainRouteNames = new Set(
        this.mainModuleCards.map((module) => module.routeName)
      )
      return this.moduleCards.filter(
        (module) => !mainRouteNames.has(module.routeName)
      )
    },
    shopName() {
      return this.$store.get('shop/shop_name')
    },
    roleLabel() {
      return getRoleLabel(this.userAccess)
    },
    connectedUserLabel() {
      return `${this.roleLabel} connecte sur la caisse ${this.connectedUserShortLabel}`
    },
    connectedUserShortLabel() {
      const userDetail = this.$store.get('users/userDetail')
      const username = Array.isArray(userDetail)
        ? userDetail[0] && userDetail[0].username
        : userDetail && userDetail.username

      return username || `#${this.idUser && this.idUser.id ? this.idUser.id : '-'}`
    },
    currentDateTime() {
      return this.now.toLocaleString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    kitchenClosed() {
      return Boolean(this.$store.get('shop/kitchen_closed'))
    },
    kitchenStatusLabel() {
      return this.kitchenClosed ? 'Fermee' : 'Ouverte'
    },
    pendingOrderCount() {
      return countPendingOrders(this.$store.get('orders/dataOrders'))
    },
    indexCart() {
      return this.$store.get('cart/indexCart')
    },
  },
  mounted() {
    this.loadPage = true
    this.accessUser = parseInt(localStorage.getItem('access'))
    if (isKioskOnlyUser(this.idUser)) {
      this.$router.replace('/borne')
      this.loadPage = false
      return
    }
    const apiCalls = []
    this.clockTimer = setInterval(() => {
      this.now = new Date()
    }, 30000)

    if (this.accessUser === 2 || this.accessUser === 3) {
      this.$router.push('/menus')
      apiCalls.push(
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('orders/getAllOrder')
      )
    }

    if (this.isInternalUser) {
      apiCalls.push(
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('categories/getAllCategories'),
        this.$store.dispatch('stocks/getAllStock'),
        this.$store.dispatch('orders/getAllOrder'),
        this.$store.dispatch('tables/getAllTables'),
        this.$store.dispatch('shop/getShopInfo'),
        this.$store.dispatch('users/detailUser', localStorage.getItem('idUser'))
      )
    }

    Promise.all(apiCalls).finally(() => {
      this.loadPage = false
    })
  },
  beforeDestroy() {
    if (this.clockTimer) clearInterval(this.clockTimer)
  },
  methods: {
    goToModule(module) {
      this.$router.push(module.to)
    },
    getModuleDescription(module) {
      return (
        this.moduleDescriptions[module.routeName || module.moduleKey] ||
        'Ouvrir le module'
      )
    },
  },
}
</script>

<style scoped>
.home-dashboard {
  min-height: calc(100vh - 64px);
  background: var(--se-color-bg);
  color: var(--se-color-text-body);
}

.home-dashboard__content {
  width: 100%;
}

.home-dashboard__hero {
  margin-bottom: 22px;
  padding: 24px;
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  background: var(--se-color-surface);
  box-shadow: var(--se-shadow-panel);
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(520px, 1.45fr);
  gap: 24px;
  align-items: center;
}

.home-dashboard__eyebrow {
  color: var(--se-color-primary);
  font-size: var(--se-font-caption);
  font-weight: 700;
  text-transform: uppercase;
}

.home-dashboard__title {
  margin: 4px 0;
  color: var(--se-color-text);
  font-size: var(--se-font-display);
  font-weight: 700;
  letter-spacing: 0;
}

.home-dashboard__subtitle {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
}

.home-dashboard__section-title {
  margin: 0 0 10px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: var(--se-color-text);
}

.home-dashboard__section-title span {
  font-size: var(--se-font-title-sm);
  font-weight: 700;
}

.home-dashboard__section-title small {
  color: var(--se-color-text-muted);
  font-weight: 600;
}

.home-dashboard__section-title--secondary {
  margin-top: 26px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.info-tile {
  min-height: 118px;
  padding: 14px 12px;
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  background: var(--se-color-surface-muted);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.info-tile__icon {
  width: 34px;
  height: 34px;
  border-radius: var(--se-radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.info-tile__icon .v-icon {
  font-size: 21px;
}

.info-tile__icon--primary {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.info-tile__icon--success {
  background: var(--se-color-success-soft);
  color: var(--se-color-success);
}

.info-tile__icon--warning {
  background: var(--se-color-warning-soft);
  color: var(--se-color-warning);
}

.info-tile__icon--danger {
  background: var(--se-color-danger-soft);
  color: var(--se-color-danger);
}

.info-tile__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: 600;
}

.info-tile strong {
  color: var(--se-color-text);
  font-size: 1rem;
  line-height: 1.2;
}

.module-card {
  width: 100%;
  min-height: 154px;
  padding: 16px;
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  background: var(--se-color-surface);
  color: var(--se-color-text-body);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  text-align: left;
  box-shadow: var(--se-shadow-panel);
  transition: background 0.15s ease, border-color 0.15s ease,
    box-shadow 0.15s ease, transform 0.15s ease;
}

.main-module-col,
.secondary-module-col {
  padding: 10px !important;
}

.module-card:focus {
  outline: 3px solid rgba(25, 118, 210, 0.24);
  outline-offset: 2px;
}

.module-card:hover {
  border-color: var(--se-color-primary);
  background: var(--se-color-primary-soft);
  box-shadow: 0 12px 26px rgba(25, 118, 210, 0.16);
  transform: translateY(-3px);
}

.module-card__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--se-radius-md);
  background: var(--se-color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-card__icon {
  color: var(--se-color-primary);
  font-size: 26px;
}

.module-card__body {
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.module-card__body strong {
  color: var(--se-color-text);
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.module-card__body small {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: 600;
  line-height: 1.3;
}

.module-card__arrow {
  align-self: flex-end;
  color: var(--se-color-text-muted);
  font-size: 20px;
}

.main-modules-grid {
  align-items: stretch;
  margin: -10px;
}

.module-card--main {
  align-items: center;
  gap: 18px;
  justify-content: center;
  min-height: 246px;
  padding: 28px;
  text-align: center;
}

.module-card--main .module-card__icon-wrap {
  height: 82px;
  width: 82px;
}

.module-card--main .module-card__icon {
  font-size: 48px;
}

.module-card--main .module-card__body {
  align-items: center;
  gap: 8px;
}

.module-card--main .module-card__body strong {
  font-size: 1.42rem;
}

.module-card--main .module-card__body small {
  font-size: var(--se-font-small);
}

.module-card--main .module-card__arrow {
  align-self: center;
  font-size: 28px;
}

.secondary-modules-grid {
  display: flex;
  gap: 14px;
  justify-content: center;
  overflow-x: auto;
  padding-bottom: 18px;
  white-space: nowrap;
}

.secondary-module-col {
  flex: 0 0 132px;
}

.module-card--secondary {
  align-items: center;
  height: 100%;
  min-height: 86px;
  padding: 12px;
  gap: 9px;
  text-align: center;
}

.module-card--secondary .module-card__icon-wrap {
  height: 40px;
  width: 40px;
}

.module-card--secondary .module-card__icon {
  font-size: 24px;
}

.module-card--secondary .module-card__body strong {
  font-size: 0.82rem;
}

.module-card--secondary .module-card__arrow,
.module-card--secondary .module-card__body small {
  display: none;
}

@media (max-width: 960px) {
  .home-dashboard__hero {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .home-dashboard {
    padding: 12px !important;
  }

  .home-dashboard__hero {
    padding: 18px;
  }

  .home-dashboard__title {
    font-size: 1.65rem;
  }

  .module-card {
    min-height: 142px;
    padding: 14px;
  }

  .module-card--main {
    min-height: 206px;
    padding: 18px;
  }

  .module-card--main .module-card__icon-wrap {
    height: 68px;
    width: 68px;
  }

  .module-card--main .module-card__icon {
    font-size: 40px;
  }

  .module-card--secondary {
    min-height: 78px;
    padding: 11px;
  }

  .secondary-module-col {
    flex-basis: 118px;
  }

  .module-card__body strong {
    font-size: 0.92rem;
  }

  .module-card--main .module-card__body strong {
    font-size: 1.16rem;
  }
}
</style>
