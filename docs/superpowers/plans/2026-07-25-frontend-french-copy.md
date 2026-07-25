# Frontend French Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les fautes, accents et problèmes d'encodage dans tous les textes français visibles du frontend POS.

**Architecture:** Les chaînes sont corrigées sur place dans les pages, composants et stores existants afin de préserver l'architecture. Un test statique ciblé scanne les sources d'interface pour empêcher le retour des erreurs les plus fréquentes.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Node.js `assert`.

## Global Constraints

- Ne modifier aucune logique métier ni contrat API.
- Ne pas ajouter de dépendance ni introduire d'i18n.
- Exclure identifiants, clés API, routes, données dynamiques, commentaires et logs techniques.
- Conserver les fichiers en UTF-8.

---

### Task 1: Ajouter le garde-fou linguistique

**Files:**
- Create: `test/french-copy.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: fichiers `.vue` et `.js` sous `pages`, `components`, `layouts`, `helpers`, `store`, `plugins` et `middleware`.
- Produces: un test Node qui échoue sur les marqueurs d'encodage corrompu et les formulations fautives ciblées.

- [ ] **Step 1: Écrire le test en échec**

Créer un scanner récursif qui ignore les dépendances et signale le fichier, la ligne et le motif interdit.

- [ ] **Step 2: Vérifier l'échec**

Run: `node test/french-copy.test.js`
Expected: FAIL sur les libellés actuellement incorrects.

- [ ] **Step 3: Rattacher le test à la suite existante**

Ajouter l'exécution du nouveau fichier au script `test` sans changer les autres commandes.

### Task 2: Corriger les textes des parcours de commande

**Files:**
- Modify: `pages/orders/index.vue`
- Modify: `pages/orders/detail/_id.vue`
- Modify: `pages/ordersStatuses.vue`
- Modify: `pages/history/index.vue`
- Modify: `pages/cashregister/index.vue`
- Modify: `pages/cashregister/details/_id.vue`
- Modify: `pages/cashregister/payout/_id.vue`
- Modify: `pages/click-and-collect/_shopId_shopName.vue`
- Modify: `pages/tables/delete/_id.vue`

**Interfaces:**
- Consumes: libellés Vuetify existants.
- Produces: les mêmes actions et vues avec un français corrigé.

- [ ] **Step 1: Corriger les textes visibles**

Corriger notamment `Détails`, `Cuisine fermée`, `Déjà payé`, `Clôturer`, les confirmations et les chaînes UTF-8 corrompues.

- [ ] **Step 2: Exécuter le test linguistique**

Run: `node test/french-copy.test.js`
Expected: seules les autres zones non encore traitées restent en échec.

### Task 3: Corriger les autres écrans et notifications

**Files:**
- Modify: tous les fichiers frontend restants signalés par l'inventaire et contenant une chaîne visible fautive.

**Interfaces:**
- Consumes: textes statiques existants.
- Produces: notifications, validations et libellés corrigés sans changement de données.

- [ ] **Step 1: Corriger chaque occurrence visible restante**

Traiter les accents manquants, accords, ponctuation et marqueurs d'encodage corrompu, en ignorant les identifiants et commentaires.

- [ ] **Step 2: Vérifier le garde-fou**

Run: `node test/french-copy.test.js`
Expected: PASS.

### Task 4: Vérifier le frontend

**Files:**
- Test: tous les fichiers modifiés.

**Interfaces:**
- Consumes: l'ensemble des corrections.
- Produces: preuve que les changements n'altèrent ni syntaxe ni build.

- [ ] **Step 1: Lancer les tests**

Run: `npm.cmd test`
Expected: PASS.

- [ ] **Step 2: Lancer ESLint sur les fichiers modifiés**

Run: `npx.cmd eslint <fichiers-modifiés>`
Expected: aucune erreur.

- [ ] **Step 3: Construire l'application**

Run: `npm.cmd run build-local`
Expected: compilation Nuxt réussie.
