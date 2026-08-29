# Public Establishment Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recomposer la page publique Click & Collect en fiche d’établissement mobile-first qui expose les informations pratiques avant la galerie et conduit clairement vers la commande.

**Architecture:** Conserver la route Vue 2 et toutes ses sources de données existantes, puis réordonner son template en cinq sections sémantiques. Centraliser le responsive et la hiérarchie visuelle dans le style local de la page, sans nouveau composant, endpoint ou dépendance.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, CSS responsive.

**Spec:** `docs/superpowers/specs/2026-08-25-public-establishment-page-design.md`

## Global Constraints

- Mobile-first, tactile et très responsive.
- Une seule action primaire visible : `Commander maintenant`.
- Les informations pratiques précèdent la galerie.
- Aucun prix ni titre visible sur les images de produits.
- Aucun nouveau champ, endpoint, comportement métier ou package.
- Conserver le fallback `/logo.png`, le blocage cuisine fermée et le chargement de commande existants.
- Respecter `prefers-reduced-motion` et viser WCAG AA.

---

### Task 1: Verrouiller la hiérarchie publique et les états existants

**Files:**
- Modify: `test/click-and-collect-showcase.test.js`
- Modify: `pages/click-and-collect/_shopId/_shopName.vue`

**Interfaces:**
- Consumes: `shopInfo`, `isKitchenClosed`, `isRestaurantOpen`, `clickAndCollectServicePoint`, `showcaseProducts`, `goToClickAndCollect()`.
- Produces: sections `.establishment-practical`, `.establishment-story`, `.product-showcase`, `.community-section` dans cet ordre ; `currentDayIndex` de type `number` entre 0 et 6.

- [ ] **Step 1: Écrire les assertions structurelles qui échouent**

Ajouter avant l’extraction du `<script>` :

```js
const practicalIndex = pageSource.indexOf('class="establishment-practical"')
const storyIndex = pageSource.indexOf('class="establishment-story"')
const showcaseIndex = pageSource.indexOf('class="product-showcase"')

assert.ok(practicalIndex >= 0, 'la section pratique doit exister')
assert.ok(storyIndex > practicalIndex, 'la présentation suit les informations pratiques')
assert.ok(showcaseIndex > storyIndex, 'la galerie suit la présentation')
assert.match(pageSource, /class="hero-order-action"/)
assert.match(pageSource, /:class="\{ 'is-today': i === currentDayIndex \}"/)
```

- [ ] **Step 2: Vérifier l’échec attendu**

Run: `node test/click-and-collect-showcase.test.js`

Expected: FAIL sur `la section pratique doit exister` parce que le template actuel place encore la présentation avant les horaires.

- [ ] **Step 3: Recomposer le template avec les données existantes**

Dans `pages/click-and-collect/_shopId/_shopName.vue` :

- garder la photo, le nom, l’adresse, le téléphone et la chip d’ouverture dans `.click-collect-hero` ;
- ajouter dans le hero un bouton `.hero-order-action` utilisant `v-if="clickAndCollectServicePoint"`, `:loading="startingClickAndCollect"` et `@click="goToClickAndCollect"` ;
- déplacer les horaires immédiatement après le hero dans `<section class="establishment-practical">` ;
- mettre la description et le statut dans `<section class="establishment-story">` ;
- conserver ensuite `.product-showcase`, puis `.community-section` ;
- supprimer l’ancien titre `Commander via` et éviter un second bouton primaire sur desktop ;
- conserver `.order-cta` uniquement comme action fixe mobile.

Ajouter le computed :

```js
currentDayIndex() {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
},
```

Réutiliser `currentDayIndex` dans `isRestaurantOpen` afin d’éviter un second calcul du jour.

- [ ] **Step 4: Vérifier le comportement et l’ordre**

Run: `node test/click-and-collect-showcase.test.js`

Expected: `click-and-collect showcase tests passed`.

- [ ] **Step 5: Commit ciblé**

```bash
git add pages/click-and-collect/_shopId/_shopName.vue test/click-and-collect-showcase.test.js
git commit -m "feat: restructure public establishment page"
```

---

### Task 2: Appliquer la composition sobre, premium et responsive

**Files:**
- Modify: `test/click-and-collect-showcase.test.js`
- Modify: `pages/click-and-collect/_shopId/_shopName.vue`

**Interfaces:**
- Consumes: les classes et l’ordre produits par Task 1.
- Produces: layout mobile à une colonne, panneau pratique responsive, CTA mobile fixe/desktop intégré, galerie complète de douze images.

- [ ] **Step 1: Ajouter les assertions CSS qui échouent**

```js
assert.match(pageSource, /\.establishment-practical[\s\S]*?display: grid;/)
assert.match(pageSource, /\.practical-hours__row\.is-today/)
assert.match(pageSource, /@media \(min-width: 768px\)[\s\S]*?\.hero-order-action[\s\S]*?display: inline-flex;/)
assert.match(pageSource, /@media \(min-width: 768px\)[\s\S]*?\.order-cta[\s\S]*?display: none;/)
assert.match(pageSource, /@media \(prefers-reduced-motion: reduce\)/)
```

- [ ] **Step 2: Vérifier l’échec attendu**

Run: `node test/click-and-collect-showcase.test.js`

Expected: FAIL car les nouvelles sections n’ont pas encore leur layout responsive.

- [ ] **Step 3: Implémenter les styles ciblés**

Dans le `<style>` de la page :

- conserver `--cc-gutter: 16px` et `--cc-section-space: 48px` sur mobile, puis `24px` et `64px` à partir de `768px` ;
- afficher `.establishment-practical` en grille d’une colonne, fond blanc, largeur narrative plafonnée et séparations fines ;
- présenter adresse/téléphone sous forme de liens tactiles d’au moins `44px` ;
- utiliser `.practical-hours__row.is-today` avec poids typographique et libellé explicite, sans dépendre uniquement d’une couleur ;
- limiter `.establishment-story` à `68ch` et conserver le statut sans défilement animé dominant ;
- afficher `.hero-order-action` uniquement à partir de `768px` et masquer `.order-cta` au même breakpoint ;
- garder `.order-cta` fixe sur mobile avec `env(safe-area-inset-bottom)` ;
- préserver la mosaïque 12 produits et ses règles de fin de grille ;
- garder les transitions sous `250ms` et les neutraliser dans `prefers-reduced-motion`.

- [ ] **Step 4: Vérifier tests et qualité technique**

Run: `node test/click-and-collect-showcase.test.js`

Expected: `click-and-collect showcase tests passed`.

Run: `node C:\Users\kalag\.codex\plugins\cache\openai-curated-remote\impeccable\3.9.1\skills\impeccable\scripts\detect.mjs --json --scope layout pages/click-and-collect/_shopId/_shopName.vue`

Expected: `[]` ou chaque constat restant documenté et corrigé avant de continuer.

Run: `npm.cmd run lint -- --no-fix`

Expected: exit 0, aucune erreur ESLint ; les avertissements préexistants sont signalés séparément.

- [ ] **Step 5: Vérifier visuellement les deux formats**

Lancer `npm.cmd run dev`, ouvrir la route Click & Collect avec des données réelles, puis contrôler :

- mobile autour de `390x844` : CTA toujours accessible, aucune information masquée, horaires avant produits ;
- desktop autour de `1440x900` : page toujours verticale, bouton dans le hero, aucun second CTA ;
- douze produits : aucune rangée finale incomplète ;
- cuisine fermée et image absente : message et fallback existants visibles.

- [ ] **Step 6: Commit final ciblé**

```bash
git add pages/click-and-collect/_shopId/_shopName.vue test/click-and-collect-showcase.test.js
git commit -m "style: refine public establishment showcase"
```

