<template>
  <v-container fluid class="settlement-history-page">
    <v-card v-if="loadPage" outlined class="settlement-state-card">
      <Loading />
      <p>Chargement de l'encaissement...</p>
    </v-card>

    <v-card v-else-if="!settlement" outlined class="settlement-state-card">
      <v-icon color="primary" size="42">mdi-receipt-text-remove-outline</v-icon>
      <h1>Encaissement introuvable</h1>
      <p>Ce regroupement n'est plus disponible dans l'historique.</p>
      <v-btn outlined color="primary" class="text-none" to="/history">
        <v-icon left small>mdi-arrow-left</v-icon>
        Retour a l'historique
      </v-btn>
    </v-card>

    <div v-else class="settlement-history-cockpit">
      <header class="settlement-history-header">
        <div class="settlement-history-header__main">
          <span class="settlement-history-header__icon" aria-hidden="true">
            <v-icon color="primary">mdi-receipt-text-check-outline</v-icon>
          </span>
          <div>
            <div class="settlement-history-header__meta">{{ currentDate }}</div>
            <h1>Encaissement table {{ settlement.tableReference }}</h1>
            <p>{{ receiptPayload.orders.length }} commandes · {{ paymentLabel }}</p>
          </div>
        </div>
        <div class="settlement-history-header__actions">
          <v-btn outlined color="primary" class="text-none" to="/history">
            <v-icon left small>mdi-arrow-left</v-icon>
            Historique
          </v-btn>
          <v-btn
            outlined
            color="primary"
            class="text-none"
            :disabled="!urlPDF"
            @click="downloadSettlementPdf"
          >
            <v-icon left small>mdi-download</v-icon>
            Telecharger PDF
          </v-btn>
          <v-btn
            color="primary"
            depressed
            class="text-none"
            :loading="printLoading"
            :disabled="printLoading"
            @click="printSettlementReceipt"
          >
            <v-icon left small>{{ printModeIcon }}</v-icon>
            Reimprimer {{ printModeLabel }}
          </v-btn>
        </div>
      </header>

      <section class="settlement-history-kpis" aria-label="Resume de l'encaissement">
        <article class="settlement-history-kpi">
          <span>Total encaisse</span>
          <strong>{{ formatCurrency(receiptPayload.totalAmount) }}</strong>
          <small>Montant d'origine du regroupement</small>
        </article>
        <article class="settlement-history-kpi">
          <span>Sous-total</span>
          <strong>{{ formatCurrency(receiptPayload.subtotalBeforeDiscount) }}</strong>
          <small>Avant remise globale</small>
        </article>
        <article class="settlement-history-kpi">
          <span>Remise</span>
          <strong>{{ formatCurrency(receiptPayload.discountAmount) }}</strong>
          <small>Appliquee lors de l'encaissement</small>
        </article>
      </section>

      <section class="settlement-orders-panel">
        <div class="settlement-orders-panel__header">
          <div>
            <h2>Commandes archivees</h2>
            <p>Chaque commande conserve son parcours de detail individuel.</p>
          </div>
          <v-chip small label color="primary" outlined>
            {{ receiptPayload.orders.length }} commandes
          </v-chip>
        </div>

        <article
          v-for="order in receiptPayload.orders"
          :key="order.id"
          class="settlement-order"
        >
          <div class="settlement-order__header">
            <div>
              <h3>Commande #{{ order.orderNumber }}</h3>
              <span>{{ order.details.length }} lignes</span>
            </div>
            <v-btn
              :to="`/history/ticket/${order.id}`"
              outlined
              small
              color="primary"
              class="text-none"
            >
              Detail de la commande
              <v-icon small right>mdi-open-in-new</v-icon>
            </v-btn>
          </div>
          <v-simple-table dense>
            <thead>
              <tr>
                <th>Produit</th>
                <th class="text-center">Qte</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in order.details" :key="`${order.id}-${index}`">
                <td>{{ line.name }}</td>
                <td class="text-center">{{ line.qty }}</td>
                <td class="text-right">{{ formatCurrency(line.total) }}</td>
              </tr>
            </tbody>
          </v-simple-table>
        </article>
      </section>
    </div>
  </v-container>
</template>

<script>
import moment from 'moment'
import { jsPDF as JSPDF } from 'jspdf'
import price from '@/helpers/price'
import {
  buildCashierSettlementReceiptPayload,
  sendCashierSettlementReceipt,
} from '@/helpers/cashierSettlementReceipt'
import {
  formatReceiptProductHeader,
  formatReceiptProductLine,
  receiptHeaderLines,
} from '@/helpers/cashierReceipt'

export default {
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      loadPage: true,
      printLoading: false,
      urlPDF: '',
    }
  },
  computed: {
    settlement() {
      return this.$store.get('history/cashRegisterSettlement')
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
        receipt_review_qr_url: this.$store.get('shop/receipt_review_qr_url'),
        receipt_review_qr_label: this.$store.get('shop/receipt_review_qr_label'),
      }
    },
    receiptPayload() {
      return buildCashierSettlementReceiptPayload(this.settlement || {}, this.shopInfo)
    },
    currentDate() {
      return this.settlement && this.settlement.createdAt
        ? moment(this.settlement.createdAt).local().format('DD/MM/YYYY a HH:mm')
        : '-'
    },
    paymentLabel() {
      return this.receiptPayload.paymentMethod || 'Paiement non renseigne'
    },
    printModeLabel() {
      return this.shopInfo.smart_print_app ? 'SmartPrint' : 'Cloud'
    },
    printModeIcon() {
      return this.shopInfo.smart_print_app ? 'mdi-printer-pos' : 'mdi-cloud-print-outline'
    },
  },
  mounted() {
    this.loadSettlement()
  },
  beforeDestroy() {
    if (this.urlPDF && typeof URL !== 'undefined') URL.revokeObjectURL(this.urlPDF)
  },
  methods: {
    async loadSettlement() {
      this.loadPage = true
      try {
        const loaded = await this.$store.dispatch(
          'history/getCashRegisterSettlement',
          this.$route.params.id
        )
        if (loaded) this.generateSettlementPdf()
      } finally {
        this.loadPage = false
      }
    },
    async printSettlementReceipt() {
      if (!this.settlement || this.printLoading) return false
      this.printLoading = true
      try {
        const result = await sendCashierSettlementReceipt({
          payload: this.receiptPayload,
          smartPrint: this.shopInfo.smart_print_app,
          printerIp: this.shopInfo.shop_printer_ip,
          dispatch: this.$store.dispatch,
        })
        if (!result.ok) {
          this.$store.dispatch('notifications/error', result.message)
        }
        return result.ok
      } catch (error) {
        this.$store.dispatch('notifications/error', "L'impression du ticket a echoue.")
        return false
      } finally {
        this.printLoading = false
      }
    },
    generateSettlementPdf() {
      if (!this.settlement || !this.receiptPayload.orders.length) return
      const size = this.createSettlementPdf(0)
      this.createSettlementPdf(size)
    },
    createSettlementPdf(size) {
      const payload = this.receiptPayload
      const doc = new JSPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, size > 0 ? size + 10 : 1000],
      })
      const left = 3
      const right = 55
      const center = 29
      let y = 5
      const write = (value, options = {}) => {
        const text = String(value == null ? '' : value)
        if (!text) return
        const align = options.align || 'left'
        const x = options.x == null ? left : options.x
        doc.setFont('courier', options.style || 'normal')
        doc.setFontSize(options.fontSize || 7.5)
        y += options.gap || 3
        doc.text(text, x, y, { align })
      }
      const line = () => write('--------------------------------', { fontSize: 7 })

      write(this.shopInfo.shop_name, { align: 'center', x: center, fontSize: 10, style: 'bold' })
      receiptHeaderLines(payload).forEach((text) => write(text, { align: 'center', x: center }))
      write(payload.table, { style: 'bold' })
      write(`Date : ${payload.currentDate}`)
      payload.orders.forEach((order) => {
        line()
        write(`Commande n° ${order.orderNumber}`, { style: 'bold' })
        write(formatReceiptProductHeader(payload.isTvaActive))
        order.details.forEach((item) => {
          write(`${formatReceiptProductLine(item, payload.isTvaActive)} EUR`)
        })
      })
      line()
      if (payload.discountAmount > 0) {
        write(`SOUS-TOTAL : ${payload.subtotalBeforeDiscount} EUR`, { align: 'right', x: right })
        write(`REMISE : -${payload.discountAmount} EUR`, { align: 'right', x: right })
      }
      if (payload.isTvaActive) {
        payload.vatBreakdown.forEach((item) => {
          write(`HT (${item.vatRate} %) : ${item.totalHt} EUR`, { align: 'right', x: right })
          write(`TVA (${item.vatRate} %) : ${item.totalVat} EUR`, { align: 'right', x: right })
        })
      }
      write(`TOTAL${payload.isTvaActive ? ' TTC' : ''} : ${payload.totalAmount} EUR`, {
        align: 'right', x: right, fontSize: 10, style: 'bold', gap: 4,
      })
      write(`Paiement : ${payload.paymentMethod}`, { align: 'right', x: right })

      if (size === 0) return y
      const blob = doc.output('blob')
      if (this.urlPDF && typeof URL !== 'undefined') URL.revokeObjectURL(this.urlPDF)
      this.urlPDF = URL.createObjectURL(blob)
    },
    downloadSettlementPdf() {
      if (!this.urlPDF || typeof document === 'undefined') return
      const link = document.createElement('a')
      link.href = this.urlPDF
      link.download = `encaissement-${this.settlement.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
    },
  },
}
</script>

<style scoped>
.settlement-history-page { background: #f7f9fc; min-height: 100%; }
.settlement-state-card { margin: 20px auto; max-width: 720px; padding: 32px; text-align: center; }
.settlement-history-cockpit { margin: 20px auto; max-width: 1180px; }
.settlement-history-header,
.settlement-orders-panel { background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; }
.settlement-history-header { align-items: flex-start; display: flex; gap: 20px; justify-content: space-between; padding: 20px; }
.settlement-history-header__main,
.settlement-history-header__actions { align-items: flex-start; display: flex; gap: 12px; }
.settlement-history-header__actions { flex-wrap: wrap; justify-content: flex-end; }
.settlement-history-header__icon { align-items: center; background: #e8f2ff; border-radius: 8px; display: inline-flex; height: 44px; justify-content: center; width: 44px; }
.settlement-history-header h1,
.settlement-orders-panel h2,
.settlement-order h3 { color: #121826; letter-spacing: 0; margin: 0; }
.settlement-history-header h1 { font-size: 1.5rem; }
.settlement-history-header p,
.settlement-orders-panel p { color: #687386; margin: 4px 0 0; }
.settlement-history-header__meta { color: #687386; font-size: 0.8rem; }
.settlement-history-kpis { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 16px 0; }
.settlement-history-kpi { background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; display: flex; flex-direction: column; min-height: 112px; padding: 16px; }
.settlement-history-kpi span,
.settlement-history-kpi small { color: #687386; }
.settlement-history-kpi strong { color: #121826; font-size: 1.35rem; margin: 4px 0; }
.settlement-orders-panel { overflow: hidden; }
.settlement-orders-panel__header,
.settlement-order__header { align-items: center; display: flex; justify-content: space-between; gap: 16px; }
.settlement-orders-panel__header { border-bottom: 1px solid #e8edf3; padding: 18px; }
.settlement-order { border-bottom: 1px solid #e8edf3; padding: 18px; }
.settlement-order:last-child { border-bottom: 0; }
.settlement-order__header { margin-bottom: 12px; }
.settlement-order__header span { color: #687386; font-size: 0.8rem; }
@media (max-width: 760px) {
  .settlement-history-header,
  .settlement-history-header__actions,
  .settlement-orders-panel__header,
  .settlement-order__header { align-items: stretch; flex-direction: column; }
  .settlement-history-kpis { grid-template-columns: 1fr; }
}
</style>
