<template>
  <v-container>
    <v-dialog v-model="dialog" persistent max-width="350">
      <v-card class="pa-3">
        <div class="text-center">
          <v-icon size="80" color="warning">mdi-information-outline</v-icon>
        </div>
        <v-card-title class="justify-center">
          <h3>
            {{ actionTitle }} <br />
            {{ id }} ?
          </h3>
          <h6>Commandes : {{ ordersToArchive.join(', ') }}</h6>

          <div class="cashregister-payout-summary">
            <div>
              <strong>À encaisser</strong><br />
              {{ formatCurrency(effectiveDueAmount) }}
            </div>
            <div>
              <strong>Déjà payé</strong><br />
              {{ formatCurrency(paymentSummary.paidAmount) }}
            </div>
          </div>
          <div
            v-if="discountAmount > 0"
            class="cashregister-payout-discount"
          >
            {{ discountLabel }} : -{{ formatCurrency(discountAmount) }}
          </div>

          <v-radio-group
            v-if="requiresPaymentMethod"
            v-model="selectedPaymentMethod"
          >
            <v-radio
              v-for="method in shop_payment_methods"
              :key="method"
              :label="method"
              :value="method"
            ></v-radio>
          </v-radio-group>
        </v-card-title>
        <v-card-text v-if="requiresPaymentMethod" class="text-center">
          <p>Assurez vous d'avoir encaissé avant de valider</p>
        </v-card-text>
        <v-card-text v-else class="text-center">
          <p>Ces commandes sont déjà payées. Vous pouvez les clôturer.</p>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="requiresPaymentMethod"
            :disabled="loadingBtn"
            color="warning"
            class="text-none"
            @click="openDiscountDialog"
          >
            Remise <v-icon small right>mdi-tag-percent-outline</v-icon>
          </v-btn>
          <v-spacer></v-spacer>

          <v-btn
            :loading="loadingBtn"
            :disabled="confirmDisabled"
            color="success"
            class="text-none"
            @click="btnYes"
            >{{ actionButtonLabel }}
            <v-icon small right>mdi-cash-multiple</v-icon></v-btn
          >
          <v-btn
            :disabled="loadingBtn"
            color="primary"
            class="text-none"
            @click="btnNo"
            >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="discountDialog" max-width="520">
      <v-card>
        <v-card-title>Remise globale</v-card-title>
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
            :suffix="discountDraftType === 'percent' ? '%' : '€'"
            type="number"
            min="0"
            step="0.01"
            outlined
            autofocus
          ></v-text-field>
          <div class="cashregister-payout-summary">
            <div>
              <strong>Avant remise</strong><br />
              {{ formatCurrency(paymentSummary.dueAmount) }}
            </div>
            <div>
              <strong>Après remise</strong><br />
              {{ formatCurrency(discountPreview.total) }}
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
    paymentSummary() {
      return getCashRegisterPaymentSummary(this.selectedOrders)
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
    btnNo() {
      if (this.loadingBtn) return

      this.dialog = false
      Promise.resolve()
        .then(() => this.$router.push('/cashregister'))
        .catch(() => {})
    },
    async btnYes() {
      if (this.loadingBtn) return

      this.loadingBtn = true
      const orderIds = this.ordersToArchive.slice()
      const paymentSummary = this.paymentSummary
      const initialDueOrderIds = this.retryActive
        ? this.retryDueOrderIds.slice()
        : paymentSummary.dueOrderIds.slice()
      const requiresPaymentMethod = this.requiresPaymentMethod
      const paymentMethod = requiresPaymentMethod
        ? this.selectedPaymentMethod
        : null

      try {
        if (!orderIds.length) {
          this.$store.dispatch(
            'notifications/error',
            'Aucune commande à archiver.',
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
              `${orderIds.length} commande(s) archivée(s) avec succès.`,
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
            `${this.ordersToArchive.length} commande(s) n'ont pas pu être archivées.`,
            { root: true }
          )
          return
        }

        try {
          await this.$store.dispatch('orders/getAllOrder', {
            refresh: Date.now(),
          })
        } catch (error) {}

        this.retryActive = false
        this.retryDueOrderIds = []
        this.$store.dispatch(
          'notifications/success',
          `${archiveSummary.successfulOrderIds.length} commande(s) archivée(s) avec succès.`,
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
.cashregister-payout-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  width: 100%;
}
</style>
