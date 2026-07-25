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

    <v-card v-else outlined class="mt-5 order-detail-panel">
      <v-card-text v-if="orderPaymentStatus" class="pb-0">
        Statut paiement :
        <v-chip small dark :color="paymentStatusColor(orderPaymentStatus)">
          {{ paymentStatusText(orderPaymentStatus) }}
        </v-chip>
      </v-card-text>

      <div class="order-detail-list">
        <v-card
          v-for="(itm, i) in detailOrder"
          :key="i"
          outlined
          class="order-detail-item mb-3 pa-2"
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
              <div class="order-detail-main">
                <div class="order-detail-product">
                  <div class="order-detail-product-name">
                    {{ itm.name }}
                  </div>
                  <div class="order-detail-product-price">
                    {{ lineItemAmount(itm) }}
                  </div>
                </div>

                <div
                  v-if="customizationGroups(itm).length"
                  class="order-detail-customizations"
                >
                  <div
                    v-for="(group, groupIndex) in customizationGroups(itm)"
                    :key="`${group.stepName}-${groupIndex}`"
                    class="order-detail-customization-group"
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

                <div class="order-detail-meta">
                  <div class="order-detail-meta-block">
                    <span class="order-detail-meta-label">
                      Numéro de commande
                    </span>
                    <strong class="order-detail-meta-value">
                      #{{ itm.ordernumber }}
                    </strong>
                  </div>
                  <div class="order-detail-meta-block">
                    <span class="order-detail-meta-label">Client</span>
                    <strong class="order-detail-meta-value">
                      {{ itm.customer }}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <v-btn class="order-detail-qty" color="success" fab small dark>
              {{ itm.qty }}
            </v-btn>
          </div>
        </v-card>
      </div>
    </v-card>

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
      <v-card-actions>
        <v-btn
          v-if="canEditOrder && !loadPage"
          color="success"
          class="text-none"
          :loading="startLoading"
          :disabled="startLoading"
          @click="requestOrderEdit"
        >
          Modifier la commande <v-icon small right>mdi-pencil</v-icon>
        </v-btn>
        <v-btn
          v-if="canStartComplementaryOrder && !loadPage"
          color="success"
          class="text-none"
          :loading="startLoading"
          :disabled="startLoading"
          @click="requestComplementaryOrder"
        >
          Ajouter une commande complÃ©mentaire
          <v-icon small right>mdi-plus</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" class="text-none" @click="$router.go(-1)">
          Retour <v-icon small right>mdi-arrow-left</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="replaceCartDialog" max-width="480">
      <v-card>
        <v-card-title>Remplacer le panier actuel ?</v-card-title>
        <v-card-text>
          Le panier en cours sera remplacÃ© par les produits de cette commande.
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
  </v-container>
</template>

<script>
import price from '@/helpers/price'
import { groupCustomizationSelections } from '@/helpers/customizations'
const {
  canEditOrder: isOrderEditable,
  canStartComplementaryOrder: canCreateComplementaryOrder,
} = require('@/helpers/orderEdit')
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')

export default {
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
      startLoading: false,
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
  },
  mounted() {
    this.loadOrderDetail(this.id)
  },
  watch: {
    '$route.params.id'(id) {
      this.loadOrderDetail(id)
    },
  },
  methods: {
    async loadOrderDetail(id) {
      const requestedId = String(id)
      const requestId = this.detailRequestId + 1
      this.detailRequestId = requestId
      this.id = id
      this.loadPage = true
      this.loadedOrderId = null
      this.detailLoadError = ''
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
      if (!this.canEditOrder) return
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
          'Terminez ou vÃ©rifiez le paiement en cours avant de modifier une commande.'
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
      if (this.loadPage || !this.canEditOrder || !orderId) return
      this.startLoading = true
      try {
        this.$store.dispatch('orders/setComplementaryOrder', null)
        const result = await this.$store.dispatch('orderEdit/begin', orderId)
        if (
          !result ||
          !result.ok ||
          this.loadPage ||
          this.loadedOrderId !== orderId
        ) {
          return
        }
        this.$router.push('/menus')
      } finally {
        this.startLoading = false
      }
    },
    async startComplementaryOrder() {
      if (this.loadPage || !this.canStartComplementaryOrder) return
      const order = this.orderSummary || {}
      this.startLoading = true
      try {
        await this.$store.dispatch('cart/abandonCheckout', { safe: true })
        await this.$store.dispatch('orderEdit/cancel')
        this.$store.dispatch('cart/setTocart', null)
        this.$store.dispatch('cart/setTotal', 0)
        this.$store.dispatch('cart/setIndex', 0)
        this.$store.dispatch('orders/setComplementaryOrder', {
          customer: order.customer || '',
          customerID: order.customerID == null ? null : order.customerID,
        })
        this.$router.push('/menus')
      } finally {
        this.startLoading = false
      }
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

.order-detail-list {
  padding: 8px 16px 16px;
}

.order-detail-item {
  overflow: hidden;
}

.order-detail-content {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  width: 100%;
}

.order-detail-image-wrap {
  flex: 0 0 128px;
  min-width: 128px;
}

.order-detail-image {
  border-radius: 4px;
  display: block;
  width: 128px;
}

.order-detail-body {
  flex: 1 1 auto;
  min-width: 0;
}

.order-detail-main {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(140px, 1.5fr) minmax(
      180px,
      1fr
    );
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.order-detail-product {
  min-width: 0;
}

.order-detail-product,
.order-detail-customizations,
.order-detail-meta {
  min-width: 0;
}

.order-detail-product-name,
.order-detail-product-price,
.order-detail-meta-value {
  color: rgba(0, 0, 0, 0.8);
  font-weight: bold;
}

.order-detail-product-name {
  display: -webkit-box;
  font-size: 18px;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: break-word;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.order-detail-product-price {
  font-size: 17px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-detail-customizations {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  min-width: 0;
}

.order-detail-customization-group + .order-detail-customization-group {
  margin-top: 4px;
}

.order-detail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.order-detail-meta-block {
  min-width: 0;
  text-align: center;
}

.order-detail-meta-label {
  color: rgba(0, 0, 0, 0.65);
  display: block;
  font-size: 13px;
  line-height: 1.2;
}

.order-detail-meta-value {
  display: block;
  font-size: 17px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-detail-qty {
  flex: 0 0 auto;
}

.order-detail-qty ::v-deep .v-btn__content {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.order-detail-image ::v-deep .v-image__image {
  background-position: center;
  background-size: cover;
}

@media (max-width: 960px) {
  .order-detail-content {
    align-items: flex-start;
    gap: 12px;
  }

  .order-detail-image-wrap {
    flex-basis: 84px;
    min-width: 84px;
  }

  .order-detail-image {
    height: 84px !important;
    max-width: 84px !important;
    width: 84px;
  }

  .order-detail-main {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .order-detail-customizations {
    justify-content: flex-start;
  }

  .order-detail-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .order-detail-list {
    padding: 8px;
  }

  .order-detail-item {
    padding: 10px !important;
    position: relative;
  }

  .order-detail-content {
    align-items: start;
    display: grid;
    gap: 6px 12px;
    grid-template-areas:
      'image product qty'
      'order order client'
      'custom custom custom';
    grid-template-columns: 92px minmax(0, 1fr) 38px;
  }

  .order-detail-image-wrap {
    align-self: start;
    flex: none;
    grid-area: image;
    min-width: 0;
  }

  .order-detail-image {
    height: 92px !important;
    max-width: 92px !important;
    width: 92px;
  }

  .order-detail-body {
    display: contents;
    min-width: 0;
  }

  .order-detail-qty {
    grid-area: qty;
    height: 34px !important;
    min-width: 34px !important;
    width: 34px !important;
  }

  .order-detail-qty ::v-deep .v-btn__content {
    font-size: 18px;
  }

  .order-detail-main {
    display: contents;
  }

  .order-detail-product {
    grid-area: product;
  }

  .order-detail-product-name {
    font-size: 16px;
  }

  .order-detail-product-price,
  .order-detail-meta-value {
    font-size: 15px;
  }

  .order-detail-meta {
    display: contents;
  }

  .order-detail-meta-block:first-child {
    grid-area: order;
    text-align: left;
  }

  .order-detail-meta-block:last-child {
    align-self: end;
    grid-area: client;
    text-align: right;
  }

  .order-detail-customizations {
    grid-area: custom;
  }

  .order-detail-meta-label {
    font-size: 11px;
  }
}

@media (max-width: 380px) {
  .order-detail-content {
    grid-template-columns: 78px minmax(0, 1fr) 34px;
  }

  .order-detail-image {
    height: 78px !important;
    max-width: 78px !important;
    width: 78px;
  }
}
</style>
