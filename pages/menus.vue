<template>
  <v-container>
    <v-alert :value="alert" :type="alertType" dismissible>{{
      alertText
    }}</v-alert>
    <v-row class="mt-5">
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
            <p>Menu vide</p>
          </v-card-text>
        </v-card>
        <v-card v-else>
          <v-expansion-panels>
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
                    <v-card
                      hover
                      outlined
                      class="d-flex flex-column"
                      height="300"
                    >
                      <!-- Image 5/4 -->
                      <v-img
                        :src="`${staticURL}api/v1/imgproducts/${items.image}`"
                        aspect-ratio="5/4"
                        class="rounded-t"
                      />

                      <!-- Title -->
                      <v-card-title class="py-2 pb-0 mb-0">
                        <div
                          class="text-truncate font-weight-bold"
                          style="font-size: large"
                        >
                          {{ items.name }}
                        </div>
                      </v-card-title>

                      <!-- Text -->
                      <v-card-text class="pt-0 mb-0 pb-1">
                        <div class="text--secondary line-clamp-2">
                          {{ items.description }}
                        </div>

                        <div
                          class="mt-2 font-weight-bold"
                          style="font-size: medium"
                        >
                          {{ conversiRp(items.price) }} €
                        </div>
                      </v-card-text>

                      <!-- Actions always bottom -->
                      <v-card-actions class="mt-auto px-4 pb-3">
                        <v-btn
                          color="success"
                          small
                          block
                          class="text-none font-weight-bold"
                          @click="addToCart(items)"
                        >
                          <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
                          Ajouter
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
        <!-- <pre type="json">{{ dataProduct }}</pre> -->
        <!-- <v-card outlined max-height="150px;">
                    <v-img
                      height="100px"
                      :src="`${staticURL}api/v1/imgproducts/${items.image}`"
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
                        class="text-none"
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
      <v-col md="4" xs="6">
        <!-- <v-col md="4" class="d-none d-sm-none d-md-block"> -->
        <v-card v-if="loadPage" outlined height="425px">
          <Loading />
        </v-card>
        <div v-else>
          <v-card outlined height="100%" class="pa-2">
            <div
              v-if="cartItem.length === 0"
              class="text-center"
              style="height: 300px"
            >
              <div style="margin-top: 30px">
                <v-icon size="90">mdi-room-service-outline</v-icon>
                <p class="font-weight-bold">Votre assiette est vide !</p>
              </div>
            </div>
            <div v-else height="100%">
              <v-card
                v-for="(itm, itemIndex) in cartItem"
                :key="itm.id"
                outlined
                class="d-flex mb-2 flex-column"
                rounded="7"
              >
                <v-row class="d-flex align-center mr-2 ml-2 mt-2" no-gutters>
                  <!-- Left block: avatar + texts -->
                  <v-col class="d-flex align-center">
                    <v-avatar size="75" rounded tile class="mr-3">
                      <v-img
                        class="rounded-lg"
                        :src="`${staticURL}api/v1/imgproducts/${itm.image}`"
                      />
                    </v-avatar>

                    <div>
                      <div
                        class="text-truncate font-weight-bold"
                        style="font-size: large; color: rgba(0, 0, 0, 0.8)"
                      >
                        {{ itm.name }}
                      </div>
                      <div
                        class="font-weight-bold"
                        style="color: rgba(0, 0, 0, 0.8)"
                      >
                        {{ itm.price }} €
                      </div>
                    </div>
                  </v-col>

                  <!-- Right block: actions -->
                  <v-col class="d-flex align-center justify-end" cols="auto">
                    <v-btn
                      outlined
                      color="warning"
                      small
                      icon
                      @click="minusBtn(itm, itemIndex)"
                    >
                      <v-icon>mdi-minus</v-icon>
                    </v-btn>

                    <v-btn
                      class="mx-2"
                      style="font-size: x-large"
                      color="success"
                      fab
                      small
                      dark
                    >
                      {{ itm.qty }}
                    </v-btn>

                    <v-btn
                      outlined
                      color="success"
                      small
                      icon
                      @click="plusBtn(itm, itemIndex)"
                    >
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>

                <v-col>
                  <v-chip
                    v-for="(choice, index) in itm.customizationList"
                    :key="index"
                    class="mr-1 mt-1"
                  >
                    {{ choice.name }}
                  </v-chip>
                </v-col>
              </v-card>
            </div>
            <v-card-actions v-if="cartItem.length > 0">
              <v-btn
                color="primary"
                width="50%"
                class="text-none mt-3 mb-3"
                @click="btnOrder"
                >Commander</v-btn
              >
              <v-btn
                color="red ligthen-1"
                width="50%"
                class="text-none"
                dark
                @click="btnCancel"
                >Annuler</v-btn
              >
            </v-card-actions>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="itemDialog" max-width="350">
      <v-form ref="formItem">
        <v-card>
          <v-toolbar color="primary" dark
            >Sélectionner les suppléments</v-toolbar
          >
          <v-card-text>
            <!-- {{ selectedItem }} -->
            <div
              v-for="(item, itemId) in selectedItem.product_customization"
              :key="itemId"
            >
              <div class="text-h4 text--primary">{{ item.name }}</div>
              <!-- <p>
                {{ item.description }}
                {{ item.limit_choice ? 'Max(' + item.limit_choice + ')' : '' }}
              </p> -->
              <div>
                <!-- Condition for checkboxes -->
                <template v-if="item.limit_choice > 1">
                  <pre>item {{ item }}</pre>
                  <pre>currentITem {{ currentItem }}</pre>
                  <div v-for="(choice, i) in item.items" :key="'checkbox-' + i">
                    <v-checkbox
                      v-model="currentItem[itemId]"
                      class="custom-spacing"
                      multiple
                      :label="
                        choice.price > 0
                          ? `${choice.name} (+${choice.price}€)`
                          : `${choice.name}`
                      "
                      :disabled="
                        (currentItem[itemId] || []).length >=
                          Number(item.limit_choice || 0) &&
                        !(currentItem[itemId] || []).some(
                          (x) => x.id === choice.id
                        )
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
            <!-- <pre type="json">{{ currentItem }}</pre> -->
            <!-- <pre type="json">{{ [...currentItem] }}</pre> -->
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn color="warning" class="text-none" @click="resetForm()"
              >Retour</v-btn
            >
            <v-btn
              color="success"
              class="text-none"
              :disabled="disableCustomizationValidation()"
              @click="submitFormItem()"
              >Valider</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <!-- <pre>{{ dataProduct }}</pre> -->
    <!-- <pre>server{{ mainconfig.default.server }}</pre> -->
    <!-- <pre>{{ breakpoint }}</pre> -->
    <!-- <pre>acces :{{ access }}</pre>
    <pre>ici {{ itemDialog }}</pre> -->
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
  mixins: [price],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
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

  computed: {
    categories() {
      console.log('dataProduct', this.$store.get('products/dataProduct'))
      const items = this.$store
        .get('products/dataProduct')
        .map((x) => x.category)
      return [...new Set(items)]
    },
    staticURL() {
      console.log('Static URL', this.$store.get('staticURL'))
      console.log('Static URL', this.$store)
      return this.$store.get('staticURL')
    },
    dataProduct() {
      return this.$store
        .get('products/dataProduct')
        .filter((x) => x.archived === 0)
    },
    totalPage() {
      return this.$store.get('products/totalPage')
    },
    stateDialog() {
      return this.$store.get('stateDialog')
    },
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
      if (isValid) {
        this.itemDialog = false
      }

      const customizationList = [].concat(...this.currentItem)
      const customizationPrice = customizationList.reduce((acc, item) => {
        if (item && item.price) acc += item.price
        return acc
      }, 0)
      console.log('CustimzationPrice', customizationPrice)
      console.log('customisation List', customizationList)
      const price = this.selectedItem.price + customizationPrice
      const newData = {
        id: this.selectedItem.id,
        name: this.selectedItem.name,
        categoryid: this.selectedItem.categoryid,
        image: this.selectedItem.image,
        stock: this.selectedItem.stock,
        price,
        subtotal: 1 * price,
        qty: 1,
        customizationList,
      }
      this.cartItem = [...this.cartItem, newData]

      this.totalPrice()
      this.indexCart()
    },

    rulesCheckboxes(value, mandatory) {
      // Check if the value length is 0 and the field is mandatory
      if (mandatory && (!value || value.length === 0)) {
        return 'Selectionner au moins un choix'
      }
      return true
    },
    disableCustomizationValidation() {
      let result = false
      if (!this.selectedItem || !this.selectedItem.product_customization) {
        return false
      }
      this.selectedItem.product_customization.forEach((item, index) => {
        if (item.mandatory) {
          const currentSelection = this.currentItem[index]
          if (!currentSelection || currentSelection.length === 0) {
            result = true
          }
        }
      })
      return result
    },
    change() {
      this.dialog = this.stateDialog
    },
    getProductPerCategorie(category) {
      return this.dataProduct.filter(function (x) {
        return x.category === category
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
        return
      }

      if (params.product_customization.length > 0) {
        this.itemDialog = true
        this.selectedItem = this.dataProduct.find((x) => x.id === params.id)
        this.currentItem = this.selectedItem.product_customization.map(() => [])
      } else {
        const existingIndex = this.cartItem.findIndex(
          (item) => item.id === params.id
        )

        if (existingIndex !== -1) {
          // Si l’item est déjà dans le panier, on augmente juste la quantité
          this.cartItem[existingIndex].qty += 1
          this.cartItem[existingIndex].subtotal =
            this.cartItem[existingIndex].qty *
            this.cartItem[existingIndex].price
        } else {
          // Sinon on l’ajoute
          const newData = {
            id: params.id,
            name: params.name,
            categoryid: params.categoryid,
            image: params.image,
            stock: params.stock,
            price: params.price,
            subtotal: params.price,
            qty: 1,
          }
          this.cartItem = [...this.cartItem, newData]
        }

        this.idItem = params.id
        this.totalPrice()
        this.indexCart()
      }
    },
    minusBtn(params, index) {
      console.log('Index Minus Btn', this.cartItem, index, params)
      const item = this.cartItem[index]
      if (!item) return

      if (item.qty <= 1) {
        this.cartItem.splice(index, 1)
      } else {
        item.qty -= 1
        item.subtotal = item.qty * item.price
      }

      this.totalPrice()
      this.indexCart()
    },
    plusBtn(params, index) {
      console.log('Index Plus Btn', index, params)
      this.cartItem[index].qty += 1
      this.cartItem[index].subtotal =
        this.cartItem[index].qty * this.cartItem[index].price
      // this.cartItem.forEach((e) => {
      //   if (e.id === params.id) {
      //     e.qty += 1
      //     e.subtotal = e.qty * e.price
      //     if (e.qty > e.stock) {
      //       e.qty = e.stock
      //       e.subtotal = e.stock * e.price
      //     }
      //   }
      // })
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
