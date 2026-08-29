<template>
  <v-container fluid class="statistics-page full-width pa-5">
    <v-card outlined class="statistics-toolbar">
      <div class="statistics-toolbar__section statistics-toolbar__section--presets">
        <div class="statistics-toolbar__label">Période rapide</div>
        <div class="statistics-toolbar__presets">
          <v-btn
            v-for="preset in datePresets"
            :key="preset.value"
            :class="[
              'statistics-preset',
              'text-none',
              {
                'statistics-preset--purple-active':
                  currentDateButton === preset.value &&
                  preset.color === 'primaryPurple',
              },
            ]"
            small
            depressed
            :outlined="currentDateButton !== preset.value"
            :color="preset.color"
            @click="preset.action"
          >
            <v-icon small left>{{ preset.icon }}</v-icon>
            {{ preset.label }}
          </v-btn>
        </div>
      </div>

      <div class="statistics-toolbar__section statistics-toolbar__section--dates">
        <div class="statistics-toolbar__label">Période personnalisée</div>
        <div class="statistics-toolbar__dates">
          <v-menu
            v-model="menuFrom"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template #activator="{ on, attrs }">
              <v-text-field
                v-model="from"
                class="statistics-date-field"
                label="Début"
                prepend-inner-icon="mdi-calendar-start"
                readonly
                dense
                outlined
                hide-details
                v-bind="attrs"
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="from"
              locale="fr"
              @input="menuFrom = false"
            ></v-date-picker>
          </v-menu>

          <span class="statistics-date-separator">à</span>

          <v-menu
            v-model="menuTo"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template #activator="{ on, attrs }">
              <v-text-field
                v-model="to"
                class="statistics-date-field"
                label="Fin"
                prepend-inner-icon="mdi-calendar-end"
                readonly
                dense
                outlined
                hide-details
                v-bind="attrs"
                v-on="on"
              ></v-text-field>
            </template>
            <v-date-picker
              v-model="to"
              :min="from"
              locale="fr"
              @input="menuTo = false"
            ></v-date-picker>
          </v-menu>
        </div>
      </div>

      <v-btn
        color="primary"
        class="statistics-refresh text-none"
        depressed
        :loading="metricsLoading"
        @click="fetchMetrics"
      >
        <v-icon small left>mdi-refresh</v-icon>
        Rafraîchir
      </v-btn>
    </v-card>

    <v-row class="mt-5" dense>
      <v-col
        v-for="card in kpiCards"
        :key="card.label"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-card outlined class="statistics-kpi" :class="card.className">
          <div class="statistics-kpi__icon">
            <v-icon>{{ card.icon }}</v-icon>
          </div>
          <div>
            <div class="statistics-kpi__label">{{ card.label }}</div>
            <div class="statistics-kpi__value">{{ card.value }}</div>
            <div class="statistics-kpi__hint">{{ card.hint }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4" dense>
      <v-col cols="12" lg="6">
        <v-card outlined class="statistics-panel">
          <div class="statistics-panel__header">
            <div>
              <div class="statistics-panel__title">
                <v-icon color="primary" left>mdi-credit-card-outline</v-icon>
                Répartition des paiements
              </div>
              <div class="statistics-panel__subtitle">
                Montants encaissés par moyen de paiement
              </div>
            </div>
          </div>

          <v-data-table
            :headers="paymentHeaders"
            :items="paymentRows"
            dense
            :disable-sort="$vuetify.breakpoint.smAndDown"
            hide-default-footer
            class="statistics-table"
            no-data-text="Aucun paiement sur cette période"
          >
            <template #[`item.amount`]="{ item }">
              <strong>{{ formatCurrency(item.amount) }}</strong>
            </template>
            <template #[`item.percentage`]="{ item }">
              <div class="statistics-bar-cell">
                <v-progress-linear
                  :value="percentageWidth(item.percentage)"
                  height="8"
                  rounded
                  color="primary"
                  background-color="#e8edf3"
                ></v-progress-linear>
                <span>{{ item.percentage }}%</span>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card outlined class="statistics-panel">
          <div class="statistics-panel__header">
            <div>
              <div class="statistics-panel__title">
                <v-icon color="primary" left>mdi-fire</v-icon>
                Top produits
              </div>
              <div class="statistics-panel__subtitle">
                Les produits qui génèrent le plus de revenu
              </div>
            </div>
          </div>

          <v-data-table
            :headers="productHeaders"
            :items="productRows"
            dense
            hide-default-footer
            class="statistics-table"
            no-data-text="Aucun produit vendu sur cette période"
          >
            <template #[`item.name`]="{ item, index }">
              <div class="statistics-product">
                <span class="statistics-rank">{{ index + 1 }}</span>
                <span>{{ item.name }}</span>
              </div>
            </template>
            <template #[`item.qty`]="{ item }">
              <v-chip small class="statistics-qty">
                {{ item.qty }}
              </v-chip>
            </template>
            <template #[`item.revenue`]="{ item }">
              <div class="statistics-bar-cell">
                <v-progress-linear
                  :value="revenueWidth(item.revenue)"
                  height="8"
                  rounded
                  color="success"
                  background-color="#e8edf3"
                ></v-progress-linear>
                <strong>{{ formatCurrency(item.revenue) }}</strong>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <Loading v-if="loadPage && !accessUser" />
  </v-container>
</template>

<script>
import listdashboard from '@/helpers/listdashboard'
import Loading from '@/components/loading'
import price from '@/helpers/price'

export default {
  components: {
    Loading,
  },
  mixins: [listdashboard, price],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: ['auth'],
  data() {
    return {
      loadPage: false,
      metricsLoading: false,
      accessUser: 0,
      menuFrom: false,
      menuTo: false,
      currentDateButton: 1,
      from: '',
      to: '',
      paymentHeaders: [
        { text: 'Moyen', value: 'name' },
        { text: 'Montant', value: 'amount' },
        { text: 'Part', value: 'percentage', sortable: false },
      ],
      productHeaders: [
        { text: 'Produit', value: 'name' },
        { text: 'Quantité', value: 'qty' },
        { text: 'Revenu', value: 'revenue' },
      ],
    }
  },

  computed: {
    metrics() {
      return this.$store.get('history/metrics') || {}
    },
    datePresets() {
      return [
        {
          value: 1,
          label: "Aujourd'hui",
          icon: 'mdi-calendar-today',
          color: 'primary',
          action: this.setToday,
        },
        {
          value: 2,
          label: 'Hier',
          icon: 'mdi-calendar-arrow-left',
          color: 'warning',
          action: this.setYesterday,
        },
        {
          value: 3,
          label: 'Semaine en cours',
          icon: 'mdi-calendar-week',
          color: 'success',
          action: this.setThisWeek,
        },
        {
          value: 4,
          label: 'Mois en cours',
          icon: 'mdi-calendar-month',
          color: 'primaryPurple',
          action: this.setThisMonth,
        },
      ]
    },
    kpiCards() {
      return [
        {
          label: 'Total caisse',
          value: this.formatCurrency(this.metrics.totalRevenue || 0),
          hint: 'Chiffre encaissé',
          icon: 'mdi-cash-register',
          className: 'statistics-kpi--revenue',
        },
        {
          label: 'Commandes',
          value: this.metrics.totalOrders || 0,
          hint: 'Volume sur la période',
          icon: 'mdi-silverware-fork-knife',
          className: 'statistics-kpi--orders',
        },
        {
          label: 'Ticket moyen',
          value: this.formatCurrency(this.metrics.averageOrder || 0),
          hint: 'Panier moyen client',
          icon: 'mdi-receipt-text-outline',
          className: 'statistics-kpi--average',
        },
        {
          label: 'Préparation',
          value: `${this.metrics.averageOrderPreparationTime || 0} min`,
          hint: 'Temps moyen commande',
          icon: 'mdi-timer-outline',
          className: 'statistics-kpi--time',
        },
      ]
    },
    paymentRows() {
      return this.metrics.paymentsSummary || []
    },
    productRows() {
      return this.metrics.topProducts || []
    },
    maxProductRevenue() {
      return Math.max(
        0,
        ...this.productRows.map((item) => Number(item.revenue) || 0)
      )
    },
  },
  mounted() {
    this.loadPage = true
    this.accessUser = parseInt(localStorage.getItem('access'))
    const apiCalls = []

    if (this.accessUser === 2 || this.accessUser === 3) {
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
        this.$store.dispatch('history/getMetrics'),
        this.$store.dispatch('shop/getShopInfo')
      )
    }

    Promise.all(apiCalls).finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    async fetchMetrics() {
      this.metricsLoading = true
      try {
        await this.$store.dispatch('history/getMetrics', {
          from: this.from,
          to: this.to,
        })
      } finally {
        this.metricsLoading = false
      }
    },
    setToday() {
      this.currentDateButton = 1
      const today = new Date()
      const iso = today.toISOString().slice(0, 10)
      this.from = iso
      this.to = iso
      this.fetchMetrics()
    },
    setYesterday() {
      this.currentDateButton = 2
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const iso = yesterday.toISOString().slice(0, 10)
      this.from = iso
      this.to = iso
      this.fetchMetrics()
    },
    setThisWeek() {
      this.currentDateButton = 3
      const today = new Date()
      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

      const fromIso = monday.toISOString().slice(0, 10)
      const toIso = today.toISOString().slice(0, 10)

      this.from = fromIso
      this.to = toIso
      this.fetchMetrics()
    },
    setThisMonth() {
      this.currentDateButton = 4
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const fromIso = firstDayOfMonth.toISOString().slice(0, 10)
      const toIso = today.toISOString().slice(0, 10)

      this.from = fromIso
      this.to = toIso
      this.fetchMetrics()
    },
    percentageWidth(value) {
      return Math.min(100, Math.max(0, Number(value) || 0))
    },
    revenueWidth(value) {
      if (!this.maxProductRevenue) return 0
      return Math.min(100, ((Number(value) || 0) / this.maxProductRevenue) * 100)
    },
  },
}
</script>

<style scoped>
.statistics-page {
  background: #f7f9fc;
  min-height: calc(100vh - 64px);
}

.statistics-toolbar {
  align-items: flex-end;
  background: #ffffff;
  border-color: var(--se-color-border) !important;
  display: grid;
  column-gap: 32px;
  row-gap: 18px;
  grid-template-columns: minmax(420px, 1fr) minmax(390px, max-content) minmax(
      160px,
      1fr
    );
  padding: 16px 18px;
}

.statistics-toolbar__section {
  min-width: 0;
}

.statistics-toolbar__section--dates {
  justify-self: center;
  transform: translateX(200px);
}

.statistics-toolbar__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-bold);
  margin-bottom: 8px;
}

.statistics-toolbar__presets,
.statistics-toolbar__dates {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.statistics-preset {
  border-radius: var(--se-radius-sm) !important;
  min-height: 36px;
}

.statistics-preset--purple-active,
.statistics-preset--purple-active ::v-deep .v-icon {
  color: #ffffff !important;
}

.statistics-date-field {
  flex: 0 0 178px;
  max-width: 178px;
}

.statistics-date-field ::v-deep .v-input__slot {
  min-height: 36px !important;
}

.statistics-date-separator {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
}

.statistics-refresh {
  border-radius: var(--se-radius-sm) !important;
  justify-self: end;
  min-height: 38px;
  min-width: 138px;
}

.statistics-kpi {
  align-items: center;
  border-color: var(--se-color-border) !important;
  display: flex;
  gap: 14px;
  min-height: 118px;
  padding: 18px;
}

.statistics-kpi__icon {
  align-items: center;
  border-radius: 12px;
  display: flex;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.statistics-kpi__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-semibold);
}

.statistics-kpi__value {
  color: var(--se-color-text);
  font-size: 26px;
  font-weight: var(--se-weight-bold);
  line-height: 1.15;
  margin-top: 4px;
}

.statistics-kpi__hint {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  margin-top: 4px;
}

.statistics-kpi--revenue .statistics-kpi__icon {
  background: var(--se-color-success-soft);
  color: var(--se-color-success);
}

.statistics-kpi--orders .statistics-kpi__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.statistics-kpi--average .statistics-kpi__icon {
  background: var(--se-color-warning-soft);
  color: var(--se-color-warning);
}

.statistics-kpi--time .statistics-kpi__icon {
  background: var(--se-color-brand-purple-soft);
  color: var(--se-color-brand-purple);
}

.statistics-panel {
  border-color: var(--se-color-border) !important;
  height: 100%;
  overflow: hidden;
}

.statistics-panel__header {
  align-items: center;
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.statistics-panel__title {
  align-items: center;
  color: var(--se-color-text);
  display: flex;
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-semibold);
}

.statistics-panel__subtitle {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  margin-top: 4px;
}

.statistics-table {
  color: var(--se-color-text-body);
}

.statistics-bar-cell {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(90px, 1fr) auto;
  min-width: 160px;
}

.statistics-product {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 180px;
}

.statistics-rank {
  align-items: center;
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: 50%;
  color: var(--se-color-text-muted);
  display: inline-flex;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-bold);
  height: 24px;
  justify-content: center;
  width: 24px;
}

.statistics-qty {
  border-radius: var(--se-radius-pill) !important;
  font-weight: var(--se-weight-bold);
}

@media (max-width: 1180px) {
  .statistics-toolbar {
    grid-template-columns: 1fr;
  }

  .statistics-toolbar__section--dates {
    justify-self: stretch;
    transform: none;
  }

  .statistics-refresh {
    justify-self: start;
  }
}

@media (max-width: 720px) {
  .statistics-date-field,
  .statistics-refresh {
    max-width: none;
    width: 100%;
  }

  .statistics-toolbar__dates,
  .statistics-toolbar__presets {
    align-items: stretch;
    flex-direction: column;
  }

  .statistics-date-separator {
    display: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .statistics-kpi,
  .statistics-panel {
    transition:
      border-color var(--se-transition-fast),
      transform var(--se-transition-fast);
  }

  .statistics-kpi:hover,
  .statistics-panel:hover {
    border-color: var(--se-color-primary) !important;
    transform: translateY(-1px);
  }
}
</style>
