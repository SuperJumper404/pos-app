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

    <v-alert v-else-if="detailLoadError" class="mt-5" outlined text type="error">
      {{ detailLoadError }}
    </v-alert>

    <div v-else class="mt-5 order-detail-panel">
      <v-card outlined class="order-detail-header-card">
        <v-card-text v-if="orderSummary" class="order-detail-header">
          <div class="order-detail-header__identity">
            <div class="order-detail-header__field">
              <span class="order-detail-header__label">Commande</span>
              <strong>#{{ orderSummary.ordernumber || '—' }}</strong>
            </div>
            <div class="order-detail-header__field">
              <span class="order-detail-header__label">Client</span>
              <strong>{{ orderSummary.customer || '—' }}</strong>
            </div>
            <div class="order-detail-header__field">
              <span class="order-detail-header__label">Prise par</span>
              <strong>{{ orderSummary.taken_by_name || 'Non attribuee' }}</strong>
            </div>
            <div class="order-detail-header__field">
              <span class="order-detail-header__label">Preparee par</span>
              <strong>{{ orderSummary.prepared_by_name || 'Non attribuee' }}</strong>
            </div>
            <div
              v-if="orderPaymentStatus"
              class="order-detail-header__field"
            >
              <span class="order-detail-header__label">Paiement</span>
              <v-chip
                small
                dark
                :color="paymentStatusColor(orderPaymentStatus)"
              >
                {{ paymentStatusText(orderPaymentStatus) }}
              </v-chip>
            </div>
            <div class="order-detail-header__field">
              <span class="order-detail-header__label">Nombre d’articles</span>
              <strong>{{ totalItemCount }}</strong>
            </div>
            <div class="order-detail-header__field">
              <span class="order-detail-header__label">Service</span>
              <TakeawayChip
                :value="orderSummary.is_takeaway"
                show-dine-in
                show-icon
                :icon-size="18"
                small
              />
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card outlined class="order-detail-list-card">
        <div class="order-detail-list">
          <v-card
            v-for="(itm, i) in detailOrder"
            :key="i"
            outlined
            class="order-detail-item mb-3"
          >
            <div class="order-detail-content">
              <div class="order-detail-image-wrap">
                <v-img
                  :src="productImageSrc(itm.image)"
                  class="order-detail-image"
                  :aspect-ratio="4 / 3"
                  height="96"
                  width="128"
                  max-width="128px"
                ></v-img>
              </div>

              <div class="order-detail-body">
                <div class="order-detail-product-row">
                  <div class="order-detail-product">
                    <div class="order-detail-product-name">
                      {{ itm.name }}
                    </div>
                    <div class="order-detail-product-price">
                      {{ lineItemAmount(itm) }}
                    </div>
                  </div>

                  <div
                    class="order-detail-qty primary white--text"
                    :aria-label="`Quantité : ${itm.qty}`"
                  >
                    <strong>{{ itm.qty }}</strong>
                  </div>
                </div>

                <div
                  v-if="customizationGroups(itm).length"
                  class="order-detail-customizations"
                >
                  <div class="order-detail-customizations__title">
                    <v-icon size="17" color="primary">
                      mdi-tune-variant
                    </v-icon>
                    <span>Choix et suppléments</span>
                  </div>
                  <CustomizationSummary
                    :groups="customizationGroups(itm)"
                  />
                </div>
              </div>
            </div>
          </v-card>
        </div>
      </v-card>

      <VatBreakdown
        v-if="isTvaActive"
        :details="detailOrder"
        class="mt-3"
      />
    </div>

    <v-alert
      v-if="orderNote"
      class="my-4"
      outlined
      text
      type="info"
      transition="scroll-x-transition"
      border="left"
    >
      Notes : {{ orderNote }}
    </v-alert>

    <v-card color="grey lighten-3" class="mt-5">
      <v-card-actions class="order-detail-footer-actions">
        <v-btn
          v-if="canOpenOrderEditModal && !loadPage"
          color="success"
          class="text-none"
          :loading="startLoading"
          :disabled="startLoading"
          @click="requestOrderEdit"
        >
          Modifier <v-icon small right>mdi-pencil</v-icon>
        </v-btn>
        <v-btn
          v-if="canStartComplementaryOrder && !loadPage"
          color="success"
          class="text-none"
          :loading="startLoading"
          :disabled="startLoading"
          @click="requestComplementaryOrder"
        >
          Ajouter une commande complémentaire
          <v-icon small right>mdi-plus</v-icon>
        </v-btn>
        <v-btn color="primary" class="text-none" @click="$router.go(-1)">
          Retour <v-icon small right>mdi-arrow-left</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="replaceCartDialog" max-width="480">
      <v-card>
        <v-card-title>Remplacer le panier actuel ?</v-card-title>
        <v-card-text>
          Le panier en cours sera remplacé par les produits de cette commande.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="cancelReplaceCart">
            Garder le panier
          </v-btn>
          <v-btn color="primary" class="text-none" @click="confirmReplaceCart">
            Continuer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <OrderEditModal
      v-model="orderEditDialog"
      :order-number="String((orderSummary && orderSummary.ordernumber) || '')"
      @completed="handleOrderEditCompleted"
    />
  </v-container>
</template>

<script>
import OrderEditModal from '@/components/orders/OrderEditModal'
import TakeawayChip from '@/components/orders/TakeawayChip'
import VatBreakdown from '@/components/orders/VatBreakdown'
import CustomizationSummary from '@/components/products/CustomizationSummary'
import price from '@/helpers/price'
import { groupCustomizationSelections } from '@/helpers/customizations'
const {
  canEditOrder: isOrderEditable,
  canStartComplementaryOrder: canCreateComplementaryOrder,
  canUseOrderEditModal,
} = require('@/helpers/orderEdit')
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')

export default {
  components: {
    OrderEditModal,
    TakeawayChip,
    VatBreakdown,
    CustomizationSummary,
  },
  mixins: [price],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  data() {
    return {
      id: this.$route.params.id,
      loadPage: false,
      loadedOrderId: null,
      detailLoadError: '',
      detailRequestId: 0,
      actionRequestId: 0,
      startLoading: false,
      orderEditDialog: false,
      replaceCartDialog: false,
      pendingStart: null,
    }
  },

  computed: {
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    detailOrder() {
      if (this.loadPage || this.loadedOrderId !== String(this.id)) return []
      return this.$store.get('orders/detailOrder') || []
    },
    orderSummary() {
      return this.detailOrder[0] || null
    },
    canEditOrder() {
      return isOrderEditable(this.orderSummary || {})
    },
    userAccess() {
      const user = this.$store.get('users/user') || {}
      const access =
        user.access === undefined || user.access === null
          ? localStorage.getItem('access')
          : user.access
      return Number(access)
    },
    canOpenOrderEditModal() {
      return canUseOrderEditModal(this.userAccess, this.orderSummary || {})
    },
    canStartComplementaryOrder() {
      return canCreateComplementaryOrder(this.orderSummary || {})
    },
    hasLocalCart() {
      const cart = this.$store.get('cart/dataCart')
      return Array.isArray(cart) && cart.length > 0
    },
    hasUnsafeCheckoutAttempt() {
      const status = this.$store.get('cart/clientOrderStatus') || 'idle'
      return (
        Boolean(this.$store.get('cart/clientOrderOrderId')) ||
        ['pending', 'uncertain', 'stripe_prepared'].includes(status)
      )
    },
    orderNote() {
      const remark = this.detailOrder[0] && this.detailOrder[0].remark
      return typeof remark === 'string' ? remark.trim() : ''
    },
    orderPaymentStatus() {
      return this.detailOrder[0] || null
    },
    totalItemCount() {
      return this.detailOrder.reduce((total, item) => {
        const quantity = Number(item && item.qty)
        return total + (Number.isFinite(quantity) ? quantity : 0)
      }, 0)
    },
    isTvaActive() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/activate_tva')
      )
    },
  },
  watch: {
    '$route.params.id'(id) {
      this.loadOrderDetail(id)
    },
  },
  mounted() {
    this.loadOrderDetail(this.id)
  },
  methods: {
    async loadOrderDetail(id) {
      const requestedId = String(id)
      const requestId = this.detailRequestId + 1
      this.detailRequestId = requestId
      this.actionRequestId += 1
      this.startLoading = false
      this.$store.dispatch('orderEdit/invalidateBegin')
      this.id = id
      this.loadPage = true
      this.loadedOrderId = null
      this.detailLoadError = ''
      this.orderEditDialog = false
      this.replaceCartDialog = false
      this.pendingStart = null

      try {
        const loaded = await this.$store.dispatch('orders/getDetailOrder', id)
        if (requestId !== this.detailRequestId) return
        if (!loaded) {
          this.detailLoadError =
            this.$store.get('orders/message') ||
            'Impossible de charger la commande.'
          return
        }
        this.loadedOrderId = requestedId
      } finally {
        if (requestId === this.detailRequestId) this.loadPage = false
      }
    },
    requestOrderEdit() {
      if (!this.canOpenOrderEditModal) return
      this.requestOrderStart('edit')
    },
    requestComplementaryOrder() {
      if (!this.canStartComplementaryOrder) return
      this.requestOrderStart('complementary')
    },
    requestOrderStart(type) {
      this.pendingStart = type
      if (this.hasUnsafeCheckoutAttempt) {
        this.pendingStart = null
        this.$store.dispatch(
          'notifications/error',
          'Terminez ou vérifiez le paiement en cours avant de modifier une commande.'
        )
        this.$router.push('/cart')
        return
      }
      if (this.hasLocalCart) {
        this.pendingStart = type
        this.replaceCartDialog = true
        return
      }
      this.startPendingOrder()
    },
    isCurrentOrderDetail(orderId, actionRequestId) {
      return (
        !this.loadPage &&
        this.loadedOrderId === String(orderId) &&
        String(this.$route.params.id) === String(orderId) &&
        this.actionRequestId === actionRequestId
      )
    },
    cancelReplaceCart() {
      this.replaceCartDialog = false
      this.pendingStart = null
    },
    confirmReplaceCart() {
      this.replaceCartDialog = false
      this.startPendingOrder()
    },
    startPendingOrder() {
      const type = this.pendingStart
      this.pendingStart = null
      if (type === 'edit') return this.startOrderEdit()
      if (type === 'complementary') return this.startComplementaryOrder()
    },
    async startOrderEdit() {
      const orderId = this.loadedOrderId
      const actionRequestId = this.actionRequestId + 1
      this.actionRequestId = actionRequestId
      if (
        !this.isCurrentOrderDetail(orderId, actionRequestId) ||
        !this.canOpenOrderEditModal
      ) {
        return
      }
      this.startLoading = true
      try {
        this.$store.dispatch('orders/setComplementaryOrder', null)
        const result = await this.$store.dispatch('orderEdit/begin', orderId)
        if (
          !result ||
          !result.ok ||
          !this.isCurrentOrderDetail(orderId, actionRequestId)
        ) {
          return
        }
        this.orderEditDialog = true
      } finally {
        if (this.actionRequestId === actionRequestId) {
          this.startLoading = false
        }
      }
    },
    async startComplementaryOrder() {
      const orderId = this.loadedOrderId
      const actionRequestId = this.actionRequestId + 1
      this.actionRequestId = actionRequestId
      if (
        !this.isCurrentOrderDetail(orderId, actionRequestId) ||
        !this.canStartComplementaryOrder
      ) {
        return
      }
      const order = this.orderSummary || {}
      this.startLoading = true
      try {
        await this.$store.dispatch('cart/abandonCheckout', { safe: true })
        if (!this.isCurrentOrderDetail(orderId, actionRequestId)) return
        await this.$store.dispatch('orderEdit/cancel')
        if (!this.isCurrentOrderDetail(orderId, actionRequestId)) return
        this.$store.dispatch('cart/setTocart', null)
        this.$store.dispatch('cart/setTotal', 0)
        this.$store.dispatch('cart/setIndex', 0)
        this.$store.dispatch('orders/setComplementaryOrder', {
          customer: order.customer || '',
          customerID: order.customerID == null ? null : order.customerID,
        })
        this.$router.push('/menus')
      } finally {
        if (this.actionRequestId === actionRequestId) {
          this.startLoading = false
        }
      }
    },
    handleOrderEditCompleted() {
      this.loadOrderDetail(this.id)
    },
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
    lineItemAmount(item) {
      const amount =
        item.total !== undefined && item.total !== null
          ? item.total
          : item.price
      return this.formatCurrency(amount)
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
.order-detail-panel {
  max-height: 70vh;
  overflow-y: auto;
}

.order-detail-header-card,
.order-detail-list-card {
  border-radius: 12px !important;
}

.order-detail-list-card {
  margin-top: 12px;
  overflow: hidden;
}

.order-detail-header {
  align-items: center;
  color: rgba(0, 0, 0, 0.87);
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding-bottom: 24px;
  padding: 16px 20px;
}

.order-detail-header__identity {
  display: grid;
  gap: 12px 28px;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  min-width: 0;
  width: 100%;
}

.order-detail-header__field {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  text-align: center;
}

.order-detail-header__field strong {
  color: rgba(0, 0, 0, 0.87);
  font-family: Poppins, sans-serif;
  font-size: 22px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-detail-header__field .v-chip {
  align-self: center;
  font-size: 12px;
  height: 28px;
  padding: 0 14px;
}

.order-detail-header__label {
  color: rgba(0, 0, 0, 0.87);
  font-size: 12px;
  line-height: 1.2;
}

.order-detail-list {
  background: #f7f8fa;
  padding: 16px 16px 4px;
}

.order-detail-item {
  border-color: rgba(0, 0, 0, 0.1);
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(25, 39, 52, 0.04) !important;
  overflow: hidden;
}

.order-detail-content {
  align-items: flex-start;
  display: flex;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  width: 100%;
}

.order-detail-image-wrap {
  flex: 0 0 112px;
  min-width: 112px;
}

.order-detail-image {
  border-radius: 10px;
  display: block;
  height: 84px !important;
  max-width: 112px !important;
  width: 112px;
}

.order-detail-body {
  flex: 1 1 auto;
  min-width: 0;
}

.order-detail-product-row {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
}

.order-detail-product {
  min-width: 0;
}

.order-detail-product,
.order-detail-customizations {
  min-width: 0;
}

.order-detail-product-name,
.order-detail-product-price {
  color: rgba(0, 0, 0, 0.8);
  font-weight: bold;
}

.order-detail-product-name {
  display: -webkit-box;
  font-size: 17px;
  line-height: 1.25;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: break-word;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.order-detail-product-price {
  color: #1976d2;
  font-size: 16px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-detail-customizations {
  background: #f7f9fc;
  border: 1px solid rgba(25, 118, 210, 0.1);
  border-radius: 10px;
  margin-top: 12px;
  min-width: 0;
  padding: 10px;
}

.order-detail-customizations__title {
  align-items: center;
  color: rgba(0, 0, 0, 0.68);
  display: flex;
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
}

.order-detail-customizations ::v-deep .customization-summary {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.order-detail-customizations
  ::v-deep
  .customization-summary__group {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 8px;
  margin-bottom: 0 !important;
  min-width: 0;
  padding: 9px 10px 2px;
}

.order-detail-customizations
  ::v-deep
  .customization-summary__group
  > .d-flex:first-child {
  color: rgba(0, 0, 0, 0.8);
  font-size: 13px;
  line-height: 1.2;
  margin-bottom: 6px !important;
}

.order-detail-customizations ::v-deep .v-chip {
  background: #fff !important;
  border-color: rgba(25, 118, 210, 0.24) !important;
  font-size: 11px;
  height: 25px;
  margin-bottom: 7px !important;
}

.order-detail-qty {
  align-items: center;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
  display: flex;
  flex: 0 0 auto;
  height: 34px;
  justify-content: center;
  min-width: 34px;
  padding: 0;
  width: 34px;
}

.order-detail-qty strong {
  font-size: 17px;
  line-height: 1;
}

.order-detail-image ::v-deep .v-image__image {
  background-position: center;
  background-size: cover;
}

.order-detail-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.order-detail-footer-actions .v-btn {
  margin: 0 !important;
}

@media (max-width: 960px) {
  .order-detail-header__identity {
    grid-template-columns: repeat(2, minmax(120px, auto));
  }

  .order-detail-content {
    gap: 12px;
  }

  .order-detail-image-wrap {
    flex-basis: 96px;
    min-width: 96px;
  }

  .order-detail-image {
    height: 72px !important;
    max-width: 96px !important;
    width: 96px;
  }

  .order-detail-customizations ::v-deep .customization-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .order-detail-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px 22px;
  }

  .order-detail-header__identity {
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .order-detail-list {
    padding: 8px;
  }

  .order-detail-item {
    position: relative;
  }

  .order-detail-content {
    display: grid;
    gap: 10px 12px;
    grid-template-columns: 80px minmax(0, 1fr);
    padding: 10px;
  }

  .order-detail-image-wrap {
    flex: none;
    grid-column: 1;
    min-width: 0;
  }

  .order-detail-image {
    height: 60px !important;
    max-width: 80px !important;
    width: 80px;
  }

  .order-detail-body {
    display: contents;
  }

  .order-detail-product-row {
    grid-column: 2;
  }

  .order-detail-qty {
    height: 28px;
    min-width: 28px;
    padding: 0;
    width: 28px;
  }

  .order-detail-product-name {
    font-size: 16px;
  }

  .order-detail-product-price {
    font-size: 15px;
  }

  .order-detail-customizations {
    grid-column: 1 / -1;
    margin-top: 0;
  }

  .order-detail-customizations ::v-deep .customization-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 380px) {
  .order-detail-content {
    grid-template-columns: 68px minmax(0, 1fr);
  }

  .order-detail-image {
    height: 52px !important;
    max-width: 68px !important;
    width: 68px;
  }
}
</style>
