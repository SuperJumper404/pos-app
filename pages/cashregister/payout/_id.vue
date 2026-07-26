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
              {{ formatCurrency(paymentSummary.dueAmount) }}
            </div>
            <div>
              <strong>Déjà payé</strong><br />
              {{ formatCurrency(paymentSummary.paidAmount) }}
            </div>
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
          <v-btn color="primary" class="text-none" @click="btnNo"
            >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
import price from '@/helpers/price'
const {
  getCashRegisterPaymentSummary,
  normalizeOrderIds,
  summarizeArchiveResults,
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
    requiresPaymentMethod() {
      return this.paymentSummary.hasAmountDue
    },
    confirmDisabled() {
      return (
        !this.ordersLoaded ||
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
    btnNo() {
      this.dialog = false
      this.$router.push('/cashregister')
    },
    async btnYes() {
      this.loadingBtn = true
      const orderIds = this.ordersToArchive.slice()
      const paymentMethod = this.requiresPaymentMethod
        ? this.selectedPaymentMethod
        : null
      let allSucceeded = false

      try {
        const archiveResults = await Promise.allSettled(
          orderIds.map((orderId) =>
            Promise.resolve().then(() =>
              this.$store.dispatch('orders/archiveOrder', {
                id: orderId,
                payment_method: paymentMethod,
              })
            )
          )
        )
        const archiveSummary = summarizeArchiveResults(
          orderIds,
          archiveResults.map(
            (result) => result.status === 'fulfilled' && result.value
          )
        )

        await this.$store.dispatch('orders/getAllOrder', { refresh: Date.now() })

        if (!archiveSummary.allSucceeded) {
          this.ordersToArchive = archiveSummary.failedOrderIds
          this.$store.dispatch(
            'notifications/error',
            `${archiveSummary.failedOrderIds.length} commande(s) n'ont pas pu être archivées.`,
            { root: true }
          )
          return
        }

        this.dialog = false
        allSucceeded = true
      } finally {
        this.loadingBtn = false
      }

      if (allSucceeded) this.$router.push('/cashregister')
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
