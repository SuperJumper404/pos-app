<template>
  <v-container>
    <script src="https://cdn.jsdelivr.net/npm/qz-tray/qz-tray.js"></script>
    <!-- jsrsasign for RSA signing in browser -->
    <script src="https://cdn.jsdelivr.net/npm/jsrsasign"></script>
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
      <div>
        <v-btn @click="printReceipt()"> Imprimer Ticket </v-btn>
      </div>
      <div>
        <v-btn @click="printReceiptSOAP()"> Imprimer Ticket </v-btn>
      </div>
    </template>

    <!-- <pre type="json"> {{ id }}</pre> -->
    <pre type="json"> order id :{{ orderId }}</pre>
    <pre type="json"> {{ dataArchivedOrder }} </pre>
    <pre type="json"> {{ detailArchivedOrder }}</pre>
    <pre type="json"> {{ totalAmount }}</pre>
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
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
      }
    },
    totalAmount() {
      return this.detailArchivedOrder.reduce((sum, item) => sum + item.total, 0)
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
    async printReceipt() {
      try {
        // -- 1️⃣ Initialisation certificat et clé (si tu veux que tout soit côté front)
        const CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDqTCCApGgAwIBAgIUdD4tap8Ms6go/BaW6pwVjSbqKyMwDQYJKoZIhvcNAQEL
BQAwZDELMAkGA1UEBhMCRlIxEzARBgNVBAgMClNvbWUtU3RhdGUxFDASBgNVBAoM
C3NtYXJ0ZWF0LmZyMRQwEgYDVQQLDAtzbWFydGVhdC5mcjEUMBIGA1UEAwwLc21h
cnRlYXQuZnIwHhcNMjUxMTA0MjEzODQ4WhcNMzUxMTAyMjEzODQ4WjBkMQswCQYD
VQQGEwJGUjETMBEGA1UECAwKU29tZS1TdGF0ZTEUMBIGA1UECgwLc21hcnRlYXQu
ZnIxFDASBgNVBAsMC3NtYXJ0ZWF0LmZyMRQwEgYDVQQDDAtzbWFydGVhdC5mcjCC
ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMy+JYfJunbNzOeDhqmLdpLy
/U8N/cO42OWRoTi4UZah6I0ANQULbNOhJr2k2AWIT9VACvp0awGHSdy5dUkgJ5Fv
+odBD5Uz5njwmNiMX3QJacZjwJ/ISqigBzbXXZ/UgZ9e3LV2cv1Ik5ikyOlAEclb
QGsGNMp0gZF9iE23vk7lTKUqieYS2Rc15747QUQvpHn68iRQA4OAzu8rH1fM9iVI
eagidhyhtZTIvgBScLRR49p9DnWYRqy64RyaIKicOJCMPxJX3RaYHW/z5dQ+vRg9
Wj9Jyr1XOSnrJoXnhdETbJGUZiobMbfaxBgecK6+SwL9KUod9gyYTfo4aDPhKqEC
AwEAAaNTMFEwHQYDVR0OBBYEFCrjE0hsJ97PRiq0d2vc7icronRqMB8GA1UdIwQY
MBaAFCrjE0hsJ97PRiq0d2vc7icronRqMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI
hvcNAQELBQADggEBAE9VswBL24uMFFH7rptuANwoPIH6zFIm37YcylWWJ+rAKb9j
5aeyzpLqe7P5XFhRexBB4A8tze9z7jQprTSRyNdRdoEav/VrDgpLBt3dyVLpL4vL
oMgu4bl8R9llb6aodP8w5HLvwFKo+XOx5VbtRKpJGMWFBCb26ibVztnXfksGaVCq
Fc/rXbECr9U8bznRTCp4rpHTEXy0g1Y4UuDeaanavtQWsX2Ea+F3u+rZv3BYuNOc
McQjvWVvK0HVYR3O5qUGwptqbTrydgyvWuVYWkaPbP0DF0v0WJvvvixGzJfGa8mk
bUxYvIIykXpOWTP5VByzQ7qIsydWs2lMFrAbBGs=
-----END CERTIFICATE-----`

        const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDMviWHybp2zczn
g4api3aS8v1PDf3DuNjlkaE4uFGWoeiNADUFC2zToSa9pNgFiE/VQAr6dGsBh0nc
uXVJICeRb/qHQQ+VM+Z48JjYjF90CWnGY8CfyEqooAc2112f1IGfXty1dnL9SJOY
pMjpQBHJW0BrBjTKdIGRfYhNt75O5UylKonmEtkXNee+O0FEL6R5+vIkUAODgM7v
Kx9XzPYlSHmoInYcobWUyL4AUnC0UePafQ51mEasuuEcmiConDiQjD8SV90WmB1v
8+XUPr0YPVo/Scq9Vzkp6yaF54XRE2yRlGYqGzG32sQYHnCuvksC/SlKHfYMmE36
OGgz4SqhAgMBAAECggEAGtrF6W2YO4T631LtEsfsIZIlj3zyT/2q1VGop9vlN7C8
4+GnEqZQ++EjR7SbcP5UGlBwIDGs52JrWbwpmhHRns3lOmBaPuOz0yEbqyueSYYC
jbb/yPVodX2n9JWC/jfNWK4EnPiQVJB0a40RnSZ+Lr79UAxcWEG3zPF+M1NqbsaA
mlNsLeu2naI/vSLI8bN1JBI05vBxZfw+sx5xIxwCTIK8UTSv23LY2SZImOLiQ3L7
lSOYFUPG+DuoBTop6dyIMB57sKOqinn+j+F6MS7IO0i8CB+X1oyJiGu4+MWGQGAl
6oOWn9BM9hQBsPEN3oHmlzrVr4n+Q5GsCXfWp89bUQKBgQDomQTYBPpi64IhPip5
2KCX3MZJp3HIrrN3KfyQqXx/iZFptaEcMcZz0d0QIZeRdlt4sog4d2Y2xi9APXN2
e+wtCYUKtdMsrCvkejRzWVnnI4DkqZz+BXcGfKmkdHxEO0TCp09pmC6U79zHYP1H
3KomW+IkzgNCqW/SWMXqp5RYLwKBgQDhV6v+UVCNt6YI/YxedNatkPSKMiL0eZ9X
Ew5ETPR07M77VyLacw4dTygkix6a6fE0tlXi87d5rvRzdWwFbHdHyRAlBTf/Nnfd
p3s+8FKCB8R2CR5Tvg8hfoV8sVRpyvwZ7sBdy0FoDprDRM6Fodb/zzVRIXWonpp/
WWFVLNImLwKBgHX6t8RCsiZewsDN4YmwYbTl3QYbEtHyG0HEYEGYVnfydXmjETdV
4A17U6ANCe5UlI0iMYpCtevulqUFBn4A2Yj2nS8TjyvHoPPhMJ2Zospk7coOZn1K
lFcMAJhUJXwOfBAoAVXURTxydhADmDVNLlkKniiA/pJfk0KkmK8vlUUtAoGBAIbb
hhYUKeY2MwqMWtYojFWhO4f9C0hOBRsCT3Z2q5HSKujmM/iSBK9rsPV1wKIrQWwv
duT0wCf1mVwDuNriF9yBKsVNAz8cJM4lLi/zeR1ScrPFLz4krz93TYHbSk5p6UfH
x54aRxF0NBCKfCIjQd0j75+XK6f3CzUNk596zGWHAoGBAMYezUrbq2RRiCAudlkc
/N4osfLvwfh8iNyQRcayfL7Hq6iQO1ar1l1co3Pvl5AWBnAhjBYVfKnRRviuO4ar
6yRuCTJ1hvH8641178zlxgOUnMvX7lA4ftawkc4aRkmwSYjJgudOQEGQ0tqaecMh
7qcMNo+8wyA6QvG1f50FmZfH
-----END PRIVATE KEY-----`

        console.log('✅ Certificat et clé chargés.')

        // -- 1️⃣ Sécurité QZ Tray
        console.log('⚙️ Configuration de QZ Tray Security...')
        qz.security.setCertificatePromise(() => {
          console.log('📜 QZ → Certificate Promise appelée')
          return Promise.resolve(CERT_PEM)
        })

        qz.security.setSignaturePromise((toSign) => {
          console.log(
            '✍️ QZ → Signature Promise appelée avec message :',
            toSign
          )
          return (resolve, reject) => {
            try {
              const pk = KEYUTIL.getKey(PRIVATE_KEY_PEM)
              const sig = new KJUR.crypto.Signature({ alg: 'SHA1withRSA' })
              sig.init(pk)
              sig.updateString(toSign)
              const b64 = sig.sign()
              console.log('✅ Signature générée :', b64.slice(0, 30) + '...')
              resolve(b64)
            } catch (e) {
              console.error('❌ Erreur lors de la signature :', e)
              reject(e)
            }
          }
        })

        // -- 2️⃣ Connexion à QZ Tray
        console.log('🔌 Tentative de connexion à QZ Tray...')
        await qz.websocket.connect()
        console.log('✅ Connecté à QZ Tray sur', qz.websocket.getConnection())

        // -- 3️⃣ Recherche de l’imprimante
        console.log('🔍 Recherche de l’imprimante...')
        const printer = await qz.printers.find('Generic / Text Only') // à adapter
        console.log('🖨️ Imprimante trouvée :', printer)
        const config = qz.configs.create(printer)

        // -- 4️⃣ Construction du ticket
        console.log('🧾 Construction du ticket...')
        const order = this.dataArchivedOrder
        const items = this.detailArchivedOrder
        const total = this.totalAmount.toFixed(2)
        const date = moment(order.created).local().format('DD/MM/YYYY HH:mm')

        const lines = []
        lines.push('\x1B\x40') // reset
        lines.push('*** SMART EAT ***\n')
        lines.push(`${this.shopInfo.shop_name}\n`)
        lines.push(`${this.shopInfo.shop_adress}\n`)
        lines.push(`Tél : ${this.shopInfo.shop_phone}\n`)
        lines.push('-----------------------------\n')
        lines.push(`Commande #${order.id}\n`)
        lines.push(`Date : ${date}\n`)
        lines.push('-----------------------------\n')

        items.forEach((item) => {
          const line = `${item.product_name} x${
            item.quantity
          } - ${item.total.toFixed(2)}€`
          lines.push(line + '\n')
        })

        lines.push('-----------------------------\n')
        lines.push(`TOTAL : ${total} €\n\n`)
        lines.push('Merci et à bientôt !\n')
        lines.push('\x1B\x69') // cut

        const data = [{ type: 'raw', format: 'plain', data: lines.join('') }]
        console.log("🧩 Données d'impression prêtes :", lines.join(''))

        // -- 5️⃣ Impression
        console.log('🖨️ Envoi du ticket à l’imprimante...')
        await qz.print(config, data)
        console.log('✅ Impression terminée !')
        this.$toast.success('Ticket imprimé avec succès ✅')
      } catch (err) {
        console.error('❌ Erreur globale dans printReceipt :', err)
        this.$toast.error('Erreur lors de l’impression ❌')
      } finally {
        // -- 6️⃣ Déconnexion
        if (qz.websocket.isActive()) {
          console.log('🔌 Déconnexion de QZ Tray...')
          await qz.websocket.disconnect()
          console.log('✅ Déconnecté de QZ Tray.')
        } else {
          console.log('ℹ️ QZ Tray déjà déconnecté.')
        }
        console.log('🔴 [END] Impression terminée.')
      }
    },

    printReceiptSOAP() {
      const PRINTER_IP = '192.168.1.94' // ← remplace par l’adresse IP de ton imprimante
      const SOAP_URL = `https://${PRINTER_IP}/cgi-bin/epos/service.cgi`
      // const req =
      //   '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
      //   '<s:Header>' +
      //   '<parameter xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
      //   '<devid>local_printer</devid>' +
      //   '<timeout>10000</timeout>' +
      //   '</parameter>' +
      //   '</s:Header>' +
      //   '<s:Body>' +
      //   '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
      //   // ==== Contenu du ticket ====
      //   '<text align="center" font="font_a" width="2" height="2">' +
      //   this.shopInfo.shop_name +
      //   '</text><br/>' +
      //   '<text align="center">TEL : ' +
      //   this.shopInfo.shop_phone +
      //   '</text><br/>' +
      //   '<text align="center">' +
      //   this.shopInfo.shop_adress +
      //   '</text>' +
      //   '<feed line="2"/>' +
      //   '<text align="left">Client : ' +
      //   this.dataArchivedOrder.username +
      //   '</text><br/>' +
      //   '<text align="left">Commande n°' +
      //   this.dataArchivedOrder.ordernumber +
      //   '</text><br/>' +
      //   '<text align="left">Date : ' +
      //   this.currentDate +
      //   '</text>' +
      //   '<feed line="2"/>' +
      //   '<text>--------------------------------</text><br/>' +
      //   // Produits
      //   this.detailArchivedOrder
      //     .map(
      //       (item) =>
      //         '<text align="left">' +
      //         item.qty +
      //         'x ' +
      //         item.name +
      //         '</text>' +
      //         '<text align="right">' +
      //         item.total.toFixed(2) +
      //         ' €</text><br/>'
      //     )
      //     .join('') +
      //   '<feed line="2"/>' +
      //   '<text>--------------------------------</text><br/>' +
      //   // Totaux
      //   '<text align="right">Sous-total : ' +
      //   (this.totalAmount * 0.8).toFixed(2) +
      //   ' €</text><br/>' +
      //   '<text align="right">TVA (20%) : ' +
      //   (this.totalAmount * 0.2).toFixed(2) +
      //   ' €</text><br/>' +
      //   '<text width="2" height="2" align="right">TOTAL : ' +
      //   this.totalAmount.toFixed(2) +
      //   ' €</text>' +
      //   '<feed line="2"/>' +
      //   '<text align="right">Paiement : CB</text>' +
      //   '<feed line="2"/>' +
      //   '<text align="center">À très bientôt</text><br/>' +
      //   '<text align="center">' +
      //   this.shopInfo.shop_name +
      //   '</text><br/>' +
      //   '<text align="center">Made with smarteat.fr</text>' +
      //   '<feed line="2"/>' +
      //   '<cut/>' +
      //   '</epos-print>' +
      //   '</s:Body>' +
      //   '</s:Envelope>'

      const req =
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<s:Header>' +
        '<parameter xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
        '<devid>local_printer</devid>' +
        '<timeout>10000</timeout>' +
        '</parameter>' +
        '</s:Header>' +
        '<s:Body>' +
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
        '<text width="1" height="1" align="center">' +
        this.shopInfo.shop_adress +
        '</text>' +
        '<feed line="2"/>' +
        // === Commande ===
        '<text em="true" align="left" width="1" height="1">' +
        this.dataArchivedOrder.username +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="false">Commande n°</text>' +
        '<text em="true" smooth="true" width="3" height="3">' +
        this.dataArchivedOrder.ordernumber +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="false" smooth="true" width="1" height="1">Date : ' +
        this.currentDate +
        '</text>' +
        '<feed line="2"/>' +
        '<text>--------------------------------</text>' +
        '<feed line="1"/>' +
        // === Produits ===
        this.detailArchivedOrder
          .map(
            (item) =>
              '<text>' +
              item.qty +
              'x ' +
              item.name +
              '  ' +
              item.total.toFixed(2) +
              ' €</text><feed line="1"/>'
          )
          .join('') +
        '<text>--------------------------------</text>' +
        '<feed line="1"/>' +
        // === Totaux ===
        '<text>Sous-total : ' +
        (this.totalAmount * 0.8).toFixed(2) +
        ' €</text>' +
        '<feed line="1"/>' +
        '<text>TVA (20%) : ' +
        (this.totalAmount * 0.2).toFixed(2) +
        ' €</text>' +
        '<feed line="1"/>' +
        '<text width="2" height="2">TOTAL : ' +
        this.totalAmount.toFixed(2) +
        ' €</text>' +
        '<feed line="2"/>' +
        '<text>Paiement : CB</text>' +
        '<feed line="2"/>' +
        // === Pied de ticket ===
        '<text align="center">À très bientôt</text>' +
        '<feed line="1"/>' +
        '<text align="center">' +
        this.shopInfo.shop_name +
        '</text>' +
        '<feed line="1"/>' +
        '<text align="center">Made with smarteat.fr</text>' +
        '<feed line="3"/>' +
        '<cut/>' +
        '</epos-print>' +
        '</s:Body>' +
        '</s:Envelope>'

      const xhr = new XMLHttpRequest()
      xhr.open('POST', SOAP_URL, true)
      xhr.setRequestHeader('Content-Type', 'text/xml; charset=utf-8')
      xhr.setRequestHeader('SOAPAction', '""')
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          console.log('SOAP RESPONSE:', xhr.status, xhr.responseText)
        }
      }
      xhr.send(req)
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
      doc.setFontSize(8)
      doc.text(
        'Sous-total: ' +
          (this.totalAmount - this.totalAmount * 0.2).toFixed(2) +
          ' €',
        53,
        (y += bigGap),
        {
          align: 'right',
        }
      )
      doc.text(
        'Dont TVA (20%): ' + (this.totalAmount * 0.2).toFixed(2) + ' €',
        53,
        (y += bigGap),
        {
          align: 'right',
        }
      )
      doc.setFontSize(10)
      doc.setFont('courier', 'bold')

      doc.text(
        'TOTAL TTC: ' + this.totalAmount.toFixed(2) + ' €',
        53,
        (y += bigGap),
        {
          align: 'right',
        }
      )
      doc.setFont('courier', 'normal')

      doc.text('Paiement : CB', 53, (y += bigGap), { align: 'right' })
      this.drawDashLine(doc, (y += bigGap))

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
  },
}
</script>
