<template>
  <v-container>
    <v-row v-if="isLoaded == true" cols>
      <v-card
        v-for="table in tableGlobalData"
        :key="table.tableId"
        class="mx-auto my-12 d-flex flex-column"
        height="max-content"
        width="max-content"
        elevation="2"
      >
        <v-card-title>{{ table.tableName }}</v-card-title>
        <v-card-text v-if="table.canceled || table.waiting || table.preparing">
          <!-- <span class="me-1">{{ clientNamesPerTable[table.id] }}</span> -->
          <v-chip-group>
            <v-chip v-if="table.canceled" color="#FFE0B2" variant="outlined">
              <v-avatar
                color="#FFA726"
                size="x-small"
                style="margin-left: -9px; margin-right: 4px"
              >
                {{ table.canceled }}
              </v-avatar>
              Annuler
            </v-chip>
            <v-chip v-if="table.waiting" color="#CFD8DC" variant="outlined">
              <v-avatar
                color="#90A4AE"
                size="x-small"
                style="margin-left: -9px; margin-right: 4px"
              >
                {{ table.waiting }}
              </v-avatar>
              En attente
            </v-chip>
            <v-chip v-if="table.preparing" color="#C5E1A5" variant="outlined">
              <v-avatar
                color="#7CB342"
                size="x-small"
                style="margin-left: -9px; margin-right: 4px"
              >
                {{ table.preparing }}
              </v-avatar>
              En preparation
            </v-chip>
          </v-chip-group>
          <v-icon color="error" icon="mdi-fire-circle" size="small"></v-icon>
        </v-card-text>

        <v-card-text>
          <v-divider
            :thickness="5"
            class="border-opacity-50"
            color="primary"
          ></v-divider>
          <v-data-table
            v-model="selectedOrders"
            :headers="headers"
            :items="table.customerTotals"
            item-key="customer"
            show-select
            :hide-default-footer="true"
            :disable-sort="$vuetify.breakpoint.smAndDown"
            @item-selected="selectionHandler(table.tableName)"
          >
            <template #[`item.created`]="{ item }">
              <div>
                {{ orderTime(item.created) }}
              </div>
            </template>
            <template #[`item.sum_amount`]="{ item }">
              <div>{{ formatCurrency(item.sum_amount) }}</div>
            </template>
            <template #[`item.paid_amount`]="{ item }">
              <v-chip v-if="item.paid_amount > 0" small dark color="#635BFF">
                {{ formatCurrency(item.paid_amount) }} deja paye
              </v-chip>
              <span v-else>-</span>
            </template>
            <!-- <template #[`item.status`]="{ item }">
              <v-chip v-if="item.status === 1" color="grey">
                En attente
              </v-chip>
              <v-chip v-if="item.status === 2" color="success">
                En preparation
              </v-chip>
              <v-chip v-if="item.status === 3" color="primary">
                Terminer
              </v-chip>
              <v-chip v-if="item.status === 4" color="warning">
                Annuler
              </v-chip>
            </template> -->
          </v-data-table>
        </v-card-text>

        <v-divider class="mx-4 mb-1"></v-divider>

        <v-card-title>
          A encaisser: {{ formatCurrency(table.totalPerTable) }}
        </v-card-title>
        <v-card-subtitle v-if="table.alreadyPaidTotal > 0">
          Deja paye: {{ formatCurrency(table.alreadyPaidTotal) }}
        </v-card-subtitle>
        <div class="px-4">
          <!-- <v-chip-group v-model="selection">
            <v-chip>5:30PM</v-chip>

            <v-chip>7:30PM</v-chip>

            <v-chip>8:00PM</v-chip>

            <v-chip>9:00PM</v-chip>
          </v-chip-group> -->
        </div>
        <v-divider></v-divider>
        <v-card-actions class="mt-auto">
          <v-btn
            outlined
            small
            color="primary"
            class="text-none"
            @click="
              selectedOrders && selectedOrders.length > 0
                ? $router.push({
                    path: `/cashregister/payout/${table.tableName}?modals=true`,
                    query: { orders: OrderIdsToArchives() },
                  })
                : null
            "
          >
            {{ selectedRowsHaveAmountDue() ? 'Encaisser' : 'Cloturer' }}
            <v-icon small right>
              {{
                selectedRowsHaveAmountDue()
                  ? 'mdi-cash-check'
                  : 'mdi-check-circle'
              }}
            </v-icon>
          </v-btn>
          <v-btn
            outlined
            small
            color="default"
            class="text-none"
            @click="
              ($event) =>
                $router.push(
                  `/cashregister/details/${table.tableId}?tableName=${table.tableName}`
                )
            "
          >
            Details
            <v-icon small right>mdi-information-outline</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-row>
    <div>
      <!-- <pre type="json "> {{ selectedOrders }} </pre> -->
      <!-- <pre type="json "> {{ tableGlobalData }} </pre> -->
      <!-- <pre type="json "> {{ CanceledOrderPerTable }} </pre> -->
      <!-- <pre type="json "> {{ getAllOrders }} </pre> -->
      <!-- <pre type="json">{{ dataTables }}</pre> -->
    </div>
  </v-container>
</template>
<script>
// import Loading from '@/components/loading'
import moment from 'moment'
import price from '@/helpers/price'
const {
  buildCashRegisterCustomerRows,
  getCashRegisterPaymentSummary,
} = require('@/helpers/cashRegister')
// import * as config from '@/nuxt.config'
export default {
  //   components: {
  //     Loading,
  //   },
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
        // { text: 'Date', value: 'created', filterable: true, width: '150px' },
        // {
        //   text: 'Numéro de commande',
        //   value: 'ordernumber',
        //   filterable: true,
        // },
        { text: 'Client', value: 'customer', filterable: true },
        // { text: 'Operateur', value: 'operator' },
        {
          text: 'A encaisser',
          value: 'sum_amount',
          filterable: true,
        },
        {
          text: 'Deja paye',
          value: 'paid_amount',
          filterable: true,
        },
        // { text: 'Status', value: 'status', filterable: true },
        // { text: 'Actions', value: 'actions', width: '500px' },
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
      const result = this.$store.get('tables/dataTables') || []
      return result.filter(
        (x) => x.access === 2 || x.access === 0 || x.access === 3
      )
    },

    getAllOrders() {
      const result = this.$store.get('orders/dataOrders')
      return result
    },
    // breakpoint() {
    //   console.log('eeee', this.$vuetify.breakpoint)
    //   return JSON.stringify(this.$vuetify.breakpoint, null, null)
    // },
  },
  mounted() {
    this.isLoaded = false
    this.$root.$on('modalClosed', () => {
      this.loadTableData()
    })
    this.$store.dispatch('orders/getAllOrder').then(() => {
      this.loadTableData()
    })
  },
  methods: {
    buildTableGlobalData() {
      return this.dataTables.map((table) => {
        const tableOrders = this.getAllOrders.filter(
          (x) => x.customerID === table.id
        )
        const finishedOrders = tableOrders.filter((x) => x.status === 3)
        const customerTotalArray = buildCashRegisterCustomerRows(finishedOrders)
        const paymentSummary = getCashRegisterPaymentSummary(finishedOrders)

        return {
          tableName: table.username,
          tableId: table.id,
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
    selectionHandler(tableName) {
      if (this.currentSelectedTable !== tableName) {
        this.selectedOrders = []
        this.currentSelectedTable = tableName
        console.log('TABLE SELECTED', tableName)
      }
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
.box {
  border: 1px solid #eeeeee;
}
</style>
