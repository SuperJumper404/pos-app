<template>
  <v-container fluid class="orders-status-page">
    <v-card v-if="loadPage" outlined class="orders-loading-card">
      <Loading />
    </v-card>

    <div
      v-if="dataOrdersFilteredByOrdersSent.length > 0"
      class="orders-current-count"
    >
      <v-icon color="primary" size="28">mdi-room-service-outline</v-icon>
      <strong>{{ currentOrdersCount }}</strong>
      <span>
        commande{{ currentOrdersCount > 1 ? 's' : '' }} en cours
      </span>
    </div>

    <div
      v-if="dataOrdersFilteredByOrdersSent.length > 0"
      class="order-track-grid"
    >
      <v-card
        v-for="item in dataOrdersFilteredByOrdersSent"
        :key="item.id"
        outlined
        class="order-track-card"
        :class="orderCardClass(item)"
      >
        <div class="order-track-header">
          <div>
            <span class="order-track-kicker">Commande</span>
            <h2>#{{ item.ordernumber }}</h2>
          </div>
          <div v-if="isTakeawayOrder(item)" class="order-track-badges">
            <TakeawayChip
              :value="item.is_takeaway"
              small
              show-icon
              class="order-chip order-chip--service"
            />
          </div>
        </div>

        <div class="order-track-meta">
          <div>
            <v-icon small color="primary">mdi-calendar-clock</v-icon>
            <span>{{ orderTime(item.created) }}</span>
          </div>
          <div>
            <v-icon small color="primary">mdi-account-circle-outline</v-icon>
            <span>{{ item.customer || 'Client' }}</span>
          </div>
          <div>
            <v-icon small color="primary">mdi-cash</v-icon>
            <span>{{ formatCurrency(item.subtotal) }}</span>
          </div>
          <div>
            <v-icon small color="primary">mdi-credit-card-outline</v-icon>
            <v-chip
              small
              label
              dark
              :color="paymentMeta(item).color"
              class="order-chip order-chip--payment"
            >
              <v-icon left size="16" class="order-payment-chip-icon">
                {{ paymentMeta(item).icon }}
              </v-icon>
              {{ paymentMeta(item).label }}
            </v-chip>
          </div>
        </div>

        <div
          class="order-progress-rail"
          :class="`order-progress-rail--${statusMeta(item).key}`"
          role="progressbar"
          :aria-valuenow="orderStatusProgress(item)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Progression de la commande ${item.ordernumber}`"
        >
          <span :style="{ width: `${orderStatusProgress(item)}%` }"></span>
        </div>

        <div class="order-timeline">
          <div
            v-for="step in orderTimeline(item)"
            :key="step.key"
            class="order-step"
            :class="orderStepClass(item, step)"
          >
            <span class="order-step-node">
              <v-icon size="18">{{ step.icon }}</v-icon>
            </span>
            <span>{{ step.label }}</span>
          </div>
        </div>

        <div class="order-track-actions">
          <v-btn
            depressed
            color="primary"
            class="text-none order-detail-btn"
            @click="$router.push(`orders/detail/${item.id}`)"
          >
            Détails
            <v-icon small right>mdi-information-outline</v-icon>
          </v-btn>
          <v-btn
            v-if="canCancelOrder(item)"
            outlined
            color="red"
            class="text-none"
            @click="btnCancel(item.id)"
          >
            Annuler
            <v-icon small right>mdi-close-circle</v-icon>
          </v-btn>
        </div>
      </v-card>
    </div>

    <div v-else-if="!loadPage" class="orders-empty-state">
      <v-icon size="86" color="primary">mdi-room-service-outline</v-icon>
      <strong>Votre assiette est vide !</strong>
      <span>Vos commandes apparaîtront ici dès qu'elles seront envoyées.</span>
      <v-btn color="primary" class="text-none mt-4" depressed to="/menus">
        Voir le menu
      </v-btn>
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
  </v-container>
</template>

<script>
import TakeawayChip from '@/components/orders/TakeawayChip'
import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
import moment from 'moment'
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')

export default {
  components: { TakeawayChip },
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
      timelineSteps: [
        {
          key: 'received',
          label: 'En attente',
          icon: 'mdi-timer-sand',
        },
        {
          key: 'preparing',
          label: 'En préparation',
          icon: 'mdi-silverware-fork-knife',
        },
        {
          key: 'done',
          label: 'Terminée',
          icon: 'mdi-check-decagram-outline',
        },
        {
          key: 'canceled',
          label: 'Annulée',
          icon: 'mdi-close-octagon-outline',
        },
      ],
      headers: [
        { text: 'Date', value: 'created', filterable: true, width: '150px' },
        {
          text: 'Numéro de commande',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Client', value: 'customer', filterable: true, width: '100px' },
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
    message() {
      return this.$store.get('orders/message')
    },
    user() {
      return this.$store.get('users/user')
    },
    clientServicePointId() {
      const user = this.user || {}
      return (
        user.service_point_id ||
        localStorage.getItem('service_point_id') ||
        user.id
      )
    },
    allOrdersSent() {
      return this.$store.get('cart/allOrdersSent')
    },
    dataOrders() {
      return this.$store.get('orders/dataOrdersByUserId') || []
    },
    dataOrdersFilteredByOrdersSent() {
      const sentOrders = this.dataOrders.filter(this.orderIsSent)

      if (localStorage.getItem('access') !== '3') {
        return sentOrders
      }
      const ids = (this.allOrdersSent || []).map((x) => String(x))
      return sentOrders.filter((order) => ids.includes(String(order.id)))
    },
    currentOrdersCount() {
      const orders = this.dataOrdersFilteredByOrdersSent
      return orders.filter((order) => ![3, 4].includes(Number(order.status)))
        .length
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
        servicePointId: this.clientServicePointId,
      })
      .finally(() => {
        this.loadPage = false
      })
  },
  beforeDestroy() {
    if (this.polling) clearInterval(this.polling)
  },
  methods: {
    pollData() {
      this.polling = setInterval(() => {
        this.$store.dispatch('orders/getOrdersByUserId', {
          servicePointId: this.clientServicePointId,
        })
        this.lastUpdate = moment(new Date())
      }, 15000)
    },
    orderTime(time) {
      return moment(new Date(time)).format('DD/MM à HH:mm')
    },
    canCancelOrder(item) {
      return ![0, 2, 3, 4].includes(Number(item.status))
    },
    orderIsSent(order) {
      return Number(order.status) !== 0
    },
    paymentStatusText(item) {
      return getPaymentStatusText(item)
    },
    statusMeta(item) {
      switch (Number(item.status)) {
        case 2:
          return {
            key: 'preparing',
            label: 'En préparation',
            color: 'success',
            icon: 'mdi-silverware-fork-knife',
          }
        case 3:
          return {
            key: 'done',
            label: 'Terminée',
            color: 'primary',
            icon: 'mdi-check-decagram-outline',
          }
        case 4:
          return {
            key: 'canceled',
            label: 'Annulée',
            color: 'warning',
            icon: 'mdi-close-octagon-outline',
          }
        default:
          return {
            key: 'received',
            label: 'En attente',
            color: 'grey',
            icon: 'mdi-timer-sand',
          }
      }
    },
    statusChipClass(item) {
      return `order-chip--${this.statusMeta(item).key}`
    },
    isTakeawayOrder(item) {
      return [true, 1, '1'].includes(item.is_takeaway)
    },
    paymentMeta(item) {
      switch (item.payment_status) {
        case 'paid':
          return {
            label: getPaymentStatusText(item),
            color: getPaymentStatusColor(item),
            icon: 'mdi-check-circle-outline',
          }
        case 'unpaid':
          return {
            label: getPaymentStatusText(item),
            color: getPaymentStatusColor(item),
            icon: /comptoir/i.test(item.payment || '')
              ? 'mdi-cash-register'
              : 'mdi-cash-clock',
          }
        case 'requires_payment':
          return {
            label: getPaymentStatusText(item),
            color: getPaymentStatusColor(item),
            icon: 'mdi-timer-sand',
          }
        case 'refunded':
          return {
            label: getPaymentStatusText(item),
            color: getPaymentStatusColor(item),
            icon: 'mdi-cash-refund',
          }
        case 'failed':
          return {
            label: getPaymentStatusText(item),
            color: getPaymentStatusColor(item),
            icon: 'mdi-alert-circle-outline',
          }
        default:
          return {
            label: getPaymentStatusText(item),
            color: getPaymentStatusColor(item),
            icon: 'mdi-credit-card-outline',
          }
      }
    },
    orderStatusIndex(item) {
      const key = this.statusMeta(item).key
      return Math.max(
        this.timelineSteps.findIndex((step) => step.key === key),
        0
      )
    },
    orderTimeline(item) {
      return this.timelineSteps.map((step, index) => ({
        ...step,
        index,
      }))
    },
    orderStatusProgress(item) {
      const progressByStatus = {
        0: 12,
        1: 12,
        2: 50,
        3: 82,
        4: 100,
      }
      return progressByStatus[Number(item.status)] || 12
    },
    orderStepClass(item, step) {
      const activeIndex = this.orderStatusIndex(item)
      const statusKey = this.statusMeta(item).key
      const canceled = statusKey === 'canceled'
      return {
        'order-step--completed': !canceled && step.index < activeIndex,
        [`order-step--completed-${statusKey}`]:
          !canceled && step.index < activeIndex,
        'order-step--active': step.index === activeIndex,
        [`order-step--active-${statusKey}`]: step.index === activeIndex,
        'order-step--muted': step.index > activeIndex,
        'order-step--canceled': canceled && step.key === 'canceled',
        'order-step--disabled': canceled && step.key !== 'canceled',
      }
    },
    orderCardClass(item) {
      return {
        'order-track-card--preparing': Number(item.status) === 2,
        'order-track-card--done': Number(item.status) === 3,
        'order-track-card--canceled': Number(item.status) === 4,
      }
    },
    // Fusionne moyen de paiement + statut en un libellé orienté client :
    // ce qui compte pour lui, c'est "est-ce payé, et comment ?".
    paymentSummary(item) {
      const method = (item.payment || '').toString().trim()
      switch (item.payment_status) {
        case 'paid':
          return method ? `Payé · ${method}` : 'Payé'
        case 'unpaid':
          if (/comptoir/i.test(method)) return 'À régler au comptoir'
          return method ? `À régler · ${method}` : 'À régler'
        case 'requires_payment':
          return 'En attente'
        default:
          // failed -> Échoué, canceled -> Annulée, refunded -> Remboursé
          return this.paymentStatusText(item)
      }
    },
    async btnCancel(id) {
      const data = {
        operator: this.user.id,
        status: 4,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getOrdersByUserId', {
          servicePointId: this.clientServicePointId,
        })
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
        this.errMsg = true
      }
    },
  },
}
</script>

<style scoped>
.orders-status-page {
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
  padding: 18px 18px 28px;
}

.orders-loading-card {
  border-radius: 8px;
  height: 350px;
  margin-top: 20px;
  overflow-y: auto;
}

.orders-current-count {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  margin: 0 auto 16px;
  max-width: 1180px;
  padding: 14px 16px;
}

.orders-current-count strong {
  color: #121826;
  font-size: 1.8rem;
  font-weight: 900;
  line-height: 1;
}

.orders-current-count span {
  color: #121826;
  font-size: 1rem;
  font-weight: 800;
}

.order-track-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  margin: 0 auto;
  max-width: 1180px;
}

.order-track-card {
  border-color: #dce5ef !important;
  border-radius: 8px !important;
  padding: 18px;
  position: relative;
  transition: border-color 180ms ease, transform 180ms ease;
}

.order-track-card:hover,
.order-track-card:focus-within {
  border-color: #1976d2 !important;
  transform: translateY(-2px);
}

.order-track-card--preparing {
  background: #f7fff9 !important;
}

.order-track-card--done {
  background: #f8fbff !important;
}

.order-track-card--canceled {
  background: #fffbf4 !important;
}

.order-track-header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.order-track-kicker {
  color: rgba(18, 24, 38, 0.56);
  font-size: 0.78rem;
  font-weight: 800;
}

.order-track-header h2 {
  color: #121826;
  font-size: 1.7rem;
  font-weight: 900;
  line-height: 1.08;
  margin: 2px 0 0;
}

.order-track-badges {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.order-chip {
  border-radius: 999px !important;
  font-size: 0.74rem !important;
  font-weight: 900 !important;
  height: 24px !important;
  letter-spacing: 0;
  padding: 0 10px !important;
}

.order-chip ::v-deep .v-chip__content,
.order-chip .v-icon {
  color: inherit !important;
}

.order-chip--service {
  background: #ff9f0a !important;
  color: #ffffff !important;
  height: 28px !important;
  padding: 0 12px !important;
}

.order-chip--service ::v-deep .v-icon {
  margin-left: -1px !important;
  margin-right: 6px !important;
}

.order-chip--received,
.order-chip--waiting {
  background: #8a94a6 !important;
  color: #ffffff !important;
}

.order-chip--preparing,
.order-chip--paid {
  background: #00d97e !important;
  color: #ffffff !important;
}

.order-chip--done {
  background: #1976d2 !important;
  color: #ffffff !important;
}

.order-chip--canceled,
.order-chip--counter,
.order-chip--refunded {
  background: #ff9f0a !important;
  color: #ffffff !important;
}

.order-chip--failed {
  background: #ef4444 !important;
  color: #ffffff !important;
}

.order-chip--payment {
  height: 28px !important;
  max-width: 100%;
  padding: 0 12px !important;
}

.order-payment-chip-icon {
  margin-left: -1px !important;
  margin-right: 6px !important;
}

.order-track-meta {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 18px;
}

.order-track-meta > div {
  align-items: center;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid #e6edf5;
  border-radius: 8px;
  color: #121826;
  display: flex;
  font-size: 0.9rem;
  font-weight: 700;
  gap: 8px;
  min-height: 42px;
  min-width: 0;
  padding: 8px 10px;
}

.order-track-meta .v-icon {
  flex: 0 0 auto;
}

.order-track-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-track-meta .order-chip {
  min-width: 0;
}

.order-track-meta .order-chip ::v-deep .v-chip__content {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-progress-rail {
  background: #e9eef5;
  border-radius: 999px;
  height: 8px;
  margin: 22px 0 16px;
  overflow: hidden;
}

.order-progress-rail span {
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 240ms ease;
}

.order-progress-rail--received span {
  background: #8a94a6;
}

.order-progress-rail--preparing span {
  background: #00a85a;
}

.order-progress-rail--done span {
  background: #1976d2;
}

.order-progress-rail--canceled span {
  background: #f59e0b;
}

.order-timeline {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.order-step {
  align-items: center;
  color: rgba(18, 24, 38, 0.7);
  display: flex;
  flex-direction: column;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 7px;
  line-height: 1.15;
  text-align: center;
}

.order-step-node {
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #dbe5ef;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.order-step-node .v-icon {
  color: inherit !important;
}

.order-step--completed .order-step-node {
  background: #e8f2ff;
  border-color: #b7d7fb;
  color: #1976d2;
}

.order-step--completed-preparing .order-step-node {
  background: #e8f8ef;
  border-color: #9cf2c8;
  color: #00a85a;
}

.order-step--completed-done .order-step-node {
  background: #e8f2ff;
  border-color: #b7d7fb;
  color: #1976d2;
}

.order-step--active {
  color: #121826;
}

.order-step--active-received .order-step-node {
  background: #8a94a6;
  border-color: #8a94a6;
  color: #ffffff;
}

.order-step--active-preparing .order-step-node {
  background: #00a85a;
  border-color: #00a85a;
  color: #ffffff;
}

.order-step--active-done .order-step-node {
  background: #1976d2;
  border-color: #1976d2;
  color: #ffffff;
}

.order-step--active-canceled .order-step-node,
.order-step--canceled .order-step-node {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #ffffff;
}

.order-step--disabled {
  color: rgba(18, 24, 38, 0.38);
}

.order-step--disabled .order-step-node {
  opacity: 0.62;
}

.order-track-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.order-detail-btn {
  min-width: 120px !important;
}

.orders-empty-state {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #121826;
  display: flex;
  flex-direction: column;
  margin: 20px auto 0;
  max-width: 520px;
  padding: 36px 22px;
  text-align: center;
}

.orders-empty-state strong {
  font-size: 1.25rem;
  font-weight: 900;
  margin-top: 8px;
}

.orders-empty-state span {
  color: rgba(18, 24, 38, 0.66);
  font-weight: 600;
  margin-top: 4px;
}

.social-follow-card {
  border-radius: 8px;
  margin-left: auto;
  margin-right: auto;
  max-width: 1180px;
}

@media (max-width: 760px) {
  .orders-status-page {
    padding: 12px;
  }

  .order-track-grid {
    grid-template-columns: 1fr;
  }

  .order-track-header,
  .order-track-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .order-track-badges {
    justify-content: flex-start;
  }

  .order-track-meta {
    grid-template-columns: 1fr;
  }

  .order-timeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .order-track-card,
  .order-progress-rail span {
    transition: none !important;
  }

  .order-track-card:hover,
  .order-track-card:focus-within {
    transform: none;
  }
}
</style>
