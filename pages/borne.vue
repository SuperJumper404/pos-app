<template>
  <v-container fluid class="kiosk-page pa-0">
    <div class="kiosk-shell">
      <header class="kiosk-header">
        <div>
          <div class="kiosk-eyebrow">Commande borne</div>
          <h1>{{ shopName || 'Menu' }}</h1>
        </div>
        <v-btn
          icon
          large
          aria-label="Deconnexion"
          :disabled="Boolean(checkoutLoading)"
          @click="logout"
        >
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </header>

      <main class="kiosk-main">
        <section class="kiosk-menu">
          <div class="kiosk-category-bar">
            <v-btn
              v-for="category in categories"
              :key="category"
              depressed
              class="kiosk-category-button text-none"
              :color="category === activeCategory ? 'primary' : 'grey lighten-3'"
              :dark="category === activeCategory"
              :disabled="checkoutInteractionLocked"
              @click="activeCategory = category"
            >
              {{ category }}
            </v-btn>
          </div>

          <div class="kiosk-products">
            <v-card
              v-for="product in activeProducts"
              :key="product.id"
              outlined
              hover
              class="kiosk-product-card"
              :disabled="checkoutInteractionLocked || isKitchenClosed"
              @click="openProduct(product)"
            >
              <v-img :src="productImageSrc(product.image)" aspect-ratio="1.2" />
              <v-card-title>{{ product.name }}</v-card-title>
              <v-card-text>{{ formatCurrency(product.price) }}</v-card-text>
            </v-card>
          </div>
        </section>

        <aside class="kiosk-cart">
          <section v-if="confirmation" class="kiosk-confirmation">
            <div class="kiosk-confirmation-label">Votre numero de commande</div>
            <strong>{{ confirmation.orderNumber }}</strong>
            <p>{{ confirmation.printStatus }}</p>
            <v-btn color="primary" x-large class="text-none" @click="resetKiosk">
              Nouvelle commande
            </v-btn>
          </section>
          <template v-else>
            <h2>Votre commande</h2>
            <div v-if="cartItems.length === 0" class="kiosk-empty">
              Votre panier est vide
            </div>
            <div v-else class="kiosk-cart-lines">
              <div
                v-for="(item, index) in cartItems"
                :key="item.configurationSignature || `${item.id}-${index}`"
                class="kiosk-cart-line"
              >
                <strong>{{ item.name }}</strong>
                <span>{{ item.qty }} x {{ formatCurrency(item.price) }}</span>
                <div class="kiosk-cart-actions">
                  <v-btn
                    icon
                    color="warning"
                    :disabled="checkoutInteractionLocked"
                    @click="changeQuantity(index, -1)"
                  >
                    <v-icon>mdi-minus</v-icon>
                  </v-btn>
                  <strong>{{ item.qty }}</strong>
                  <v-btn
                    icon
                    color="success"
                    :disabled="checkoutInteractionLocked"
                    @click="changeQuantity(index, 1)"
                  >
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </div>
              </div>
            </div>

            <v-text-field
              v-model.trim="customer"
              label="Votre nom"
              :disabled="checkoutInteractionLocked"
            />
            <v-text-field
              v-model.trim="phone"
              label="Votre numero"
              type="tel"
              :disabled="checkoutInteractionLocked"
            />
            <v-btn-toggle v-model="saleMode" mandatory class="kiosk-sale-mode">
              <v-btn
                value="dine_in"
                class="text-none"
                :disabled="checkoutInteractionLocked"
              >
                Sur place
              </v-btn>
              <v-btn
                value="takeaway"
                class="text-none"
                :disabled="checkoutInteractionLocked"
              >
                A emporter
              </v-btn>
            </v-btn-toggle>
            <div class="kiosk-total">
              <strong>Total</strong>
              <strong>{{ formatCurrency(total) }}</strong>
            </div>
            <v-alert v-if="servicePointError" type="error" dense>
              {{ servicePointError }}
            </v-alert>
            <v-alert v-if="isKitchenClosed" type="warning" dense>
              La cuisine est fermée. Aucune nouvelle commande n'est possible.
            </v-alert>
            <v-alert
              v-if="checkoutErrorMessage"
              :type="checkoutAlertType"
              dense
            >
              {{ checkoutErrorMessage }}
            </v-alert>
            <div v-if="!stripePaymentReady" class="kiosk-payment-actions">
              <v-btn
                v-if="showCounterPayment"
                color="primary"
                block
                x-large
                class="text-none"
                :disabled="checkoutDisabled || Boolean(checkoutLoading)"
                :loading="checkoutLoading === 'counter'"
                @click="submitPayAtCounter"
              >
                Payer au comptoir
              </v-btn>
              <v-btn
                v-if="showStripePayment"
                color="success"
                block
                x-large
                class="text-none"
                :disabled="checkoutDisabled || Boolean(checkoutLoading)"
                :loading="checkoutLoading === 'stripe'"
                @click="submitStripe"
              >
                Payer par carte
              </v-btn>
            </div>
            <v-btn
              v-if="hasPreparedStripeAttempt && !stripePaymentReady"
              text
              block
              class="text-none mt-2"
              :disabled="Boolean(checkoutLoading)"
              @click="cancelStripePayment"
            >
              <v-icon left>mdi-close</v-icon>
              Annuler la tentative de paiement
            </v-btn>
            <div
              v-show="stripePaymentReady && !confirmation"
              class="kiosk-stripe-panel"
            >
              <div ref="stripePaymentElement"></div>
              <v-btn
                color="success"
                block
                x-large
                class="text-none mt-4"
                :disabled="checkoutLoading === 'stripe-confirm'"
                :loading="checkoutLoading === 'stripe-confirm'"
                @click="confirmStripePayment"
              >
                Confirmer le paiement
              </v-btn>
              <v-btn
                text
                block
                class="text-none mt-2"
                :disabled="Boolean(checkoutLoading)"
                @click="cancelStripePayment"
              >
                <v-icon left>mdi-close</v-icon>
                Annuler le paiement
              </v-btn>
            </div>
          </template>
        </aside>
      </main>

      <v-dialog v-model="customizationDialog" max-width="920" persistent>
        <div v-if="selectedProduct">
          <ProductCustomizationWizard
            v-model="selectedChoices"
            :product="selectedProduct"
            @confirm="confirmCustomization"
            @cancel="closeCustomization"
          />
        </div>
      </v-dialog>
    </div>
  </v-container>
</template>

<script>
import { loadStripe } from '@stripe/stripe-js'
import price from '@/helpers/price'
import ProductCustomizationWizard from '@/components/products/ProductCustomizationWizard'
import { applyServerQuoteToCart } from '@/helpers/customizations'
import {
  buildCashierReceiptPayload,
  sendCashierReceipt,
} from '@/helpers/cashierReceipt'

const {
  buildKioskCartLine,
  buildKioskCheckoutPayload,
  getKioskPaymentAvailability,
  getKioskOrderReference,
  getKioskStripeReturnOutcome,
  isKioskProductAvailable,
} = require('@/helpers/kioskCheckout')

export default {
  components: {
    ProductCustomizationWizard,
  },
  mixins: [price],
  async beforeRouteLeave(to, from, next) {
    if (this.checkoutFinalized) {
      next()
      return
    }
    next((await this.abandonPreparedCheckout()) === true)
  },
  middleware: 'auth',
  data() {
    return {
      activeCategory: '',
      customer: '',
      phone: '',
      saleMode: 'dine_in',
      cartItems: [],
      customizationDialog: false,
      selectedProduct: null,
      selectedChoices: [],
      checkoutErrorMessage: '',
      checkoutAlertType: 'error',
      checkoutLoading: null,
      checkoutFinalized: false,
      repriceConfirmation: false,
      confirmation: null,
      stripe: null,
      stripeElements: null,
      stripePaymentReady: false,
      stripePaymentOrderId: null,
      stripePaymentReference: null,
      stripePaymentElementInstance: null,
    }
  },
  computed: {
    currentUser() {
      return this.$store.get('users/user') || {}
    },
    servicePointId() {
      return Number(this.currentUser.service_point_id) || null
    },
    servicePointError() {
      return this.servicePointId
        ? ''
        : "Configuration borne incomplète : aucun point de service n'est attribué à cette session. Mettez à jour l'API puis reconnectez-vous."
    },
    shopName() {
      return this.$store.get('shop/shop_name')
    },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_siret: this.$store.get('shop/shop_siret'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
        activate_tva: this.$store.get('shop/activate_tva'),
      }
    },
    products() {
      return (this.$store.get('products/dataProduct') || []).filter(
        isKioskProductAvailable
      )
    },
    categories() {
      const names = this.products.map((product) => product.category).filter(Boolean)
      return [...new Set(names)]
    },
    activeProducts() {
      return this.products.filter((product) => product.category === this.activeCategory)
    },
    isKitchenClosed() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/kitchen_closed')
      )
    },
    qrPaymentMode() {
      return this.$store.get('shop/qr_payment_mode') || 'stripe_before_order'
    },
    paymentAvailability() {
      return getKioskPaymentAvailability(this.qrPaymentMode)
    },
    showCounterPayment() {
      return this.paymentAvailability.counter
    },
    showStripePayment() {
      return this.paymentAvailability.stripe
    },
    hasPreparedStripeAttempt() {
      return Boolean(
        this.stripePaymentOrderId ||
          this.$store.get('cart/clientOrderOrderId')
      )
    },
    checkoutInteractionLocked() {
      return this.hasPreparedStripeAttempt || this.repriceConfirmation
    },
    checkoutDisabled() {
      return (
        this.cartItems.length === 0 ||
        !String(this.customer || '').trim() ||
        !String(this.phone || '').trim() ||
        !this.servicePointId ||
        this.isKitchenClosed ||
        this.hasPreparedStripeAttempt
      )
    },
    total() {
      return this.cartItems.reduce(
        (sum, item) => sum + this.parsePrice(item.price) * Number(item.qty || 0),
        0
      )
    },
  },
  async mounted() {
    await Promise.all([
      this.$store.dispatch('products/getProducts'),
      this.$store.dispatch('categories/getAllCategories'),
      this.$store.dispatch('shop/getShopInfo'),
    ])
    this.activeCategory = this.categories[0] || ''
    await this.restoreStripeReturn()
  },
  beforeDestroy() {
    this.resetStripePaymentState()
  },
  methods: {
    productImageSrc(image) {
      const staticURL = this.$store.get('staticURL').replace(/\/+$/, '')
      return `${staticURL}/api/v1/imgproducts/${image}`
    },
    openProduct(product) {
      if (
        this.checkoutInteractionLocked ||
        this.isKitchenClosed ||
        !isKioskProductAvailable(product)
      ) {
        return
      }
      if ((product.customization_steps || []).length > 0) {
        this.selectedProduct = product
        this.selectedChoices = []
        this.customizationDialog = true
        return
      }
      this.addToCart(buildKioskCartLine(product))
    },
    confirmCustomization(customization) {
      if (!this.selectedProduct || this.checkoutInteractionLocked) return
      this.addToCart(buildKioskCartLine(this.selectedProduct, customization))
      this.closeCustomization()
    },
    closeCustomization() {
      this.customizationDialog = false
      this.selectedProduct = null
      this.selectedChoices = []
    },
    changeQuantity(index, delta) {
      if (this.checkoutInteractionLocked) return
      const item = this.cartItems[index]
      if (!item) return
      const nextQty = Number(item.qty || 0) + delta
      if (nextQty <= 0) {
        this.cartItems.splice(index, 1)
        return
      }
      item.qty = nextQty
      item.subtotal = this.roundPrice(this.parsePrice(item.price) * nextQty)
    },
    addToCart(line) {
      const existing = this.cartItems.find(
        (item) =>
          item.id === line.id &&
          item.configurationSignature === line.configurationSignature
      )
      if (existing) {
        existing.qty += 1
        existing.subtotal = this.roundPrice(
          this.parsePrice(existing.price) * existing.qty
        )
        return
      }
      this.cartItems.push({ ...line })
    },
    buildPayload(payment, stripe) {
      return buildKioskCheckoutPayload({
        customer: this.customer,
        phone: this.phone,
        servicePointId: this.servicePointId,
        total: this.total,
        payment,
        isTakeaway: this.saleMode === 'takeaway',
        dataCart: this.cartItems,
        stripe,
        repriceConfirmation: this.repriceConfirmation,
        source: 'borne',
      })
    },
    async submitPayAtCounter() {
      if (this.checkoutDisabled || this.checkoutLoading) return
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutLoading = 'counter'
      try {
        const result = await this.$store.dispatch(
          'cart/checkoutCounterPayBefore',
          this.buildPayload('Paiement au comptoir', false)
        )
        if (!result || !result.ok) {
          this.handleCheckoutFailure(
            result?.error,
            'Impossible d envoyer la commande.'
          )
          return
        }
        this.repriceConfirmation = false
        this.checkoutFinalized = true
        await this.finishCheckout(result, 'Paiement au comptoir')
      } catch (error) {
        this.checkoutErrorMessage = error.message
      } finally {
        this.checkoutLoading = null
      }
    },
    async submitStripe() {
      if (this.checkoutDisabled || this.checkoutLoading) return
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutLoading = 'stripe'
      try {
        const result = await this.$store.dispatch(
          'cart/checkoutOrder',
          this.buildPayload('Stripe', true)
        )
        if (!result || !result.ok) {
          this.handleCheckoutFailure(
            result?.error,
            'Impossible de préparer le paiement.'
          )
          return
        }
        this.repriceConfirmation = false
        await this.mountStripePayment(result.data)
      } catch (error) {
        this.checkoutErrorMessage = error.message
        await this.abandonPreparedCheckout({ preserveMessage: true })
      } finally {
        this.checkoutLoading = null
      }
    },
    handleCheckoutFailure(error, fallbackMessage) {
      if (error?.code === 'ORDER_REPRICE_REQUIRED' && error.server_quote) {
        this.cartItems = applyServerQuoteToCart(
          this.cartItems,
          error.server_quote
        )
        this.repriceConfirmation = true
        this.checkoutAlertType = 'warning'
        this.checkoutErrorMessage =
          'Les prix ont été mis à jour. Vérifiez le nouveau total puis relancez le paiement.'
        return
      }

      this.checkoutAlertType = 'error'
      this.checkoutErrorMessage = error?.message || fallbackMessage
    },
    async mountStripePayment(payment) {
      this.stripePaymentReference = getKioskOrderReference({ data: payment })
      this.stripePaymentOrderId = this.stripePaymentReference.orderId
      if (!payment || !payment.clientSecret || !payment.publishableKey) {
        throw new Error('Donnees Stripe incompletes.')
      }
      this.stripe = await loadStripe(payment.publishableKey)
      if (!this.stripe) throw new Error('Stripe est indisponible.')
      this.stripeElements = this.stripe.elements({
        clientSecret: payment.clientSecret,
      })
      await this.$nextTick()
      const paymentElement = this.stripeElements.create('payment')
      paymentElement.mount(this.$refs.stripePaymentElement)
      this.stripePaymentElementInstance = paymentElement
      this.stripePaymentReady = true
    },
    async confirmStripePayment() {
      if (!this.stripe || !this.stripeElements) return
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutLoading = 'stripe-confirm'
      try {
        const result = await this.stripe.confirmPayment({
          elements: this.stripeElements,
          redirect: 'if_required',
          confirmParams: {
            return_url: `${window.location.origin}/borne`,
          },
        })
        if (result.error) {
          this.checkoutErrorMessage =
            result.error.message || 'Le paiement a échoué.'
          return
        }
        if (result.paymentIntent?.status !== 'succeeded') {
          this.checkoutAlertType = 'info'
          this.checkoutErrorMessage =
            'Paiement en cours de vérification. Ne relancez pas la commande.'
          return
        }
        await this.$store.dispatch('cart/completeCheckout')
        this.checkoutFinalized = true
        await this.finishCheckout(
          { ok: true, data: this.stripePaymentReference },
          'Stripe'
        )
      } catch (error) {
        this.checkoutErrorMessage =
          error.message || 'Le paiement a échoué.'
      } finally {
        this.checkoutLoading = null
      }
    },
    async finishCheckout(result, paymentMethod = 'Paiement au comptoir') {
      const initialReference = getKioskOrderReference(result)
      const authoritativeOrder = await this.fetchKioskOrder(
        initialReference.orderId
      )
      const resolvedReference = authoritativeOrder
        ? getKioskOrderReference(authoritativeOrder)
        : initialReference
      const reference = {
        ...resolvedReference,
        orderNumber: String(
          authoritativeOrder?.ordernumber ||
            authoritativeOrder?.orderNumber ||
            resolvedReference.orderNumber
        ),
      }
      this.confirmation = {
        ...reference,
        printStatus: 'Ticket en cours d impression.',
      }
      const printed = await this.printKioskReceipt(reference.orderId, paymentMethod)
      this.confirmation.printStatus = printed
        ? 'Ticket imprime.'
        : 'Ticket indisponible.'
      await this.$store.dispatch('cart/setTotal', 0)
      await this.$store.dispatch('cart/setIndex', 0)
      await this.$store.dispatch('cart/setTocart', null)
    },
    async fetchKioskOrder(orderId) {
      if (!orderId) return null
      try {
        await this.$store.dispatch('orders/getAllOrder')
        const orders = this.$store.get('orders/dataOrders') || []
        return (
          orders.find((order) => String(order.id) === String(orderId)) || null
        )
      } catch (error) {
        return null
      }
    },
    restoreCheckoutPayload(payload) {
      if (!payload || typeof payload !== 'object') return
      this.customer = payload.customer || ''
      this.phone = payload.phone || ''
      this.saleMode = payload.is_takeaway === true ? 'takeaway' : 'dine_in'
      if (Array.isArray(payload.dataCart)) {
        this.cartItems = JSON.parse(JSON.stringify(payload.dataCart))
      }
    },
    async restoreStripeReturn() {
      const query = this.$route.query || {}
      const hasStripeReturn = Boolean(
        query.redirect_status ||
          query.payment_intent ||
          query.payment_intent_client_secret
      )
      if (!hasStripeReturn) return

      this.restoreCheckoutPayload(this.$store.get('cart/clientOrderPayload'))
      const orderId = this.$store.get('cart/clientOrderOrderId')
      if (!orderId) {
        this.checkoutAlertType = 'error'
        this.checkoutErrorMessage =
          'Retour de paiement détecté, mais la référence de commande est introuvable. Contactez le comptoir.'
        return
      }

      this.checkoutAlertType = 'info'
      this.checkoutErrorMessage = 'Vérification du paiement en cours.'
      const order = await this.fetchKioskOrder(orderId)
      if (!order) {
        this.checkoutErrorMessage =
          'Le paiement ne peut pas encore être vérifié. Ne relancez pas la commande et contactez le comptoir.'
        return
      }

      const outcome = getKioskStripeReturnOutcome(order)
      if (outcome === 'paid') {
        await this.$store.dispatch('cart/completeCheckout')
        this.checkoutFinalized = true
        await this.finishCheckout({ data: order }, 'Stripe')
        return
      }
      if (outcome === 'failed') {
        await this.$store.dispatch('cart/abandonCheckout', { safe: true })
        this.resetStripePaymentState()
        this.checkoutAlertType = 'error'
        this.checkoutErrorMessage =
          'Le paiement a échoué ou a été annulé. Vous pouvez recommencer.'
        return
      }

      this.checkoutErrorMessage =
        'Paiement en cours de vérification. Ne relancez pas la commande.'
    },
    async printKioskReceipt(orderId, paymentMethod) {
      if (!orderId) return false
      try {
        await Promise.all([
          this.$store.dispatch('orders/getAllOrder'),
          this.$store.dispatch('orders/getDetailOrder', orderId),
        ])
        const orders = this.$store.get('orders/dataOrders') || []
        const order = orders.find((item) => String(item.id) === String(orderId))
        if (!order) return false
        const payload = buildCashierReceiptPayload({
          order: {
            ...order,
            source: 'borne',
            order_source: 'borne',
          },
          details: this.$store.get('orders/detailOrder') || [],
          shopInfo: this.shopInfo,
          fallbackPaymentMethod: paymentMethod,
          fallbackCustomer: this.customer || 'Client borne',
          fallbackTable: 'Borne',
          fallbackRemark: '',
        })
        return sendCashierReceipt({
          payload,
          smartPrint: this.shopInfo.smart_print_app,
          printerIp: this.shopInfo.shop_printer_ip,
          dispatch: this.$store.dispatch,
        })
      } catch (error) {
        return false
      }
    },
    resetStripePaymentState() {
      if (this.stripePaymentElementInstance) {
        try {
          this.stripePaymentElementInstance.unmount()
        } catch (error) {
          // The element may already be detached after a route change.
        }
      }
      this.stripePaymentElementInstance = null
      this.stripe = null
      this.stripeElements = null
      this.stripePaymentReady = false
      this.stripePaymentOrderId = null
      this.stripePaymentReference = null
    },
    async abandonPreparedCheckout({ preserveMessage = false } = {}) {
      const orderId =
        this.stripePaymentOrderId ||
        this.$store.get('cart/clientOrderOrderId') ||
        null
      if (orderId) {
        const canceled = await this.$store.dispatch(
          'cart/cancelStripeCheckout',
          orderId
        )
        if (!canceled || !canceled.ok) {
          this.checkoutAlertType = 'error'
          this.checkoutErrorMessage =
            canceled?.error?.message ||
            "Impossible d'annuler le paiement préparé. Réessayez avant de quitter."
          return false
        }
      }

      const abandoned = await this.$store.dispatch(
        'cart/abandonCheckout',
        orderId ? { safe: true } : undefined
      )
      if (!abandoned || !abandoned.ok) {
        this.checkoutAlertType = 'error'
        this.checkoutErrorMessage =
          abandoned?.error?.message ||
          'La tentative de commande doit être résolue avant de quitter.'
        return false
      }

      this.resetStripePaymentState()
      this.repriceConfirmation = false
      if (!preserveMessage) this.checkoutErrorMessage = ''
      return true
    },
    async cancelStripePayment() {
      if (this.checkoutLoading) return
      await this.abandonPreparedCheckout()
    },
    async resetKiosk() {
      await this.$store.dispatch('cart/abandonCheckout', { safe: true })
      this.cartItems = []
      this.customer = ''
      this.phone = ''
      this.saleMode = 'dine_in'
      this.confirmation = null
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutFinalized = false
      this.repriceConfirmation = false
      this.resetStripePaymentState()
    },
    async logout() {
      if (this.checkoutLoading) return
      if (!(await this.abandonPreparedCheckout())) return
      const result = await this.$store.dispatch('users/postLogout')
      if (result) await this.$router.push('/login')
    },
  },
}
</script>

<style scoped>
.kiosk-page {
  min-height: 100vh;
  background: #f4f6f8;
}

.kiosk-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.kiosk-header {
  min-height: 84px;
  padding: 18px 28px;
  background: #ffffff;
  border-bottom: 1px solid #dfe5ee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kiosk-header h1 {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 0;
}

.kiosk-eyebrow {
  color: #1976d2;
  font-weight: 800;
  text-transform: uppercase;
}

.kiosk-main {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
}

.kiosk-menu,
.kiosk-cart {
  min-height: 0;
  overflow: auto;
}

.kiosk-menu {
  padding: 18px;
}

.kiosk-category-bar {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kiosk-category-button {
  min-height: 56px !important;
  border-radius: 8px !important;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
}

.kiosk-products {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

.kiosk-product-card {
  min-height: 260px;
}

.kiosk-cart {
  padding: 18px;
  background: #ffffff;
  border-left: 1px solid #dfe5ee;
}

.kiosk-cart h2 {
  font-size: 1.35rem;
  letter-spacing: 0;
}

.kiosk-cart-line {
  min-height: 58px;
  border-bottom: 1px solid #edf0f4;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kiosk-cart-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.kiosk-sale-mode {
  width: 100%;
  margin-bottom: 16px;
}

.kiosk-payment-actions {
  display: grid;
  gap: 12px;
}

.kiosk-stripe-panel {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
}

.kiosk-confirmation {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.kiosk-confirmation-label {
  font-size: 1.15rem;
}

.kiosk-confirmation strong {
  margin: 12px 0;
  font-size: 3rem;
}

@media (max-width: 960px) {
  .kiosk-main {
    grid-template-columns: 1fr;
  }

  .kiosk-cart {
    border-left: 0;
    border-top: 1px solid #dfe5ee;
  }
}
</style>
