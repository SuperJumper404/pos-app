<template>
  <v-dialog :value="value" max-width="420" scrollable aria-labelledby="standalone-terminal-title" @input="!$event && closeDialog()">
    <v-card class="standalone-terminal" @keydown="handleKey">
      <v-card-title class="standalone-terminal__heading">
        <h2 id="standalone-terminal-title">Paiement TPE</h2>
        <v-spacer />
        <v-btn icon aria-label="Fermer le paiement TPE" class="standalone-terminal__close" @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="standalone-terminal__body">
        <div class="standalone-terminal__reader">
          <v-icon small :color="ready ? 'success' : 'warning'">mdi-contactless-payment</v-icon>
          <span>{{ reader ? reader.label : 'Terminal indisponible' }}</span>
        </div>
        <div class="standalone-terminal__screen" role="status" aria-live="polite" aria-atomic="true">
          <span>{{ payment && payment.status === 'succeeded' ? 'Montant encaissé' : 'Montant à encaisser' }}</span>
          <div class="standalone-terminal__amount">{{ formattedAmount }} <span>€</span></div>
          <span v-if="!attempt">Saisissez le montant avec le clavier</span>
          <span v-else>{{ payment ? statusText(payment.status) : 'Vérification nécessaire' }}</span>
        </div>
        <v-alert v-if="errorMessage" type="error" text dense class="mt-4 mb-3" role="alert">{{ errorMessage }}</v-alert>
        <v-alert v-if="blockingPayment" type="warning" text dense class="mt-4 mb-3" role="status">Un paiement de {{ formatAmount(blockingPayment.amountCents) }} € est déjà en attente sur ce terminal. Annulez-le pour libérer le TPE.</v-alert>
        <v-alert v-if="noticeMessage" type="info" text dense class="mt-4 mb-3" role="status">{{ noticeMessage }}</v-alert>

        <div v-if="!attempt" class="standalone-terminal__keypad" aria-label="Clavier du montant">
          <v-btn v-for="digit in digits" :key="digit" depressed class="standalone-terminal__key" :disabled="busy" @click="addDigit(digit)">{{ digit }}</v-btn>
          <v-btn depressed class="standalone-terminal__key standalone-terminal__clear" :disabled="busy" aria-label="Effacer le montant" @click="clearAmount">C</v-btn>
          <v-btn depressed class="standalone-terminal__key" :disabled="busy" @click="addDigit('0')">0</v-btn>
          <v-btn depressed class="standalone-terminal__key" :disabled="busy" aria-label="Corriger le dernier chiffre" @click="removeDigit"><v-icon>mdi-backspace-outline</v-icon></v-btn>
        </div>
        <div v-else class="standalone-terminal__outcome" aria-live="polite">
          <v-progress-circular v-if="busy || isPending" indeterminate color="primary" size="32" width="3" />
          <v-icon v-else size="36" :color="payment && payment.status === 'succeeded' ? 'success' : 'warning'">{{ payment && payment.status === 'succeeded' ? 'mdi-check-circle-outline' : 'mdi-credit-card-alert-outline' }}</v-icon>
          <p>{{ outcomeMessage }}</p>
          <span v-if="isPending || !payment" class="text-caption">Vous pouvez fermer cette fenêtre. Le paiement continue sur le terminal.</span>
        </div>
        <p v-if="!attempt" class="standalone-terminal__hint">Le client présentera sa carte sur le terminal.</p>
      </v-card-text>
      <v-card-actions class="standalone-terminal__actions">
        <v-btn v-if="blockingPayment" block outlined color="error" class="text-none" :loading="canceling" :disabled="busy" @click="cancelBlockingPayment">Annuler le paiement en cours</v-btn>
        <template v-if="!attempt">
          <p v-if="amountCents > 0 && !validAmount(amountCents)" class="text-caption mb-1">Le montant minimum est de 0,50 €.</p>
          <v-btn block depressed color="primary" class="text-none standalone-terminal__send" :loading="busy" :disabled="!ready || !validAmount(amountCents) || busy || Boolean(blockingPayment)" @click="sendPayment">
            <v-icon left>mdi-credit-card-outline</v-icon>Encaisser par carte
          </v-btn>
        </template>
        <template v-else-if="!isFinal">
          <v-btn block outlined color="primary" class="text-none" :loading="busy" :disabled="busy" @click="checkPayment">Vérifier le paiement</v-btn>
          <v-btn text color="error" class="text-none" :loading="cancelRequested || canceling" :disabled="cancelRequested || canceling || !payment" @click="cancelPayment">Annuler le paiement</v-btn>
        </template>
        <template v-else>
          <v-btn v-if="canViewHistory" block depressed color="primary" class="text-none" @click="goToHistory">Voir dans l’historique</v-btn>
          <v-btn block outlined class="text-none" :disabled="!ready || busy" @click="startNewPayment">Nouveau paiement</v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
const { v4: uuidv4 } = require('uuid')
const { canAccessModule } = require('@/helpers/staffRoles')
const {
  appendAmountDigit, removeAmountDigit, formatTerminalAmount, validAmount,
  attemptStorageKey, readAttempt, saveAttempt, canUseStandaloneTerminal, terminalStatusText,
} = require('@/helpers/standaloneTerminal')

export default {
  props: { value: { type: Boolean, default: false }, reader: { type: Object, default: null } },
  data: () => ({
    amountCents: 0, attempt: null, payment: null, requesting: false,
    errorMessage: '', operationVersion: 0, pollTimer: null, scopeKey: null, resumeAfterRequest: false,
    blockingPayment: null, checkingReader: false, cancelRequested: false, canceling: false, noticeMessage: '',
    digits: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  }),
  computed: {
    user() { return this.$store.get('users/user') },
    userScope() { return attemptStorageKey(this.user) },
    busy() { return this.requesting || this.checkingReader || this.canceling || Boolean(this.$store.get('terminalPayments/loading')) },
    ready() { return canUseStandaloneTerminal({ user: this.user, reader: this.reader }) },
    formattedAmount() { return formatTerminalAmount(this.payment ? this.payment.amountCents : this.amountCents) },
    isPending() { return Boolean(this.payment && ['creating', 'processing'].includes(this.payment.status)) },
    isFinal() { return Boolean(this.payment && ['succeeded', 'failed', 'canceled'].includes(this.payment.status)) },
    canViewHistory() { return this.user && canAccessModule(this.user.access, 'history', this.user.module_permissions, this.user.is_primary_admin) },
    outcomeMessage() {
      if (!this.payment) return 'Le résultat est encore inconnu. Vérifiez cette tentative avant de recommencer.'
      return {
        creating: 'Le paiement est en cours de préparation.',
        processing: 'Présentez la carte sur le terminal.',
        succeeded: 'Le paiement a bien été reçu.',
        failed: 'Le paiement a échoué. Vous pouvez lancer une nouvelle tentative.',
        canceled: 'Le paiement a été annulé.',
      }[this.payment.status]
    },
  },
  watch: {
    value(open) {
      if (open) this.onOpen()
      else { this.resumeAfterRequest = false; this.requesting = false; this.checkingReader = false; this.canceling = false; this.cancelRequested = false; this.operationVersion += 1; this.stopPolling() }
    },
    busy(busy) {
      if (!busy && this.cancelRequested && this.value) { this.cancelPayment(); return }
      if (!busy && this.resumeAfterRequest && this.value && this.attempt) {
        this.resumeAfterRequest = false
        this.checkPayment()
      }
    },
    userScope(next) {
      if (this.scopeKey && next !== this.scopeKey) {
        this.operationVersion += 1
        this.stopPolling()
        this.attempt = null
        this.payment = null
        this.amountCents = 0
        this.requesting = false
        this.resumeAfterRequest = false
        this.blockingPayment = null
        this.checkingReader = false
        this.cancelRequested = false
        this.canceling = false
        this.$emit('input', false)
      }
    },
  },
  beforeDestroy() { this.operationVersion += 1; this.stopPolling() },
  methods: {
    validAmount,
    formatAmount: formatTerminalAmount,
    statusText: terminalStatusText,
    async onOpen() {
      this.stopPolling()
      this.operationVersion += 1
      this.scopeKey = this.userScope
      this.requesting = false
      this.checkingReader = false
      this.canceling = false
      this.resumeAfterRequest = false
      this.errorMessage = ''
      this.noticeMessage = ''
      this.blockingPayment = null
      this.cancelRequested = false
      this.payment = null
      this.attempt = readAttempt(typeof localStorage === 'undefined' ? null : localStorage, this.scopeKey)
      this.amountCents = this.attempt ? this.attempt.amountCents : 0
      this.$emit('recovery-change', Boolean(this.attempt))
      if (this.attempt) {
        if (this.busy) this.resumeAfterRequest = true
        else await this.checkPayment()
      } else await this.loadBlockingPayment()
    },
    async loadBlockingPayment() {
      const generation = this.operationVersion
      const scope = this.userScope
      this.checkingReader = true
      try {
        const reader = await this.$store.dispatch('stripeTerminal/getCurrentReader')
        if (generation !== this.operationVersion || scope !== this.userScope) return
        const current = reader && reader.activePayment
        this.blockingPayment = current && (!this.payment || current.id !== this.payment.id) ? current : null
      } catch (_) {
        if (generation === this.operationVersion && scope === this.userScope) this.errorMessage = 'Impossible de vérifier le terminal. Réessayez.'
      } finally { if (generation === this.operationVersion) this.checkingReader = false }
    },
    async cancelBlockingPayment() {
      if (this.busy || !this.blockingPayment) return
      const current = this.blockingPayment
      const generation = this.operationVersion
      const scope = this.userScope
      this.canceling = true
      this.errorMessage = ''
      try {
        const module = current.paymentKind === 'standalone' ? 'terminalPayments' : 'stripeTerminal'
        const result = await this.$store.dispatch(`${module}/cancelPayment`, current.id)
        if (generation !== this.operationVersion || scope !== this.userScope) return
        if (!result || !['canceled', 'failed', 'succeeded'].includes(result.status)) {
          this.errorMessage = 'L’annulation n’est pas encore confirmée. Vérifiez le terminal puis réessayez.'
          return
        }
        this.blockingPayment = null
        this.noticeMessage = result.status === 'succeeded' ? 'Ce paiement a déjà été encaissé. Il ne peut plus être annulé.' : 'Paiement annulé. Le terminal est disponible.'
        if (this.attempt && !this.payment) {
          try { localStorage.removeItem(scope) } catch (_) {}
          this.attempt = null
          this.$emit('recovery-change', false)
        }
      } catch (_) {
        if (generation === this.operationVersion && scope === this.userScope) this.errorMessage = 'Annulation impossible. Réessayez pour libérer le terminal.'
      } finally { if (generation === this.operationVersion) this.canceling = false }
    },
    stopPolling() { if (this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer = null },
    schedulePoll() {
      this.stopPolling()
      if (this.value && this.isPending) this.pollTimer = setTimeout(() => this.checkPayment(), 2500)
    },
    addDigit(digit) { if (!this.attempt && !this.busy) this.amountCents = appendAmountDigit(this.amountCents, digit) },
    removeDigit() { if (!this.attempt && !this.busy) this.amountCents = removeAmountDigit(this.amountCents) },
    clearAmount() { if (!this.attempt && !this.busy) this.amountCents = 0 },
    handleKey(event) {
      if (!this.value || this.attempt || this.busy) return
      if (/^[0-9]$/.test(event.key)) this.addDigit(event.key)
      else if (event.key === 'Backspace') this.removeDigit()
      else if (event.key === 'Delete') this.clearAmount()
      else return
      event.preventDefault()
    },
    async sendPayment() {
      if (this.busy || this.attempt || this.blockingPayment || !this.ready || !validAmount(this.amountCents)) return
      const attempt = { attemptKey: uuidv4(), amountCents: this.amountCents, paymentId: null }
      if (!saveAttempt(typeof localStorage === 'undefined' ? null : localStorage, this.userScope, attempt)) {
        this.errorMessage = 'Le navigateur ne peut pas conserver cette tentative. Autorisez le stockage avant de payer.'
        return
      }
      this.attempt = attempt
      this.noticeMessage = ''
      this.$emit('recovery-change', true)
      await this.runPayment('terminalPayments/startPayment', { amountCents: attempt.amountCents, attemptKey: attempt.attemptKey })
    },
    async checkPayment() {
      if (this.busy || !this.attempt) return
      if (this.attempt.paymentId && (!this.payment || this.payment.status !== 'creating')) {
        await this.runPayment('terminalPayments/refreshPayment', this.attempt.paymentId)
      } else {
        await this.runPayment('terminalPayments/startPayment', { amountCents: this.attempt.amountCents, attemptKey: this.attempt.attemptKey })
      }
    },
    async cancelPayment() {
      if (this.canceling || !this.payment || !this.isPending) return
      if (this.busy) { this.cancelRequested = true; return }
      this.cancelRequested = false
      this.canceling = true
      try { await this.runPayment('terminalPayments/cancelPayment', this.payment.id) }
      finally { this.canceling = false }
    },
    async runPayment(action, payload) {
      this.stopPolling()
      this.requesting = true
      this.errorMessage = ''
      const generation = ++this.operationVersion
      const scope = this.userScope
      try {
        const result = await this.$store.dispatch(action, payload)
        if (generation !== this.operationVersion || scope !== this.userScope) return
        if (!result) {
          const error = this.$store.get('terminalPayments/error')
          this.errorMessage = error && error.message || 'Résultat du paiement inconnu. Vérifiez cette même tentative.'
          if (error && error.code === 'TERMINAL_READER_BUSY') await this.loadBlockingPayment()
          return
        }
        this.payment = result
        this.attempt = { ...this.attempt, paymentId: result.id }
        if (this.isFinal) {
          this.cancelRequested = false
          try { localStorage.removeItem(scope) } catch (_) {}
          this.$emit('recovery-change', false)
        } else saveAttempt(typeof localStorage === 'undefined' ? null : localStorage, scope, this.attempt)
      } catch (_) {
        if (generation === this.operationVersion && scope === this.userScope) this.errorMessage = 'Vérification impossible. Réessayez avec cette même tentative.'
      } finally {
        if (generation === this.operationVersion) {
          this.requesting = false
          if (this.cancelRequested && this.value) this.cancelPayment()
          else this.schedulePoll()
        }
      }
    },
    startNewPayment() {
      if (!this.isFinal || this.busy || !this.ready) return
      this.attempt = null
      this.payment = null
      this.amountCents = 0
      this.errorMessage = ''
      this.$store.dispatch('terminalPayments/resetSession')
      this.$emit('recovery-change', false)
    },
    closeDialog() { this.operationVersion += 1; this.requesting = false; this.checkingReader = false; this.canceling = false; this.cancelRequested = false; this.resumeAfterRequest = false; this.stopPolling(); this.$emit('input', false) },
    async goToHistory() {
      if (!this.payment || !this.canViewHistory) return
      const id = this.payment.id
      this.closeDialog()
      await this.$router.push({ path: '/history', query: { payment: String(id) } })
    },
  },
}
</script>

<style scoped>
.standalone-terminal { border-radius: var(--se-radius-lg) !important; }
.standalone-terminal__heading { padding: 12px 16px 8px 24px; }
.standalone-terminal__heading h2 { font-size: var(--se-font-title-sm); font-weight: 600; }
.standalone-terminal__close { min-width: 44px; min-height: 44px; }
.standalone-terminal__body { padding: 0 24px 12px !important; }
.standalone-terminal__reader { display: flex; align-items: center; gap: 8px; min-height: 32px; margin-bottom: 12px; color: var(--se-color-text-muted); }
.standalone-terminal__reader span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.standalone-terminal__screen { padding: 22px 12px; text-align: center; background: var(--se-color-surface-muted); border: 1px solid var(--se-color-border-soft); border-radius: var(--se-radius-md); color: var(--se-color-text-muted); }
.standalone-terminal__amount { margin: 8px 0; color: var(--se-color-text); font-size: clamp(2rem, 8vw, 2.75rem); font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.standalone-terminal__amount span { font-size: 1.5rem; }
.standalone-terminal__keypad { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 20px; }
.standalone-terminal__key { min-width: 0 !important; min-height: 56px; font-size: var(--se-font-title); font-weight: 500; color: var(--se-color-text) !important; background: var(--se-color-surface-muted) !important; border-radius: var(--se-radius-md); }
.standalone-terminal__key:focus-visible, .standalone-terminal__close:focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 2px; }
.standalone-terminal__clear { color: var(--se-color-danger) !important; background: var(--se-color-danger-soft) !important; }
.standalone-terminal__hint { margin: 16px 0 0; text-align: center; font-size: var(--se-font-meta); }
.standalone-terminal__outcome { padding: 24px 0 8px; text-align: center; }
.standalone-terminal__outcome p { margin: 12px 0 8px; color: var(--se-color-text); }
.standalone-terminal .standalone-terminal__actions { flex-direction: column; gap: 10px; padding: 12px 24px 24px !important; }
.standalone-terminal__actions .v-btn { margin: 0 !important; min-height: 44px; }
.standalone-terminal__send.v-btn { min-height: 48px; border-radius: var(--se-radius-md); font-weight: 600; letter-spacing: normal; }
.standalone-terminal__send:focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 3px; }
@media (max-width: 360px) { .standalone-terminal__body { padding-right: 16px !important; padding-left: 16px !important; } .standalone-terminal .standalone-terminal__actions { padding-right: 16px !important; padding-left: 16px !important; } }
</style>
