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
      <div v-if="urlPDF" class="border rounded shadow">
        <iframe
          :src="urlPDF"
          width="50%"
          height="600px"
          frameborder="0"
          class="w-full"
        ></iframe>
      </div>
    </template>
    <!-- <div>
      Hello
      <pre type="json">{{ receipToken }}</pre>
    </div> -->
    <!-- <pre type="json"> {{ id }}</pre> -->
    <!-- <pre type="json"> order id :{{ currentDate }}</pre>
    <pre type="json">dataArchivedOrder{{ dataArchivedOrder }} ++++++++</pre>
    <pre type="json"> {{ detailArchivedOrder }}</pre>
    <pre type="json"> {{ totalAmount }}</pre>
    <pre type="json"> {{ shopInfo }}</pre> -->
  </v-container>
</template>
<script>
import moment from 'moment'
import { jsPDF as JSPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default {
  layout: 'empty',
  data() {
    return {
      orderId: this.$route.params.id,
      loadPage: '',
      urlPDF: '',
      receipToken: '',
    }
  },

  computed: {
    currentDate() {
      return moment(this.detailArchivedOrder[0].updated)
        .local()
        .format('DD/MM/YYYY à HH:mm:ss')
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
        shop_phone: this.$store.get('shop/shop_phone'),
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
    if (this.$route.query.token !== undefined) {
      this.receipToken = this.$route.query.token
    }
    this.$store
      .dispatch('history/getOrderByToken', this.receipToken)
      .finally(() => {
        console.log('data order', this.$route)
        console.log('Query', this.$route)
        console.log('Current DAte', this.detailArchivedOrder[0].updated)
        const size = this.generateCleanTicketPDF(0)
        this.generateCleanTicketPDF(size)
      })
  },
  methods: {
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
      // this.textWithBoldPart(
      //   doc,
      //   '',
      //   this.detailArchivedOrder[0].username,
      //   5,
      //   (y += bigGap)
      // )
      this.textWithBoldPart(
        doc,
        'Commande n°',
        this.detailArchivedOrder[0].ordernumber,
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
