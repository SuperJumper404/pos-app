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
      class="client-top-bar"
      fixed
      app
    >
      <nav class="client-nav-shell" aria-label="Navigation client">
        <v-tabs
          centered
          class="client-segmented-tabs"
          grow
          hide-slider
        >
          <v-tab class="client-nav-tab" to="/menus">
            <span class="client-nav-tab__icon">
              <v-icon size="21">mdi-silverware-clean</v-icon>
            </span>
            <span class="client-nav-tab__label">Menus</span>
          </v-tab>
          <v-tab class="client-nav-tab" to="/ordersStatuses">
            <span class="client-nav-tab__icon">
              <v-icon size="21">mdi-order-bool-ascending</v-icon>
            </span>
            <span class="client-nav-tab__label">Mes commandes</span>
          </v-tab>
        </v-tabs>
      </nav>
    </v-app-bar>
    <v-main>
      <!-- <v-container fluid> -->
      <nuxt />
      <!-- </v-container> -->
    </v-main>
  </v-app>
</template>
<script>
export default {
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
  },
}
</script>
<style scoped>
.client-top-bar {
  background: var(--se-color-surface) !important;
  border-bottom: 1px solid var(--se-color-border-soft);
  box-shadow: none !important;
}

::v-deep .client-top-bar .v-toolbar__content {
  align-items: center;
  justify-content: center;
  padding: 5px 12px !important;
}

.client-nav-shell {
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border);
  border-radius: 999px;
  margin-bottom: 8px;
  margin-top: 8px;
  max-width: 560px;
  padding: 4px 4px 8px;
  width: min(560px, calc(100vw - 96px));
}

.client-segmented-tabs {
  border-radius: 999px;
  height: 44px;
}

::v-deep .client-segmented-tabs .v-slide-group__content {
  gap: 4px;
}

.client-nav-tab {
  align-items: center;
  border-radius: 999px;
  color: var(--se-color-text-body) !important;
  display: inline-flex;
  font-weight: 900;
  gap: 8px;
  letter-spacing: 0;
  min-height: 44px;
  min-width: 0;
  padding: 0 16px;
  text-transform: none;
  transition: background-color 180ms ease, color 180ms ease;
}

.client-nav-tab.v-tab--active {
  background: var(--se-color-primary) !important;
  color: var(--se-color-surface) !important;
}

.client-nav-tab__icon {
  align-items: center;
  background: var(--se-color-primary-soft);
  border-radius: 999px;
  color: var(--se-color-primary);
  display: inline-flex;
  flex: 0 0 30px;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.client-nav-tab.v-tab--active .client-nav-tab__icon {
  background: rgba(255, 255, 255, 0.18);
  color: var(--se-color-surface);
}

.client-nav-tab__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 599px) {
  .client-nav-shell {
    width: calc(100vw - 24px);
  }

  .client-nav-tab {
    font-size: 0.84rem;
    gap: 6px;
    padding: 0 9px;
  }

  .client-nav-tab__icon {
    flex-basis: 28px;
    height: 28px;
    width: 28px;
  }
}
</style>
