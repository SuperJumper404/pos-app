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
    <div style="background: #f5f5f5" class="mt-5">
      <v-breadcrumbs :items="items">
        <template #item="{ item }">
          <v-breadcrumbs-item :to="item.to" :disabled="item.disabled">
            {{ item.text }}
          </v-breadcrumbs-item>
        </template>
      </v-breadcrumbs>
    </div>
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
        <v-spacer></v-spacer>
        <div>
          <v-btn
            v-if="selectedOrders.length"
            color="red"
            elevation="3"
            style="color: white; height: 40px; margin: 0px 8px 2px 0px"
            @click="deleteSelectedOrders()"
            :loading="deleteLoading"
            >Supprimer
            <v-icon small right>mdi-delete-forever</v-icon>
          </v-btn>
        </div>
        <div class="mt-6">
          <v-text-field
            v-model="searchFilter"
            placeholder="Rechercher table"
            label="Seaching"
            outlined
            dense
            append-icon="mdi-card-search"
          ></v-text-field>
        </div>
      </v-app-bar>
      <v-data-table
        :headers="headers"
        :items="dataOrders"
        :search="searchFilter"
        v-model="selectedOrders"
        show-select
      >
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
    <pre type="json">{{ lastUpdate }}</pre>
    <pre type="json">{{ selectedOrders }}</pre>

    <v-snackbars
      :messages.sync="orderNotifications"
      :timeout="60000"
      top
      right
      color="blue"
    ></v-snackbars>
  </v-container>
</template>
<script>
import defaultdata from '@/helpers/defaultdata'
import formatdate from '@/helpers/formatdate'
import moment from 'moment'
import price from '@/helpers/price'
import VSnackbars from 'v-snackbars'
export default {
  mixins: [defaultdata, formatdate, price],
  middleware: 'auth',
  components: {
    'v-snackbars': VSnackbars,
  },
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      polling: null,
      errMsg: false,
      lastUpdate: moment(new Date()),
      searchFilter: '',
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
      return this.$store.get('orders/dataOrders')
    },
    message() {
      return this.$store.get('orders/message')
    },
    updateTimeStamp() {
      return this.$store.get('orders/lastCreatedOrder')
    },
    user() {
      return this.$store.get('users/user')
    },
    // userDetail() {
    //   return this.$store.get('users/userDetail')
    // },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('orders/getAllOrder', this.setData)
    // this.$store.dispatch('users/detailUser', this.user.id)
    this.pollData()
    setTimeout(() => {
      this.loadPage = false
    }, 3000)
  },
  methods: {
    soundNotification() {
      console.log(window.location.origin + '/soundnotif.ogg')
      const audio = new Audio(window.location.origin + '/soundnotif.ogg')
      audio.play()
    },
    pollData() {
      this.polling = setInterval(() => {
        this.$store.dispatch('orders/getAllOrder', this.setData)
        const newOrders = this.numberOfNewOrders()
        if (newOrders) {
          this.orderNotifications.push(
            'Il y a ' + newOrders + ' nouvelles commandes ! '
          )
          this.soundNotification()
        }
        this.lastUpdate = this.updateTimeStamp
      }, 15000)
    },
    numberOfNewOrders() {
      const newOrders = this.dataOrders.filter(
        (x) => moment(x.created).diff(this.lastUpdate) > 0
      ).length
      console.log('Number of new orders', newOrders)
      return newOrders
    },
    searchData() {
      this.$store.dispatch('orders/getAllOrder', this.setData)
    },
    deleteSelectedOrders() {
      this.deleteLoading = true
      this.selectedOrders.forEach((element) => {
        const id = element.id
        this.$store.dispatch('orders/deleteOrder', { id })
      })
      setTimeout(() => {
        this.selectedOrders = []

        this.deleteLoading = false
      }, 3000)

      // this.loadPage = true
      this.$store.dispatch('orders/getAllOrder', this.setData)
      // this.$store.dispatch('users/detailUser', this.user.id)
      // setTimeout(() => {
      //   this.loadPage = false
      // }, 3000)

      // this.$store.dispatch('orders/getAllOrder', this.setData)
    },
    async btnApprove(id) {
      const data = {
        operator: this.user.id,
        status: 2,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder', this.setData)
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
    async btnFinish(id) {
      const data = {
        operator: this.user.id,
        status: 3,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder', this.setData)
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
        this.$store.dispatch('orders/getAllOrder', this.setData)
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
    orderTime(time) {
      const displayTime = moment(new Date(time)).format('DD/MM à HH:mm')
      console.log(displayTime)
      return displayTime
    },
  },
  beforeDestroy() {
    clearInterval(this.polling)
  },
  // created() {
  //   this.pollData()
  // },
}
</script>
