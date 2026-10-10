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
          class="kiosk-exit-button"
          aria-label="Quitter le mode borne"
          :disabled="Boolean(checkoutLoading)"
          @click="openExitDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </header>

      <main v-if="kioskStep === 'welcome'" class="kiosk-welcome">
        <div
          v-if="welcomeProductImages.length"
          class="kiosk-welcome-mosaic"
          :class="`kiosk-welcome-mosaic--${welcomeAnimationMode}`"
          aria-hidden="true"
        >
          <template v-if="welcomeAnimationMode === 'mixedHorizontal'">
            <div
              v-for="row in welcomeMixedHorizontalRows"
              :key="row.key"
              class="kiosk-welcome-mosaic-row"
              :class="row.className"
            >
              <div
                v-for="(image, index) in row.images"
                :key="`${row.key}-${image}-${index}`"
                class="kiosk-welcome-mosaic-tile"
              >
                <v-img :src="productImageSrc(image)" aspect-ratio="1" />
              </div>
            </div>
          </template>
          <template v-else-if="welcomeAnimationMode === 'diagonal'">
            <div
              v-for="column in welcomeDiagonalColumns"
              :key="column.key"
              class="kiosk-welcome-mosaic-column"
              :class="column.className"
            >
              <div
                v-for="(image, index) in column.images"
                :key="`${column.key}-${image}-${index}`"
                class="kiosk-welcome-mosaic-tile"
              >
                <v-img :src="productImageSrc(image)" aspect-ratio="1" />
              </div>
            </div>
          </template>
          <template v-else-if="welcomeAnimationMode === 'horizontal'">
            <div
              v-for="row in welcomeHorizontalRows"
              :key="row.key"
              class="kiosk-welcome-mosaic-row"
              :class="row.className"
            >
              <div
                v-for="(image, index) in row.images"
                :key="`${row.key}-${image}-${index}`"
                class="kiosk-welcome-mosaic-tile"
              >
                <v-img :src="productImageSrc(image)" aspect-ratio="1" />
              </div>
            </div>
          </template>
        </div>
        <div class="kiosk-welcome-content">
          <v-btn
            color="primary"
            x-large
            class="kiosk-start-button text-none"
            :disabled="isKitchenClosed"
            @click="startNewOrder"
          >
            Nouvelle commande
          </v-btn>
          <v-alert v-if="isKitchenClosed" type="warning" dense>
            La cuisine est fermée. Aucune nouvelle commande n'est possible.
          </v-alert>
        </div>
      </main>

      <main v-else class="kiosk-main">
        <aside class="kiosk-side-categories">
          <div class="kiosk-category-stack">
            <v-btn
              v-for="category in categoryTiles"
              :key="category.name"
              depressed
              class="kiosk-category-button text-none"
              :class="{
                'kiosk-category-button--active':
                  category.name === activeCategory,
              }"
              :disabled="checkoutInteractionLocked"
              @click="activeCategory = category.name"
            >
              <v-img
                v-if="category.image"
                class="kiosk-category-image"
                :src="categoryImageSrc(category.image)"
                aspect-ratio="1"
              />
              <v-icon v-else class="kiosk-category-fallback-icon">
                mdi-shape
              </v-icon>
              <span>{{ category.name }}</span>
            </v-btn>
          </div>
        </aside>

        <section class="kiosk-menu">
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

        <section class="kiosk-bottom-cart">
          <section v-if="confirmation" class="kiosk-confirmation">
            <div class="kiosk-confirmation-label">Votre numero de commande</div>
            <strong>{{ confirmation.orderNumber }}</strong>
            <p>{{ confirmation.printStatus }}</p>
            <v-btn color="primary" x-large class="text-none" @click="resetKiosk">
              Nouvelle commande
            </v-btn>
          </section>
          <template v-else>
            <div class="kiosk-cart-head">
              <div>
                <h2>Votre commande</h2>
                <span class="kiosk-cart-count">
                  {{ cartItemCount }} article{{ cartItemCount > 1 ? 's' : '' }}
                </span>
              </div>
              <strong>{{ formatCurrency(total) }}</strong>
            </div>
            <div v-if="cartItems.length === 0" class="kiosk-empty">
              Votre panier est vide
            </div>
            <div v-else class="kiosk-cart-lines">
              <v-card
                v-for="(item, index) in cartItems"
                :key="item.configurationSignature || `${item.id}-${index}`"
                outlined
                class="kiosk-cart-item-card"
              >
                <v-img
                  class="kiosk-cart-item-image"
                  :src="productImageSrc(item.image)"
                  aspect-ratio="1"
                />
                <div class="kiosk-cart-item-main">
                  <strong>{{ item.name }}</strong>
                  <span class="kiosk-cart-item-meta">
                    {{ item.qty }} x {{ formatCurrency(item.price) }}
                  </span>
                  <div
                    v-if="item.customizationList && item.customizationList.length"
                    class="kiosk-cart-item-choices"
                  >
                    <span
                      v-for="choice in item.customizationList"
                      :key="choice.product_step_choice_id || choice.name"
                    >
                      {{ choice.name }}
                    </span>
                  </div>
                </div>
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
                <strong class="kiosk-cart-item-subtotal">
                  {{ formatCurrency(parsePrice(item.price) * Number(item.qty || 0)) }}
                </strong>
              </v-card>
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
            <v-alert
              v-if="showStripePayment && !terminalCardAvailable"
              type="warning"
              dense
            >
              TPE indisponible : aucun TPE Stripe actif n'est affecté à cette borne.
            </v-alert>
            <div
              v-if="kioskStep === 'payment' && !terminalPaymentInProgress"
              class="kiosk-payment-actions"
            >
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
                :disabled="checkoutDisabled || !terminalCardAvailable || Boolean(checkoutLoading)"
                :loading="checkoutLoading === 'terminal'"
                @click="submitTerminalPayment"
              >
                Payer par carte
              </v-btn>
            </div>
            <div v-else class="kiosk-cart-footer">
              <v-btn
                outlined
                x-large
                class="text-none"
                :disabled="Boolean(checkoutLoading)"
                @click="cancelOrder"
              >
                <v-icon left>mdi-delete-outline</v-icon>
                Annuler
              </v-btn>
              <v-btn
                color="primary"
                x-large
                class="text-none"
                :disabled="cartItems.length === 0 || checkoutInteractionLocked"
                @click="openCustomerNameStep"
              >
                <v-icon left>mdi-cart-check</v-icon>
                Commander
              </v-btn>
            </div>
            <v-btn
              v-if="terminalPaymentInProgress"
              text
              block
              class="text-none mt-2"
              :disabled="Boolean(checkoutLoading)"
              @click="cancelTerminalPayment"
            >
              <v-icon left>mdi-close</v-icon>
              Annuler la tentative de paiement
            </v-btn>
          </template>
        </section>
      </main>

      <v-dialog
        :value="kioskStep === 'mode'"
        persistent
        max-width="760"
        content-class="kiosk-mode-dialog"
      >
        <v-card class="kiosk-dialog-card">
          <v-card-title>Votre commande</v-card-title>
          <v-card-text class="kiosk-mode-actions">
            <v-btn
              color="primary"
              x-large
              class="text-none"
              @click="chooseSaleMode('dine_in')"
            >
              <v-icon left x-large>mdi-silverware-fork-knife</v-icon>
              Sur place
            </v-btn>
            <v-btn
              color="primary"
              x-large
              class="text-none"
              @click="chooseSaleMode('takeaway')"
            >
              <v-icon left x-large>mdi-shopping</v-icon>
              A emporter
            </v-btn>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog
        :value="kioskStep === 'name'"
        persistent
        max-width="860"
        content-class="kiosk-name-dialog"
      >
        <v-card class="kiosk-dialog-card">
          <v-card-title>Votre nom</v-card-title>
          <v-card-text>
            <div class="kiosk-keyboard-input-wrap">
              <v-text-field
                :value="customer"
                readonly
                outlined
                hide-details
                clearable
                clear-icon="mdi-close-circle"
                class="kiosk-keyboard-field"
                @click:clear="clearKeyboardValue"
              />
            </div>
            <div class="kiosk-keyboard">
              <div
                v-for="(row, rowIndex) in nameKeyboardRows"
                :key="`name-row-${rowIndex}`"
                class="kiosk-keyboard-row"
              >
                <v-btn
                  v-for="key in row"
                  :key="key.value || key.type"
                  x-large
                  class="text-none"
                  :class="keyboardKeyClass(key)"
                  @click="handleNameKeyboardKey(key)"
                >
                  <template v-if="key.type === 'shift'">
                    <v-icon left>mdi-arrow-up-bold</v-icon>
                    Maj
                  </template>
                  <template v-else-if="key.type === 'backspace'">
                    <v-icon left>mdi-backspace-outline</v-icon>
                    Effacer
                  </template>
                  <template v-else>
                    {{ displayNameKeyboardKey(key.value) }}
                  </template>
                </v-btn>
              </div>
              <div class="kiosk-keyboard-row kiosk-keyboard-control-row">
                <v-btn
                  x-large
                  class="text-none kiosk-space-key"
                  @click="appendKeyboardValue(' ')"
                >
                  <v-icon left>mdi-keyboard-space</v-icon>
                  Espace
                </v-btn>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text class="text-none" @click="kioskStep = 'menu'">
              Retour
            </v-btn>
            <v-btn
              color="primary"
              class="text-none"
              :disabled="!String(customer || '').trim()"
              @click="openCustomerPhoneStep"
            >
              Suivant
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog
        :value="kioskStep === 'phone'"
        persistent
        max-width="640"
        content-class="kiosk-phone-dialog"
      >
        <v-card class="kiosk-dialog-card">
          <v-card-title>Votre numero</v-card-title>
          <v-card-text>
            <div class="kiosk-keyboard-input-wrap">
              <v-text-field
                :value="phone"
                readonly
                outlined
                hide-details
                clearable
                clear-icon="mdi-close-circle"
                class="kiosk-keyboard-field"
                @click:clear="clearKeyboardValue"
              />
            </div>
            <div class="kiosk-keyboard kiosk-number-keyboard">
              <v-btn
                v-for="key in phoneKeyboardKeys"
                :key="key"
                x-large
                class="text-none"
                @click="appendKeyboardValue(key)"
              >
                {{ key }}
              </v-btn>
              <v-btn
                x-large
                class="text-none kiosk-backspace-key"
                @click="backspaceKeyboardValue"
              >
                <v-icon left>mdi-backspace-outline</v-icon>
                Effacer
              </v-btn>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text class="text-none" @click="openCustomerNameStep">
              Retour
            </v-btn>
            <v-btn
              color="primary"
              class="text-none"
              :disabled="!String(phone || '').trim()"
              @click="openPaymentStep"
            >
              Suivant
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

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

      <v-dialog
        :value="exitDialog"
        max-width="380"
        content-class="kiosk-exit-dialog"
        @input="handleExitDialogInput"
      >
        <v-card class="kiosk-exit-card">
          <v-card-title>
            <span>Confirmer la déconnexion</span>
            <v-spacer />
            <v-btn
              icon
              aria-label="Fermer"
              :disabled="exitLoading"
              @click="closeExitDialog"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-text-field
              :value="exitPin"
              label="Code PIN"
              type="password"
              inputmode="numeric"
              maxlength="4"
              outlined
              readonly
              hide-details
              class="kiosk-exit-pin"
            />
            <div class="kiosk-exit-keypad">
              <v-btn
                v-for="digit in exitKeypadDigits"
                :key="digit"
                depressed
                class="text-none"
                :disabled="exitLoading"
                @click="appendExitPin(digit)"
              >
                {{ digit }}
              </v-btn>
              <v-btn
                icon
                aria-label="Effacer le dernier chiffre"
                :disabled="exitLoading || !exitPin"
                @click="backspaceExitPin"
              >
                <v-icon>mdi-backspace-outline</v-icon>
              </v-btn>
              <v-btn
                depressed
                :disabled="exitLoading"
                @click="appendExitPin('0')"
              >
                0
              </v-btn>
              <span aria-hidden="true"></span>
            </div>
            <v-alert v-if="exitError" type="error" dense class="mt-4 mb-0">
              {{ exitError }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn
              text
              class="text-none"
              :disabled="exitLoading"
              @click="closeExitDialog"
            >
              Annuler
            </v-btn>
            <v-spacer />
            <v-btn
              color="primary"
              depressed
              class="text-none"
              :loading="exitLoading"
              :disabled="exitPin.length !== 4"
              @click="confirmKioskExit"
            >
              Se déconnecter
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script>
import price from '@/helpers/price'
import ProductCustomizationWizard from '@/components/products/ProductCustomizationWizard'
import { applyServerQuoteToCart } from '@/helpers/customizations'
import {
  buildOrderTicketPayload,
  sendOrderTicket,
} from '@/helpers/orderTicket'
import {
  buildCashierReceiptPayload,
} from '@/helpers/cashierReceipt'
import {
  buildCardTicketPayload,
} from '@/helpers/cardTicket'
import {
  sendReceiptBundle,
} from '@/helpers/receiptBundle'

const {
  buildKioskCartLine,
  buildKioskCheckoutPayload,
  getKioskPaymentAvailability,
  getKioskOrderReference,
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
      kioskStep: 'welcome',
      keyboardTarget: null,
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
      welcomeAnimationMode: 'mixedHorizontal',
      welcomeAnimationTimer: null,
      welcomeShuffleSeed: Date.now(),
      checkoutFinalized: false,
      repriceConfirmation: false,
      confirmation: null,
      kioskTerminalReader: null,
      kioskTerminalPayment: null,
      kioskTerminalPollingTimer: null,
      terminalClientOrderToken: null,
      keyboardUppercase: true,
      exitDialog: false,
      exitPin: '',
      exitError: '',
      exitLoading: false,
      exitDialogTimer: null,
      confirmationReturnTimer: null,
      exitKeypadDigits: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      nameKeyboardRows: [
        ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(
          (value) => ({ type: 'letter', value })
        ),
        ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'].map(
          (value) => ({ type: 'letter', value })
        ),
        [
          { type: 'shift' },
          ...['W', 'X', 'C', 'V', 'B', 'N'].map((value) => ({
            type: 'letter',
            value,
          })),
          { type: 'backspace' },
        ],
      ],
      phoneKeyboardKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
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
        service_point_printer_ip: this.currentUser.service_point_printer_ip || '',
        service_point_smart_print_app:
          this.currentUser.service_point_smart_print_app,
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
    categoryTiles() {
      const categories = new Map()
      this.products.forEach((product) => {
        const name = product.category
        if (!name || categories.has(name)) return
        categories.set(name, {
          name,
          image: product.category_image || product.categoryImage || '',
        })
      })
      return [...categories.values()]
    },
    welcomeProductImages() {
      return [...new Set(this.products.map((product) => product.image).filter(Boolean))]
    },
    welcomeShuffledProductImages() {
      const images = [...this.welcomeProductImages]
      let seed = this.welcomeShuffleSeed || 1
      for (let index = images.length - 1; index > 0; index--) {
        seed = (seed * 9301 + 49297) % 233280
        const swapIndex = seed % (index + 1)
        const image = images[index]
        images[index] = images[swapIndex]
        images[swapIndex] = image
      }
      return images
    },
    welcomeRepeatedProductImages() {
      const images = this.welcomeShuffledProductImages
      if (!images.length) return []
      const minimumLength = Math.max(48, images.length)
      const repeated = []
      while (repeated.length < minimumLength) {
        repeated.push(...images)
      }
      return repeated.slice(0, minimumLength)
    },
    welcomeDiagonalColumns() {
      const images = this.welcomeRepeatedProductImages
      const columnSize = Math.ceil(images.length / 3)
      return [0, 1, 2].map((columnIndex) => ({
        key: `diagonal-column-${columnIndex}`,
        className: `kiosk-welcome-mosaic-column--${columnIndex + 1}`,
        images: images.slice(
          columnIndex * columnSize,
          (columnIndex + 1) * columnSize
        ),
      }))
    },
    welcomeHorizontalRows() {
      const images = this.welcomeRepeatedProductImages
      const rowSize = Math.ceil(images.length / 4)
      return [0, 1, 2, 3].map((rowIndex) => ({
        key: `horizontal-row-${rowIndex}`,
        className: rowIndex < 2
          ? 'kiosk-welcome-mosaic-row--top'
          : 'kiosk-welcome-mosaic-row--bottom',
        images: images.slice(rowIndex * rowSize, (rowIndex + 1) * rowSize),
      }))
    },
    welcomeMixedHorizontalRows() {
      const images = this.welcomeRepeatedProductImages
      const rowSize = Math.ceil(images.length / 4)
      const classes = [
        'kiosk-welcome-mosaic-row--right',
        'kiosk-welcome-mosaic-row--left',
        'kiosk-welcome-mosaic-row--right',
        'kiosk-welcome-mosaic-row--left',
      ]
      return [0, 1, 2, 3].map((rowIndex) => ({
        key: `mixed-horizontal-row-${rowIndex}`,
        className: classes[rowIndex],
        images: images.slice(rowIndex * rowSize, (rowIndex + 1) * rowSize),
      }))
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
      return true
    },
    showStripePayment() {
      return this.paymentAvailability.stripe
    },
    terminalCardAvailable() {
      return Boolean(
        this.kioskTerminalReader &&
          this.kioskTerminalReader.status === 'online'
      )
    },
    terminalPaymentInProgress() {
      return Boolean(
        this.kioskTerminalPayment &&
          this.kioskTerminalPayment.outcome === 'pending'
      )
    },
    checkoutInteractionLocked() {
      return this.terminalPaymentInProgress || this.repriceConfirmation
    },
    checkoutDisabled() {
      return (
        this.kioskStep !== 'payment' ||
        this.cartItems.length === 0 ||
        !String(this.customer || '').trim() ||
        !String(this.phone || '').trim() ||
        !this.servicePointId ||
        this.isKitchenClosed ||
        this.terminalPaymentInProgress
      )
    },
    total() {
      return this.cartItems.reduce(
        (sum, item) => sum + this.parsePrice(item.price) * Number(item.qty || 0),
        0
      )
    },
    cartItemCount() {
      return this.cartItems.reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0
      )
    },
  },
  async mounted() {
    await Promise.all([
      this.$store.dispatch('products/getProducts'),
      this.$store.dispatch('shop/getCurrentShopInfo'),
    ])
    this.activeCategory = this.categories[0] || ''
    this.startWelcomeAnimationRotation()
    await this.loadKioskTerminalReader()
  },
  beforeDestroy() {
    this.stopWelcomeAnimationRotation()
    this.clearExitDialogTimer()
    this.clearConfirmationReturnTimer()
    this.resetTerminalPaymentState()
  },
  methods: {
    openExitDialog() {
      if (this.checkoutLoading) return
      this.clearExitDialogTimer()
      this.exitPin = ''
      this.exitError = ''
      this.exitDialog = true
      this.exitDialogTimer = setTimeout(() => {
        this.closeExitDialog()
      }, 15000)
    },
    handleExitDialogInput(value) {
      if (!value) this.closeExitDialog()
    },
    closeExitDialog() {
      this.clearExitDialogTimer()
      this.exitDialog = false
      this.exitPin = ''
      this.exitError = ''
      this.exitLoading = false
    },
    async loadKioskTerminalReader() {
      if (!this.showStripePayment) {
        this.kioskTerminalReader = null
        return null
      }
      const reader = await this.$store.dispatch(
        'stripeTerminal/getKioskCurrentReader'
      )
      this.kioskTerminalReader = reader || null
      return this.kioskTerminalReader
    },
    clearExitDialogTimer() {
      if (!this.exitDialogTimer) return
      clearTimeout(this.exitDialogTimer)
      this.exitDialogTimer = null
    },
    scheduleConfirmationReturn() {
      this.clearConfirmationReturnTimer()
      if (typeof window === 'undefined') return
      this.confirmationReturnTimer = setTimeout(() => {
        this.resetKiosk()
      }, 10000)
    },
    clearConfirmationReturnTimer() {
      if (!this.confirmationReturnTimer) return
      clearTimeout(this.confirmationReturnTimer)
      this.confirmationReturnTimer = null
    },
    appendExitPin(digit) {
      if (this.exitLoading || this.exitPin.length >= 4) return
      this.exitPin = `${this.exitPin}${digit}`
      this.exitError = ''
    },
    backspaceExitPin() {
      if (this.exitLoading) return
      this.exitPin = this.exitPin.slice(0, -1)
      this.exitError = ''
    },
    async confirmKioskExit() {
      if (this.exitLoading || this.exitPin.length !== 4) return
      this.exitLoading = true
      const verified = await this.$store.dispatch(
        'servicePoints/verifyKioskPin',
        this.exitPin
      )
      if (!this.exitDialog) return
      if (!verified) {
        this.exitLoading = false
        this.exitPin = ''
        this.exitError =
          this.$store.get('servicePoints/message') || 'Code incorrect.'
        return
      }
      this.closeExitDialog()
      await this.logout()
    },
    startNewOrder() {
      this.clearConfirmationReturnTimer()
      this.customer = ''
      this.phone = ''
      this.saleMode = 'dine_in'
      this.cartItems = []
      this.confirmation = null
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutFinalized = false
      this.repriceConfirmation = false
      this.resetTerminalPaymentState()
      this.kioskStep = 'mode'
    },
    startWelcomeAnimationRotation() {
      this.stopWelcomeAnimationRotation()
      if (typeof window === 'undefined') return
      this.welcomeAnimationTimer = setInterval(() => {
        const modes = ['mixedHorizontal', 'diagonal', 'horizontal']
        const currentIndex = modes.indexOf(this.welcomeAnimationMode)
        this.welcomeAnimationMode = modes[(currentIndex + 1) % modes.length]
        this.welcomeShuffleSeed = Date.now()
      }, 10000)
    },
    stopWelcomeAnimationRotation() {
      if (!this.welcomeAnimationTimer) return
      clearInterval(this.welcomeAnimationTimer)
      this.welcomeAnimationTimer = null
    },
    chooseSaleMode(mode) {
      this.saleMode = mode === 'takeaway' ? 'takeaway' : 'dine_in'
      this.kioskStep = 'menu'
    },
    openCustomerNameStep() {
      if (this.cartItems.length === 0 || this.checkoutInteractionLocked) return
      this.keyboardTarget = 'customer'
      this.kioskStep = 'name'
    },
    openCustomerPhoneStep() {
      if (!String(this.customer || '').trim()) return
      this.keyboardTarget = 'phone'
      this.kioskStep = 'phone'
    },
    async openPaymentStep() {
      if (!String(this.phone || '').trim()) return
      this.keyboardTarget = null
      this.kioskStep = 'payment'
      await this.loadKioskTerminalReader()
    },
    appendKeyboardValue(value) {
      if (this.keyboardTarget === 'phone') {
        this.phone = `${this.phone}${value}`.slice(0, 20)
        return
      }
      if (this.keyboardTarget === 'customer') {
        this.customer = `${this.customer}${value}`.slice(0, 40)
      }
    },
    displayNameKeyboardKey(value) {
      return this.keyboardUppercase ? value : String(value).toLowerCase()
    },
    handleNameKeyboardKey(key) {
      if (key.type === 'shift') {
        this.toggleKeyboardCase()
        return
      }
      if (key.type === 'backspace') {
        this.backspaceKeyboardValue()
        return
      }
      this.appendKeyboardValue(this.displayNameKeyboardKey(key.value))
    },
    keyboardKeyClass(key) {
      return {
        'kiosk-letter-key': key.type === 'letter',
        'kiosk-shift-key': key.type === 'shift',
        'kiosk-backspace-key': key.type === 'backspace',
      }
    },
    toggleKeyboardCase() {
      this.keyboardUppercase = !this.keyboardUppercase
    },
    backspaceKeyboardValue() {
      if (this.keyboardTarget === 'phone') {
        this.phone = this.phone.slice(0, -1)
        return
      }
      if (this.keyboardTarget === 'customer') {
        this.customer = this.customer.slice(0, -1)
      }
    },
    clearKeyboardValue() {
      if (this.keyboardTarget === 'phone') {
        this.phone = ''
        return
      }
      if (this.keyboardTarget === 'customer') {
        this.customer = ''
      }
    },
    async cancelOrder() {
      if (this.checkoutLoading) return
      await this.abandonPreparedCheckout()
      this.startNewOrder()
      this.kioskStep = 'welcome'
    },
    productImageSrc(image) {
      const staticURL = this.$store.get('staticURL').replace(/\/+$/, '')
      return `${staticURL}/api/v1/imgproducts/${image}`
    },
    categoryImageSrc(image) {
      const staticURL = this.$store.get('staticURL').replace(/\/+$/, '')
      return `${staticURL}/api/v1/imgcategories/${image}`
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
    ensureTerminalClientOrderToken() {
      if (!this.terminalClientOrderToken) {
        this.terminalClientOrderToken = `kiosk-terminal-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`
      }
      return this.terminalClientOrderToken
    },
    buildPayload(payment, stripe, terminal = false) {
      return buildKioskCheckoutPayload({
        customer: this.customer,
        phone: this.phone,
        servicePointId: this.servicePointId,
        total: this.total,
        payment,
        isTakeaway: this.saleMode === 'takeaway',
        dataCart: this.cartItems,
        stripe,
        terminal,
        clientOrderToken: terminal ? this.ensureTerminalClientOrderToken() : undefined,
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
          'cart/checkoutOrder',
          this.buildPayload('À encaisser', false)
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
        await this.finishCheckout(result, 'À encaisser')
        this.kioskStep = 'confirmation'
      } catch (error) {
        this.checkoutErrorMessage = error.message
      } finally {
        this.checkoutLoading = null
      }
    },
    async submitTerminalPayment() {
      if (
        this.checkoutDisabled ||
        !this.terminalCardAvailable ||
        this.checkoutLoading
      ) {
        return
      }
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutLoading = 'terminal'
      try {
        const payment = await this.$store.dispatch(
          'stripeTerminal/startKioskPayment',
          this.buildPayload('Carte bancaire - TPE Stripe', false, true)
        )
        if (!payment) {
          this.handleCheckoutFailure(
            this.$store.get('stripeTerminal/error'),
            'Impossible de lancer le paiement sur le TPE.'
          )
          return
        }
        this.repriceConfirmation = false
        this.kioskTerminalPayment = payment
        await this.resolveTerminalPayment(payment)
      } catch (error) {
        this.checkoutErrorMessage = error.message
      } finally {
        this.checkoutLoading = null
      }
    },
    async resolveTerminalPayment(payment) {
      if (!payment) return
      this.kioskTerminalPayment = payment
      if (payment.outcome === 'pending') {
        this.scheduleKioskTerminalPolling(payment.id)
        this.checkoutAlertType = 'info'
        this.checkoutErrorMessage = 'Paiement en attente sur le TPE Stripe.'
        return
      }
      await this.finishTerminalPayment(payment)
    },
    scheduleKioskTerminalPolling(paymentId) {
      this.clearKioskTerminalPolling()
      this.kioskTerminalPollingTimer = setTimeout(() => {
        this.pollKioskTerminalPayment(paymentId)
      }, 2000)
    },
    clearKioskTerminalPolling() {
      if (!this.kioskTerminalPollingTimer) return
      clearTimeout(this.kioskTerminalPollingTimer)
      this.kioskTerminalPollingTimer = null
    },
    async pollKioskTerminalPayment(paymentId) {
      if (!paymentId || this.checkoutFinalized) return
      this.checkoutLoading = 'terminal-poll'
      try {
        const payment = await this.$store.dispatch(
          'stripeTerminal/refreshKioskPayment',
          paymentId
        )
        if (payment) await this.resolveTerminalPayment(payment)
      } finally {
        this.checkoutLoading = null
      }
    },
    async finishTerminalPayment(payment) {
      this.clearKioskTerminalPolling()
      this.kioskTerminalPayment = payment
      await this.$store.dispatch('cart/completeCheckout')
      this.checkoutFinalized = true
      const paid = payment.outcome === 'paid'
      await this.finishCheckout(
        {
          ok: true,
          data: {
            orderId: payment.orderId,
            orderNumber: payment.orderNumber,
          },
        },
        paid ? 'Carte bancaire - TPE Stripe' : 'À encaisser',
        {
          outcome: paid ? 'paid' : 'counter',
          payment,
        }
      )
      if (!paid) {
        this.checkoutAlertType = 'warning'
        this.checkoutErrorMessage =
          payment.outcome === 'canceled'
            ? 'Paiement annulé. La commande est à payer au comptoir.'
            : 'Paiement refusé. La commande est à payer au comptoir.'
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
    async finishCheckout(
      result,
      paymentMethod = 'Paiement au comptoir',
      printOptions = {}
    ) {
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
      const printed = await this.printKioskTicketSet({
        orderId: reference.orderId,
        paymentMethod,
        outcome: printOptions.outcome || 'counter',
        payment: printOptions.payment || null,
      })
      this.confirmation.printStatus = printed
        ? 'Ticket imprime.'
        : 'Ticket indisponible.'
      await this.$store.dispatch('cart/setTotal', 0)
      await this.$store.dispatch('cart/setIndex', 0)
      await this.$store.dispatch('cart/setTocart', null)
      this.scheduleConfirmationReturn()
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
    async printKioskTicketSet({
      orderId,
      paymentMethod,
      outcome = 'counter',
      payment = null,
    } = {}) {
      if (!orderId) return false
      try {
        await Promise.all([
          this.$store.dispatch('orders/getAllOrder'),
          this.$store.dispatch('orders/getDetailOrder', orderId),
        ])
        const orders = this.$store.get('orders/dataOrders') || []
        const order = orders.find((item) => String(item.id) === String(orderId))
        if (!order) return false
        const details = this.$store.get('orders/detailOrder') || []
        const orderForTickets = {
          ...order,
          customer: order.customer || this.customer || 'Client borne',
          payment: paymentMethod,
          source: 'borne',
          order_source: 'borne',
        }
        const orderPayload = buildOrderTicketPayload({
          order: orderForTickets,
          details,
          shopInfo: this.shopInfo,
          fallbackPaymentMethod: paymentMethod,
          fallbackTable: 'Borne',
        })
        const smartPrint =
          this.shopInfo.service_point_smart_print_app ||
          this.shopInfo.smart_print_app
        const printerIp =
          this.shopInfo.service_point_printer_ip || this.shopInfo.shop_printer_ip
        const orderPrinted = sendOrderTicket({
          payload: orderPayload,
          smartPrint:
            this.shopInfo.service_point_smart_print_app ||
            this.shopInfo.smart_print_app,
          printerIp:
            this.shopInfo.service_point_printer_ip ||
            this.shopInfo.shop_printer_ip,
          dispatch: this.$store.dispatch,
        })
        if (outcome !== 'paid') return orderPrinted

        const receiptPayload = buildCashierReceiptPayload({
          order: orderForTickets,
          details,
          shopInfo: this.shopInfo,
          fallbackPaymentMethod: paymentMethod,
          fallbackTable: 'Borne',
        })
        const receiptPrinted = sendReceiptBundle({
          receiptPayload,
          cardTicketPayload: buildCardTicketPayload({
            payment: payment || {},
            order: orderForTickets,
            shopInfo: this.shopInfo,
          }),
          smartPrint,
          printerIp,
          dispatch: this.$store.dispatch,
        })
        return orderPrinted && receiptPrinted
      } catch (error) {
        return false
      }
    },
    resetTerminalPaymentState() {
      this.clearKioskTerminalPolling()
      this.kioskTerminalPayment = null
      this.terminalClientOrderToken = null
      this.$store.dispatch('stripeTerminal/resetPayment')
    },
    async handleCanceledKioskTerminalPayment(
      payment,
      { preserveMessage = false } = {}
    ) {
      this.clearKioskTerminalPolling()
      this.kioskTerminalPayment = payment
      await this.$store.dispatch('cart/completeCheckout')
      this.resetTerminalPaymentState()
      this.repriceConfirmation = false
      if (!preserveMessage) {
        this.checkoutAlertType = 'warning'
        this.checkoutErrorMessage =
          'Paiement annulé. La commande a été annulée.'
      }
      return true
    },
    async abandonPreparedCheckout({ preserveMessage = false } = {}) {
      if (this.terminalPaymentInProgress) {
        return this.cancelTerminalPayment({ preserveMessage })
      }

      const abandoned = await this.$store.dispatch('cart/abandonCheckout', {
        safe: true,
      })
      if (!abandoned || !abandoned.ok) {
        this.checkoutAlertType = 'error'
        this.checkoutErrorMessage =
          abandoned?.error?.message ||
          'La tentative de commande doit etre resolue avant de quitter.'
        return false
      }

      this.resetTerminalPaymentState()
      this.repriceConfirmation = false
      if (!preserveMessage) this.checkoutErrorMessage = ''
      return true
    },
    async cancelTerminalPayment({ preserveMessage = false } = {}) {
      if (this.checkoutLoading) return false
      const paymentId = this.kioskTerminalPayment && this.kioskTerminalPayment.id
      if (!paymentId) {
        this.resetTerminalPaymentState()
        return true
      }

      this.checkoutLoading = 'terminal-cancel'
      try {
        const payment = await this.$store.dispatch(
          'stripeTerminal/cancelKioskPayment',
          paymentId
        )
        if (!payment) {
          this.checkoutAlertType = 'error'
          this.checkoutErrorMessage =
            this.$store.get('stripeTerminal/error')?.message ||
            "Impossible d'annuler le paiement sur le TPE."
          return false
        }
        if (payment.outcome === 'canceled') {
          return this.handleCanceledKioskTerminalPayment(payment, {
            preserveMessage,
          })
        }
        await this.resolveTerminalPayment(payment)
        if (!preserveMessage && payment.outcome === 'pending') {
          this.checkoutErrorMessage = ''
        }
        return payment.outcome !== 'pending'
      } finally {
        this.checkoutLoading = null
      }
    },
    async resetKiosk() {
      this.clearConfirmationReturnTimer()
      await this.$store.dispatch('cart/abandonCheckout', { safe: true })
      this.cartItems = []
      this.customer = ''
      this.phone = ''
      this.saleMode = 'dine_in'
      this.confirmation = null
      this.kioskStep = 'welcome'
      this.keyboardTarget = null
      this.checkoutErrorMessage = ''
      this.checkoutAlertType = 'error'
      this.checkoutFinalized = false
      this.repriceConfirmation = false
      this.resetTerminalPaymentState()
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
  background: var(--se-color-bg);
}

.kiosk-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.kiosk-welcome {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  background: var(--se-color-surface);
}

.kiosk-welcome-mosaic {
  --kiosk-welcome-tile-size: min(340px, 27vw);
  position: absolute;
  inset: 10% -24% -34% 14%;
  display: flex;
  gap: 52px;
  transform: rotate(-7deg) scale(1.08);
}

.kiosk-welcome-mosaic--diagonal .kiosk-welcome-mosaic-column {
  display: flex;
  flex-direction: column;
  gap: 52px;
  width: min(260px, 22vw);
  animation: kioskMosaicSlide 28s linear infinite;
}

.kiosk-welcome-mosaic--diagonal .kiosk-welcome-mosaic-column--2 {
  animation-duration: 35s;
  animation-direction: reverse;
  margin-top: 90px;
}

.kiosk-welcome-mosaic--diagonal .kiosk-welcome-mosaic-column--3 {
  animation-duration: 31s;
  margin-top: 38px;
}

.kiosk-welcome-mosaic--diagonal .kiosk-welcome-mosaic-tile {
  flex: 0 0 min(260px, 22vw);
  width: min(260px, 22vw);
}

.kiosk-welcome-mosaic--horizontal,
.kiosk-welcome-mosaic--mixedHorizontal {
  inset: 0;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  transform: none;
  padding: 28px 0;
}

.kiosk-welcome-mosaic--horizontal .kiosk-welcome-mosaic-row,
.kiosk-welcome-mosaic--mixedHorizontal .kiosk-welcome-mosaic-row {
  display: flex;
  gap: 18px;
  width: max-content;
  min-width: 220vw;
  animation: kioskMosaicHorizontalTop 30s linear infinite;
}

.kiosk-welcome-mosaic--horizontal .kiosk-welcome-mosaic-row--bottom {
  animation-name: kioskMosaicHorizontalBottom;
}

.kiosk-welcome-mosaic--mixedHorizontal .kiosk-welcome-mosaic-row--right {
  animation-name: kioskMosaicHorizontalBottom;
}

.kiosk-welcome-mosaic--mixedHorizontal .kiosk-welcome-mosaic-row--left {
  animation-name: kioskMosaicHorizontalTop;
}

.kiosk-welcome-mosaic--horizontal .kiosk-welcome-mosaic-tile,
.kiosk-welcome-mosaic--mixedHorizontal .kiosk-welcome-mosaic-tile {
  width: var(--kiosk-welcome-tile-size);
  aspect-ratio: 1;
}

.kiosk-welcome-mosaic-tile {
  overflow: visible;
  aspect-ratio: 1;
  border-radius: 12px;
  background: var(--se-color-surface);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  padding: 10px;
}

.kiosk-welcome-mosaic-tile ::v-deep .v-image {
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
}

.kiosk-welcome-mosaic-tile ::v-deep .v-image__image {
  border-radius: 12px;
}

.kiosk-welcome-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.kiosk-start-button {
  min-width: min(520px, 90vw);
  min-height: 108px;
  border-radius: 8px;
  font-size: 2rem !important;
  font-weight: 900 !important;
  box-shadow: 0 20px 42px rgba(67, 56, 202, 0.28);
}

@keyframes kioskMosaicSlide {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-34%);
  }
}

@keyframes kioskMosaicHorizontalTop {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-36%);
  }
}

@keyframes kioskMosaicHorizontalBottom {
  from {
    transform: translateX(-36%);
  }

  to {
    transform: translateX(0);
  }
}

.kiosk-header {
  min-height: 84px;
  padding: 18px 28px;
  background: var(--se-color-surface);
  border-bottom: 1px solid var(--se-color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kiosk-exit-button {
  color: var(--se-color-text-muted);
  min-width: 44px;
  width: 44px;
  height: 44px;
}

.kiosk-exit-card {
  border-radius: 8px;
}

.kiosk-exit-card .v-card__title {
  font-size: 1.25rem;
  font-weight: 600;
}

.kiosk-exit-pin {
  margin-top: 8px;
}

.kiosk-exit-keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(64px, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.kiosk-exit-keypad .v-btn {
  min-width: 0;
  height: 52px;
  font-size: 1rem;
}

.kiosk-header h1 {
  color: var(--se-color-text);
  margin: 0;
  font-size: 2rem;
  letter-spacing: 0;
}

.kiosk-eyebrow {
  color: var(--se-color-primary);
  font-weight: 800;
  text-transform: uppercase;
}

.kiosk-main {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
}

.kiosk-menu,
.kiosk-side-categories,
.kiosk-bottom-cart {
  min-height: 0;
  overflow: auto;
}

.kiosk-menu {
  padding: 18px;
}

.kiosk-side-categories {
  grid-row: 1 / 3;
  background: var(--se-color-surface);
  border-right: 1px solid var(--se-color-border);
  padding: 14px;
}

.kiosk-category-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kiosk-category-button {
  background: var(--se-color-surface-muted) !important;
  min-height: 132px !important;
  border-radius: 8px !important;
  color: var(--se-color-text-body) !important;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  padding: 8px !important;
}

.kiosk-category-button--active {
  background: var(--se-color-primary) !important;
  color: var(--se-color-surface) !important;
}

.kiosk-category-button ::v-deep .v-btn__content {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kiosk-category-button span {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.15;
}

.kiosk-category-image {
  width: 100%;
  max-width: 96px;
  border-radius: 8px;
  background: #eef2f6;
}

.kiosk-category-fallback-icon {
  min-height: 74px;
  font-size: 42px !important;
}

.kiosk-products {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

.kiosk-product-card {
  min-height: 260px;
}

.kiosk-bottom-cart {
  grid-column: 2;
  padding: 18px;
  background: var(--se-color-surface);
  border-top: 1px solid var(--se-color-border);
}

.kiosk-bottom-cart h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: 0;
}

.kiosk-cart-head,
.kiosk-cart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kiosk-cart-footer {
  margin-top: 14px;
}

.kiosk-cart-count {
  display: block;
  margin-top: 2px;
  color: var(--se-color-text-muted);
  font-size: 0.95rem;
  font-weight: 700;
}

.kiosk-cart-lines {
  display: grid;
  gap: 10px;
  max-height: 250px;
  overflow: auto;
  padding: 10px 0;
}

.kiosk-cart-item-card {
  min-height: 96px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
}

.kiosk-cart-item-image {
  width: 80px;
  max-width: 80px;
  flex: 0 0 80px;
  border-radius: 8px;
  background: #f1f3f5;
}

.kiosk-cart-item-main {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.kiosk-cart-item-main strong,
.kiosk-cart-item-meta,
.kiosk-cart-item-choices {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kiosk-cart-item-meta {
  color: #5f6b7a;
  font-weight: 700;
}

.kiosk-cart-item-choices {
  color: var(--se-color-primary);
  font-size: 0.86rem;
}

.kiosk-cart-item-choices span + span::before {
  content: " + ";
}

.kiosk-cart-item-subtotal {
  min-width: 84px;
  text-align: right;
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

.kiosk-dialog-card {
  border-radius: 8px;
}

.kiosk-dialog-card .v-card__title {
  font-size: 2rem;
  font-weight: 900;
}

.kiosk-mode-actions {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}

.kiosk-mode-actions .v-btn {
  min-height: 130px;
  font-size: 1.4rem !important;
  font-weight: 900 !important;
}

.kiosk-keyboard-input-wrap {
  margin-bottom: 30px;
}

.kiosk-keyboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kiosk-keyboard-row {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 10px;
}

.kiosk-keyboard-row:nth-child(2) {
  padding: 0 28px;
}

.kiosk-keyboard-row:nth-child(3) {
  grid-template-columns: 120px repeat(6, minmax(0, 1fr)) 170px;
  padding: 0 56px;
}

.kiosk-keyboard-control-row {
  grid-template-columns: minmax(0, 1fr);
  padding: 8px 90px 0 !important;
}

.kiosk-keyboard .v-btn {
  min-height: 64px;
  font-weight: 900 !important;
}

.kiosk-letter-key {
  min-width: 0 !important;
}

.kiosk-space-key {
  min-height: 70px !important;
}

.kiosk-backspace-key,
.kiosk-shift-key {
  min-height: 70px !important;
}

.kiosk-number-keyboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
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
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .kiosk-side-categories {
    grid-row: auto;
    border-right: 0;
    border-top: 1px solid var(--se-color-border);
  }

  .kiosk-category-stack {
    flex-direction: row;
    overflow-x: auto;
  }

  .kiosk-category-button {
    min-width: 132px !important;
  }

  .kiosk-bottom-cart {
    grid-column: auto;
  }

  .kiosk-mode-actions {
    grid-template-columns: 1fr 1fr;
  }

  .kiosk-keyboard-row,
  .kiosk-keyboard-row:nth-child(2),
  .kiosk-keyboard-row:nth-child(3),
  .kiosk-keyboard-control-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 !important;
  }

  .kiosk-space-key,
  .kiosk-backspace-key {
    grid-column: auto;
  }
}
</style>
