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
      <v-app-bar flat color="grey lighten-4" light> </v-app-bar>
      <v-data-table :headers="headers" :items="dataOrders">
        <template v-slot:[`item.created`]="{ item }">
          <div>
            {{ orderTime(item.created) }}
          </div>
        </template>
        <template v-slot:[`item.subtotal`]="{ item }">
          <div>{{ conversiRp(item.subtotal) }} €</div>
        </template>
        <template v-slot:[`item.status`]="{ item }">
          <v-chip v-if="item.status === 1" color="grey"> En attente </v-chip>
          <v-chip v-if="item.status === 2" color="success">
            En preparation
          </v-chip>
          <v-chip v-if="item.status === 3" color="primary"> Terminer </v-chip>
          <v-chip v-if="item.status === 4" color="warning"> Annuler </v-chip>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <v-row>
            <v-card-actions v-if="item.status === 1">
              <v-btn
                outlined
                small
                color="success"
                class="text-capitalize"
                @click="btnApprove(item.id)"
                >Valider <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </v-card-actions>
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
                @click="$router.push(`orders/detail/${item.id}`)"
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
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
      >Sound <v-icon small right>mdi-close-circle</v-icon>
    </v-btn> -->
  </v-container>
</template>
<script>
import defaultdata from '@/helpers/defaultdata'
import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
import moment from 'moment'

export default {
  mixins: [defaultdata, formatdate, price],
  middleware: 'auth',
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      errMsg: false,
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
    message() {
      return this.$store.get('orders/message')
    },
    user() {
      return this.$store.get('users/user')
    },
  },
  mounted() {
    this.loadPage = true
    console.log('USer func', this.user.id)
    this.setData.userId = this.user.id
    this.$store.dispatch('orders/getOrdersByUserId', this.setData)
    // this.$store.dispatch('users/detailUser', this.user.id)
    setTimeout(() => {
      this.loadPage = false
    }, 3000)
  },
  methods: {
    orderTime(time) {
      const displayTime = moment(new Date(time)).format('DD/MM à HH:mm')
      console.log(displayTime)
      return displayTime
    },
  },
  // created() {
  //   this.pollData()
  // },
}
</script>
