<template>
  <v-container>
    <v-alert :value="alert" :type="alertType" dismissible>{{
      alertText
    }}</v-alert>
    <v-alert
      v-if="isKitchenClosed && !isOrderEditActive"
      dense
      text
      type="warning"
    >
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
          <v-card-title
            v-if="canUseLargeProductView"
            class="menu-view-toolbar d-flex align-center justify-space-between"
          >
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ isLargeProductView ? 'Tous les produits' : 'Produits par catégorie' }}
              </div>
              <div class="text-caption text--secondary">
                {{
                  isLargeProductView
                    ? 'Vue grand format pour parcourir toute la carte.'
                    : 'Vue organisée par catégories.'
                }}
              </div>
            </div>
            <v-btn
              color="primary"
              outlined
              class="text-none"
              @click="toggleProductViewMode"
            >
              <v-icon left>
                {{ isLargeProductView ? 'mdi-format-list-group' : 'mdi-view-grid-plus' }}
              </v-icon>
              {{
                isLargeProductView
                  ? 'Vue par catégories'
                  : 'Vue grand écran'
              }}
            </v-btn>
          </v-card-title>

          <div v-if="isLargeProductView" class="pa-4 pt-2">
            <div class="product-grid product-grid--large">
              <div
                v-for="items in dataProduct"
                :key="items.id"
                class="product-grid-col"
              >
                <v-card
                  hover
                  outlined
                  class="
                    d-flex
                    flex-column
                    product-card
                    product-card--compact
                    product-clickable
                  "
                  @click="openProductPreview(items)"
                >
                  <v-img
                    :src="productImageSrc(items.image)"
                    :aspect-ratio="1"
                    class="product-card-image rounded-t"
                    @click.stop="openProductPreview(items)"
                  />

                  <v-card-title class="product-card-title py-2 pb-0 mb-0">
                    <div class="product-card-title-text font-weight-bold">
                      {{ items.name }}
                    </div>
                  </v-card-title>

                  <v-card-text class="product-card-content pt-0 mb-0 pb-2">
                    <div class="text-caption text--secondary mb-1">
                      {{ items.category }}
                    </div>
                    <div
                      v-if="items.customization_available === false"
                      class="error--text text-caption mt-1"
                    >
                      {{ customizationUnavailableReason(items) }}
                    </div>
                  </v-card-text>

                  <v-card-actions class="product-card-actions px-4 pt-1 pb-3">
                    <v-btn
                      color="success"
                      small
                      block
                      :disabled="
                        (isKitchenClosed && !isOrderEditActive) ||
                        items.customization_available === false
                      "
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
          </div>

          <template v-else>
            <div class="mobile-category-view d-sm-none">
              <div class="mobile-category-bar">
                <button
                  v-for="category in categories"
                  :key="category"
                  type="button"
                  class="mobile-category-tab"
                  :class="{
                    'mobile-category-tab--active':
                      category === activeMobileCategory,
                  }"
                  @click="setActiveMobileCategory(category)"
                >
                  {{ category }}
                </button>
              </div>

              <div class="mobile-category-products pa-3">
                <div class="product-grid">
                  <div
                    v-for="items in getProductPerCategorie(activeMobileCategory)"
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
                          <span
                            v-if="
                              items.minimum_commandable_price != null &&
                              parsePrice(items.minimum_commandable_price) >
                                parsePrice(items.price)
                            "
                          >
                            À partir de
                            {{
                              formatCurrency(items.minimum_commandable_price)
                            }}
                          </span>
                          <span v-else>{{ formatCurrency(items.price) }}</span>
                        </div>
                        <div
                          v-if="items.customization_available === false"
                          class="error--text text-caption mt-1"
                        >
                          {{ customizationUnavailableReason(items) }}
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
                          :disabled="
                            (isKitchenClosed && !isOrderEditActive) ||
                            items.customization_available === false
                          "
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
              </div>
            </div>

            <v-expansion-panels class="d-none d-sm-block">
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
                            <span
                              v-if="
                                items.minimum_commandable_price != null &&
                                parsePrice(items.minimum_commandable_price) >
                                  parsePrice(items.price)
                              "
                            >
                              À partir de
                              {{
                                formatCurrency(items.minimum_commandable_price)
                              }}
                            </span>
                            <span v-else>{{
                              formatCurrency(items.price)
                            }}</span>
                          </div>
                          <div
                            v-if="items.customization_available === false"
                            class="error--text text-caption mt-1"
                          >
                            {{ customizationUnavailableReason(items) }}
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
                            :disabled="
                              (isKitchenClosed && !isOrderEditActive) ||
                              items.customization_available === false
                            "
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
          </template>
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
                :key="itm.configurationSignature || `${itm.id}-${itemIndex}`"
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
                  <v-col
                    class="cart-item-info d-flex align-center"
                    :class="{
                      'cart-item-info--editable': (
                        itm.customization_steps || []
                      ).length,
                    }"
                    :role="
                      (itm.customization_steps || []).length ? 'button' : null
                    "
                    :tabindex="
                      (itm.customization_steps || []).length ? 0 : null
                    "
                    @click="editCartLine(itemIndex)"
                    @keydown.enter.prevent="editCartLine(itemIndex)"
                  >
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
                    v-for="choice in itm.selections || []"
                    :key="choice.product_step_choice_id"
                    class="mr-1 mt-1"
                  >
                    {{ choice.choice_name || choice.name }}
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
            :disabled="
              (isKitchenClosed && !isOrderEditActive) ||
              previewItem.customization_available === false
            "
            @click="addPreviewItemToCart"
          >
            <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
            Ajouter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="customizationDialog" max-width="920" persistent>
      <ProductCustomizationWizard
        v-if="selectedItem"
        v-model="selectedChoiceIds"
        :product="selectedItem"
        @confirm="confirmCustomization"
        @cancel="closeCustomizationWizard"
      />
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
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="kitchenClosedSnackbar = false">
          Fermer
        </v-btn>
      </template>
    </v-snackbar>
    <v-snackbar
      v-model="cartAddSnackbar"
      color="success"
      timeout="2200"
      bottom
    >
      <v-icon left>mdi-cart-check</v-icon>
      {{ cartAddSnackbarText }}
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="openCart">Voir le panier</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import ProductCustomizationWizard from '@/components/products/ProductCustomizationWizard'
import price from '@/helpers/price'
import {
  mergeConfiguredCartLine,
  replaceConfiguredCartLine,
} from '@/helpers/customizations'
// import * as config from '@/nuxt.config'
export default {
  components: {
    Loading,
    ProductCustomizationWizard,
  },
  mixins: [price],
  async beforeRouteLeave(to, from, next) {
    if (
      this.isOrderEditActive &&
      this.orderEditDirty &&
      !this.allowRouteLeave
    ) {
      if (!window.confirm('Quitter sans enregistrer les modifications ?')) {
        next(false)
        return
      }
      await this.$store.dispatch('orderEdit/cancel')
      next()
      return
    }
    next()
  },
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  props: {
    embeddedOrderEdit: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    customizationDialog: false,
    previewDialog: false,
    previewItem: null,
    selectedItem: null,
    selectedChoiceIds: [],
    editingCartIndex: null,
    // config: config,
    alert: null,
    alertType: null,
    alertText: null,
    dialog: false,
    loadPage: false,
    kitchenClosedSnackbar: false,
    kitchenClosedMessage:
      'La cuisine est fermée. Aucune nouvelle commande possible.',
    cartAddSnackbar: false,
    cartAddSnackbarText: 'Produit ajouté au panier',
    cartItem: [],
    total: 0,
    idxCart: 0,
    allowRouteLeave: false,
    productViewMode: 'categories',
    activeMobileCategory: null,
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
    clientOrderStatus() {
      return this.$store.get('cart/clientOrderStatus') || 'idle'
    },
    clientOrderOrderId() {
      return this.$store.get('cart/clientOrderOrderId') || null
    },
    hasUnsafeCheckoutAttempt() {
      return (
        Boolean(this.clientOrderOrderId) ||
        ['pending', 'uncertain', 'stripe_prepared'].includes(
          this.clientOrderStatus
        )
      )
    },
    isOrderEditActive() {
      return this.$store.get('orderEdit/active') === true
    },
    orderEditDirty() {
      return this.$store.get('orderEdit/dirty') === true
    },
    isAdminView() {
      const user = this.$store.get('users/user') || {}
      const storedAccess = process.client ? localStorage.getItem('access') : null
      const access = user.access === undefined ? storedAccess : user.access
      return Number(access) === 0
    },
    isLargeProductView() {
      return this.canUseLargeProductView && this.productViewMode === 'all'
    },
    canUseLargeProductView() {
      return this.isAdminView && this.$vuetify.breakpoint.mdAndUp
    },
  },
  watch: {
    categories() {
      this.ensureActiveMobileCategory()
    },
  },
  async mounted() {
    this.loadPage = true

    if (this.isOrderEditActive) {
      this.cartItem = JSON.parse(
        JSON.stringify(this.$store.get('cart/dataCart') || [])
      )
      this.total = Number(this.$store.get('cart/totalCart') || 0)
      this.idxCart = Number(this.$store.get('cart/indexCart') || 0)
      await Promise.all([
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('shop/getCurrentShopInfo'),
      ])
      if (typeof this.ensureActiveMobileCategory === 'function') {
        this.ensureActiveMobileCategory()
      }
      this.loadPage = false
      return
    }

    if (this.hasUnsafeCheckoutAttempt) {
      this.restorePersistedCheckoutCart()
      this.loadPage = false
      this.$router.replace('/cart')
      return
    }

    const shouldResetRejectedCheckout = [
      'prewrite_rejected',
      'reprice_required',
    ].includes(this.clientOrderStatus)

    if (shouldResetRejectedCheckout) {
      await this.$store.dispatch('cart/abandonCheckout', { safe: true })
    }

    const existingCart = shouldResetRejectedCheckout
      ? null
      : this.$store.get('cart/dataCart')
    if (Array.isArray(existingCart) && existingCart.length > 0) {
      this.restorePersistedCheckoutCart()
    } else {
      this.cartItem = []
    }

    const calls = [
      this.$store.dispatch('products/getProducts'),
      this.$store.dispatch('shop/getCurrentShopInfo'),
    ]
    if (!Array.isArray(existingCart) || existingCart.length === 0) {
      calls.push(
        this.$store.dispatch('cart/setTotal', 0),
        this.$store.dispatch('cart/setIndex', 0),
        this.$store.dispatch('cart/setTocart', null)
      )
    }
    Promise.all(calls).finally(() => {
      if (typeof this.ensureActiveMobileCategory === 'function') {
        this.ensureActiveMobileCategory()
      }
      this.loadPage = false
    })
  },

  methods: {
    ensureActiveMobileCategory() {
      if (!this.categories.length) {
        this.activeMobileCategory = null
        return
      }
      if (!this.categories.includes(this.activeMobileCategory)) {
        this.activeMobileCategory = this.categories[0]
      }
    },
    setActiveMobileCategory(category) {
      this.activeMobileCategory = category
    },
    restorePersistedCheckoutCart() {
      const payload = this.$store.get('cart/clientOrderPayload') || {}
      const persistedCart = Array.isArray(payload.dataCart)
        ? payload.dataCart
        : this.$store.get('cart/dataCart')
      this.cartItem = Array.isArray(persistedCart)
        ? JSON.parse(JSON.stringify(persistedCart))
        : []
      this.total = Number(
        payload.expected_total == null
          ? this.$store.get('cart/totalCart') || 0
          : payload.expected_total
      )
      this.idxCart = this.cartItem.reduce(
        (sum, line) => sum + Number(line.qty || line.quantity || 0),
        0
      )
      this.$store.dispatch('cart/setTocart', this.cartItem)
      this.$store.dispatch('cart/setTotal', this.total)
      this.$store.dispatch('cart/setIndex', this.idxCart)
    },
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
    closeCustomizationWizard() {
      this.customizationDialog = false
      this.selectedItem = null
      this.selectedChoiceIds = []
      this.editingCartIndex = null
    },
    editCartLine(lineIndex) {
      const line = this.cartItem[lineIndex]
      if (!line || !(line.customization_steps || []).length) return

      this.editingCartIndex = lineIndex
      this.selectedItem = { ...line }
      this.selectedChoiceIds = [...(line.selectedChoiceIds || [])]
      this.customizationDialog = true
    },
    confirmCustomization(customization) {
      if (!this.selectedItem) return

      const isEditing = Number.isInteger(this.editingCartIndex)
      const sourceLine = isEditing ? this.cartItem[this.editingCartIndex] : null
      if (isEditing && !sourceLine) {
        this.closeCustomizationWizard()
        return
      }
      const qty = sourceLine ? Number(sourceLine.qty || 1) : 1
      const price = this.roundPrice(customization.unitPrice)
      const selections = (customization.selections || []).map((selection) => ({
        ...selection,
      }))
      const line = {
        ...this.selectedItem,
        selectedChoiceIds: [...(customization.selectedChoiceIds || [])],
        selections,
        customizationList: selections.map((selection) => ({
          ...selection,
          name: selection.choice_name || selection.name,
          price: selection.extra_price,
        })),
        price,
        qty,
        subtotal: this.roundPrice(price * qty),
      }
      this.cartItem = sourceLine
        ? replaceConfiguredCartLine(this.cartItem, this.editingCartIndex, line)
        : mergeConfiguredCartLine(this.cartItem, line)
      this.closeCustomizationWizard()
      this.totalPrice()
      this.indexCart()
      if (!isEditing) {
        this.showCartAddFeedback(line)
      }
    },
    customizationUnavailableReason(product) {
      const reason = product && product.customization_unavailable_reason
      if (typeof reason === 'string' && reason.trim()) return reason
      if (reason && reason.code === 'INSUFFICIENT_AVAILABLE_CHOICES') {
        return `Choix disponibles insuffisants (${Number(
          reason.available_choice_count || 0
        )}/${Number(reason.minimum_choices || 0)}).`
      }
      return 'La personnalisation requise est indisponible.'
    },
    change() {
      this.dialog = this.stateDialog
    },
    toggleProductViewMode() {
      this.productViewMode = this.isLargeProductView ? 'categories' : 'all'
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
      this.$store.dispatch(
        'cart/setTocart',
        this.cartItem.length > 0 ? this.cartItem : null
      )
      if (this.isOrderEditActive) {
        this.$store.dispatch('orderEdit/updateDirty', this.cartItem)
      }
    },
    indexCart() {
      this.idxCart = this.cartItem.reduce(
        (total, item) => total + Number(item.qty || 0),
        0
      )
      this.$store.dispatch('cart/setIndex', this.idxCart)
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
    showCartAddFeedback() {
      this.cartAddSnackbarText = 'Produit ajouté au panier'
      this.cartAddSnackbar = true
    },
    addToCart(params) {
      if (this.isKitchenClosed && !this.isOrderEditActive) {
        this.showKitchenClosedSnackbar()
        return
      }

      if (params.customization_available === false) {
        this.showAlert(this.customizationUnavailableReason(params), 'error')
        return
      }

      if (Number(params.stock) < 1) {
        this.showAlert('Produit non disponible', 'error')
        return
      }

      if ((params.customization_steps || []).length > 0) {
        this.selectedItem =
          this.dataProduct.find((product) => product.id === params.id) || params
        this.selectedChoiceIds = []
        this.customizationDialog = true
        return
      }

      const price = this.roundPrice(params.price)
      this.cartItem = mergeConfiguredCartLine(this.cartItem, {
        ...params,
        selectedChoiceIds: [],
        selections: [],
        customizationList: [],
        price,
        subtotal: price,
        qty: 1,
      })
      this.totalPrice()
      this.indexCart()
      this.showCartAddFeedback(params)
    },
    minusBtn(params, index) {
      const item = this.cartItem[index]
      if (!item) return

      if (item.qty <= 1) {
        this.cartItem = this.cartItem.filter((_, itemIndex) => {
          return itemIndex !== index
        })
      } else {
        const nextQty = Number(item.qty || 0) - 1
        this.cartItem = this.cartItem.map((cartLine, itemIndex) => {
          if (itemIndex !== index) return cartLine
          return {
            ...cartLine,
            qty: nextQty,
            subtotal: this.roundPrice(nextQty * this.parsePrice(cartLine.price)),
          }
        })
      }

      this.totalPrice()
      this.indexCart()
    },
    plusBtn(params, index) {
      const item = this.cartItem[index]
      if (!item) return

      const nextQty = Number(item.qty || 0) + 1
      this.cartItem = this.cartItem.map((cartLine, itemIndex) => {
        if (itemIndex !== index) return cartLine
        return {
          ...cartLine,
          qty: nextQty,
          subtotal: this.roundPrice(nextQty * this.parsePrice(cartLine.price)),
        }
      })
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
    openCart() {
      if (this.embeddedOrderEdit && this.isOrderEditActive) {
        this.$emit('show-cart')
        return
      }
      this.$router.push('/cart')
    },
    async btnOrder() {
      if (this.isKitchenClosed && !this.isOrderEditActive) {
        this.showKitchenClosedSnackbar()
        return
      }

      if (this.hasUnsafeCheckoutAttempt) {
        this.restorePersistedCheckoutCart()
        this.openCart()
        return
      }

      if (
        ['prewrite_rejected', 'reprice_required'].includes(
          this.clientOrderStatus
        )
      ) {
        await this.$store.dispatch('cart/abandonCheckout', { safe: true })
      }

      this.$store.dispatch('cart/setTocart', this.cartItem)
      this.allowRouteLeave = true
      this.openCart()
    },
    async btnCancel() {
      if (this.isOrderEditActive) {
        if (this.embeddedOrderEdit) {
          this.$emit('request-close')
          return
        }
        if (!window.confirm('Annuler les modifications de cette commande ?')) {
          return
        }
        const orderId = this.$store.get('orderEdit/orderId')
        await this.$store.dispatch('orderEdit/cancel')
        this.allowRouteLeave = true
        this.$router.push(`/orders/detail/${orderId}`)
        return
      }
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

.menu-view-toolbar {
  gap: 12px;
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

.product-grid--large {
  --product-card-min-width: 130px;
  gap: 8px;
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

.product-card--compact {
  min-height: 188px;
}

.product-card--compact .product-card-title {
  min-height: 42px;
}

.product-card--compact .product-card-title-text {
  font-size: 0.9rem;
  line-height: 1.15;
}

.product-card--compact .product-card-content {
  min-height: 28px;
}

.product-card--compact ::v-deep .v-card__title {
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.product-card--compact ::v-deep .v-card__text {
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.product-card--compact ::v-deep .v-card__actions {
  padding: 0 8px 8px !important;
}

.product-card--compact ::v-deep .v-btn {
  height: 26px !important;
  font-size: 0.72rem !important;
}

.product-card--compact ::v-deep .v-btn .v-icon {
  font-size: 15px !important;
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

.cart-item-info--editable {
  cursor: pointer;
  border-radius: 6px;
}

.cart-item-info--editable:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: 2px;
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

.mobile-category-view {
  background: #fff;
}

.mobile-category-bar {
  align-items: center;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 18px;
  overflow-x: auto;
  padding: 14px 16px;
  position: sticky;
  top: 0;
  white-space: nowrap;
  z-index: 3;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mobile-category-bar::-webkit-scrollbar {
  display: none;
}

.mobile-category-tab {
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: #13bfb5;
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 0.96rem;
  font-weight: 600;
  line-height: 1.2;
  min-height: 38px;
  padding: 0 14px;
}

.mobile-category-tab--active {
  background: #13c9bd;
  color: #fff;
  padding: 0 22px;
}

.mobile-category-products {
  background: #fafafa;
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
