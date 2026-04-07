<template>
  <v-container fluid class="full-width pa-5">
    <div>
      <v-alert v-model="errMsg" outlined text type="error">
        <v-row align="center" no-gutters>
          <v-col class="grow">
            {{ message }}
          </v-col>
          <v-spacer></v-spacer>
          <v-col class="shrink">
            <v-btn icon small @click="errMsg = false">
              <v-icon>mdi-close-circle-outline</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
    </div>

    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <v-card v-else outlined class="mt-5 full-width">
      <v-app-bar flat color="grey lighten-4" light>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <v-spacer></v-spacer>
        <div>
          <v-btn
            v-if="selectedOrders.length"
            color="red"
            elevation="3"
            style="color: white; height: 40px; margin: 0px 8px 2px 0px"
            :loading="deleteLoading"
            @click="deleteSelectedOrders()"
            >Supprimer
            <v-icon small right>mdi-delete-forever</v-icon>
          </v-btn>
        </div>

        <v-text-field
          v-model="searchFilter"
          class="mt-6"
          placeholder="Recherche une commande, table ou client"
          label="Rechercher une commande, table ou client"
          outlined
          dense
          append-icon="mdi-card-search"
        ></v-text-field>
      </v-app-bar>
      <v-data-table
        v-model="selectedOrders"
        :headers="headers"
        :items="dataOrders"
        :search="searchFilter"
        :hide-default-header="$vuetify.breakpoint.smAndDown"
        show-select
      >
        <template #[`item.created`]="{ item }">
          <div>
            {{ orderTime(item.created) }}
          </div>
        </template>
        <template #[`item.subtotal`]="{ item }">
          <div>{{ conversiRp(item.subtotal) }} €</div>
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip v-if="item.status === 1" color="grey"> En attente </v-chip>
          <v-chip v-if="item.status === 2" color="success">
            En preparation
          </v-chip>
          <v-chip v-if="item.status === 3" color="primary"> Terminer </v-chip>
          <v-chip v-if="item.status === 4" color="warning"> Annuler </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-row class="d-flex flex-nowrap" dense>
            <v-card-actions v-if="item.status === 1">
              <v-btn
                outlined
                small
                color="success"
                class="text-none"
                @click="btnApprove(item.id)"
                >Valider <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions v-if="item.status === 2">
              <v-btn
                outlined
                small
                color="primary"
                class="text-none"
                @click="btnFinish(item.id)"
                >Prête <v-icon small right>mdi-check-circle</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions>
              <v-btn
                outlined
                small
                color="default"
                class="text-none"
                @click="$router.push(`orders/detail/${item.id}`)"
                >Details
                <v-icon small right>mdi-information-outline</v-icon>
              </v-btn>
            </v-card-actions>
            <v-card-actions v-if="item.status !== 4 && item.status !== 3">
              <v-btn
                outlined
                small
                color="primaryPurple"
                class="text-none"
                @click="printOrderDetails(item)"
                >Imprimer
                <v-icon small right>mdi-printer-outline</v-icon>
              </v-btn>
              <v-btn
                outlined
                small
                color="red"
                class="text-none"
                @click="btnCancel(item.id)"
                >Annuler <v-icon small right>mdi-close-circle</v-icon>
              </v-btn>
            </v-card-actions>
          </v-row>
        </template>
      </v-data-table>
    </v-card>
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
      >Sound <v-icon small right>mdi-close-circle</v-icon>
    </v-btn> -->
    <!-- <pre type="json">{{ lastUpdate }}</pre> -->
    <!-- <pre type="json">{{ selectedOrders }}</pre> -->

    <v-snackbars
      :messages.sync="orderNotifications"
      :timeout="60000"
      top
      right
      color="blue"
    ></v-snackbars>
  </v-container>
</template>
<script>
import formatdate from '@/helpers/formatdate'
import moment from 'moment'
import price from '@/helpers/price'
import VSnackbars from 'v-snackbars'
export default {
  components: {
    'v-snackbars': VSnackbars,
  },
  mixins: [formatdate, price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      polling: null,
      errMsg: false,
      lastUpdate: moment(new Date()),
      searchFilter: '',
      orderNotifications: [],
      selectedOrders: [],
      headers: [
        { text: 'Date', value: 'created', filterable: true },
        {
          text: 'Numero de commande',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Table', value: 'username', filterable: true },
        { text: 'Client', value: 'customer', filterable: true },
        // { text: 'Operateur', value: 'operator' },
        { text: 'Total', value: 'subtotal', filterable: true },
        { text: 'Status', value: 'status', filterable: true },
        { text: 'Actions', value: 'actions' },
      ],
      items: [
        {
          text: 'Menus',
          disabled: false,
          to: '/menus',
        },
        {
          text: 'Orders',
          disabled: true,
          to: '/orders',
        },
      ],
    }
  },

  computed: {
    dataOrders() {
      return this.$store.get('orders/dataOrders')
    },
    message() {
      return this.$store.get('orders/message')
    },
    updateTimeStamp() {
      return this.$store.get('orders/lastCreatedOrder')
    },
    user() {
      return this.$store.get('users/user')
    },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_mail: this.$store.get('shop/shop_mail'),
        shop_description: this.$store.get('shop/shop_description'),
        shop_hours: this.$store.get('shop/shop_hours'),
        shop_payment_methods: this.$store.get('shop/shop_payment_methods'),
        shop_profile_image: this.$store.get('shop/shop_profile_image'),
        shop_status: this.$store.get('shop/shop_status'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
      }
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('orders/getAllOrder').finally(() => {
      this.loadPage = false
    })
    this.pollData()
  },
  beforeDestroy() {
    clearInterval(this.polling)
  },
  methods: {
    async printOrderDetails(order) {
      console.log('Print order details for order', order)
      await this.$store.dispatch('orders/getDetailOrder', order.id)
      const orderDetails = await this.$store.get('orders/detailOrder')
      const orderInfo = {
        table: order.username,
        client: order.customer,
        created: order.created,
        total: orderDetails.reduce((sum, item) => sum + item.total, 0),
        paymentMethod: order.payment,
        remark: order.remark,
      }

      if (this.shopInfo.smart_print_app) {
        // genereate ESC/POS data
        console.log('Generating ESC/POS data for Smart Print...')
        const escposBuffer = this.generateEscPos(
          orderDetails,
          this.shopInfo,
          orderInfo
        )
        console.log('ESC/POS BUFFER:', escposBuffer)
        const dataFormatESCPOS = escposBuffer.toString('base64')

        await fetch(`http://${this.shopInfo.shop_printer_ip}:8989/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketType: 'cuisine',
            dataFormatESCPOS,
            dataFormatXML: null,
          }),
        })
      } else {
        console.log('Printing via Cloud Printing Service...')
        // Envoie au backend pour impression cloud
        this.printReceiptCloud(orderDetails, this.shopInfo, orderInfo)
      }
      console.log(
        'printWithSmartPrint',
        this.shopInfo.shop_printer_ip,
        'orderDetails',
        orderDetails
      )
    },
    soundNotification() {
      const audio = new Audio(window.location.origin + '/soundnotif.ogg')
      audio.play()
    },
    pollData() {
      this.polling = setInterval(() => {
        this.$store.dispatch('orders/getAllOrder')
        const newOrders = this.numberOfNewOrders()
        if (newOrders) {
          this.orderNotifications.push(
            'Il y a ' + newOrders + ' nouvelles commandes ! '
          )
          this.soundNotification()
        }
        this.lastUpdate = this.updateTimeStamp
      }, 15000)
    },
    numberOfNewOrders() {
      return this.dataOrders.filter(
        (x) => moment(x.created).diff(this.lastUpdate) > 0
      ).length
    },
    searchData() {
      this.$store.dispatch('orders/getAllOrder')
    },
    deleteSelectedOrders() {
      this.deleteLoading = true

      Promise.all(
        this.selectedOrders.map((element) =>
          this.$store.dispatch('orders/deleteOrder', { id: element.id })
        )
      )
        .then(() => {
          this.selectedOrders = []
          this.deleteLoading = false
        })
        .finally(() => {
          this.$store.dispatch('orders/getAllOrder')
        })
    },
    async btnApprove(id) {
      const data = {
        operator: this.user.id,
        status: 2,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
    async btnFinish(id) {
      const data = {
        operator: this.user.id,
        status: 3,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
    async btnCancel(id) {
      const data = {
        operator: this.user.id,
        status: 4,
      }
      const res = await this.$store.dispatch('orders/updateOrder', { id, data })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'Failed request!')
        this.errMsg = true
      }
    },
    orderTime(time) {
      return moment(new Date(time)).format('DD/MM à HH:mm')
    },
    generateEscPos(order, shopInfo, orderInfo) {
      console.log('Generating ESC/POS for order:', order, 'shopInfo:', shopInfo)
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

      const tripleOn = () => Buffer.from([0x1d, 0x21, 0x22]) // Some example values for tripleOn
      const tripleOff = () => Buffer.from([0x1d, 0x21, 0x00]) // Same as doubleOff (example, modify as needed)

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
      push(alignCenter(), boldOn(), doubleOff())
      push(esc(shopInfo.shop_name + '\n'))
      push(doubleOff(), boldOff())

      push(esc('\n'))

      // ---------------------------------------
      // 👤 CLIENT + COMMANDE
      // ---------------------------------------
      push(
        alignCenter(),
        boldOn(),
        tripleOn(),
        esc('Commande n° '),
        boldOn(),
        esc(order[0].ordernumber + '\n'),
        boldOff(),
        tripleOff()
      )
      push(
        alignCenter(),
        boldOn(),
        doubleOn(),
        esc((orderInfo.table || '') + '\n'),
        doubleOff(),
        boldOff()
      )

      push(
        alignCenter(),
        boldOn(),
        doubleOn(),
        esc(('Client:' + orderInfo.client || '') + '\n'),
        doubleOff(),
        boldOff()
      )
      push(esc('Date : '))
      push(
        boldOn(),
        esc(this.currentDate(orderInfo.created) + '\n\n'),
        boldOff()
      )

      // ---------------------------------------
      // 🛒 TABLEAU PRODUITS
      // ---------------------------------------
      push(
        boldOn(),
        alignLeft(),
        esc('QTE   PRODUIT                PRIX\n\n'),
        boldOff()
      )
      push(line())

      order.forEach((item) => {
        const qty = (item.qty + 'x').padEnd(5)
        const name = (item.name + '').padEnd(20).slice(0, 20)
        const price = item.total.toFixed(2).padStart(7)

        push(alignLeft(), esc(`${qty}${name}${price} `), euroSymbol, esc('\n'))
        if (item.customizationList && Array.isArray(item.customizationList)) {
          item.customizationList.forEach((customItem) => {
            if (customItem.name) {
              const customDetails = this.splitByWords(customItem.name) // Split name into words
              customDetails.forEach((detail) => {
                push(esc(`  - ${detail}\n`)) // Format each customization detail
              })
            }
          })
        }
      })

      push(line())

      // ---------------------------------------
      // 🧾 TOTAUX
      // ---------------------------------------
      // const subtotal = (this.totalAmount - this.totalAmount * 0.2).toFixed(2)
      // const tva = (this.totalAmount * 0.2).toFixed(2)

      // push(
      //   alignRight(),
      //   esc(`Sous-total : ${subtotal} `),
      //   euroSymbol,
      //   esc('\n')
      // )
      // push(alignRight(), esc(`TVA 20%    : ${tva} `), euroSymbol, esc('\n'))

      // push(alignRight(), boldOn(), doubleOn())
      push(
        alignRight(),
        boldOn(),
        doubleOn(),
        esc(`TOTAL : ${orderInfo.total.toFixed(2)} `),
        euroSymbol,
        doubleOff(),
        boldOff(),
        esc('\n')
      )
      push(doubleOff(), boldOff(), esc('\n'))

      push(alignRight(), esc('Paiement : ' + orderInfo.paymentMethod + '\n'))
      push(line())

      console.log('Adding remark to receipt:', orderInfo.remark)
      if (orderInfo.remark.length > 0) {
        push(alignCenter(), doubleOn(), boldOn(), esc('----------\n'))
        push(alignLeft(), esc('NOTE: ' + orderInfo.remark + '\n'))
        push(alignCenter(), doubleOn(), boldOn(), esc('----------\n'))
        push(alignRight(), doubleOff(), boldOff())
      }
      // ---------------------------------------
      // 🙏 FOOTER
      // ---------------------------------------
      push(alignCenter(), esc('Made with smarteat.fr\n\n\n\n\n'))

      push(cut())

      return Buffer.concat(out)
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
    currentDate(date) {
      return moment(date).local().format('DD/MM/YYYY à HH:mm')
    },

    printReceiptCloud(order, shopInfo, orderInfo) {
      console.log('Printing receipt via cloud for order:', order)
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
        '<text em="true" align="center" width="1" height="1">' +
        shopInfo.shop_name +
        '</text>' +
        '<feed line="1"/>' +
        '<feed line="1"/>' +
        // === Commande ===
        '<text em="true" smooth="true" width="3" height="3">' +
        'Commande n°' +
        order[0].ordernumber +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="true" align="center" width="2" height="2">' +
        orderInfo.table +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="true" align="center" width="2" height="2">' +
        'Client:' +
        orderInfo.client +
        '</text>' +
        '<feed line="1"/>' +
        '<text em="false" smooth="true" width="1" height="1">Date :</text> ' +
        '<text em="true" smooth="true" width="1" height="1">' +
        this.currentDate(orderInfo.created) +
        '</text>' +
        '<feed line="2"/>' +
        '<text align="left"> ' +
        'QTE   PRODUIT                PRIX\n\n' +
        '</text>' +
        '<text  em="false" align="left" >--------------------------------</text>' +
        '<feed line="1"/>' +
        // === Produits ===
        order
          .map((item) => {
            const qty = (item.qty + 'x').padEnd(5)
            const name = (item.name + '').padEnd(20).slice(0, 20)
            const price = item.total.toFixed(2).padStart(7)

            let block =
              `<text em="true" align="left" >${qty}${name}${price} €</text>` +
              `<feed line="1"/>`

            if (Array.isArray(item.customizationList)) {
              item.customizationList.forEach((customItem) => {
                if (customItem.name) {
                  this.splitByWords(customItem.name).forEach((detail) => {
                    block +=
                      `<text  em="false" align="left">  - ${detail}</text>` +
                      `<feed line="1"/>`
                  })
                }
              })
            }

            return block
          })
          .join('') +
        '<text>--------------------------------</text>' +
        '<feed line="1"/>' +
        '<text align="right" width="2" height="2">TOTAL : ' +
        orderInfo.total.toFixed(2) +
        ' €</text>' +
        '<feed line="2"/>' +
        '<text em="false"  width="1" height="1" >Paiement : ' +
        orderInfo.paymentMethod +
        '</text>' +
        '<feed line="1"/>' +
        '<text>--------------------------------</text>' +
        '<feed line="2"/>' +
        // === Pied de ticket ===
        '<feed line="1"/>' +
        (orderInfo.remark && orderInfo.remark.length > 0
          ? '<text em="true" align="center">----------</text>' +
            '<feed line="1"/>' +
            '<text em="false" align="left">NOTE: ' +
            orderInfo.remark +
            '</text>' +
            '<feed line="1"/>' +
            '<text em="true" align="center">----------</text>' +
            '<feed line="1"/>'
          : '') +
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
        ticketType: 'commande',
        orderId: this.orderId,
      })
    },
  },
}
</script>
