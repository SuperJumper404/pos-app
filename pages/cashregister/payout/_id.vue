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
            :disabled="loadingBtn || terminalBusy"
            width="44"
            height="44"
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
              :disabled="paymentControlsLocked"
              class="cashregister-payout-methods__group"
              hide-details
              row
            >
              <label
                v-for="method in paymentMethods"
                :key="method"
                role="radio"
                :tabindex="paymentControlsLocked ? -1 : 0"
                :aria-disabled="paymentControlsLocked"
                :aria-checked="selectedPaymentMethod === method"
                :class="[
                  'cashregister-payout-method',
                  { 'cashregister-payout-method--active': selectedPaymentMethod === method },
                ]"
                @click="selectPaymentMethod(method)"
                @keydown.enter="selectPaymentMethod(method)"
                @keydown.space.prevent="selectPaymentMethod(method)"
              >
                <v-radio
                  :value="method"
                  class="cashregister-payout-method__radio"
                  hide-details
                ></v-radio>
                <v-icon>{{ paymentMethodIcon(method) }}</v-icon>
                <span>{{ paymentMethodLabel(method) }}</span>
              </label>
            </v-radio-group>
          </section>
          <TerminalPaymentStatus
            v-if="showTerminalStatus"
            :state="terminalState"
            :reader-label="currentReader ? currentReader.label : ''"
            :amount="terminalPayment ? formatCurrency(terminalPayment.amountCents / 100) : formatCurrency(effectiveDueAmount)"
            :message="terminalNotice"
            :busy="terminalBusy"
            :canceling="terminalCanceling"
            :can-cancel="canCancelTerminalPayment"
            @retry="retryTerminalPayment"
            @cancel="cancelTerminalPayment"
          />
        </v-card-text>

        <v-card-actions class="cashregister-payout-actions">
          <v-btn
            v-if="requiresPaymentMethod"
            :disabled="paymentControlsLocked"
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
            :loading="loadingBtn || terminalBusy"
            :disabled="confirmDisabled"
            color="success"
            depressed
            class="cashregister-payout-action cashregister-payout-action--confirm text-none"
            @click="requestReceiptChoice"
            >{{ actionButtonLabel }}
            <v-icon small right>mdi-cash-multiple</v-icon></v-btn
          >
          <v-btn
            :disabled="loadingBtn || terminalBusy"
            outlined
            color="primary"
            class="cashregister-payout-action text-none"
            @click="btnNo"
          >
            {{ showTerminalStatus ? 'Fermer' : 'Annuler' }} <v-icon small right>mdi-close-circle</v-icon>
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
              {{ receiptOrderNumbers }}
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
import TerminalPaymentStatus from '@/components/cashregister/TerminalPaymentStatus.vue'
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
  matchesCashRegisterTerminalAttempt,
  cashRegisterTerminalPayload,
  terminalAttemptKey,
  terminalRecoveryCollection,
  terminalReceiptSnapshot,
  terminalReceiptWithDetails,
  terminalAttemptTotalCents,
  hasTerminalAttemptIdentity,
} = require('@/helpers/cashRegister')
const {
  isTerminalMethod,
  isTerminalPaymentPending,
  terminalErrorMessage,
  terminalPaymentMessage,
  hasSettledTerminalAllocations,
} = require('@/helpers/stripeTerminal')

export default {
  components: { TerminalPaymentStatus },
  mixins: [price],
  beforeRouteLeave(to, from, next) {
    if (this.loadingBtn && this.dialog) return next(false)
    this.disposeTerminalFlow()
    next()
  },
  beforeRouteUpdate(to, from, next) {
    if (this.loadingBtn) {
      const ids = normalizeOrderIds(to.query.orders)
      const archiveRetry = to.params.id === this.id &&
        ids.join(',') === this.ordersToArchive.join(',')
      return next(archiveRetry ? undefined : false)
    }
    next()
  },
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
      terminalState: 'idle',
      terminalPayment: null,
      terminalAttempt: null,
      terminalReceiptOrders: [],
      terminalSettlements: {},
      terminalNotice: '',
      terminalBusy: false,
      terminalCanceling: false,
      terminalChecking: true,
      terminalReaderReady: false,
      terminalPollTimer: null,
      terminalPollCount: 0,
      terminalGeneration: 0,
      terminalDisposed: false,
    }
  },
  computed: {
    cashierIdentity() {
      const user = this.$store.get('users/user')
      return this.$store.get('authenticated') && user && user.id && user.shopid
        ? `${user.shopid}:${user.id}` : null
    },
    terminalStorageKey() {
      return `cashregister-terminal:${this.cashierIdentity}`
    },
    currentReader() {
      return this.$store.get('stripeTerminal/currentReader')
    },
    terminalAvailable() {
      const user = this.$store.get('users/user')
      return Boolean(this.terminalReaderReady && this.cashierIdentity && this.currentReader &&
        this.currentReader.isActive &&
        this.currentReader.assignedUserId === Number(user.id))
    },
    paymentMethods() {
      const manual = (this.shop_payment_methods || []).filter((method) => !isTerminalMethod(method))
      return this.terminalAvailable ? [...manual, 'stripe_terminal'] : manual
    },
    paymentControlsLocked() {
      return this.loadingBtn || this.receiptDialog || this.terminalChecking ||
        this.terminalBusy || ['starting', 'processing', 'recovery', 'succeeded'].includes(this.terminalState)
    },
    showTerminalStatus() {
      return isTerminalMethod(this.selectedPaymentMethod) || this.terminalState !== 'idle'
    },
    canCancelTerminalPayment() {
      return isTerminalPaymentPending(this.terminalPayment)
    },
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
      ).map((order) => this.terminalSettlements[order.id] || order)
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
    receiptOrderNumbers() {
      if (!this.terminalReceiptOrders.length) return this.displayOrderNumbers
      return this.terminalReceiptOrders
        .map((order) => `#${order.ordernumber || order.orderNumber || 'numero indisponible'}`)
        .join(', ')
    },
    needsTerminalReceipt() {
      return this.selectedOrders.some((order) => order.stripe_terminal_payment_id && !this.terminalSettlements[order.id])
    },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_siret: this.$store.get('shop/shop_siret'),
        shop_naf: this.$store.get('shop/shop_naf'),
        shop_vat_number: this.$store.get('shop/shop_vat_number'),
        receipt_review_qr_url: this.$store.get('shop/receipt_review_qr_url'),
        receipt_review_qr_label: this.$store.get('shop/receipt_review_qr_label'),
        cash_register_number: this.$store.get('shop/cash_register_number'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_mail: this.$store.get('shop/shop_mail'),
        shop_description: this.$store.get('shop/shop_description'),
        shop_hours: this.$store.get('shop/shop_hours'),
        shop_payment_methods: this.$store.get('shop/shop_payment_methods'),
        shop_profile_image: this.$store.get('shop/shop_profile_image'),
        shop_status: this.$store.get('shop/shop_status'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
        activate_tva: this.$store.get('shop/activate_tva'),
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
        this.receiptDialog ||
        this.terminalChecking ||
        this.terminalBusy ||
        ['starting', 'processing', 'recovery'].includes(this.terminalState) ||
        (isTerminalMethod(this.selectedPaymentMethod) && this.requiresPaymentMethod && !this.terminalReceiptOrders.length && !this.terminalAvailable) ||
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
      if (this.terminalReceiptOrders.length) return 'Clôturer le paiement'
      return this.requiresPaymentMethod ? 'Encaisser' : 'Clôturer'
    },
  },
  watch: {
    $route(to) {
      if (!to.path.startsWith('/cashregister/payout/')) return
      const ids = normalizeOrderIds(to.query.orders)
      if (to.params.id === this.id && ids.join(',') === this.ordersToArchive.join(',')) return
      this.disposeTerminalFlow()
      const generation = this.terminalGeneration
      Object.assign(this, this.$options.data.call(this), { terminalGeneration: generation })
      return this.initializePayout()
    },
    cashierIdentity() {
      this.disposeTerminalFlow()
      this.ordersLoaded = false
      this.receiptDialog = false
      this.dialog = false
    },
  },
  mounted() {
    return this.initializePayout()
  },
  beforeDestroy() {
    this.disposeTerminalFlow()
  },
  methods: {
    paymentMethodLabel(method) {
      return isTerminalMethod(method) ? 'Carte bancaire - TPE Stripe' : method
    },
    selectPaymentMethod(method) {
      if (this.paymentControlsLocked) return
      this.selectedPaymentMethod = method
      this.terminalState = 'idle'
      this.terminalNotice = ''
    },
    stopTerminalPolling() {
      if (this.terminalPollTimer !== null) clearTimeout(this.terminalPollTimer)
      this.terminalPollTimer = null
    },
    disposeTerminalFlow() {
      this.stopTerminalPolling()
      this.terminalGeneration += 1
      this.terminalDisposed = true
    },
    terminalRequestIsCurrent(generation) {
      return !this.terminalDisposed && generation === this.terminalGeneration && Boolean(this.cashierIdentity)
    },
    readTerminalCollection() {
      try {
        return terminalRecoveryCollection(JSON.parse(sessionStorage.getItem(this.terminalStorageKey)))
      } catch (error) { return terminalRecoveryCollection(null) }
    },
    rememberTerminalAttempt(attempt) {
      const saved = this.readTerminalCollection()
      const previousKey = terminalAttemptKey(this.terminalAttempt)
      if (!attempt) {
        if (previousKey) delete saved.records[previousKey]
      } else {
        const key = terminalAttemptKey(attempt)
        if (!key) return
        if (previousKey && this.terminalAttempt.paymentId === attempt.paymentId && attempt.paymentId) {
          delete saved.records[previousKey]
        }
        if (attempt.paymentId) delete saved.records[terminalAttemptKey({ orderIds: attempt.orderIds })]
        saved.records[key] = attempt
      }
      this.terminalAttempt = attempt
      try {
        if (Object.keys(saved.records).length) sessionStorage.setItem(this.terminalStorageKey, JSON.stringify(saved))
        else sessionStorage.removeItem(this.terminalStorageKey)
      } catch (error) {
        // Backend idempotency still protects starts when tab storage is unavailable.
      }
    },
    resolveTerminalArchives(orderIds) {
      const attempt = this.terminalAttempt
      if (!attempt || attempt.status !== 'succeeded') return
      const archivedOrderIds = [...new Set([...(attempt.archivedOrderIds || []), ...orderIds])]
        .filter((id) => attempt.orderIds.includes(id))
      this.rememberTerminalAttempt(attempt.orderIds.every((id) => archivedOrderIds.includes(id))
        ? null : { ...attempt, archivedOrderIds })
    },
    readTerminalAttempt(includeUnrelated = false) {
      const records = Object.values(this.readTerminalCollection().records)
      const cached = this.$store.get('stripeTerminal/activePayment')
      if (cached && isTerminalPaymentPending(cached)) {
        records.push({ orderIds: cached.orderIds, paymentId: cached.id })
      }
      const selected = this.dataOrders.filter((order) => this.ordersToArchive.includes(Number(order.id)))
      const linked = selected.find((order) => order.stripe_terminal_payment_id &&
        !this.terminalSettlements[order.id])
      if (linked) return records.find((a) => a.paymentId === Number(linked.stripe_terminal_payment_id)) || {
        paymentId: Number(linked.stripe_terminal_payment_id),
        orderIds: selected.filter((o) => o.stripe_terminal_payment_id === linked.stripe_terminal_payment_id).map((o) => Number(o.id)),
      }
      const due = this.paymentSummary.dueOrderIds
      return records.find((a) => a.paymentId && matchesCashRegisterTerminalAttempt(a, due)) ||
        records.find((a) => matchesCashRegisterTerminalAttempt(a, due)) ||
        records.find((a) => a.paymentId && a.orderIds.some((id) => this.ordersToArchive.includes(id))) ||
        (includeUnrelated ? records.find((a) => a.paymentId && a.status !== 'succeeded') : null) || null
    },
    async refreshRememberedTerminalPayment(paymentId, generation) {
      await this.terminalDispatch('stripeTerminal/resetPayment')
      if (!this.terminalRequestIsCurrent(generation)) return false
      return this.terminalDispatch('stripeTerminal/refreshPayment', paymentId)
    },
    terminalAmountAllowed(attempt) {
      const total = terminalAttemptTotalCents(attempt, this.paymentSummary.dueAmount)
      if (total !== null && total >= 50) return true
      if (hasTerminalAttemptIdentity(attempt)) { this.terminalRecovery(); return false }
      if (matchesCashRegisterTerminalAttempt(attempt, this.paymentSummary.dueOrderIds) &&
        this.readTerminalCollection().records[terminalAttemptKey(attempt)]) {
        this.terminalAttempt = attempt
        this.rememberTerminalAttempt(null)
      }
      this.terminalState = 'idle'
      this.terminalNotice = 'Le montant à encaisser par TPE doit être au moins de 0,50 €. Modifiez la remise ou choisissez un autre moyen.'
      return false
    },
    terminalRecovery() {
      this.stopTerminalPolling()
      this.terminalState = 'recovery'
      const error = this.$store.get('stripeTerminal/error')
      this.terminalNotice = terminalErrorMessage(error && error.code) ||
        'Le paiement doit être vérifié avant de poursuivre.'
    },
    async terminalDispatch(action, payload) {
      try { return await this.$store.dispatch(action, payload) } catch (error) { return false }
    },
    async initializePayout() {
      const generation = this.terminalGeneration
      this.terminalChecking = true
      const loaded = await this.terminalDispatch('orders/getAllOrder')
      if (!this.terminalRequestIsCurrent(generation)) return
      this.ordersLoaded = loaded === true
      const reader = await this.terminalDispatch('stripeTerminal/getCurrentReader')
      if (!this.terminalRequestIsCurrent(generation)) return
      this.terminalReaderReady = reader !== false
      this.terminalChecking = false
      if (!this.ordersLoaded) { this.terminalRecovery(); return }
      const recovered = await this.recoverPaidTerminalOrders()
      if (!this.terminalRequestIsCurrent(generation)) return
      if (recovered) { this.offerTerminalReceipt(); return }
      this.terminalAttempt = this.readTerminalAttempt()
      if (this.terminalAttempt) return this.retryTerminalPayment()
    },
    async startTerminalPayment() {
      if (this.terminalBusy || this.terminalChecking || this.terminalDisposed || !this.terminalAvailable) return
      this.terminalBusy = true
      this.terminalState = 'starting'
      this.terminalPollCount = 0
      this.terminalNotice = ''
      const generation = this.terminalGeneration
      try {
        if (!await this.refreshTerminalOrders(generation)) return
        if (await this.recoverPaidTerminalOrders() || !this.terminalRequestIsCurrent(generation)) return
        // A fresh order snapshot and saved attempt are checked before any POST.
        const saved = this.readTerminalAttempt(true)
        const attempt = saved || cashRegisterTerminalPayload({
          orderIds: this.retryActive ? this.retryDueOrderIds : this.paymentSummary.dueOrderIds,
          discountType: this.discountType === null ? null : this.effectiveDiscountType,
          discountValue: this.effectiveDiscountValue,
        })
        if (!attempt.paymentId && !matchesCashRegisterTerminalAttempt(attempt, this.paymentSummary.dueOrderIds)) {
          this.terminalState = 'idle'
          this.terminalNotice = 'La sélection a changé. Vérifiez les commandes avant de poursuivre.'
          return
        }
        if (!attempt.paymentId && !this.terminalAmountAllowed(attempt)) return
        this.rememberTerminalAttempt(attempt.paymentId ? attempt : { ...attempt,
          validatedAmountCents: attempt.validatedAmountCents ?? terminalAttemptTotalCents(attempt, this.paymentSummary.dueAmount) })
        const result = attempt.paymentId
          ? await this.refreshRememberedTerminalPayment(attempt.paymentId, generation)
          : await this.terminalDispatch('stripeTerminal/startPayment', attempt)
        if (!this.terminalRequestIsCurrent(generation)) return
        await this.acceptTerminalPayment(result, generation)
      } finally {
        if (this.terminalRequestIsCurrent(generation)) {
          this.terminalBusy = false
          this.offerTerminalReceipt()
        }
      }
    },
    async refreshTerminalOrders(generation) {
      const loaded = await this.terminalDispatch('orders/getAllOrder', { refresh: Date.now() })
      if (!this.terminalRequestIsCurrent(generation)) return false
      this.ordersLoaded = loaded === true
      if (!this.ordersLoaded || this.selectedOrders.length !== this.ordersToArchive.length) {
        this.terminalRecovery()
        return false
      }
      if (this.retryActive) {
        const retry = resolveRetryDueOrderIds({
          failedOrderIds: this.ordersToArchive,
          fallbackDueOrderIds: this.retryDueOrderIds,
          refreshedOrders: this.dataOrders,
          refreshSucceeded: true,
        })
        if (!retry.reliable) { this.terminalRecovery(); return false }
        this.retryDueOrderIds = retry.dueOrderIds
      }
      return true
    },
    async retryTerminalPayment() {
      if (this.terminalBusy || this.terminalDisposed) return
      this.stopTerminalPolling()
      this.terminalPollCount = 0
      this.terminalBusy = true
      this.terminalState = 'recovery'
      const generation = this.terminalGeneration
      try {
        if (!await this.refreshTerminalOrders(generation)) return
        if (await this.recoverPaidTerminalOrders() || !this.terminalRequestIsCurrent(generation)) return
        const discovered = this.readTerminalAttempt()
        const attempt = discovered && discovered.paymentId ? discovered : this.terminalAttempt || discovered
        if (!attempt) {
          this.terminalState = 'idle'
          this.terminalNotice = ''
          return
        }
        if (!attempt.paymentId && !matchesCashRegisterTerminalAttempt(attempt, this.paymentSummary.dueOrderIds)) {
          this.terminalState = 'idle'
          this.terminalNotice = 'La sélection a changé. Le paiement précédent reste à vérifier séparément.'
          this.terminalAttempt = null
          return
        }
        if (!attempt.paymentId && !this.terminalAmountAllowed(attempt)) return
        this.selectedPaymentMethod = 'stripe_terminal'
        this.terminalAttempt = attempt
        if (!attempt.paymentId) this.rememberTerminalAttempt({ ...attempt,
          validatedAmountCents: attempt.validatedAmountCents ?? terminalAttemptTotalCents(attempt, this.paymentSummary.dueAmount) })
        const result = attempt.paymentId
          ? await this.refreshRememberedTerminalPayment(attempt.paymentId, generation)
          : await this.terminalDispatch('stripeTerminal/startPayment', attempt)
        if (!this.terminalRequestIsCurrent(generation)) return
        await this.acceptTerminalPayment(result, generation)
      } finally {
        if (this.terminalRequestIsCurrent(generation)) {
          this.terminalBusy = false
          this.offerTerminalReceipt()
        }
      }
    },
    async recoverPaidTerminalOrders() {
      const paid = this.dataOrders.filter((order) => this.ordersToArchive.includes(Number(order.id)) &&
        !this.terminalSettlements[order.id] && order.payment_status === 'paid' &&
        order.payment_provider === 'stripe_terminal' &&
        Number.isSafeInteger(Number(order.stripe_terminal_payment_id)) && Number(order.stripe_terminal_payment_id) > 0 &&
        Number.isSafeInteger(order.stripe_terminal_amount_cents) && order.stripe_terminal_amount_cents >= 0)
      if (!paid.length) return false
      const paymentId = Number(paid[0].stripe_terminal_payment_id)
      const orders = paid.filter((order) => Number(order.stripe_terminal_payment_id) === paymentId)
      const allocations = orders.map((order) => ({ orderId: Number(order.id), amountCents: order.stripe_terminal_amount_cents }))
      const payment = { id: paymentId, status: 'succeeded', currency: 'eur', allocations,
        orderIds: allocations.map((a) => a.orderId), amountCents: allocations.reduce((sum, a) => sum + a.amountCents, 0) }
      if (!hasSettledTerminalAllocations(payment)) return false
      this.stopTerminalPolling()
      this.terminalState = 'recovery'
      const generation = this.terminalGeneration
      const cached = this.$store.get('stripeTerminal/activePayment')
      if (!cached || cached.id === paymentId) await this.terminalDispatch('stripeTerminal/resetPayment')
      if (!this.terminalRequestIsCurrent(generation)) return true
      this.selectedPaymentMethod = 'stripe_terminal'
      this.terminalPayment = payment
      this.terminalNotice = terminalPaymentMessage(payment)
      this.terminalAttempt = Object.values(this.readTerminalCollection().records).find((a) => a.paymentId === paymentId) ||
        { paymentId, orderIds: payment.orderIds }
      this.setTerminalReceiptOrders(orders, payment)
      return true
    },
    setTerminalReceiptOrders(orders, payment) {
      this.terminalReceiptOrders = terminalReceiptSnapshot(orders, payment)
      this.terminalSettlements = { ...this.terminalSettlements,
        ...Object.fromEntries(this.terminalReceiptOrders.map((order) => [order.id, order])) }
      if (this.retryActive) this.retryDueOrderIds = this.retryDueOrderIds.filter((id) => !payment.orderIds.includes(id))
      this.terminalState = this.terminalReceiptOrders.length ? 'succeeded' : 'idle'
      this.rememberTerminalAttempt({ ...this.terminalAttempt, status: 'succeeded' })
    },
    async acceptTerminalPayment(payment, generation) {
      this.stopTerminalPolling()
      const attempt = this.terminalAttempt
      if (!payment || !attempt || !Array.isArray(payment.orderIds) ||
        (attempt.paymentId && payment.id !== attempt.paymentId)) {
        this.terminalRecovery()
        return
      }
      const matching = matchesCashRegisterTerminalAttempt(attempt, payment.orderIds)
      if (!matching && !attempt.paymentId) this.rememberTerminalAttempt(null)
      this.terminalPayment = payment
      this.rememberTerminalAttempt({ ...(matching ? attempt : {}), orderIds: payment.orderIds, paymentId: payment.id })
      this.terminalNotice = terminalPaymentMessage(payment)
      const unrelated = !payment.orderIds.some((id) => this.ordersToArchive.includes(id))
      if (unrelated) this.terminalNotice = `Paiement des autres commandes (${payment.orderIds.join(', ')}). ${this.terminalNotice}`
      if (isTerminalPaymentPending(payment)) {
        this.terminalState = payment.status === 'creating' ? 'starting' : 'processing'
        this.scheduleTerminalPoll()
      } else if (payment.status === 'succeeded') {
        if (!hasSettledTerminalAllocations(payment)) { this.terminalRecovery(); return }
        if (!await this.refreshTerminalOrders(generation)) return
        this.setTerminalReceiptOrders(
          this.dataOrders.filter((order) => this.ordersToArchive.includes(Number(order.id))), payment
        )
      } else if (['failed', 'canceled'].includes(payment.status)) {
        this.terminalState = payment.status
        this.rememberTerminalAttempt(null)
      } else {
        this.terminalRecovery()
      }
    },
    offerTerminalReceipt() {
      if (this.terminalState === 'succeeded' && this.terminalReceiptOrders.length && !this.receiptDialog) {
        this.requestReceiptChoice()
      }
    },
    scheduleTerminalPoll() {
      if (this.terminalDisposed) return
      if (this.terminalPollCount >= 60) { this.terminalRecovery(); return }
      this.terminalPollTimer = setTimeout(() => this.pollTerminalPayment(), 2000)
    },
    async pollTerminalPayment() {
      this.stopTerminalPolling()
      if (this.terminalDisposed || this.terminalBusy || !this.terminalPayment) return
      const generation = this.terminalGeneration
      this.terminalPollCount += 1
      this.terminalBusy = true
      const payment = await this.terminalDispatch('stripeTerminal/refreshPayment', this.terminalPayment.id)
      if (!this.terminalRequestIsCurrent(generation)) return
      await this.acceptTerminalPayment(payment, generation)
      if (!this.terminalRequestIsCurrent(generation)) return
      this.terminalBusy = false
      this.offerTerminalReceipt()
    },
    async cancelTerminalPayment() {
      if (!this.canCancelTerminalPayment || this.terminalBusy || this.terminalDisposed) return
      this.stopTerminalPolling()
      const generation = this.terminalGeneration
      this.terminalBusy = true
      this.terminalCanceling = true
      this.terminalNotice = 'Annulation demandée. Confirmation en cours.'
      const payment = await this.terminalDispatch('stripeTerminal/cancelPayment', this.terminalPayment.id)
      if (!this.terminalRequestIsCurrent(generation)) return
      await this.acceptTerminalPayment(payment, generation)
      if (!this.terminalRequestIsCurrent(generation)) return
      this.terminalBusy = false
      this.terminalCanceling = false
      if (isTerminalPaymentPending(payment)) {
        this.terminalNotice = 'Annulation non confirmée. Le paiement est toujours en cours.'
      }
      this.offerTerminalReceipt()
    },
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
      if (!this.requiresPaymentMethod || this.paymentControlsLocked) return
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
      if (this.terminalSettlements[orderId]) return {}
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
      if (!this.terminalReceiptOrders.length && this.needsTerminalReceipt) return this.retryTerminalPayment()
      if (isTerminalMethod(this.selectedPaymentMethod) && this.requiresPaymentMethod && !this.terminalReceiptOrders.length) {
        return this.startTerminalPayment()
      }
      this.pendingPaymentMethod = this.requiresPaymentMethod && !this.terminalReceiptOrders.length
        ? this.selectedPaymentMethod
        : null
      this.receiptDialog = true
    },
    confirmReceiptChoice(wantsReceipt) {
      if (this.loadingBtn || this.receiptPrinting || !this.receiptDialog) return
      this.receiptDialog = false
      return this.btnYes(wantsReceipt)
    },
    async buildReceiptOrdersWithDetails(orders) {
      const printableOrders = Array.isArray(orders) ? orders : []
      const ordersWithDetails = []

      for (const order of printableOrders) {
        let details = []
        try {
          const loaded = await this.$store.dispatch(
            'orders/getDetailOrder',
            order.id
          )
          details = loaded ? this.$store.get('orders/detailOrder') || [] : []
        } catch (error) {
          details = []
        }
        ordersWithDetails.push(this.terminalSettlements[order.id]
          ? terminalReceiptWithDetails(order, details)
          : { ...order, receiptDetails: details.slice() })
      }

      return ordersWithDetails
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
              details: order.receiptDetails || [],
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
      if (this.terminalBusy) return
      this.disposeTerminalFlow()

      this.receiptDialog = false
      this.dialog = false
      Promise.resolve()
        .then(() => this.$router.push('/cashregister'))
        .catch(() => {})
    },
    async btnYes(wantsReceipt = false) {
      if (this.loadingBtn) return
      const terminalArchive = this.terminalReceiptOrders.length > 0
      if (this.terminalBusy || this.terminalChecking ||
        ['starting', 'processing', 'recovery'].includes(this.terminalState) ||
        (!terminalArchive && this.needsTerminalReceipt) ||
        (isTerminalMethod(this.selectedPaymentMethod) && this.requiresPaymentMethod && !terminalArchive)) return

      this.loadingBtn = true
      const receiptOrders = (terminalArchive ? this.terminalReceiptOrders : this.selectedOrders).slice()
      const orderIds = terminalArchive ? receiptOrders.map((order) => Number(order.id)) : this.ordersToArchive.slice()
      const untouchedOrderIds = this.ordersToArchive.filter((id) => !orderIds.includes(id))
      const paymentSummary = this.paymentSummary
      const initialDueOrderIds = this.retryActive
        ? this.retryDueOrderIds.slice()
        : paymentSummary.dueOrderIds.slice()
      const requiresPaymentMethod = !terminalArchive && this.requiresPaymentMethod
      const paymentMethod = requiresPaymentMethod
        ? this.pendingPaymentMethod
        : null
      const receiptOrdersWithDetails = wantsReceipt
        ? await this.buildReceiptOrdersWithDetails(receiptOrders)
        : []

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

        if (terminalArchive) this.resolveTerminalArchives(archiveSummary.successfulOrderIds)

        if (!archiveSummary.allSucceeded) {
          this.ordersToArchive = archiveSummary.failedOrderIds
          if (terminalArchive) this.ordersToArchive = [...this.ordersToArchive, ...untouchedOrderIds]
          this.retryDueOrderIds = initialDueOrderIds.filter((orderId) =>
            this.ordersToArchive.includes(orderId)
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
            failedOrderIds: this.ordersToArchive,
            fallbackDueOrderIds: this.retryDueOrderIds,
            refreshedOrders: this.dataOrders,
            refreshSucceeded,
          })
          this.ordersToArchive = retryDueResolution.orderIds
          this.retryDueOrderIds = retryDueResolution.dueOrderIds
          this.retryActive = this.ordersToArchive.length > 0
          if (terminalArchive) {
            this.retryDueOrderIds = this.retryDueOrderIds.filter((id) => !this.terminalSettlements[id])
            if (retryDueResolution.reliable) this.resolveTerminalArchives(
              archiveSummary.failedOrderIds.filter((id) => !this.ordersToArchive.includes(id))
            )
            this.terminalReceiptOrders = receiptOrders.filter((order) => this.ordersToArchive.includes(Number(order.id)))
            if (!this.terminalReceiptOrders.length) {
              this.terminalState = 'idle'
              this.selectedPaymentMethod = null
            }
          }

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
            receiptOrdersWithDetails.filter((order) =>
              successfulIds.has(order.id)
            ),
            paymentMethod
          )
        }

        let refreshSucceeded = false
        try {
          refreshSucceeded = (await this.$store.dispatch('orders/getAllOrder', {
            refresh: Date.now(),
          })) === true
        } catch (error) {}

        this.retryActive = false
        this.retryDueOrderIds = []
        this.pendingPaymentMethod = null
        this.$store.dispatch(
          'notifications/success',
          `${archiveSummary.successfulOrderIds.length} commande(s) archivee(s) avec succes.`,
          { root: true }
        )
        if (terminalArchive) {
          this.terminalReceiptOrders = []
          this.terminalState = 'idle'
          this.selectedPaymentMethod = null
          this.clearDiscount()
          if (untouchedOrderIds.length) {
            this.ordersToArchive = untouchedOrderIds
            this.retryActive = !refreshSucceeded
            this.retryDueOrderIds = initialDueOrderIds.filter((id) => untouchedOrderIds.includes(id))
            await Promise.resolve().then(() => this.$router.replace({
              query: { ...this.$route.query, orders: untouchedOrderIds },
            })).catch(() => {})
            return
          }
        }
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
  overflow-wrap: anywhere;
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

.cashregister-payout-method:focus-visible {
  outline: 2px solid var(--se-color-primary);
  outline-offset: 2px;
}

.cashregister-payout-method[aria-disabled='true'] {
  cursor: default;
  background: var(--se-color-surface-muted);
}

.cashregister-payout-method__radio {
  margin: 0 !important;
}

.cashregister-payout-method span {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
  min-width: 0;
  overflow-wrap: anywhere;
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
  letter-spacing: 0;
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
