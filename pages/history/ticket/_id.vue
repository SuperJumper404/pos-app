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
            <v-btn @click="printReceiptSmartPrint()">
              <v-icon class="mr-2">mdi-printer</v-icon>
              Impression avec SmartPrint
            </v-btn>
          </div>

          <div v-else class="mt-10">
            <v-btn @click="printReceiptCloud()">
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
// import formatdate from '@/helpers/formatdate'
// import price from '@/helpers/price'
// import moment from 'moment'
import moment from 'moment'
import { jsPDF as JSPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default {
  data() {
    return {
      orderId: this.$route.params.id,
      loadPage: '',
      urlPDF: '',
    }
  },
  computed: {
    currentDate() {
      return moment(this.dataArchivedOrder.created)
        .local()
        .format('DD/MM/YYYY à HH:mm')
    },
    detailArchivedOrder() {
      return this.$store.get('history/detailArchivedOrder')
    },
    dataArchivedOrder() {
      console.log('store temp ', this.$store.get('history/dataArchivedOrders'))
      return this.$store.get('history/dataArchivedOrders').filter((x) => {
        return String(x.id) === String(this.$route.params.id)
      })[0]
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
      }
    },
    totalAmount() {
      return this.detailArchivedOrder.reduce((sum, item) => sum + item.total, 0)
    },
    isTvaActive() {
      return [true, 1, '1', 'true'].includes(this.shopInfo.activate_tva)
    },
    subtotalWithoutTva() {
      return this.totalAmount - this.tvaAmount
    },
    tvaAmount() {
      return this.totalAmount * 0.2
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('history/getAllArchivedOrders').finally(() => {
      this.loadPage = false
    })
    const size = this.generateCleanTicketPDF(0)
    this.generateCleanTicketPDF(size)
  },
  methods: {
    async printReceiptSmartPrint() {
      const escposBuffer = this.generateEscPos()
      console.log('ESC/POS BUFFER:', escposBuffer)
      const dataFormatESCPOS = escposBuffer.toString('base64')

      await fetch(`http://${this.shopInfo.shop_printer_ip}:8989/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: 'caisse',
          dataFormatESCPOS,
          dataFormatXML: null, // ou generateEposXml() si Epson m30
        }),
      })
    },

    printReceiptCloud() {
      const address = this.shopInfo.shop_adress || ''
      const addressLines = this.splitByWords(address, 30)
      const totalsXml = this.generateCloudTotalsXml()

      const addressXml = addressLines.reduce((prev, line) => {
        return (
          prev +
          `<text width="1" height="1" align="center">${line}</text><feed line="1"/>\n`
        )
      }, '')
      const req =
        '<?xml version="1.0" encoding="utf-8" ?>' +
        '<PrintRequestInfo>' +
        '<ePOSPrint>' +
        '<Parameter>' +
        '<devid>local_printer</devid>' +
        '<timeout>10000</timeout>' +
        '</Parameter>' +
        '<PrintData>' +
        '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
        // === En-tête ===
        '<text smooth="true"></text>' +
        '<text em="true" align="center" width="2" height="2">' +
        this.shopInfo.shop_name +
        '</text>' +
        '<feed line="1"/>' +
        '<text width="1" height="1" em="false" align="center">TEL : ' +
        this.shopInfo.shop_phone +
        '</text>' +
        '<feed line="1"/>' +
        '<text width="1" height="1" em="false" align="center">SIRET : ' +
        this.shopInfo.shop_siret +
        '</text>' +
        '<feed line="1"/>' +
        addressXml +
        '<feed line="2"/>' +
        // === Commande ===
        '<text em="true" align="left" width="1" height="1">' +
        this.dataArchivedOrder.username +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="false">Commande n°</text>' +
        '<text em="true" smooth="true" width="1" height="1">' +
        this.dataArchivedOrder.ordernumber +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="false" smooth="true" width="1" height="1">Date :</text> ' +
        '<text em="true" smooth="true" width="1" height="1">' +
        this.currentDate +
        '</text>' +
        '<feed line="2"/>' +
        '<text> ' +
        'QTE   PRODUIT                PRIX\n\n' +
        '</text>' +
        '<text  em="false">--------------------------------</text>' +
        '<feed line="1"/>' +
        // === Produits ===
        this.detailArchivedOrder
          .map(
            (item) =>
              '<text>' +
              item.qty +
              'x '.padEnd(5) +
              item.name.padEnd(20).slice(0, 20) +
              item.total.toFixed(2).padStart(7) +
              ' €</text><feed line="1"/>'
          )
          .join('') +
        '<text>--------------------------------</text>' +
        '<feed line="1"/>' +
        // === Totaux ===
        totalsXml +
        '<feed line="2"/>' +
        '<text em="false"  width="1" height="1" >Paiement :' +
        this.dataArchivedOrder.used_payment_method +
        '</text>' +
        '<feed line="1"/>' +
        '<text>--------------------------------</text>' +
        '<feed line="2"/>' +
        // === Pied de ticket ===
        '<text align="center">À très bientôt !</text>' +
        '<feed line="1"/>' +
        '<text align="center">' +
        this.shopInfo.shop_name +
        '</text>' +
        '<feed line="1"/>' +
        '<text align="center">Made with smarteat.fr</text>' +
        '<feed line="3"/>' +
        '<cut/>' +
        '</epos-print>' +
        '</PrintData>' +
        '</ePOSPrint>' +
        '</PrintRequestInfo>'

      this.$store.dispatch('printing/postPrintingJob', {
        requete: req,
        ticketType: 'caisse',
        orderId: this.orderId,
      })
    },

    generateCloudTotalsXml() {
      if (!this.isTvaActive) {
        return (
          '<text width="2" height="2">TOTAL* : ' +
          this.formatPrice(this.totalAmount) +
          '</text>'
        )
      }

      return (
        '<text align="right" >Sous-total : ' +
        this.formatPrice(this.subtotalWithoutTva) +
        '</text>' +
        '<feed line="1"/>' +
        '<text>TVA (20%) : ' +
        this.formatPrice(this.tvaAmount) +
        '</text>' +
        '<feed line="1"/>' +
        '<text width="2" height="2">TOTAL TTC : ' +
        this.formatPrice(this.totalAmount) +
        '</text>'
      )
    },

    generateEscPos() {
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
        const price = item.total.toFixed(2).padStart(7)

        push(alignLeft(), esc(`${qty}${name}${price} `), euroSymbol, esc('\n'))
      })

      push(line())

      // ---------------------------------------
      // 🧾 TOTAUX
      // ---------------------------------------
      if (this.isTvaActive) {
        const subtotal = this.subtotalWithoutTva.toFixed(2)
        const tva = this.tvaAmount.toFixed(2)

        push(
          alignRight(),
          esc(`Sous-total : ${subtotal} `),
          euroSymbol,
          esc('\n')
        )
        push(alignRight(), esc(`TVA 20%    : ${tva} `), euroSymbol, esc('\n'))
      }

      push(alignRight(), boldOn(), doubleOn())
      push(
        esc(
          `TOTAL${this.isTvaActive ? ' TTC' : '*'} : ${this.totalAmount.toFixed(
            2
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
        push(alignCenter(), esc('* TVA non applicable, exoneree de TVA\n'))
      }
      push(esc('\n\n\n\n'))

      push(cut())

      return Buffer.concat(out)
    },

    formatPrice(value) {
      return value.toFixed(2) + ' €'
    },

    generateCleanTicketPDF(size) {
      const doc = new JSPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, size > 0 ? size + 10 : 500], // Format ticket thermique
      })

      const center = 29 // Moitié de 58 mm
      let y = 5
      const gap = 3
      const bigGap = 5

      doc.setFontSize(10)
      doc.setFont('courier', 'bold')
      doc.text(this.shopInfo.shop_name, center, (y += gap), { align: 'center' })
      doc.setFont('courier', 'normal')
      doc.setFontSize(8)

      doc.text('TEL:' + this.shopInfo.shop_phone, center, (y += gap), {
        align: 'center',
      })
      const address = this.shopInfo.shop_adress
      const maxWidth = 50 // largeur max en mm
      const lines = doc.splitTextToSize(address, maxWidth)

      lines.forEach((line) => {
        y += gap // espace entre les lignes
        doc.text(line, center, y, { align: 'center' })
      })
      y += gap
      doc.setFontSize(8)
      this.textWithBoldPart(
        doc,
        '',
        this.dataArchivedOrder.username,
        5,
        (y += bigGap)
      )
      this.textWithBoldPart(
        doc,
        'Commande n°',
        this.dataArchivedOrder.ordernumber,
        5,
        (y += bigGap)
      )

      this.textWithBoldPart(doc, 'Date :', this.currentDate, 5, (y += bigGap))

      // Tableau produits
      const items = this.detailArchivedOrder || []

      autoTable(doc, {
        startY: (y += bigGap),
        startX: 1,
        theme: 'plain',
        styles: {
          font: 'courier',
          fontStyle: 'normal', // ou 'bold' si besoin
          fontSize: 8,
        },
        head: [['QTE', 'PRODUIT', 'PRIX']],
        body: items.map((order) => [
          order.qty.toString(),
          order.name,
          order.total.toFixed(2) + ' €',
        ]),
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, // Qté
          1: { cellWidth: 25, halign: 'left' }, // Article
          2: { cellWidth: 20 }, // Prix
        },
        margin: { left: 1 },
      })

      // Totaux
      y = doc.lastAutoTable.finalY + gap
      this.drawDashLine(doc, y)
      // doc.line(2, y, 56, y)
      if (this.isTvaActive) {
        doc.setFontSize(8)
        doc.text(
          'Sous-total: ' + this.formatPrice(this.subtotalWithoutTva),
          53,
          (y += bigGap),
          {
            align: 'right',
          }
        )
        doc.text(
          'Dont TVA (20%): ' + this.formatPrice(this.tvaAmount),
          53,
          (y += bigGap),
          {
            align: 'right',
          }
        )
      }
      doc.setFontSize(10)
      doc.setFont('courier', 'bold')

      doc.text(
        `TOTAL${this.isTvaActive ? ' TTC' : '*'}: ` +
          this.formatPrice(this.totalAmount),
        53,
        (y += bigGap),
        {
          align: 'right',
        }
      )
      doc.setFont('courier', 'normal')

      const text = 'Paiement : ' + this.dataArchivedOrder.used_payment_method

      const paymentLines = this.splitByWords(text, 20)
      console.log('Payment lines :', paymentLines)
      doc.text(paymentLines, 53, (y += bigGap), {
        align: 'right',
      })
      this.drawDashLine(doc, (y += bigGap * paymentLines.length))

      doc.setFontSize(8)
      doc.text('À très bientôt ', center, (y += bigGap), {
        align: 'center',
      })
      doc.text(this.shopInfo.shop_name, center, (y += bigGap), {
        align: 'center',
      })
      doc.text('Made with smarteat.fr ', center, (y += bigGap), {
        align: 'center',
      })

      if (!this.isTvaActive) {
        doc.setFontSize(6)
        doc.text(
          '* TVA non applicable, exoneree de TVA',
          center,
          (y += bigGap),
          {
            align: 'center',
          }
        )
        doc.setFontSize(8)
      }

      const blob = doc.output('blob')
      this.urlPDF = URL.createObjectURL(blob)
      return y
    },
    textWithBoldPart(doc, normalText, boldText, x, y, options = {}) {
      const defaultOptions = { align: 'left' }
      const align = options.align || defaultOptions.align

      // Choisir le point de départ selon l’alignement
      let offsetX = x
      if (align === 'center') {
        const totalWidth = doc.getTextWidth(normalText + boldText)
        offsetX = x - totalWidth / 2
      } else if (align === 'right') {
        const totalWidth = doc.getTextWidth(normalText + boldText)
        offsetX = x - totalWidth
      }

      // Partie normale
      doc.setFont('courier', 'normal')
      doc.text(normalText, offsetX, y)

      // Partie en gras
      const normalWidth = doc.getTextWidth(normalText)
      doc.setFont('courier', 'bold')
      doc.text(boldText, offsetX + normalWidth + 0.5, y) // +0.5mm d’espace
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
      const words = text.split(' ')
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
