<template>
  <v-container>
    <v-dialog v-model="dialog" persistent max-width="760">
      <v-card class="cashregister-payout-modal">
        <div class="cashregister-payout-hero">
          <div class="cashregister-payout-hero__icon">
            <v-icon>mdi-cash-register</v-icon>
          </div>
          <div class="cashregister-payout-hero__copy">
            <h2>{{ actionTitle }} : {{ id }}</h2>
          </div>
          <v-btn
            icon
            :disabled="loadingBtn"
            aria-label="Fermer la modal d'encaissement"
            @click="btnNo"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="cashregister-payout-body">
          <section class="cashregister-payout-total">
            <span>Commandes a encaisser</span>
            <div class="cashregister-payout-total__orders">
              {{ displayOrderNumbers }}
            </div>
            <small v-if="requiresPaymentMethod">
              Verifiez l'encaissement avant de valider.
            </small>
            <small v-else>
              Ces commandes sont déjà payées. Vous pouvez les clôturer.
            </small>
          </section>

          <div class="cashregister-payout-summary">
            <div class="cashregister-payout-summary__item">
              <span>À encaisser</span>
              <strong>{{ formatCurrency(effectiveDueAmount) }}</strong>
            </div>
            <div class="cashregister-payout-summary__item">
              <span>Déjà payé</span>
              <strong>{{ formatCurrency(paymentSummary.paidAmount) }}</strong>
            </div>
            <div
              v-if="discountAmount > 0"
              class="cashregister-payout-summary__item cashregister-payout-summary__item--discount"
            >
              <span>
                <v-icon x-small>mdi-tag-percent-outline</v-icon>
                {{ discountLabel }}
              </span>
              <strong>-{{ formatCurrency(discountAmount) }}</strong>
            </div>
          </div>

          <section
            v-if="requiresPaymentMethod"
            class="cashregister-payout-methods"
          >
            <div class="cashregister-payout-section-title">
              Moyen de paiement
            </div>
            <v-radio-group
              v-model="selectedPaymentMethod"
              class="cashregister-payout-methods__group"
              hide-details
              row
            >
              <label
                v-for="method in shop_payment_methods"
                :key="method"
                role="radio"
                tabindex="0"
                :aria-checked="selectedPaymentMethod === method"
                :class="[
                  'cashregister-payout-method',
                  { 'cashregister-payout-method--active': selectedPaymentMethod === method },
                ]"
                @click="selectedPaymentMethod = method"
                @keydown.enter="selectedPaymentMethod = method"
                @keydown.space.prevent="selectedPaymentMethod = method"
              >
                <v-radio
                  :value="method"
                  class="cashregister-payout-method__radio"
                  hide-details
                ></v-radio>
                <v-icon>{{ paymentMethodIcon(method) }}</v-icon>
                <span>{{ method }}</span>
              </label>
            </v-radio-group>
          </section>
        </v-card-text>

        <v-card-actions class="cashregister-payout-actions">
          <v-btn
            v-if="requiresPaymentMethod"
            :disabled="loadingBtn"
            outlined
            color="warning"
            class="cashregister-payout-action text-none"
            @click="openDiscountDialog"
          >
            <v-icon left small>mdi-percent</v-icon>
            Remise
          </v-btn>
          <v-spacer></v-spacer>

          <v-btn
            :loading="loadingBtn"
            :disabled="confirmDisabled"
            color="success"
            depressed
            class="cashregister-payout-action cashregister-payout-action--confirm text-none"
            @click="requestReceiptChoice"
            >{{ actionButtonLabel }}
            <v-icon small right>mdi-cash-multiple</v-icon></v-btn
          >
          <v-btn
            :disabled="loadingBtn"
            outlined
            color="primary"
            class="cashregister-payout-action text-none"
            @click="btnNo"
          >
            Annuler <v-icon small right>mdi-close-circle</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="receiptDialog" max-width="560" persistent>
      <v-card class="cashregister-receipt-modal">
        <v-card-title class="cashregister-receipt-modal__title">
          Ticket de caisse
        </v-card-title>
        <v-card-text>
          <p class="cashregister-receipt-modal__copy">
            Voulez-vous imprimer un ticket pour
            <span class="cashregister-payout-order__numbers">
              {{ displayOrderNumbers }}
            </span>
            ?
          </p>
          <div class="cashregister-receipt-grid">
            <v-btn
              color="primary"
              class="cashregister-receipt-tile text-none"
              :disabled="receiptPrinting || loadingBtn"
              depressed
              dark
              @click="confirmReceiptChoice(true)"
            >
              <template v-if="receiptPrinting">
                <v-icon class="mb-2 mdi-spin">mdi-loading</v-icon>
                <span>Impression...</span>
              </template>
              <template v-else>
                <v-icon class="mb-2">mdi-printer-outline</v-icon>
                <span>Imprimer ticket</span>
              </template>
            </v-btn>
            <v-btn
              color="grey lighten-3"
              class="cashregister-receipt-tile text-none"
              depressed
              :disabled="receiptPrinting || loadingBtn"
              @click="confirmReceiptChoice(false)"
            >
              <v-icon class="mb-2">mdi-receipt-text-remove-outline</v-icon>
              <span>Pas de ticket</span>
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="discountDialog" max-width="520">
      <v-card>
        <v-card-title class="cashregister-discount-title">
          <v-icon color="warning" left>mdi-percent</v-icon>
          Remise globale
        </v-card-title>
        <v-card-text>
          <v-btn-toggle
            v-model="discountDraftType"
            mandatory
            color="primary"
            class="d-flex mb-4"
          >
            <v-btn value="percent" class="flex-grow-1 text-none">
              Pourcentage
            </v-btn>
            <v-btn value="amount" class="flex-grow-1 text-none">
              Montant en euros
            </v-btn>
          </v-btn-toggle>
          <div v-if="discountDraftType === 'percent'" class="d-flex flex-wrap">
            <v-btn
              v-for="percentage in discountPercentages"
              :key="percentage"
              outlined
              color="primary"
              class="mr-2 mb-2 text-none"
              @click="discountDraftValue = percentage"
            >
              {{ percentage }} %
            </v-btn>
          </div>
          <v-text-field
            v-model="discountDraftValue"
            :label="discountDraftType === 'percent' ? 'Pourcentage' : 'Montant de la remise'"
            :suffix="discountDraftType === 'percent' ? '%' : 'EUR'"
            type="number"
            min="0"
            step="0.01"
            outlined
            autofocus
          ></v-text-field>
          <div class="cashregister-payout-summary">
            <div class="cashregister-payout-summary__item">
              <span>Avant remise</span>
              <strong>{{ formatCurrency(paymentSummary.dueAmount) }}</strong>
            </div>
            <div class="cashregister-payout-summary__item">
              <span>Apres remise</span>
              <strong>{{ formatCurrency(discountPreview.total) }}</strong>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn text class="text-none" @click="clearDiscount">
            Supprimer
          </v-btn>
          <v-spacer />
          <v-btn text class="text-none" @click="discountDialog = false">
            Annuler
          </v-btn>
          <v-btn color="primary" class="text-none" @click="applyDiscount">
            Appliquer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
import price from '@/helpers/price'
import { calculateDiscount } from '@/helpers/discount'
import {
  buildCashierReceiptPayload,
  sendCashierReceipt,
} from '@/helpers/cashierReceipt'
const {
  archiveOrdersSafely,
  getCashRegisterPaymentSummary,
  normalizeOrderIds,
  resolveRetryDueOrderIds,
} = require('@/helpers/cashRegister')

export default {
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      id: this.$route.params.id,
      dialog: this.$route.query.modals,
      ordersToArchive: normalizeOrderIds(this.$route.query.orders),
      loadingBtn: false,
      ordersLoaded: false,
      selectedPaymentMethod: null,
      pendingPaymentMethod: null,
      receiptDialog: false,
      receiptPrinting: false,
      discountDialog: false,
      discountType: null,
      discountValue: null,
      discountDraftType: 'percent',
      discountDraftValue: 0,
      retryActive: false,
      retryDueOrderIds: [],
    }
  },
  computed: {
    shop_payment_methods() {
      return this.$store.get('shop/shop_payment_methods')
    },
    dataOrders() {
      return this.$store.get('orders/dataOrders') || []
    },
    selectedOrders() {
      const selectedIds = new Set(this.ordersToArchive)
      return this.dataOrders.filter((order) =>
        selectedIds.has(Number(order.id))
      )
    },
    displayOrderNumbers() {
      if (!this.selectedOrders.length) {
        return this.ordersLoaded ? 'numero indisponible' : 'chargement...'
      }
      return this.selectedOrders
        .map((order) => `#${order.ordernumber || order.orderNumber || 'numero indisponible'}`)
        .join(', ')
    },
    paymentSummary() {
      return getCashRegisterPaymentSummary(this.selectedOrders)
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
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
      }
    },
    discountPercentages() {
      return this.$store.get('shop/shop_discount_percentages') || [5, 10, 15, 20]
    },
    discountPreview() {
      return calculateDiscount({
        subtotal: this.paymentSummary.dueAmount,
        type: this.discountDraftType,
        value: this.discountDraftValue,
      })
    },
    effectiveDiscount() {
      if (this.discountType === null) {
        return calculateDiscount({
          subtotal: this.paymentSummary.dueAmount,
          type: 'none',
          value: 0,
        })
      }
      return calculateDiscount({
        subtotal: this.paymentSummary.dueAmount,
        type: this.discountType,
        value: this.discountValue,
      })
    },
    effectiveDiscountType() {
      return this.effectiveDiscount.amount > 0 ? this.effectiveDiscount.type : 'none'
    },
    effectiveDiscountValue() {
      return this.effectiveDiscount.amount > 0 ? this.effectiveDiscount.value : 0
    },
    discountAmount() {
      return this.effectiveDiscount.amount
    },
    effectiveDueAmount() {
      return this.effectiveDiscount.total
    },
    discountLabel() {
      if (this.effectiveDiscountType === 'percent') {
        return `Remise ${this.effectiveDiscountValue} %`
      }
      if (this.effectiveDiscountType === 'amount') {
        return `Remise ${this.formatCurrency(this.effectiveDiscountValue)}`
      }
      return 'Remise'
    },
    requiresPaymentMethod() {
      if (this.retryActive) return this.retryDueOrderIds.length > 0
      return this.paymentSummary.hasAmountDue
    },
    confirmDisabled() {
      return (
        !this.ordersLoaded ||
        this.loadingBtn ||
        !this.ordersToArchive.length ||
        (this.requiresPaymentMethod && this.selectedPaymentMethod === null)
      )
    },
    actionTitle() {
      return this.requiresPaymentMethod
        ? 'Encaisser la table'
        : 'Clôturer la table'
    },
    actionButtonLabel() {
      return this.requiresPaymentMethod ? 'Encaisser' : 'Clôturer'
    },
  },
  mounted() {
    this.$store.dispatch('orders/getAllOrder').finally(() => {
      this.ordersLoaded = true
    })
  },
  methods: {
    paymentMethodIcon(method) {
      const value = String(method || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
      if (value.includes('espece') || value.includes('cash')) {
        return 'mdi-cash-multiple'
      }
      if (value.includes('ticket')) {
        return 'mdi-ticket-confirmation-outline'
      }
      return 'mdi-credit-card-outline'
    },
    openDiscountDialog() {
      if (!this.requiresPaymentMethod || this.loadingBtn) return
      this.discountDraftType =
        !this.discountType || this.discountType === 'none'
          ? 'percent'
          : this.discountType
      this.discountDraftValue =
        !this.discountType || this.discountType === 'none' ? 0 : this.discountValue
      this.discountDialog = true
    },
    applyDiscount() {
      const preview = this.discountPreview
      if (!preview.value || !preview.amount) {
        this.clearDiscount()
        return
      }
      this.discountType = preview.type
      this.discountValue = preview.value
      this.discountDialog = false
    },
    clearDiscount() {
      this.discountType = 'none'
      this.discountValue = 0
      this.discountDraftValue = 0
      this.discountDialog = false
    },
    orderDiscountPayload(orderId) {
      if (this.discountType === null) return {}
      if (this.effectiveDiscountType === 'none') {
        return {
          discountType: this.effectiveDiscountType,
          discountValue: this.effectiveDiscountValue,
        }
      }
      const order = this.selectedOrders.find(
        (item) => Number(item.id) === Number(orderId)
      )
      if (!order || order.payment_status === 'paid') return {}
      const dueAmount = Number(this.paymentSummary.dueAmount) || 0
      const orderAmount = Number(order.subtotal) || 0
      if (dueAmount <= 0 || orderAmount <= 0) return {}
      const discountValue =
        this.effectiveDiscountType === 'percent'
          ? this.effectiveDiscountValue
          : this.roundPrice((this.discountAmount * orderAmount) / dueAmount)
      return {
        discountType: this.effectiveDiscountType,
        discountValue,
      }
    },
    requestReceiptChoice() {
      if (this.confirmDisabled) return
      this.pendingPaymentMethod = this.requiresPaymentMethod
        ? this.selectedPaymentMethod
        : null
      this.receiptDialog = true
    },
    confirmReceiptChoice(wantsReceipt) {
      if (this.loadingBtn || this.receiptPrinting) return
      this.receiptDialog = false
      return this.btnYes(wantsReceipt)
    },
    printReceiptsForOrders(orders, paymentMethod) {
      const printableOrders = Array.isArray(orders) ? orders : []
      if (!printableOrders.length) return
      this.receiptPrinting = true
      try {
        printableOrders.forEach((order) => {
          sendCashierReceipt({
            payload: buildCashierReceiptPayload({
              order,
              details: [],
              shopInfo: this.shopInfo,
              fallbackPaymentMethod: paymentMethod || order.payment,
              fallbackTable: this.id,
            }),
            smartPrint: this.shopInfo.smart_print_app,
            printerIp: this.shopInfo.shop_printer_ip,
            dispatch: this.$store.dispatch,
          })
        })
      } catch (error) {
        this.$store.dispatch(
          'notifications/error',
          error.message || "L'impression du ticket a echoue.",
          { root: true }
        )
      } finally {
        this.receiptPrinting = false
      }
    },
    btnNo() {
      if (this.loadingBtn) return

      this.receiptDialog = false
      this.dialog = false
      Promise.resolve()
        .then(() => this.$router.push('/cashregister'))
        .catch(() => {})
    },
    async btnYes(wantsReceipt = false) {
      if (this.loadingBtn) return

      this.loadingBtn = true
      const orderIds = this.ordersToArchive.slice()
      const receiptOrders = this.selectedOrders.slice()
      const paymentSummary = this.paymentSummary
      const initialDueOrderIds = this.retryActive
        ? this.retryDueOrderIds.slice()
        : paymentSummary.dueOrderIds.slice()
      const requiresPaymentMethod = this.requiresPaymentMethod
      const paymentMethod = requiresPaymentMethod
        ? this.pendingPaymentMethod
        : null

      try {
        if (!orderIds.length) {
          this.$store.dispatch(
            'notifications/error',
            'Aucune commande a archiver.',
            { root: true }
          )
          return
        }

        const archiveSummary = await archiveOrdersSafely(
          orderIds,
          (orderId) =>
            this.$store.dispatch('orders/archiveOrder', {
              id: orderId,
              payment_method: paymentMethod,
              ...this.orderDiscountPayload(orderId),
              notify: false,
            })
        )

        if (!archiveSummary.allSucceeded) {
          this.ordersToArchive = archiveSummary.failedOrderIds
          this.retryDueOrderIds = initialDueOrderIds.filter((orderId) =>
            archiveSummary.failedOrderIds.includes(orderId)
          )
          this.retryActive = true

          let refreshSucceeded = false
          try {
            refreshSucceeded =
              (await this.$store.dispatch('orders/getAllOrder', {
                refresh: Date.now(),
              })) === true
          } catch (error) {}

          const retryDueResolution = resolveRetryDueOrderIds({
            failedOrderIds: archiveSummary.failedOrderIds,
            fallbackDueOrderIds: this.retryDueOrderIds,
            refreshedOrders: this.dataOrders,
            refreshSucceeded,
          })
          this.ordersToArchive = retryDueResolution.orderIds
          this.retryDueOrderIds = retryDueResolution.dueOrderIds
          this.retryActive = this.ordersToArchive.length > 0

          if (!this.ordersToArchive.length) {
            this.$store.dispatch(
              'notifications/success',
              `${orderIds.length} commande(s) archivee(s) avec succes.`,
              { root: true }
            )
            this.dialog = false
            if (this.$route.path !== '/cashregister') {
              await Promise.resolve()
                .then(() => this.$router.push('/cashregister'))
                .catch(() => {})
            }
            return
          }

          await Promise.resolve()
            .then(() =>
              this.$router.replace({
                query: {
                  ...this.$route.query,
                  orders: this.ordersToArchive,
                },
              })
            )
            .catch(() => {})

          this.$store.dispatch(
            'notifications/error',
            `${this.ordersToArchive.length} commande(s) n'ont pas pu etre archivees.`,
            { root: true }
          )
          return
        }

        if (wantsReceipt) {
          const successfulIds = new Set(archiveSummary.successfulOrderIds)
          this.printReceiptsForOrders(
            receiptOrders.filter((order) => successfulIds.has(order.id)),
            paymentMethod
          )
        }

        try {
          await this.$store.dispatch('orders/getAllOrder', {
            refresh: Date.now(),
          })
        } catch (error) {}

        this.retryActive = false
        this.retryDueOrderIds = []
        this.pendingPaymentMethod = null
        this.$store.dispatch(
          'notifications/success',
          `${archiveSummary.successfulOrderIds.length} commande(s) archivee(s) avec succes.`,
          { root: true }
        )
        this.dialog = false
      } finally {
        this.loadingBtn = false
      }

      if (this.$route.path !== '/cashregister') {
        await Promise.resolve()
          .then(() => this.$router.push('/cashregister'))
          .catch(() => {})
      }
    },
  },
}
</script>
<style scoped>
.cashregister-payout-modal {
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-lg) !important;
  overflow: hidden;
}

.cashregister-payout-hero {
  align-items: center;
  background: var(--se-color-surface-muted);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  gap: 14px;
  padding: 18px 20px;
}

.cashregister-payout-hero__icon {
  align-items: center;
  background: var(--se-color-primary-soft);
  border-radius: var(--se-radius-lg);
  color: var(--se-color-primary);
  display: inline-flex;
  height: 48px;
  justify-content: center;
  width: 48px;
}

.cashregister-payout-hero__icon .v-icon {
  color: var(--se-color-primary);
}

.cashregister-payout-hero__copy {
  flex: 1;
  min-width: 0;
}

.cashregister-payout-hero h2 {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: 2px 0 0;
}

.cashregister-payout-order {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  margin: 6px 0 0;
}

.cashregister-payout-order__numbers {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-pill);
  color: var(--se-color-text);
  display: inline-flex;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
  line-height: 1.4;
  margin-left: 4px;
  padding: 2px 8px;
  vertical-align: middle;
}

.cashregister-payout-body {
  display: grid;
  gap: 16px;
  padding: 18px 20px !important;
}

.cashregister-payout-total {
  background: var(--se-color-primary-soft);
  border: 1px solid #cfe4ff;
  border-radius: var(--se-radius-md);
  display: grid;
  gap: 4px;
  padding: 18px;
  text-align: center;
}

.cashregister-payout-total span {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
}

.cashregister-payout-total strong {
  color: var(--se-color-text);
  font-size: 2rem;
  font-weight: var(--se-weight-bold);
  line-height: 1.1;
}

.cashregister-payout-total__orders {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  font-weight: var(--se-weight-bold);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.cashregister-payout-total small {
  color: var(--se-color-text-body);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-medium);
}

.cashregister-payout-summary {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  width: 100%;
}

.cashregister-payout-summary__item {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  display: grid;
  gap: 5px;
  padding: 12px;
}

.cashregister-payout-summary__item span {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
}

.cashregister-payout-summary__item strong {
  color: var(--se-color-text);
  font-size: var(--se-font-body);
}

.cashregister-payout-summary__item--discount {
  background: var(--se-color-warning-soft);
  border-color: #ffdca2;
}

.cashregister-payout-summary__item--discount span {
  align-items: center;
  display: inline-flex;
  gap: 5px;
}

.cashregister-payout-summary__item--discount .v-icon {
  color: var(--se-color-warning);
}

.cashregister-payout-section-title {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-bold);
  margin-bottom: 10px;
}

.cashregister-payout-methods__group {
  margin-top: 0;
}

::v-deep .cashregister-payout-methods__group .v-input--radio-group__input {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  width: 100%;
}

.cashregister-payout-method {
  align-items: center;
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  cursor: pointer;
  display: flex;
  gap: 10px;
  min-height: 56px;
  padding: 10px 12px;
}

.cashregister-payout-method--active {
  background: var(--se-color-primary-soft);
  border-color: var(--se-color-primary);
}

.cashregister-payout-method__radio {
  margin: 0 !important;
}

.cashregister-payout-method span {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
}

.cashregister-payout-actions {
  background: var(--se-color-surface-muted);
  border-top: 1px solid var(--se-color-border-soft);
  gap: 10px;
  padding: 14px 20px !important;
}

.cashregister-payout-action {
  border-radius: var(--se-radius-md) !important;
  min-height: 44px;
}

.cashregister-payout-action--confirm {
  min-width: 150px !important;
}

.cashregister-discount-title {
  align-items: center;
  color: var(--se-color-text);
  gap: 6px;
  font-weight: var(--se-weight-bold);
}

.cashregister-receipt-modal {
  border-radius: var(--se-radius-lg) !important;
}

.cashregister-receipt-modal__title {
  color: var(--se-color-text);
  font-weight: var(--se-weight-bold);
}

.cashregister-receipt-modal__copy {
  color: var(--se-color-text-body);
  margin-bottom: 16px;
}

.cashregister-receipt-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cashregister-receipt-tile {
  border-radius: var(--se-radius-md) !important;
  min-height: 132px;
}

::v-deep .cashregister-receipt-tile .v-btn__content {
  display: flex;
  flex-direction: column;
}

@media (max-width: 640px) {
  .cashregister-payout-hero,
  .cashregister-payout-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .cashregister-payout-actions .spacer {
    display: none;
  }

  .cashregister-payout-action,
  .cashregister-payout-action--confirm {
    width: 100%;
  }

  .cashregister-receipt-grid {
    grid-template-columns: 1fr;
  }
}
</style>
