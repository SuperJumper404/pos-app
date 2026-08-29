<template>
  <v-container fluid class="history-ticket-page">
    <v-card v-if="loadPage" outlined class="history-ticket-loading">
      <Loading />
      <div class="history-ticket-loading__copy">
        Préparation du ticket en cours...
      </div>
    </v-card>

    <v-card v-else-if="!dataArchivedOrder" outlined class="history-ticket-empty">
      <v-icon color="primary" size="42">mdi-receipt-text-remove-outline</v-icon>
      <h1>Ticket introuvable</h1>
      <p>La commande archivée demandée n'est pas disponible.</p>
      <v-btn color="primary" outlined class="text-none" to="/history">
        <v-icon left small>mdi-arrow-left</v-icon>
        Retour à l'historique
      </v-btn>
    </v-card>

    <v-card v-else outlined class="history-ticket-cockpit">
      <header class="history-ticket-header">
        <div class="history-ticket-header__main">
          <span class="history-ticket-header__icon" aria-hidden="true">
            <v-icon color="primary">mdi-receipt-text-check-outline</v-icon>
          </span>
          <div>
            <div class="history-ticket-header__meta">
              <TakeawayChip :value="dataArchivedOrder.is_takeaway" />
              <span>{{ currentDate }}</span>
            </div>
            <h1>Ticket #{{ receiptPayload.orderNumber }}</h1>
            <p>
              {{ receiptPayload.table || 'Table non renseignée' }} ·
              {{ paymentLabel }}
            </p>
          </div>
        </div>
        <div class="history-ticket-header__actions">
          <v-btn outlined color="primary" class="text-none" to="/history">
            <v-icon left small>mdi-arrow-left</v-icon>
            Historique
          </v-btn>
          <v-btn
            outlined
            color="primary"
            class="text-none"
            :disabled="downloadActionDisabled"
            @click="downloadReceiptPdf()"
          >
            <v-icon left small>mdi-download</v-icon>
            Télécharger PDF
          </v-btn>
          <v-btn
            color="primary"
            depressed
            class="text-none"
            :disabled="printActionDisabled"
            :loading="printLoading"
            @click="triggerReceiptPrint()"
          >
            <v-icon left small>{{ printModeIcon }}</v-icon>
            {{ printActionLabel }}
          </v-btn>
        </div>
      </header>

      <section class="history-ticket-kpis" aria-label="Résumé du ticket">
        <article
          v-for="card in receiptSummaryCards"
          :key="card.label"
          class="history-ticket-kpi"
        >
          <span :class="['history-ticket-kpi__icon', card.tone]">
            <v-icon small>{{ card.icon }}</v-icon>
          </span>
          <div class="history-ticket-kpi__content">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.hint }}</small>
          </div>
        </article>
      </section>

      <div class="history-ticket-workspace">
        <section class="history-ticket-preview-panel">
          <div class="history-ticket-panel-header">
            <div>
              <h2>Aperçu ticket</h2>
              <p>Format thermique 58 mm, prêt pour réimpression.</p>
            </div>
            <div class="history-ticket-preview-actions">
              <v-chip
                small
                label
                :class="[
                  'history-ticket-ready-chip',
                  { 'is-pending': !urlPDF },
                ]"
              >
                <v-icon x-small left>
                  {{ urlPDF ? 'mdi-file-pdf-box' : 'mdi-file-clock-outline' }}
                </v-icon>
                {{ urlPDF ? 'PDF prêt' : 'En génération' }}
              </v-chip>
              <v-btn
                small
                outlined
                color="primary"
                class="text-none"
                :disabled="downloadActionDisabled"
                @click="downloadReceiptPdf()"
              >
                <v-icon left x-small>mdi-download</v-icon>
                Télécharger PDF
              </v-btn>
            </div>
          </div>
          <div class="history-ticket-preview">
            <iframe
              v-if="urlPDF"
              :src="urlPDF"
              title="Aperçu du ticket de caisse"
              frameborder="0"
            ></iframe>
            <div v-else class="history-ticket-preview__empty">
              <v-icon color="primary">mdi-file-clock-outline</v-icon>
              <span>Génération de l'aperçu...</span>
            </div>
          </div>
        </section>

        <aside class="history-ticket-print-panel" aria-live="polite">
          <div class="history-ticket-panel-header">
            <div>
              <h2>Impression</h2>
              <p>{{ printModeDescription }}</p>
            </div>
            <span :class="['history-ticket-print-status', printFeedbackStatus]">
              <v-icon x-small>{{ printFeedbackIcon }}</v-icon>
              {{ printFeedbackText }}
            </span>
          </div>

          <ol class="history-ticket-print-steps">
            <li class="is-complete">
              <span><v-icon x-small>mdi-check</v-icon></span>
              Données commande chargées
            </li>
            <li :class="{ 'is-complete': Boolean(urlPDF) }">
              <span><v-icon x-small>mdi-check</v-icon></span>
              Aperçu PDF généré
            </li>
            <li :class="printReadinessStatus">
              <span><v-icon x-small>{{ printModeIcon }}</v-icon></span>
              {{ printReadinessText }}
            </li>
          </ol>

          <div class="history-ticket-print-target">
            <span>Canal actif</span>
            <strong>{{ printModeLabel }}</strong>
            <small>{{ printModeHint }}</small>
          </div>

          <v-btn
            color="primary"
            depressed
            block
            class="history-ticket-print-button text-none"
            :disabled="printActionDisabled"
            :loading="printLoading"
            @click="triggerReceiptPrint()"
          >
            <v-icon left small>{{ printModeIcon }}</v-icon>
            {{ printActionLabel }}
          </v-btn>
        </aside>
      </div>
    </v-card>
  </v-container>
</template>
<script>
import TakeawayChip from '@/components/orders/TakeawayChip'
// import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
// import moment from 'moment'
import moment from 'moment'
import { jsPDF as JSPDF } from 'jspdf'
import QRCode from 'qrcode-js-package/qrcode.js'
import { normalizeVatBreakdown } from '@/helpers/vat'
import {
  buildCashierReceiptPayload,
  formatReceiptProductHeader,
  formatReceiptProductLine,
  receiptHeaderLines,
  receiptOrderLines,
  sendCashierReceipt,
} from '@/helpers/cashierReceipt'

export default {
  components: { TakeawayChip },
  mixins: [price],
  data() {
    return {
      orderId: this.$route.params.id,
      loadPage: '',
      urlPDF: '',
      printLoading: false,
      printFeedback: 'idle',
      printFeedbackTimer: null,
    }
  },
  computed: {
    currentDate() {
      if (!this.dataArchivedOrder) return '-'
      return moment(this.dataArchivedOrder.created)
        .local()
        .format('DD/MM/YYYY à HH:mm')
    },
    detailArchivedOrder() {
      return this.$store.get('history/detailArchivedOrder')
    },
    dataArchivedOrder() {
      return (this.$store.get('history/dataArchivedOrders') || []).filter((x) => {
        return String(x.id) === String(this.$route.params.id)
      })[0]
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
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
        activate_tva: this.$store.get('shop/activate_tva'),
      }
    },
    totalAmount() {
      if (this.dataArchivedOrder && this.dataArchivedOrder.subtotal != null) {
        return this.roundPrice(this.dataArchivedOrder.subtotal)
      }
      return this.detailArchivedOrder.reduce(
        (sum, item) => this.roundPrice(sum + this.parsePrice(item.total)),
        0
      )
    },
    subtotalBeforeDiscount() {
      return this.roundPrice(
        this.dataArchivedOrder && this.dataArchivedOrder.subtotal_before_discount != null
          ? this.dataArchivedOrder.subtotal_before_discount
          : this.totalAmount
      )
    },
    discountAmount() {
      return this.roundPrice(
        this.dataArchivedOrder && this.dataArchivedOrder.discount_amount != null
          ? this.dataArchivedOrder.discount_amount
          : Math.max(0, this.subtotalBeforeDiscount - this.totalAmount)
      )
    },
    isTvaActive() {
      return [true, 1, '1', 'true'].includes(this.shopInfo.activate_tva)
    },
    vatBreakdown() {
      return normalizeVatBreakdown(this.detailArchivedOrder)
    },
    receiptPayload() {
      return buildCashierReceiptPayload({
        order: this.dataArchivedOrder || {},
        details: this.detailArchivedOrder || [],
        shopInfo: this.shopInfo,
      })
    },
    paymentLabel() {
      return this.receiptPayload.paymentMethod || 'Paiement non renseigné'
    },
    receiptSummaryCards() {
      const vatTotal = this.roundPrice(
        this.vatBreakdown.reduce(
          (sum, item) => sum + this.parsePrice(item.totalVat),
          0
        )
      )
      return [
        {
          label: 'Total',
          value: this.formatCurrency(this.totalAmount),
          hint: this.isTvaActive ? 'Montant TTC encaissé' : 'Montant encaissé',
          icon: 'mdi-cash-check',
          tone: 'is-success',
        },
        {
          label: 'Articles',
          value: String(this.detailArchivedOrder.length),
          hint: 'Lignes sur le ticket',
          icon: 'mdi-format-list-bulleted',
          tone: 'is-primary',
        },
        {
          label: 'TVA',
          value: this.isTvaActive ? this.formatCurrency(vatTotal) : 'Non active',
          hint: this.isTvaActive ? 'Total TVA du ticket' : 'Article 293 B',
          icon: 'mdi-percent-outline',
          tone: 'is-purple',
        },
        {
          label: 'Remise',
          value:
            this.discountAmount > 0
              ? `-${this.formatCurrency(this.discountAmount)}`
              : 'Aucune',
          hint:
            this.discountAmount > 0
              ? 'Déjà appliquée'
              : 'Prix sans remise globale',
          icon: 'mdi-percent-outline',
          tone: 'is-warning',
        },
      ]
    },
    printModeLabel() {
      return this.shopInfo.smart_print_app ? 'SmartPrint' : 'Cloud'
    },
    printModeDescription() {
      return this.shopInfo.smart_print_app
        ? 'Envoi direct vers l’application SmartPrint configurée.'
        : 'Envoi via le service cloud d’impression.'
    },
    printModeHint() {
      if (this.shopInfo.smart_print_app) {
        return this.shopInfo.shop_printer_ip
          ? `Imprimante ${this.shopInfo.shop_printer_ip}`
          : 'Adresse imprimante non renseignée'
      }
      return 'Aucune application locale requise'
    },
    printModeIcon() {
      return this.shopInfo.smart_print_app
        ? 'mdi-printer-pos'
        : 'mdi-cloud-print-outline'
    },
    printReadinessStatus() {
      if (!this.urlPDF) return 'is-pending'
      if (this.shopInfo.smart_print_app && !this.shopInfo.shop_printer_ip) {
        return 'is-warning'
      }
      return 'is-complete'
    },
    printReadinessText() {
      if (!this.urlPDF) return 'Impression disponible après génération'
      if (this.shopInfo.smart_print_app && !this.shopInfo.shop_printer_ip) {
        return 'Vérifier l’adresse imprimante'
      }
      return `${this.printModeLabel} prêt`
    },
    printFeedbackStatus() {
      return `is-${this.printFeedback}`
    },
    printFeedbackText() {
      const labels = {
        idle: 'En attente',
        printing: 'Envoi...',
        sent: 'Envoyé',
        error: 'À vérifier',
      }
      return labels[this.printFeedback] || labels.idle
    },
    printFeedbackIcon() {
      const icons = {
        idle: 'mdi-clock-outline',
        printing: 'mdi-loading',
        sent: 'mdi-check-circle',
        error: 'mdi-alert-circle',
      }
      return icons[this.printFeedback] || icons.idle
    },
    printActionLabel() {
      return this.printLoading ? 'Envoi du ticket' : `Imprimer ${this.printModeLabel}`
    },
    printActionDisabled() {
      return this.printLoading || !this.urlPDF || !this.dataArchivedOrder
    },
    downloadActionDisabled() {
      return !this.urlPDF || !this.dataArchivedOrder
    },
    receiptPdfFilename() {
      const orderNumber = this.receiptPayload.orderNumber || this.orderId
      return `ticket-${orderNumber}.pdf`
    },
  },
  mounted() {
    this.loadReceiptData()
  },
  beforeDestroy() {
    if (this.printFeedbackTimer) {
      clearTimeout(this.printFeedbackTimer)
    }
  },
  methods: {
    async loadReceiptData() {
      this.loadPage = true
      try {
        await Promise.all([
          this.$store.dispatch('history/getAllArchivedOrders'),
          this.$store.dispatch(
            'history/getDetailArchivedOrder',
            this.$route.params.id
          ),
        ])
        this.generateReceiptPdf()
      } finally {
        this.loadPage = false
      }
    },
    generateReceiptPdf() {
      if (!this.dataArchivedOrder) return
      if (!this.detailArchivedOrder.length) return
      const size = this.generateCleanTicketPDF(0)
      this.generateCleanTicketPDF(size)
    },
    lockReceiptPrint() {
      if (this.printLoading) {
        this.$store.dispatch('notifications/info', {
          message: 'Impression déjà en cours.',
          timeout: 2500,
        })
        return false
      }

      this.printLoading = true
      this.printFeedback = 'printing'
      return true
    },
    unlockReceiptPrint() {
      this.printLoading = false
    },
    triggerReceiptPrint() {
      if (this.shopInfo.smart_print_app) {
        this.printReceiptSmartPrint()
        return
      }
      this.printReceiptCloud()
    },
    downloadReceiptPdf() {
      if (this.downloadActionDisabled || typeof document === 'undefined') return
      const link = document.createElement('a')
      link.href = this.urlPDF
      link.download = this.receiptPdfFilename
      document.body.appendChild(link)
      link.click()
      link.remove()
    },
    markReceiptPrintSent() {
      this.printFeedback = 'sent'
      if (this.printFeedbackTimer) {
        clearTimeout(this.printFeedbackTimer)
      }
      this.printFeedbackTimer = setTimeout(() => {
        this.printFeedback = 'idle'
      }, 3500)
    },
    markReceiptPrintError() {
      this.printFeedback = 'error'
    },
    printReceiptSmartPrint() {
      if (!this.lockReceiptPrint()) return
      try {
        sendCashierReceipt({
          payload: this.receiptPayload,
          smartPrint: true,
          printerIp: this.shopInfo.shop_printer_ip,
          dispatch: this.$store.dispatch,
        })
        this.markReceiptPrintSent()
      } catch (error) {
        // Receipt preparation errors do not come from the printer response.
        this.markReceiptPrintError()
      } finally {
        this.unlockReceiptPrint()
      }
    },

    printReceiptCloud() {
      if (!this.lockReceiptPrint()) return
      try {
        sendCashierReceipt({
          payload: this.receiptPayload,
          smartPrint: false,
          dispatch: this.$store.dispatch,
        })
        this.markReceiptPrintSent()
      } catch (error) {
        // Receipt preparation errors do not come from the printer response.
        this.markReceiptPrintError()
      } finally {
        this.unlockReceiptPrint()
      }
    },

    generateEscPos() {
      if (!this.dataArchivedOrder) return Buffer.from([])
      // ---------------------------------------
      // FONCTIONS INTERNES UTILITAIRES
      // ---------------------------------------
      const esc = (text) => Buffer.from(text, 'ascii')

      const alignLeft = () => Buffer.from([0x1b, 0x61, 0])
      const alignCenter = () => Buffer.from([0x1b, 0x61, 1])
      const alignRight = () => Buffer.from([0x1b, 0x61, 2])

      const boldOn = () => Buffer.from([0x1b, 0x45, 1])
      const boldOff = () => Buffer.from([0x1b, 0x45, 0])

      const doubleOn = () => Buffer.from([0x1d, 0x21, 0x11])
      const doubleOff = () => Buffer.from([0x1d, 0x21, 0x00])

      const line = () => esc('--------------------------------\n')
      const cut = () => Buffer.from([0x1d, 0x56, 0x00])

      const out = []
      const push = (...bufs) => bufs.forEach((b) => out.push(b))

      const euroSymbol = Buffer.from([0x80])
      push(Buffer.from([0x1b, 0x40])) // Reset
      push(Buffer.from([0x1b, 0x74, 0x10])) // CP1252

      // ---------------------------------------
      // 🔵 HEADER MAGASIN
      // ---------------------------------------
      push(alignCenter(), boldOn(), doubleOn())
      push(esc(this.shopInfo.shop_name + '\n'))
      push(doubleOff(), boldOff())

      push(alignCenter(), esc('TEL: ' + this.shopInfo.shop_phone + '\n'))
      push(alignCenter(), esc('SIRET: ' + this.shopInfo.shop_siret + '\n'))

      const address = this.shopInfo.shop_adress || ''
      const addressLines = this.splitByWords(address, 30)

      addressLines.forEach((line) => {
        push(alignCenter(), esc(line + '\n'))
      })

      push(esc('\n'))

      // ---------------------------------------
      // 👤 CLIENT + COMMANDE
      // ---------------------------------------
      push(
        alignLeft(),
        boldOn(),
        esc((this.dataArchivedOrder.username || '') + '\n'),
        boldOff()
      )

      push(esc('Commande n° '))
      push(boldOn(), esc(this.dataArchivedOrder.ordernumber + '\n'), boldOff())

      push(esc('Date : '))
      push(boldOn(), esc(this.currentDate + '\n\n'), boldOff())

      // ---------------------------------------
      // 🛒 TABLEAU PRODUITS
      // ---------------------------------------
      push(boldOn(), esc('QTE   PRODUIT                PRIX\n\n'), boldOff())
      push(line())

      this.detailArchivedOrder.forEach((item) => {
        const qty = (item.qty + 'x').padEnd(5)
        const name = (item.name + '').padEnd(20).slice(0, 20)
        const price = this.formatTicketNumber(item.total).padStart(7)

        push(alignLeft(), esc(`${qty}${name}${price} `), euroSymbol, esc('\n'))
      })

      push(line())

      // ---------------------------------------
      // 🧾 TOTAUX
      // ---------------------------------------
      if (this.isTvaActive) {
        this.vatBreakdown.forEach((item) => {
          push(
            alignRight(),
            esc(`HT (${this.formatVatRate(item.vatRate)}) : ${this.formatTicketNumber(item.totalHt)} `),
            euroSymbol,
            esc('\n')
          )
          push(
            alignRight(),
            esc(`TVA (${this.formatVatRate(item.vatRate)}) : ${this.formatTicketNumber(item.totalVat)} `),
            euroSymbol,
            esc('\n')
          )
        })
      }
      if (this.discountAmount > 0) {
        push(
          alignRight(),
          esc(`SOUS-TOTAL : ${this.formatTicketNumber(this.subtotalBeforeDiscount)} `),
          euroSymbol,
          esc('\n'),
          alignRight(),
          esc(`REMISE : -${this.formatTicketNumber(this.discountAmount)} `),
          euroSymbol,
          esc('\n')
        )
      }

      push(alignRight(), boldOn(), doubleOn())
      push(
        esc(
          `TOTAL${this.isTvaActive ? ' TTC' : '*'} : ${this.formatTicketNumber(
            this.totalAmount
          )} `
        ),
        euroSymbol,
        esc('\n')
      )
      push(doubleOff(), boldOff(), esc('\n'))

      push(
        alignRight(),
        esc('Paiement : ' + this.dataArchivedOrder.used_payment_method + '\n')
      )
      push(line())

      // ---------------------------------------
      // 🙏 FOOTER
      // ---------------------------------------
      push(alignCenter(), esc('À très bientôt !\n'))
      push(alignCenter(), esc(this.shopInfo.shop_name + '\n'))
      push(alignCenter(), esc('Made with smarteat.fr\n'))
      if (!this.isTvaActive) {
        push(alignCenter(), esc('* TVA non applicable, art. 293 B du CGI\n'))
      }
      push(esc('\n\n\n\n'))

      push(cut())

      return Buffer.concat(out)
    },

    formatPrice(value) {
      return this.formatCurrency(value)
    },

    formatVatRate(value) {
      return `${String(value).replace('.', ',')} %`
    },

    formatTicketNumber(value) {
      return this.formatPrice(value).replace(' €', '')
    },

    safePdfText(value, fallback = '') {
      if (value === undefined || value === null) return fallback
      return String(value)
    },

    generateCleanTicketPDF(size) {
      if (!this.dataArchivedOrder) return 0
      const payload = this.receiptPayload
      const doc = new JSPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, size > 0 ? size + 10 : 500], // Format ticket thermique
      })

      const center = 29
      const left = 3
      const right = 55
      let y = 5
      const write = (value, { align = 'left', x = left, fontSize = 8, style = 'normal', gap = 3 } = {}) => {
        const text = this.safePdfText(value)
        if (!text) return
        doc.setFont('courier', style)
        doc.setFontSize(fontSize)
        y += gap
        doc.text(text, x, y, { align })
      }
      const drawLine = () => {
        this.drawDashLine(doc, (y += 3), 52, '-', 8, 58)
      }

      write(this.shopInfo.shop_name, {
        align: 'center',
        x: center,
        fontSize: 10,
        style: 'bold',
      })
      write(payload.ticketTitle || 'Ticket de caisse', {
        align: 'center',
        x: center,
        fontSize: 8,
        style: 'bold',
      })

      receiptHeaderLines(payload).forEach((lineText) => {
        write(lineText, { align: 'center', x: center, fontSize: 7.5 })
      })
      write(payload.table, { style: 'bold' })
      write(`Commande n° ${payload.orderNumber}`)
      write(`Date : ${payload.currentDate}`)
      receiptOrderLines(payload).forEach((lineText) => write(lineText))

      write(formatReceiptProductHeader(payload.isTvaActive), { fontSize: 7.5 })
      drawLine()
      payload.details.forEach((item) => {
        write(`${formatReceiptProductLine(item, payload.isTvaActive)} €`, {
          fontSize: 7.5,
          gap: 3,
        })
      })
      drawLine()

      if (payload.discountAmount > 0) {
        write(
          `SOUS-TOTAL : ${this.formatTicketNumber(payload.subtotalBeforeDiscount)} €`,
          { align: 'right', x: right }
        )
        write(
          `REMISE : -${this.formatTicketNumber(payload.discountAmount)} €`,
          { align: 'right', x: right }
        )
      }

      if (payload.isTvaActive) {
        payload.vatBreakdown.forEach((item) => {
          write(
            `HT (${this.formatVatRate(item.vatRate)}) : ${this.formatTicketNumber(item.totalHt)} €`,
            { align: 'right', x: right }
          )
          write(
            `TVA (${this.formatVatRate(item.vatRate)}) : ${this.formatTicketNumber(item.totalVat)} €`,
            { align: 'right', x: right }
          )
        })
      }

      write(
        `TOTAL${payload.isTvaActive ? ' TTC' : '*'} : ${this.formatTicketNumber(payload.totalAmount)} €`,
        { align: 'right', x: right, fontSize: 10, style: 'bold', gap: 4 }
      )
      write(`Paiement : ${payload.paymentMethod}`, {
        align: 'right',
        x: right,
        gap: 4,
      })
      drawLine()

      const qrUrl = this.safePdfText(payload.shopInfo.receipt_review_qr_url).trim()
      if (qrUrl) {
        write(payload.shopInfo.receipt_review_qr_label || 'Votre avis nous intéresse', {
          align: 'center',
          x: center,
          fontSize: 7.5,
          gap: 4,
        })
        y = this.addReviewQrCode(doc, qrUrl, center, y + 1)
      }

      write('À très bientôt !', { align: 'center', x: center, gap: 4 })
      write(this.shopInfo.shop_name, { align: 'center', x: center })
      write('Made with smarteat.fr', { align: 'center', x: center })

      if (!payload.isTvaActive) {
        write('* TVA non applicable, art. 293 B du CGI', {
          align: 'center',
          x: center,
          fontSize: 6,
          gap: 4,
        })
      }

      const blob = doc.output('blob')
      this.urlPDF = URL.createObjectURL(blob)
      return y
    },
    addReviewQrCode(doc, value, center, topY) {
      if (typeof document === 'undefined') return topY

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      document.body.appendChild(container)

      try {
        const qrCode = new QRCode(container, {
          text: value,
          width: 160,
          height: 160,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        })
        const canvas = container.querySelector('canvas')
        const image = container.querySelector('img')
        const imageData = canvas
          ? canvas.toDataURL('image/png')
          : image && image.src
        if (!qrCode || !imageData) return topY

        const size = 22
        doc.addImage(imageData, 'PNG', center - size / 2, topY, size, size)
        return topY + size + 3
      } catch (error) {
        return topY
      } finally {
        container.remove()
      }
    },
    textWithBoldPart(doc, normalText, boldText, x, y, options = {}) {
      const safeNormalText = this.safePdfText(normalText)
      const safeBoldText = this.safePdfText(boldText)
      const defaultOptions = { align: 'left' }
      const align = options.align || defaultOptions.align

      // Choisir le point de départ selon l’alignement
      let offsetX = x
      if (align === 'center') {
        const totalWidth = doc.getTextWidth(safeNormalText + safeBoldText)
        offsetX = x - totalWidth / 2
      } else if (align === 'right') {
        const totalWidth = doc.getTextWidth(safeNormalText + safeBoldText)
        offsetX = x - totalWidth
      }

      // Partie normale
      doc.setFont('courier', 'normal')
      doc.text(safeNormalText, offsetX, y)

      // Partie en gras
      const normalWidth = doc.getTextWidth(safeNormalText)
      doc.setFont('courier', 'bold')
      doc.text(safeBoldText, offsetX + normalWidth + 0.5, y) // +0.5mm d’espace
    },
    drawDashLine(
      doc,
      y,
      lineWidth = 50,
      char = '-',
      fontSize = 8,
      pageWidth = 58
    ) {
      doc.setFont('courier', 'normal')
      doc.setFontSize(fontSize)

      const charWidth = doc.getTextWidth(char)
      const count = Math.floor(lineWidth / charWidth)
      const dashLine = char.repeat(count)

      const centerX = pageWidth / 2

      doc.text(dashLine, centerX, y, { align: 'center' })
    },

    splitByWords(text, maxLen = 30) {
      const words = this.safePdfText(text).split(' ')
      const lines = []
      let current = ''

      words.forEach((word) => {
        if ((current + word).length > maxLen) {
          lines.push(current.trim())
          current = word + ' '
        } else {
          current += word + ' '
        }
      })

      if (current.trim().length > 0) {
        lines.push(current.trim())
      }

      return lines
    },
  },
}
</script>
<style scoped>
.history-ticket-page {
  background: #f7f9fc;
  min-height: calc(100vh - 64px);
  padding: var(--se-space-5);
}

.history-ticket-loading,
.history-ticket-empty,
.history-ticket-cockpit {
  border: 1px solid var(--se-color-border) !important;
  border-radius: var(--se-radius-md) !important;
  box-shadow: none !important;
  overflow: hidden;
}

.history-ticket-loading,
.history-ticket-empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: var(--se-space-3);
  justify-content: center;
  min-height: 360px;
  padding: var(--se-space-6);
  text-align: center;
}

.history-ticket-loading__copy,
.history-ticket-empty p {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  margin: 0;
}

.history-ticket-empty h1 {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: var(--se-space-2) 0 0;
}

.history-ticket-header {
  align-items: center;
  background: var(--se-color-surface);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  flex-wrap: wrap;
  gap: var(--se-space-4);
  justify-content: space-between;
  padding: 18px 20px;
}

.history-ticket-header__main {
  align-items: flex-start;
  display: flex;
  gap: var(--se-space-3);
  min-width: 260px;
}

.history-ticket-header__icon {
  align-items: center;
  background: var(--se-color-primary-soft);
  border-radius: var(--se-radius-lg);
  display: inline-flex;
  flex: 0 0 46px;
  height: 46px;
  justify-content: center;
  margin-top: 24px;
  width: 46px;
}

.history-ticket-header__meta {
  align-items: center;
  color: var(--se-color-text-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-medium);
  gap: var(--se-space-2);
  margin-bottom: var(--se-space-1);
}

.history-ticket-header h1 {
  color: var(--se-color-text);
  font-size: var(--se-font-display);
  font-weight: var(--se-weight-bold);
  letter-spacing: 0;
  line-height: var(--se-line-tight);
  margin: 0;
}

.history-ticket-header p {
  color: var(--se-color-text-body);
  font-size: var(--se-font-small);
  line-height: 1.35;
  margin: 3px 0 0;
}

.history-ticket-header__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--se-space-2);
}

.history-ticket-kpis {
  background: var(--se-color-surface-muted);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: grid;
  gap: var(--se-space-3);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  padding: var(--se-space-4) var(--se-space-5);
}

.history-ticket-kpi {
  align-items: flex-start;
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  display: flex;
  gap: var(--se-space-3);
  min-height: 96px;
  padding: var(--se-space-3);
  transition:
    border-color var(--se-transition-fast),
    transform var(--se-transition-fast);
}

.history-ticket-kpi:hover {
  border-color: #c9d5e4;
  transform: translateY(-1px);
}

.history-ticket-kpi__icon {
  align-items: center;
  border-radius: var(--se-radius-lg);
  display: inline-flex;
  flex: 0 0 44px;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.history-ticket-kpi__icon.is-success {
  background: var(--se-color-success-soft);
  color: var(--se-color-success);
}

.history-ticket-kpi__icon.is-primary {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.history-ticket-kpi__icon.is-purple {
  background: var(--se-color-brand-purple-soft);
  color: var(--se-color-brand-purple);
}

.history-ticket-kpi__icon.is-warning {
  background: var(--se-color-warning-soft);
  color: var(--se-color-warning);
}

.history-ticket-kpi__icon ::v-deep .v-icon {
  color: currentColor;
}

.history-ticket-kpi__content span {
  color: var(--se-color-text-muted);
  display: block;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
}

.history-ticket-kpi strong {
  color: var(--se-color-text);
  display: block;
  font-size: 1.35rem;
  font-weight: var(--se-weight-bold);
  line-height: 1.15;
  margin-top: 2px;
}

.history-ticket-kpi small {
  color: var(--se-color-text-body);
  display: block;
  font-size: var(--se-font-caption);
  line-height: 1.3;
  margin-top: 3px;
}

.history-ticket-workspace {
  align-items: start;
  display: grid;
  gap: var(--se-space-4);
  grid-template-columns: minmax(0, 1fr) 340px;
  padding: var(--se-space-5);
}

.history-ticket-preview-panel,
.history-ticket-print-panel {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  overflow: hidden;
}

.history-ticket-panel-header {
  align-items: center;
  background: var(--se-color-surface);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  gap: var(--se-space-3);
  justify-content: space-between;
  padding: var(--se-space-4);
}

.history-ticket-panel-header h2 {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: 0;
}

.history-ticket-panel-header p {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  line-height: 1.35;
  margin: 3px 0 0;
}

.history-ticket-ready-chip {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
  font-weight: var(--se-weight-bold);
}

.history-ticket-ready-chip.is-pending {
  background: var(--se-color-surface-muted) !important;
  color: var(--se-color-text-muted) !important;
}

.history-ticket-preview-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--se-space-2);
  justify-content: flex-end;
}

.history-ticket-preview {
  background: #edf2f7;
  min-height: 680px;
  padding: var(--se-space-4);
}

.history-ticket-preview iframe {
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-sm);
  display: block;
  height: 680px;
  width: 100%;
}

.history-ticket-preview__empty {
  align-items: center;
  color: var(--se-color-text-muted);
  display: flex;
  flex-direction: column;
  font-size: var(--se-font-small);
  gap: var(--se-space-2);
  height: 680px;
  justify-content: center;
}

.history-ticket-print-panel {
  position: sticky;
  top: var(--se-space-5);
}

.history-ticket-print-status {
  align-items: center;
  border-radius: var(--se-radius-pill);
  display: inline-flex;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-bold);
  gap: 5px;
  min-height: 28px;
  padding: 4px 10px;
  white-space: nowrap;
}

.history-ticket-print-status.is-idle {
  background: var(--se-color-surface-muted);
  color: var(--se-color-text-muted);
}

.history-ticket-print-status.is-printing {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.history-ticket-print-status.is-sent {
  background: var(--se-color-success-soft);
  color: #008f4a;
}

.history-ticket-print-status.is-error {
  background: var(--se-color-danger-soft);
  color: var(--se-color-danger);
}

.history-ticket-print-status.is-printing ::v-deep .v-icon {
  animation: history-ticket-spin 850ms linear infinite;
}

.history-ticket-print-steps {
  display: grid;
  gap: var(--se-space-3);
  list-style: none;
  margin: 0;
  padding: var(--se-space-4);
}

.history-ticket-print-steps li {
  align-items: center;
  color: var(--se-color-text-muted);
  display: flex;
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-semibold);
  gap: var(--se-space-2);
}

.history-ticket-print-steps li > span {
  align-items: center;
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-pill);
  color: var(--se-color-text-muted);
  display: inline-flex;
  flex: 0 0 28px;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.history-ticket-print-steps li.is-complete {
  color: var(--se-color-text);
}

.history-ticket-print-steps li.is-complete > span {
  background: var(--se-color-success-soft);
  border-color: var(--se-color-success-soft);
  color: #008f4a;
}

.history-ticket-print-steps li.is-warning {
  color: #8a5600;
}

.history-ticket-print-steps li.is-warning > span {
  background: var(--se-color-warning-soft);
  border-color: #ffdca2;
  color: #8a5600;
}

.history-ticket-print-target {
  background: var(--se-color-surface-muted);
  border-bottom: 1px solid var(--se-color-border-soft);
  border-top: 1px solid var(--se-color-border-soft);
  display: grid;
  gap: 3px;
  padding: var(--se-space-4);
}

.history-ticket-print-target span,
.history-ticket-print-target small {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
}

.history-ticket-print-target strong {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  line-height: var(--se-line-tight);
}

.history-ticket-print-button {
  border-radius: 0 !important;
  min-height: 52px;
}

.history-ticket-cockpit ::v-deep .v-btn {
  border-radius: var(--se-radius-md);
  box-shadow: none !important;
  min-height: var(--se-touch-target);
}

@keyframes history-ticket-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1060px) {
  .history-ticket-workspace {
    grid-template-columns: 1fr;
  }

  .history-ticket-print-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .history-ticket-page {
    padding: var(--se-space-3);
  }

  .history-ticket-header,
  .history-ticket-panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .history-ticket-header__actions {
    width: 100%;
  }

  .history-ticket-header__actions ::v-deep .v-btn {
    width: 100%;
  }

  .history-ticket-workspace,
  .history-ticket-kpis {
    padding: var(--se-space-3);
  }

  .history-ticket-preview,
  .history-ticket-preview iframe,
  .history-ticket-preview__empty {
    min-height: 560px;
  }

  .history-ticket-preview iframe,
  .history-ticket-preview__empty {
    height: 560px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .history-ticket-kpi,
  .history-ticket-print-status.is-printing ::v-deep .v-icon {
    animation: none;
    transition: none;
  }

  .history-ticket-kpi:hover {
    transform: none;
  }
}
</style>
