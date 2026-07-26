# Shared Customization Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Utiliser un seul résumé visuel des choix dans le panier et le détail d'une commande.

**Architecture:** `groupCustomizationSelections` devient l'adaptateur commun des formats courants et historiques et conserve l'identifiant d'étape lorsqu'il existe. Le nouveau composant `CustomizationSummary.vue` reçoit uniquement ces groupes normalisés et active séparément l'édition et le total selon son consommateur.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Node.js `assert`.

## Global Constraints

- Ne modifier ni le contrat API, ni les calculs de prix, ni le flux de modification de commande.
- Conserver la lecture des anciens formats de personnalisations.
- Ne pas ajouter de dépendance.
- Préserver la modification utilisateur non commitée dans `pages/settings.vue`.

---

### Task 1: Normaliser les groupes éditables

**Files:**
- Modify: `helpers/customizations.js`
- Modify: `test/customizations.test.js`

**Interfaces:**
- Consumes: `groupCustomizationSelections(selections)` et les formats `product_customization_step_id`, `product_step_id`, `step_id`, `productStepId`.
- Produces: `{ stepName, stepId?, choices: [{ name, price }] }`, trié comme aujourd'hui et sans mutation de la source.

- [ ] **Step 1: Écrire le test en échec**

Ajouter une assertion vérifiant qu'un groupe issu d'une sélection du panier conserve `product_step_id` sous `stepId`, tandis qu'un ancien choix sans étape reste lisible sans action d'édition.

- [ ] **Step 2: Vérifier l'échec**

Run: `node test/customizations.test.js`
Expected: FAIL car `stepId` n'est pas encore produit.

- [ ] **Step 3: Implémenter la normalisation minimale**

Conserver sur chaque groupe l'identifiant d'étape fourni par la première sélection du groupe et l'exposer uniquement lorsqu'il existe.

- [ ] **Step 4: Vérifier le helper**

Run: `node test/customizations.test.js`
Expected: PASS.

### Task 2: Créer et brancher le résumé partagé

**Files:**
- Create: `components/products/CustomizationSummary.vue`
- Delete: `components/products/CartCustomizationSummary.vue`
- Modify: `pages/cart.vue`
- Modify: `pages/orders/detail/_id.vue`
- Modify: `components/products/ProductCustomizationWizard.vue`
- Modify: `test/customizations.test.js`
- Modify: `test/order-edit.test.js`

**Interfaces:**
- Consumes: `groups`, `editable`, `showTotal`, `unitPrice`.
- Produces: événement `edit(stepId)` uniquement lorsqu'une étape modifiable est affichée.

- [ ] **Step 1: Écrire les contrats en échec**

Vérifier que les trois consommateurs importent `CustomizationSummary`, que l'ancien composant est absent, que le panier fournit `editable` et `show-total`, et que le détail fournit ses groupes sans action ni total.

- [ ] **Step 2: Vérifier l'échec**

Run: `node test/customizations.test.js && node test/order-edit.test.js`
Expected: FAIL sur le composant partagé absent.

- [ ] **Step 3: Créer le composant partagé**

Rendre les titres, chips, suppléments et l'état vide. Afficher « Modifier » seulement avec `editable === true` et `group.stepId != null`. Afficher le total seulement avec `showTotal === true`.

- [ ] **Step 4: Migrer les consommateurs**

Le panier appelle `groupCustomizationSelections(itm.selections)` et conserve l'événement d'édition. Le détail transmet `customizationGroups(itm)` en lecture seule. Le wizard transmet ses sélections normalisées avec les deux modes actifs.

- [ ] **Step 5: Supprimer l'ancien composant et vérifier**

Run: `npm.cmd test`
Expected: PASS.

### Task 3: Vérification finale

**Files:**
- Test: tous les fichiers modifiés hors `pages/settings.vue`.

**Interfaces:**
- Consumes: implémentation complète.
- Produces: preuve de syntaxe, qualité et compilation.

- [ ] **Step 1: Lancer ESLint ciblé**

Run: `npx.cmd eslint helpers/customizations.js components/products/CustomizationSummary.vue components/products/ProductCustomizationWizard.vue pages/cart.vue pages/orders/detail/_id.vue test/customizations.test.js test/order-edit.test.js`
Expected: aucune erreur.

- [ ] **Step 2: Construire le frontend**

Run: `npm.cmd run build-local`
Expected: compilation Nuxt réussie.

- [ ] **Step 3: Vérifier et commiter le périmètre**

Le commit doit exclure `pages/settings.vue` et inclure uniquement le helper, le composant partagé, les consommateurs, les tests et la suppression de l'ancien composant.
