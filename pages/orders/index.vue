<template>
  <v-container fluid class="orders-page full-width">
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
      class="orders-loading-card overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <section v-if="!loadPage" class="orders-cockpit">
      <div class="orders-cockpit__lead">
        <div class="orders-cockpit__icon">
          <v-icon>mdi-format-list-checks</v-icon>
        </div>
        <div>
          <div class="orders-cockpit__title">Flux service</div>
          <div class="orders-cockpit__meta">
            {{ servicePulseText }}
          </div>
        </div>
      </div>
      <div class="orders-cockpit__stats">
        <div
          v-for="stat in orderStats"
          :key="stat.key"
          :class="['orders-stat', `orders-stat--${stat.tone}`]"
        >
          <div class="orders-stat__icon">
            <v-icon small>{{ stat.icon }}</v-icon>
          </div>
          <div>
            <div class="orders-stat__value">{{ stat.value }}</div>
            <div class="orders-stat__label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>
    <v-card v-if="!loadPage" ref="ordersCard" outlined class="orders-card full-width">
      <v-app-bar flat color="white" light class="orders-toolbar">
        <div class="orders-kitchen-control kitchen-toggle">
          <v-switch
            :input-value="isKitchenClosed"
            :loading="kitchenToggleLoading"
            :disabled="kitchenToggleLoading"
            :label="isKitchenClosed ? 'Cuisine fermée' : 'Cuisine ouverte'"
            :color="isKitchenClosed ? 'warning' : 'success'"
            dense
            hide-details
            inset
            class="orders-kitchen-switch mt-0"
            @change="toggleKitchenClosed"
          ></v-switch>
        </div>

        <div class="orders-toolbar__actions">
          <v-btn
            v-if="selectedOrders.length"
            color="error"
            dark
            depressed
            class="orders-bulk-delete text-none"
            :loading="deleteLoading"
            @click="deleteSelectedOrders()"
            >Supprimer
            <v-icon small right>mdi-trash-can-outline</v-icon>
          </v-btn>

          <v-text-field
            v-model="searchFilter"
            class="se-search-field orders-search-field"
            placeholder="Rechercher une commande, table ou client"
            outlined
            dense
            hide-details
            prepend-inner-icon="mdi-magnify"
          ></v-text-field>
        </div>
      </v-app-bar>
      <v-data-table
        v-model="selectedOrders"
        :headers="headers"
        :items="dataOrders"
        :search="searchFilter"
        :hide-default-header="$vuetify.breakpoint.smAndDown"
        :items-per-page="20"
        :footer-props="{
          'items-per-page-options': [10, 15, 20, { text: 'ALL', value: -1 }],
          'items-per-page-text': 'Commandes par page',
        }"
        class="orders-table"
        show-select
        @click:row="openOrderDetail"
      >
        <template #[`item.ordernumber`]="{ item }">
          <div class="order-reference">
            <div class="order-reference__number">
              #{{ item.ordernumber }}
              <v-chip
                v-if="isTakeawayOrder(item)"
                small
                color="warning"
                dark
                class="order-reference__takeaway-icon"
                aria-label="À emporter"
                title="À emporter"
              >
                <v-icon x-small>mdi-basket</v-icon>
              </v-chip>
            </div>
            <div class="order-reference__date">
              {{ orderHour(item.created) }} • {{ orderDayMonth(item.created) }}
            </div>
          </div>
        </template>
        <template #[`item.subtotal`]="{ item }">
          <div class="orders-total-cell">{{ formatCurrency(item.subtotal) }}</div>
        </template>
        <template #[`item.payment_status`]="{ item }">
          <v-chip
            dark
            :color="paymentStatusColor(item)"
            class="orders-data-chip"
          >
            {{ paymentStatusText(item) }}
          </v-chip>
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip
            v-if="item.status === 1"
            color="grey"
            class="orders-data-chip"
          >
            En attente
          </v-chip>
          <v-chip
            v-if="item.status === 2"
            color="success"
            class="orders-data-chip"
          >
            En préparation
          </v-chip>
          <v-chip
            v-if="item.status === 3"
            color="primary"
            class="orders-data-chip"
          >
            Terminée
          </v-chip>
          <v-chip
            v-if="item.status === 4"
            color="warning"
            class="orders-data-chip"
          >
            Annulée
          </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="orders-actions">
            <template v-if="item.status === 1">
              <v-btn
                outlined
                small
                color="success"
                class="orders-action-btn orders-action-btn--approve text-none"
                @click.stop="btnApprove(item)"
                >
                Valider <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </template>
            <template v-if="item.status === 2">
              <v-btn
                outlined
                small
                color="primary"
                class="orders-action-btn orders-action-btn--finish text-none"
                @click.stop="btnFinish(item.id)"
                >Prête <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </template>
            <template>
              <v-btn
                outlined
                small
                color="default"
                class="orders-action-btn orders-action-btn--details text-none"
                @click.stop="openOrderDetail(item)"
                >Détails
                <v-icon small right>mdi-information-outline</v-icon>
              </v-btn>
            </template>
            <template v-if="item.status !== 4 && item.status !== 3">
              <v-btn
                outlined
                small
                color="primaryPurple"
                class="orders-action-btn orders-action-btn--print text-none"
                :disabled="isOrderPrinting(item)"
                :loading="isOrderPrinting(item)"
                @click.stop="printOrderDetails(item)"
                >Imprimer
                <v-icon small right>mdi-printer-outline</v-icon>
              </v-btn>
              <v-btn
                outlined
                small
                color="error"
                class="orders-action-btn orders-action-btn--danger text-none"
                @click.stop="btnCancel(item)"
                >{{
                  item.payment_provider === 'stripe' &&
                  item.payment_status === 'paid'
                    ? 'Rembourser'
                    : 'Annuler'
                }}
                <v-icon small right>mdi-close-circle</v-icon>
              </v-btn>
            </template>
          </div>
        </template>
      </v-data-table>
    </v-card>
    <section v-if="!loadPage" class="orders-lanes" aria-label="Workflow commandes">
      <article
        v-for="lane in orderLanes"
        :key="lane.key"
        :class="['orders-lane-card', `orders-lane-card--${lane.tone}`]"
      >
        <header class="orders-lane-card__header">
          <div class="orders-lane-card__title-wrap">
            <span class="orders-lane-card__icon">
              <v-icon small>{{ lane.icon }}</v-icon>
            </span>
            <div>
              <div class="orders-lane-card__title">{{ lane.label }}</div>
              <div class="orders-lane-card__hint">{{ lane.hint }}</div>
            </div>
          </div>
          <span class="orders-lane-card__count">
            {{ laneOrders(lane).length }}
          </span>
        </header>

        <div v-if="laneOrders(lane).length" class="orders-lane-card__list">
          <div
            v-for="order in laneOrders(lane).slice(0, 4)"
            :key="`${lane.key}-${order.id}`"
            class="orders-lane-order"
            role="button"
            tabindex="0"
            @click="openOrderDetail(order)"
            @keydown.enter="openOrderDetail(order)"
            @keydown.space.prevent="openOrderDetail(order)"
          >
            <div class="orders-lane-order__main">
              <div class="orders-lane-order__number">
                #{{ order.ordernumber }}
              </div>
              <div class="orders-lane-order__meta">
                {{ order.service_point_name || 'Sans table' }}
                <span v-if="order.customer">- {{ order.customer }}</span>
              </div>
            </div>
            <div class="orders-lane-order__side">
              <div class="orders-lane-order__total">
                {{ formatCurrency(order.subtotal) }}
              </div>
              <v-chip
                small
                class="orders-data-chip orders-lane-order__chip"
                :class="orderLaneChipClass(order)"
              >
                {{ orderLaneStatusText(order) }}
              </v-chip>
            </div>
            <div class="orders-lane-order__actions">
              <v-btn
                v-if="order.status === 1"
                small
                depressed
                color="success"
                class="orders-lane-action orders-lane-action--primary text-none"
                :aria-label="`Valider la commande ${order.ordernumber}`"
                @click.stop="btnApprove(order)"
              >
                <v-icon small left>mdi-check-circle</v-icon>
                Valider
              </v-btn>
              <v-btn
                v-if="order.status === 2"
                small
                depressed
                color="primary"
                class="orders-lane-action orders-lane-action--primary text-none"
                :aria-label="`Marquer la commande ${order.ordernumber} comme prete`"
                @click.stop="btnFinish(order.id)"
              >
                <v-icon small left>mdi-check-bold</v-icon>
                Prête
              </v-btn>
              <v-btn
                small
                outlined
                color="primary"
                class="orders-lane-action orders-lane-action--secondary text-none"
                :aria-label="`Voir le detail de la commande ${order.ordernumber}`"
                @click.stop="openOrderDetail(order)"
              >
                <v-icon small left>mdi-information-outline</v-icon>
                Détails
              </v-btn>
            </div>
          </div>
        </div>
        <div v-else class="orders-lane-card__empty">
          Rien à traiter ici
        </div>
      </article>
    </section>
    <v-dialog v-model="cancelDialog" max-width="350" persistent>
      <v-card>
        <v-card-title>{{ cancelDialogTitle }}</v-card-title>
        <v-card-text>{{ cancelDialogMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closeCancelDialog">
            Annuler
          </v-btn>
          <v-btn
            color="red"
            dark
            class="text-none"
            :loading="cancelLoading"
            @click="confirmCancelOrder"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
      >Sound <v-icon small right>mdi-close-circle</v-icon>
    </v-btn> -->
    <!-- <pre type="json">{{ lastUpdate }}</pre> -->
    <!-- <pre type="json">{{ selectedOrders }}</pre> -->
  </v-container>
</template>
<script>
import formatdate from '@/helpers/formatdate'
import moment from 'moment'
import price from '@/helpers/price'
import {
  buildOrderTicketPayload,
  sendOrderTicket,
} from '@/helpers/orderTicket'
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')
export default {
  mixins: [formatdate, price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      kitchenToggleLoading: false,
      polling: null,
      errMsg: false,
      cancelDialog: false,
      cancelLoading: false,
      pendingCancelOrder: null,
      printingOrderIds: {},
      lastUpdate: moment(new Date()),
      searchFilter: '',
      selectedOrders: [],
      headers: [
        {
          text: 'Commande',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Table', value: 'service_point_name', filterable: true },
        { text: 'Client', value: 'customer', filterable: true },
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
    dataOrders() {
      return this.$store.get('orders/dataOrders')
    },
    message() {
      return this.$store.get('orders/message')
    },
    updateTimeStamp() {
      return this.$store.get('orders/lastCreatedOrder')
    },
    isKitchenClosed() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/kitchen_closed')
      )
    },
    orderStats() {
      return [
        {
          key: 'waiting',
          label: 'En attente',
          value: this.countOrdersByStatus(1),
          icon: 'mdi-timer-sand',
          tone: 'warning',
        },
        {
          key: 'preparing',
          label: 'En cuisine',
          value: this.countOrdersByStatus(2),
          icon: 'mdi-chef-hat',
          tone: 'success',
        },
        {
          key: 'done',
          label: 'Terminees',
          value: this.countOrdersByStatus(3),
          icon: 'mdi-check-circle-outline',
          tone: 'primary',
        },
        {
          key: 'total',
          label: 'Total service',
          value: this.dataOrders.length,
          icon: 'mdi-receipt-text-outline',
          tone: 'purple',
        },
      ]
    },
    orderLanes() {
      return [
        {
          key: 'waiting',
          label: 'En attente',
          hint: 'Commandes a valider',
          icon: 'mdi-timer-sand',
          tone: 'warning',
        },
        {
          key: 'preparing',
          label: 'En preparation',
          hint: 'Commandes en cuisine',
          icon: 'mdi-chef-hat',
          tone: 'success',
        },
        {
          key: 'closed',
          label: 'Terminees / Annulees',
          hint: 'Commandes finalisees',
          icon: 'mdi-check-circle-outline',
          tone: 'primary',
        },
      ]
    },
    activeOrdersCount() {
      return this.countOrdersByStatus(1) + this.countOrdersByStatus(2)
    },
    servicePulseText() {
      if (this.isKitchenClosed) return 'Cuisine fermee'
      if (!this.activeOrdersCount) return 'Service a jour'
      return `${this.activeOrdersCount} commandes actives`
    },
    user() {
      return this.$store.get('users/user')
    },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_mail: this.$store.get('shop/shop_mail'),
        shop_description: this.$store.get('shop/shop_description'),
        shop_hours: this.$store.get('shop/shop_hours'),
        shop_payment_methods: this.$store.get('shop/shop_payment_methods'),
        shop_profile_image: this.$store.get('shop/shop_profile_image'),
        shop_status: this.$store.get('shop/shop_status'),
        kitchen_closed: this.$store.get('shop/kitchen_closed'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
        auto_print_order_tickets: this.$store.get(
          'shop/auto_print_order_tickets'
        ),
      }
    },
    isPendingCancelRefund() {
      const item = this.pendingCancelOrder
      return (
        item &&
        item.payment_provider === 'stripe' &&
        item.payment_status === 'paid'
      )
    },
    cancelDialogTitle() {
      return this.isPendingCancelRefund ? 'Remboursement' : 'Annulation'
    },
    cancelDialogMessage() {
      return this.isPendingCancelRefund
        ? 'Êtes-vous sûr de vouloir rembourser ?'
        : 'Êtes-vous sûr de vouloir annuler ?'
    },
  },
  watch: {
    dataOrders() {
      this.scheduleFit(true)
    },
    searchFilter() {
      this.scheduleFit(true)
    },
  },
  mounted() {
    this.loadPage = true
    Promise.all([
      this.$store.dispatch('orders/getAllOrder'),
      this.$store.dispatch('shop/getShopInfo'),
    ]).finally(() => {
      this.loadPage = false
      this.$nextTick(this.applyFit)
    })
    this.pollData()
    window.addEventListener('resize', this.scheduleFit)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.scheduleFit)
    }
  },
  beforeDestroy() {
    clearInterval(this.polling)
    window.removeEventListener('resize', this.scheduleFit)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
  },
  methods: {
    countOrdersByStatus(status) {
      return this.dataOrders.filter((order) => order.status === status).length
    },
    laneOrders(lane) {
      const laneFilters = {
        waiting: (order) => order.status === 1,
        preparing: (order) => order.status === 2,
        closed: (order) => [3, 4].includes(order.status),
      }
      const filter = laneFilters[lane.key] || (() => false)
      return this.dataOrders.filter(filter)
    },
    orderLaneStatusText(order) {
      const labels = {
        1: 'En attente',
        2: 'En preparation',
        3: 'Terminee',
        4: 'Annulee',
      }
      return labels[order.status] || 'Statut inconnu'
    },
    orderLaneChipClass(order) {
      const classes = {
        1: 'orders-lane-order__chip--warning',
        2: 'orders-lane-order__chip--success',
        3: 'orders-lane-order__chip--primary',
        4: 'orders-lane-order__chip--warning',
      }
      return classes[order.status] || 'orders-lane-order__chip--primary'
    },
    openOrderDetail(item) {
      if (!item || !item.id) return
      this.$router.push(`orders/detail/${item.id}`)
    },
    isOrderPrinting(order) {
      return Boolean(order && this.printingOrderIds[order.id])
    },
    lockOrderPrint(order) {
      if (this.isOrderPrinting(order)) {
        this.$store.dispatch('notifications/info', {
          message: 'Impression déjà en cours.',
          timeout: 2500,
        })
        return false
      }

      this.$set(this.printingOrderIds, order.id, true)
      return true
    },
    unlockOrderPrint(order) {
      this.$delete(this.printingOrderIds, order.id)
    },
    isTakeawayOrder(item) {
      return [true, 1, '1'].includes(item && item.is_takeaway)
    },
    async toggleKitchenClosed(value) {
      this.kitchenToggleLoading = true
      const res = await this.$store.dispatch('shop/updateShopInfo', {
        data: {
          kitchen_closed: value ? 1 : 0,
        },
      })
      if (!res) {
        this.$store.dispatch(
          'notifications/error',
          "Impossible de modifier l'etat de la cuisine."
        )
      }
      this.kitchenToggleLoading = false
    },
    async printOrderDetails(order) {
      if (!this.lockOrderPrint(order)) return
      try {
        await this.$store.dispatch('orders/getDetailOrder', order.id)
        const orderDetails = await this.$store.get('orders/detailOrder')
        const payload = buildOrderTicketPayload({
          order,
          details: orderDetails,
          shopInfo: this.shopInfo,
        })

        if (this.shopInfo.smart_print_app) {
          sendOrderTicket({
            payload,
            smartPrint: true,
            printerIp: this.shopInfo.shop_printer_ip,
            dispatch: this.$store.dispatch,
          })
        } else {
          sendOrderTicket({
            payload,
            smartPrint: false,
            dispatch: this.$store.dispatch,
          })
        }
      } catch (error) {
        this.$store.dispatch('notifications/error', {
          message: error.message || "L'impression a échoué.",
          timeout: 4000,
        })
      } finally {
        this.unlockOrderPrint(order)
      }
    },
    soundNotification() {
      const audio = new Audio(window.location.origin + '/soundnotif.ogg')
      audio.play()
    },
    pollData() {
      this.polling = setInterval(() => {
        this.$store.dispatch('orders/getAllOrder')
        const newOrders = this.numberOfNewOrders()
        if (newOrders) {
          this.$store.dispatch('notifications/info', {
            message: 'Il y a ' + newOrders + ' nouvelles commandes ! ',
            timeout: 3500,
          })
          this.soundNotification()
        }
        this.lastUpdate = this.updateTimeStamp
      }, 15000)
    },
    numberOfNewOrders() {
      return this.dataOrders.filter(
        (x) => moment(x.created).diff(this.lastUpdate) > 0
      ).length
    },
    searchData() {
      this.$store.dispatch('orders/getAllOrder')
    },
    deleteSelectedOrders() {
      this.deleteLoading = true

      Promise.all(
        this.selectedOrders.map((element) =>
          this.$store.dispatch('orders/deleteOrder', {
            id: element.id,
            notify: false,
          })
        )
      )
        .then((results) => {
          const deletedOrders = results.filter(Boolean).length
          this.selectedOrders = []
          this.deleteLoading = false
          if (deletedOrders) {
            this.$store.dispatch('notifications/success', {
              message:
                deletedOrders > 1
                  ? `${deletedOrders} commandes supprimées avec succès.`
                  : 'Commande supprimée avec succès.',
            })
          }
        })
        .finally(() => {
          this.$store.dispatch('orders/getAllOrder')
        })
    },
    async btnApprove(item) {
      const data = {
        operator: this.user.id,
        status: 2,
      }
      const res = await this.$store.dispatch('orders/updateOrder', {
        id: item.id,
        data,
      })
      if (res) {
        if (this.shouldAutoPrintOrderTickets()) {
          await this.printOrderDetails(item)
        }
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
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
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
        this.errMsg = true
      }
    },
    btnCancel(item) {
      this.pendingCancelOrder = item
      this.cancelDialog = true
    },
    closeCancelDialog() {
      if (this.cancelLoading) return
      this.cancelDialog = false
      this.pendingCancelOrder = null
    },
    async confirmCancelOrder() {
      const item = this.pendingCancelOrder
      if (!item) return
      this.cancelLoading = true
      if (
        item.payment_provider === 'stripe' &&
        item.payment_status === 'paid'
      ) {
        const refunded = await this.$store.dispatch(
          'orders/refundStripeOrder',
          {
            id: item.id,
          }
        )
        if (refunded) {
          this.$store.dispatch('orders/getAllOrder')
        }
        this.cancelLoading = false
        this.closeCancelDialog()
        return
      }

      const data = {
        operator: this.user.id,
        status: 4,
      }
      const res = await this.$store.dispatch('orders/updateOrder', {
        id: item.id,
        data,
      })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
        this.errMsg = true
      }
      this.cancelLoading = false
      this.closeCancelDialog()
    },
    orderHour(time) {
      return moment(new Date(time)).format('HH:mm')
    },
    orderDate(time) {
      return moment(new Date(time)).format('DD/MM/YYYY')
    },
    orderDayMonth(time) {
      return moment(new Date(time)).format('DD/MM')
    },
    scheduleFit(force) {
      if (force === true) this.fitForce = true
      if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
      this.fitRaf = requestAnimationFrame(() => {
        this.fitRaf = null
        const f = this.fitForce
        this.fitForce = false
        this.applyFit(f)
      })
    },
    // Reduit le tableau pour qu'il tienne dans la largeur de l'ecran, sans
    // scroll horizontal, via la propriete CSS `zoom` (reflow naturel : pas de
    // compensation de hauteur a faire).
    applyFit(force) {
      const card = this.$refs.ordersCard && this.$refs.ordersCard.$el
      if (!card) return
      const el = card.querySelector('.v-data-table')
      if (!el) return

      // Garde anti-boucle : le zoom modifie la hauteur de la carte, ce qui
      // re-declenche le ResizeObserver. On ne recalcule que si la largeur a
      // change, sauf si force=true (changement de donnees / recherche).
      const available = card.clientWidth
      if (
        !force &&
        this.observing &&
        Math.abs(available - (this.lastAvailable || 0)) < 1
      ) {
        return
      }
      this.lastAvailable = available

      // Reset avant de mesurer la largeur naturelle du tableau
      el.style.zoom = ''

      const table = el.querySelector('.v-data-table__wrapper table')
      const natural = table ? table.scrollWidth : el.scrollWidth
      if (!natural || !available) return

      const scale = Math.min(1, available / natural)
      el.style.zoom = scale < 1 ? String(scale) : ''

      if (this.resizeObserver && !this.observing) {
        this.resizeObserver.observe(card)
        this.observing = true
      }
    },
    paymentStatusText(item) {
      return getPaymentStatusText(item)
    },
    paymentStatusColor(item) {
      return getPaymentStatusColor(item)
    },
    shouldAutoPrintOrderTickets() {
      return [true, 1, '1', 'true'].includes(
        this.shopInfo.auto_print_order_tickets
      )
    },
    generateEscPos(order, shopInfo, orderInfo) {
      console.log('Generating ESC/POS for order:', order, 'shopInfo:', shopInfo)
      // ---------------------------------------
      // FONCTIONS INTERNES UTILITAIRES
      // ---------------------------------------
      const esc = (text) => Buffer.from(text, 'ascii')

      const alignLeft = () => Buffer.from([0x1b, 0x61, 0])
      const alignCenter = () => Buffer.from([0x1b, 0x61, 1])
      const alignRight = () => Buffer.from([0x1b, 0x61, 2])

      const boldOn = () => Buffer.from([0x1b, 0x45, 1])
      const boldOff = () => Buffer.from([0x1b, 0x45, 0])

      const doubleOn = () => Buffer.from([0x1d, 0x21, 0x11])
      const doubleOff = () => Buffer.from([0x1d, 0x21, 0x00])
      const tripleOn = () => Buffer.from([0x1d, 0x21, 0x22])

      const line = () => esc('--------------------------------\n')
      const cut = () => Buffer.from([0x1d, 0x56, 0x00])

      const out = []
      const push = (...bufs) => bufs.forEach((b) => out.push(b))

      const euroSymbol = Buffer.from([0x80])
      push(Buffer.from([0x1b, 0x40])) // Reset
      push(Buffer.from([0x1b, 0x74, 0x10])) // CP1252

      // ---------------------------------------
      // 🔵 HEADER MAGASIN
      // ---------------------------------------
      push(alignCenter(), boldOn(), doubleOff())
      push(esc(shopInfo.shop_name + '\n'))
      push(doubleOff(), boldOff())

      push(esc('\n'))

      // ---------------------------------------
      // 👤 CLIENT + COMMANDE
      // ---------------------------------------
      push(
        alignCenter(),
        boldOn(),
        doubleOn(),
        esc('Commande\n'),
        tripleOn(),
        esc('#' + order[0].ordernumber + '\n'),
        boldOff(),
        doubleOff()
      )
      push(
        alignCenter(),
        boldOn(),
        doubleOn(),
        esc((orderInfo.table || '') + '\n'),
        doubleOff(),
        boldOff()
      )

      push(
        alignCenter(),
        boldOn(),
        doubleOn(),
        esc(('Client:' + orderInfo.client || '') + '\n'),
        doubleOff(),
        boldOff()
      )
      push(esc('Date : '))
      push(
        boldOn(),
        esc(this.currentDate(orderInfo.created) + '\n\n'),
        boldOff()
      )

      // ---------------------------------------
      // 🛒 TABLEAU PRODUITS
      // ---------------------------------------
      push(
        boldOn(),
        alignLeft(),
        esc('QTE   PRODUIT                PRIX\n\n'),
        boldOff()
      )
      push(line())

      order.forEach((item) => {
        const qty = (item.qty + 'x').padEnd(5)
        const name = (item.name + '').padEnd(20).slice(0, 20)
        const price = this.formatTicketNumber(item.total).padStart(7)

        push(alignLeft(), esc(`${qty}${name}${price} `), euroSymbol, esc('\n'))
        if (item.customizationList && Array.isArray(item.customizationList)) {
          item.customizationList.forEach((customItem) => {
            if (customItem.name) {
              const customDetails = this.splitByWords(customItem.name) // Split name into words
              customDetails.forEach((detail) => {
                push(esc(`  - ${detail}\n`)) // Format each customization detail
              })
            }
          })
        }
      })

      push(line())

      // ---------------------------------------
      // 🧾 TOTAUX
      // ---------------------------------------
      push(
        alignRight(),
        boldOn(),
        doubleOn(),
        esc(`TOTAL : ${this.formatTicketNumber(orderInfo.total)} `),
        euroSymbol,
        doubleOff(),
        boldOff(),
        esc('\n')
      )
      push(doubleOff(), boldOff(), esc('\n'))

      push(alignRight(), esc('Paiement : ' + orderInfo.paymentMethod + '\n'))
      push(line())

      console.log('Adding remark to receipt:', orderInfo.remark)
      if (orderInfo.remark.length > 0) {
        push(alignCenter(), doubleOn(), boldOn(), esc('----------\n'))
        push(alignLeft(), esc('NOTE: ' + orderInfo.remark + '\n'))
        push(alignCenter(), doubleOn(), boldOn(), esc('----------\n'))
        push(alignRight(), doubleOff(), boldOff())
      }
      // ---------------------------------------
      // 🙏 FOOTER
      // ---------------------------------------
      push(alignCenter(), esc('Made with smarteat.fr\n\n\n\n\n'))

      push(cut())

      return Buffer.concat(out)
    },

    splitByWords(text, maxLen = 30) {
      const words = text.split(' ')
      const lines = []
      let current = ''

      words.forEach((word) => {
        if ((current + word).length > maxLen) {
          lines.push(current.trim())
          current = word + ' '
        } else {
          current += word + ' '
        }
      })

      if (current.trim().length > 0) {
        lines.push(current.trim())
      }

      return lines
    },
    currentDate(date) {
      return moment(date).local().format('DD/MM/YYYY à HH:mm')
    },
    formatTicketNumber(value) {
      return this.formatCurrency(value).replace(' €', '')
    },

    printReceiptCloud(order, shopInfo, orderInfo) {
      console.log('Printing receipt via cloud for order:', order)
      const req =
        '<?xml version="1.0" encoding="utf-8" ?>' +
        '<PrintRequestInfo>' +
        '<ePOSPrint>' +
        '<Parameter>' +
        '<devid>local_printer</devid>' +
        '<timeout>10000</timeout>' +
        '</Parameter>' +
        '<PrintData>' +
        '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
        // === En-tête ===
        '<text smooth="true"></text>' +
        '<text em="true" align="center" width="1" height="1">' +
        shopInfo.shop_name +
        '</text>' +
        '<feed line="1"/>' +
        '<feed line="1"/>' +
        // === Commande ===
        '<text em="true" smooth="true" width="3" height="3">' +
        'Commande n°' +
        order[0].ordernumber +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="true" align="center" width="2" height="2">' +
        orderInfo.table +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="true" align="center" width="2" height="2">' +
        'Client:' +
        orderInfo.client +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="false" smooth="true" width="1" height="1">Date :</text> ' +
        '<text em="true" smooth="true" width="1" height="1">' +
        this.currentDate(orderInfo.created) +
        '</text>' +
        '<feed line="2"/>' +
        '<text align="left"> ' +
        'QTE   PRODUIT                PRIX\n\n' +
        '</text>' +
        '<text  em="false" align="left" >--------------------------------</text>' +
        '<feed line="1"/>' +
        // === Produits ===
        order
          .map((item) => {
            const qty = (item.qty + 'x').padEnd(5)
            const name = (item.name + '').padEnd(20).slice(0, 20)
            const price = this.formatTicketNumber(item.total).padStart(7)

            let block =
              `<text em="true" align="left" >${qty}${name}${price} €</text>` +
              `<feed line="1"/>`

            if (Array.isArray(item.customizationList)) {
              item.customizationList.forEach((customItem) => {
                if (customItem.name) {
                  this.splitByWords(customItem.name).forEach((detail) => {
                    block +=
                      `<text  em="false" align="left">  - ${detail}</text>` +
                      `<feed line="1"/>`
                  })
                }
              })
            }

            return block
          })
          .join('') +
        '<text>--------------------------------</text>' +
        '<feed line="1"/>' +
        '<text align="right" width="2" height="2">TOTAL : ' +
        this.formatTicketNumber(orderInfo.total) +
        ' €</text>' +
        '<feed line="2"/>' +
        '<text em="false"  width="1" height="1" >Paiement : ' +
        orderInfo.paymentMethod +
        '</text>' +
        '<feed line="1"/>' +
        '<text>--------------------------------</text>' +
        '<feed line="2"/>' +
        // === Pied de ticket ===
        '<feed line="1"/>' +
        (orderInfo.remark && orderInfo.remark.length > 0
          ? '<text em="true" align="center">----------</text>' +
            '<feed line="1"/>' +
            '<text em="false" align="left">NOTE: ' +
            orderInfo.remark +
            '</text>' +
            '<feed line="1"/>' +
            '<text em="true" align="center">----------</text>' +
            '<feed line="1"/>'
          : '') +
        '<feed line="1"/>' +
        '<text align="center">Made with smarteat.fr</text>' +
        '<feed line="3"/>' +
        '<cut/>' +
        '</epos-print>' +
        '</PrintData>' +
        '</ePOSPrint>' +
        '</PrintRequestInfo>'

      return this.$store.dispatch('printing/postPrintingJob', {
        requete: req,
        ticketType: 'commande',
        orderId: this.orderId,
      })
    },
  },
}
</script>
<style scoped>
.orders-page {
  background: var(--se-color-bg);
  padding: 20px;
}

.orders-cockpit {
  align-items: stretch;
  display: flex;
  gap: 14px;
  margin-top: 20px;
}

.orders-cockpit__lead,
.orders-stat {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
}

.orders-cockpit__lead {
  align-items: center;
  display: flex;
  flex: 1 1 280px;
  gap: 14px;
  min-height: 82px;
  padding: 16px;
}

.orders-cockpit__icon,
.orders-stat__icon {
  align-items: center;
  border-radius: var(--se-radius-lg);
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;
}

.orders-cockpit__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
  height: 46px;
  width: 46px;
}

.orders-cockpit__icon .v-icon {
  color: var(--se-color-primary);
}

.orders-cockpit__title {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
}

.orders-cockpit__meta {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-medium);
  margin-top: 4px;
}

.orders-cockpit__stats {
  display: grid;
  flex: 2 1 640px;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(132px, 1fr));
}

.orders-stat {
  align-items: center;
  display: flex;
  gap: 10px;
  min-height: 82px;
  padding: 14px;
  transition:
    background-color var(--se-transition-fast),
    border-color var(--se-transition-fast),
    transform var(--se-transition-fast);
}

.orders-stat:hover {
  background: #fbfdff;
  border-color: #cfd9e7;
  transform: translateY(-1px);
}

.orders-stat__icon {
  height: 36px;
  width: 36px;
}

.orders-stat__value {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  font-weight: var(--se-weight-bold);
  line-height: 1;
}

.orders-stat__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
  margin-top: 5px;
  white-space: nowrap;
}

.orders-stat--warning .orders-stat__icon {
  background: var(--se-color-warning-soft);
}

.orders-stat--warning .v-icon {
  color: var(--se-color-warning);
}

.orders-stat--success .orders-stat__icon {
  background: var(--se-color-success-soft);
}

.orders-stat--success .v-icon {
  color: var(--se-color-success);
}

.orders-stat--primary .orders-stat__icon {
  background: var(--se-color-primary-soft);
}

.orders-stat--primary .v-icon {
  color: var(--se-color-primary);
}

.orders-stat--purple .orders-stat__icon {
  background: var(--se-color-brand-purple-soft);
}

.orders-stat--purple .v-icon {
  color: var(--se-color-brand-purple);
}

.orders-lanes {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(240px, 1fr));
  margin-top: 14px;
}

.orders-lane-card {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  overflow: hidden;
}

.orders-lane-card__header {
  align-items: center;
  background: var(--se-color-surface-muted);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  justify-content: space-between;
  min-height: 72px;
  padding: 14px;
}

.orders-lane-card__title-wrap {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.orders-lane-card__icon {
  align-items: center;
  border-radius: var(--se-radius-lg);
  display: inline-flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.orders-lane-card__title {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
}

.orders-lane-card__hint {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-medium);
  margin-top: 3px;
}

.orders-lane-card__count {
  align-items: center;
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-pill);
  color: var(--se-color-text);
  display: inline-flex;
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-bold);
  height: 30px;
  justify-content: center;
  min-width: 30px;
  padding: 0 9px;
}

.orders-lane-card--warning .orders-lane-card__icon {
  background: var(--se-color-warning-soft);
}

.orders-lane-card--warning .v-icon {
  color: var(--se-color-warning);
}

.orders-lane-card--success .orders-lane-card__icon {
  background: var(--se-color-success-soft);
}

.orders-lane-card--success .v-icon {
  color: var(--se-color-success);
}

.orders-lane-card--primary .orders-lane-card__icon {
  background: var(--se-color-primary-soft);
}

.orders-lane-card--primary .v-icon {
  color: var(--se-color-primary);
}

.orders-lane-card__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.orders-lane-order {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-sm);
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 12px;
  transition:
    background-color var(--se-transition-fast),
    border-color var(--se-transition-fast);
}

.orders-lane-order:hover {
  background: #fbfdff;
  border-color: #cfd9e7;
}

.orders-lane-order:focus-visible {
  border-color: var(--se-color-primary);
  outline: 3px solid rgba(25, 118, 210, 0.22);
  outline-offset: 2px;
}

.orders-lane-order__main {
  min-width: 0;
}

.orders-lane-order__number {
  align-items: center;
  color: var(--se-color-text);
  display: flex;
  font-size: var(--se-font-body);
  font-weight: var(--se-weight-bold);
  gap: 7px;
  line-height: var(--se-line-tight);
}

.orders-lane-order__meta {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-medium);
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orders-lane-order__side {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.orders-lane-order__total {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-bold);
  white-space: nowrap;
}

.orders-lane-order__chip {
  font-size: var(--se-font-caption);
  min-height: 24px;
}

.orders-lane-order__chip--warning {
  background: var(--se-color-warning-soft) !important;
  color: var(--se-color-warning) !important;
}

.orders-lane-order__chip--success {
  background: var(--se-color-success-soft) !important;
  color: var(--se-color-success) !important;
}

.orders-lane-order__chip--primary {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
}

.orders-lane-order__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  grid-column: 1 / -1;
}

.orders-lane-action {
  border-radius: var(--se-radius-sm) !important;
  font-weight: var(--se-weight-semibold);
  height: 34px !important;
  letter-spacing: 0;
  min-width: 92px !important;
  padding: 0 10px !important;
}

::v-deep .orders-lane-action .v-btn__content {
  gap: 4px;
  justify-content: center;
}

.orders-lane-action:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.24);
  outline-offset: 2px;
}

.orders-lane-card__empty {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-medium);
  padding: 18px 14px;
}

.orders-loading-card,
.orders-card {
  background: var(--se-color-surface) !important;
  border: 1px solid var(--se-color-border) !important;
  border-radius: var(--se-radius-md) !important;
  overflow: hidden;
}

.orders-loading-card {
  margin-top: 20px;
}

.orders-card {
  margin-top: 20px;
}

.orders-toolbar {
  border-bottom: 1px solid var(--se-color-border-soft) !important;
}

::v-deep .orders-toolbar .v-toolbar__content {
  min-height: 64px;
  padding: 10px 14px !important;
}

.orders-toolbar__actions {
  align-items: center;
  display: flex;
  flex: 1 1 720px;
  gap: 12px;
  justify-content: flex-end;
  margin-left: auto;
  max-width: 720px;
  min-width: 0;
}

.orders-kitchen-control {
  align-items: center;
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-pill);
  display: inline-flex;
  min-height: 42px;
  padding: 0 14px 0 10px;
}

.orders-kitchen-switch {
  color: var(--se-color-text-body);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
}

.orders-search-field {
  flex: 0 0 560px !important;
  max-width: 560px !important;
  min-width: 560px !important;
  width: 560px !important;
}

.orders-bulk-delete,
.orders-action-btn {
  border-radius: var(--se-radius-sm) !important;
  font-weight: var(--se-weight-semibold);
  letter-spacing: 0;
}

.orders-bulk-delete {
  min-height: 38px;
}

.orders-table {
  color: var(--se-color-text-body);
}

/* Bug connu Vuetify (#10164) : les entetes de v-data-table se desalignent
   selon la largeur quand une cellule d'entete passe sur 2 lignes. On force le
   non-retour a la ligne et un alignement vertical coherent entete/corps. */
::v-deep .v-data-table-header th {
  background: var(--se-color-surface-muted);
  color: var(--se-color-text-muted) !important;
  font-size: var(--se-font-caption) !important;
  font-weight: var(--se-weight-bold) !important;
  letter-spacing: 0;
  white-space: nowrap;
  vertical-align: middle;
}

::v-deep .v-data-table td {
  border-bottom: 1px solid var(--se-color-border-soft) !important;
  color: var(--se-color-text-body);
  font-size: var(--se-font-small);
  height: 64px;
  vertical-align: middle;
}

::v-deep .orders-table tbody tr {
  cursor: pointer;
  transition:
    background-color var(--se-transition-fast),
    box-shadow var(--se-transition-fast);
}

::v-deep .orders-table tbody tr:hover {
  background: #fbfdff !important;
}

.kitchen-toggle {
  min-width: 170px;
}

.order-reference {
  min-width: 96px;
  line-height: 1.25;
}

.order-reference__number {
  align-items: center;
  color: var(--se-color-text);
  display: flex;
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-bold);
  gap: 7px;
  white-space: nowrap;
}

.order-reference__takeaway-icon {
  border-radius: 50% !important;
  height: 22px !important;
  justify-content: center;
  margin-left: 3px;
  min-width: 22px !important;
  padding: 0 !important;
  vertical-align: 3px;
  width: 22px;
}

.v-chip.orders-data-chip {
  border-radius: 12px !important;
}

.order-reference__date {
  margin-top: 2px;
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-medium);
}

.orders-total-cell {
  color: var(--se-color-text);
  font-weight: var(--se-weight-semibold);
  white-space: nowrap;
}

.orders-actions {
  align-items: center;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  justify-content: flex-start;
}

.orders-action-btn {
  min-height: 32px;
}

.orders-action-btn--details {
  color: var(--se-color-text-body) !important;
}

.orders-action-btn--danger {
  border-color: var(--se-color-danger) !important;
  color: var(--se-color-danger) !important;
}

@media (max-width: 900px) {
  .orders-cockpit {
    flex-direction: column;
  }

  .orders-cockpit__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .orders-lanes {
    display: flex;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .orders-lane-card {
    flex: 0 0 320px;
  }

  ::v-deep .orders-toolbar .v-toolbar__content {
    align-items: stretch;
    flex-direction: column;
    height: auto !important;
  }

  .orders-toolbar__actions {
    justify-content: flex-start;
    margin-left: 0;
    max-width: none;
    width: 100%;
  }

  .orders-search-field {
    flex: 1 1 auto !important;
    max-width: none !important;
    min-width: 0 !important;
    width: 100% !important;
  }
}

@media (max-width: 560px) {
  .orders-page {
    padding: 12px;
  }

  .orders-cockpit__stats {
    grid-template-columns: 1fr;
  }

  .orders-lanes {
    display: grid;
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .orders-lane-card {
    flex-basis: auto;
  }

  .orders-stat__label {
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orders-lane-order,
  .orders-lane-action,
  .orders-stat,
  ::v-deep .orders-table tbody tr {
    transition: none;
  }

  .orders-lane-order:hover,
  .orders-stat:hover {
    transform: none;
  }
}
</style>
