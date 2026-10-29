<template>
  <v-container fluid class="terminal-ticket-page">
    <v-card v-if="loadPage" outlined class="terminal-ticket-empty" role="status">
      <v-progress-circular indeterminate color="primary" />
      <p>Préparation du ticket en cours...</p>
    </v-card>
    <v-card v-else-if="!ticketPayload || errorMessage" outlined class="terminal-ticket-empty">
      <v-icon color="primary" size="42">mdi-receipt-text-remove-outline</v-icon>
      <h1>Ticket indisponible</h1>
      <p role="alert">{{ errorMessage || 'Le paiement doit être confirmé pour imprimer son ticket.' }}</p>
      <v-btn outlined color="primary" class="text-none" :to="returnPath">{{ returnLabel }}</v-btn>
      <v-btn text color="primary" class="text-none mt-2" @click="loadPayment">Réessayer</v-btn>
    </v-card>
    <v-card v-else outlined class="terminal-ticket-card">
      <header class="terminal-ticket-header">
        <div class="terminal-ticket-heading">
          <v-icon color="primary" size="32">mdi-credit-card-check-outline</v-icon>
          <div>
            <h1>Ticket de paiement #{{ payment.id }}</h1>
            <p>{{ payment.readerLabel || 'TPE' }} · {{ ticketPayload.currentDate }}</p>
          </div>
        </div>
        <v-btn outlined color="primary" class="text-none" :to="returnPath"><v-icon small left>mdi-arrow-left</v-icon>{{ returnLabel }}</v-btn>
      </header>
      <div class="terminal-ticket-summary">
        <div><span>Montant encaissé</span><strong>{{ formattedAmount }} €</strong></div>
        <v-chip small color="success" outlined><v-icon small left>mdi-check-circle-outline</v-icon>Paiement accepté</v-chip>
      </div>
      <div class="terminal-ticket-workspace">
        <section class="terminal-ticket-preview" aria-label="Aperçu du ticket de paiement">
          <h2>Aperçu ticket</h2>
          <p>Ticket carte · Format thermique 58 mm</p>
          <iframe v-if="urlPDF" ref="preview" :src="urlPDF" title="Aperçu du ticket de paiement TPE" @load="previewReady = true"></iframe>
        </section>
        <aside class="terminal-ticket-print">
          <h2>Impression</h2>
          <p>Imprimez le justificatif du paiement par carte.</p>
          <v-alert v-if="printMessage" :type="printError ? 'error' : 'info'" text dense role="status">{{ printMessage }}</v-alert>
          <v-btn block depressed color="primary" class="text-none" :disabled="!urlPDF || printLoading" :loading="printLoading" @click="printTicket"><v-icon small left>mdi-printer</v-icon>Imprimer {{ smartPrint ? 'SmartPrint' : 'Cloud' }}</v-btn>
          <p class="text-caption mt-2">{{ smartPrint ? (shopInfo.shop_printer_ip ? `Imprimante ${shopInfo.shop_printer_ip}` : 'Adresse imprimante à renseigner dans les paramètres') : 'Service cloud d’impression configuré' }}</p>
          <v-btn block outlined color="primary" class="text-none mt-4" :disabled="!urlPDF || !previewReady" @click="printBrowser"><v-icon small left>mdi-printer-outline</v-icon>Imprimer via le navigateur</v-btn>
          <v-btn block text color="primary" class="text-none mt-2" :disabled="!urlPDF" @click="downloadPdf"><v-icon small left>mdi-download</v-icon>Télécharger PDF</v-btn>
        </aside>
      </div>
    </v-card>
  </v-container>
</template>

<script>
const { jsPDF: JSPDF } = require('jspdf')
const { canAccessModule } = require('@/helpers/staffRoles')
const { attemptStorageKey, positiveId, formatTerminalAmount } = require('@/helpers/standaloneTerminal')
const { buildCardTicketPayload, cardTicketLines, sendCardTicket } = require('@/helpers/cardTicket')

export default {
  middleware: 'auth',
  data: () => ({ payment: null, loadPage: true, errorMessage: '', urlPDF: '', previewReady: false,
    printLoading: false, printMessage: '', printError: false, requestVersion: 0 }),
  computed: {
    user() { return this.$store.get('users/user') },
    userScope() { return `${attemptStorageKey(this.user) || ''}:${this.user && this.user.token || ''}` },
    canViewHistory() { return Boolean(this.user && canAccessModule(this.user.access, 'history', this.user.module_permissions, this.user.is_primary_admin)) },
    returnPath() { return this.canViewHistory ? '/history' : '/menus' },
    returnLabel() { return this.canViewHistory ? 'Historique' : 'Retour aux menus' },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_siret: this.$store.get('shop/shop_siret'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
      }
    },
    smartPrint() { return [true, 1, '1', 'true'].includes(this.shopInfo.smart_print_app) },
    formattedAmount() { return formatTerminalAmount(this.payment ? this.payment.amountCents : 0) },
    ticketPayload() {
      if (!this.payment || this.payment.status !== 'succeeded') return null
      return buildCardTicketPayload({ payment: this.payment, shopInfo: this.shopInfo })
    },
  },
  watch: {
    '$route.params.id'() { this.loadPayment() },
    userScope() { this.requestVersion += 1; this.payment = null; this.clearPdf(); this.printLoading = false; this.printMessage = ''; this.loadPage = false; this.errorMessage = 'La session a changé. Rechargez le ticket.' },
  },
  mounted() { this.loadPayment() },
  beforeDestroy() { this.requestVersion += 1; this.clearPdf() },
  methods: {
    clearPdf() {
      if (this.urlPDF) URL.revokeObjectURL(this.urlPDF)
      this.urlPDF = ''
      this.previewReady = false
    },
    async loadPayment() {
      const generation = ++this.requestVersion
      const scope = this.userScope
      this.loadPage = true
      this.payment = null
      this.errorMessage = ''
      this.printMessage = ''
      this.printLoading = false
      this.clearPdf()
      try {
        const value = String(this.$route.params.id || '')
        const id = Number(value)
        if (!/^[1-9]\d*$/.test(value) || !positiveId(id)) throw new Error('INVALID_PAYMENT')
        const historyAccess = this.canViewHistory
        const result = await this.$store.dispatch(historyAccess ? 'terminalPayments/getAttachments' : 'terminalPayments/getPayment', id)
        if (generation !== this.requestVersion || scope !== this.userScope) return
        const payment = historyAccess ? result && result.payment : result
        if (!payment || payment.id !== id || payment.paymentKind !== 'standalone') throw new Error('MISSING_PAYMENT')
        this.payment = payment
        if (this.ticketPayload) this.generatePdf()
      } catch (_) {
        if (generation === this.requestVersion && scope === this.userScope) {
          this.payment = null
          this.errorMessage = 'Impossible de charger ce paiement. Vérifiez vos accès et réessayez.'
        }
      } finally { if (generation === this.requestVersion) this.loadPage = false }
    },
    generatePdf() {
      const payload = this.ticketPayload
      if (!payload) return
      const lines = [[this.shopInfo.shop_name || '', true], [payload.ticketTitle, true],
        ...cardTicketLines(payload).map(([label, value]) => [`${label} : ${value}`, false]), ['Paiement accepté', true]]
      const measure = new JSPDF({ unit: 'mm', format: [58, 100] })
      measure.setFont('courier', 'normal')
      measure.setFontSize(8)
      const wrapped = lines.map(([line, bold]) => [measure.splitTextToSize(line, 50), bold])
      const height = Math.max(60, 12 + wrapped.reduce((sum, [line]) => sum + line.length * 4 + 2, 0))
      const doc = new JSPDF({ unit: 'mm', format: [58, height] })
      doc.setFontSize(8)
      let y = 7
      wrapped.forEach(([line, bold]) => {
        doc.setFont('courier', bold ? 'bold' : 'normal')
        doc.text(line, bold ? 29 : 4, y, { align: bold ? 'center' : 'left' })
        y += line.length * 4 + 2
      })
      this.urlPDF = URL.createObjectURL(doc.output('blob'))
    },
    async printTicket() {
      if (!this.ticketPayload || !this.urlPDF || this.printLoading) return
      const generation = this.requestVersion
      const scope = this.userScope
      this.printLoading = true
      this.printError = false
      this.printMessage = ''
      try {
        await sendCardTicket({ payload: this.ticketPayload, smartPrint: this.smartPrint, printerIp: this.shopInfo.shop_printer_ip, dispatch: this.$store.dispatch, checked: true })
        if (generation !== this.requestVersion || scope !== this.userScope) return
        this.printMessage = 'Demande d’impression envoyée.'
      } catch (_) {
        if (generation === this.requestVersion && scope === this.userScope) {
          this.printError = true
          this.printMessage = 'Impossible d’envoyer le ticket. Vérifiez la configuration de l’imprimante ou utilisez le navigateur.'
        }
      } finally { if (generation === this.requestVersion) this.printLoading = false }
    },
    printBrowser() {
      if (!this.ticketPayload || !this.urlPDF || !this.previewReady) return
      try {
        const preview = this.$refs.preview && this.$refs.preview.contentWindow
        if (!preview || typeof preview.print !== 'function') throw new Error('PRINT_UNAVAILABLE')
        preview.focus()
        preview.print()
        this.printError = false
        this.printMessage = 'Fenêtre d’impression ouverte.'
      } catch (_) { this.printError = true; this.printMessage = 'Impression navigateur indisponible. Téléchargez le PDF pour l’imprimer.' }
    },
    downloadPdf() {
      if (!this.ticketPayload || !this.urlPDF || typeof document === 'undefined') return
      const link = document.createElement('a')
      link.href = this.urlPDF
      link.download = `ticket-paiement-${this.payment.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
    },
  },
}
</script>

<style scoped>
.terminal-ticket-card { padding: 24px; box-shadow: none !important; border-radius: var(--se-radius-lg); }
.terminal-ticket-header, .terminal-ticket-heading, .terminal-ticket-summary { display: flex; align-items: center; gap: 16px; }
.terminal-ticket-header, .terminal-ticket-summary { justify-content: space-between; flex-wrap: wrap; }
.terminal-ticket-heading { align-items: flex-start; }
.terminal-ticket-heading h1, .terminal-ticket-empty h1 { font-size: var(--se-font-title); line-height: 1.4; }
.terminal-ticket-heading p, .terminal-ticket-preview > p, .terminal-ticket-print > p { color: var(--se-color-text-muted); margin-top: 4px; }
.terminal-ticket-summary { padding: 20px 0; margin: 16px 0 24px; border-top: 1px solid var(--se-color-border-soft); border-bottom: 1px solid var(--se-color-border-soft); }
.terminal-ticket-summary span, .terminal-ticket-summary strong { display: block; }
.terminal-ticket-summary strong { margin-top: 4px; font-size: 1.75rem; font-variant-numeric: tabular-nums; }
.terminal-ticket-workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, 320px); gap: 24px; }
.terminal-ticket-workspace h2 { font-size: var(--se-font-title-sm); }
.terminal-ticket-preview iframe { width: 100%; height: 620px; border: 1px solid var(--se-color-border-soft); border-radius: var(--se-radius-md); background: var(--se-color-surface-muted); }
.terminal-ticket-print .v-btn { min-height: 44px; }
.terminal-ticket-empty { min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; gap: 12px; }
.terminal-ticket-empty p { margin: 0; }
@media (max-width: 900px) { .terminal-ticket-workspace { grid-template-columns: 1fr; } .terminal-ticket-print { grid-row: 1; } }
@media (max-width: 600px) { .terminal-ticket-card { padding: 16px; } .terminal-ticket-header > .v-btn { width: 100%; } .terminal-ticket-preview iframe { height: 480px; } }
</style>
