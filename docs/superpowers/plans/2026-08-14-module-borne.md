# Module Borne Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/borne` kiosk mode for autonomous customer ordering, restricted to staff users with only the `borne` module.

**Architecture:** Add `borne` as a first-class staff module and order source while reusing the existing Nuxt 2/Vuex checkout flow. Create a dedicated fullscreen kiosk page instead of expanding `pages/menus.vue`, with small helpers for kiosk access and checkout payload assembly.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, existing Node assertion tests in `test/*.test.js`.

## Global Constraints

- Keep changes targeted and coherent with the existing Nuxt 2 frontend.
- Do not add dependencies.
- Preserve existing `/menus`, `/cart`, click-and-collect, QR table, and comptoir behavior.
- The route `/borne` is the main kiosk route.
- The kiosk user is a staff user with access only to module `borne`.
- The kiosk uses the logged-in session `service_point_id` as the physical kiosk service point.
- The checkout payload includes customer name, phone, `servicePointId`, `isTakeaway`, selected payment mode, cart items, and `source: 'borne'`.
- Printing failure must not cancel a created order.
- Use the smallest practical verification: targeted Node tests first, then `npm run lint` if Vue/JS files change.

---

## File Structure

- Modify `helpers/staffRoles.js`: add `borne` module permission support.
- Modify `helpers/listdashboard.js`: add a `/borne` navigation item for authorized internal users.
- Create `helpers/kioskAccess.js`: focused helpers for detecting kiosk-only sessions and allowed kiosk routes.
- Modify `middleware/auth.js`: redirect kiosk-only users to `/borne` and block POS routes.
- Modify `layouts/default.vue`: hide POS chrome on `/borne`.
- Modify `pages/index.vue`: redirect kiosk-only users from dashboard to `/borne`.
- Modify `store/cart.js`: pass optional `source` through checkout payload.
- Create `helpers/kioskCheckout.js`: assemble kiosk checkout payload and extract order id/number from checkout responses.
- Create `pages/borne.vue`: fullscreen kiosk menu, cart, customer details, service choice, payment, confirmation, and printing attempt.
- Add tests:
  - `test/kiosk-staff-roles.test.js`
  - `test/kiosk-auth-middleware.test.js`
  - `test/kiosk-checkout.test.js`
  - `test/kiosk-page.test.js`
- Modify `package.json`: include new tests in `npm test`.

### Task 1: Kiosk Module Permissions

**Files:**
- Modify: `helpers/staffRoles.js`
- Modify: `helpers/listdashboard.js`
- Test: `test/kiosk-staff-roles.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `canAccessModule(access, moduleKey, modulePermissions, isPrimaryAdmin, legacyModuleKey)`.
- Produces: module key `borne`, nav route `/borne`, and permission option `{ text: 'Borne', value: 'borne' }`.

- [ ] **Step 1: Write the failing test**

Create `test/kiosk-staff-roles.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const roles = require(path.join(root, 'helpers', 'staffRoles.js'))
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)

assert.ok(
  roles.STAFF_MODULE_KEYS.includes('borne'),
  'staff module keys must include borne'
)
assert.ok(
  roles.MODULE_OPTIONS.some(
    (item) => item.value === 'borne' && item.text === 'Borne'
  ),
  'staff module options must expose Borne'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'borne', ['borne'], false),
  true,
  'explicit borne permission must allow the kiosk module'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'orders', ['borne'], false),
  false,
  'a kiosk-only user must not access orders'
)
assert.strictEqual(
  roles.canAccessModule(roles.ACCESS.CASHIER, 'cashregister', ['borne'], false),
  false,
  'a kiosk-only user must not access cash register'
)
assert.deepStrictEqual(
  roles
    .getAccessibleNavigationItems(roles.ACCESS.CASHIER, [
      { title: 'Borne', to: '/borne', moduleKey: 'borne' },
      { title: 'Menus', to: '/menus', moduleKey: 'orders' },
      { title: 'Commandes', to: '/orders', moduleKey: 'orders' },
      { title: 'Deconnexion', name: 'logout' },
    ], ['borne'], false)
    .map((item) => item.title),
  ['Borne', 'Deconnexion'],
  'kiosk-only navigation must expose only Borne and logout'
)
assert.match(dashboardSource, /title:\s*['"]Borne['"]/)
assert.match(dashboardSource, /to:\s*['"]\/borne['"]/)
assert.match(dashboardSource, /moduleKey:\s*['"]borne['"]/)

console.log('kiosk staff role tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-staff-roles.test.js`

Expected: FAIL because `borne` is not in `STAFF_MODULE_KEYS` and `/borne` is not in navigation.

- [ ] **Step 3: Implement module permission support**

In `helpers/staffRoles.js`:

```js
const STAFF_MODULE_KEYS = [
  'home',
  'orders',
  'cashregister',
  'history',
  'catalog',
  'stocks',
  'tables',
  'reports',
  'website',
  'borne',
]
```

Add to `MODULE_OPTIONS`:

```js
{ text: 'Borne', value: 'borne' },
```

Add to `MODULE_PERMISSION_BY_NAV_KEY`:

```js
borne: 'borne',
```

In `helpers/listdashboard.js`, add this nav item before logout:

```js
{
  icon: 'mdi-tablet-dashboard',
  title: 'Borne',
  routeName: 'borne',
  to: '/borne',
  moduleKey: 'borne',
  isAdmin: true,
},
```

- [ ] **Step 4: Add test script to package**

In `package.json`, add `node test/kiosk-staff-roles.test.js` near the other staff/navigation tests in the `test` script:

```json
"node test/kiosk-staff-roles.test.js"
```

- [ ] **Step 5: Run tests**

Run: `node test/kiosk-staff-roles.test.js`

Expected: PASS with `kiosk staff role tests passed`.

Run: `node test/staff-roles.test.js && node test/staff-module-navigation.test.js`

Expected: PASS existing staff tests.

- [ ] **Step 6: Commit**

```bash
git add helpers/staffRoles.js helpers/listdashboard.js test/kiosk-staff-roles.test.js package.json
git commit -m "feat: add kiosk module permission"
```

### Task 2: Kiosk-Only Routing Guard

**Files:**
- Create: `helpers/kioskAccess.js`
- Modify: `middleware/auth.js`
- Modify: `pages/index.vue`
- Test: `test/kiosk-auth-middleware.test.js`

**Interfaces:**
- Consumes: user object shape `{ access, module_permissions, is_primary_admin }`.
- Produces:
  - `isKioskOnlyUser(user): boolean`
  - `isKioskRoute(route): boolean`
  - `getKioskHomePath(): string`

- [ ] **Step 1: Write the failing helper/middleware test**

Create `test/kiosk-auth-middleware.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  getKioskHomePath,
  isKioskOnlyUser,
  isKioskRoute,
} = require(path.join(root, 'helpers', 'kioskAccess.js'))

assert.strictEqual(getKioskHomePath(), '/borne')
assert.strictEqual(
  isKioskOnlyUser({
    access: 1,
    module_permissions: ['borne'],
    is_primary_admin: false,
  }),
  true,
  'only borne permission must be kiosk-only'
)
assert.strictEqual(
  isKioskOnlyUser({
    access: 1,
    module_permissions: ['borne', 'orders'],
    is_primary_admin: false,
  }),
  false,
  'mixed permissions are not kiosk-only'
)
assert.strictEqual(
  isKioskOnlyUser({
    access: 0,
    module_permissions: ['borne'],
    is_primary_admin: true,
  }),
  false,
  'primary admin is never kiosk-only'
)
assert.strictEqual(isKioskRoute({ path: '/borne', name: 'borne' }), true)
assert.strictEqual(isKioskRoute({ path: '/borne/', name: 'borne' }), true)
assert.strictEqual(isKioskRoute({ path: '/orders', name: 'orders' }), false)

const middlewareSource = fs.readFileSync(
  path.join(root, 'middleware', 'auth.js'),
  'utf8'
)
assert.match(middlewareSource, /isKioskOnlyUser/)
assert.match(middlewareSource, /isKioskRoute/)
assert.match(middlewareSource, /redirect\('\/borne'\)/)

const homeSource = fs.readFileSync(path.join(root, 'pages', 'index.vue'), 'utf8')
assert.match(homeSource, /isKioskOnlyUser/)
assert.match(homeSource, /this\.\$router\.replace\('\/borne'\)/)

console.log('kiosk auth middleware tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-auth-middleware.test.js`

Expected: FAIL because `helpers/kioskAccess.js` does not exist.

- [ ] **Step 3: Create kiosk access helper**

Create `helpers/kioskAccess.js`:

```js
const { isStaffAccess } = require('./staffRoles')

const KIOSK_MODULE = 'borne'
const KIOSK_HOME_PATH = '/borne'

const normalizePath = (path = '') =>
  path.length > 1 ? String(path).replace(/\/+$/, '') : String(path)

const isKioskOnlyUser = (user = {}) => {
  if (!isStaffAccess(user.access)) return false
  if (user.is_primary_admin) return false
  if (!Array.isArray(user.module_permissions)) return false

  return (
    user.module_permissions.length === 1 &&
    user.module_permissions[0] === KIOSK_MODULE
  )
}

const isKioskRoute = (route = {}) =>
  normalizePath(route.path || '') === KIOSK_HOME_PATH || route.name === 'borne'

const getKioskHomePath = () => KIOSK_HOME_PATH

module.exports = {
  KIOSK_MODULE,
  getKioskHomePath,
  isKioskOnlyUser,
  isKioskRoute,
}
```

- [ ] **Step 4: Update middleware guard**

In `middleware/auth.js`, require helpers at the top:

```js
const {
  getKioskHomePath,
  isKioskOnlyUser,
  isKioskRoute,
} = require('../helpers/kioskAccess')
```

After authenticated check and before client access restrictions, add:

```js
  const currentUser = store.state.users.user || {}
  if (isKioskOnlyUser(currentUser) && !isKioskRoute(route)) {
    return redirect(getKioskHomePath())
  }
```

Keep existing QR/click-and-collect restrictions unchanged.

- [ ] **Step 5: Redirect kiosk users away from dashboard**

In `pages/index.vue`, add import:

```js
const { isKioskOnlyUser } = require('@/helpers/kioskAccess')
```

At the start of `mounted()`, after `this.accessUser = parseInt(localStorage.getItem('access'))`, add:

```js
    if (isKioskOnlyUser(this.idUser)) {
      this.$router.replace('/borne')
      this.loadPage = false
      return
    }
```

- [ ] **Step 6: Run tests**

Run: `node test/kiosk-auth-middleware.test.js`

Expected: PASS with `kiosk auth middleware tests passed`.

Run: `node test/auth-middleware.test.js && node test/home-dashboard.test.js`

Expected: PASS existing auth/home tests.

- [ ] **Step 7: Commit**

```bash
git add helpers/kioskAccess.js middleware/auth.js pages/index.vue test/kiosk-auth-middleware.test.js
git commit -m "feat: redirect kiosk-only users"
```

### Task 3: Checkout Source Support

**Files:**
- Modify: `store/cart.js`
- Create: `helpers/kioskCheckout.js`
- Test: `test/kiosk-checkout.test.js`

**Interfaces:**
- Consumes: existing `cart/checkoutOrder` params object.
- Produces:
  - `buildKioskCheckoutPayload(input): object`
  - `getKioskOrderReference(result): { orderId: string|number|null, orderNumber: string }`
  - `store/cart.js` forwards `params.source` as `source`.

- [ ] **Step 1: Write failing checkout test**

Create `test/kiosk-checkout.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const {
  buildKioskCheckoutPayload,
  getKioskOrderReference,
} = require(path.join(root, 'helpers', 'kioskCheckout.js'))

const payload = buildKioskCheckoutPayload({
  customer: 'Nora',
  phone: '0611223344',
  servicePointId: 42,
  total: 18.5,
  payment: 'Paiement au comptoir',
  isTakeaway: true,
  dataCart: [{ id: 7, qty: 2, price: 9.25 }],
  stripe: false,
})

assert.deepStrictEqual(payload, {
  customer: 'Nora',
  phone: '0611223344',
  servicePointId: 42,
  total: 18.5,
  payment: 'Paiement au comptoir',
  remark: '',
  isTakeaway: true,
  dataCart: [{ id: 7, qty: 2, price: 9.25 }],
  stripe: false,
  source: 'borne',
})
assert.throws(
  () => buildKioskCheckoutPayload({ customer: 'Nora', phone: '06' }),
  /service point/i
)
assert.deepStrictEqual(
  getKioskOrderReference({
    ok: true,
    data: { orderId: 91, orderNumber: 'A-91' },
  }),
  { orderId: 91, orderNumber: 'A-91' }
)
assert.deepStrictEqual(
  getKioskOrderReference({
    ok: true,
    data: { insertId: 92 },
  }),
  { orderId: 92, orderNumber: '92' }
)

const cartSource = fs.readFileSync(path.join(root, 'store', 'cart.js'), 'utf8')
assert.match(cartSource, /\.\.\.\(params\.source/)
assert.match(cartSource, /source:\s*params\.source/)

console.log('kiosk checkout tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-checkout.test.js`

Expected: FAIL because `helpers/kioskCheckout.js` does not exist.

- [ ] **Step 3: Create kiosk checkout helper**

Create `helpers/kioskCheckout.js`:

```js
const { roundPrice } = require('./price-functions')

const KIOSK_SOURCE = 'borne'

const requiredText = (value, label) => {
  const normalized = String(value || '').trim()
  if (!normalized) throw new TypeError(`${label} est obligatoire.`)
  return normalized
}

const buildKioskCheckoutPayload = ({
  customer,
  phone,
  servicePointId,
  total,
  payment,
  isTakeaway,
  dataCart,
  stripe = false,
} = {}) => {
  const normalizedServicePointId = Number(servicePointId || 0)
  if (!normalizedServicePointId) {
    throw new TypeError('Le service point de la borne est obligatoire.')
  }
  if (!Array.isArray(dataCart) || dataCart.length === 0) {
    throw new TypeError('Le panier est vide.')
  }

  return {
    customer: requiredText(customer, 'Le nom'),
    phone: requiredText(phone, 'Le numero'),
    servicePointId: normalizedServicePointId,
    total: roundPrice(total),
    payment: requiredText(payment, 'Le paiement'),
    remark: '',
    isTakeaway: isTakeaway === true,
    dataCart,
    stripe: stripe === true,
    source: KIOSK_SOURCE,
  }
}

const getKioskOrderReference = (result = {}) => {
  const data = result.data || {}
  const orderId = data.orderId || data.insertId || data.id || null
  return {
    orderId,
    orderNumber: String(data.orderNumber || data.ordernumber || orderId || ''),
  }
}

module.exports = {
  KIOSK_SOURCE,
  buildKioskCheckoutPayload,
  getKioskOrderReference,
}
```

- [ ] **Step 4: Forward source in cart payload**

In `store/cart.js`, inside `buildCheckoutPayload`, add after `phone: params.phone,`:

```js
  ...(params.source ? { source: params.source } : {}),
```

- [ ] **Step 5: Run tests**

Run: `node test/kiosk-checkout.test.js`

Expected: PASS with `kiosk checkout tests passed`.

Run: `node test/customizations.test.js && node test/service-point-selection.test.js && node test/counter-checkout-store.test.js`

Expected: PASS existing checkout tests.

- [ ] **Step 6: Commit**

```bash
git add store/cart.js helpers/kioskCheckout.js test/kiosk-checkout.test.js
git commit -m "feat: build kiosk checkout payload"
```

### Task 4: Fullscreen Kiosk Shell

**Files:**
- Modify: `layouts/default.vue`
- Create: `pages/borne.vue`
- Test: `test/kiosk-page.test.js`

**Interfaces:**
- Consumes: `isKioskOnlyUser(user)` and Nuxt route `/borne`.
- Produces: initial `/borne` page with middleware auth, fullscreen layout, product/category loading hooks, and no POS chrome.

- [ ] **Step 1: Write failing page structure test**

Create `test/kiosk-page.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pageSource = fs.readFileSync(path.join(root, 'pages', 'borne.vue'), 'utf8')
const layoutSource = fs.readFileSync(path.join(root, 'layouts', 'default.vue'), 'utf8')

assert.match(pageSource, /middleware:\s*['"]auth['"]/)
assert.match(pageSource, /class="kiosk-page/)
assert.match(pageSource, /products\/getProducts/)
assert.match(pageSource, /categories\/getAllCategories/)
assert.match(pageSource, /shop\/getShopInfo/)
assert.match(pageSource, /servicePointId/)
assert.match(pageSource, /localStorage\.getItem\('service_point_id'\)/)
assert.match(pageSource, /Votre commande/)
assert.match(pageSource, /Sur place/)
assert.match(pageSource, /A emporter/)
assert.match(layoutSource, /isKioskRoute/)
assert.match(layoutSource, /!isKioskPage/)

console.log('kiosk page tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-page.test.js`

Expected: FAIL because `pages/borne.vue` does not exist.

- [ ] **Step 3: Hide POS chrome on kiosk route**

In `layouts/default.vue`, import `isKioskRoute`:

```js
const { isKioskRoute } = require('@/helpers/kioskAccess')
```

Add computed:

```js
    isKioskPage() {
      return isKioskRoute(this.$route)
    },
```

Update drawer and app-bar `v-if` expressions by adding:

```vue
!isKioskPage &&
```

- [ ] **Step 4: Create initial kiosk page**

Create `pages/borne.vue` with this starting structure:

```vue
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
  middleware: 'auth',
  mixins: [price],
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
```

Add scoped CSS with responsive stable dimensions:

```css
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
```

- [ ] **Step 5: Run tests**

Run: `node test/kiosk-page.test.js`

Expected: PASS with `kiosk page tests passed`.

Run: `npm run lint -- --quiet`

Expected: PASS or only pre-existing unrelated lint errors. Record any lint output before continuing.

- [ ] **Step 6: Commit**

```bash
git add layouts/default.vue pages/borne.vue test/kiosk-page.test.js
git commit -m "feat: add kiosk fullscreen shell"
```

### Task 5: Kiosk Cart, Customizations, And Validation

**Files:**
- Modify: `pages/borne.vue`
- Test: `test/kiosk-page.test.js`

**Interfaces:**
- Consumes: `ProductCustomizationWizard`, `buildKioskCheckoutPayload`.
- Produces:
  - `checkoutDisabled: boolean`
  - `checkoutErrorMessage: string`
  - `openProduct(product): void`
  - `confirmCustomization(selection): void`
  - quantity controls in cart.

- [ ] **Step 1: Extend failing page test**

Append to `test/kiosk-page.test.js`:

```js
assert.match(pageSource, /ProductCustomizationWizard/)
assert.match(pageSource, /customizationDialog/)
assert.match(pageSource, /checkoutDisabled/)
assert.match(pageSource, /checkoutErrorMessage/)
assert.match(pageSource, /mdi-minus/)
assert.match(pageSource, /mdi-plus/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-page.test.js`

Expected: FAIL because customization and validation tokens are not yet present.

- [ ] **Step 3: Add customization dialog**

In `pages/borne.vue`, import:

```js
import ProductCustomizationWizard from '@/components/products/ProductCustomizationWizard'
```

Register component:

```js
components: {
  ProductCustomizationWizard,
},
```

Add data:

```js
customizationDialog: false,
selectedProduct: null,
selectedChoices: [],
checkoutErrorMessage: '',
```

Add a dialog near the bottom of the template:

```vue
<v-dialog v-model="customizationDialog" max-width="920" persistent>
  <div v-if="selectedProduct">
    <ProductCustomizationWizard
      v-model="selectedChoices"
      :product="selectedProduct"
      @confirm="confirmCustomization"
      @cancel="closeCustomization"
    />
  </div>
</v-dialog>
```

- [ ] **Step 4: Add validation and quantity controls**

Add computed:

```js
checkoutDisabled() {
  return (
    this.cartItems.length === 0 ||
    !String(this.customer || '').trim() ||
    !String(this.phone || '').trim() ||
    !this.servicePointId
  )
},
total() {
  return this.cartItems.reduce(
    (sum, item) => sum + this.parsePrice(item.price) * Number(item.qty || 0),
    0
  )
},
```

Replace disabled checkout button with:

```vue
<v-alert v-if="checkoutErrorMessage" type="error" dense>
  {{ checkoutErrorMessage }}
</v-alert>
<v-btn
  color="success"
  block
  x-large
  class="text-none"
  :disabled="checkoutDisabled"
>
  Continuer
</v-btn>
```

Add quantity buttons inside each cart line:

```vue
<div class="kiosk-cart-actions">
  <v-btn icon color="warning" @click="changeQuantity(index, -1)">
    <v-icon>mdi-minus</v-icon>
  </v-btn>
  <strong>{{ item.qty }}</strong>
  <v-btn icon color="success" @click="changeQuantity(index, 1)">
    <v-icon>mdi-plus</v-icon>
  </v-btn>
</div>
```

Add methods:

```js
openProduct(product) {
  if ((product.customization_steps || []).length > 0) {
    this.selectedProduct = product
    this.selectedChoices = []
    this.customizationDialog = true
    return
  }
  this.addToCart(product)
},
confirmCustomization() {
  this.addToCart({
    ...this.selectedProduct,
    selectedChoiceIds: [...this.selectedChoices],
    configurationSignature: `${this.selectedProduct.id}:${this.selectedChoices.join(',')}`,
  })
  this.closeCustomization()
},
closeCustomization() {
  this.customizationDialog = false
  this.selectedProduct = null
  this.selectedChoices = []
},
changeQuantity(index, delta) {
  const item = this.cartItems[index]
  if (!item) return
  const nextQty = Number(item.qty || 0) + delta
  if (nextQty <= 0) {
    this.cartItems.splice(index, 1)
    return
  }
  item.qty = nextQty
},
```

Change product card click from `addToCart(product)` to `openProduct(product)`.

- [ ] **Step 5: Run tests**

Run: `node test/kiosk-page.test.js`

Expected: PASS.

Run: `npm run lint -- --quiet`

Expected: PASS or only pre-existing unrelated lint errors.

- [ ] **Step 6: Commit**

```bash
git add pages/borne.vue test/kiosk-page.test.js
git commit -m "feat: add kiosk cart validation"
```

### Task 6: Kiosk Checkout And Confirmation

**Files:**
- Modify: `pages/borne.vue`
- Test: `test/kiosk-page.test.js`

**Interfaces:**
- Consumes:
  - `buildKioskCheckoutPayload(input)`
  - `getKioskOrderReference(result)`
  - `cart/checkoutOrder`
  - `cart/checkoutCounterPayBefore`
- Produces:
  - `submitPayAtCounter(): Promise<void>`
  - `submitStripe(): Promise<void>`
  - `mountStripePayment(payment): Promise<void>`
  - `confirmStripePayment(): Promise<void>`
  - confirmation state `{ orderId, orderNumber, printStatus }`.

- [ ] **Step 1: Extend failing page test**

Append to `test/kiosk-page.test.js`:

```js
assert.match(pageSource, /buildKioskCheckoutPayload/)
assert.match(pageSource, /getKioskOrderReference/)
assert.match(pageSource, /submitPayAtCounter/)
assert.match(pageSource, /submitStripe/)
assert.match(pageSource, /cart\/checkoutOrder/)
assert.match(pageSource, /cart\/checkoutCounterPayBefore/)
assert.match(pageSource, /source:\s*'borne'/)
assert.match(pageSource, /mountStripePayment/)
assert.match(pageSource, /confirmStripePayment/)
assert.match(pageSource, /stripePaymentElement/)
assert.match(pageSource, /Nouvelle commande/)
assert.match(pageSource, /numero de commande/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-page.test.js`

Expected: FAIL because checkout functions are missing.

- [ ] **Step 3: Add checkout imports and state**

In `pages/borne.vue`, import:

```js
import { loadStripe } from '@stripe/stripe-js'
const {
  buildKioskCheckoutPayload,
  getKioskOrderReference,
} = require('@/helpers/kioskCheckout')
```

Add data:

```js
checkoutLoading: null,
confirmation: null,
stripe: null,
stripeElements: null,
stripePaymentReady: false,
stripePaymentOrderId: null,
```

- [ ] **Step 4: Add payment buttons and confirmation view**

In the template, show confirmation when `confirmation` exists:

```vue
<section v-if="confirmation" class="kiosk-confirmation">
  <div class="kiosk-confirmation-label">Votre numero de commande</div>
  <strong>{{ confirmation.orderNumber }}</strong>
  <p>{{ confirmation.printStatus }}</p>
  <v-btn color="primary" x-large class="text-none" @click="resetKiosk">
    Nouvelle commande
  </v-btn>
</section>
```

Replace the single continue button with:

```vue
<div class="kiosk-payment-actions">
  <v-btn
    color="primary"
    block
    x-large
    class="text-none"
    :disabled="checkoutDisabled"
    :loading="checkoutLoading === 'counter'"
    @click="submitPayAtCounter"
  >
    Payer au comptoir
  </v-btn>
  <v-btn
    color="success"
    block
    x-large
    class="text-none"
    :disabled="checkoutDisabled"
    :loading="checkoutLoading === 'stripe'"
    @click="submitStripe"
  >
    Payer par carte
  </v-btn>
</div>
<div
  v-show="stripePaymentReady && !confirmation"
  class="kiosk-stripe-panel"
>
  <div ref="stripePaymentElement"></div>
  <v-btn
    color="success"
    block
    x-large
    class="text-none mt-4"
    :loading="checkoutLoading === 'stripe-confirm'"
    @click="confirmStripePayment"
  >
    Confirmer le paiement
  </v-btn>
</div>
```

- [ ] **Step 5: Add checkout methods**

Add methods:

```js
buildPayload(payment, stripe) {
  return buildKioskCheckoutPayload({
    customer: this.customer,
    phone: this.phone,
    servicePointId: this.servicePointId,
    total: this.total,
    payment,
    isTakeaway: this.saleMode === 'takeaway',
    dataCart: this.cartItems,
    stripe,
    source: 'borne',
  })
},
async submitPayAtCounter() {
  if (this.checkoutDisabled) return
  this.checkoutErrorMessage = ''
  this.checkoutLoading = 'counter'
  try {
    const result = await this.$store.dispatch(
      'cart/checkoutCounterPayBefore',
      this.buildPayload('Paiement au comptoir', false)
    )
    if (!result || !result.ok) {
      this.checkoutErrorMessage =
        result?.error?.message || 'Impossible d envoyer la commande.'
      return
    }
    await this.finishCheckout(result, 'Paiement au comptoir')
  } catch (error) {
    this.checkoutErrorMessage = error.message
  } finally {
    this.checkoutLoading = null
  }
},
async submitStripe() {
  if (this.checkoutDisabled) return
  this.checkoutErrorMessage = ''
  this.checkoutLoading = 'stripe'
  try {
    const result = await this.$store.dispatch(
      'cart/checkoutOrder',
      this.buildPayload('Stripe', true)
    )
    if (!result || !result.ok) {
      this.checkoutErrorMessage =
        result?.error?.message || 'Impossible de preparer le paiement.'
      return
    }
    await this.mountStripePayment(result.data)
  } catch (error) {
    this.checkoutErrorMessage = error.message
  } finally {
    this.checkoutLoading = null
  }
},
async mountStripePayment(payment) {
  if (!payment || !payment.clientSecret || !payment.publishableKey) {
    throw new Error('Donnees Stripe incompletes.')
  }
  this.stripe = await loadStripe(payment.publishableKey)
  if (!this.stripe) throw new Error('Stripe est indisponible.')
  this.stripeElements = this.stripe.elements({
    clientSecret: payment.clientSecret,
  })
  await this.$nextTick()
  const paymentElement = this.stripeElements.create('payment')
  paymentElement.mount(this.$refs.stripePaymentElement)
  this.stripePaymentReady = true
  this.stripePaymentOrderId = payment.orderId || null
},
async confirmStripePayment() {
  if (!this.stripe || !this.stripeElements) return
  this.checkoutErrorMessage = ''
  this.checkoutLoading = 'stripe-confirm'
  try {
    const result = await this.stripe.confirmPayment({
      elements: this.stripeElements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/borne`,
      },
    })
    if (result.error) {
      this.checkoutErrorMessage =
        result.error.message || 'Le paiement a echoue.'
      return
    }
    await this.$store.dispatch('cart/completeCheckout')
    await this.finishCheckout(
      { ok: true, data: { orderId: this.stripePaymentOrderId } },
      'Stripe'
    )
  } finally {
    this.checkoutLoading = null
  }
},
async finishCheckout(result, paymentMethod = 'Paiement au comptoir') {
  const reference = getKioskOrderReference(result)
  this.confirmation = {
    ...reference,
    printStatus: 'Ticket en cours d impression.',
  }
  this.$store.dispatch('cart/setTotal', 0)
  this.$store.dispatch('cart/setIndex', 0)
  this.$store.dispatch('cart/setTocart', null)
},
resetKiosk() {
  this.cartItems = []
  this.customer = ''
  this.phone = ''
  this.saleMode = 'dine_in'
  this.confirmation = null
  this.checkoutErrorMessage = ''
  this.stripe = null
  this.stripeElements = null
  this.stripePaymentReady = false
  this.stripePaymentOrderId = null
},
```

- [ ] **Step 6: Run tests**

Run: `node test/kiosk-page.test.js && node test/kiosk-checkout.test.js`

Expected: PASS.

Run: `npm run lint -- --quiet`

Expected: PASS or only pre-existing unrelated lint errors.

- [ ] **Step 7: Commit**

```bash
git add pages/borne.vue test/kiosk-page.test.js
git commit -m "feat: submit kiosk orders"
```

### Task 7: Kiosk Ticket Printing

**Files:**
- Modify: `pages/borne.vue`
- Test: `test/kiosk-page.test.js`

**Interfaces:**
- Consumes:
  - `orders/getAllOrder`
  - `orders/getDetailOrder`
  - `buildCashierReceiptPayload`
  - `sendCashierReceipt`
- Produces: `printKioskReceipt(orderId, paymentMethod): Promise<boolean>`.

- [ ] **Step 1: Extend failing page test**

Append to `test/kiosk-page.test.js`:

```js
assert.match(pageSource, /buildCashierReceiptPayload/)
assert.match(pageSource, /sendCashierReceipt/)
assert.match(pageSource, /printKioskReceipt/)
assert.match(pageSource, /Ticket imprime/)
assert.match(pageSource, /Ticket indisponible/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/kiosk-page.test.js`

Expected: FAIL because kiosk printing is missing.

- [ ] **Step 3: Add receipt imports**

In `pages/borne.vue`, add:

```js
const {
  buildCashierReceiptPayload,
  sendCashierReceipt,
} = require('@/helpers/cashierReceipt')
```

- [ ] **Step 4: Add printing method**

Add computed:

```js
shopInfo() {
  return {
    shop_name: this.$store.get('shop/shop_name'),
    smart_print_app: this.$store.get('shop/smart_print_app'),
    shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
    activate_tva: this.$store.get('shop/activate_tva'),
  }
},
```

Add method:

```js
async printKioskReceipt(orderId, paymentMethod) {
  if (!orderId) return false
  try {
    await Promise.all([
      this.$store.dispatch('orders/getAllOrder'),
      this.$store.dispatch('orders/getDetailOrder', orderId),
    ])
    const orders = this.$store.get('orders/dataOrders') || []
    const order = orders.find((item) => String(item.id) === String(orderId))
    if (!order) return false
    const payload = buildCashierReceiptPayload({
      order: {
        ...order,
        source: 'borne',
        order_source: 'borne',
      },
      details: this.$store.get('orders/detailOrder') || [],
      shopInfo: this.shopInfo,
      fallbackPaymentMethod: paymentMethod,
      fallbackCustomer: this.customer || 'Client borne',
      fallbackTable: 'Borne',
      fallbackRemark: '',
    })
    return sendCashierReceipt({
      payload,
      smartPrint: this.shopInfo.smart_print_app,
      printerIp: this.shopInfo.shop_printer_ip,
      dispatch: this.$store.dispatch,
    })
  } catch (error) {
    return false
  }
},
```

Update `finishCheckout(result)` to accept payment method:

```js
async finishCheckout(result, paymentMethod = 'Paiement au comptoir') {
  const reference = getKioskOrderReference(result)
  this.confirmation = {
    ...reference,
    printStatus: 'Ticket en cours d impression.',
  }
  const printed = await this.printKioskReceipt(reference.orderId, paymentMethod)
  this.confirmation.printStatus = printed
    ? 'Ticket imprime.'
    : 'Ticket indisponible.'
  this.$store.dispatch('cart/setTotal', 0)
  this.$store.dispatch('cart/setIndex', 0)
  this.$store.dispatch('cart/setTocart', null)
}
```

Call it as `await this.finishCheckout(result, 'Paiement au comptoir')` or `await this.finishCheckout(result, 'Stripe')`.

- [ ] **Step 5: Run tests**

Run: `node test/kiosk-page.test.js`

Expected: PASS.

Run: `node test/receipt-printing.test.js && node test/printing-fire-and-forget.test.js`

Expected: PASS existing printing tests.

- [ ] **Step 6: Commit**

```bash
git add pages/borne.vue test/kiosk-page.test.js
git commit -m "feat: print kiosk receipts"
```

### Task 8: Final Verification

**Files:**
- Modify only if verification exposes defects in files touched by Tasks 1-7.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified kiosk module ready for manual browser testing.

- [ ] **Step 1: Run targeted kiosk tests**

Run:

```bash
node test/kiosk-staff-roles.test.js
node test/kiosk-auth-middleware.test.js
node test/kiosk-checkout.test.js
node test/kiosk-page.test.js
```

Expected: all PASS.

- [ ] **Step 2: Run related regression tests**

Run:

```bash
node test/staff-roles.test.js
node test/staff-module-navigation.test.js
node test/auth-middleware.test.js
node test/home-dashboard.test.js
node test/service-point-selection.test.js
node test/counter-checkout-store.test.js
node test/receipt-printing.test.js
node test/printing-fire-and-forget.test.js
```

Expected: all PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint -- --quiet`

Expected: PASS or document pre-existing unrelated lint failures with exact file names.

- [ ] **Step 4: Run local app for manual validation**

Run: `npm run dev`

Open: `http://localhost:3000/borne`

Manual checks:

- Login with a user whose `module_permissions` is `['borne']`.
- Confirm automatic redirect to `/borne`.
- Confirm no sidebar, app bar, orders, cash register, staff, or dashboard UI is visible.
- Add a simple product.
- Add a product with customizations.
- Enter name and phone.
- Choose `Sur place`, then validate payment at counter.
- Confirm order number screen appears.
- Confirm ticket print status appears and does not undo the order on failure.
- Repeat with `A emporter`.

- [ ] **Step 5: Commit final fixes**

If fixes were needed:

```bash
git add <fixed-files>
git commit -m "fix: stabilize kiosk module"
```

If no fixes were needed, do not create an empty commit.
