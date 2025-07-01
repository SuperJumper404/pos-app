<template>
  <v-container>
    <v-row class="mt-8">
      <v-col md="8" sm="12" cols="12">
        <v-card outlined height="100%" class="pa-2 overflow-y-auto">
          <v-card-text v-if="!dataCart" class="row justify-center">
            <p style="margin-top: 30vh">
              <v-icon large>mdi-emoticon-sad</v-icon> Your cart is empty!
            </p>
          </v-card-text>
          <div
            v-else
            :style="$vuetify.breakpoint.smAndDown ? 'width: fit-content' : ''"
          >
            <v-card
              v-for="itm in dataCart"
              :key="itm.id"
              outlined
              class="mb-2 pa-2 d-flex justify-space-between align-center"
            >
              <v-img
                class="rounded-lg"
                :src="`${staticURL}/api/v1/imgproducts/${itm.image}`"
                max-width="100px"
              />
              <v-card-subtitle class="d-md-flex">
                <h6
                  class="text-center text-truncate"
                  style="
                    font-weight: bold;
                    font-size: large;
                    color: rgba(0, 0, 0, 0.8);
                  "
                >
                  {{ itm.name }} <br />
                  {{ itm.price }} €
                </h6>
              </v-card-subtitle>
              <v-card-subtitle class="d-md-flex">
                <v-col>
                  <v-chip
                    v-for="(choice, index) in itm.customizationList"
                    :key="index"
                  >
                    {{ choice.name }}
                  </v-chip>
                </v-col>
              </v-card-subtitle>
              <v-card-subtitle class="d-md-flex">
                <v-btn
                  style="font-size: x-large"
                  color="success"
                  fab
                  small
                  dark
                >
                  {{ itm.qty }}</v-btn
                >
              </v-card-subtitle>
            </v-card>
          </div>
        </v-card>
      </v-col>
      <v-col md="4" sm="12" cols="12">
        <v-card v-if="loadPage" outlined class="pa-2">
          <Loading />
        </v-card>
        <v-card v-else outlined class="pa-2 overflow-x-hidden overflow-y-auto">
          <v-card-actions v-if="!dataCart">
            <v-btn
              color="primary"
              width="100%"
              dark
              class="text-capitalize"
              @click="$router.push('/menus')"
              >Back to menu</v-btn
            >
          </v-card-actions>
          <v-form v-else v-model="isValue" @submit.prevent="paymentBtn">
            <v-text-field
              v-model="formuser.customer"
              type="text"
              label="Name Customer"
              :rules="[(v) => !!v || 'Name customer required']"
              placeholder="Input name customer"
              required
            ></v-text-field>
            <v-text-field
              v-model="formuser.phone"
              type="tel"
              label="Phone Number"
              :rules="[
                (v) =>
                  /^[0-9]+$/.test(v) || 'Seuls les chiffres sont autorisés',
              ]"
              placeholder="Input phone number"
              class="mb-5"
              required
            ></v-text-field>
            <v-select
              v-model="formuser.payment"
              :items="items"
              label="Payment methods"
              :rules="[(v) => !!v || 'Paymen methods required']"
            ></v-select>
            <v-textarea
              v-model="formuser.notes"
              label="Note à la commande"
              :rows="2"
              filled
              prepend-inner-icon="mdi-comment"
              placeholder="Ajouter une note à la commande"
            ></v-textarea>
            <!-- struc -->
            <v-card-title>
              <h5>Total</h5>
              <v-spacer></v-spacer>
              <h5>{{ conversiRp(total) }} €</h5>
            </v-card-title>
            <v-card-text>
              <!-- <div class="d-flex justify-space-between">
                <p>Cashier</p>
                <p class="font-weight-bold">Mika Tambayong</p>
              </div> -->
              <!-- <div class="d-flex justify-space-between">
                <p>Subtotal</p>
                <p class="font-weight-bold">{{ conversiRp(totalCart) }} €</p>
              </div>
              <div class="d-flex justify-space-between">
                <p>ppn * 10%</p>
                <p class="font-weight-bold">{{ conversiRp(ppn) }} €</p>
              </div>
              <div class="d-flex justify-space-between">
                <p>Total</p>
                <p class="font-weight-bold">{{ conversiRp(total) }} €</p>
              </div> -->
            </v-card-text>
            <v-card-actions>
              <v-btn
                :disabled="!isValue"
                :loading="loadingBtn"
                type="submit"
                color="success"
                width="100%"
                class="text-capitalize"
                >Order</v-btn
              >
            </v-card-actions>
            <v-card-actions>
              <v-btn
                color="red lighten-1"
                width="100%"
                dark
                class="text-capitalize"
                @click="cancelCart"
                >Cancel</v-btn
              >
            </v-card-actions>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
    {{ dataCart }}
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import price from '@/helpers/price'
export default {
  components: {
    Loading,
  },
  mixins: [price],
  middleware: 'auth',
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  data: () => ({
    ppn: 0,
    total: 0,
    isValue: false,
    loadingBtn: false,
    loadPage: false,
    formuser: {
      customer: '',
      phone: '',
      payment: '',
      notes: '',
    },
    items: ['Carte Bleu ', 'Espece', 'Ticket Restaurant'],
  }),
  computed: {
    staticURL() {
      return this.$store.get('staticURL')
    },
    dataCart() {
      return this.$store.get('cart/dataCart')
    },
    totalCart() {
      return this.$store.get('cart/totalCart')
    },
    insertId() {
      return this.$store.get('cart/insertId')
    },
    message() {
      return this.$store.get('cart/message')
    },
  },
  mounted() {
    this.total = this.totalCart
  },
  methods: {
    async paymentBtn() {
      const params = {
        customer: this.formuser.customer,
        customerID: parseInt(localStorage.getItem('idUser')),
        operator: null,
        subtotal: this.total,
        payment: this.formuser.payment,
        remark: this.formuser.notes,
        phone: this.formuser.phone,
        status: 1, // 1 pending & 2 approve
        created: new Date(),
      }
      const res = await this.$store.dispatch('cart/postOrder', params)
      if (res) {
        this.dataCart.forEach((e) => {
          const detailData = {
            orderid: this.insertId,
            productid: e.id,
            price: e.price,
            qty: e.qty,
            total: e.qty * e.price,
            remark: 'Transaction',
            customizationList: e.customizationList,
            operator: 2,
          }
          const detail = this.$store.dispatch(
            'cart/postDetailOrder',
            detailData
          )
          if (detail) {
            // alert('Order success!')
            this.$store.set('stateDialog', false)
            this.$router.push('/menus')
          } else {
            alert('Oder bermasalah!')
            this.$store.set('stateDialog', false)
            this.$router.push('/menus')
          }
        })
      } else {
        // console.log(this.message)
      }
    },
    cancelCart() {
      this.$store.set('stateDialog', false)
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
      this.$router.push('/menus')
    },
  },
}
</script>
