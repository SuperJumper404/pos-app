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
    <v-card v-else ref="ordersCard" outlined class="mt-5 full-width">
      <v-app-bar flat color="grey lighten-4" light>
        <div class="kitchen-toggle">
          <v-switch
            :input-value="isKitchenClosed"
            :loading="kitchenToggleLoading"
            :disabled="kitchenToggleLoading"
            :label="isKitchenClosed ? 'Cuisine fermée' : 'Cuisine ouverte'"
            color="red"
            dense
            hide-details
            inset
            class="mt-0"
            @change="toggleKitchenClosed"
          ></v-switch>
        </div>

        <v-spacer></v-spacer>

        <v-btn
          v-if="selectedOrders.length"
          color="red"
          dark
          elevation="3"
          class="mr-3"
          :loading="deleteLoading"
          @click="deleteSelectedOrders()"
          >Supprimer
          <v-icon small right>mdi-trash-can</v-icon>
        </v-btn>

        <v-text-field
          v-model="searchFilter"
          style="max-width: 320px"
          placeholder="Rechercher une commande, table ou client"
          outlined
          dense
          hide-details
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
        <template #[`item.ordernumber`]="{ item }">
          <div class="order-reference">
            <div class="order-reference__number">
              #{{ item.ordernumber }}
              <v-chip
                v-if="isTakeawayOrder(item)"
                small
                color="orange darken-1"
                dark
                class="order-reference__takeaway-icon"
                aria-label="À emporter"
                title="À emporter"
              >
                <v-icon x-small>mdi-basket</v-icon>
              </v-chip>
            </div>
            <div class="order-reference__date">
              {{ orderHour(item.created) }} • {{ orderDayMonth(item.created) }}
            </div>
          </div>
        </template>
        <template #[`item.subtotal`]="{ item }">
          <div>{{ formatCurrency(item.subtotal) }}</div>
        </template>
        <template #[`item.payment_status`]="{ item }">
          <v-chip
            dark
            :color="paymentStatusColor(item)"
            class="orders-data-chip"
          >
            {{ paymentStatusText(item) }}
          </v-chip>
        </template>
        <template #[`item.status`]="{ item }">
          <v-chip
            v-if="item.status === 1"
            color="grey"
            class="orders-data-chip"
          >
            En attente
          </v-chip>
          <v-chip
            v-if="item.status === 2"
            color="success"
            class="orders-data-chip"
          >
            En préparation
          </v-chip>
          <v-chip
            v-if="item.status === 3"
            color="primary"
            class="orders-data-chip"
          >
            Terminée
          </v-chip>
          <v-chip
            v-if="item.status === 4"
            color="warning"
            class="orders-data-chip"
          >
            Annulée
          </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-row class="d-flex flex-nowrap" dense>
            <v-card-actions v-if="item.status === 1">
              <v-btn
                outlined
                small
                color="success"
                class="text-none"
                @click="btnApprove(item)"
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
                >Détails
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
                @click="btnCancel(item)"
                >{{
                  item.payment_provider === 'stripe' &&
                  item.payment_status === 'paid'
                    ? 'Rembourser'
                    : 'Annuler'
                }}
                <v-icon small right>mdi-close-circle</v-icon>
              </v-btn>
            </v-card-actions>
          </v-row>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="cancelDialog" max-width="350" persistent>
      <v-card>
        <v-card-title>{{ cancelDialogTitle }}</v-card-title>
        <v-card-text>{{ cancelDialogMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closeCancelDialog">
            Annuler
          </v-btn>
          <v-btn
            color="red"
            dark
            class="text-none"
            :loading="cancelLoading"
            @click="confirmCancelOrder"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- <pre type="json">{{ dataOrders }}</pre> -->
    <!-- <v-btn @click="soundNotification()"
      >Sound <v-icon small right>mdi-close-circle</v-icon>
    </v-btn> -->
    <!-- <pre type="json">{{ lastUpdate }}</pre> -->
    <!-- <pre type="json">{{ selectedOrders }}</pre> -->
  </v-container>
</template>
<script>
import formatdate from '@/helpers/formatdate'
import moment from 'moment'
import price from '@/helpers/price'
const {
  getPaymentStatusText,
  getPaymentStatusColor,
} = require('@/helpers/paymentStatus')
export default {
  mixins: [formatdate, price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      deleteLoading: false,
      kitchenToggleLoading: false,
      polling: null,
      errMsg: false,
      cancelDialog: false,
      cancelLoading: false,
      pendingCancelOrder: null,
      lastUpdate: moment(new Date()),
      searchFilter: '',
      selectedOrders: [],
      headers: [
        {
          text: 'Commande',
          value: 'ordernumber',
          filterable: true,
        },
        { text: 'Table', value: 'username', filterable: true },
        { text: 'Client', value: 'customer', filterable: true },
        // { text: 'Operateur', value: 'operator' },
        { text: 'Total', value: 'subtotal', filterable: true },
        { text: 'Paiement', value: 'payment_status', filterable: true },
        { text: 'Statut', value: 'status', filterable: true },
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
    isKitchenClosed() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/kitchen_closed')
      )
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
        kitchen_closed: this.$store.get('shop/kitchen_closed'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
        auto_print_order_tickets: this.$store.get(
          'shop/auto_print_order_tickets'
        ),
      }
    },
    isPendingCancelRefund() {
      const item = this.pendingCancelOrder
      return (
        item &&
        item.payment_provider === 'stripe' &&
        item.payment_status === 'paid'
      )
    },
    cancelDialogTitle() {
      return this.isPendingCancelRefund ? 'Remboursement' : 'Annulation'
    },
    cancelDialogMessage() {
      return this.isPendingCancelRefund
        ? 'Êtes-vous sûr de vouloir rembourser ?'
        : 'Êtes-vous sûr de vouloir annuler ?'
    },
  },
  watch: {
    dataOrders() {
      this.scheduleFit(true)
    },
    searchFilter() {
      this.scheduleFit(true)
    },
  },
  mounted() {
    this.loadPage = true
    Promise.all([
      this.$store.dispatch('orders/getAllOrder'),
      this.$store.dispatch('shop/getShopInfo'),
    ]).finally(() => {
      this.loadPage = false
      this.$nextTick(this.applyFit)
    })
    this.pollData()
    window.addEventListener('resize', this.scheduleFit)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.scheduleFit)
    }
  },
  beforeDestroy() {
    clearInterval(this.polling)
    window.removeEventListener('resize', this.scheduleFit)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
  },
  methods: {
    isTakeawayOrder(item) {
      return [true, 1, '1'].includes(item && item.is_takeaway)
    },
    async toggleKitchenClosed(value) {
      this.kitchenToggleLoading = true
      const res = await this.$store.dispatch('shop/updateShopInfo', {
        data: {
          kitchen_closed: value ? 1 : 0,
        },
      })
      if (!res) {
        this.$store.dispatch(
          'notifications/error',
          "Impossible de modifier l'etat de la cuisine."
        )
      }
      this.kitchenToggleLoading = false
    },
    async printOrderDetails(order) {
      console.log('Print order details for order', order)
      await this.$store.dispatch('orders/getDetailOrder', order.id)
      const orderDetails = await this.$store.get('orders/detailOrder')
      const orderInfo = {
        table: order.username,
        client: order.customer,
        created: order.created,
        total: orderDetails.reduce(
          (sum, item) => this.roundPrice(sum + this.parsePrice(item.total)),
          0
        ),
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
          this.$store.dispatch('notifications/info', {
            message: 'Il y a ' + newOrders + ' nouvelles commandes ! ',
            timeout: 3500,
          })
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
          this.$store.dispatch('orders/deleteOrder', {
            id: element.id,
            notify: false,
          })
        )
      )
        .then((results) => {
          const deletedOrders = results.filter(Boolean).length
          this.selectedOrders = []
          this.deleteLoading = false
          if (deletedOrders) {
            this.$store.dispatch('notifications/success', {
              message:
                deletedOrders > 1
                  ? `${deletedOrders} commandes supprimées avec succès.`
                  : 'Commande supprimée avec succès.',
            })
          }
        })
        .finally(() => {
          this.$store.dispatch('orders/getAllOrder')
        })
    },
    async btnApprove(item) {
      const data = {
        operator: this.user.id,
        status: 2,
      }
      const res = await this.$store.dispatch('orders/updateOrder', {
        id: item.id,
        data,
      })
      if (res) {
        if (this.shouldAutoPrintOrderTickets()) {
          await this.printOrderDetails(item)
        }
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
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
        this.$store.set('orders/message', 'La requête a échoué.')
        this.errMsg = true
      }
    },
    btnCancel(item) {
      this.pendingCancelOrder = item
      this.cancelDialog = true
    },
    closeCancelDialog() {
      if (this.cancelLoading) return
      this.cancelDialog = false
      this.pendingCancelOrder = null
    },
    async confirmCancelOrder() {
      const item = this.pendingCancelOrder
      if (!item) return
      this.cancelLoading = true
      if (
        item.payment_provider === 'stripe' &&
        item.payment_status === 'paid'
      ) {
        const refunded = await this.$store.dispatch(
          'orders/refundStripeOrder',
          {
            id: item.id,
          }
        )
        if (refunded) {
          this.$store.dispatch('orders/getAllOrder')
        }
        this.cancelLoading = false
        this.closeCancelDialog()
        return
      }

      const data = {
        operator: this.user.id,
        status: 4,
      }
      const res = await this.$store.dispatch('orders/updateOrder', {
        id: item.id,
        data,
      })
      if (res) {
        this.$store.dispatch('orders/getAllOrder')
      } else {
        this.$store.set('orders/message', 'La requête a échoué.')
        this.errMsg = true
      }
      this.cancelLoading = false
      this.closeCancelDialog()
    },
    orderHour(time) {
      return moment(new Date(time)).format('HH:mm')
    },
    orderDate(time) {
      return moment(new Date(time)).format('DD/MM/YYYY')
    },
    orderDayMonth(time) {
      return moment(new Date(time)).format('DD/MM')
    },
    scheduleFit(force) {
      if (force === true) this.fitForce = true
      if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
      this.fitRaf = requestAnimationFrame(() => {
        this.fitRaf = null
        const f = this.fitForce
        this.fitForce = false
        this.applyFit(f)
      })
    },
    // Reduit le tableau pour qu'il tienne dans la largeur de l'ecran, sans
    // scroll horizontal, via la propriete CSS `zoom` (reflow naturel : pas de
    // compensation de hauteur a faire).
    applyFit(force) {
      const card = this.$refs.ordersCard && this.$refs.ordersCard.$el
      if (!card) return
      const el = card.querySelector('.v-data-table')
      if (!el) return

      // Garde anti-boucle : le zoom modifie la hauteur de la carte, ce qui
      // re-declenche le ResizeObserver. On ne recalcule que si la largeur a
      // change, sauf si force=true (changement de donnees / recherche).
      const available = card.clientWidth
      if (
        !force &&
        this.observing &&
        Math.abs(available - (this.lastAvailable || 0)) < 1
      ) {
        return
      }
      this.lastAvailable = available

      // Reset avant de mesurer la largeur naturelle du tableau
      el.style.zoom = ''

      const table = el.querySelector('.v-data-table__wrapper table')
      const natural = table ? table.scrollWidth : el.scrollWidth
      if (!natural || !available) return

      const scale = Math.min(1, available / natural)
      el.style.zoom = scale < 1 ? String(scale) : ''

      if (this.resizeObserver && !this.observing) {
        this.resizeObserver.observe(card)
        this.observing = true
      }
    },
    paymentStatusText(item) {
      return getPaymentStatusText(item)
    },
    paymentStatusColor(item) {
      return getPaymentStatusColor(item)
    },
    shouldAutoPrintOrderTickets() {
      return [true, 1, '1', 'true'].includes(
        this.shopInfo.auto_print_order_tickets
      )
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
      const tripleOn = () => Buffer.from([0x1d, 0x21, 0x22])

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
        doubleOn(),
        esc('Commande\n'),
        tripleOn(),
        esc('#' + order[0].ordernumber + '\n'),
        boldOff(),
        doubleOff()
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
        const price = this.formatTicketNumber(item.total).padStart(7)

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
      push(
        alignRight(),
        boldOn(),
        doubleOn(),
        esc(`TOTAL : ${this.formatTicketNumber(orderInfo.total)} `),
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
    formatTicketNumber(value) {
      return this.formatCurrency(value).replace(' €', '')
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
            const price = this.formatTicketNumber(item.total).padStart(7)

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
        this.formatTicketNumber(orderInfo.total) +
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
<style scoped>
/* Bug connu Vuetify (#10164) : les entetes de v-data-table se desalignent
   selon la largeur quand une cellule d'entete passe sur 2 lignes. On force le
   non-retour a la ligne et un alignement vertical coherent entete/corps. */
::v-deep .v-data-table-header th {
  white-space: nowrap;
  vertical-align: middle;
}

::v-deep .v-data-table td {
  vertical-align: middle;
}

.kitchen-toggle {
  min-width: 170px;
}

.order-reference {
  min-width: 96px;
  line-height: 1.25;
}

.order-reference__number {
  font-size: 22px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.87);
}

.order-reference__takeaway-icon {
  border-radius: 50% !important;
  height: 22px !important;
  justify-content: center;
  margin-left: 3px;
  min-width: 22px !important;
  padding: 0 !important;
  vertical-align: 3px;
  width: 22px;
}

.v-chip.orders-data-chip {
  border-radius: 12px !important;
}

.order-reference__date {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}
</style>
