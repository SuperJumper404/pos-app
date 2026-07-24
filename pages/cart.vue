<template>
  <v-container>
    <v-alert
      v-if="checkoutErrorMessage"
      type="error"
      dismissible
      @input="checkoutErrorMessage = ''"
    >
      {{ checkoutErrorMessage }}
    </v-alert>
    <v-row class="mt-8">
      <v-col md="8" sm="12" cols="12">
        <v-card outlined height="100%" class="pa-2 overflow-y-auto">
          <v-card-text v-if="!dataCart" class="row justify-center">
            <p style="margin-top: 30vh">
              <v-icon size="90">mdi-room-service-outline</v-icon> Votre assiette
              est vide !
            </p>
          </v-card-text>
          <div v-else>
            <v-card
              v-for="(itm, itemIndex) in dataCart"
              :key="itm.configurationSignature || `${itm.id}-${itemIndex}`"
              outlined
              class="d-flex mb-2 flex-column"
              rounded="7"
            >
              <v-row
                class="cart-summary-row d-flex align-center mr-2 ml-2 mt-2"
                no-gutters
              >
                <!-- Left block: avatar + texts -->
                <v-col class="cart-summary-main d-flex align-center">
                  <v-avatar
                    size="75"
                    rounded
                    tile
                    class="cart-summary-avatar mr-3"
                  >
                    <v-img
                      class="cart-item-image rounded-lg"
                      :src="productImageSrc(itm.image)"
                    />
                  </v-avatar>

                  <div class="cart-summary-text">
                    <div
                      class="cart-summary-name text-truncate font-weight-bold"
                      style="font-size: large; color: rgba(0, 0, 0, 0.8)"
                    >
                      {{ itm.name }}
                    </div>
                    <div
                      class="font-weight-bold"
                      style="color: rgba(0, 0, 0, 0.8)"
                    >
                      {{ formatCurrency(itm.price) }}
                    </div>
                  </div>
                </v-col>

                <!-- Right block: qty -->
                <v-col
                  class="cart-summary-qty-col d-flex align-center justify-end"
                  cols="auto"
                >
                  <v-btn
                    icon
                    small
                    color="warning"
                    aria-label="Retirer une unité"
                    @click="changeQuantity(itemIndex, -1)"
                  >
                    <v-icon>mdi-minus</v-icon>
                  </v-btn>
                  <v-btn
                    class="cart-summary-qty mx-2"
                    style="font-size: x-large"
                    color="success"
                    fab
                    small
                    dark
                  >
                    {{ itm.qty }}
                  </v-btn>
                  <v-btn
                    icon
                    small
                    color="success"
                    aria-label="Ajouter une unité"
                    @click="changeQuantity(itemIndex, 1)"
                  >
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </v-col>
              </v-row>

              <v-col class="cart-summary-customizations pt-2">
                <CartCustomizationSummary
                  v-if="(itm.customization_steps || []).length > 0"
                  :selections="itm.selections || []"
                  :unit-price="itm.price"
                  @edit="editCartLine(itemIndex, $event)"
                />
                <v-btn
                  v-if="(itm.customization_steps || []).length > 0"
                  text
                  small
                  color="primary"
                  class="text-none px-0"
                  @click="editCartLine(itemIndex)"
                >
                  <v-icon small left>mdi-pencil</v-icon>
                  Modifier
                </v-btn>
              </v-col>
            </v-card>
          </div>
        </v-card>
      </v-col>
      <v-col md="4" sm="12" cols="12">
        <v-card v-if="access === 0" outlined class="pa-2 mb-3">
          <v-select
            v-model="selectedTable"
            :items="dataTables"
            item-text="username"
            item-value="id"
            :rules="[(v) => !!v || 'Veuillez sélectionner une table']"
            label="Sélectionner une table"
            default
            required
          ></v-select>
        </v-card>
        <v-card v-if="loadPage" outlined class="pa-2">
          <Loading />
        </v-card>
        <v-card v-else outlined class="pa-2 overflow-x-hidden overflow-y-auto">
          <v-card-actions v-if="!dataCart">
            <v-btn
              color="primary"
              width="100%"
              dark
              class="text-none"
              @click="$router.push('/menus')"
              >Retourner au menu
              <v-icon small right>mdi-arrow-left</v-icon></v-btn
            >
          </v-card-actions>
          <v-form v-else v-model="isValue" @submit.prevent="paymentBtn()">
            <v-alert v-if="isKitchenClosed" dense text type="warning">
              La cuisine est fermée. Aucune nouvelle commande possible.
            </v-alert>
            <v-text-field
              v-model="formuser.customer"
              type="text"
              label="Nom du client"
              :rules="[(v) => !!v || 'Veuillez saisir le nom']"
              placeholder="Saisir le nom du client"
              required
            ></v-text-field>
            <v-text-field
              v-model="formuser.phone"
              type="tel"
              prepend-inner-icon="mdi-phone"
              label="Numéro de téléphone"
              :rules="[
                (v) =>
                  /^[0-9]+$/.test(v) || 'Seuls les chiffres sont autorisés',
              ]"
              placeholder="Saisir le numéro de téléphone"
              class="mb-5"
              required
            ></v-text-field>
            <!-- <v-select
              v-model="formuser.payment"
              :items="items"
              label="Méthodes de paiement"
              :rules="[(v) => !!v || 'Méthodes de paiement requises']"
            ></v-select> -->
            <v-textarea
              v-model="formuser.notes"
              label="Note à la commande"
              :rows="2"
              filled
              prepend-inner-icon="mdi-comment"
              placeholder="Ajouter une note à la commande"
            ></v-textarea>
            <div
              v-show="isStripeCheckout && stripePaymentReady"
              class="stripe-checkout-panel mb-4"
            >
              <div ref="stripePaymentElement"></div>
              <v-btn
                :disabled="!isValue || loadingBtn"
                :loading="loadingBtn && selectedCheckoutFlow !== 'counter'"
                block
                color="success"
                class="mt-4 text-none font-weight-bold"
                @click="paymentBtn"
              >
                Confirmer le paiement
                <v-icon small right>mdi-credit-card-check</v-icon>
              </v-btn>
              <div
                v-if="showOrderWithoutPaymentButton"
                class="cart-payment-separator"
              >
                <span></span>
                <strong>OU</strong>
                <span></span>
              </div>
              <v-btn
                v-if="showOrderWithoutPaymentButton"
                :disabled="!isValue || loadingBtn"
                :loading="loadingBtn && selectedCheckoutFlow === 'counter'"
                block
                color="primary"
                class="mt-2 text-none font-weight-bold"
                @click="orderWithoutPayment"
              >
                Payer au comptoir
                <v-icon small right>mdi-cash-register</v-icon>
              </v-btn>
            </div>
            <!-- struc -->
            <v-card-title>
              <h5>Total</h5>
              <v-spacer></v-spacer>
              <h5>{{ formatCurrency(total) }}</h5>
            </v-card-title>
            <v-card-text> </v-card-text>
            <v-card-actions
              class="cart-checkout-actions"
              :class="{
                'cart-checkout-actions--single': !showFooterCheckoutButton,
              }"
            >
              <v-btn
                v-if="showFooterCheckoutButton"
                :disabled="!isValue || loadingBtn"
                :loading="loadingBtn && selectedCheckoutFlow !== 'counter'"
                type="submit"
                color="success"
                class="
                  cart-checkout-btn cart-checkout-btn--submit
                  text-none
                  font-weight-bold
                "
                >{{ checkoutButtonLabel }}
                <v-icon small right>{{ checkoutButtonIcon }}</v-icon></v-btn
              >

              <v-btn
                color="red lighten-1"
                dark
                class="cart-checkout-btn cart-checkout-btn--cancel text-none"
                @click="cancelCart"
                >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
              >
            </v-card-actions>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="customizationDialog" max-width="920" persistent>
      <div v-if="editingProduct">
        <v-alert
          v-if="customizationRecoveryMessage"
          type="warning"
          tile
          class="mb-0"
        >
          {{ customizationRecoveryMessage }}
        </v-alert>
        <ProductCustomizationWizard
          v-model="editingSelectedChoiceIds"
          :product="editingProduct"
          :initial-step-id="recoveryStepId"
          @confirm="confirmCartCustomization"
          @cancel="closeCartCustomization"
        />
      </div>
    </v-dialog>

    <v-dialog v-model="repriceDialog" max-width="520" persistent>
      <v-card>
        <v-card-title>Le prix de la commande a changé</v-card-title>
        <v-card-text>
          Le nouveau total est de
          <strong>{{ formatCurrency(total) }}</strong
          >. Voulez-vous continuer ?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="cancelReprice"> Annuler </v-btn>
          <v-btn color="primary" class="text-none" @click="confirmReprice">
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- {{ dataCart }}
    <pre>acces :{{ access }}</pre>
    <pre>current table : {{ selectedTable }}</pre> -->
    <v-snackbar
      v-model="kitchenClosedSnackbar"
      color="warning"
      timeout="4500"
      top
    >
      {{ kitchenClosedMessage }}
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="kitchenClosedSnackbar = false">
          Fermer
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
import { loadStripe } from '@stripe/stripe-js'
import Loading from '@/components/loading'
import ProductCustomizationWizard from '@/components/products/ProductCustomizationWizard'
import CartCustomizationSummary from '@/components/products/CartCustomizationSummary'
import price from '@/helpers/price'
import {
  applyServerQuoteToCart,
  buildCheckoutPayloadSignature,
  findCartTargetForCheckoutError,
  replaceConfiguredCartLine,
} from '@/helpers/customizations'
const {
  isCounterPaymentAllowed,
  isQrClientAccess,
} = require('@/helpers/checkoutAccess')
const { shouldAutoPrepareStripeCheckout } = require('@/helpers/stripeCheckout')
export default {
  components: {
    Loading,
    ProductCustomizationWizard,
    CartCustomizationSummary,
  },
  mixins: [price],
  async beforeRouteLeave(to, from, next) {
    if (this.checkoutFinalized || this.allowRouteLeave) {
      next()
      return
    }

    const safeToLeave = await this.resetCheckoutAttempt()
    next(safeToLeave === true)
  },
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  data: () => ({
    ppn: 0,
    total: 0,
    isValue: false,
    loadingBtn: false,
    loadPage: false,
    stripe: null,
    stripeElements: null,
    stripePreparing: false,
    stripePaymentReady: false,
    stripePaymentIntentId: null,
    stripeOrderId: null,
    stripeCheckoutSignature: null,
    stripeAutoPrepareTimeout: null,
    stripePreparationPromise: null,
    stripeCancellationPromise: null,
    stripeCancellationOrderId: null,
    stripeReplacementPending: false,
    selectedCheckoutFlow: null,
    customizationDialog: false,
    editingCartIndex: null,
    editingProduct: null,
    editingSelectedChoiceIds: [],
    recoveryStepId: null,
    customizationRecoveryMessage: '',
    checkoutErrorMessage: '',
    repriceDialog: false,
    pendingRepriceFlow: null,
    pendingRepricePaymentMethod: null,
    restoringCheckoutPayload: false,
    checkoutFinalized: false,
    allowRouteLeave: false,
    kitchenClosedSnackbar: false,
    kitchenClosedMessage:
      'La cuisine est fermée. Aucune nouvelle commande possible.',
    selectedTable: parseInt(localStorage.getItem('idUser')),
    access: parseInt(localStorage.getItem('access')),
    formuser: {
      customer: '',
      phone: '',
      payment: 'Espèce',
      notes: '',
    },
    // Pour le moment on a que l'espece
    items: ['Carte Bleu ', 'Espèce', 'Ticket Restaurant'],
  }),
  computed: {
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    dataCart() {
      return this.$store.get('cart/dataCart')
    },
    totalCart() {
      return this.$store.get('cart/totalCart')
    },
    insertId() {
      return this.$store.get('cart/insertId')
    },
    message() {
      return this.$store.get('cart/message')
    },
    dataTables() {
      // ICI on ne  filtre pas les tables car on veut tout recup sinon on filter sur  acces === 2
      const result = this.$store.get('tables/dataTables') || []
      // const filtered = result.filter((x) => x.access === 2)
      return result
    },
    isKitchenClosed() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/kitchen_closed')
      )
    },
    qrPaymentMode() {
      return this.$store.get('shop/qr_payment_mode') || 'stripe_before_order'
    },
    isQrClient() {
      return isQrClientAccess(this.access)
    },
    isFlexibleQrCheckout() {
      return this.isQrClient && isCounterPaymentAllowed(this.qrPaymentMode)
    },
    isStripeCheckout() {
      return this.isQrClient && this.selectedCheckoutFlow !== 'counter'
    },
    showOrderWithoutPaymentButton() {
      return this.isFlexibleQrCheckout && this.stripePaymentReady
    },
    showFooterCheckoutButton() {
      return !(this.isStripeCheckout && this.stripePaymentReady)
    },
    checkoutButtonLabel() {
      if (this.isStripeCheckout && this.stripePaymentReady) {
        return 'Confirmer le paiement'
      }
      if (this.isStripeCheckout) return 'Payer'
      return 'Commander'
    },
    checkoutButtonIcon() {
      if (this.isStripeCheckout) return 'mdi-credit-card-check'
      return 'mdi-silverware-fork-knife'
    },
    currentStripeCheckoutSignature() {
      const stripe = this.isQrClient
      return buildCheckoutPayloadSignature(
        this.buildOrderPayload(
          stripe ? 'Stripe' : this.formuser.payment,
          stripe
        )
      )
    },
  },
  watch: {
    isValue() {
      this.handleStripeCheckoutChange()
    },
    dataCart: {
      deep: true,
      handler() {
        this.handleStripeCheckoutChange()
      },
    },
    totalCart(value) {
      this.total = value
      this.handleStripeCheckoutChange()
    },
    selectedTable() {
      this.handleStripeCheckoutChange()
    },
    'formuser.customer'() {
      this.handleStripeCheckoutChange()
    },
    'formuser.phone'() {
      this.handleStripeCheckoutChange()
    },
    'formuser.notes'() {
      this.handleStripeCheckoutChange()
    },
    'formuser.payment'() {
      this.handleStripeCheckoutChange()
    },
    qrPaymentMode() {
      this.handleStripeCheckoutChange()
    },
    isKitchenClosed() {
      this.handleStripeCheckoutChange()
    },
  },
  async mounted() {
    this.loadPage = true
    this.total = this.totalCart
    await this.$store.dispatch('shop/getCurrentShopInfo')
    this.loadPage = false
    this.scheduleStripeAutoPrepare()
  },
  beforeDestroy() {
    this.clearStripeAutoPrepareTimeout()
  },
  methods: {
    productImageSrc(image) {
      const fileName = image || 'default.png'
      return `${this.staticURL}/api/v1/imgproducts/${fileName}`
    },
    syncCartState(cart) {
      const nextCart = Array.isArray(cart) && cart.length > 0 ? cart : null
      const total = this.roundPrice(
        (nextCart || []).reduce(
          (sum, line) => sum + this.parsePrice(line.subtotal),
          0
        )
      )
      const index = (nextCart || []).reduce(
        (sum, line) => sum + Number(line.qty || 0),
        0
      )
      this.total = total
      this.$store.dispatch('cart/setTocart', nextCart)
      this.$store.dispatch('cart/setTotal', total)
      this.$store.dispatch('cart/setIndex', index)
    },
    async changeQuantity(lineIndex, delta) {
      const cart = Array.isArray(this.dataCart) ? this.dataCart : []
      const line = cart[lineIndex]
      if (!line) return

      const qty = Number(line.qty || 0) + Number(delta || 0)
      const nextCart = cart
        .filter((_, index) => index !== lineIndex || qty > 0)
        .map((cartLine, index) => {
          if (index !== lineIndex || qty <= 0) return { ...cartLine }
          const price = this.roundPrice(cartLine.price)
          return {
            ...cartLine,
            price,
            qty,
            subtotal: this.roundPrice(price * qty),
          }
        })
      if (!(await this.resetCheckoutAttempt())) return
      this.syncCartState(nextCart)
    },
    editCartLine(lineIndex, productStepId = null, message = '') {
      const line = Array.isArray(this.dataCart)
        ? this.dataCart[lineIndex]
        : null
      if (!line || !(line.customization_steps || []).length) return

      this.editingCartIndex = lineIndex
      this.editingProduct = { ...line }
      this.editingSelectedChoiceIds = [...(line.selectedChoiceIds || [])]
      this.recoveryStepId = productStepId
      this.customizationRecoveryMessage = message
      this.customizationDialog = true
    },
    closeCartCustomization() {
      this.customizationDialog = false
      this.editingCartIndex = null
      this.editingProduct = null
      this.editingSelectedChoiceIds = []
      this.recoveryStepId = null
      this.customizationRecoveryMessage = ''
    },
    async confirmCartCustomization(customization) {
      const cart = Array.isArray(this.dataCart) ? this.dataCart : []
      const sourceLine = cart[this.editingCartIndex]
      if (!sourceLine) return

      const price = this.roundPrice(customization.unitPrice)
      const selections = (customization.selections || []).map((selection) => ({
        ...selection,
      }))
      const editedLine = {
        ...sourceLine,
        selectedChoiceIds: [...(customization.selectedChoiceIds || [])],
        selections,
        customizationList: selections.map((selection) => ({
          ...selection,
          name: selection.choice_name || selection.name,
          price: selection.extra_price,
        })),
        price,
        subtotal: this.roundPrice(price * Number(sourceLine.qty || 0)),
      }
      const nextCart = replaceConfiguredCartLine(
        cart,
        this.editingCartIndex,
        editedLine
      )
      if (!(await this.resetCheckoutAttempt())) return
      this.syncCartState(nextCart)
      this.closeCartCustomization()
    },
    restoreCheckoutAttemptPayload(payload) {
      if (!payload || typeof payload !== 'object') return

      this.restoringCheckoutPayload = true
      this.formuser.customer = payload.customer || ''
      this.formuser.phone = payload.phone || ''
      this.formuser.payment = payload.payment || this.formuser.payment
      this.formuser.notes = payload.remark || ''
      if (payload.customerID != null) this.selectedTable = payload.customerID
      this.$nextTick(() => {
        this.restoringCheckoutPayload = false
      })
    },
    async cancelPreparedStripeAttempt(orderId = this.stripeOrderId) {
      if (!orderId) {
        return {
          ok: false,
          data: null,
          error: {
            code: 'STRIPE_ORDER_ID_REQUIRED',
            message: 'La commande Stripe à annuler est introuvable.',
          },
        }
      }

      if (this.stripeCancellationPromise) {
        const activeOrderId = this.stripeCancellationOrderId
        const activeResult = await this.stripeCancellationPromise
        if (!activeResult.ok || Number(activeOrderId) === Number(orderId)) {
          return activeResult
        }
        return this.cancelPreparedStripeAttempt(orderId)
      }

      this.stripeCancellationOrderId = orderId
      this.stripeCancellationPromise = (async () => {
        const result = await this.$store.dispatch(
          'cart/cancelStripeCheckout',
          orderId
        )
        if (!result || !result.ok) {
          this.checkoutErrorMessage =
            result?.error?.message || 'Impossible d’annuler le paiement Stripe.'
          return result || { ok: false, data: null, error: null }
        }

        const abandoned = await this.$store.dispatch('cart/abandonCheckout', {
          safe: true,
        })
        if (!abandoned || !abandoned.ok) return abandoned

        if (Number(this.stripeOrderId) === Number(orderId)) {
          this.resetStripePaymentElement()
        }
        return result
      })()

      try {
        return await this.stripeCancellationPromise
      } finally {
        this.stripeCancellationPromise = null
        this.stripeCancellationOrderId = null
      }
    },
    async resetCheckoutAttempt() {
      this.clearStripeAutoPrepareTimeout()

      if (this.stripePreparationPromise) {
        this.stripeReplacementPending = true
        await this.stripePreparationPromise
      }

      if (this.stripeOrderId) {
        const canceled = await this.cancelPreparedStripeAttempt(
          this.stripeOrderId
        )
        return Boolean(canceled && canceled.ok)
      }

      const abandoned = await this.$store.dispatch('cart/abandonCheckout')
      if (!abandoned || !abandoned.ok) {
        this.checkoutErrorMessage =
          abandoned?.error?.message ||
          'La tentative de commande précédente doit être résolue.'
        this.restoreCheckoutAttemptPayload(abandoned?.error?.attempt_payload)
        return false
      }
      return true
    },
    handleCheckoutError(error, flow, paymentMethod) {
      if (!error) return
      this.checkoutErrorMessage = error.message || 'Commande impossible.'

      if (error.code === 'ORDER_REPRICE_REQUIRED' && error.server_quote) {
        this.pendingRepriceFlow = flow
        this.pendingRepricePaymentMethod = paymentMethod || null
        this.repriceDialog = true
        const repricedCart = applyServerQuoteToCart(
          this.dataCart,
          error.server_quote
        )
        this.syncCartState(repricedCart)
        return
      }

      if (error.code === 'CHECKOUT_ATTEMPT_UNRESOLVED') {
        this.restoreCheckoutAttemptPayload(error.attempt_payload)
        return
      }

      const target = findCartTargetForCheckoutError(this.dataCart, error)
      if (target) {
        this.editCartLine(
          target.lineIndex,
          target.productStepId,
          this.checkoutErrorMessage
        )
      }
    },
    async confirmReprice() {
      const flow = this.pendingRepriceFlow
      const paymentMethod = this.pendingRepricePaymentMethod
      this.repriceDialog = false
      this.pendingRepriceFlow = null
      this.pendingRepricePaymentMethod = null
      this.checkoutErrorMessage = ''

      if (flow === 'stripe') {
        await this.prepareStripePaymentElement(true, true)
      } else if (flow === 'order') {
        await this.submitOrderWithoutStripe(paymentMethod, true)
      }
    },
    cancelReprice() {
      this.repriceDialog = false
      this.pendingRepriceFlow = null
      this.pendingRepricePaymentMethod = null
      this.$store.dispatch('cart/abandonCheckout')
    },
    clearStripeAutoPrepareTimeout() {
      if (!this.stripeAutoPrepareTimeout) return

      clearTimeout(this.stripeAutoPrepareTimeout)
      this.stripeAutoPrepareTimeout = null
    },
    shouldPrepareStripeCheckout() {
      if (this.repriceDialog || this.customizationDialog) return false
      return shouldAutoPrepareStripeCheckout({
        isQrClient: this.isQrClient,
        isStripeCheckout: this.isStripeCheckout,
        isValue: this.isValue,
        dataCart: this.dataCart,
        isKitchenClosed: this.isKitchenClosed,
        stripePaymentReady: this.stripePaymentReady,
        stripePreparing: this.stripePreparing,
      })
    },
    scheduleStripeAutoPrepare() {
      this.clearStripeAutoPrepareTimeout()

      if (!this.shouldPrepareStripeCheckout()) return

      this.selectedCheckoutFlow = 'stripe'
      this.stripeAutoPrepareTimeout = setTimeout(() => {
        this.prepareStripePaymentElement()
      }, 600)
    },
    resetStripePaymentElement() {
      this.clearStripeAutoPrepareTimeout()
      this.stripe = null
      this.stripeElements = null
      this.stripePreparing = false
      this.stripePaymentReady = false
      this.stripePaymentIntentId = null
      this.stripeOrderId = null
      this.stripeCheckoutSignature = null
    },
    async handleStripeCheckoutChange() {
      if (
        this.restoringCheckoutPayload ||
        this.checkoutFinalized ||
        this.repriceDialog
      ) {
        return
      }

      if (this.stripePreparationPromise || this.stripePreparing) {
        this.stripeReplacementPending = true
        return
      }

      const boundSignature =
        typeof this.$store.get === 'function'
          ? this.$store.get('cart/clientOrderSignature')
          : null
      const preparedPayloadChanged =
        this.stripeCheckoutSignature &&
        this.currentStripeCheckoutSignature !== this.stripeCheckoutSignature
      const boundPayloadChanged =
        boundSignature && this.currentStripeCheckoutSignature !== boundSignature

      if (preparedPayloadChanged || boundPayloadChanged) {
        const safeToReplace = await this.resetCheckoutAttempt()
        if (!safeToReplace) return
      }

      if (this.isQrClient) this.scheduleStripeAutoPrepare()
    },
    async paymentBtn() {
      if (this.isKitchenClosed) {
        this.kitchenClosedSnackbar = true
        return
      }

      const flow = this.isQrClient ? 'stripe' : 'order'

      this.selectedCheckoutFlow = flow

      if (flow === 'stripe') {
        if (!this.stripePaymentReady) {
          await this.prepareStripePaymentElement()
          return
        }

        await this.confirmStripePayment()
        return
      }

      await this.submitOrderWithoutStripe(this.formuser.payment)
    },
    async orderWithoutPayment() {
      if (!this.stripeOrderId) {
        await this.submitOrderWithoutStripe('Paiement au comptoir')
        return
      }

      this.selectedCheckoutFlow = 'counter'
      this.loadingBtn = true
      const res = await this.$store.dispatch(
        'cart/markStripeOrderPayAtCounter',
        this.stripeOrderId
      )
      this.loadingBtn = false

      if (!res) {
        this.selectedCheckoutFlow = 'stripe'
        return
      }

      this.checkoutFinalized = true
      this.$store.set('stateDialog', false)
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
      this.$store.dispatch('cart/setTocart', null)
      this.$store.dispatch('cart/completeCheckout')
      this.$router.push('/ordersStatuses')
    },
    async submitOrderWithoutStripe(paymentMethod, repriceConfirmation = false) {
      this.loadingBtn = true
      try {
        const result = await this.$store.dispatch(
          'cart/checkoutOrder',
          this.buildOrderPayload(paymentMethod, false, repriceConfirmation)
        )
        if (result.ok) {
          this.checkoutFinalized = true
          this.$store.set('stateDialog', false)
          this.$store.dispatch('cart/setTotal', 0)
          this.$store.dispatch('cart/setIndex', 0)
          this.$store.dispatch('cart/setTocart', null)
          this.$router.push(this.isQrClient ? '/ordersStatuses' : '/menus')
        } else {
          this.handleCheckoutError(result.error, 'order', paymentMethod)
        }
      } finally {
        this.loadingBtn = false
      }
    },
    buildOrderPayload(
      paymentMethod = 'Stripe',
      stripe = true,
      repriceConfirmation = false
    ) {
      return {
        customer: this.formuser.customer,
        customerID: this.selectedTable,
        total: this.roundPrice(this.total),
        payment: paymentMethod,
        remark: this.formuser.notes,
        phone: this.formuser.phone,
        dataCart: this.dataCart,
        stripe,
        repriceConfirmation,
      }
    },
    async prepareStripePaymentElement(
      force = false,
      repriceConfirmation = false
    ) {
      if (this.stripePreparationPromise) {
        return this.stripePreparationPromise
      }
      if (!force && !this.shouldPrepareStripeCheckout()) return

      this.clearStripeAutoPrepareTimeout()
      this.stripePreparing = true
      await this.$nextTick()
      const checkoutSignature = this.currentStripeCheckoutSignature
      let canPrepareReplacement = false

      this.stripePreparationPromise = (async () => {
        const checkoutResult = await this.$store.dispatch(
          'cart/checkoutOrder',
          this.buildOrderPayload('Stripe', true, repriceConfirmation)
        )
        if (!checkoutResult.ok) {
          this.handleCheckoutError(checkoutResult.error, 'stripe', 'Stripe')
          return false
        }
        const payment = checkoutResult.data
        const cancelReturnedPayment = async () => {
          const canceled = await this.cancelPreparedStripeAttempt(
            payment.orderId
          )
          if (!canceled || !canceled.ok) {
            this.stripeOrderId = payment.orderId
            this.stripePaymentIntentId = payment.paymentIntentId || null
            this.stripeCheckoutSignature = checkoutSignature
          }
          return Boolean(canceled && canceled.ok)
        }

        if (!payment || !payment.clientSecret || !payment.publishableKey) {
          if (payment && payment.orderId) {
            return cancelReturnedPayment()
          }
          return false
        }

        if (this.currentStripeCheckoutSignature !== checkoutSignature) {
          this.stripeReplacementPending = true
          return cancelReturnedPayment()
        }

        try {
          this.stripe = await loadStripe(payment.publishableKey)
          if (!this.stripe) throw new Error('Stripe est indisponible.')

          if (this.currentStripeCheckoutSignature !== checkoutSignature) {
            this.stripeReplacementPending = true
            return cancelReturnedPayment()
          }

          this.stripeElements = this.stripe.elements({
            clientSecret: payment.clientSecret,
          })
          const paymentElement = this.stripeElements.create('payment')
          paymentElement.mount(this.$refs.stripePaymentElement)
          this.stripePaymentReady = true
          this.stripePaymentIntentId = payment.paymentIntentId
          this.stripeOrderId = payment.orderId
          this.stripeCheckoutSignature = checkoutSignature
          return false
        } catch (error) {
          this.checkoutErrorMessage =
            error?.message || 'Impossible d’initialiser le paiement Stripe.'
          return cancelReturnedPayment()
        }
      })()

      try {
        canPrepareReplacement = await this.stripePreparationPromise
        return canPrepareReplacement
      } finally {
        this.stripePreparing = false
        this.stripePreparationPromise = null
        const shouldReplace = this.stripeReplacementPending
        this.stripeReplacementPending = false
        if (shouldReplace && canPrepareReplacement) {
          this.scheduleStripeAutoPrepare()
        }
      }
    },
    async confirmStripePayment() {
      this.loadingBtn = true

      const result = await this.stripe.confirmPayment({
        elements: this.stripeElements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/ordersStatuses`,
        },
      })

      this.loadingBtn = false

      if (result.error) {
        this.$store.dispatch(
          'notifications/error',
          result.error.message || 'Le paiement a echoue.'
        )
        return
      }

      this.$store.dispatch(
        'notifications/success',
        'Paiement envoye. La commande sera confirmee par Stripe.'
      )
      this.checkoutFinalized = true
      this.$store.set('stateDialog', false)
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
      this.$store.dispatch('cart/setTocart', null)
      this.$store.dispatch('cart/completeCheckout')
      this.$router.push('/ordersStatuses')
    },
    async cancelCart() {
      if (!(await this.resetCheckoutAttempt())) return

      this.allowRouteLeave = true
      this.$store.set('stateDialog', false)
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
      this.$store.dispatch('cart/setTocart', null)
      this.$router.push('/menus')
    },
  },
}
</script>
<style scoped>
.cart-item-image ::v-deep .v-image__image {
  background-position: center;
  background-size: cover;
}

.cart-summary-row {
  min-width: 0;
}

.cart-summary-main,
.cart-summary-text {
  min-width: 0;
}

.cart-summary-avatar,
.cart-summary-qty-col {
  flex: 0 0 auto;
}

.cart-summary-text {
  flex: 1 1 auto;
}

.cart-summary-name {
  max-width: 100%;
}

.cart-summary-customizations {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
}

.cart-checkout-actions {
  display: flex;
  gap: 8px;
  padding-left: 8px;
  padding-right: 8px;
}

.cart-checkout-btn {
  min-width: 0 !important;
}

.cart-checkout-btn--submit {
  flex: 1.35 1 0;
}

.cart-checkout-btn--cancel {
  flex: 1 1 0;
}

.cart-checkout-actions--single .cart-checkout-btn--cancel {
  flex: 1 1 100%;
}

.cart-checkout-btn ::v-deep .v-btn__content {
  min-width: 0;
  white-space: nowrap;
}

.stripe-checkout-panel {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
}

.cart-payment-separator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 2px;
  color: #777;
  font-size: 0.78rem;
  font-weight: 700;
}

.cart-payment-separator span {
  flex: 1 1 0;
  border-top: 1px solid #dedede;
}

@media (min-width: 600px) and (max-width: 1263px) {
  .cart-checkout-actions {
    padding-left: 4px;
    padding-right: 4px;
  }

  .cart-checkout-btn {
    font-size: 0.78rem !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
}

@media (max-width: 420px) {
  .cart-summary-row {
    margin-left: 4px !important;
    margin-right: 4px !important;
  }

  .cart-summary-avatar {
    height: 60px !important;
    min-width: 60px !important;
    width: 60px !important;
  }

  .cart-summary-name {
    font-size: 0.95rem !important;
  }

  .cart-summary-qty {
    height: 34px !important;
    min-width: 34px !important;
    width: 34px !important;
  }

  .cart-checkout-actions {
    flex-direction: column;
  }

  .cart-checkout-btn {
    width: 100%;
  }
}
</style>
