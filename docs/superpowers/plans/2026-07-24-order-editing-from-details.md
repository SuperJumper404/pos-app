# Order Editing From Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de rouvrir une commande en attente et non encaissée depuis ses détails, de modifier ses produits, quantités et suppléments dans le parcours catalogue/panier existant, puis d'enregistrer atomiquement la même commande.

**Architecture:** Le backend extrait d'abord le devis serveur du checkout dans un service partagé, puis ajoute un module `m_orderEditing` qui construit la lecture éditable, calcule une révision opaque et applique les deltas de stock sous transaction. Le frontend ajoute un module Vuex `orderEdit` séparé du checkout, transforme la réponse en panier existant et branche les pages Détails, Menus et Panier sur ce mode. Stripe utilise une orchestration explicite : synchronisation et annulation de l'ancien PaymentIntent, transaction SQL, puis création idempotente du nouveau PaymentIntent.

**Tech Stack:** Express 4, Node.js, MySQL 2 avec transactions, Stripe SDK, Nuxt 2, Vue 2, Vuex Easy Access, Axios, Vuetify, tests Node `assert` existants.

## Global Constraints

- Frontend worktree : `C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app\.worktrees\product-customization-v2`.
- Backend worktree : `C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos\.worktrees\product-customization-v2`.
- Ne pas ajouter de dépendance npm.
- La commande conserve son identifiant, son numéro, son client, sa table, son téléphone, sa note, son moyen de paiement et son statut.
- Une modification est autorisée uniquement avec `status = 1` et `payment_status` égal à `unpaid` ou `requires_payment`.
- Le frontend ne décide jamais de l'éligibilité finale, du prix ou du stock.
- Tous les accès commande sont filtrés par `req.shopid` et l'opérateur vient de `req.id`.
- `client_order_payload_hash` n'est jamais modifié par l'édition.
- Les produits, quantités, suppléments, détails, instantanés, réservations, mouvements et sous-total sont cohérents à la fin d'une seule transaction SQL.
- Le checkout normal, l'archivage, l'impression et l'historique doivent rester compatibles.
- Conserver `NODE_OPTIONS=--openssl-legacy-provider` pour les commandes frontend existantes.

---

## File Map

### Backend

- Create `src/modules/m_orderQuote.js`: devis partagé, résolution des personnalisations et besoins de stock.
- Create `src/modules/m_orderEditing.js`: lecture éditable, révision, validation d'éligibilité et transaction de remplacement du contenu.
- Create `src/controllers/c_orderEditing.js`: contrôleurs GET/PATCH et orchestration Stripe d'une modification.
- Create `src/modules/m_orderTransitions.js`: transition de statut sérialisée sur la même ligne `orders`.
- Modify `src/modules/m_checkout.js`: consommer le service de devis partagé sans changer le contrat checkout.
- Modify `src/modules/m_orders.js`: filtrer le détail actif par boutique.
- Modify `src/modules/m_payments.js`: préparer et attacher un PaymentIntent de remplacement sous verrou.
- Modify `src/controllers/c_orders.js`: passer `shopid` au détail et utiliser la transition de statut transactionnelle.
- Modify `src/controllers/c_stripe.js`: exposer un générateur de PaymentIntent pour une commande existante.
- Modify `src/routers/r_orders.js`: routes GET éditable et PATCH contenu.
- Modify `src/routers/r_stripe.js`: route de régénération Stripe.
- Create `test/order-editing.test.js`: contrats lecture, révision, transaction, contrôleurs et courses.
- Modify `test/checkout-contract.test.js`: non-régression du devis extrait.
- Modify `test/stripe-payment.test.js`: remplacement/régénération Stripe.
- Modify `package.json`: inclure le nouveau test.

### Frontend

- Create `helpers/orderEdit.js`: éligibilité d'affichage, transformation API → panier, payload PATCH et détection de changements.
- Create `store/orderEdit.js`: session persistée, chargement, enregistrement, annulation et régénération.
- Modify `store/users.js`: vider une session d'édition lors de la déconnexion explicite.
- Modify `plugins/axios.js`: vider une session d'édition lors d'une expiration 401.
- Create `components/orders/OrderEditBanner.vue`: bandeau partagé du mode modification.
- Modify `pages/orders/detail/_id.vue`: bouton de démarrage et confirmation de remplacement du panier local.
- Modify `pages/menus.vue`: conserver le panier d'édition, afficher le bandeau et autoriser les ajouts.
- Modify `pages/cart.vue`: enregistrer une modification au lieu de créer une commande, gérer devis/conflits/Stripe.
- Modify `store/orders.js`: fiabiliser le retour d'erreur du détail avant démarrage.
- Create `test/order-edit.test.js`: helpers et contrats source des trois pages.
- Modify `package.json`: inclure le nouveau test.

---

### Task 1: Extract the shared server quote

**Backend files:**
- Create: `src/modules/m_orderQuote.js`
- Modify: `src/modules/m_checkout.js:358-666`
- Modify: `test/checkout-contract.test.js`

**Interfaces:**
- Consumes: `getResolvedProductConfigurations({ shopId, productIds, connection })`, `validateConfiguredItem({ product, steps, selectedChoiceIds })`, `buildStockRequirements(resolvedItems)`.
- Produces: `quoteOrderItems({ shopId, items, connection }) -> { resolvedItems, total, serverQuote, requirements }` and `buildOrderQuoteModule(dependencies)`.

- [ ] **Step 1: Add a failing quote contract**

Add the import and test below to `test/checkout-contract.test.js`, then insert `runOrderQuoteContracts` before `runTransactionalCheckoutContracts` in the promise chain.

```js
const { buildOrderQuoteModule } = require("../src/modules/m_orderQuote");

const runOrderQuoteContracts = async () => {
  const module = buildOrderQuoteModule({
    repository: {
      getProducts: async () => [{
        id: 10,
        shopid: 7,
        name: "Menu",
        price: "8.00",
        archived: 0,
        is_hidden: 0,
      }],
    },
    getResolvedProductConfigurations: async () => new Map([[10, [{
      product_step_id: 20,
      name: "Boisson",
      minimum_choices: 1,
      maximum_choices: 1,
      choices: [{
        product_step_choice_id: 30,
        choice_type: "linked_product",
        choice_name: "Cola",
        extra_price: "1.50",
        linked_product_id: 11,
        active: 1,
        available: true,
      }],
    }]]),
  });

  const quote = await module.quoteOrderItems({
    shopId: 7,
    items: [{ productId: 10, quantity: 2, selectedChoiceIds: [30] }],
  });

  assert.strictEqual(quote.total, 19);
  assert.deepStrictEqual(quote.serverQuote.items, [{
    product_id: 10,
    quantity: 2,
    selected_product_step_choice_ids: [30],
    unit_price: 9.5,
    total: 19,
  }]);
  assert.deepStrictEqual(Array.from(quote.requirements.entries()), [[10, 2], [11, 2]]);
};
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run from the backend worktree:

```powershell
node test/checkout-contract.test.js
```

Expected: FAIL with `Cannot find module '../src/modules/m_orderQuote'`.

- [ ] **Step 3: Create the quote module**

Implement `src/modules/m_orderQuote.js` with these public boundaries. Keep SQL and dependency injection in this file so checkout and editing cannot diverge.

```js
const pool = require("../config/dbPool");
const DomainError = require("../helpers/domainError");
const { parseMoney } = require("../helpers/money");
const { validateConfiguredItem } = require("../helpers/customizationRules");
const { buildStockRequirements } = require("../helpers/stockRequirements");
const {
  getResolvedProductConfigurations,
} = require("./m_customizations");

const queryResult = async (connection, sql, params = []) => {
  const [result] = await (connection || pool).query(sql, params);
  return result;
};

const sqlRepository = {
  getProducts: ({ shopId, productIds, connection }) => queryResult(
    connection,
    `SELECT id, shopid, name, price, stock, archived, is_hidden
     FROM products
     WHERE shopid = ? AND id IN (?)
     ORDER BY id`,
    [shopId, productIds],
  ),
};

const unavailable = (value) => [true, 1, "1", "true"].includes(value);
const byId = (rows, id) => rows.find((row) => Number(row.id) === Number(id));

const buildOrderQuoteModule = ({
  repository = sqlRepository,
  getResolvedProductConfigurations: loadConfigurations = (
    getResolvedProductConfigurations
  ),
  validateConfiguredItem: validateItem = validateConfiguredItem,
  buildStockRequirements: stockRequirements = buildStockRequirements,
} = {}) => {
  const quoteOrderItems = async ({ shopId, items, connection }) => {
    const productIds = [...new Set(items.map((item) => Number(item.productId)))].sort(
      (left, right) => left - right,
    );
    const products = await repository.getProducts({ shopId, productIds, connection });
    if (products.length !== productIds.length) {
      throw new DomainError(404, "PRODUCT_NOT_FOUND", "Product not found", {
        product_ids: productIds.filter((id) => !byId(products, id)),
      });
    }
    for (const product of products) {
      if (unavailable(product.archived) || unavailable(product.is_hidden)) {
        throw new DomainError(422, "PRODUCT_UNAVAILABLE", "Product is unavailable", {
          product_id: product.id,
        });
      }
    }

    const configurations = await loadConfigurations({
      shopId,
      productIds,
      connection,
    });
    const resolvedItems = items.map((item) => {
      const product = byId(products, item.productId);
      const steps = configurations.get(Number(item.productId))
        || configurations.get(String(item.productId))
        || [];
      let validated;
      try {
        validated = validateItem({
          product,
          steps,
          selectedChoiceIds: item.selectedChoiceIds,
        });
      } catch (error) {
        if (error instanceof DomainError) error.product_id = item.productId;
        throw error;
      }
      const unitPrice = parseMoney(validated.unitPrice);
      const lineTotal = parseMoney(unitPrice * Number(item.quantity));
      return {
        ...item,
        product,
        steps,
        selectedChoices: validated.selectedChoices,
        unitPrice,
        lineTotal,
      };
    });
    const total = parseMoney(
      resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    );
    const serverQuote = {
      total,
      items: resolvedItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        selected_product_step_choice_ids: [...item.selectedChoiceIds].sort(
          (left, right) => left - right,
        ),
        unit_price: item.unitPrice,
        total: item.lineTotal,
      })),
    };
    return {
      resolvedItems,
      total,
      serverQuote,
      requirements: stockRequirements(resolvedItems),
    };
  };

  return { quoteOrderItems };
};

const orderQuoteModule = buildOrderQuoteModule();

module.exports = {
  buildOrderQuoteModule,
  quoteOrderItems: orderQuoteModule.quoteOrderItems,
};
```

- [ ] **Step 4: Make checkout consume the shared quote**

In `buildCheckoutModule`, build the shared quote service with the checkout repository and its existing injectable dependencies. This keeps all current in-memory checkout harnesses isolated from the real pool:

```js
const { buildOrderQuoteModule } = require("./m_orderQuote");

const buildCheckoutModule = ({
  repository = sqlRepository,
  withTransaction: runInTransaction = withTransaction,
  quoteOrderItems: suppliedQuoteOrderItems,
  getResolvedProductConfigurations: loadConfigurations = (
    getResolvedProductConfigurations
  ),
  validateConfiguredItem: validateItem = validateConfiguredItem,
  buildStockRequirements: stockRequirements = buildStockRequirements,
  now = () => new Date(),
  reservationTtlMs = RESERVATION_TTL_MS,
} = {}) => {
  const quoteModule = buildOrderQuoteModule({
    repository: {
      getProducts: repository.getProducts,
    },
    getResolvedProductConfigurations: loadConfigurations,
    validateConfiguredItem: validateItem,
    buildStockRequirements: stockRequirements,
  });
  const quoteItems = suppliedQuoteOrderItems || quoteModule.quoteOrderItems;
```

Inside `transactionWork`, use:

```js
const quote = await quoteItems({
  shopId: checkout.shopId,
  items: checkout.items,
  connection,
});
const {
  resolvedItems,
  total,
  serverQuote,
  requirements,
} = quote;
```

Keep `expected_total`, insertions, snapshots and reservations unchanged. Remove the old inline product/configuration/price block completely so production has one quote implementation.

- [ ] **Step 5: Run checkout contracts and the full backend suite**

```powershell
node test/checkout-contract.test.js
npm test
```

Expected: both commands PASS and end respectively with `customization and checkout contracts passed` and exit code `0`.

- [ ] **Step 6: Commit the quote extraction**

```powershell
git add src/modules/m_orderQuote.js src/modules/m_checkout.js test/checkout-contract.test.js
git commit -m "refactor: share server order quoting"
```

---

### Task 2: Add the editable read model and content revision

**Backend files:**
- Create: `src/modules/m_orderEditing.js`
- Create: `src/controllers/c_orderEditing.js`
- Create: `test/order-editing.test.js`
- Modify: `src/routers/r_orders.js`
- Modify: `src/modules/m_orders.js:78-96,276-279`
- Modify: `src/controllers/c_orders.js:146-158`
- Modify: `package.json`

**Interfaces:**
- Consumes: active order, details, `orderdetail_customization_snapshots` and current resolved product configurations scoped to one shop.
- Produces: `getEditableOrder({ orderId, shopId })`, `buildContentRevision({ order, details, snapshots })`, `isEditableOrder(order)` and `GET /api/v1/orders/:id/edit`.

- [ ] **Step 1: Create the failing read-model tests**

Create `test/order-editing.test.js` with deterministic fixtures and a simple response harness:

```js
const assert = require("assert");
const fs = require("fs");
const {
  buildContentRevision,
  buildOrderEditingModule,
  isEditableOrder,
} = require("../src/modules/m_orderEditing");

const order = {
  id: 42,
  shopid: 7,
  ordernumber: "0042",
  status: 1,
  payment_status: "unpaid",
  payment_provider: null,
  subtotal: "11.50",
};
const details = [{
  id: 70,
  orderid: 42,
  productid: 10,
  name: "Menu",
  image: "menu.webp",
  qty: 1,
  price: "11.50",
  total: "11.50",
}];
const snapshots = [{
  orderdetail_id: 70,
  product_customization_step_id: 20,
  product_customization_step_choice_id: 30,
  step_name: "Boisson",
  step_position: 0,
  choice_type: "simple",
  choice_name: "Cola",
  choice_position: 0,
  unit_extra_price: "1.50",
  linked_product_id: null,
}];

assert.strictEqual(isEditableOrder(order), true);
assert.strictEqual(isEditableOrder({ ...order, status: 2 }), false);
assert.strictEqual(isEditableOrder({ ...order, payment_status: "paid" }), false);
assert.strictEqual(
  buildContentRevision({ order, details, snapshots }),
  buildContentRevision({ order, details: details.map((row) => ({ ...row })), snapshots }),
);

const runReadContracts = async () => {
  const calls = [];
  const module = buildOrderEditingModule({
    repository: {
      findOrder: async (options) => {
        calls.push(options);
        return order;
      },
      findDetails: async () => details,
      findSnapshots: async () => snapshots,
    },
    getResolvedProductConfigurations: async () => new Map([[10, [{
      product_step_id: 20,
      choices: [{
        product_step_choice_id: 30,
        active: 1,
        available: true,
      }],
    }]]),
  });
  const result = await module.getEditableOrder({ orderId: 42, shopId: 7 });
  assert.strictEqual(calls[0].shopId, 7);
  assert.deepStrictEqual(result.items[0].selected_product_step_choice_ids, [30]);
  assert.strictEqual(result.items[0].requires_reconfiguration, false);
  assert.match(result.content_revision, /^[a-f0-9]{64}$/);

  snapshots[0].product_customization_step_choice_id = 999;
  const legacy = await module.getEditableOrder({ orderId: 42, shopId: 7 });
  assert.strictEqual(legacy.items[0].requires_reconfiguration, true);
};

const routerSource = fs.readFileSync(require.resolve("../src/routers/r_orders"), "utf8");
assert.match(routerSource, /\.get\("\/orders\/:id\/edit", authentication,/);

runReadContracts()
  .then(() => console.log("orderEditing tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
```

- [ ] **Step 2: Register the test and verify it fails**

Add `node test/order-editing.test.js` before `test/checkout-contract.test.js` in the backend `test` script.

```powershell
node test/order-editing.test.js
```

Expected: FAIL with `Cannot find module '../src/modules/m_orderEditing'`.

- [ ] **Step 3: Implement the read model**

Create `src/modules/m_orderEditing.js`. Export the builder and pure functions so the later transaction tests can inject an in-memory repository.

```js
const crypto = require("crypto");
const pool = require("../config/dbPool");
const DomainError = require("../helpers/domainError");
const { parseMoney } = require("../helpers/money");

const EDITABLE_PAYMENT_STATUSES = new Set(["unpaid", "requires_payment"]);
const isEditableOrder = (order = {}) => (
  Number(order.status) === 1
  && EDITABLE_PAYMENT_STATUSES.has(String(order.payment_status))
);

const canonicalContent = ({ order, details, snapshots }) => ({
  subtotal: parseMoney(order.subtotal),
  items: [...details]
    .sort((left, right) => Number(left.id) - Number(right.id))
    .map((detail) => ({
      product_id: Number(detail.productid),
      quantity: Number(detail.qty),
      unit_price: parseMoney(detail.price),
      total: parseMoney(detail.total),
      choices: snapshots
        .filter((row) => Number(row.orderdetail_id) === Number(detail.id))
        .sort((left, right) => (
          Number(left.step_position) - Number(right.step_position)
          || Number(left.choice_position) - Number(right.choice_position)
          || Number(left.id || 0) - Number(right.id || 0)
        ))
        .map((row) => ({
          contextual_id: row.product_customization_step_choice_id == null
            ? null
            : Number(row.product_customization_step_choice_id),
          step_name: row.step_name,
          choice_name: row.choice_name,
          extra_price: parseMoney(row.unit_extra_price),
          linked_product_id: row.linked_product_id == null
            ? null
            : Number(row.linked_product_id),
        })),
    })),
});

const buildContentRevision = (content) => crypto
  .createHash("sha256")
  .update(JSON.stringify(canonicalContent(content)))
  .digest("hex");

const notEditable = (order) => new DomainError(
  409,
  "ORDER_NOT_EDITABLE",
  "Cette commande ne peut plus être modifiée.",
  {
    order_status: order && order.status,
    payment_status: order && order.payment_status,
  },
);
```

Add these repository queries, each accepting `connection`:

```js
findOrder: ({ orderId, shopId, connection }) => queryResult(
  connection,
  `SELECT * FROM orders
   WHERE id = ? AND shopid = ?
   LIMIT 1`,
  [orderId, shopId],
).then((rows) => rows[0] || null),
findDetails: ({ orderId, connection }) => queryResult(
  connection,
  `SELECT orderdetail.*, products.name, products.image
   FROM orderdetail
   JOIN products ON products.id = orderdetail.productid
   WHERE orderdetail.orderid = ?
   ORDER BY orderdetail.id`,
  [orderId],
),
findSnapshots: ({ detailIds, connection }) => (
  detailIds.length === 0
    ? Promise.resolve([])
    : queryResult(
      connection,
      `SELECT * FROM orderdetail_customization_snapshots
       WHERE orderdetail_id IN (?)
       ORDER BY orderdetail_id, step_position, choice_position, id`,
      [detailIds],
    )
),
```

`getEditableOrder` loads the resolved configurations for every ordered product and sets `requires_reconfiguration` when a snapshot has no contextual ID, when that ID no longer exists, or when its current choice is inactive/unavailable. It must return the exact snake_case contract from the design and throw `ORDER_NOT_EDITABLE` for status/payment failures.

- [ ] **Step 4: Add the controller and route**

Create `src/controllers/c_orderEditing.js` with an injectable controller:

```js
const DomainError = require("../helpers/domainError");
const { custom, success } = require("../helpers/response");
const { getEditableOrder } = require("../modules/m_orderEditing");

const domainResponse = (res, error) => custom(
  res,
  error.status,
  error.message,
  null,
  Object.keys(error).reduce((data, key) => {
    if (!["status", "message", "name"].includes(key)) data[key] = error[key];
    return data;
  }, { code: error.code }),
);

const buildGetEditableOrderController = ({
  getEditableOrder: loadEditableOrder = getEditableOrder,
} = {}) => async (req, res) => {
  try {
    const data = await loadEditableOrder({
      orderId: Number(req.params.id),
      shopId: Number(req.shopid),
    });
    return success(res, "Commande modifiable récupérée.", null, data);
  } catch (error) {
    if (error instanceof DomainError) return domainResponse(res, error);
    return custom(res, 500, "Erreur serveur.", null, { code: "INTERNAL_ERROR" });
  }
};

module.exports = {
  buildGetEditableOrderController,
  getEditableOrder: buildGetEditableOrderController(),
};
```

In `src/routers/r_orders.js`, import `c_orderEditing` and add the GET route before the generic PATCH route.

- [ ] **Step 5: Scope the existing active detail by shop**

Change `findActiveOrderDetails` and `mDetailOrder` to accept `shopId`, and call `mDetailOrder(id, req.shopid)` from `c_orders.detailOrder`.

```sql
WHERE orders.id = ? AND orders.shopid = ?
```

Add a test assertion that the repository receives `[42, 7]`; this closes the existing cross-shop detail leak while touching the same read path.

- [ ] **Step 6: Run the read contracts and backend suite**

```powershell
node test/order-editing.test.js
npm test
```

Expected: `orderEditing tests passed` and full suite exit code `0`.

- [ ] **Step 7: Commit the read model**

```powershell
git add src/modules/m_orderEditing.js src/controllers/c_orderEditing.js src/routers/r_orders.js src/modules/m_orders.js src/controllers/c_orders.js test/order-editing.test.js package.json
git commit -m "feat: expose editable order content"
```

---

### Task 3: Implement transactional item replacement and stock deltas

**Backend files:**
- Modify: `src/modules/m_orderEditing.js`
- Modify: `src/controllers/c_orderEditing.js`
- Modify: `src/routers/r_orders.js`
- Modify: `test/order-editing.test.js`

**Interfaces:**
- Consumes: `quoteOrderItems({ shopId, items, connection })`, `content_revision`, `expected_total`, authenticated `shopId` and `actorId`.
- Produces: `previewOrderEdit(input)`, `updateOrderItems(input)` and `PATCH /api/v1/orders/:id/items`.

- [ ] **Step 1: Add failing payload, delta and rollback tests**

Extend `test/order-editing.test.js` with an in-memory harness whose transaction clones state before work. Cover these exact assertions:

```js
const updated = await harness.module.updateOrderItems({
  orderId: 42,
  shopId: 7,
  actorId: 9,
  contentRevision: harness.revision(),
  expectedTotal: 20,
  items: [{
    productId: 10,
    quantity: 2,
    selectedChoiceIds: [30],
  }],
});
assert.strictEqual(updated.total, 20);
assert.strictEqual(harness.state.products.get(10), 6, "one extra parent consumed");
assert.strictEqual(harness.state.products.get(11), 3, "two linked choices consumed");
assert.strictEqual(harness.state.order.subtotal, 20);
assert.strictEqual(
  harness.state.order.client_order_payload_hash,
  "original-checkout-hash",
  "checkout idempotency claim remains unchanged",
);
assert.strictEqual(harness.state.details.length, 1);
assert.strictEqual(harness.state.snapshots.length, 1);
assert.strictEqual(harness.state.reservations.get(10).quantity, 2);
assert.strictEqual(harness.state.reservations.get(11).quantity, 2);

await assert.rejects(
  () => harness.module.updateOrderItems({
    orderId: 42,
    shopId: 7,
    actorId: 9,
    contentRevision: "stale",
    expectedTotal: 20,
    items: [{ productId: 10, quantity: 2, selectedChoiceIds: [30] }],
  }),
  (error) => error.code === "ORDER_EDIT_CONFLICT",
);

const beforeFailure = harness.snapshot();
harness.failSnapshots = true;
await assert.rejects(() => harness.updateSamePayload(), /snapshot write failure/);
assert.deepStrictEqual(harness.snapshot(), beforeFailure, "transaction rolled back");
```

Also assert `ORDER_ITEMS_REQUIRED`, `ORDER_REPRICE_REQUIRED`, `INSUFFICIENT_STOCK`, stock restitution after removing a line, and backfill of a legacy order without reservation rows.

- [ ] **Step 2: Run the test and confirm the missing method failure**

```powershell
node test/order-editing.test.js
```

Expected: FAIL because `updateOrderItems` is not a function.

- [ ] **Step 3: Normalize input and old requirements**

Add pure helpers to `m_orderEditing.js`:

```js
const normalizeEditItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DomainError(400, "ORDER_ITEMS_REQUIRED", "La commande doit contenir un produit.");
  }
  return items.map((item, index) => {
    const productId = Number(item.productId || item.product_id);
    const quantity = Number(item.quantity);
    const selectedChoiceIds = item.selectedChoiceIds
      || item.selected_product_step_choice_ids
      || [];
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      throw new DomainError(400, "CHECKOUT_REQUEST_INVALID", "Produit invalide.", {
        field: `items.${index}.product_id`,
      });
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new DomainError(400, "CHECKOUT_REQUEST_INVALID", "Quantité invalide.", {
        field: `items.${index}.quantity`,
      });
    }
    const normalizedChoices = selectedChoiceIds.map(Number);
    if (normalizedChoices.some((id) => !Number.isSafeInteger(id) || id <= 0)
      || new Set(normalizedChoices).size !== normalizedChoices.length) {
      throw new DomainError(400, "CHECKOUT_REQUEST_INVALID", "Suppléments invalides.", {
        field: `items.${index}.selected_product_step_choice_ids`,
      });
    }
    return { productId, quantity, selectedChoiceIds: normalizedChoices };
  });
};

const storedRequirements = (details, snapshots) => {
  const requirements = new Map();
  const add = (productId, quantity) => requirements.set(
    Number(productId),
    (requirements.get(Number(productId)) || 0) + Number(quantity),
  );
  for (const detail of details) {
    add(detail.productid, detail.qty);
    for (const snapshot of snapshots.filter(
      (row) => Number(row.orderdetail_id) === Number(detail.id),
    )) {
      if (snapshot.choice_type === "linked_product" && snapshot.linked_product_id) {
        add(snapshot.linked_product_id, detail.qty);
      }
    }
  }
  return requirements;
};

const requirementDeltas = (before, after) => new Map(
  [...new Set([...before.keys(), ...after.keys()])]
    .sort((left, right) => left - right)
    .map((productId) => [
      productId,
      (after.get(productId) || 0) - (before.get(productId) || 0),
    ]),
);
```

- [ ] **Step 4: Add transactional repository methods**

Add these parameterized repository methods:

```js
lockOrder: ({ orderId, shopId, connection }) => queryResult(
  connection,
  `SELECT * FROM orders
   WHERE id = ? AND shopid = ?
   LIMIT 1 FOR UPDATE`,
  [orderId, shopId],
).then((rows) => rows[0] || null),
lockDetails: ({ orderId, connection }) => queryResult(
  connection,
  `SELECT * FROM orderdetail
   WHERE orderid = ? ORDER BY id FOR UPDATE`,
  [orderId],
),
lockSnapshots: ({ detailIds, connection }) => (
  detailIds.length === 0
    ? Promise.resolve([])
    : queryResult(
      connection,
      `SELECT * FROM orderdetail_customization_snapshots
       WHERE orderdetail_id IN (?)
       ORDER BY orderdetail_id, step_position, choice_position, id
       FOR UPDATE`,
      [detailIds],
    )
),
lockReservations: ({ orderId, connection }) => queryResult(
  connection,
  `SELECT * FROM order_stock_reservations
   WHERE order_id = ? ORDER BY product_id FOR UPDATE`,
  [orderId],
),
lockProducts: ({ shopId, productIds, connection }) => queryResult(
  connection,
  `SELECT id, shopid, stock FROM products
   WHERE shopid = ? AND id IN (?)
   ORDER BY id FOR UPDATE`,
  [shopId, productIds],
),
adjustStock: ({ shopId, productId, delta, connection }) => {
  const shortage = delta < 0 ? " AND stock >= ?" : "";
  const params = [delta, productId, shopId];
  if (delta < 0) params.push(-delta);
  return queryResult(
    connection,
    `UPDATE products SET stock = stock + ?
     WHERE id = ? AND shopid = ?${shortage}`,
    params,
  );
},
deleteSnapshots: ({ detailIds, connection }) => (
  detailIds.length === 0
    ? Promise.resolve({ affectedRows: 0 })
    : queryResult(
      connection,
      "DELETE FROM orderdetail_customization_snapshots WHERE orderdetail_id IN (?)",
      [detailIds],
    )
),
deleteDetails: ({ orderId, connection }) => queryResult(
  connection,
  "DELETE FROM orderdetail WHERE orderid = ?",
  [orderId],
),
insertDetail: ({ detail, connection }) => queryResult(
  connection,
  "INSERT INTO orderdetail SET ?",
  [detail],
),
insertSnapshot: ({ snapshot, connection }) => queryResult(
  connection,
  "INSERT INTO orderdetail_customization_snapshots SET ?",
  [snapshot],
),
updateOrderTotal: ({ orderId, shopId, total, finished, connection }) => queryResult(
  connection,
  `UPDATE orders SET subtotal = ?, finished = ?
   WHERE id = ? AND shopid = ?`,
  [total, finished, orderId, shopId],
),
upsertReservation: ({ reservation, connection }) => queryResult(
  connection,
  `INSERT INTO order_stock_reservations SET ?
   ON DUPLICATE KEY UPDATE
     quantity = VALUES(quantity),
     status = VALUES(status),
     expires_at = VALUES(expires_at),
     updated = VALUES(updated)`,
  [reservation],
),
insertMovement: ({ movement, connection }) => queryResult(
  connection,
  "INSERT INTO stocks SET ?",
  [movement],
),
```

`adjustStock` must use `AND stock >= ?` for consumption. `upsertReservation` must update quantity, status, expiry and `updated` by unique `(order_id, product_id)`. A requirement removed from the new order is stored with quantity `0`, so a later edit can reuse the same unique row safely.

- [ ] **Step 5: Implement preview and update**

`previewOrderEdit` performs normalization and quote without writing. `updateOrderItems` repeats the quote inside the transaction, locks the order first, verifies eligibility and revision, then applies deltas.

The transaction skeleton must keep this order; Task 5 inserts Stripe settlement at the marked boundary after every expected refusal and before writes:

```js
const updateOrderItems = (input) => {
  const items = normalizeEditItems(input.items);
  return runInTransaction(async (connection) => {
    const order = await repository.lockOrder({
      orderId: input.orderId,
      shopId: input.shopId,
      connection,
    });
    if (!order) {
      throw new DomainError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
    }
    if (!isEditableOrder(order)) throw notEditable(order);

    const details = await repository.lockDetails({
      orderId: order.id,
      connection,
    });
    const detailIds = details.map((detail) => Number(detail.id));
    const snapshots = await repository.lockSnapshots({ detailIds, connection });
    const reservations = await repository.lockReservations({
      orderId: order.id,
      connection,
    });
    const currentRevision = buildContentRevision({ order, details, snapshots });
    if (currentRevision !== input.contentRevision) {
      throw new DomainError(
        409,
        "ORDER_EDIT_CONFLICT",
        "La commande a été modifiée depuis son chargement.",
        { content_revision: currentRevision },
      );
    }

    const quote = await quoteOrderItems({
      shopId: input.shopId,
      items,
      connection,
    });
    if (parseMoney(input.expectedTotal) !== quote.total) {
      throw new DomainError(
        409,
        "ORDER_REPRICE_REQUIRED",
        "Le prix de la commande a changé.",
        { server_quote: quote.serverQuote },
      );
    }

    const before = storedRequirements(details, snapshots);
    const deltas = requirementDeltas(before, quote.requirements);
    const productIds = [...deltas.keys()].sort((left, right) => left - right);
    const products = await repository.lockProducts({
      shopId: input.shopId,
      productIds,
      connection,
    });
    for (const [productId, delta] of deltas) {
      const product = products.find((row) => Number(row.id) === productId);
      if (delta > 0 && (!product || Number(product.stock) < delta)) {
        throw new DomainError(409, "INSUFFICIENT_STOCK", "Stock insuffisant.", {
          shortages: [{
            product_id: productId,
            requested: delta,
            available: product ? Number(product.stock) : 0,
          }],
        });
      }
    }

    if (order.payment_status === "requires_payment") {
      if (typeof input.settlePendingPayment !== "function") {
        throw new DomainError(
          409,
          "STRIPE_PAYMENT_REFRESH_REQUIRED",
          "Le paiement Stripe doit être synchronisé avant la modification.",
        );
      }
      await input.settlePendingPayment({ order, connection });
    }

    for (const [productId, delta] of deltas) {
      if (delta === 0) continue;
      const adjustment = await repository.adjustStock({
        shopId: input.shopId,
        productId,
        delta: -delta,
        connection,
      });
      if (!adjustment.affectedRows) {
        throw new DomainError(409, "INSUFFICIENT_STOCK", "Stock insuffisant.", {
          shortages: [{ product_id: productId, requested: delta, available: 0 }],
        });
      }
    }

    const currentDate = now();
    const timestamp = currentDate.toISOString().slice(0, 19).replace("T", " ");
    const expiresAt = new Date(
      currentDate.valueOf() + reservationTtlMinutes * 60 * 1000,
    ).toISOString().slice(0, 19).replace("T", " ");

    await repository.deleteSnapshots({ detailIds, connection });
    await repository.deleteDetails({ orderId: order.id, connection });
    const insertedDetails = [];
    const insertedSnapshots = [];
    for (const item of quote.resolvedItems) {
      const detail = {
        orderid: order.id,
        productid: item.productId,
        price: item.unitPrice,
        qty: item.quantity,
        total: item.lineTotal,
      };
      const detailResult = await repository.insertDetail({ detail, connection });
      insertedDetails.push({ id: detailResult.insertId, ...detail });
      for (const selectedChoice of item.selectedChoices) {
        const step = item.steps.find(
          (candidate) => Number(candidate.product_step_id) === Number(selectedChoice.step_id),
        );
        const choice = step.choices.find(
          (candidate) => Number(candidate.product_step_choice_id)
            === Number(selectedChoice.product_step_choice_id),
        );
        const snapshot = {
          orderdetail_id: detailResult.insertId,
          product_customization_step_id: selectedChoice.step_id,
          product_customization_step_choice_id: selectedChoice.product_step_choice_id,
          step_name: selectedChoice.step_name,
          step_position: step.position,
          choice_type: selectedChoice.choice_type,
          choice_name: selectedChoice.choice_name,
          choice_position: choice.position,
          unit_extra_price: selectedChoice.extra_price,
          linked_product_id: selectedChoice.linked_product_id,
          created: timestamp,
        };
        const snapshotResult = await repository.insertSnapshot({
          snapshot,
          connection,
        });
        insertedSnapshots.push({ id: snapshotResult.insertId, ...snapshot });
      }
    }

    await repository.updateOrderTotal({
      orderId: order.id,
      shopId: input.shopId,
      total: quote.total,
      finished: timestamp,
      connection,
    });
    const reservationStatus = order.payment_provider === "stripe"
      ? "reserved"
      : "committed";
    for (const productId of productIds) {
      await repository.upsertReservation({
        reservation: {
          order_id: order.id,
          product_id: productId,
          quantity: quote.requirements.get(productId) || 0,
          status: reservationStatus,
          expires_at: reservationStatus === "reserved" ? expiresAt : null,
          created: timestamp,
          updated: timestamp,
        },
        connection,
      });
      const delta = deltas.get(productId);
      if (reservationStatus === "committed" && delta !== 0) {
        await repository.insertMovement({
          movement: {
            productid: productId,
            category: delta > 0 ? "1" : "2",
            qty: Math.abs(delta),
            operator: input.actorId,
            remark: `Modification commande #${order.ordernumber}`,
            created: timestamp,
            updated: timestamp,
          },
          connection,
        });
      }
    }
```

Inject `now = () => new Date()` and `reservationTtlMinutes = parsePositiveIntegerEnv(process.env.STRIPE_STOCK_RESERVATION_MINUTES, 15)` into `buildOrderEditingModule`. Close the transaction by returning the result below followed by `});` and close `updateOrderItems`.

Use this result shape:

```js
return {
  order_id: Number(order.id),
  total: quote.total,
  content_revision: buildContentRevision({
    order: { ...order, subtotal: quote.total },
    details: insertedDetails,
    snapshots: insertedSnapshots,
  }),
  payment_status: order.payment_status,
  payment_provider: order.payment_provider,
  payment_refresh: "not_required",
};
  });
};
```

For a positive delta, call `adjustStock` with `delta: -delta`; for a negative delta, pass `delta: Math.abs(delta)`. Record a movement only for committed reservations, with category `"1"` for consumption and `"2"` for restitution, absolute quantity and remark `Modification commande #<ordernumber>`.

Do not alter `client_order_token` or `client_order_payload_hash`.

- [ ] **Step 6: Expose the PATCH controller**

Add to `c_orderEditing.js`:

```js
const buildUpdateOrderItemsController = ({
  updateOrderItems: saveOrderItems = updateOrderItems,
} = {}) => async (req, res) => {
  try {
    const data = await saveOrderItems({
      orderId: Number(req.params.id),
      shopId: Number(req.shopid),
      actorId: Number(req.id),
      contentRevision: req.body.content_revision,
      expectedTotal: req.body.expected_total,
      items: req.body.items,
    });
    return success(res, "Commande modifiée avec succès.", null, data);
  } catch (error) {
    if (error instanceof DomainError) return domainResponse(res, error);
    return custom(res, 500, "Erreur serveur.", null, { code: "INTERNAL_ERROR" });
  }
};
```

Register `.patch("/orders/:id/items", authentication, orderEditing.updateOrderItems)` in `r_orders.js`.

- [ ] **Step 7: Run transactional tests and full backend suite**

```powershell
node test/order-editing.test.js
npm test
```

Expected: PASS with stock, rollback, revision and reprice assertions.

- [ ] **Step 8: Commit the transaction**

```powershell
git add src/modules/m_orderEditing.js src/controllers/c_orderEditing.js src/routers/r_orders.js test/order-editing.test.js
git commit -m "feat: amend unpaid pending orders"
```

---

### Task 4: Serialize preparation against editing

**Backend files:**
- Create: `src/modules/m_orderTransitions.js`
- Modify: `src/controllers/c_orders.js:291-341`
- Modify: `test/order-editing.test.js`

**Interfaces:**
- Consumes: `transitionOrderStatus({ orderId, shopId, actorId, nextStatus })`.
- Produces: one row lock shared by preparation/cancellation and order editing.

- [ ] **Step 1: Add a failing status-transition contract**

Add a harness asserting the order is locked by shop and that an edit which holds the lock wins before preparation observes the final content:

```js
const { buildOrderTransitionModule } = require("../src/modules/m_orderTransitions");

const events = [];
const transitions = buildOrderTransitionModule({
  withTransaction: async (work) => {
    events.push("begin");
    const result = await work({ transaction: true });
    events.push("commit");
    return result;
  },
  repository: {
    lockOrder: async ({ orderId, shopId }) => {
      events.push(["lock", orderId, shopId]);
      return { id: 42, shopid: 7, status: 1, payment_status: "unpaid" };
    },
    updateStatus: async ({ nextStatus }) => {
      events.push(["status", nextStatus]);
      return { affectedRows: 1 };
    },
  },
});
await transitions.transitionOrderStatus({
  orderId: 42,
  shopId: 7,
  actorId: 9,
  nextStatus: 2,
});
assert.deepStrictEqual(events, ["begin", ["lock", 42, 7], ["status", 2], "commit"]);
```

Also assert invalid transitions return `ORDER_STATUS_TRANSITION_INVALID` and a paid/pending order may enter preparation but can no longer be edited after that transition.

- [ ] **Step 2: Run and verify the missing module failure**

```powershell
node test/order-editing.test.js
```

Expected: FAIL with missing `m_orderTransitions`.

- [ ] **Step 3: Implement the transition module**

Create a small transaction module using `SELECT ... FOR UPDATE WHERE id = ? AND shopid = ?`. Preserve the current allowed transitions:

```js
const ALLOWED = new Set(["1:2", "2:3", "1:4", "2:4"]);

const sqlRepository = {
  lockOrder: ({ orderId, shopId, connection }) => queryResult(
    connection,
    `SELECT * FROM orders
     WHERE id = ? AND shopid = ?
     LIMIT 1 FOR UPDATE`,
    [orderId, shopId],
  ).then((rows) => rows[0] || null),
  updateStatus: ({ orderId, shopId, actorId, nextStatus, finished, connection }) => (
    queryResult(
      connection,
      `UPDATE orders
       SET status = ?, operator = ?, finished = ?
       WHERE id = ? AND shopid = ?`,
      [nextStatus, actorId, finished, orderId, shopId],
    )
  ),
};

const transitionOrderStatus = async ({ orderId, shopId, actorId, nextStatus }) => (
  runInTransaction(async (connection) => {
    const order = await repository.lockOrder({ orderId, shopId, connection });
    if (!order) {
      throw new DomainError(404, "ORDER_NOT_FOUND", "Commande introuvable.");
    }
    if (!ALLOWED.has(`${Number(order.status)}:${Number(nextStatus)}`)) {
      throw new DomainError(
        422,
        "ORDER_STATUS_TRANSITION_INVALID",
        "Changement de statut non autorisé pour cette commande.",
      );
    }
    const result = await repository.updateStatus({
      orderId,
      shopId,
      actorId,
      nextStatus,
      finished: new Date().toISOString().slice(0, 19).replace("T", " "),
      connection,
    });
    return { order, result };
  })
);
```

- [ ] **Step 4: Replace the unlocked status write**

In `c_orders.updateOrder`, retain the current Stripe cancellation synchronization for a transition to canceled, then call `transitionOrderStatus` instead of `mDetailOrder` followed by `mUpdateOrders`. Pass only authenticated actor, target status, order ID and shop ID; ignore unrelated request properties.

- [ ] **Step 5: Run focused and full backend tests**

```powershell
node test/order-editing.test.js
npm test
```

Expected: PASS, including the old status behavior.

- [ ] **Step 6: Commit the serialized transition**

```powershell
git add src/modules/m_orderTransitions.js src/controllers/c_orders.js test/order-editing.test.js
git commit -m "fix: serialize order status transitions"
```

---

### Task 5: Replace pending Stripe payment after an edit

**Backend files:**
- Modify: `src/modules/m_payments.js`
- Modify: `src/modules/m_orderEditing.js`
- Modify: `src/controllers/c_orderEditing.js`
- Modify: `src/controllers/c_stripe.js`
- Modify: `src/routers/r_stripe.js`
- Modify: `test/order-editing.test.js`
- Modify: `test/stripe-payment.test.js`

**Interfaces:**
- Consumes: canceled external PaymentIntent ID, amended total/revision and Stripe Connect shop configuration.
- Produces: `stagePaymentReplacement`, `persistReplacementPaymentIntent`, `regenerateOrderPaymentIntent` and `POST /api/v1/stripe/payment-intents/orders/:id/regenerate`.

- [ ] **Step 1: Add failing payment replacement tests**

In `test/stripe-payment.test.js`, add contracts for these three states:

```js
const prepared = await paymentModule.stagePaymentReplacement({
  orderId: 42,
  shopId: 7,
  paymentIntentId: "pi_old",
  connection: { transaction: true },
});
assert.strictEqual(prepared.ready, true);
assert.strictEqual(state.orders[0].payment_status, "unpaid");
assert.strictEqual(state.orders[0].stripe_payment_intent_id, null);
assert.strictEqual(state.payments[0].status, "canceled");

const attached = await paymentModule.persistReplacementPaymentIntent({
  orderId: 42,
  shopId: 7,
  stripe_payment_intent_id: "pi_new",
  amount: 25,
  amount_cents: 2500,
  application_fee_amount: 125,
  currency: "eur",
  status: "requires_payment_method",
});
assert.strictEqual(attached.attached, true);
assert.strictEqual(state.orders[0].payment_status, "requires_payment");
assert.strictEqual(state.orders[0].stripe_payment_intent_id, "pi_new");
```

Add controller tests proving:

- Event order is SQL order lock, content/stock validation, Stripe retrieve/cancel, SQL replacement writes, transaction commit, new intent creation.
- Stripe `succeeded` calls `markPaymentSucceeded` and returns `ORDER_NOT_EDITABLE` without SQL amendment.
- A cancel result other than `canceled` returns `STRIPE_PAYMENT_NOT_SETTLED` without SQL amendment.
- Successful cancellation amends once and creates a new intent with idempotency key `order-edit-7-42-<revision>`.
- An unexpected SQL write failure after confirmed external cancellation runs the payment recovery transition and never exposes the old QR again.
- Failure to create the new intent returns a successful amended order with `payment_refresh: "required"` and no client secret.
- Regeneration after expiration either renews reservations or returns `INSUFFICIENT_STOCK`.

- [ ] **Step 2: Run focused Stripe tests and confirm failure**

```powershell
node test/stripe-payment.test.js
```

Expected: FAIL because the two replacement methods are undefined.

- [ ] **Step 3: Add SQL replacement transitions**

Extend `m_payments.js` with connection-aware repository operations. `stagePaymentReplacement` requires the same active intent, runs inside the already-open order-edit transaction and must not release stock reservations:

```sql
UPDATE payments
SET status = 'canceled', updated = ?
WHERE order_id = ? AND stripe_payment_intent_id = ? AND status <> 'succeeded';

UPDATE orders
SET payment_status = 'unpaid', stripe_payment_intent_id = NULL, finished = ?
WHERE id = ? AND shopid = ? AND status = 1
  AND payment_status = 'requires_payment'
  AND payment_provider = 'stripe'
  AND stripe_payment_intent_id = ?;
```

`persistReplacementPaymentIntent` must lock the order and atomically attach only from the intermediate state:

```sql
UPDATE orders
SET payment_status = 'requires_payment',
    payment_provider = 'stripe',
    stripe_payment_intent_id = ?,
    finished = ?
WHERE id = ? AND shopid = ? AND status = 1
  AND payment_status = 'unpaid'
  AND payment_provider = 'stripe'
  AND stripe_payment_intent_id IS NULL;
```

Then upsert the new `payments` row in the same transaction.

Also expose `recoverCanceledEditPayment({ orderId, shopId, paymentIntentId })`. It opens its own transaction only after an unexpected rollback, locks the same order, verifies that the external intent is the one still referenced, marks its payment row canceled, changes the order to `unpaid`, clears the intent reference and leaves the recorded order content untouched. This recovery is idempotent.

- [ ] **Step 4: Export a reusable existing-order intent generator**

In `c_stripe.js`, extract a builder that does not create a new order:

```js
const buildRegenerateOrderPaymentIntent = ({
  getShopInfo = mGetShopInfo,
  getStripe: getStripeClient = getStripe,
  persistReplacementPaymentIntent: persistReplacement = (
    persistReplacementPaymentIntent
  ),
  publishableKey = envSTRIPEPUBLISHABLEKEY,
  paymentMethodConfigurationId = envSTRIPEPAYMENTMETHODCONFIGURATIONID,
} = {}) => async ({ order, contentRevision }) => {
  const rows = await getShopInfo(order.shopid);
  const shop = rows[0];
  if (!shop || !shop.stripe_account_id || !shop.stripe_charges_enabled) {
    throw new DomainError(
      422,
      "STRIPE_CONNECT_INCOMPLETE",
      "Le restaurant doit connecter Stripe avant d'accepter les paiements.",
    );
  }
  const params = buildDestinationPaymentIntentParams({
    amount: order.subtotal,
    currency: "eur",
    connectedAccountId: shop.stripe_account_id,
    orderId: order.id,
    shopId: order.shopid,
    commissionPercent: shop.stripe_commission_percent,
    paymentMethodConfigurationId,
  });
  const paymentIntent = await getStripeClient().paymentIntents.create(params, {
    idempotencyKey: `order-edit-${order.shopid}-${order.id}-${contentRevision}`,
  });
  const persistence = await persistReplacement({
    orderId: order.id,
    shopId: order.shopid,
    stripe_payment_intent_id: paymentIntent.id,
    amount: order.subtotal,
    amount_cents: toStripeAmount(order.subtotal),
    application_fee_amount: params.application_fee_amount,
    currency: params.currency,
    status: paymentIntent.status,
  });
  if (!persistence.attached) {
    await getStripeClient().paymentIntents.cancel(paymentIntent.id);
    throw new DomainError(409, "ORDER_NOT_EDITABLE", "La commande a changé.");
  }
  return {
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    publishableKey,
  };
};
```

- [ ] **Step 5: Settle Stripe while the edit transaction owns the order lock**

Before opening the transaction, perform a read-only quote so a normal reprice response never touches Stripe. Pass an injected `settlePendingPayment(order)` callback into `updateOrderItems`. Inside `updateOrderItems`, after the order/content/products are locked and every quote, revision and stock validation has passed, execute this sequence:

1. retrieve the current PaymentIntent;
2. if `succeeded`, throw `STRIPE_PAYMENT_ALREADY_SUCCEEDED` so the SQL transaction rolls back, then synchronize it outside the released transaction and return `ORDER_NOT_EDITABLE`;
3. cancel it and require returned status `canceled`;
4. call `stagePaymentReplacement` with the current SQL connection;
5. apply the already-validated content, reservation and stock writes;
6. commit the transaction;
7. call the generator with the new revision.

Holding the order and affected product locks across the Stripe retrieve/cancel call is intentional. The external call occurs only after every expected business rejection, which keeps the lock window bounded to Stripe latency plus deterministic SQL writes.

Return a successful edit with:

```js
{
  ...updated,
  payment_status: "requires_payment",
  payment_refresh: "succeeded",
  payment: regeneratedPayment,
}
```

If generation fails after SQL commit, return HTTP 200 with `payment_status: "unpaid"`, `payment_refresh: "required"`, and `payment_refresh_message`. Never return the old secret.

If a SQL exception occurs after Stripe returned `canceled`, call `recoverCanceledEditPayment` before responding. Return the original edit failure plus `payment_refresh: "required"`; the frontend must reload the unchanged database content and offer regeneration instead of restoring the canceled secret.

- [ ] **Step 6: Add the regeneration route**

Register in `r_stripe.js`:

```js
.post(
  "/stripe/payment-intents/orders/:id/regenerate",
  authentication,
  orderEditing.regenerateOrderPaymentIntent,
)
```

The controller loads the order under `shopid`, requires status `1`, payment `unpaid`, provider `stripe`, revalidates/renews reservations in `m_orderEditing`, then calls the shared generator.

- [ ] **Step 7: Run Stripe, editing and full backend tests**

```powershell
node test/stripe-payment.test.js
node test/order-editing.test.js
npm test
```

Expected: all PASS. The full suite must still cover initial Stripe checkout, cancellation, pay-at-counter, webhook success and refunds.

- [ ] **Step 8: Commit Stripe replacement**

```powershell
git add src/modules/m_payments.js src/modules/m_orderEditing.js src/controllers/c_orderEditing.js src/controllers/c_stripe.js src/routers/r_stripe.js test/order-editing.test.js test/stripe-payment.test.js
git commit -m "feat: refresh stripe payments after order edits"
```

---

### Task 6: Add frontend order-edit helpers and Vuex session

**Frontend files:**
- Create: `helpers/orderEdit.js`
- Create: `store/orderEdit.js`
- Create: `test/order-edit.test.js`
- Modify: `store/users.js`
- Modify: `plugins/axios.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: editable-order API response and current `products/dataProduct`.
- Produces: `isOrderEditable`, `mapEditableOrderToCart`, `buildOrderEditPayload`, `isOrderEditDirty` and Vuex actions `begin`, `save`, `cancel`, `regeneratePayment`.

- [ ] **Step 1: Create failing pure-helper tests**

Create `test/order-edit.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const {
  buildOrderEditPayload,
  isOrderEditable,
  isOrderEditDirty,
  mapEditableOrderToCart,
} = require('../helpers/orderEdit')

const product = {
  id: 10,
  name: 'Menu',
  image: 'menu.webp',
  price: 8,
  customization_steps: [{
    product_step_id: 20,
    name: 'Boisson',
    choices: [{
      product_step_choice_id: 30,
      choice_name: 'Cola',
      extra_price: 1.5,
    }],
  }],
}
const editable = {
  order_id: 42,
  order_number: '0042',
  status: 1,
  payment_status: 'unpaid',
  total: 19,
  content_revision: 'revision-1',
  items: [{
    product_id: 10,
    quantity: 2,
    unit_price: 9.5,
    line_total: 19,
    selected_product_step_choice_ids: [30],
    customization_snapshots: [],
    requires_reconfiguration: false,
  }],
}

assert.strictEqual(isOrderEditable(editable), true)
assert.strictEqual(isOrderEditable({ ...editable, status: 2 }), false)
assert.strictEqual(isOrderEditable({ ...editable, payment_status: 'paid' }), false)

const cart = mapEditableOrderToCart(editable, [product])
assert.strictEqual(cart[0].id, 10)
assert.strictEqual(cart[0].qty, 2)
assert.deepStrictEqual(cart[0].selectedChoiceIds, [30])
assert.strictEqual(cart[0].selections[0].choice_name, 'Cola')
assert.strictEqual(cart[0].subtotal, 19)

assert.deepStrictEqual(buildOrderEditPayload({
  contentRevision: 'revision-1',
  expectedTotal: 19,
  cart,
}), {
  content_revision: 'revision-1',
  expected_total: 19,
  items: [{
    product_id: 10,
    quantity: 2,
    selected_product_step_choice_ids: [30],
  }],
})
assert.strictEqual(isOrderEditDirty(cart, cart), false)
assert.strictEqual(isOrderEditDirty(cart, [{ ...cart[0], qty: 3 }]), true)

const usersSource = fs.readFileSync(require.resolve('../store/users.js'), 'utf8')
const axiosSource = fs.readFileSync(require.resolve('../plugins/axios.js'), 'utf8')
assert.ok(usersSource.includes("orderEdit/cancel"))
assert.ok(axiosSource.includes("orderEdit/cancel"))

console.log('orderEdit tests passed')
```

- [ ] **Step 2: Register and run the failing frontend test**

Add `node test/order-edit.test.js` before `test/orders-sent.test.js` in the frontend `test` script.

```powershell
node test/order-edit.test.js
```

Expected: FAIL with `Cannot find module '../helpers/orderEdit'`.

- [ ] **Step 3: Implement the pure helper**

Create `helpers/orderEdit.js`. Reuse `buildCheckoutItems` and `buildConfigurationSignature` from `helpers/customizations`.

```js
const {
  buildCheckoutItems,
  buildConfigurationSignature,
} = require('./customizations')
const { roundPrice } = require('./price-functions')

const isOrderEditable = (order = {}) =>
  Number(order.status) === 1 &&
  ['unpaid', 'requires_payment'].includes(String(order.payment_status))

const selectedObjects = (product, selectedIds) => {
  const selected = new Set((selectedIds || []).map(Number))
  const result = []
  for (const step of product.customization_steps || []) {
    for (const choice of step.choices || []) {
      if (!selected.has(Number(choice.product_step_choice_id))) continue
      result.push({
        product_step_id: Number(step.product_step_id),
        product_step_choice_id: Number(choice.product_step_choice_id),
        step_name: step.name,
        choice_name: choice.choice_name || choice.name,
        extra_price: Number(choice.extra_price || 0),
        choice_type: choice.choice_type,
        linked_product_id: choice.linked_product_id || null,
      })
    }
  }
  return result
}

const mapEditableOrderToCart = (editable, products) =>
  editable.items.map((item) => {
    const product = products.find(
      (candidate) => Number(candidate.id) === Number(item.product_id)
    )
    if (!product) {
      throw Object.assign(new Error('Produit de la commande introuvable.'), {
        code: 'PRODUCT_NOT_FOUND',
        product_id: item.product_id,
      })
    }
    const selectedChoiceIds = (
      item.selected_product_step_choice_ids || []
    ).map(Number)
    const currentSelections = selectedObjects(product, selectedChoiceIds)
    const snapshotSelections = (item.customization_snapshots || []).map(
      (snapshot) => ({
        product_step_id: Number(snapshot.product_customization_step_id || 0),
        product_step_choice_id:
          snapshot.product_customization_step_choice_id == null
            ? null
            : Number(snapshot.product_customization_step_choice_id),
        step_name: snapshot.step_name,
        choice_name: snapshot.choice_name,
        extra_price: Number(snapshot.unit_extra_price || 0),
        choice_type: snapshot.choice_type,
        linked_product_id: snapshot.linked_product_id || null,
      })
    )
    const selections = currentSelections.length === selectedChoiceIds.length
      ? currentSelections
      : snapshotSelections
    return {
      ...product,
      selectedChoiceIds,
      selections,
      customizationList: selections.map((selection) => ({
        ...selection,
        name: selection.choice_name,
        price: selection.extra_price,
      })),
      configurationSignature: buildConfigurationSignature(
        product.id,
        selectedChoiceIds
      ),
      qty: Number(item.quantity),
      price: roundPrice(item.unit_price),
      subtotal: roundPrice(item.line_total),
      requiresReconfiguration: item.requires_reconfiguration === true,
    }
  })

const buildOrderEditPayload = ({
  contentRevision,
  expectedTotal,
  cart,
}) => ({
  content_revision: contentRevision,
  expected_total: roundPrice(expectedTotal),
  items: buildCheckoutItems(cart),
})

const canonicalCart = (cart) => JSON.stringify(buildCheckoutItems(cart || []))
const isOrderEditDirty = (originalCart, currentCart) =>
  canonicalCart(originalCart) !== canonicalCart(currentCart)

module.exports = {
  buildOrderEditPayload,
  isOrderEditable,
  isOrderEditDirty,
  mapEditableOrderToCart,
}
```

- [ ] **Step 4: Implement `store/orderEdit.js`**

Use Vuex Easy Access like the existing stores. State fields:

```js
export const state = () => ({
  active: false,
  orderId: null,
  orderNumber: '',
  contentRevision: null,
  originalCart: [],
  dirty: false,
  paymentProvider: null,
  paymentStatus: null,
  paymentRefresh: null,
  payment: null,
  loading: false,
  message: '',
})
```

Use these helpers and actions. They call the exact endpoints and return `{ ok, data, error }` consistently:

```js
import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import {
  buildOrderEditPayload,
  isOrderEditDirty,
  mapEditableOrderToCart,
} from '@/helpers/orderEdit'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})
const clone = (value) => JSON.parse(JSON.stringify(value))
const apiError = (error) => {
  const response = error && error.response && error.response.data
  const data = response && response.data && typeof response.data === 'object'
    ? response.data
    : {}
  return {
    status: error && error.response ? error.response.status : null,
    message: (response && response.message) || error.message ||
      'Impossible de modifier la commande.',
    ...data,
  }
}

export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]

const clear = (dispatch) => {
  dispatch('set/active', false)
  dispatch('set/orderId', null)
  dispatch('set/orderNumber', '')
  dispatch('set/contentRevision', null)
  dispatch('set/originalCart', [])
  dispatch('set/dirty', false)
  dispatch('set/paymentProvider', null)
  dispatch('set/paymentStatus', null)
  dispatch('set/paymentRefresh', null)
  dispatch('set/payment', null)
  dispatch('set/message', '')
}

export const actions = {
  begin({ dispatch }, { editable, cart }) {
    const originalCart = clone(cart)
    dispatch('set/active', true)
    dispatch('set/orderId', Number(editable.order_id))
    dispatch('set/orderNumber', String(editable.order_number))
    dispatch('set/contentRevision', editable.content_revision)
    dispatch('set/originalCart', originalCart)
    dispatch('set/dirty', false)
    dispatch('set/paymentProvider', editable.payment_provider || null)
    dispatch('set/paymentStatus', editable.payment_status)
    dispatch('set/paymentRefresh', null)
    dispatch('set/payment', null)
    dispatch('cart/setTocart', clone(cart), { root: true })
    dispatch(
      'cart/setTotal',
      Number(editable.total),
      { root: true }
    )
    dispatch(
      'cart/setIndex',
      cart.reduce((sum, line) => sum + Number(line.qty || 0), 0),
      { root: true }
    )
    return { ok: true, data: editable, error: null }
  },

  async load({ dispatch, rootState }, orderId) {
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.get(
        `/baseurl/api/v1/orders/${orderId}/edit`,
        { headers: authHeaders() }
      )
      if (!Array.isArray(rootState.products.dataProduct) ||
        rootState.products.dataProduct.length === 0) {
        await dispatch('products/getProducts', null, { root: true })
      }
      const editable = response.data.data
      const cart = mapEditableOrderToCart(
        editable,
        rootState.products.dataProduct || []
      )
      return dispatch('begin', { editable, cart })
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      dispatch('notifications/error', normalized.message, { root: true })
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  updateDirty({ dispatch, state }, cart) {
    dispatch('set/dirty', isOrderEditDirty(state.originalCart, cart))
  },

  async save({ dispatch, state, rootState }) {
    const cart = Array.isArray(rootState.cart.dataCart)
      ? rootState.cart.dataCart
      : []
    const payload = buildOrderEditPayload({
      contentRevision: state.contentRevision,
      expectedTotal: rootState.cart.totalCart,
      cart,
    })
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.patch(
        `/baseurl/api/v1/orders/${state.orderId}/items`,
        payload,
        { headers: authHeaders() }
      )
      const data = response.data.data
      dispatch('set/contentRevision', data.content_revision)
      dispatch('set/originalCart', clone(cart))
      dispatch('set/dirty', false)
      dispatch('set/paymentStatus', data.payment_status)
      dispatch('set/paymentRefresh', data.payment_refresh || null)
      dispatch('set/payment', data.payment || null)
      return { ok: true, data, error: null }
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      if (normalized.payment_refresh) {
        dispatch('set/paymentRefresh', normalized.payment_refresh)
      }
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  async regeneratePayment({ dispatch, state }) {
    dispatch('set/loading', true)
    try {
      const response = await this.$axios.post(
        `/baseurl/api/v1/stripe/payment-intents/orders/${state.orderId}/regenerate`,
        {},
        { headers: authHeaders() }
      )
      dispatch('set/paymentRefresh', 'succeeded')
      dispatch('set/paymentStatus', 'requires_payment')
      dispatch('set/payment', response.data.data)
      return { ok: true, data: response.data.data, error: null }
    } catch (error) {
      const normalized = apiError(error)
      dispatch('set/message', normalized.message)
      return { ok: false, data: null, error: normalized }
    } finally {
      dispatch('set/loading', false)
    }
  },

  cancel({ dispatch, state }) {
    const clearCart = state.active === true
    clear(dispatch)
    if (clearCart) {
      dispatch('cart/setTocart', null, { root: true })
      dispatch('cart/setTotal', 0, { root: true })
      dispatch('cart/setIndex', 0, { root: true })
    }
    return { ok: true, data: null, error: null }
  },

  complete({ dispatch }) {
    return dispatch('cancel')
  },
}
```

`load` never clears an unsafe checkout attempt itself; the Details page owns that guard before dispatching it.

In `users.postLogout`, dispatch `orderEdit/cancel` before `clearAuthentication`. In `plugins/axios.js`, dispatch the same action inside `clearStoreAuth`. Because `cancel` only clears the cart when an edit session is active, this does not erase the separately protected checkout attempt during an authentication redirect.

- [ ] **Step 5: Run helpers and full frontend tests**

```powershell
node test/order-edit.test.js
npm test
```

Expected: helper tests and existing frontend suite PASS.

- [ ] **Step 6: Commit the frontend state layer**

```powershell
git add helpers/orderEdit.js store/orderEdit.js store/users.js plugins/axios.js test/order-edit.test.js package.json
git commit -m "feat: add order edit session state"
```

---

### Task 7: Start editing from the Details page

**Frontend files:**
- Modify: `pages/orders/detail/_id.vue`
- Modify: `store/orders.js`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: `orderEdit/load(orderId)`, cart/checkout state and `isOrderEditable`.
- Produces: visible **Modifier la commande** action and safe navigation to `/menus`.

- [ ] **Step 1: Activate failing Details-page assertions**

Assert the source contains the label, eligibility helper and order-edit dispatch:

```js
const detailSource = fs.readFileSync(
  require.resolve('../pages/orders/detail/_id.vue'),
  'utf8'
)
assert.ok(detailSource.includes('Modifier la commande'))
assert.ok(detailSource.includes("orderEdit/load"))
assert.ok(detailSource.includes('canEditOrder'))
assert.ok(detailSource.includes('replaceCartDialog'))
```

- [ ] **Step 2: Run and confirm the source contract fails**

```powershell
node test/order-edit.test.js
```

Expected: FAIL on `Modifier la commande`.

- [ ] **Step 3: Add eligibility and the action area**

Import `isOrderEditable` and add:

```js
computed: {
  orderSummary() {
    return this.detailOrder[0] || null
  },
  canEditOrder() {
    return isOrderEditable(this.orderSummary || {})
  },
  hasLocalCart() {
    const cart = this.$store.get('cart/dataCart')
    return Array.isArray(cart) && cart.length > 0
  },
  hasUnsafeCheckoutAttempt() {
    const status = this.$store.get('cart/clientOrderStatus') || 'idle'
    return Boolean(this.$store.get('cart/clientOrderOrderId')) ||
      ['pending', 'uncertain', 'stripe_prepared'].includes(status)
  },
}
```

Place a primary button beside Retour. If `hasUnsafeCheckoutAttempt`, show an error notification and route to `/cart`. If only `hasLocalCart`, open a Vuetify confirmation dialog. Confirming calls:

```js
async beginOrderEdit() {
  this.editLoading = true
  const result = await this.$store.dispatch('orderEdit/load', this.id)
  this.editLoading = false
  if (!result || !result.ok) return
  this.$router.push('/menus')
}
```

- [ ] **Step 4: Make detail loading return structured failure**

In `store/orders.js`, add a catch to `getDetailOrder` which clears stale details, stores the server message and returns `false`. Do not dereference `error.response` without optional chaining.

- [ ] **Step 5: Run frontend tests and lint the touched files**

```powershell
node test/order-edit.test.js
npm test
npx eslint pages/orders/detail/_id.vue store/orders.js helpers/orderEdit.js store/orderEdit.js
```

Expected: tests PASS and touched-file lint exits `0`.

- [ ] **Step 6: Commit the entry point**

```powershell
git add pages/orders/detail/_id.vue store/orders.js test/order-edit.test.js
git commit -m "feat: start order editing from details"
```

---

### Task 8: Reuse Menus and Cart as the editing workspace

**Frontend files:**
- Create: `components/orders/OrderEditBanner.vue`
- Modify: `pages/menus.vue`
- Modify: `pages/cart.vue`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: active `orderEdit` state, existing cart helpers, PATCH result and Stripe replacement payload.
- Produces: catalogue/panier editing UX, unsaved-change guard, price confirmation, refreshed QR and return to Details.

- [ ] **Step 1: Add failing Menus/Cart source contracts**

```js
const menusSource = fs.readFileSync(require.resolve('../pages/menus.vue'), 'utf8')
const cartSource = fs.readFileSync(require.resolve('../pages/cart.vue'), 'utf8')
const bannerSource = fs.readFileSync(
  require.resolve('../components/orders/OrderEditBanner.vue'),
  'utf8'
)
assert.ok(menusSource.includes('OrderEditBanner'))
assert.ok(menusSource.includes('isOrderEditActive'))
assert.ok(cartSource.includes('Enregistrer les modifications'))
assert.ok(cartSource.includes("orderEdit/save"))
assert.ok(cartSource.includes("orderEdit/regeneratePayment"))
assert.ok(bannerSource.includes('Modification de la commande'))
```

- [ ] **Step 2: Run and confirm the missing banner failure**

```powershell
node test/order-edit.test.js
```

Expected: FAIL because `OrderEditBanner.vue` does not exist.

- [ ] **Step 3: Create the shared banner**

Create `components/orders/OrderEditBanner.vue`:

```vue
<template>
  <v-alert type="info" outlined dense class="mb-4">
    <div class="d-flex align-center flex-wrap">
      <strong>Modification de la commande #{{ orderNumber }}</strong>
      <v-spacer />
      <v-btn text small class="text-none" @click="$emit('cancel')">
        Annuler la modification
      </v-btn>
    </div>
  </v-alert>
</template>

<script>
export default {
  props: {
    orderNumber: {
      type: String,
      required: true,
    },
  },
}
</script>
```

- [ ] **Step 4: Preserve and extend the edit cart in Menus**

Add computed `isOrderEditActive` and `orderEditNumber`. In `mounted`, when editing is active, clone `cart/dataCart` instead of resetting it; still load products and shop data. Add the banner above the catalogue.

Change the kitchen guard only for a new order:

```js
if (this.isKitchenClosed && !this.isOrderEditActive) {
  this.showKitchenClosedSnackbar()
  return
}
```

In `totalPrice` and `indexCart`, dispatch `orderEdit/updateDirty` after synchronizing the cart. `btnOrder` continues to route to `/cart`. `btnCancel` asks for confirmation, captures the order ID, calls `orderEdit/cancel`, and routes to `/orders/detail/<orderId>`.

- [ ] **Step 5: Switch Cart's primary action in edit mode**

Add these computed values:

```js
isOrderEditActive() {
  return this.$store.get('orderEdit/active') === true
},
orderEditId() {
  return this.$store.get('orderEdit/orderId')
},
orderEditDirty() {
  return this.$store.get('orderEdit/dirty') === true
},
isStripeOrderEdit() {
  return this.isOrderEditActive &&
    this.$store.get('orderEdit/paymentProvider') === 'stripe'
},
showStripePaymentPanel() {
  return (this.isStripeCheckout || this.isStripeOrderEdit) &&
    this.stripePaymentReady
},
hasReconfigurationRequired() {
  return (this.dataCart || []).some(
    (line) => line.requiresReconfiguration === true
  )
},
primaryActionDisabled() {
  if (this.isOrderEditActive) {
    return !Array.isArray(this.dataCart) ||
      this.dataCart.length === 0 ||
      this.hasReconfigurationRequired ||
      this.loadingBtn
  }
  return !this.isValue || this.loadingBtn || !this.checkoutPayloadCanStart
},
```

Return `Enregistrer les modifications` and `mdi-content-save` from the existing button label/icon computed properties while edit mode is active. Hide client/table/phone/note/payment inputs in edit mode and show the immutable order number instead. Change the form submit handler to:

```js
async submitPrimaryAction() {
  if (this.isOrderEditActive) {
    await this.saveOrderEdit()
    return
  }
  await this.paymentBtn()
}
```

Use `showStripePaymentPanel` instead of `isStripeCheckout && stripePaymentReady` on the Stripe panel. After an edited Stripe order has been saved and mounted, hide the footer Save button and make the panel confirmation button call `confirmStripePayment` directly; this avoids routing the edited order through initial checkout preparation again.

Show a warning above every line with `requiresReconfiguration` and disable Save while one exists. In `confirmCartCustomization`, set `requiresReconfiguration: false` on the edited line after the wizard returns a valid configuration.

- [ ] **Step 6: Handle save, repricing and targeted customization errors**

Implement:

```js
async saveOrderEdit() {
  this.loadingBtn = true
  const result = await this.$store.dispatch('orderEdit/save')
  this.loadingBtn = false
  if (!result || !result.ok) {
    const error = result && result.error
    if (error && error.code === 'ORDER_REPRICE_REQUIRED' && error.server_quote) {
      this.pendingRepriceFlow = 'order-edit'
      this.syncCartState(applyServerQuoteToCart(this.dataCart, error.server_quote))
      this.repriceDialog = true
      return
    }
    if (error && ['ORDER_NOT_EDITABLE', 'ORDER_EDIT_CONFLICT'].includes(error.code)) {
      this.allowRouteLeave = true
      const orderId = this.orderEditId
      await this.$store.dispatch('orderEdit/cancel')
      this.$router.push(`/orders/detail/${orderId}`)
      return
    }
    const target = findCartTargetForCheckoutError(this.dataCart, error)
    if (target) {
      this.editCartLine(target.lineIndex, target.productStepId, error.message)
    }
    this.checkoutErrorMessage = error && error.message
      ? error.message
      : 'Impossible de modifier la commande.'
    return
  }
  if (result.data.payment_refresh === 'succeeded') {
    await this.mountStripePaymentElement(result.data.payment)
    return
  }
  if (result.data.payment_refresh === 'required') {
    this.checkoutErrorMessage = result.data.payment_refresh_message
    return
  }
  this.allowRouteLeave = true
  const orderId = this.orderEditId
  await this.$store.dispatch('orderEdit/complete')
  this.$router.push(`/orders/detail/${orderId}`)
}
```

Extend `confirmReprice` with `order-edit` so it reruns `orderEdit/save` after the user accepts the new total.

At the end of Cart's existing `syncCartState`, dispatch `orderEdit/updateDirty` when edit mode is active. This covers quantity removal, customization replacement and server quote application through one path:

```js
if (this.isOrderEditActive) {
  this.$store.dispatch('orderEdit/updateDirty', nextCart || [])
}
```

- [ ] **Step 7: Add Stripe refresh and navigation guards**

Extract the existing Stripe Element mounting code into this method and call it both for initial checkout and an edited order:

```js
async mountStripePaymentElement(payment) {
  if (!payment || !payment.clientSecret || !payment.publishableKey) {
    throw new Error('Données du nouveau paiement Stripe incomplètes.')
  }
  this.resetStripePaymentElement()
  await this.$nextTick()
  this.stripe = await loadStripe(payment.publishableKey)
  if (!this.stripe) throw new Error('Stripe est indisponible.')
  this.stripeElements = this.stripe.elements({
    clientSecret: payment.clientSecret,
  })
  const paymentElement = this.stripeElements.create('payment')
  paymentElement.mount(this.$refs.stripePaymentElement)
  this.stripePaymentReady = true
  this.stripePaymentIntentId = payment.paymentIntentId
  this.stripeOrderId = payment.orderId
}

async regenerateEditedPayment() {
  const result = await this.$store.dispatch('orderEdit/regeneratePayment')
  if (!result || !result.ok) {
    this.checkoutErrorMessage = result && result.error
      ? result.error.message
      : 'Impossible de régénérer le paiement.'
    return
  }
  await this.mountStripePaymentElement(result.data)
}
```

Add a **Régénérer le paiement** button when `orderEdit/paymentRefresh === 'required'`; it calls `regenerateEditedPayment`.

At the start of `guardCheckoutConfirmation`, allow the edited order only when its returned intent is mounted for the same order:

```js
if (this.isOrderEditActive) {
  return this.stripePaymentReady &&
    Number(this.stripeOrderId) === Number(this.orderEditId)
}
```

After `confirmStripePayment` succeeds in edit mode, capture `orderEditId`, dispatch `orderEdit/complete`, set `allowRouteLeave` and return to `/orders/detail/<id>`. The standard checkout branch keeps its existing `/ordersStatuses` behavior.

At the start of `beforeRouteLeave`, guard unsaved edits:

```js
if (this.isOrderEditActive && this.orderEditDirty && !this.allowRouteLeave) {
  next(window.confirm('Quitter sans enregistrer les modifications ?'))
  return
}
```

`cancelCart` in edit mode confirms, captures `orderEditId`, clears the edit session, and returns to that order's Details. It must not call checkout abandonment when no checkout attempt belongs to this edit.

- [ ] **Step 8: Run frontend tests, touched-file lint and local build**

```powershell
node test/order-edit.test.js
npm test
npx eslint components/orders/OrderEditBanner.vue pages/menus.vue pages/cart.vue helpers/orderEdit.js store/orderEdit.js pages/orders/detail/_id.vue store/orders.js
npm run build-local
```

Expected: tests PASS, touched-file lint exits `0`, and Nuxt build ends with `Compiled successfully`.

- [ ] **Step 9: Commit the editing workspace**

```powershell
git add components/orders/OrderEditBanner.vue pages/menus.vue pages/cart.vue test/order-edit.test.js
git commit -m "feat: edit active orders through the cart"
```

---

### Task 9: Cross-repository verification and manual smoke test

**Files:**
- Verify only; no source file is expected to change.

**Interfaces:**
- Consumes: completed backend API and frontend edit session.
- Produces: evidence that normal checkout and order editing both work.

- [ ] **Step 1: Verify both worktrees are clean and on the feature branch**

```powershell
git -C 'C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos\.worktrees\product-customization-v2' status --short
git -C 'C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app\.worktrees\product-customization-v2' status --short
git -C 'C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos\.worktrees\product-customization-v2' branch --show-current
git -C 'C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app\.worktrees\product-customization-v2' branch --show-current
```

Expected: both statuses are empty and both branches are `codex/product-customization-v2`.

- [ ] **Step 2: Run the full backend suite on Node 20**

```powershell
Set-Location 'C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos\.worktrees\product-customization-v2'
npm test
```

Expected: all backend contract suites PASS with exit code `0`.

- [ ] **Step 3: Run the full frontend suite and build on Node 18**

```powershell
Set-Location 'C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app\.worktrees\product-customization-v2'
npm test
npm run build-local
```

Expected: all frontend tests PASS and Nuxt compiles successfully.

- [ ] **Step 4: Start backend and frontend for the smoke test**

Use the existing feature ports to avoid disturbing other workspaces:

```powershell
Set-Location 'C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos\.worktrees\product-customization-v2'
$env:PORT='5005'
npm run startAndWatch
```

In another terminal:

```powershell
Set-Location 'C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app\.worktrees\product-customization-v2'
$env:PORT='8083'
npm run dev
```

Expected: backend health responds on port `5005` and Nuxt is available on `http://localhost:8083`.

- [ ] **Step 5: Execute the non-Stripe acceptance path**

1. Create an unpaid order with a parent product and a linked-product supplement.
2. Open Orders → Details and verify **Modifier la commande** is visible.
3. Start editing, change the supplement, increase quantity and add a product.
4. Save and verify the same order ID/number is shown.
5. Compare product and linked-product stocks to the expected deltas.
6. Start editing again, remove the added product, cancel locally and verify server details did not change.

Expected: all six observations match the specification.

- [ ] **Step 6: Execute lock and conflict paths**

1. Open the same order in two sessions, save session A, then save session B.
2. Verify session B receives a conflict and reloads Details.
3. Start editing another order, move it to preparation from another session, then save.
4. Verify the save is refused and the Edit button disappears.
5. Encase a pending order in another session and verify the same refusal.

Expected: no stale edit overwrites a newer content, preparation or payment.

- [ ] **Step 7: Execute Stripe replacement paths in test mode**

1. Prepare a Stripe order without paying it.
2. Edit its content and save.
3. Verify the old PaymentIntent is canceled and the new QR uses the updated amount.
4. Simulate PaymentIntent creation failure and verify the command stays modified/unpaid with **Régénérer le paiement**.
5. Retry regeneration and verify one new PaymentIntent is attached.

Expected: no active PaymentIntent has the old amount and no edit is allowed after Stripe reports success.

- [ ] **Step 8: Review final diffs against the design**

```powershell
git -C 'C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos\.worktrees\product-customization-v2' diff HEAD~5 --stat
git -C 'C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app\.worktrees\product-customization-v2' diff HEAD~3 --stat
```

Expected: changes are limited to the files listed in this plan, plus narrowly justified test adjustments discovered during implementation.
