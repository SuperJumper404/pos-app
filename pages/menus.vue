<template>
  <v-container>
    <v-alert :value="alert" :type="alertType" dismissible>{{
      alertText
    }}</v-alert>
    <v-alert v-if="isKitchenClosed" dense text type="warning">
      La cuisine est fermée. Aucune nouvelle commande possible.
    </v-alert>
    <v-row class="mt-5">
      <v-col v-if="loadPage" md="8" cols="12">
        <v-card outlined height="425px" class="overflow-y-auto">
          <Loading />
        </v-card>
      </v-col>
      <v-col v-else md="8" cols="12">
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
                <div class="product-grid">
                  <div
                    v-for="items in getProductPerCategorie(category)"
                    :key="items.id"
                    class="product-grid-col"
                  >
                    <v-card
                      hover
                      outlined
                      class="d-flex flex-column product-card product-clickable"
                      @click="openProductPreview(items)"
                    >
                      <!-- Image -->
                      <v-img
                        :src="productImageSrc(items.image)"
                        :aspect-ratio="4 / 3"
                        class="product-card-image rounded-t"
                        @click.stop="openProductPreview(items)"
                      />

                      <!-- Title -->
                      <v-card-title class="product-card-title py-2 pb-0 mb-0">
                        <div class="product-card-title-text font-weight-bold">
                          {{ items.name }}
                        </div>
                      </v-card-title>

                      <!-- Text -->
                      <v-card-text class="product-card-content pt-0 mb-0 pb-1">
                        <div class="text--secondary line-clamp-2">
                          {{ items.description }}
                        </div>

                        <div class="product-card-price font-weight-bold">
                          {{ formatCurrency(items.price) }}
                        </div>
                      </v-card-text>

                      <!-- Actions always bottom -->
                      <v-card-actions
                        class="product-card-actions px-4 pt-1 pb-3"
                      >
                        <v-btn
                          color="success"
                          small
                          block
                          :disabled="isKitchenClosed"
                          class="text-none font-weight-bold"
                          @click.stop="addToCart(items)"
                        >
                          <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
                          Ajouter
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </div>
                </div>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
        <!-- <pre type="json">{{ dataProduct }}</pre> -->
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
                        >{{ formatCurrency(items.price) }}</span
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
      <v-col md="4" cols="12">
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
                class="cart-item-card d-flex mb-2 flex-column"
                rounded="7"
              >
                <v-row
                  class="
                    cart-item-row
                    d-flex
                    align-center
                    flex-nowrap
                    mr-2
                    ml-2
                    mt-2
                  "
                  no-gutters
                >
                  <!-- Left block: avatar + texts -->
                  <v-col class="cart-item-info d-flex align-center">
                    <v-avatar
                      size="64"
                      rounded
                      tile
                      class="cart-item-avatar mr-2"
                    >
                      <v-img
                        class="rounded-lg"
                        :src="productImageSrc(itm.image)"
                      />
                    </v-avatar>

                    <div class="cart-item-text">
                      <div
                        class="cart-item-name text-truncate font-weight-bold"
                        style="font-size: large; color: rgba(0, 0, 0, 0.8)"
                      >
                        {{ itm.name }}
                      </div>
                      <div
                        class="font-weight-bold"
                        style="color: rgba(0, 0, 0, 0.8)"
                      >
                        {{ formatCurrency(itm.price) }}
                      </div>
                    </div>
                  </v-col>

                  <!-- Right block: actions -->
                  <v-col
                    class="cart-item-actions d-flex align-center justify-end"
                    cols="auto"
                  >
                    <v-btn
                      class="cart-action-btn"
                      outlined
                      color="warning"
                      small
                      icon
                      @click="minusBtn(itm, itemIndex)"
                    >
                      <v-icon>mdi-minus</v-icon>
                    </v-btn>

                    <v-btn
                      class="cart-qty-btn mx-1"
                      style="font-size: x-large"
                      color="success"
                      fab
                      small
                      dark
                    >
                      {{ itm.qty }}
                    </v-btn>

                    <v-btn
                      class="cart-action-btn"
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
            <v-card-actions
              v-if="cartItem.length > 0"
              class="cart-order-actions"
            >
              <v-btn
                color="primary"
                class="
                  cart-order-btn cart-order-btn--submit
                  text-none
                  font-weight-bold
                "
                @click="btnOrder"
                >Commander
                <v-icon small right>mdi-silverware-fork-knife</v-icon></v-btn
              >
              <v-btn
                color="red ligthen-1"
                class="cart-order-btn cart-order-btn--cancel text-none"
                dark
                @click="btnCancel"
                >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
              >
            </v-card-actions>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="previewDialog" max-width="620">
      <v-card v-if="previewItem" class="product-preview-card">
        <v-btn
          class="product-preview-close"
          color="white"
          elevation="3"
          fab
          small
          aria-label="Fermer"
          @click="closeProductPreview"
        >
          <v-icon color="grey darken-3">mdi-close</v-icon>
        </v-btn>

        <v-img
          :src="productImageSrc(previewItem.image)"
          max-height="420"
          contain
          class="grey lighten-4"
        />

        <v-card-text class="pt-4">
          <div class="text-h6 font-weight-bold mb-2">
            {{ previewItem.name }}
          </div>
          <div class="text-body-2 text--secondary mb-3">
            {{ previewItem.description }}
          </div>
          <div class="text-h6 font-weight-bold">
            {{ formatCurrency(previewItem.price) }}
          </div>
        </v-card-text>

        <v-card-actions class="justify-center px-4 py-4">
          <v-btn
            color="success"
            class="text-none font-weight-bold"
            :disabled="isKitchenClosed"
            @click="addPreviewItemToCart"
          >
            <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
            Ajouter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
                  <!-- <pre>item {{ item }}</pre>
                  <pre>currentITem {{ currentItem }}</pre> -->
                  <div v-for="(choice, i) in item.items" :key="'checkbox-' + i">
                    <v-checkbox
                      v-model="currentItem[itemId]"
                      class="custom-spacing"
                      multiple
                      :label="
                        choice.price > 0
                          ? `${choice.name} (+${formatCurrency(choice.price)})`
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
                        ? `${choice.name} (+${formatCurrency(choice.price)})`
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
              >Retour <v-icon small right>mdi-arrow-left</v-icon></v-btn
            >
            <v-btn
              color="success"
              class="text-none"
              :disabled="disableCustomizationValidation()"
              @click="submitFormItem()"
              >Valider <v-icon small right>mdi-check-circle</v-icon></v-btn
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
    <v-snackbar
      v-model="kitchenClosedSnackbar"
      color="warning"
      timeout="4500"
      top
    >
      {{ kitchenClosedMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="kitchenClosedSnackbar = false">
          Fermer
        </v-btn>
      </template>
    </v-snackbar>
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
    previewDialog: false,
    previewItem: null,
    selectedItem: [],
    currentItem: [],
    // config: config,
    alert: null,
    alertType: null,
    alertText: null,
    dialog: false,
    loadPage: false,
    kitchenClosedSnackbar: false,
    kitchenClosedMessage:
      'La cuisine est fermée. Aucune nouvelle commande possible.',
    cartItem: [],
    total: 0,
    idxCart: 0,
  }),

  computed: {
    categories() {
      console.log('dataProduct', this.$store.get('products/dataProduct'))
      const items = this.dataProduct.map((x) => x.category)
      return [...new Set(items)]
    },
    staticURL() {
      console.log(
        'Static URL',
        this.$store.get('staticURL').replace(/\/+$/, '')
      )
      console.log('Static URL', this.$store)
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    dataProduct() {
      return this.$store
        .get('products/dataProduct')
        .filter((x) => x.archived === 0 && !this.isProductHidden(x))
    },
    totalPage() {
      return this.$store.get('products/totalPage')
    },
    stateDialog() {
      return this.$store.get('stateDialog')
    },
    isKitchenClosed() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/kitchen_closed')
      )
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
      this.$store.dispatch('shop/getCurrentShopInfo'),
      this.$store.dispatch('cart/setTotal', 0),
      this.$store.dispatch('cart/setIndex', 0),
    ]
    console.log('result', this.$store.get('products/dataProduct'))
    Promise.all(calls).finally(() => {
      this.loadPage = false
    })
  },

  methods: {
    openProductPreview(item) {
      this.previewItem = item
      this.previewDialog = true
    },
    closeProductPreview() {
      this.previewDialog = false
    },
    productImageSrc(image) {
      const fileName = image || 'default.png'
      return `${this.staticURL}/api/v1/imgproducts/${fileName}`
    },
    addPreviewItemToCart() {
      if (!this.previewItem) return

      const item = this.previewItem
      this.previewDialog = false
      this.addToCart(item)
    },
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
        if (item && item.price) {
          return this.roundPrice(acc + this.parsePrice(item.price))
        }
        return acc
      }, 0)
      console.log('CustimzationPrice', customizationPrice)
      console.log('customisation List', customizationList)
      const price = this.roundPrice(
        this.parsePrice(this.selectedItem.price) + customizationPrice
      )
      const newData = {
        id: this.selectedItem.id,
        name: this.selectedItem.name,
        categoryid: this.selectedItem.categoryid,
        image: this.selectedItem.image,
        stock: this.selectedItem.stock,
        price,
        subtotal: price,
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
        return 'Sélectionner au moins un choix'
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
    isProductHidden(product) {
      return [true, 1, '1'].includes(product.is_hidden)
    },
    totalPrice() {
      this.total = this.cartItem.reduce((sum, el) => {
        return this.roundPrice(sum + this.parsePrice(el.subtotal))
      }, 0)
      this.$store.dispatch('cart/setTotal', this.total)
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
    showKitchenClosedSnackbar() {
      this.kitchenClosedSnackbar = true
    },
    addToCart(params) {
      if (this.isKitchenClosed) {
        this.showKitchenClosedSnackbar()
        return
      }

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
          this.cartItem[existingIndex].subtotal = this.roundPrice(
            this.cartItem[existingIndex].qty *
              this.parsePrice(this.cartItem[existingIndex].price)
          )
        } else {
          // Sinon on l’ajoute
          const newData = {
            id: params.id,
            name: params.name,
            categoryid: params.categoryid,
            image: params.image,
            stock: params.stock,
            price: this.roundPrice(params.price),
            subtotal: this.roundPrice(params.price),
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
        item.subtotal = this.roundPrice(item.qty * this.parsePrice(item.price))
      }

      this.totalPrice()
      this.indexCart()
    },
    plusBtn(params, index) {
      console.log('Index Plus Btn', index, params)
      this.cartItem[index].qty += 1
      this.cartItem[index].subtotal = this.roundPrice(
        this.cartItem[index].qty * this.parsePrice(this.cartItem[index].price)
      )
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
      if (this.isKitchenClosed) {
        this.showKitchenClosedSnackbar()
        return
      }

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
  height: 2.7em;
  line-height: 1.35;
  margin-top: 6px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-clickable {
  cursor: pointer;
}

.product-grid {
  --product-card-min-width: 200px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--product-card-min-width), 1fr)
  );
}

.product-grid-col {
  display: flex;
  min-width: 0;
}

.product-card {
  height: 100%;
  min-height: 320px;
  width: 100%;
}

.product-card-image {
  flex: 0 0 auto;
}

.product-card-image ::v-deep .v-image__image {
  background-size: cover;
  background-position: center;
}

/* Réserve 2 lignes sur le conteneur ; v-card-title centre déjà son contenu
   verticalement (align-items: center), donc un titre court est centré dans
   l'espace au lieu de laisser un trou avant la description. */
.product-card-title {
  align-items: center;
  min-height: 56px;
}

.product-card-title-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 1.05rem;
  line-height: 1.25;
  min-width: 0;
  width: 100%;
  word-break: break-word;
}

.product-card-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 72px;
  padding-top: 2px !important;
}

.product-card-actions {
  flex: 0 0 auto;
  margin-top: 0;
}

.product-card-price {
  color: rgba(0, 0, 0, 0.9);
  font-size: 1.12rem;
  font-weight: 800;
  line-height: 1.2;
  margin-top: auto;
  margin-bottom: 0px;
  min-height: 1.35em;
  padding-top: 12px;
}

.cart-item-row {
  min-width: 0;
}

.cart-item-info {
  flex: 1 1 auto;
  min-width: 0;
}

.cart-item-avatar {
  flex: 0 0 64px;
}

.cart-item-text {
  min-width: 0;
}

.cart-item-name {
  max-width: 100%;
}

.cart-item-actions {
  flex: 0 0 auto;
  white-space: nowrap;
}

.cart-action-btn {
  height: 30px !important;
  width: 30px !important;
}

.cart-qty-btn {
  height: 34px !important;
  min-width: 34px !important;
  width: 34px !important;
}

.cart-order-actions {
  display: flex;
  gap: 8px;
  padding: 12px 8px 8px;
}

.cart-order-btn {
  min-width: 0 !important;
}

.cart-order-btn--submit {
  flex: 1.35 1 0;
}

.cart-order-btn--cancel {
  flex: 1 1 0;
}

.cart-order-btn ::v-deep .v-btn__content {
  min-width: 0;
  white-space: nowrap;
}

@media (min-width: 600px) and (max-width: 1263px) {
  .product-grid {
    --product-card-min-width: 185px;
  }

  .product-card {
    min-height: 296px !important;
  }

  .product-card ::v-deep .v-card__title {
    padding-top: 7px !important;
    padding-bottom: 2px !important;
  }

  .product-card ::v-deep .v-card__text {
    padding-top: 2px !important;
    padding-bottom: 4px !important;
  }

  .product-card-content {
    min-height: 62px;
  }

  .product-card ::v-deep .v-card__actions {
    padding-bottom: 8px !important;
    padding-top: 0 !important;
  }

  .product-card-title {
    min-height: 50px;
  }

  .product-card-title-text {
    font-size: 0.98rem !important;
  }

  .line-clamp-2 {
    font-size: 0.82rem;
    height: 2.5em;
    line-height: 1.25;
    margin-top: 4px;
  }

  .product-card-price {
    font-size: 1rem;
    margin-top: auto;
    padding-top: 8px;
  }

  .product-card ::v-deep .v-btn {
    height: 28px !important;
  }

  .cart-item-avatar {
    flex-basis: 56px;
    height: 56px !important;
    min-width: 56px !important;
    width: 56px !important;
  }

  .cart-item-row {
    margin-left: 4px !important;
    margin-right: 4px !important;
  }

  .cart-item-name {
    font-size: 0.9rem !important;
  }

  .cart-item-actions {
    margin-left: 6px;
  }

  .cart-action-btn {
    height: 26px !important;
    width: 26px !important;
  }

  .cart-qty-btn {
    font-size: 0.95rem !important;
    height: 28px !important;
    min-width: 28px !important;
    width: 28px !important;
  }

  .cart-order-actions {
    padding-left: 4px;
    padding-right: 4px;
  }

  .cart-order-btn {
    font-size: 0.78rem !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
}

@media (max-width: 599px) {
  .product-grid {
    --product-card-min-width: 145px;
    gap: 8px;
  }

  .product-card {
    min-height: 270px !important;
  }

  .product-card-content {
    min-height: 56px;
  }

  .product-card-title {
    min-height: 46px;
  }

  .product-card-title-text {
    font-size: 0.92rem !important;
    line-height: 1.2;
  }

  .line-clamp-2 {
    font-size: 0.8rem;
    height: 2.4em;
    line-height: 1.2;
    margin-top: 4px;
  }

  .product-card-price {
    font-size: 0.95rem;
    padding-top: 8px;
  }
}

@media (max-width: 420px) {
  .cart-order-actions {
    flex-direction: column;
  }

  .cart-order-btn {
    width: 100%;
  }
}

@media (min-width: 768px) and (max-width: 1263px) {
  .product-card {
    min-height: 284px !important;
  }

  .product-card ::v-deep .v-card__title {
    padding-left: 8px !important;
    padding-right: 8px !important;
    padding-top: 7px !important;
  }

  .product-card ::v-deep .v-card__text {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .product-card-content {
    min-height: 56px;
  }

  .product-card-title {
    min-height: 48px;
  }

  .product-card-title-text {
    font-size: 0.95rem !important;
    line-height: 1.2;
  }

  .line-clamp-2 {
    font-size: 0.78rem;
    height: 2.4em;
    line-height: 1.2;
    margin-top: 4px;
  }

  .product-card-price {
    font-size: 0.98rem;
    line-height: 1.12;
    margin-top: auto;
    padding-top: 8px;
  }

  .product-card ::v-deep .v-card__actions {
    padding-bottom: 7px !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .product-card ::v-deep .v-btn {
    font-size: 0.78rem !important;
    height: 26px !important;
  }

  .product-card ::v-deep .v-btn .v-icon {
    font-size: 16px !important;
  }
}

.product-preview-card {
  position: relative;
}

.product-preview-close {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 2;
}
</style>
