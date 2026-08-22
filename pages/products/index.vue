<template>
  <v-container fluid>
    <v-card v-if="loadPage" outlined class="mt-5" style="height: 350px">
      <Loading />
    </v-card>
    <v-card v-else ref="productsCard" outlined class="product-page-card mt-5">
      <v-app-bar
        flat
        color="grey lighten-4"
        light
        height="auto"
        class="products-toolbar py-2"
      >
        <div class="products-toolbar-left">
          <v-menu offset-y :close-on-content-click="false">
            <template #activator="{ on, attrs }">
              <v-btn
                depressed
                class="product-filter-button text-none"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon left>mdi-filter-variant</v-icon>
                Filtrer
              </v-btn>
            </template>
            <v-list class="product-category-menu" dense>
              <v-list-item>
                <v-btn text small class="text-none" @click="selectedCategoryIds = []">
                  Toutes
                </v-btn>
              </v-list-item>
              <v-list-item
                v-for="category in productCategories"
                :key="category.id"
                dense
              >
                <v-avatar size="28" class="mr-2 product-filter-avatar">
                  <v-img
                    v-if="category.image"
                    :src="categoryImageSrc(category.image)"
                  ></v-img>
                  <v-icon v-else small>mdi-shape</v-icon>
                </v-avatar>
                <v-checkbox
                  v-model="selectedCategoryIds"
                  :value="category.id"
                  :label="category.name"
                  dense
                  hide-details
                  class="mt-0"
                ></v-checkbox>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
        <v-spacer></v-spacer>
        <div class="products-toolbar-actions">
          <v-btn
            outlined
            color="primaryPurple lighten-1"
            class="text-none"
            @click="openNewCategory"
          >
            <v-icon left>mdi-shape</v-icon>
            Gérer les catégories
          </v-btn>
          <v-btn
            outlined
            color="primaryPurple lighten-1"
            class="text-none"
            @click="openCustomizationSteps"
          >
            <v-icon left>mdi-tune-variant</v-icon>
            Gérer les étapes
          </v-btn>
          <v-btn
            color="primaryPurple lighten-1"
            class="primaryWhite--text text--lighten-1 text-none"
            @click="$router.push('/products/newproduct')"
          >
            <v-icon left>mdi-plus</v-icon>
            Ajouter un produit
          </v-btn>
        </div>
      </v-app-bar>
      <v-card-title
        v-if="filteredProducts.length == 0"
        class="d-none d-sm-flex justify-center"
      >
        <v-icon large>mdi-emoticon-neutral-outline</v-icon>
        <h4>Aucun produit</h4>
      </v-card-title>
      <!-- md -->
      <div v-else>
        <v-card
          v-for="(items, index) in filteredProducts"
          :key="items.id"
          outlined
          draggable="true"
          :disabled="items.archived === 1"
          class="
            product-list-card
            pa-2
            d-none d-sm-flex
            justify-space-between
            ma-3
          "
          :class="{ 'product-dragging': draggedProductId === items.id }"
          @dragstart="startProductDrag(items)"
          @dragover.prevent
          @drop="dropProduct(items)"
          @dragend="clearProductDrag"
        >
          <v-img
            :src="productImageSrc(items.image)"
            class="product-list-image"
            :aspect-ratio="4 / 3"
            height="96"
            width="128"
          ></v-img>
          <v-card-text class="product-list-row">
            <p class="product-list-cell font-weight-bold">
              {{ items.name }}
            </p>
            <p class="product-list-cell">{{ items.category }}</p>
            <p class="product-list-cell">
              {{ formatCurrency(items.price) }}
            </p>
            <p class="product-list-cell">Stock: {{ items.stock }}</p>
            <div class="product-list-cell">
              <v-switch
                v-if="items.archived === 0"
                :input-value="!isProductHidden(items)"
                :loading="visibilityLoadingId === items.id"
                :disabled="visibilityLoadingId === items.id"
                class="product-visibility-switch"
                color="success"
                dense
                hide-details
                inset
                label="Afficher le produit"
                @change="toggleProductVisibility(items, $event)"
              ></v-switch>
            </div>

            <div v-if="items.archived === 0" class="product-action-buttons">
              <div class="product-order-buttons">
                <v-btn
                  icon
                  small
                  :disabled="index === 0 || orderLoading"
                  @click="moveVisibleProduct(index, -1)"
                >
                  <v-icon small>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  :disabled="index === lastVisibleActiveProductIndex || orderLoading"
                  @click="moveVisibleProduct(index, 1)"
                >
                  <v-icon small>mdi-arrow-down</v-icon>
                </v-btn>
              </div>
              <v-btn
                color="primary"
                class="text-none"
                @click="$router.push(`/products/edit/${items.id}`)"
              >
                Modifier <v-icon small right>mdi-pencil</v-icon>
              </v-btn>

              <v-btn
                color="red darken-1"
                dark
                class="text-none"
                @click="
                  $router.push(`/products/delete/${items.id}?modals=true`)
                "
              >
                Supprimer <v-icon small right>mdi-trash-can</v-icon>
              </v-btn>
            </div>

            <div v-else class="product-action-buttons">
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Modifier</v-btn
              >
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Supprimer</v-btn
              >
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- sm to xs -->
      <v-card-title
        v-if="filteredProducts.length == 0"
        class="d-flex d-sm-none justify-center"
      >
        <v-icon large>mdi-emoticon-neutral-outline</v-icon>
        <h4>Aucun produit</h4>
      </v-card-title>

      <div v-else>
        <v-card
          v-for="(itm, index) in filteredProducts"
          :key="itm.name"
          outlined
          draggable="true"
          :disabled="itm.archived === 1"
          class="pa-2 d-block d-sm-none ma-5"
          :class="{ 'product-dragging': draggedProductId === itm.id }"
          @dragstart="startProductDrag(itm)"
          @dragover.prevent
          @drop="dropProduct(itm)"
          @dragend="clearProductDrag"
        >
          <v-img
            :src="productImageSrc(itm.image)"
            class="product-mobile-image"
            :aspect-ratio="4 / 3"
            width="100%"
          ></v-img>
          <v-card-text>
            <p class="font-weight-bold">{{ itm.name }}</p>
            <p>{{ itm.category }}</p>
            <p>{{ formatCurrency(itm.price) }}</p>
            <p>Stock: {{ itm.stock }}</p>
          </v-card-text>
          <v-card-actions class="product-actions d-md-flex">
            <!-- Si pas archivé : boutons visibles -->
            <template v-if="itm.archived === 0">
              <div class="product-order-buttons">
                <v-btn
                  icon
                  small
                  :disabled="index === 0 || orderLoading"
                  @click="moveVisibleProduct(index, -1)"
                >
                  <v-icon small>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  :disabled="index === lastVisibleActiveProductIndex || orderLoading"
                  @click="moveVisibleProduct(index, 1)"
                >
                  <v-icon small>mdi-arrow-down</v-icon>
                </v-btn>
              </div>
              <v-switch
                :input-value="!isProductHidden(itm)"
                :loading="visibilityLoadingId === itm.id"
                :disabled="visibilityLoadingId === itm.id"
                class="product-visibility-switch pl-4"
                color="success"
                dense
                hide-details
                inset
                label="Afficher le produit"
                @change="toggleProductVisibility(itm, $event)"
              ></v-switch>

              <v-btn
                color="primary"
                class="text-none"
                @click="$router.push(`/products/edit/${itm.id}`)"
              >
                Modifier <v-icon small right>mdi-pencil</v-icon>
              </v-btn>

              <v-btn
                color="red darken-1"
                dark
                class="text-none"
                @click="$router.push(`/products/delete/${itm.id}?modals=true`)"
              >
                Supprimer <v-icon small right>mdi-trash-can</v-icon>
              </v-btn>
            </template>

            <!-- Si archivé : on garde 2 boutons "fantômes" (même taille) -->
            <template v-else>
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Modifier</v-btn
              >
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Supprimer</v-btn
              >
            </template>
          </v-card-actions>
        </v-card>
      </div>
    </v-card>
    <!-- pagination -->
    <v-row class="mt-2 justify-end">
      <v-pagination
        :length="totalPage"
        :total-visible="5"
        prev-icon="mdi-menu-left"
        next-icon="mdi-menu-right"
        color="grey lighten-2"
        circle
        class="my-4"
        @input="pageProduct('')"
      ></v-pagination>
    </v-row>
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
  data() {
    return {
      loadPage: false,
      visibilityLoadingId: null,
      orderLoading: false,
      selectedCategoryIds: [],
      draggedProductId: null,
    }
  },

  computed: {
    staticurl() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    dataProduct() {
      const arr = this.$store.get('products/dataProduct') || []
      return [...arr].sort((a, b) => {
        const archivedDiff = (a.archived ?? 0) - (b.archived ?? 0)
        if (archivedDiff !== 0) return archivedDiff
        return (
          (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
          new Date(a.created || 0) - new Date(b.created || 0) ||
          Number(a.id) - Number(b.id)
        )
      })
    },
    filteredProducts() {
      if (this.selectedCategoryIds.length === 0) return this.dataProduct
      const selected = this.selectedCategoryIds.map((id) => Number(id))
      return this.dataProduct.filter((product) =>
        selected.includes(Number(product.categoryid || product.categoryId))
      )
    },
    productCategories() {
      const categories = new Map()
      this.dataProduct.forEach((product) => {
        const id = Number(product.categoryid || product.categoryId)
        if (!id || !product.category) return
        categories.set(id, { id, name: product.category, image: product.category_image })
      })
      return [...categories.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    },
    lastVisibleActiveProductIndex() {
      return this.filteredProducts.reduce(
        (last, product, index) => (product.archived === 0 ? index : last),
        -1
      )
    },
    totalPage() {
      return this.$store.get('products/totalPage')
    },
  },
  watch: {
    dataProduct() {
      this.scheduleFit(true)
    },
    filteredProducts() {
      this.scheduleFit(true)
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('products/getProducts').finally(() => {
      this.loadPage = false
      this.$nextTick(this.applyFit)
    })
    window.addEventListener('resize', this.scheduleFit)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.scheduleFit)
    }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.scheduleFit)
    if (this.resizeObserver) this.resizeObserver.disconnect()
    if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
  },
  methods: {
    openNewCategory() {
      this.$router.push('/categories')
    },
    openCustomizationSteps() {
      this.$router.push('/customizations')
    },
    productImageSrc(image) {
      const fileName = image || 'default.png'
      return `${this.staticurl}/api/v1/imgproducts/${fileName}`
    },
    categoryImageSrc(image) {
      return `${this.staticurl}/api/v1/imgcategories/${image}`
    },
    pageProduct() {
      this.$store.dispatch('products/getProducts')
    },
    isProductHidden(product) {
      return [true, 1, '1'].includes(product.is_hidden)
    },
    moveProduct(index, direction) {
      return this.moveVisibleProduct(index, direction)
    },
    startProductDrag(product) {
      if (product.archived === 1 || this.orderLoading) return
      this.draggedProductId = product.id
    },
    clearProductDrag() {
      this.draggedProductId = null
    },
    dropProduct(targetProduct) {
      if (!this.draggedProductId || targetProduct.archived === 1) {
        this.clearProductDrag()
        return
      }
      const fromIndex = this.filteredProducts.findIndex(
        (product) => product.id === this.draggedProductId
      )
      const toIndex = this.filteredProducts.findIndex(
        (product) => product.id === targetProduct.id
      )
      if (fromIndex !== toIndex) {
        this.moveVisibleProduct(fromIndex, toIndex - fromIndex)
      }
      this.clearProductDrag()
    },
    async moveVisibleProduct(index, direction) {
      const visibleActiveProducts = this.filteredProducts.filter(
        (product) => product.archived === 0
      )
      const product = this.filteredProducts[index]
      if (!product || product.archived === 1) return

      const currentVisibleIndex = visibleActiveProducts.findIndex(
        (item) => item.id === product.id
      )
      const targetVisibleIndex = currentVisibleIndex + direction
      if (
        currentVisibleIndex < 0 ||
        targetVisibleIndex < 0 ||
        targetVisibleIndex >= visibleActiveProducts.length
      ) {
        return
      }

      const reorderedVisible = [...visibleActiveProducts]
      const [moved] = reorderedVisible.splice(currentVisibleIndex, 1)
      reorderedVisible.splice(targetVisibleIndex, 0, moved)
      const visibleIds = new Set(reorderedVisible.map((item) => item.id))
      const visibleQueue = [...reorderedVisible]
      const ordered = this.dataProduct
        .filter((item) => item.archived === 0)
        .map((item) => (visibleIds.has(item.id) ? visibleQueue.shift() : item))

      this.orderLoading = true
      await this.$store.dispatch(
        'products/reorderProducts',
        ordered.map((product) => product.id)
      )
      this.orderLoading = false
    },
    async toggleProductVisibility(product, isVisible) {
      this.visibilityLoadingId = product.id
      await this.$store.dispatch('products/updateProduct', {
        id: product.id,
        data: {
          is_hidden: isVisible ? 0 : 1,
        },
      })
      this.visibilityLoadingId = null
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
    // Reduit la carte produits (min-width: 1280px) pour qu'elle tienne dans la
    // largeur de l'ecran, sans scroll horizontal, via la propriete CSS `zoom`.
    applyFit(force) {
      const card = this.$refs.productsCard && this.$refs.productsCard.$el
      if (!card) return
      const parent = card.parentElement
      if (!parent) return

      // Largeur reellement disponible pour la carte (contenu du conteneur)
      const cs = window.getComputedStyle(parent)
      const available =
        parent.clientWidth -
        parseFloat(cs.paddingLeft || 0) -
        parseFloat(cs.paddingRight || 0)

      // Garde anti-boucle : le zoom modifie la hauteur (donc re-declenche le
      // ResizeObserver). On ne recalcule que si la largeur a change.
      if (
        !force &&
        this.observing &&
        Math.abs(available - (this.lastAvailable || 0)) < 1
      ) {
        return
      }
      this.lastAvailable = available

      // Reset avant de mesurer la largeur naturelle de la carte
      card.style.zoom = ''
      const natural = card.scrollWidth
      if (!natural || !available) return

      const scale = Math.min(1, available / natural)
      card.style.zoom = scale < 1 ? String(scale) : ''

      if (this.resizeObserver && !this.observing) {
        this.resizeObserver.observe(parent)
        this.observing = true
      }
    },
  },
}
</script>
<style scoped>
.product-list-image,
.product-mobile-image {
  flex: 0 0 auto;
}

.product-page-card {
  box-sizing: border-box;
  max-width: none;
  min-width: 1300px;
  overflow: visible;
  width: 100%;
}

.product-page-card ::v-deep .v-card__text {
  min-width: 0;
}

.products-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.products-toolbar-left {
  display: flex;
  justify-content: flex-start;
}

.product-filter-button {
  background: #e8f5e9 !important;
  border: 1px solid #66bb6a;
  color: #1b5e20 !important;
  font-weight: 600;
}

.product-filter-button:hover {
  background: #d7efd9 !important;
}

.product-category-menu {
  max-height: 340px;
  min-width: 240px;
  overflow-y: auto;
}

.product-filter-avatar {
  background: #eef2f7;
  flex: 0 0 auto;
}

.product-list-card {
  align-items: center;
  display: grid !important;
  gap: 16px;
  grid-template-columns: 128px minmax(0, 1fr);
  min-height: 114px;
  width: auto;
}

.product-list-row {
  align-items: center;
  column-gap: 24px;
  display: grid;
  flex: 1 1 auto;
  grid-template-columns:
    minmax(160px, 1.2fr)
    minmax(120px, 0.9fr)
    minmax(80px, 0.55fr)
    minmax(130px, 0.75fr)
    210px
    280px;
  min-width: 0;
  padding: 0 20px 0 0 !important;
  width: auto;
}

.product-list-cell {
  margin-bottom: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-list-image ::v-deep .v-image__image,
.product-mobile-image ::v-deep .v-image__image {
  background-position: center;
  background-size: cover;
}

.product-action-buttons {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  min-width: 280px;
  white-space: nowrap;
}

.product-order-buttons {
  align-items: center;
  display: flex;
  gap: 2px;
}

.product-dragging {
  opacity: 0.55;
}

.product-actions {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 0 !important;
  white-space: nowrap;
}

.product-visibility-switch {
  flex: 0 0 auto;
  margin-top: 0;
  padding-top: 0;
  padding-left: 20px !important;
}

.product-visibility-switch ::v-deep .v-label {
  font-size: 0.88rem;
  line-height: 1.2;
  white-space: nowrap;
}

.product-actions ::v-deep .v-btn {
  flex: 0 0 auto;
}
</style>
