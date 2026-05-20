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
    <v-row>
      <v-col
        v-for="(item, index) in dataOrdersFilteredByOrdersSent"
        :key="index"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card outlined class="pa-4 border-radius-10">
          <v-card-title> Commande #{{ item.ordernumber }} </v-card-title>

          <v-card-subtitle class="pt-0">
            <div class="mb-2 primary--text">
              {{ orderTime(item.created) }}
            </div>

            <div class="mb-1 black--text">
              Client : <b>{{ item.customer }}</b>
            </div>

            <div class="mb-1 black--text">
              Total : <b>{{ formatCurrency(item.subtotal) }}</b>
            </div>

            <div class="mb-1 black--text">
              Paiement : <b>{{ item.payment }}</b>
            </div>

            <div class="mb-1 black--text">
              Statut paiement :
              <v-chip x-small dark :color="paymentStatusColor(item)">
                {{ paymentStatusText(item) }}
              </v-chip>
            </div>
          </v-card-subtitle>
          <v-card-text>
            <v-chip v-if="item.status === 0" color="info" class="mb-2">
              Paiement en attente
            </v-chip>
            <v-chip v-if="item.status === 1" color="grey" class="mb-2">
              En attente
            </v-chip>
            <v-chip v-if="item.status === 2" color="success" class="mb-2">
              En préparation
            </v-chip>
            <v-chip v-if="item.status === 3" color="primary" class="mb-2">
              Terminé
            </v-chip>
            <v-chip v-if="item.status === 4" color="warning" class="mb-2">
              Annulé
            </v-chip>
          </v-card-text>
          <v-card-actions>
            <v-btn
              outlined
              small
              color="default"
              @click="$router.push(`orders/detail/${item.id}`)"
            >
              Détails
              <v-icon small right>mdi-information-outline</v-icon>
            </v-btn>
            <v-btn
              v-if="canCancelOrder(item)"
              outlined
              small
              color="red"
              @click="btnCancel(item.id)"
            >
              Annuler
              <v-icon small right>mdi-close-circle</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <div v-if="dataOrdersFilteredByOrdersSent.length === 0">
      <div style="margin-top: 30px" class="d-flex flex-column align-center">
        <v-icon size="90">mdi-room-service-outline</v-icon>
        <div class="font-weight-bold d-flex justify-center">
          Votre assiette est vide !
        </div>
      </div>
    </div>
    <v-card
      v-if="socialLinks.length > 0"
      outlined
      class="social-follow-card mt-5 pa-4 text-center"
    >
      <div class="font-weight-bold mb-2">Nous rejoindre</div>
      <div class="d-flex justify-center align-center flex-wrap">
        <v-btn
          v-for="social in socialLinks"
          :key="social.name"
          :href="social.url"
          :aria-label="social.label"
          :color="social.color"
          class="mx-1"
          icon
          target="_blank"
          rel="noopener noreferrer"
        >
          <v-icon>{{ social.icon }}</v-icon>
        </v-btn>
      </div>
    </v-card>
    <!-- <v-data-table
        :headers="headers"
        :items="dataOrders"
        :sort-by="['created']"
        disable-sort
      >
        <template #[`item.created`]="{ item }">
          <div>
            {{ orderTime(item.created) }}
          </div>
        </template>
        <template #[`item.subtotal`]="{ item }">
          <div>{{ formatCurrency(item.subtotal) }}</div>
        </template>
        <template #[`item.payment_status`]="{ item }">
          <v-chip small dark :color="paymentStatusColor(item)">
            {{ paymentStatusText(item) }}
          </v-chip>
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
          <v-row>
            <v-card-actions>
              <v-btn
                outlined
                small
                color="default"
                class="text-none"
                @click="$router.push(`orders/detail/${item.id}`)"
                >Details
                <v-icon small right>mdi-information-outline</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions
              v-if="item.status !== 4 && item.status !== 3 && item.status !== 2"
            >
              <v-btn
                outlined
                small
                color="red"
                class="text-none"
                @click="btnCancel(item.id)"
                >Annuler <v-icon small right>mdi-close-circle</v-icon>
              </v-btn>
            </v-card-actions>
          </v-row>
        </template>
      </v-data-table> -->
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
    >Sound <v-icon small right>mdi-close-circle</v-icon>
  </v-btn> -->
    <!-- all ordersSent {{ allOrdersSent }} allORders
    <pre>{{ dataOrders }}</pre> -->
  </v-container>
</template>
<script>
import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
import moment from 'moment'
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')

export default {
  mixins: [formatdate, price],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      errMsg: false,
      polling: null,
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
        { text: 'Paiement', value: 'payment_status', filterable: true },
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

  computed: {
    message() {
      return this.$store.get('orders/message')
    },
    user() {
      return this.$store.get('users/user')
    },
    allOrdersSent() {
      return this.$store.get('cart/allOrdersSent')
    },
    dataOrders() {
      return this.$store.get('orders/dataOrdersByUserId')
    },
    dataOrdersFilteredByOrdersSent() {
      console.log('Acces', localStorage.getItem('access'))
      if (localStorage.getItem('access') !== '3') {
        return this.dataOrders
      }
      const orders = this.$store.get('orders/dataOrdersByUserId') || []

      // ✅ FIX: ids = allOrdersSent (pas dataOrders)
      const ids = (this.allOrdersSent || []).map((x) => String(x))

      console.log('orders', orders)
      console.log('ids', ids)

      const filteredOrders = orders.filter((o) => ids.includes(String(o.id)))

      console.log('filteredOrders', filteredOrders)
      return filteredOrders
    },
    socialLinks() {
      const socialMedia = this.$store.get('shop/shop_social_media') || {}
      const links = [
        {
          name: 'instagram',
          label: 'Instagram',
          icon: 'mdi-instagram',
          color: 'pink',
          url: socialMedia.instagram,
        },
        {
          name: 'facebook',
          label: 'Facebook',
          icon: 'mdi-facebook',
          color: 'blue',
          url: socialMedia.facebook,
        },
        {
          name: 'tiktok',
          label: 'TikTok',
          icon: 'mdi-music-note',
          color: 'black',
          url: socialMedia.tiktok,
        },
        {
          name: 'snapchat',
          label: 'Snapchat',
          icon: 'mdi-snapchat',
          color: 'amber darken-2',
          url: socialMedia.snapchat,
        },
      ]

      return links.filter((link) => link.url)
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('cart/hydrateOrdersSent')
    this.pollData()
    this.$store
      .dispatch('orders/getOrdersByUserId', {
        userId: this.user.id,
      })
      .finally(() => {
        this.loadPage = false
      })
  },
  methods: {
    pollData() {
      this.polling = setInterval(() => {
        this.$store.dispatch('orders/getOrdersByUserId', {
          userId: this.user.id,
        })
        this.lastUpdate = this.updateTimeStamp
      }, 15000)
    },
    orderTime(time) {
      const displayTime = moment(new Date(time)).format('DD/MM à HH:mm')
      console.log(displayTime)
      return displayTime
    },
    canCancelOrder(item) {
      return ![0, 2, 3, 4].includes(item.status)
    },
    paymentStatusText(item) {
      return getPaymentStatusText(item)
    },
    paymentStatusColor(item) {
      return getPaymentStatusColor(item)
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
        this.$store.set('orders/message', 'La requête a échoué.')
        this.errMsg = true
      }
    },
  },
  // created() {
  //   this.pollData()
  // },
}
</script>
<style scoped>
.social-follow-card {
  border-radius: 8px;
}
</style>
