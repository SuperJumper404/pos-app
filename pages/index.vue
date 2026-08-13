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
        <span>Modules</span>
        <small>{{ moduleCards.length }} acces disponible(s)</small>
      </div>

      <v-row dense>
        <v-col
          v-for="module in moduleCards"
          :key="module.to"
          cols="6"
          sm="4"
          md="3"
          lg="2"
        >
          <button class="module-card" type="button" @click="goToModule(module)">
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
  background: #f3f5f8;
  color: #1f2933;
}

.home-dashboard__content {
  max-width: 1160px;
  margin: 0 auto;
}

.home-dashboard__hero {
  margin-bottom: 22px;
  padding: 24px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(520px, 1.45fr);
  gap: 24px;
  align-items: center;
}

.home-dashboard__eyebrow {
  color: #1976d2;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.home-dashboard__title {
  margin: 4px 0;
  color: #121826;
  font-size: 2.15rem;
  font-weight: 700;
  letter-spacing: 0;
}

.home-dashboard__subtitle {
  color: #687386;
  font-size: 0.9rem;
}

.home-dashboard__section-title {
  margin: 0 0 10px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: #121826;
}

.home-dashboard__section-title span {
  font-size: 1.12rem;
  font-weight: 700;
}

.home-dashboard__section-title small {
  color: #687386;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.info-tile {
  min-height: 118px;
  padding: 14px 12px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.info-tile__icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.info-tile__icon .v-icon {
  font-size: 21px;
}

.info-tile__icon--primary {
  background: #e8f2ff;
  color: #1976d2;
}

.info-tile__icon--success {
  background: #e8f8ef;
  color: #12a150;
}

.info-tile__icon--warning {
  background: #fff6df;
  color: #d89800;
}

.info-tile__icon--danger {
  background: #ffecec;
  color: #d83b3b;
}

.info-tile__label {
  color: #687386;
  font-size: 0.78rem;
  font-weight: 600;
}

.info-tile strong {
  color: #121826;
  font-size: 1rem;
  line-height: 1.2;
}

.module-card {
  width: 100%;
  min-height: 154px;
  padding: 16px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2933;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  text-align: left;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  transition: background 0.15s ease, border-color 0.15s ease,
    box-shadow 0.15s ease, transform 0.15s ease;
}

.module-card:focus {
  outline: 3px solid rgba(25, 118, 210, 0.24);
  outline-offset: 2px;
}

.module-card:hover {
  border-color: #1976d2;
  background: #f8fbff;
  box-shadow: 0 12px 26px rgba(25, 118, 210, 0.16);
  transform: translateY(-3px);
}

.module-card__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #edf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-card__icon {
  color: #1976d2;
  font-size: 26px;
}

.module-card__body {
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.module-card__body strong {
  color: #121826;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.module-card__body small {
  color: #687386;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
}

.module-card__arrow {
  align-self: flex-end;
  color: #9aa5b5;
  font-size: 20px;
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

  .module-card__body strong {
    font-size: 0.92rem;
  }
}
</style>
