<template>
  <v-container>
    <v-alert :value="alert" :type="alertType" dismissible>{{
      alertText
    }}</v-alert>
    <v-row class="mt-5">
      <!-- kiri -->
      <v-col v-if="loadPage" md="8" xs="6" cols="12">
        <v-card outlined height="425px" class="overflow-y-auto">
          <Loading />
        </v-card>
      </v-col>
      <v-col v-else md="8" xs="6" cols="12">
        <v-card
          v-if="dataProduct.length === 0"
          outlined
          height="425px"
          class="overflow-y-auto"
        >
          <v-card-text class="text-center" style="margin-top: 25vh">
            <v-icon large>mdi-emoticon-sad-outline</v-icon>
            <p>Menu empty</p>
          </v-card-text>
        </v-card>
        <v-card v-else class="overflow-y-auto overflow-x-hidden pa-1">
          <v-expansion-panels accordion>
            <v-expansion-panel v-for="(category, i) in categories" :key="i">
              <v-expansion-panel-header
                ><h3>{{ category }}</h3></v-expansion-panel-header
              >
              <v-expansion-panel-content>
                <v-row>
                  <v-col
                    v-for="items in getProductPerCategorie(category)"
                    :key="items.id"
                    md="3"
                    sm="4"
                    cols="6"
                  >
                    <v-card hover outlined max-height="150px;">
                      <v-img
                        height="100px"
                        :src="`${staticURL}/api/v1/imgproducts/${items.image}`"
                      ></v-img>
                      <v-card-title class="mb-n5">
                        <h6
                          class="text-truncate"
                          style="font-weight: bold; font-size: large"
                        >
                          {{ items.name }}
                        </h6>
                      </v-card-title>
                      <v-card-text class="mb-n5">
                        <p
                          style="
                            border: none;
                            margin: inherit;
                            height: 50px;
                            overflow: auto;
                            overflow-x: hidden;
                          "
                        >
                          {{ items.description }}
                        </p>
                        <br />
                        <span
                          class="mb-2"
                          style="font-weight: bold; font-size: medium"
                          >{{ conversiRp(items.price) }} €</span
                        >
                      </v-card-text>
                      <v-card-actions>
                        <v-btn
                          color="success"
                          small
                          width="100%"
                          class="text-capitalize"
                          @click="addToCart(items)"
                          >Ajouter</v-btn
                        >
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
        <pre type="json">{{ dataProduct }}</pre>
        <!-- <v-card outlined max-height="150px;">
                    <v-img
                      height="100px"
                      :src="`${staticURL}/api/v1/imgproducts/${items.image}`"
                    ></v-img>
                    <v-card-title class="mb-n5">
                      <h6
                        class="text-truncate"
                        style="font-weight: bold; font-size: large"
                      >
                        {{ items.name }}
                      </h6>
                    </v-card-title>
                    <v-card-text class="mb-n5">
                      <p
                        style="
                          border: none;
                          margin: inherit;
                          height: 50px;
                          overflow: auto;
                          overflow-x: hidden;
                        "
                      >
                        {{ items.description }}
                      </p>
                      <br />
                      <span
                        class="mb-2"
                        style="font-weight: bold; font-size: medium"
                        >{{ conversiRp(items.price) }} €</span
                      >
                    </v-card-text>
                    <v-card-actions>
                      <v-btn
                        color="success"
                        small
                        width="100%"
                        class="text-capitalize"
                        @click="addToCart(items)"
                        >Add</v-btn
                      >
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </div>
          
        </v-card> -->
      </v-col>
      <!-- kanan -->
      <v-col md="4" xs="6">
        <!-- <v-col md="4" class="d-none d-sm-none d-md-block"> -->
        <v-card v-if="loadPage" outlined height="425px">
          <Loading />
        </v-card>
        <v-card v-else outlined height="100%" class="pa-2">
          <div
            v-if="cartItem.length === 0"
            class="text-center"
            style="height: 300px"
          >
            <div style="margin-top: 30px">
              <v-icon large>mdi-cart-outline</v-icon>
              <p class="font-weight-bold">Your cart is an empty!</p>
            </div>
          </div>
          <div v-else class="box overflow-y-auto" height="100%">
            <v-card
              v-for="itm in cartItem"
              :key="itm.id"
              outlined
              class="mb-2 d-flex"
            >
              <v-card-text class="d-block">
                <v-row>
                  <v-avatar size="75" rounded>
                    <v-img
                      :src="`${staticURL}/api/v1/imgproducts/${itm.image}`"
                    ></v-img>
                  </v-avatar>
                  <p
                    class="font-weight-bold"
                    style="font-weight: bold; font-size: large"
                  >
                    {{ itm.name }}
                    <br />
                    Qty: {{ conversiRp(itm.qty) }}
                  </p>
                </v-row>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  outlined
                  color="warning"
                  small
                  icon
                  @click="minusBtn(itm)"
                  ><v-icon>mdi-minus</v-icon></v-btn
                >
                <v-btn outlined color="success" small icon @click="plusBtn(itm)"
                  ><v-icon>mdi-plus</v-icon></v-btn
                >
                <v-btn
                  color="red lighten-2"
                  outlined
                  small
                  icon
                  @click="deleteBtn(itm)"
                  ><v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </div>
          <v-card-actions v-if="cartItem.length > 0" class="d-block">
            <v-btn
              color="success"
              small
              width="100%"
              class="text-capitalize mt-3 mb-3"
              @click="btnOrder"
              >Order</v-btn
            >
            <v-spacer></v-spacer>
            <v-btn
              color="red ligthen-1"
              small
              width="100%"
              class="text-capitalize"
              dark
              @click="btnCancel"
              >Cancel</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <!-- modals -->
    <v-dialog v-model="stateDialog" max-width="350">
      <v-card>
        <v-card-title>
          <h4>Cart items</h4>
        </v-card-title>
        <div
          v-if="cartItem.length === 0"
          class="text-center"
          style="height: 300px"
        >
          <div style="margin-top: 30px">
            <v-icon large>mdi-cart-outline</v-icon>
            <p class="font-weight-bold">Your cart is an empty!</p>
          </div>
        </div>
        <div v-else class="box overflow-y-auto" style="height: 310px">
          <v-card
            v-for="itm in cartItem"
            :key="itm.id"
            outlined
            class="mb-2 d-flex"
          >
            <!-- <v-avatar class="ma-3" size="125" tile> -->
            <!-- <v-img
              :src="`${staticURL}/api/v1/imgproducts/${itm.image}`"
            ></v-img> -->
            <!-- </v-avatar> -->
            <v-card-text class="d-block">
              <p class="font-weight-bold">{{ itm.name }}</p>
              <p>Qty: {{ conversiRp(itm.qty) }}</p>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn outlined color="warning" small icon @click="minusBtn(itm)"
                ><v-icon>mdi-minus</v-icon></v-btn
              >
              <v-btn outlined color="success" small icon @click="plusBtn(itm)"
                ><v-icon>mdi-plus</v-icon></v-btn
              >
              <v-btn
                color="red lighten-2"
                outlined
                small
                icon
                @click="deleteBtn(itm)"
                ><v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
        <div class="d-block pa-3">
          <v-btn
            v-show="cartItem.length != 0"
            outlined
            small
            color="success"
            width="100%"
            class="mb-3 text-capitalize"
            @click="btnOrder"
            >Order</v-btn
          >
          <v-btn
            v-show="cartItem.length != 0"
            outlined
            small
            dark
            color="red ligthen-1"
            width="100%"
            class="mb-3 text-capitalize"
            @click="btnCancel"
            >Cancel</v-btn
          >
          <v-btn
            outlined
            small
            dark
            color="primary"
            width="100%"
            class="mb-3 text-capitalize"
            @click="$store.dispatch('setDialog', false)"
            >Close</v-btn
          >
        </div>
      </v-card>
    </v-dialog>
    <v-dialog v-model="itemDialog" max-width="350">
      <v-form ref="formItem">
        <v-card>
          <v-toolbar color="primary" dark>Opening from the bottom</v-toolbar>
          <v-card-text>
            {{ selectedItem }}
            <div
              v-for="(item, itemId) in selectedItem.product_customization"
              :key="itemId"
            >
              <div class="text-h4 text--primary">{{ item.name }}</div>
              <p>
                {{ item.description }}
                {{ item.limit_choice ? 'Max(' + item.limit_choice + ')' : '' }}
              </p>
              <div>
                <!-- Condition for checkboxes -->
                <template v-if="item.limit_choice > 1">
                  <div v-for="(choice, i) in item.items" :key="'checkbox-' + i">
                    <v-checkbox
                      class="custom-spacing"
                      v-model="currentItem[itemId]"
                      multiple
                      :label="
                        choice.price > 0
                          ? `${choice.name} (+${choice.price}€)`
                          : `${choice.name}`
                      "
                      :disabled="
                        currentItem[itemId].length >= item.limit_choice &&
                        currentItem[itemId]
                          .map((x) => x.id)
                          .indexOf(choice.id) === -1
                      "
                      :rules="[(v) => rulesCheckboxes(v, item.mandatory)]"
                      :value="choice"
                    ></v-checkbox>
                  </div>
                </template>

                <!-- Condition for radio buttons -->
                <v-radio-group
                  v-if="item.limit_choice === 1"
                  v-model="currentItem[itemId]"
                  row
                >
                  <v-radio
                    v-for="(choice, i) in item.items"
                    :key="'radio-' + i"
                    :label="
                      choice.price > 0
                        ? `${choice.name} (+${choice.price}€)`
                        : choice.name
                    "
                    :rules="[(v) => rulesCheckboxes(v, item.mandatory)]"
                    :value="choice"
                  ></v-radio>
                </v-radio-group>
              </div>
            </div>
            <pre type="json">{{ currentItem }}</pre>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn color="warning" @click="resetForm()">Retour</v-btn>
            <v-btn color="success" @click="submitFormItem()">Valider</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <!-- <pre>{{ dataProduct }}</pre> -->
    <!-- <pre>server{{ mainconfig.default.server }}</pre> -->
    <!-- <pre>{{ breakpoint }}</pre> -->
    <pre>ici {{ itemDialog }}</pre>
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import price from '@/helpers/price'
// import * as config from '@/nuxt.config'
export default {
  components: {
    Loading,
  },
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  mixins: [price],
  middleware: 'auth',
  data: () => ({
    itemDialog: false,
    selectedItem: [],
    currentItem: [],

    // config: config,
    alert: null,
    alertType: null,
    alertText: null,
    dialog: false,
    loadPage: false,
    cartItem: [],
    total: 0,
    idxCart: 0,
  }),
  head() {
    return {
      title: `${
        this.$route.name.charAt(0).toUpperCase() + this.$route.name.slice(1)
      }`,
    }
  },
  computed: {
    categories() {
      const items = this.$store
        .get('products/dataProduct')
        .map((x) => x.categoryid)
      return [...new Set(items)]
    },
    staticURL() {
      return this.$store.get('staticURL')
    },
    dataProduct() {
      return this.$store.get('products/dataProduct')
    },
    totalPage() {
      return this.$store.get('products/totalPage')
    },
    stateDialog() {
      return this.$store.get('stateDialog')
    },
  },
  mounted() {
    this.loadPage = true
    this.cartItem = []

    const calls = [
      this.$store.dispatch('products/getProducts'),
      this.$store.dispatch('cart/setTotal', 0),
      this.$store.dispatch('cart/setIndex', 0),
    ]
    console.log('result', this.$store.get('products/dataProduct'))
    Promise.all(calls).finally(() => {
      this.loadPage = false
    })
  },
  watch: {
    itemDialog(newVal) {
      if (newVal) {
        console.log('Watch New Val', newVal)
        // if the dialog is opened
        if (this.$refs.formItem) {
          this.$refs.formItem.resetValidation()
          this.$refs.formItem.reset()
        }
      }
    },
  },
  methods: {
    resetForm() {
      if (this.$refs.formItem) {
        this.$refs.formItem.resetValidation()
        this.$refs.formItem.reset()
        this.itemDialog = false
      }
    },
    submitFormItem() {
      const isValid = this.$refs.formItem.validate()
      console.log('Is FOrm Item Valid', isValid)
      if (isValid) this.itemDialog = false
    },

    rulesCheckboxes(value, mandatory) {
      // Check if the value length is 0 and the field is mandatory
      if (mandatory && (!value || value.length === 0)) {
        return 'Selectionner au moins un choix'
      }
      return true
    },
    change() {
      this.dialog = this.stateDialog
    },
    getProductPerCategorie(category) {
      return this.dataProduct.filter(function (x) {
        return x.categoryid === category
      })
    },
    totalPrice() {
      this.total = 0
      this.cartItem.forEach((el) => {
        this.total = this.total + el.subtotal
        this.$store.dispatch('cart/setTotal', this.total)
      })
    },
    indexCart() {
      this.idxCart = 0
      this.cartItem.forEach((elm) => {
        this.idxCart = this.idxCart + elm.qty
        this.$store.dispatch('cart/setIndex', this.idxCart)
      })
    },
    showAlert(text, type) {
      this.alert = true
      this.alertText = text
      this.alertType = type
      window.scrollTo(0, 0)
      setTimeout(() => {
        this.alert = null
      }, 5000)
    },
    addToCart(params) {
      if (params.stock < 1) {
        this.showAlert('Produit non disponible', 'error')
      }
      if (params.product_customization.length > 0) {
        this.itemDialog = true
        this.selectedItem = this.dataProduct.find((x) => x.id === params.id)
        this.currentItem = this.selectedItem.product_customization.map(
          (x) => []
        )
      } else {
        const cek = this.cartItem.filter((item) => {
          return item.id === params.id
        })
        if (cek.length >= 1) {
          this.showAlert('Produit déja selectionner ', 'info')
        } else {
          const newData = {
            id: params.id,
            name: params.name,
            categoryid: params.categoryid,
            image: params.image,
            stock: params.stock,
            price: params.price,
            subtotal: 1 * params.price,
            qty: 1,
          }
          this.cartItem = [...this.cartItem, newData]
          this.idItem = params.id
        }
        this.totalPrice()
        this.indexCart()
      }
    },
    minusBtn(params) {
      this.cartItem.forEach((e) => {
        if (e.id === params.id) {
          e.qty -= 1
          e.subtotal = e.qty * e.price
          if (e.qty < 1) {
            e.qty = 1
            e.subtotal = 1 * e.price
          }
        }
      })
      this.totalPrice()
      this.indexCart()
    },
    plusBtn(params) {
      this.cartItem.forEach((e) => {
        if (e.id === params.id) {
          e.qty += 1
          e.subtotal = e.qty * e.price
          if (e.qty > e.stock) {
            e.qty = e.stock
            e.subtotal = e.stock * e.price
          }
        }
      })
      this.totalPrice()
      this.indexCart()
    },
    deleteBtn(params) {
      const newData = this.cartItem.filter((item) => {
        return item.id !== params.id
      })
      this.cartItem = newData
      if (this.cartItem.length === 0) {
        this.cartItem = []
        this.$store.dispatch('cart/setTotal', 0)
        this.$store.dispatch('cart/setIndex', 0)
      }
      this.totalPrice()
      this.indexCart()
    },
    btnOrder() {
      this.$store.dispatch('cart/setTocart', this.cartItem)
      this.$router.push('/cart')
    },
    btnCancel() {
      this.cartItem = []
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
    },
    pageProduct() {
      this.$store.dispatch('products/getProducts')
    },
  },
}
</script>
<style scoped>
.box {
  border: 1px solid #eeeeee;
}
</style>
