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
        :disable-sort="$vuetify.breakpoint.smAndDown"
      >
        <template #expanded-item="{ item }">
          <td colspan="12">
            <v-card
              v-for="(itm, i) in getOrderDetailsByOrderId(item.id)"
              :key="i"
              outlined
              class="mb-3 d-flex justify-space-between align-center pa-2"
            >
              <v-img
                :src="productImageSrc(itm.image)"
                class="cashregister-detail-image"
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
                    color: rgba(0, 0, 0, 0.8);
                  "
                >
                  {{ itm.name }}<br />
                  {{ formatCurrency(itm.subtotal) }}
                </h6>

                <div
                  v-if="customizationGroups(itm).length"
                  class="cashregister-customizations"
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
                <div style="text-align: center">
                  Client
                  <h6
                    class="text-center text-truncate"
                    style="
                      font-weight: bold;
                      font-size: large;
                      color: rgba(0, 0, 0, 0.8);
                    "
                  >
                    {{ itm.customer }}
                  </h6>
                </div>

                <v-btn
                  style="font-size: x-large"
                  color="success"
                  fab
                  small
                  dark
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
          </td>
        </template>
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
            En préparation
          </v-chip>
          <v-chip v-if="item.status === 3" color="primary"> Terminée </v-chip>
          <v-chip v-if="item.status === 4" color="warning"> Annulée </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-row class="d-flex flex-nowrap">
            <v-card-actions v-if="item.status === 2">
              <v-btn
                outlined
                small
                color="primary"
                class="text-none"
                @click="btnFinish(item.id)"
                >Prête <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions>
              <v-btn
                outlined
                small
                color="default"
                class="text-none"
                @click="$router.push(`/orders/detail/${item.id}`)"
                >Détails
                <v-icon small right>mdi-information-outline</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions v-if="item.status !== 4 && item.status !== 3">
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
      </v-data-table>
    </v-card>
    <!-- <pre type="json">{{ tableName }}</pre> -->

    <!-- <pre type="json">{{ AllOrdersDetails }}</pre> -->
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
        >Sound <v-icon small right>mdi-close-circle</v-icon>
      </v-btn> -->
  </v-container>
</template>
<script>
import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
import moment from 'moment'
import { groupCustomizationSelections } from '@/helpers/customizations'
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
          text: 'Numéro de commande',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Client', value: 'customer', filterable: true, width: '100px' },
        // { text: 'Operateur', value: 'operator' },
        { text: 'Total', value: 'subtotal', filterable: true, width: '100px' },
        { text: 'Paiement', value: 'payment_status', filterable: true },
        { text: 'Statut', value: 'status', filterable: true },
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
    dataOrders() {
      return this.$store.get('orders/dataOrdersByUserId') || []
    },
    AllOrdersDetails() {
      return this.$store.get('orders/AllDetailOrders')
    },
    message() {
      return this.$store.get('orders/message')
    },
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
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

    paymentStatusText(item) {
      if (item.payment_status === 'requires_payment') return 'À encaisser'
      return getPaymentStatusText(item)
    },
    paymentStatusColor(item) {
      if (item.payment_status === 'requires_payment') return 'orange'
      return getPaymentStatusColor(item)
    },

    reloadTableOrders() {
      this.loadPage = true
      return this.$store
        .dispatch('orders/getOrdersByUserId', { userId: this.user.id })
        .then(() => {
          const ordersIds = this.dataOrders.map((x) => x.id)
          return this.$store.dispatch('orders/getAllDetailOrders', ordersIds)
        })
        .finally(() => {
          this.loadPage = false
        })
    },

    async btnFinish(id) {
      const data = {
        operator: this.user.id,
        status: 3,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.reloadTableOrders()
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
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
        this.reloadTableOrders()
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
.cashregister-detail-image {
  flex: 0 0 auto;
  min-width: 128px;
  width: 128px;
}

.cashregister-detail-image ::v-deep .v-image__image {
  background-position: center;
  background-size: cover;
}

.cashregister-customizations {
  min-width: 180px;
  text-align: center;
}
</style>
