<template>
  <v-container>
    <v-row cols v-if="isLoaded == true">
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
            <v-chip
              v-if="table.canceled"
              filter
              color="#FFE0B2"
              variant="outlined"
            >
              <v-avatar
                color="#FFA726"
                size="x-small"
                style="margin-left: -9px; margin-right: 4px"
              >
                {{ table.canceled }}
              </v-avatar>
              Annuler
            </v-chip>
            <v-chip
              v-if="table.waiting"
              filter
              color="#CFD8DC"
              variant="outlined"
            >
              <v-avatar
                color="#90A4AE"
                size="x-small"
                style="margin-left: -9px; margin-right: 4px"
              >
                {{ table.waiting }}
              </v-avatar>
              En attente
            </v-chip>
            <v-chip
              v-if="table.preparing"
              filter
              color="#C5E1A5"
              variant="outlined"
            >
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
            @item-selected="selectionHandler(table.tableName)"
            :hide-default-footer="true"
          >
            <template #[`item.created`]="{ item }">
              <div>
                {{ orderTime(item.created) }}
              </div>
            </template>
            <template #[`item.sum_amount`]="{ item }">
              <div>{{ conversiRp(item.sum_amount) }} €</div>
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

        <v-card-title>Total: {{ table.totalPerTable }}€</v-card-title>

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
            class="text-capitalize"
            @click="
              ($event) =>
                $router.push({
                  path: `/cashregister/payout/${table.tableName}?modals=true`,
                  query: { orders: OrderIdsToArchives() },
                })
            "
          >
            Encaisser
            <v-icon small right>mdi-cash-check</v-icon>
          </v-btn>
          <v-btn
            outlined
            small
            color="default"
            class="text-capitalize"
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
      <pre type="json "> {{ selectedOrders }} </pre>
      <pre type="json "> {{ tableGlobalData }} </pre>
      <pre type="json "> {{ CanceledOrderPerTable }} </pre>
      <pre type="json "> {{ getAllOrders }} </pre>
      <pre type="json">{{ dataTables }}</pre>
    </div>
  </v-container>
</template>
<script>
// import Loading from '@/components/loading'
import moment from 'moment'
import price from '@/helpers/price'
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
        //   text: 'Numero de commande',
        //   value: 'ordernumber',
        //   filterable: true,
        // },
        { text: 'Client', value: 'customer', filterable: true },
        // { text: 'Operateur', value: 'operator' },
        {
          text: 'Total',
          value: 'sum_amount',
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
  head() {},
  computed: {
    dataTables() {
      const result = this.$store.get('tables/dataTables') || []
      return result.filter((x) => x.access === 2 || x.access === 0)
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
    this.$store.dispatch('orders/getAllOrder')

    this.dataTables.forEach((table, index) => {
      console.log('Index ', index, 'Id', table.id)
      const finishedOrders = this.getAllOrders.filter(
        (x) => x.customerID === table.id && x.status === 3
      )
      const customerTotals = {}
      finishedOrders.forEach((order) => {
        const customer = order.customer
        const subtotal = order.subtotal
        const orderid = order.id

        // Ajouter le montant de la commande au total pour ce client
        if (customer in customerTotals) {
          customerTotals[customer].subtotal += subtotal
          customerTotals[customer].orderIds.push(orderid)
        } else {
          customerTotals[customer] = { subtotal, orderIds: [orderid] }
        }
      })

      console.log('Customer Totals', customerTotals)
      const customerTotalArray = Object.entries(customerTotals).map(
        ([customer, value]) => {
          console.log('Inside loop', customer)
          return { customer, sum_amount: value.subtotal, ids: value.orderIds }
        }
      )
      this.tableGlobalData.push({
        tableName: table.username,
        tableId: table.id,
        canceled: this.getAllOrders.filter(
          (x) => x.customerID === table.id && x.status === 4
        ).length,
        finished: finishedOrders,
        waiting: this.getAllOrders.filter(
          (x) => x.customerID === table.id && x.status === 1
        ).length,
        preparing: this.getAllOrders.filter(
          (x) => x.customerID === table.id && x.status === 2
        ).length,
        customerTotals: customerTotalArray,
        totalPerTable: customerTotalArray.reduce(
          (accumulator, currentValue) => accumulator + currentValue?.sum_amount,
          0
        ),
      })
    })
    // this.tableGlobalData = this.tableGlobalData.filter(
    //   (obj) => Object.keys(obj).length !== 0
    // )
    console.log('Global Data Table', this.tableGlobalData)
    this.isLoaded = true
  },
  methods: {
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
      this.dataTables.forEach((table, index) => {
        console.log('Index ', index, 'Id', table.id)
        const finishedOrders = this.getAllOrders.filter(
          (x) => x.customerID === table.id && x.status === 3
        )
        const customerTotals = {}
        finishedOrders.forEach((order) => {
          const customer = order.customer
          const subtotal = order.subtotal
          const orderid = order.id

          // Ajouter le montant de la commande au total pour ce client
          if (customer in customerTotals) {
            customerTotals[customer].subtotal = subtotal
            customerTotals[customer].orderIds.push(orderid)
          } else {
            customerTotals[customer] = { subtotal, orderIds: [orderid] }
          }
        })

        console.log('Customer Totals', customerTotals)
        const customerTotalArray = Object.entries(customerTotals).map(
          ([customer, value]) => {
            console.log('Inside loop', customer)
            return { customer, sum_amount: value.subtotal, ids: value.orderIds }
          }
        )
        this.tableGlobalData.push({
          tableName: table.username,
          tableId: table.id,
          canceled: this.getAllOrders.filter(
            (x) => x.customerID === table.id && x.status === 4
          ).length,
          finished: finishedOrders,
          waiting: this.getAllOrders.filter(
            (x) => x.customerID === table.id && x.status === 1
          ).length,
          preparing: this.getAllOrders.filter(
            (x) => x.customerID === table.id && x.status === 2
          ).length,
          customerTotals: customerTotalArray,
          totalPerTable: customerTotalArray.reduce(
            (accumulator, currentValue) =>
              accumulator + currentValue?.sum_amount,
            0
          ),
        })
      })
    },
  },
}
</script>
<style scoped>
.box {
  border: 1px solid #eeeeee;
}
</style>
