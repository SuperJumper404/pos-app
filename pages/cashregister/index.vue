<template>
  <v-container fluid class="cashregister-page pa-5">
    <div class="cashregister-hero">
      <div class="cashregister-hero__title">
        <div class="cashregister-hero__icon">
          <v-icon>mdi-cash-register</v-icon>
        </div>
        <div>
          <h1>Tiroir-caisse</h1>
          <p>Tables terminées, montants restants et encaissements du service.</p>
        </div>
      </div>

      <v-btn
        color="primary"
        class="cashregister-refresh text-none"
        depressed
        :loading="isLoaded !== true"
        @click="refreshCashRegister"
      >
        <v-icon small left>mdi-refresh</v-icon>
        Actualiser
      </v-btn>
    </div>

    <v-row class="cashregister-summary" dense>
      <v-col
        v-for="card in summaryCards"
        :key="card.label"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-card outlined class="cashregister-kpi" :class="card.className">
          <div class="cashregister-kpi__icon">
            <v-icon>{{ card.icon }}</v-icon>
          </div>
          <div>
            <div class="cashregister-kpi__label">{{ card.label }}</div>
            <div class="cashregister-kpi__value">{{ card.value }}</div>
            <div class="cashregister-kpi__hint">{{ card.hint }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-skeleton-loader
      v-if="isLoaded !== true"
      class="mt-5"
      type="card, card, card"
    ></v-skeleton-loader>

    <v-card
      v-else-if="!activeTables.length"
      outlined
      class="cashregister-empty mt-5"
    >
      <v-icon color="primary" size="42">mdi-check-circle-outline</v-icon>
      <h2>Aucune table à encaisser</h2>
      <p>
        Les tables terminées apparaîtront ici dès qu'elles seront prêtes pour la
        caisse.
      </p>
    </v-card>

    <v-row v-else class="cashregister-grid mt-5" dense>
      <v-card
        v-for="table in activeTables"
        :key="table.tableId"
        class="cashregister-table-card"
        outlined
      >
        <div class="cashregister-table-card__header">
          <div>
            <div class="cashregister-table-card__eyebrow">Table</div>
            <h2>{{ table.tableName }}</h2>
          </div>
          <div class="cashregister-table-card__amount">
            <span>À encaisser</span>
            <strong>{{ formatCurrency(table.totalPerTable) }}</strong>
          </div>
        </div>

        <div class="cashregister-status-row">
          <v-chip
            v-if="table.waiting"
            small
            class="cashregister-status cashregister-status--neutral"
          >
            <span>{{ table.waiting }}</span>
            En attente
          </v-chip>
          <v-chip
            v-if="table.preparing"
            small
            class="cashregister-status cashregister-status--success"
          >
            <span>{{ table.preparing }}</span>
            En préparation
          </v-chip>
          <v-chip
            v-if="table.canceled"
            small
            class="cashregister-status cashregister-status--warning"
          >
            <span>{{ table.canceled }}</span>
            Annulée
          </v-chip>
          <v-chip
            v-if="!table.waiting && !table.preparing && !table.canceled"
            small
            class="cashregister-status cashregister-status--info"
          >
            <span>{{ table.customerTotals.length }}</span>
            Prêt à encaisser
          </v-chip>
        </div>

        <div class="cashregister-table-card__body">
          <v-data-table
            v-model="selectedOrders"
            :headers="headers"
            :items="table.customerTotals"
            item-key="customer"
            show-select
            :hide-default-footer="true"
            :disable-sort="$vuetify.breakpoint.smAndDown"
            dense
            class="cashregister-customer-table"
            no-data-text="Aucun client à encaisser"
            @item-selected="selectionHandler(table.tableName, $event)"
          >
            <template #[`item.created`]="{ item }">
              <div>
                {{ orderTime(item.created) }}
              </div>
            </template>
            <template #[`item.sum_amount`]="{ item }">
              <strong>{{ formatCurrency(item.sum_amount) }}</strong>
            </template>
            <template #[`item.paid_amount`]="{ item }">
              <v-chip
                v-if="item.paid_amount > 0"
                small
                class="cashregister-paid-chip"
              >
                {{ formatCurrency(item.paid_amount) }} déjà payé
              </v-chip>
              <span v-else>-</span>
            </template>
          </v-data-table>
        </div>

        <div class="cashregister-table-card__footer">
          <div>
            <span>Total déjà payé</span>
            <strong>{{ formatCurrency(table.alreadyPaidTotal) }}</strong>
          </div>
          <div>
            <span>Clients</span>
            <strong>{{ table.customerTotals.length }}</strong>
          </div>
        </div>

        <v-card-actions class="cashregister-actions">
          <v-btn
            color="primary"
            class="cashregister-action-main text-none"
            depressed
            :disabled="!canCheckoutTable(table)"
            @click="goToPayout(table)"
          >
            <v-icon small left>
              {{
                selectedRowsHaveAmountDue()
                  ? 'mdi-cash-check'
                  : 'mdi-check-circle'
              }}
            </v-icon>
            {{ selectedRowsHaveAmountDue() ? 'Encaisser' : 'Clôturer' }}
          </v-btn>
          <v-btn
            outlined
            color="primary"
            class="cashregister-action-secondary text-none"
            @click="goToDetails(table)"
          >
            <v-icon small left>mdi-information-outline</v-icon>
            Détails
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-row>
  </v-container>
</template>

<script>
import moment from 'moment'
import price from '@/helpers/price'

const {
  buildCashRegisterCustomerRows,
  getCashRegisterPaymentSummary,
} = require('@/helpers/cashRegister')

export default {
  mixins: [price],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  data() {
    return {
      selectedOrders: [],
      currentSelectedTable: null,
      headers: [
        { text: 'Client', value: 'customer', filterable: true },
        {
          text: 'À encaisser',
          value: 'sum_amount',
          filterable: true,
        },
        {
          text: 'Déjà payé',
          value: 'paid_amount',
          filterable: true,
        },
      ],
      isLoaded: null,
      totalPerTable: [],
      WaitingOrderPerTable: [],
      CanceledOrderPerTable: [],
      tableGlobalData: [],
    }
  },
  computed: {
    dataTables() {
      return this.$store.get('servicePoints/items') || []
    },
    getAllOrders() {
      return this.$store.get('orders/dataOrders') || []
    },
    activeTables() {
      return this.tableGlobalData.filter(
        (table) =>
          table.customerTotals.length ||
          table.totalPerTable > 0 ||
          table.alreadyPaidTotal > 0 ||
          table.waiting ||
          table.preparing ||
          table.canceled
      )
    },
    summaryCards() {
      const dueTotal = this.tableGlobalData.reduce(
        (total, table) => total + Number(table.totalPerTable || 0),
        0
      )
      const paidTotal = this.tableGlobalData.reduce(
        (total, table) => total + Number(table.alreadyPaidTotal || 0),
        0
      )
      const finishedCustomers = this.tableGlobalData.reduce(
        (total, table) => total + table.customerTotals.length,
        0
      )
      const kitchenOpen = this.tableGlobalData.reduce(
        (total, table) =>
          total + Number(table.waiting || 0) + Number(table.preparing || 0),
        0
      )

      return [
        {
          label: 'À encaisser',
          value: this.formatCurrency(dueTotal),
          hint: 'Montant restant',
          icon: 'mdi-cash-fast',
          className: 'cashregister-kpi--due',
        },
        {
          label: 'Déjà payé',
          value: this.formatCurrency(paidTotal),
          hint: 'Paiements reçus',
          icon: 'mdi-credit-card-check-outline',
          className: 'cashregister-kpi--paid',
        },
        {
          label: 'Tables actives',
          value: this.activeTables.length,
          hint: `${finishedCustomers} client(s) prêt(s)`,
          icon: 'mdi-table-chair',
          className: 'cashregister-kpi--tables',
        },
        {
          label: 'Cuisine ouverte',
          value: kitchenOpen,
          hint: 'En attente ou préparation',
          icon: 'mdi-chef-hat',
          className: 'cashregister-kpi--kitchen',
        },
      ]
    },
  },
  mounted() {
    this.isLoaded = false
    this.$root.$on('modalClosed', () => {
      this.loadTableData()
    })
    Promise.all([
      this.$store.dispatch('orders/getAllOrder'),
      this.$store.dispatch('servicePoints/getAll'),
    ]).then(() => {
      this.loadTableData()
    })
  },
  methods: {
    tableDisplayName(table) {
      return table.name || table.username || table.tableName || 'Table'
    },
    tableServicePointId(table) {
      return table.service_point_id || table.id
    },
    buildTableGlobalData() {
      return this.dataTables.map((table) => {
        const tableId = this.tableServicePointId(table)
        const tableOrders = this.getAllOrders.filter(
          (x) => Number(x.service_point_id || x.customerID) === Number(tableId)
        )
        const finishedOrders = tableOrders.filter((x) => x.status === 3)
        const customerTotalArray = buildCashRegisterCustomerRows(finishedOrders)
        const paymentSummary = getCashRegisterPaymentSummary(finishedOrders)

        return {
          tableName: this.tableDisplayName(table),
          tableId,
          canceled: tableOrders.filter((x) => x.status === 4).length,
          finished: finishedOrders,
          waiting: tableOrders.filter((x) => x.status === 1).length,
          preparing: tableOrders.filter((x) => x.status === 2).length,
          customerTotals: customerTotalArray,
          totalPerTable: paymentSummary.dueAmount,
          alreadyPaidTotal: paymentSummary.paidAmount,
        }
      })
    },
    selectedRowsHaveAmountDue() {
      if (!this.selectedOrders.length) return true
      return this.selectedOrders.some((order) => order.hasAmountDue)
    },
    canCheckoutTable(table) {
      return (
        this.currentSelectedTable === table.tableName &&
        this.selectedOrders &&
        this.selectedOrders.length > 0
      )
    },
    selectionHandler(tableName, selectionEvent) {
      if (this.currentSelectedTable !== tableName) {
        this.currentSelectedTable = tableName
        this.selectedOrders = selectionEvent?.value
          ? [selectionEvent.item]
          : []
        console.log('TABLE SELECTED', tableName)
      }
    },
    goToPayout(table) {
      if (!this.canCheckoutTable(table)) return
      this.$router.push({
        path: `/cashregister/payout/${table.tableName}?modals=true`,
        query: { orders: this.OrderIdsToArchives() },
      })
    },
    goToDetails(table) {
      this.$router.push(
        `/cashregister/details/${table.tableId}?tableName=${table.tableName}`
      )
    },
    refreshCashRegister() {
      this.isLoaded = false
      Promise.all([
        this.$store.dispatch('orders/getAllOrder'),
        this.$store.dispatch('servicePoints/getAll'),
      ]).then(() => {
        this.loadTableData()
      })
    },
    OrderIdsToArchives() {
      const result = this.selectedOrders.reduce((accumulator, currentOrder) => {
        return accumulator.concat(currentOrder.ids)
      }, [])
      console.log('Result archive orders', result)
      return result
    },
    orderTime(time) {
      return moment(new Date(time)).format('DD/MM à HH:mm')
    },
    loadTableData() {
      console.log('Refresh Load DAta')
      this.tableGlobalData = this.buildTableGlobalData()
      this.isLoaded = true
    },
  },
}
</script>

<style scoped>
.cashregister-page {
  background: #f7f9fc;
  min-height: calc(100vh - 64px);
}

.cashregister-hero {
  align-items: center;
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  display: flex;
  gap: var(--se-space-4);
  justify-content: space-between;
  padding: 18px 20px;
}

.cashregister-hero__title {
  align-items: center;
  display: flex;
  gap: var(--se-space-4);
}

.cashregister-hero__icon,
.cashregister-kpi__icon {
  align-items: center;
  border-radius: var(--se-radius-lg);
  display: flex;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.cashregister-hero__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.cashregister-hero h1 {
  color: var(--se-color-text);
  font-size: var(--se-font-page-title);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: 0;
}

.cashregister-hero p {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  margin: 4px 0 0;
}

.cashregister-refresh {
  border-radius: var(--se-radius-sm) !important;
  min-height: 38px;
  min-width: 128px;
}

.cashregister-summary {
  margin-top: var(--se-space-5);
}

.cashregister-kpi {
  align-items: center;
  border-color: var(--se-color-border) !important;
  display: flex;
  gap: var(--se-space-4);
  min-height: 112px;
  padding: 18px;
}

.cashregister-kpi__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-semibold);
}

.cashregister-kpi__value {
  color: var(--se-color-text);
  font-size: 24px;
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin-top: 4px;
}

.cashregister-kpi__hint {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  margin-top: 4px;
}

.cashregister-kpi--due .cashregister-kpi__icon {
  background: var(--se-color-warning-soft);
  color: var(--se-color-warning);
}

.cashregister-kpi--paid .cashregister-kpi__icon {
  background: var(--se-color-success-soft);
  color: var(--se-color-success);
}

.cashregister-kpi--tables .cashregister-kpi__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.cashregister-kpi--kitchen .cashregister-kpi__icon {
  background: var(--se-color-brand-purple-soft);
  color: var(--se-color-brand-purple);
}

.cashregister-grid {
  display: grid;
  gap: var(--se-space-4);
  grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
}

.cashregister-table-card {
  border-color: var(--se-color-border) !important;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.cashregister-table-card__header {
  align-items: flex-start;
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  gap: var(--se-space-4);
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.cashregister-table-card__eyebrow {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-bold);
  margin-bottom: 4px;
}

.cashregister-table-card h2 {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: 0;
}

.cashregister-table-card__amount {
  text-align: right;
}

.cashregister-table-card__amount span,
.cashregister-table-card__footer span {
  color: var(--se-color-text-muted);
  display: block;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
}

.cashregister-table-card__amount strong {
  color: var(--se-color-text);
  display: block;
  font-size: 22px;
  line-height: var(--se-line-tight);
  margin-top: 4px;
}

.cashregister-status-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--se-space-2);
  padding: 14px 20px 0;
}

.cashregister-status {
  border-radius: var(--se-radius-pill) !important;
  font-size: var(--se-font-caption) !important;
  font-weight: var(--se-weight-bold);
}

.cashregister-status span {
  align-items: center;
  border-radius: 50%;
  display: inline-flex;
  height: 20px;
  justify-content: center;
  margin-right: 6px;
  width: 20px;
}

.cashregister-status--neutral {
  background: var(--se-color-surface-muted) !important;
  color: var(--se-color-text-muted) !important;
}

.cashregister-status--neutral span {
  background: var(--se-color-border);
  color: var(--se-color-text-body);
}

.cashregister-status--success {
  background: var(--se-color-success-soft) !important;
  color: #007a3d !important;
}

.cashregister-status--success span {
  background: var(--se-color-success);
  color: var(--se-color-text);
}

.cashregister-status--warning {
  background: var(--se-color-warning-soft) !important;
  color: #8a4c00 !important;
}

.cashregister-status--warning span {
  background: var(--se-color-warning);
  color: var(--se-color-text);
}

.cashregister-status--info {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
}

.cashregister-status--info span {
  background: var(--se-color-primary);
  color: #ffffff;
}

.cashregister-table-card__body {
  flex: 1;
  padding: 12px 12px 0;
}

.cashregister-customer-table {
  color: var(--se-color-text-body);
}

.cashregister-paid-chip {
  background: var(--se-color-brand-purple-soft) !important;
  color: var(--se-color-brand-purple) !important;
  font-weight: var(--se-weight-bold);
}

.cashregister-table-card__footer {
  align-items: center;
  background: var(--se-color-surface-muted);
  border-top: 1px solid var(--se-color-border-soft);
  display: flex;
  justify-content: space-between;
  margin-top: var(--se-space-3);
  padding: 12px 20px;
}

.cashregister-table-card__footer strong {
  color: var(--se-color-text);
  display: block;
  font-size: var(--se-font-body);
  margin-top: 2px;
}

.cashregister-actions {
  gap: var(--se-space-2);
  padding: 14px 20px 18px;
}

.cashregister-action-main,
.cashregister-action-secondary {
  border-radius: var(--se-radius-sm) !important;
  min-height: 38px;
}

.cashregister-action-main {
  flex: 1 1 auto;
}

.cashregister-empty {
  align-items: center;
  border-color: var(--se-color-border) !important;
  color: var(--se-color-text-muted);
  display: flex;
  flex-direction: column;
  gap: var(--se-space-2);
  padding: 42px 24px;
  text-align: center;
}

.cashregister-empty h2 {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  margin: 0;
}

.cashregister-empty p {
  margin: 0;
}

@media (max-width: 720px) {
  .cashregister-hero,
  .cashregister-hero__title,
  .cashregister-table-card__header,
  .cashregister-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .cashregister-grid {
    grid-template-columns: 1fr;
  }

  .cashregister-table-card__amount {
    text-align: left;
  }

  .cashregister-refresh,
  .cashregister-action-secondary {
    width: 100%;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .cashregister-kpi,
  .cashregister-table-card {
    transition:
      border-color var(--se-transition-fast),
      transform var(--se-transition-fast);
  }

  .cashregister-kpi:hover,
  .cashregister-table-card:hover {
    border-color: var(--se-color-primary) !important;
    transform: translateY(-1px);
  }
}
</style>
