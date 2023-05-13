<template>
  <v-container>
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <v-card v-else outlined class="mt-5">
      <v-app-bar flat color="grey lighten-4" light>
        <v-card-title>
          {{ tableName }}
          <v-spacer></v-spacer>
        </v-card-title>
      </v-app-bar>

      <v-data-table
        :headers="headers"
        :items="dataOrders"
        :expanded.sync="expanded"
        item-key="id"
        show-expand
        single-expand
        hide-default-headers
      >
        <template v-slot:expanded-item="{ item }">
          <td colspan="12">
            <v-card
              v-for="(itm, i) in getOrderDetailsByOrderId(item.id)"
              :key="i"
              outlined
              class="mb-3 d-flex justify-space-between align-center pa-2"
            >
              <v-img
                :src="`${staticURL}/api/v1/imgproducts/${itm.image}`"
                max-width="120px"
              ></v-img>
              <v-divider vertical></v-divider>
              <v-card-text class="d-sm-flex d-none justify-space-between">
                <p class="font-weight-bold">{{ itm.name }}</p>
                <v-divider vertical></v-divider>
                <p>
                  Order number: <b>{{ itm.ordernumber }}</b>
                </p>
                <v-divider vertical></v-divider>
                <p>
                  Customer: <b>{{ itm.customer }}</b>
                </p>
                <v-divider vertical></v-divider>
                <p>
                  Qty: <b>{{ itm.qty }}</b> item
                </p>
              </v-card-text>
              <v-card-text class="d-sm-none d-block">
                <p class="font-weight-bold">{{ itm.name }}</p>
                <p>
                  Qty: <b>{{ itm.qty }}</b> item
                </p>
              </v-card-text>
            </v-card>
          </td>
        </template>
        <template #[`item.created`]="{ item }">
          <div>
            {{ orderTime(item.created) }}
          </div>
        </template>
        <template #[`item.subtotal`]="{ item }">
          <div>{{ conversiRp(item.subtotal) }} €</div>
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip v-if="item.status === 1" color="grey"> En attente </v-chip>
          <v-chip v-if="item.status === 2" color="success">
            En preparation
          </v-chip>
          <v-chip v-if="item.status === 3" color="primary"> Terminer </v-chip>
          <v-chip v-if="item.status === 4" color="warning"> Annuler </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-row class="d-flex flex-nowrap">
            <v-card-actions v-if="item.status === 2">
              <v-btn
                outlined
                small
                color="primary"
                class="text-capitalize"
                @click="btnFinish(item.id)"
                >Prête <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions>
              <v-btn
                outlined
                small
                color="default"
                class="text-capitalize"
                @click="$router.push(`/orders/detail/${item.id}`)"
                >Details
                <v-icon small right>mdi-information-outline</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions v-if="item.status !== 4 && item.status !== 3">
              <v-btn
                outlined
                small
                color="red"
                class="text-capitalize"
                @click="btnCancel(item.id)"
                >Annuler <v-icon small right>mdi-close-circle</v-icon>
              </v-btn>
            </v-card-actions>
          </v-row>
        </template>
      </v-data-table>
    </v-card>
    <pre type="json">{{ tableName }}</pre>

    <pre type="json">{{ AllOrdersDetails }}</pre>
    <pre type="json">{{ dataOrders }}</pre>
    <!-- <v-btn @click="soundNotification()"
        >Sound <v-icon small right>mdi-close-circle</v-icon>
      </v-btn> -->
  </v-container>
</template>
<script>
import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
import moment from 'moment'

export default {
  mixins: [formatdate, price],
  middleware: 'auth',
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  data() {
    return {
      loadPage: false,
      tableName: this.$route.query.tableName,
      deleteLoading: false,
      expanded: [],
      errMsg: false,
      lastUpdate: moment(new Date()),
      orderNotifications: [],
      selectedOrders: [],
      headers: [
        { text: 'Date', value: 'created', filterable: true, width: '150px' },
        {
          text: 'Numero de commande',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Client', value: 'customer', filterable: true, width: '100px' },
        // { text: 'Operateur', value: 'operator' },
        { text: 'Total', value: 'subtotal', filterable: true, width: '100px' },
        { text: 'Status', value: 'status', filterable: true },
        { text: 'Actions', value: 'actions', width: '500px' },
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
  head() {
    return {
      title: `${
        this.$route.name.charAt(0).toUpperCase() + this.$route.name.slice(1)
      }`,
    }
  },
  computed: {
    dataOrders() {
      return this.$store.get('orders/dataOrdersByUserId')
    },
    AllOrdersDetails() {
      return this.$store.get('orders/AllDetailOrders')
    },
    message() {
      return this.$store.get('orders/message')
    },
    staticURL() {
      return this.$store.get('staticURL')
    },
    user() {
      return { id: this.$route.params.id }
    },
  },
  mounted() {
    this.loadPage = true
    this.$store
      .dispatch('orders/getOrdersByUserId', { userId: this.user.id })
      .then(() => {
        const ordersIds = this.dataOrders.map((x) => x.id)
        this.$store.dispatch('orders/getAllDetailOrders', ordersIds)
        console.log('All ids to ask for details', ordersIds)
      })
      .finally(() => {
        this.loadPage = false
      })
  },
  methods: {
    getOrderDetailsByOrderId(id) {
      const result = this.AllOrdersDetails.flat().filter(
        (x) => x.orderid === id
      )
      //   console.log(id, 'Detail orders', result)
      return result
    },

    orderTime(time) {
      const displayTime = moment(new Date(time)).format('DD/MM à HH:mm')
      console.log(displayTime)
      return displayTime
    },

    async btnFinish(id) {
      const data = {
        operator: this.user.id,
        status: 3,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
    async btnCancel(id) {
      const data = {
        operator: this.user.id,
        status: 4,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
  },
  // created() {
  //   this.pollData()
  // },
}
</script>
