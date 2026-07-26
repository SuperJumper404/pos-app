# Order Editing and Complementary Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de modifier atomiquement une commande en attente et non encaissée, d'annuler une commande vidée, et de démarrer une nouvelle commande complémentaire lorsqu'une commande Stripe est déjà payée.

**Architecture:** Le backend expose une lecture éditable et une écriture de contenu dédiées, partage le devis serveur avec le checkout, puis applique prix, instantanés, réservations et deltas de stock dans une transaction. Le frontend utilise un store `orderEdit` isolé, mais réemploie le catalogue, le panier et l'assistant existants. Une commande complémentaire Stripe reste un checkout normal avec un panier vide et le contexte client/table recopié.

**Tech Stack:** Express, Node.js, MySQL transactions, Stripe SDK, Nuxt 2, Vue 2, Vuex Easy Access, Axios, Vuetify, tests Node `assert`.

## Global Constraints

- Frontend : `C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app` sur `product-customisation`.
- Backend : `C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos` sur `product-customisation`.
- Ne pas ajouter de dépendance npm.
- Une commande existante est modifiable seulement avec `status = 1` et `payment_status` dans `unpaid` ou `requires_payment`.
- Une commande modifiée conserve identifiant, numéro, client, table, téléphone, note, moyen de paiement et statut.
- Un tableau `items` vide annule la commande et restitue tous les stocks concernés.
- Une commande Stripe payée reste immuable ; la commande complémentaire est une nouvelle commande normale.
- Le frontend ne décide jamais du prix, du stock ou de l'éligibilité finale.
- Tous les accès commande sont filtrés par `req.shopid` et l'opérateur vient du jeton.
- Les transitions de préparation, paiement et modification verrouillent la même ligne `orders`.
- Les tests doivent rester ciblés ; ne pas lancer de build long avant la vérification finale.

---

## File Map

### Backend

- Create `src/modules/m_orderQuote.js`: devis partagé et besoins de stock.
- Create `src/modules/m_orderEditing.js`: projection éditable, révision et transaction de remplacement/annulation.
- Create `src/controllers/c_orderEditing.js`: contrôleurs GET/PATCH et orchestration Stripe.
- Create `src/modules/m_orderTransitions.js`: transition de statut sérialisée.
- Modify `src/modules/m_checkout.js`: consommer le devis partagé.
- Modify `src/modules/m_orders.js`: détail actif filtré par boutique.
- Modify `src/modules/m_payments.js`: paiement Stripe de remplacement.
- Modify `src/controllers/c_orders.js`: détail par boutique et transition sérialisée.
- Modify `src/controllers/c_stripe.js`: générateur de paiement pour commande existante.
- Modify `src/routers/r_orders.js`: routes d'édition.
- Modify `src/routers/r_stripe.js`: reprise du paiement de remplacement.
- Create `db/migrations/20260725090000_order_edit_replacement_attempt.sql`: jeton durable de tentative Stripe.
- Create `test/order-editing.test.js`: contrats métier et transactionnels.
- Modify `test/checkout-contract.test.js`, `test/stripe-payment.test.js`, `package.json`.

### Frontend

- Create `helpers/orderEdit.js`: éligibilité, transformation et payload.
- Create `store/orderEdit.js`: session d'édition et commande complémentaire.
- Create `components/orders/OrderEditBanner.vue`: bandeau partagé.
- Modify `pages/orders/detail/_id.vue`: actions de modification et complément.
- Modify `pages/menus.vue`: conserver le panier et afficher le contexte.
- Modify `pages/cart.vue`: enregistrer/annuler une modification.
- Modify `store/orders.js`, `store/users.js`, `plugins/axios.js`.
- Create `test/order-edit.test.js` et modifier `package.json`.

---

### Task 1: Devis serveur partagé

**Files:**
- Create: `../express-pos/src/modules/m_orderQuote.js`
- Modify: `../express-pos/src/modules/m_checkout.js`
- Modify: `../express-pos/test/checkout-contract.test.js`

**Interfaces:**
- Consumes: `getResolvedProductConfigurations`, `validateConfiguredItem`, `buildStockRequirements`.
- Produces: `quoteOrderItems({ shopId, items, connection }) -> { resolvedItems, total, serverQuote, requirements }`.

- [ ] Ajouter un test rouge qui appelle `buildOrderQuoteModule()` avec un menu à 8 €, une boisson liée à +1,50 €, quantité 2, puis exige `total === 19` et les besoins `[[10, 2], [11, 2]]`.
- [ ] Exécuter `node test/checkout-contract.test.js` depuis `../express-pos` et vérifier l'échec `Cannot find module '../src/modules/m_orderQuote'`.
- [ ] Créer `m_orderQuote.js` avec cette frontière publique :

```js
const buildOrderQuoteModule = ({
  repository,
  getResolvedProductConfigurations,
  validateConfiguredItem,
  buildStockRequirements,
} = {}) => ({
  quoteOrderItems: async ({ shopId, items, connection }) => {
    // Charge uniquement les produits de shopId, valide les choix actuels,
    // recalcule unitPrice/lineTotal et retourne les besoins agrégés.
  },
});

module.exports = { buildOrderQuoteModule, quoteOrderItems };
```

- [ ] Remplacer dans `m_checkout.js` le devis dupliqué par `quoteOrderItems`, en conservant le contrat actuel du checkout.
- [ ] Relancer `node test/checkout-contract.test.js` et vérifier le passage du checkout normal et du devis partagé.
- [ ] Commit backend : `feat: share order quote validation`.

### Task 2: Lecture éditable et règle d'éligibilité

**Files:**
- Create: `../express-pos/src/modules/m_orderEditing.js`
- Create: `../express-pos/src/controllers/c_orderEditing.js`
- Modify: `../express-pos/src/routers/r_orders.js`
- Modify: `../express-pos/src/modules/m_orders.js`
- Create: `../express-pos/test/order-editing.test.js`

**Interfaces:**
- Produces: `isOrderEditable(order)`, `buildContentRevision(order, items)`, `getEditableOrder({ orderId, shopId })`.
- Endpoint: `GET /api/v1/orders/:id/edit`.

- [ ] Écrire des tests rouges couvrant `status = 1 + unpaid`, `status = 1 + requires_payment`, refus `paid`, refus `status = 2`, et isolation par boutique.
- [ ] Exécuter `node test/order-editing.test.js` et vérifier l'échec sur le module absent.
- [ ] Implémenter la règle exacte :

```js
const EDITABLE_PAYMENT_STATUSES = new Set(["unpaid", "requires_payment"]);
const isOrderEditable = (order = {}) =>
  Number(order.status) === 1
  && EDITABLE_PAYMENT_STATUSES.has(String(order.payment_status));
```

- [ ] Construire une révision SHA-256 déterministe à partir des détails ordonnés, quantités et identifiants de choix.
- [ ] Retourner les IDs contextuels `product_customization_step_choice_id`, les instantanés historiques et `requires_reconfiguration`.
- [ ] Ajouter `GET /orders/:id/edit`, authentifié et filtré par `req.shopid`, avec code `ORDER_NOT_EDITABLE` en 422.
- [ ] Corriger le détail actif existant pour recevoir `shopid` sans changer sa forme de réponse.
- [ ] Exécuter `node test/order-editing.test.js` et les tests de personnalisation backend.
- [ ] Commit backend : `feat: expose editable order content`.

### Task 3: Remplacement transactionnel et annulation par panier vide

**Files:**
- Modify: `../express-pos/src/modules/m_orderEditing.js`
- Modify: `../express-pos/src/controllers/c_orderEditing.js`
- Modify: `../express-pos/src/routers/r_orders.js`
- Modify: `../express-pos/test/order-editing.test.js`

**Interfaces:**
- Produces: `amendOrder({ orderId, shopId, operatorId, contentRevision, expectedTotal, items })`.
- Endpoint: `PATCH /api/v1/orders/:id/items`.

- [ ] Ajouter des tests rouges pour ajout/retrait de produit, quantité, remplacement de choix, conflit de révision, nouveau prix, rupture de stock et rollback.
- [ ] Ajouter un test rouge où `items: []` exige `status = 4`, restitution de tous les besoins et suppression cohérente des détails/instantanés.
- [ ] Exécuter `node test/order-editing.test.js` et confirmer les échecs transactionnels.
- [ ] Implémenter une transaction qui verrouille dans cet ordre : commande, détails, réservations, puis produits triés par ID.
- [ ] Recalculer le devis serveur, comparer `expected_total`, calculer `newRequirements - oldRequirements`, puis appliquer les deltas de stock parents et liés.
- [ ] Remplacer les détails et instantanés seulement après validation complète ; mettre à jour `orders.subtotal` et les réservations.
- [ ] Pour `items.length === 0`, restituer les anciens besoins, passer `status = 4`, terminer les réservations et retourner `{ canceled: true }`.
- [ ] Ajouter `PATCH /orders/:id/items` sans accepter de champ client, table, paiement, statut ou prix.
- [ ] Vérifier les codes `ORDER_EDIT_CONFLICT`, `ORDER_REPRICE_REQUIRED`, `INSUFFICIENT_STOCK` et `ORDER_RECONFIGURATION_REQUIRED`.
- [ ] Exécuter `node test/order-editing.test.js` puis `node test/checkout-contract.test.js`.
- [ ] Commit backend : `feat: amend pending order contents`.

### Task 4: Sérialiser préparation et paiement

**Files:**
- Create: `../express-pos/src/modules/m_orderTransitions.js`
- Modify: `../express-pos/src/controllers/c_orders.js`
- Modify: `../express-pos/src/modules/m_payments.js`
- Modify: `../express-pos/test/order-editing.test.js`
- Modify: `../express-pos/test/stripe-payment.test.js`

**Interfaces:**
- Produces: `transitionOrderStatus({ orderId, shopId, nextStatus, operator })` avec verrou `FOR UPDATE`.

- [ ] Écrire des tests rouges pour les courses édition/préparation et édition/encaissement.
- [ ] Implémenter `transitionOrderStatus` dans une transaction utilisant la même ligne verrouillée que `amendOrder`.
- [ ] Faire consommer cette fonction par le contrôleur de statut sans élargir les transitions autorisées.
- [ ] Verrouiller également la commande avant finalisation de paiement/réservation dans `m_payments.js`.
- [ ] Exécuter `node test/order-editing.test.js` et `node test/stripe-payment.test.js`.
- [ ] Commit backend : `fix: serialize order edit transitions`.

### Task 5: Remplacer le paiement Stripe encore en attente

**Files:**
- Modify: `../express-pos/src/controllers/c_orderEditing.js`
- Modify: `../express-pos/src/controllers/c_stripe.js`
- Modify: `../express-pos/src/modules/m_payments.js`
- Modify: `../express-pos/src/routers/r_stripe.js`
- Create: `../express-pos/db/migrations/20260725090000_order_edit_replacement_attempt.sql`
- Modify: `../express-pos/test/order-editing.test.js`
- Modify: `../express-pos/test/stripe-payment.test.js`

**Interfaces:**
- Produces: `POST /stripe/orders/:id/replacement-payment` et `payment_refresh` dans la réponse d'édition.

- [ ] Écrire les tests rouges : paiement Stripe déjà réussi bloque l'édition ; intent non payé annulé ; nouvel intent au nouveau montant ; échec après SQL retourne `payment_refresh: "required"` ; reprise idempotente.
- [ ] Ajouter une colonne nullable `stripe_replacement_attempt_token` avec migration réversible.
- [ ] Avant l'édition SQL, synchroniser Stripe et annuler l'ancien PaymentIntent s'il n'est pas terminal.
- [ ] Après commit SQL, créer un nouvel intent avec clé d'idempotence `order-edit:<shopId>:<orderId>:<revision>` et attacher seulement le jeton de tentative courant.
- [ ] Exposer une route de reprise qui refuse les jetons obsolètes et ne recrée pas un paiement déjà attaché.
- [ ] Exécuter les tests Stripe, édition et migration ciblés.
- [ ] Commit backend : `feat: refresh stripe payment after order edit`.

### Task 6: Helper et session frontend d'édition

**Files:**
- Create: `helpers/orderEdit.js`
- Create: `store/orderEdit.js`
- Create: `test/order-edit.test.js`
- Modify: `store/users.js`
- Modify: `plugins/axios.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `canEditOrder`, `canStartComplementaryOrder`, `editableOrderToCart`, `cartToOrderEditPayload`, store actions `begin`, `save`, `cancel`, `retryPayment`.

- [ ] Écrire les tests rouges pour éligibilité, transformation des choix, payload sans prix autoritaire, dirty state et nettoyage.
- [ ] Exécuter `node test/order-edit.test.js` et vérifier l'échec du helper absent.
- [ ] Implémenter :

```js
const canEditOrder = (order = {}) =>
  Number(order.status) === 1
  && ["unpaid", "requires_payment"].includes(String(order.payment_status));

const canStartComplementaryOrder = (order = {}) =>
  order.payment_provider === "stripe" && order.payment_status === "paid";
```

- [ ] Transformer chaque item API vers la forme panier existante avec `selections`, `customization_steps` et signature de configuration.
- [ ] Créer le store `orderEdit` sans mélanger son état au checkout Stripe normal ; persister seulement la session active.
- [ ] Nettoyer la session sur annulation, succès, logout explicite et 401.
- [ ] Ajouter le test au script `npm test` frontend et exécuter `node test/order-edit.test.js`.
- [ ] Commit frontend : `feat: add order edit session state`.

### Task 7: Actions dans Order details et commande complémentaire

**Files:**
- Modify: `pages/orders/detail/_id.vue`
- Modify: `store/orders.js`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: helper/store Task 6.
- Produces: `startOrderEdit()` et `startComplementaryOrder()`.

- [ ] Ajouter des contrats rouges pour la visibilité exclusive des boutons et la confirmation de remplacement d'un panier existant.
- [ ] Implémenter **Modifier la commande** : charger `GET /orders/:id/edit`, confirmer si le panier local n'est pas vide, hydrater le panier et aller vers `/menus`.
- [ ] Implémenter **Ajouter une commande complémentaire** : vider le panier après confirmation, préremplir le même client et la même table, ne pas activer `orderEdit`, puis aller vers `/menus`.
- [ ] Conserver la commande Stripe payée d'origine inchangée et laisser le checkout normal produire un nouvel identifiant/numéro.
- [ ] Afficher les erreurs serveur stables sans masquer un changement concurrent.
- [ ] Exécuter `node test/order-edit.test.js` et compiler le template de la page.
- [ ] Commit frontend : `feat: start order changes from details`.

### Task 8: Catalogue, panier et étapes en mode édition

**Files:**
- Create: `components/orders/OrderEditBanner.vue`
- Modify: `pages/menus.vue`
- Modify: `pages/cart.vue`
- Modify: `test/order-edit.test.js`
- Modify: `test/customizations.test.js`

**Interfaces:**
- Consumes: `orderEdit` et helpers de panier/personnalisation existants.
- Produces: enregistrement de la même commande ou annulation par panier vide.

- [ ] Ajouter des tests rouges pour bandeau, conservation du panier, ajout produit, clic de ligne vers les étapes, libellé d'enregistrement et confirmation du panier vide.
- [ ] Afficher `OrderEditBanner` dans Menus et Panier avec numéro et action **Annuler la modification**.
- [ ] Empêcher le chargement normal de Menus de vider un panier d'édition ; conserver exactement le wizard existant pour les nouveaux produits.
- [ ] Réutiliser `editCartLine(itemIndex, stepId)` pour modifier une ligne existante entière ou une étape précise.
- [ ] Remplacer le checkout par `orderEdit/save` quand la session est active.
- [ ] Si le panier est vide, confirmer puis envoyer `items: []`; sur succès, vider la session et revenir à la liste/détails.
- [ ] Gérer `ORDER_REPRICE_REQUIRED`, `ORDER_EDIT_CONFLICT`, `ORDER_NOT_EDITABLE` et `STRIPE_PAYMENT_REFRESH_REQUIRED` avec messages/action de reprise.
- [ ] Exécuter `node test/order-edit.test.js` et `node test/customizations.test.js`, puis compiler les templates Menus/Panier.
- [ ] Commit frontend : `feat: edit pending orders through cart`.

### Task 9: Vérification croisée et revue

**Files:**
- Verify all files above.

**Interfaces:**
- Produces: preuves ciblées de fonctionnement et historique Git propre dans les deux dépôts.

- [ ] Backend : exécuter `node test/order-editing.test.js`, `node test/checkout-contract.test.js`, `node test/stripe-payment.test.js`, `node test/customization-migration.test.js` et `git diff --check`.
- [ ] Frontend : exécuter `node test/order-edit.test.js`, `node test/customizations.test.js`, compiler les templates touchés, lancer ESLint ciblé et `git diff --check`.
- [ ] Vérifier manuellement la matrice : attente impayée → modifier ; préparation → bloquer ; Stripe payé → commande complémentaire ; panier vide → annuler.
- [ ] Demander une revue de code indépendante sur les deux dépôts et corriger tout problème Critical/Important.
- [ ] Commit final uniquement si une correction de revue est nécessaire : `fix: harden order editing lifecycle`.
