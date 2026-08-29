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
      v-if="loadPage"
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
          placeholder="Rechercher une commande, table ou client"
          outlined
          dense
          hide-details
          prepend-inner-icon="mdi-magnify"
        ></v-text-field>
      </v-app-bar>
      <v-data-table
        v-model="selectedOrders"
        :headers="headers"
        :items="dataArchivedOrders"
        :search="searchFilter"
        :expanded.sync="expanded"
        item-key="id"
        show-expand
        single-expand
        :disable-sort="$vuetify.breakpoint.smAndDown"
      >
        <template #[`item.ordernumber`]="{ item }">
          <div>#{{ item.ordernumber }}</div>
          <TakeawayChip :value="item.is_takeaway" />
        </template>
        <template #expanded-item="{ item }">
          <td colspan="12">
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
              v-if="isTvaActive"
              :details="getArchivedOrderDetailsByOrderId(item.id)"
              class="mt-3 mb-3"
            />
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
        <template #[`item.taken_by_name`]="{ item }">
          {{ item.taken_by_name || 'Non attribuee' }}
        </template>
        <template #[`item.prepared_by_name`]="{ item }">
          {{ item.prepared_by_name || 'Non attribuee' }}
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
            <v-card-actions>
              <v-btn
                outlined
                small
                color="primary"
                class="text-none"
                @click="showInvoice(item.id)"
                >Ticket <v-icon small right>mdi-invoice-text</v-icon>
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
    <!-- <pre type="json">{{ lastUpdate }}</pre> -->
    <!-- <pre type="json">{{ dataAllDetailsArchivedOrders }}</pre>

    <pre type="json">la{{ detailArchivedOrder }}</pre>
    <pre type="json">{{ dataArchivedOrders }}</pre> -->
  </v-container>
</template>
<script>
import TakeawayChip from '@/components/orders/TakeawayChip'
import VatBreakdown from '@/components/orders/VatBreakdown'
import formatdate from '@/helpers/formatdate'
import moment from 'moment'
import price from '@/helpers/price'
import { groupCustomizationSelections } from '@/helpers/customizations'
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')
export default {
  components: { TakeawayChip, VatBreakdown },
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
      headers: [
        { text: 'Date', value: 'created', filterable: true },
        {
          text: 'Numéro de commande',
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
        { text: 'Actions', value: 'actions' },
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
    dataArchivedOrders() {
      return this.$store.get('history/dataArchivedOrders')
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
  mounted() {
    this.loadPage = true
    const archivedOrdersIds = this.dataArchivedOrders.map((x) => x.id)
    console.log('id', archivedOrdersIds)

    for (const id of archivedOrdersIds) {
      this.$store.dispatch('history/getDetailArchivedOrder', id).then(() => {
        const detail = this.$store.get('history/detailArchivedOrder')
        console.log('DeTAILLL', detail)
        this.dataAllDetailsArchivedOrders.push(detail)
      })
    }

    console.log('result multi orders', this.result)
    this.$store.dispatch('history/getAllArchivedOrders').finally(() => {
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
    getArchivedOrderDetailsByOrderId(id) {
      const result = this.dataAllDetailsArchivedOrders
        .flat()
        .filter((x) => x.orderid === id)
      console.log(id, ' archived Detail orders', result)
      return result
    },
    showInvoice(id) {
      const detailedArchive = this.$store
        .dispatch('history/getDetailArchivedOrder', id)
        .finally(() => {
          console.log('Archived Order', detailedArchive)
        })

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
      return getPaymentStatusText(item)
    },
    paymentStatusColor(item) {
      return getPaymentStatusColor(item)
    },
  },
}
</script>
<style scoped>
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
