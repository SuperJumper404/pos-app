<template>
  <v-container fluid class="kiosk-page pa-0">
    <div class="kiosk-shell">
      <header class="kiosk-header">
        <div>
          <div class="kiosk-eyebrow">Commande borne</div>
          <h1>{{ shopName || 'Menu' }}</h1>
        </div>
        <v-btn icon large aria-label="Deconnexion" @click="logout">
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
                  <v-btn icon color="warning" @click="changeQuantity(index, -1)">
                    <v-icon>mdi-minus</v-icon>
                  </v-btn>
                  <strong>{{ item.qty }}</strong>
                  <v-btn icon color="success" @click="changeQuantity(index, 1)">
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </div>
              </div>
            </div>

            <v-text-field v-model.trim="customer" label="Votre nom" />
            <v-text-field v-model.trim="phone" label="Votre numero" type="tel" />
            <v-btn-toggle v-model="saleMode" mandatory class="kiosk-sale-mode">
              <v-btn value="dine_in" class="text-none">Sur place</v-btn>
              <v-btn value="takeaway" class="text-none">A emporter</v-btn>
            </v-btn-toggle>
            <v-alert v-if="checkoutErrorMessage" type="error" dense>
              {{ checkoutErrorMessage }}
            </v-alert>
            <div v-if="!stripePaymentReady" class="kiosk-payment-actions">
              <v-btn
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
import {
  buildCashierReceiptPayload,
  sendCashierReceipt,
} from '@/helpers/cashierReceipt'

const {
  buildKioskCheckoutPayload,
  getKioskOrderReference,
} = require('@/helpers/kioskCheckout')

export default {
  components: {
    ProductCustomizationWizard,
  },
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      activeCategory: '',
      customer: '',
      phone: '',
      saleMode: 'dine_in',
      servicePointId: parseInt(localStorage.getItem('service_point_id')) || null,
      cartItems: [],
      customizationDialog: false,
      selectedProduct: null,
      selectedChoices: [],
      checkoutErrorMessage: '',
      checkoutLoading: null,
      confirmation: null,
      stripe: null,
      stripeElements: null,
      stripePaymentReady: false,
      stripePaymentOrderId: null,
      stripePaymentReference: null,
    }
  },
  computed: {
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
      return this.$store.get('products/dataProduct') || []
    },
    categories() {
      const names = this.products.map((product) => product.category).filter(Boolean)
      return [...new Set(names)]
    },
    activeProducts() {
      return this.products.filter((product) => product.category === this.activeCategory)
    },
    checkoutDisabled() {
      return (
        this.cartItems.length === 0 ||
        !String(this.customer || '').trim() ||
        !String(this.phone || '').trim() ||
        !this.servicePointId
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
  },
  methods: {
    productImageSrc(image) {
      const staticURL = this.$store.get('staticURL').replace(/\/+$/, '')
      return `${staticURL}/api/v1/imgproducts/${image}`
    },
    openProduct(product) {
      if ((product.customization_steps || []).length > 0) {
        this.selectedProduct = product
        this.selectedChoices = []
        this.customizationDialog = true
        return
      }
      this.addToCart(product)
    },
    confirmCustomization() {
      this.addToCart({
        ...this.selectedProduct,
        selectedChoiceIds: [...this.selectedChoices],
        configurationSignature: `${this.selectedProduct.id}:${this.selectedChoices.join(',')}`,
      })
      this.closeCustomization()
    },
    closeCustomization() {
      this.customizationDialog = false
      this.selectedProduct = null
      this.selectedChoices = []
    },
    changeQuantity(index, delta) {
      const item = this.cartItems[index]
      if (!item) return
      const nextQty = Number(item.qty || 0) + delta
      if (nextQty <= 0) {
        this.cartItems.splice(index, 1)
        return
      }
      item.qty = nextQty
    },
    addToCart(product) {
      const existing = this.cartItems.find(
        (item) =>
          item.id === product.id &&
          item.configurationSignature === product.configurationSignature
      )
      if (existing) {
        existing.qty += 1
        return
      }
      this.cartItems.push({ ...product, qty: 1 })
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
        source: 'borne',
      })
    },
    async submitPayAtCounter() {
      if (this.checkoutDisabled || this.checkoutLoading) return
      this.checkoutErrorMessage = ''
      this.checkoutLoading = 'counter'
      try {
        const result = await this.$store.dispatch(
          'cart/checkoutCounterPayBefore',
          this.buildPayload('Paiement au comptoir', false)
        )
        if (!result || !result.ok) {
          this.checkoutErrorMessage =
            result?.error?.message || 'Impossible d envoyer la commande.'
          return
        }
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
      this.checkoutLoading = 'stripe'
      try {
        const result = await this.$store.dispatch(
          'cart/checkoutOrder',
          this.buildPayload('Stripe', true)
        )
        if (!result || !result.ok) {
          this.checkoutErrorMessage =
            result?.error?.message || 'Impossible de préparer le paiement.'
          return
        }
        await this.mountStripePayment(result.data)
      } catch (error) {
        this.checkoutErrorMessage = error.message
      } finally {
        this.checkoutLoading = null
      }
    },
    async mountStripePayment(payment) {
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
      this.stripePaymentReady = true
      this.stripePaymentReference = getKioskOrderReference({ data: payment })
      this.stripePaymentOrderId = this.stripePaymentReference.orderId
    },
    async confirmStripePayment() {
      if (!this.stripe || !this.stripeElements) return
      this.checkoutErrorMessage = ''
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
        await this.$store.dispatch('cart/completeCheckout')
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
      const reference = getKioskOrderReference(result)
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
    resetKiosk() {
      this.cartItems = []
      this.customer = ''
      this.phone = ''
      this.saleMode = 'dine_in'
      this.confirmation = null
      this.checkoutErrorMessage = ''
      this.stripe = null
      this.stripeElements = null
      this.stripePaymentReady = false
      this.stripePaymentOrderId = null
      this.stripePaymentReference = null
    },
    logout() {
      const result = this.$store.dispatch('users/postLogout')
      if (result) this.$router.push('/login')
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
