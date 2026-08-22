<template>
  <v-container>
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <template>
      <TakeawayChip
        v-if="dataArchivedOrder"
        :value="dataArchivedOrder.is_takeaway"
        class="mt-3"
      />
      <v-row>
        <v-col cols="12" md="6">
          <div v-if="urlPDF" class="border rounded shadow">
            <iframe
              :src="urlPDF"
              width="60%"
              height="600px"
              frameborder="0"
              class="w-full"
            ></iframe>
          </div>
        </v-col>

        <v-col cols="12" md="6" class="d-flex justify-start mt-3">
          <div v-if="shopInfo.smart_print_app" class="mt-10">
            <v-btn
              :disabled="printLoading"
              :loading="printLoading"
              @click="printReceiptSmartPrint()"
            >
              <v-icon class="mr-2">mdi-printer</v-icon>
              Impression avec SmartPrint
            </v-btn>
          </div>

          <div v-else class="mt-10">
            <v-btn
              :disabled="printLoading"
              :loading="printLoading"
              @click="printReceiptCloud()"
            >
              <v-icon class="mr-2">mdi-printer</v-icon>
              Impression Cloud
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </template>
    <!-- <pre type="json"> {{ id }}</pre> -->
    <!-- <pre type="json"> order id :{{ orderId }}</pre>
    <pre type="json"> {{ dataArchivedOrder }} </pre>
    <pre type="json"> {{ detailArchivedOrder }}</pre>
    <pre type="json"> {{ totalAmount }}</pre> -->
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
  },
  mounted() {
    this.loadReceiptData()
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
      return true
    },
    unlockReceiptPrint() {
      this.printLoading = false
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
      } catch (error) {
        // Receipt preparation errors do not come from the printer response.
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
      } catch (error) {
        // Receipt preparation errors do not come from the printer response.
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
