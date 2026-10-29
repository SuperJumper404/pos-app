<template>
  <v-container>
    <div>
      <v-alert v-model="errMsg" outlined text type="error">
        <v-row align="center" no-gutters>
          <v-col class="grow">
            {{ message }}
          </v-col>
          <v-spacer></v-spacer>
          <v-col class="shrink">
            <v-btn icon small @click="errMsg = false">
              <v-icon>mdi-close-circle-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
    </div>

    <v-card
      v-if="loadPage && !historyEntries.length"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <v-card v-else outlined class="mt-5 history-panel-card">
      <v-app-bar flat color="grey lighten-4" light>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <div>
          <v-btn
            v-if="selectedOrders.length"
            color="red"
            depressed
            elevation="0"
            style="color: white; height: 40px; margin: 0px 8px 2px 0px"
            :loading="deleteLoading"
            @click="deleteSelectedOrders()"
            >Supprimer
            <v-icon small right>mdi-trash-can</v-icon>
          </v-btn>
        </div>
        <v-text-field
          v-model="searchFilter"
          class="se-search-field"
          placeholder="Rechercher une commande ou un paiement TPE"
          aria-label="Rechercher dans l’historique"
          outlined
          dense
          hide-details
          prepend-inner-icon="mdi-magnify"
        ></v-text-field>
        <v-btn icon class="ml-2 history-touch-button" :loading="loadPage" aria-label="Actualiser l’historique" @click="loadEntries"><v-icon>mdi-refresh</v-icon></v-btn>
      </v-app-bar>
      <v-data-table
        v-model="selectedOrders"
        :headers="headers"
        :items="historyEntries"
        :options.sync="tableOptions"
        :server-items-length="historyTotal"
        :loading="loadPage"
        :footer-props="{ 'items-per-page-options': [10, 25, 50], 'items-per-page-text': 'Lignes par page' }"
        :item-class="historyRowClass"
        no-data-text="Aucune commande ni paiement dans l’historique"
        loading-text="Chargement de l’historique…"
        :expanded.sync="expanded"
        item-key="rowKey"
        show-expand
        single-expand
        :disable-sort="$vuetify.breakpoint.smAndDown"
      >
        <template #[`item.data-table-expand`]="{ item, expand, isExpanded }">
          <v-btn v-if="item.entryType === 'order'" icon class="history-touch-button" :aria-label="`Détails de la commande ${item.ordernumber}`" :aria-expanded="String(isExpanded)" @click="expandOrder(item, expand, isExpanded)"><v-icon>{{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon></v-btn>
        </template>
        <template #[`item.ordernumber`]="{ item }">
          <template v-if="item.entryType === 'terminal_payment'">
            <div class="history-terminal-label"><v-icon small color="primary">mdi-contactless-payment</v-icon><strong>Paiement TPE</strong></div>
            <div class="text-caption">{{ item.ordernumber || `TPE #${item.id}` }} · {{ item.readerLabel || `Terminal #${item.terminalPayment.readerId}` }}</div>
          </template>
          <template v-else>
            <div>#{{ item.ordernumber }}</div>
            <TakeawayChip :value="item.is_takeaway" :fulfillment-type="item.fulfillment_type" />
          </template>
        </template>
        <template #expanded-item="{ item }">
          <td v-if="item.entryType === 'order'" :colspan="headers.length + 1">
            <v-progress-linear v-if="detailsLoadingIds.includes(item.id)" indeterminate color="primary" aria-label="Chargement des détails de commande" />
            <v-alert v-if="detailsErrorIds.includes(item.id)" type="error" text dense>Les détails de cette commande sont indisponibles. <v-btn small text @click="loadOrderDetails(item)">Réessayer</v-btn></v-alert>
            <v-card
              v-for="(itm, i) in getArchivedOrderDetailsByOrderId(item.id)"
              :key="i"
              outlined
              class="
                mb-3
                d-flex
                justify-space-evenly
                align-items-center
                pa-2
                history-detail-card
              "
            >
              <v-img
                :src="productImageSrc(itm.image)"
                class="history-detail-image"
                :aspect-ratio="4 / 3"
                height="96"
                width="128"
                max-width="128px"
              ></v-img>
              <v-divider vertical></v-divider>
              <v-card-text class="d-sm-flex d-none justify-space-between">
                <h6
                  class="text-center text-truncate"
                  style="
                    font-weight: bold;
                    font-size: large;
                    width: 250px;
                    color: rgba(0, 0, 0, 0.8);
                  "
                >
                  {{ itm.name }}
                </h6>
                <div style="text-align: center">
                  <h6
                    class="text-center text-truncate"
                    style="
                      font-weight: bold;
                      font-size: large;
                      color: rgba(0, 0, 0, 0.8);
                    "
                  >
                    {{ formatCurrency(itm.price) }}
                  </h6>
                </div>
                <div
                  v-if="customizationGroups(itm).length"
                  class="history-customizations"
                >
                  <div
                    v-for="(group, groupIndex) in customizationGroups(itm)"
                    :key="`${group.stepName}-${groupIndex}`"
                    class="mb-1"
                  >
                    <div class="text-caption font-weight-medium">
                      {{ group.stepName }}
                    </div>
                    <v-chip
                      v-for="(choice, choiceIndex) in group.choices"
                      :key="`${choice.name}-${choiceIndex}`"
                      class="ma-1"
                      small
                    >
                      {{ choice.name }}
                      <span v-if="choice.price !== 0" class="ml-1">
                        + {{ formatCurrency(choice.price) }}
                      </span>
                    </v-chip>
                  </div>
                </div>
                <div style="text-align: center">
                  Numéro de commande
                  <h6
                    class="text-center text-truncate"
                    style="
                      font-weight: bold;
                      font-size: large;
                      color: rgba(0, 0, 0, 0.8);
                    "
                  >
                    #{{ itm.ordernumber }}
                  </h6>
                </div>

                <v-btn
                  style="font-size: x-large"
                  color="success"
                  fab
                  small
                  dark
                  depressed
                  elevation="0"
                >
                  {{ itm.qty }}</v-btn
                >
              </v-card-text>
              <v-card-text class="d-sm-none d-block">
                <p class="font-weight-bold">{{ itm.name }}</p>
                <p>
                  Qty: <b>{{ itm.qty }}</b> item
                </p>
                <div
                  v-for="(group, groupIndex) in customizationGroups(itm)"
                  :key="`${group.stepName}-${groupIndex}`"
                  class="mb-1"
                >
                  <div class="text-caption font-weight-medium">
                    {{ group.stepName }}
                  </div>
                  <v-chip
                    v-for="(choice, choiceIndex) in group.choices"
                    :key="`${choice.name}-${choiceIndex}`"
                    class="ma-1"
                    small
                  >
                    {{ choice.name }}
                    <span v-if="choice.price !== 0" class="ml-1">
                      + {{ formatCurrency(choice.price) }}
                    </span>
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
            <VatBreakdown
              v-if="isTvaActive || item.delivery_charge"
              :details="getArchivedOrderDetailsByOrderId(item.id)"
              :delivery-charge="item.delivery_charge"
              class="mt-3 mb-3"
            />
            <div v-if="item.delivery_charge" class="text-body-2 my-2">
              Livraison : {{ formatCurrency(item.delivery_charge.feeCents / 100) }}
            </div>
          </td>
        </template>
        <template #[`item.eventAt`]="{ item }">
          <div>
            {{ orderTime(item.eventAt) }}
          </div>
        </template>
        <template #[`item.username`]="{ item }">{{ item.username || '—' }}</template>
        <template #[`item.customer`]="{ item }">{{ item.customer || '—' }}</template>
        <template #[`item.subtotal`]="{ item }">
          <div>{{ formatCurrency(item.subtotal) }}</div>
        </template>
        <template #[`item.taken_by_name`]="{ item }">
          {{ item.taken_by_name || (item.entryType === 'terminal_payment' ? '—' : 'Non attribuee') }}
        </template>
        <template #[`item.prepared_by_name`]="{ item }">
          {{ item.entryType === 'terminal_payment' ? '—' : item.prepared_by_name || 'Non attribuee' }}
        </template>
        <template #[`item.payment_status`]="{ item }">
          <v-chip small :dark="item.entryType !== 'terminal_payment'" :color="paymentStatusColor(item)" :class="item.entryType === 'terminal_payment' ? ['history-terminal-status', `history-terminal-status--${item.terminalPayment.status}`] : []">
            {{ paymentStatusText(item) }}
          </v-chip>
        </template>
        <template #[`item.status`]="{ item }">
          <span v-if="item.entryType === 'terminal_payment'">—</span>
          <v-chip v-if="item.status === 1" color="grey"> En attente </v-chip>
          <v-chip v-if="item.status === 2" color="success">
            En préparation
          </v-chip>
          <v-chip v-if="item.status === 3" color="primary"> Terminée </v-chip>
          <v-chip v-if="item.status === 4" color="warning"> Annulée </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="history-row-actions">
            <div class="history-row-actions__inner">
              <template v-if="item.entryType === 'terminal_payment'">
                <v-btn
                  v-if="item.terminalPayment.status === 'succeeded'"
                  outlined
                  small
                  color="primary"
                  class="text-none history-action-button"
                  @click="showTerminalTicket(item)"
                >Ticket <v-icon small right>mdi-invoice-text</v-icon></v-btn>
                <v-btn
                  icon
                  color="primary"
                  class="history-touch-button history-attachments-button"
                  :aria-label="`Commandes jointes au paiement TPE ${item.id} (${item.terminalPayment.attachmentsCount})`"
                  :title="`Commandes jointes (${item.terminalPayment.attachmentsCount})`"
                  @click="openAttachments(item)"
                ><v-icon>mdi-paperclip</v-icon></v-btn>
              </template>
              <v-btn
                v-else
                outlined
                small
                color="primary"
                class="text-none history-action-button"
                @click="showInvoice(item.id)"
                >Ticket <v-icon small right>mdi-invoice-text</v-icon>
              </v-btn>
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>
    <TerminalPaymentAttachments v-model="attachmentsDialog" :payment-id="attachmentsPaymentId" @changed="loadEntries" />
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
      >Sound <v-icon small right>mdi-close-circle</v-icon>
    </v-btn> -->
    <!-- <pre type="json">{{ lastUpdate }}</pre> -->
    <!-- <pre type="json">{{ dataAllDetailsArchivedOrders }}</pre>

    <pre type="json">la{{ detailArchivedOrder }}</pre>
    <pre type="json">{{ dataArchivedOrders }}</pre> -->
  </v-container>
</template>
<script>
import TakeawayChip from '@/components/orders/TakeawayChip'
import VatBreakdown from '@/components/orders/VatBreakdown'
import TerminalPaymentAttachments from '@/components/history/TerminalPaymentAttachments.vue'
import formatdate from '@/helpers/formatdate'
import moment from 'moment'
import price from '@/helpers/price'
import { groupCustomizationSelections } from '@/helpers/customizations'
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')
const { attemptStorageKey, positiveId, terminalStatusText, terminalStatusColor } = require('@/helpers/standaloneTerminal')
export default {
  components: { TakeawayChip, VatBreakdown, TerminalPaymentAttachments },
  mixins: [formatdate, price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      errMsg: false,
      expanded: [],
      dataAllDetailsArchivedOrders: [],
      lastUpdate: moment(new Date()),
      searchFilter: '',
      selectedOrders: [],
      tableOptions: { page: 1, itemsPerPage: 10, sortBy: ['eventAt'], sortDesc: [true] },
      historyReady: false,
      historyVersion: 0,
      searchTimer: null,
      appliedSearch: '',
      attachmentsDialog: false,
      attachmentsPaymentId: null,
      detailsLoadingIds: [],
      detailsErrorIds: [],
      detailsLoadedIds: [],
      headers: [
        { text: 'Date', value: 'eventAt', filterable: true },
        {
          text: 'Référence',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Table', value: 'username', filterable: true },
        { text: 'Client', value: 'customer', filterable: true },
        { text: 'Prise par', value: 'taken_by_name', filterable: true },
        { text: 'Preparee par', value: 'prepared_by_name', filterable: true },
        // { text: 'Operateur', value: 'operator' },
        { text: 'Total', value: 'subtotal', filterable: true },
        { text: 'Paiement', value: 'payment_status', filterable: true },
        { text: 'Statut', value: 'status', filterable: true },
        { text: 'Actions', value: 'actions', sortable: false, width: 176 },
      ],
      items: [
        {
          text: 'Menus',
          disabled: false,
          to: '/menus',
        },
        {
          text: 'Orders',
          disabled: true,
          to: '/orders',
        },
      ],
    }
  },

  computed: {
    // dataArchivedDetailOrders() {
    //   const archivedOrdersIds = this.dataArchivedOrders.map((x) => x.id)

    //   for (const id of archivedOrdersIds) {
    //     this.$store.dispatch('history/getDetailArchivedOrder', id).then(() => {
    //       const detail = this.$store.getters['history/detailArchivedOrder']
    //       this.results.push(detail)
    //     })
    //   }

    //   console.log('result multi orders', this.result)
    //   return this.result
    // },
    userScope() {
      return attemptStorageKey(this.user)
    },
    historyEntries() {
      return this.userScope && this.$store.get('history/entriesOwner') === this.userScope ? this.$store.get('history/entries') || [] : []
    },
    historyTotal() {
      return this.userScope && this.$store.get('history/entriesOwner') === this.userScope ? this.$store.get('history/entriesTotal') || 0 : 0
    },
    detailArchivedOrder() {
      return this.$store.get('history/detailArchivedOrder')
    },
    isTvaActive() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/activate_tva')
      )
    },
    message() {
      return this.$store.get('history/message')
    },
    updateTimeStamp() {
      return this.$store.get('history/lastCreatedOrder')
    },
    user() {
      return this.$store.get('users/user')
    },
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
  },
  watch: {
    tableOptions: { deep: true, handler() { this.queueEntries() } },
    searchFilter() { this.tableOptions.page = 1; this.queueEntries() },
    '$route.query.payment'() { this.searchFilter = ''; this.tableOptions.page = 1; this.openFocusedPayment(); this.queueEntries() },
    userScope() {
      this.historyVersion += 1
      this.attachmentsDialog = false
      this.expanded = []
      this.dataAllDetailsArchivedOrders = []
      this.detailsLoadingIds = []
      this.detailsLoadedIds = []
      this.detailsErrorIds = []
      this.queueEntries()
    },
  },
  mounted() {
    this.historyReady = true
    this.loadEntries()
    this.openFocusedPayment()
  },
  beforeDestroy() {
    this.historyReady = false
    this.historyVersion += 1
    if (this.searchTimer) clearTimeout(this.searchTimer)
  },

  methods: {
    queueEntries() {
      if (!this.historyReady) return
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => { this.searchTimer = null; this.loadEntries() }, this.searchFilter.trim() === this.appliedSearch ? 0 : 300)
    },
    async loadEntries() {
      const generation = ++this.historyVersion
      this.loadPage = true
      this.errMsg = false
      const result = await this.$store.dispatch('history/getEntries', {
        search: this.searchFilter.trim(), page: this.tableOptions.page,
        itemsPerPage: this.tableOptions.itemsPerPage,
        sortBy: this.tableOptions.sortBy[0] || 'eventAt', sortDesc: this.tableOptions.sortDesc[0] !== false,
      })
      if (generation !== this.historyVersion) return
      this.loadPage = false
      this.errMsg = !result
      if (!result) return
      this.appliedSearch = this.searchFilter.trim()
      this.expanded = this.expanded.filter(item => this.historyEntries.some(row => row.rowKey === item.rowKey && row.entryType === 'order'))
      this.selectedOrders = this.selectedOrders.filter(item => item.entryType === 'order')
    },
    historyRowClass(item) {
      return item.entryType === 'terminal_payment' && String(this.$route.query.payment) === String(item.id) ? 'history-payment-focus' : ''
    },
    openAttachments(item) {
      if (item.entryType !== 'terminal_payment') return
      this.attachmentsPaymentId = item.id
      this.attachmentsDialog = true
    },
    showTerminalTicket(item) {
      if (item.entryType !== 'terminal_payment' || item.terminalPayment.status !== 'succeeded') return
      this.$router.push(`/history/terminal-ticket/${item.id}`)
    },
    openFocusedPayment() {
      const id = Number(this.$route.query.payment)
      if (!positiveId(id)) return
      this.attachmentsPaymentId = id
      this.attachmentsDialog = true
    },
    expandOrder(item, expand, isExpanded) {
      if (item.entryType !== 'order') return
      expand(!isExpanded)
      if (!isExpanded) this.loadOrderDetails(item)
    },
    async loadOrderDetails(item) {
      if (item.entryType !== 'order' || this.detailsLoadingIds.includes(item.id) || this.detailsLoadedIds.includes(item.id)) return
      const scope = this.userScope
      this.detailsLoadingIds.push(item.id)
      this.detailsErrorIds = this.detailsErrorIds.filter(id => id !== item.id)
      const detail = await this.$store.dispatch('history/getEntryDetails', item.id)
      if (scope !== this.userScope || this._isDestroyed) return
      this.detailsLoadingIds = this.detailsLoadingIds.filter(id => id !== item.id)
      if (!detail) { this.detailsErrorIds.push(item.id); return }
      this.dataAllDetailsArchivedOrders.push(detail)
      this.detailsLoadedIds.push(item.id)
    },
    customizationGroups(item) {
      const value = item || {}
      const snapshots = [
        value.customization_selections,
        value.customizationSelections,
        value.customization_snapshots,
        value.customizationSnapshots,
      ].find((selections) => Array.isArray(selections) && selections.length)
      return groupCustomizationSelections(snapshots || value.customizationList)
    },
    productImageSrc(image) {
      const fileName = image || 'default.png'
      return `${this.staticURL}/api/v1/imgproducts/${fileName}`
    },
    getArchivedOrderDetailsByOrderId(id) {
      const result = this.dataAllDetailsArchivedOrders
        .flat()
        .filter((x) => Number(x.orderid || x.orderId) === Number(id))
      return result
    },
    showInvoice(id) {
      this.$store.dispatch('history/getDetailArchivedOrder', id)

      // this.$store.dispatch('history/getReceiptTokenByOrder', id).finally(() => {
      //   console.log('Archived Token')
      // })
      this.$router.push(`history/ticket/${id}`)
    },
    searchData() {
      this.$store.dispatch('orders/getAllOrder')
    },
    orderTime(time) {
      return moment(new Date(time)).format('DD/MM à HH:mm')
    },
    paymentStatusText(item) {
      if (item.entryType === 'terminal_payment') return terminalStatusText(item.terminalPayment.status)
      return getPaymentStatusText(item)
    },
    paymentStatusColor(item) {
      if (item.entryType === 'terminal_payment') return terminalStatusColor(item.terminalPayment.status)
      return getPaymentStatusColor(item)
    },
  },
}
</script>
<style scoped>
.history-touch-button { min-width: 44px !important; min-height: 44px !important; }
.history-terminal-label { display: flex; align-items: center; gap: 6px; }
.history-row-actions, .history-row-actions__inner { display: flex; align-items: center; gap: 4px; min-height: 44px; max-width: 100%; }
.history-action-button { max-width: 100%; letter-spacing: normal; }
.history-attachments-button { padding-right: 10px !important; padding-left: 10px !important; }
@media (max-width: 600px) { .history-action-button { min-height: 44px; } }
.history-terminal-status.v-chip { background-color: var(--se-color-surface-muted) !important; color: var(--se-color-text) !important; }
.history-terminal-status--succeeded.v-chip { background-color: var(--se-color-success-soft) !important; }
.history-terminal-status--failed.v-chip { background-color: var(--se-color-danger-soft) !important; }
.history-terminal-status--creating.v-chip { background-color: var(--se-color-warning-soft) !important; }
.history-terminal-status--processing.v-chip { background-color: var(--se-color-primary-soft) !important; }
::v-deep .history-payment-focus { background: var(--se-color-primary-soft); }
.history-panel-card,
.history-detail-card {
  box-shadow: none !important;
}

.history-detail-card:first-child {
  margin-top: 8px;
}

.history-panel-card ::v-deep .v-data-table,
.history-panel-card ::v-deep .v-data-table__wrapper,
.history-panel-card ::v-deep .v-data-table__expanded,
.history-panel-card ::v-deep .v-data-table__expanded__content,
.history-panel-card ::v-deep .v-toolbar,
.history-panel-card ::v-deep .v-btn {
  box-shadow: none !important;
}

.history-detail-image {
  flex: 0 0 auto;
  min-width: 128px;
  width: 128px;
}

.history-detail-image ::v-deep .v-image__image {
  background-position: center;
  background-size: cover;
}

.history-customizations {
  min-width: 180px;
  text-align: center;
}
</style>
