<template>
  <v-container fluid class="kiosk-page pa-0">
    <div class="kiosk-shell">
      <header class="kiosk-header">
        <div>
          <div class="kiosk-eyebrow">Commande borne</div>
          <h1>{{ shopName || 'Menu' }}</h1>
        </div>
        <v-btn icon large aria-label="Deconnexion" @click="logout">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </header>

      <main class="kiosk-main">
        <section class="kiosk-menu">
          <div class="kiosk-category-bar">
            <v-btn
              v-for="category in categories"
              :key="category"
              depressed
              class="kiosk-category-button text-none"
              :color="category === activeCategory ? 'primary' : 'grey lighten-3'"
              :dark="category === activeCategory"
              @click="activeCategory = category"
            >
              {{ category }}
            </v-btn>
          </div>

          <div class="kiosk-products">
            <v-card
              v-for="product in activeProducts"
              :key="product.id"
              outlined
              hover
              class="kiosk-product-card"
              @click="addToCart(product)"
            >
              <v-img :src="productImageSrc(product.image)" aspect-ratio="1.2" />
              <v-card-title>{{ product.name }}</v-card-title>
              <v-card-text>{{ formatCurrency(product.price) }}</v-card-text>
            </v-card>
          </div>
        </section>

        <aside class="kiosk-cart">
          <h2>Votre commande</h2>
          <div v-if="cartItems.length === 0" class="kiosk-empty">
            Votre panier est vide
          </div>
          <div v-else class="kiosk-cart-lines">
            <div
              v-for="(item, index) in cartItems"
              :key="item.configurationSignature || `${item.id}-${index}`"
              class="kiosk-cart-line"
            >
              <strong>{{ item.name }}</strong>
              <span>{{ item.qty }} x {{ formatCurrency(item.price) }}</span>
            </div>
          </div>

          <v-text-field v-model.trim="customer" label="Votre nom" />
          <v-text-field v-model.trim="phone" label="Votre numero" type="tel" />
          <v-btn-toggle v-model="saleMode" mandatory class="kiosk-sale-mode">
            <v-btn value="dine_in" class="text-none">Sur place</v-btn>
            <v-btn value="takeaway" class="text-none">A emporter</v-btn>
          </v-btn-toggle>
          <v-btn color="success" block x-large class="text-none" disabled>
            Continuer
          </v-btn>
        </aside>
      </main>
    </div>
  </v-container>
</template>

<script>
import price from '@/helpers/price'

export default {
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      activeCategory: '',
      customer: '',
      phone: '',
      saleMode: 'dine_in',
      servicePointId: parseInt(localStorage.getItem('service_point_id')) || null,
      cartItems: [],
    }
  },
  computed: {
    shopName() {
      return this.$store.get('shop/shop_name')
    },
    products() {
      return this.$store.get('products/dataProducts') || []
    },
    categories() {
      const names = this.products.map((product) => product.category).filter(Boolean)
      return [...new Set(names)]
    },
    activeProducts() {
      return this.products.filter((product) => product.category === this.activeCategory)
    },
  },
  async mounted() {
    await Promise.all([
      this.$store.dispatch('products/getProducts'),
      this.$store.dispatch('categories/getAllCategories'),
      this.$store.dispatch('shop/getShopInfo'),
    ])
    this.activeCategory = this.categories[0] || ''
  },
  methods: {
    productImageSrc(image) {
      const staticURL = this.$store.get('staticURL').replace(/\/+$/, '')
      return `${staticURL}/api/v1/imgproducts/${image}`
    },
    addToCart(product) {
      const existing = this.cartItems.find((item) => item.id === product.id)
      if (existing) {
        existing.qty += 1
        return
      }
      this.cartItems.push({ ...product, qty: 1 })
    },
    logout() {
      const result = this.$store.dispatch('users/postLogout')
      if (result) this.$router.push('/login')
    },
  },
}
</script>

<style scoped>
.kiosk-page {
  min-height: 100vh;
  background: #f4f6f8;
}

.kiosk-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.kiosk-header {
  min-height: 84px;
  padding: 18px 28px;
  background: #ffffff;
  border-bottom: 1px solid #dfe5ee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kiosk-header h1 {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 0;
}

.kiosk-eyebrow {
  color: #1976d2;
  font-weight: 800;
  text-transform: uppercase;
}

.kiosk-main {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
}

.kiosk-menu,
.kiosk-cart {
  min-height: 0;
  overflow: auto;
}

.kiosk-menu {
  padding: 18px;
}

.kiosk-category-bar {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kiosk-category-button {
  min-height: 56px !important;
  border-radius: 8px !important;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
}

.kiosk-products {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

.kiosk-product-card {
  min-height: 260px;
}

.kiosk-cart {
  padding: 18px;
  background: #ffffff;
  border-left: 1px solid #dfe5ee;
}

.kiosk-cart h2 {
  font-size: 1.35rem;
  letter-spacing: 0;
}

.kiosk-cart-line {
  min-height: 58px;
  border-bottom: 1px solid #edf0f4;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kiosk-sale-mode {
  width: 100%;
  margin-bottom: 16px;
}

@media (max-width: 960px) {
  .kiosk-main {
    grid-template-columns: 1fr;
  }

  .kiosk-cart {
    border-left: 0;
    border-top: 1px solid #dfe5ee;
  }
}
</style>
