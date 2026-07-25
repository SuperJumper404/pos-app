# Order Detail Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centraliser le numéro, le client, le paiement et le mode de service dans l'en-tête du détail d'une commande afin d'élargir la zone des personnalisations.

**Architecture:** `TakeawayChip.vue` gagne un mode explicite facultatif pour représenter aussi les commandes sur place. `pages/orders/detail/_id.vue` construit son en-tête depuis `orderSummary`, retire les métadonnées répétées des lignes et simplifie sa grille responsive.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Node.js `assert`.

## Global Constraints

- Une page `orders/detail/:id` représente exactement une commande et un client.
- Ne modifier ni le contrat API ni les actions de commande.
- Conserver le comportement actuel de `TakeawayChip` dans ses autres consommateurs.
- Ne pas ajouter de dépendance.

---

### Task 1: Ajouter le mode de service explicite

**Files:**
- Modify: `components/orders/TakeawayChip.vue`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: prop existante `value` et nouvelle prop booléenne `showDineIn`.
- Produces: `À emporter` lorsque la valeur est vraie, `Sur place` lorsque la valeur est fausse et `showDineIn` vaut `true`, rien sinon.

- [ ] **Step 1: Écrire le test en échec**

Charger réellement les options du composant et vérifier les trois états de visibilité et de libellé.

- [ ] **Step 2: Vérifier l'échec**

Run: `node test/order-edit.test.js`
Expected: FAIL car `showDineIn` et le libellé « Sur place » n'existent pas.

- [ ] **Step 3: Implémenter le mode explicite**

Ajouter la prop, un booléen normalisé `isTakeaway`, une visibilité dérivée et le texte/couleur correspondant.

- [ ] **Step 4: Vérifier le composant**

Run: `node test/order-edit.test.js`
Expected: PASS.

### Task 2: Construire l'en-tête et élargir les choix

**Files:**
- Modify: `pages/orders/detail/_id.vue`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: `orderSummary`, `orderPaymentStatus`, `paymentStatusText`, `paymentStatusColor` et `TakeawayChip`.
- Produces: un header responsive et des lignes limitées aux informations propres au produit.

- [ ] **Step 1: Écrire le contrat en échec**

Vérifier que le header utilise `orderSummary.ordernumber`, `orderSummary.customer`, le statut de paiement et `show-dine-in`, et que les classes `order-detail-meta` ne figurent plus dans la page.

- [ ] **Step 2: Vérifier l'échec**

Run: `node test/order-edit.test.js`
Expected: FAIL sur le header absent ou les métadonnées encore répétées.

- [ ] **Step 3: Implémenter le header**

Afficher des valeurs de repli `—`, regrouper les chips et rendre la structure flexible sur desktop et mobile.

- [ ] **Step 4: Simplifier les lignes et le CSS**

Retirer le bloc client/numéro de chaque produit, passer la grille desktop à deux colonnes et supprimer les zones mobiles devenues inutiles.

- [ ] **Step 5: Vérifier le comportement ciblé**

Run: `node test/order-edit.test.js`
Expected: PASS.

### Task 3: Vérification finale

**Files:**
- Test: `components/orders/TakeawayChip.vue`, `pages/orders/detail/_id.vue`, `test/order-edit.test.js`.

**Interfaces:**
- Consumes: implémentation complète.
- Produces: preuve de non-régression et de compilation.

- [ ] **Step 1: Lancer la suite frontend**

Run: `npm.cmd test`
Expected: PASS.

- [ ] **Step 2: Lancer ESLint ciblé**

Run: `npx.cmd eslint components/orders/TakeawayChip.vue pages/orders/detail/_id.vue test/order-edit.test.js`
Expected: aucune erreur.

- [ ] **Step 3: Construire le frontend**

Run: `npm.cmd run build-local`
Expected: compilation Nuxt réussie.

- [ ] **Step 4: Commiter**

Inclure uniquement le composant, la page, le test et ce plan dans les commits de cette fonctionnalité.
