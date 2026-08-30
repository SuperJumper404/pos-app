# Shop Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-restaurant color theme stored in the backend and applied to the menu, click-and-collect, kiosk, and settings surfaces.

**Architecture:** The backend stores one normalized `shop_theme` JSON document per shop. The frontend normalizes the same shape, stores it in Vuex, and applies it as CSS variables that reuse the existing `--se-color-*` design tokens.

**Tech Stack:** Express, MySQL/dbmate migrations, Node assert tests, Nuxt 2, Vue 2, Vuex Easy Access, Vuetify, SCSS CSS variables.

**Spec:** `docs/superpowers/specs/2026-08-30-shop-theme-design.md`

## Global Constraints

- Keep changes targeted and coherent with the existing POS architecture.
- Do not revert or rewrite unrelated backend changes already present in `../express-pos`.
- Do not add dependencies.
- First release covers colors only.
- Theme JSON is global per restaurant; no per-screen overrides in this release.
- Existing restaurants with missing, empty, null, or invalid `shop_theme` keep the current default look.
- Social network brand colors remain outside the restaurant theme.
- API-related changes must account for `.env`, `nuxt.config.js`, `plugins/axios.js`, and `config/config.json`; this feature uses existing `/baseurl/api/v1/shopInfo`, `/baseurl/api/v1/shopInfo/click-and-collect/:shopid`, and `/baseurl/api/v1/updateShopInfo`.

---

## File Structure

Backend `../express-pos`:

- Create `src/helpers/shopTheme.js`: backend source of truth for normalizing theme JSON before storage/API use.
- Create `test/shop-theme.test.js`: unit tests for normalization.
- Create `test/shop-theme-contract.test.js`: static contract test for migration/API/module wiring.
- Create `db/migrations/20260830090000_add_shop_theme_to_shop.sql`: dbmate migration.
- Modify `src/controllers/c_shop.js`: default theme during shop creation, public API exposure, update normalization.
- Modify `src/modules/m_shop.js`: insert and update `shop_theme`.
- Modify `package.json`: add the two shop theme tests to the existing `npm test` chain.

Frontend `pos-app`:

- Create `helpers/shopThemes.js`: frontend presets, field metadata, normalization, and CSS variable mapping.
- Create `plugins/shopTheme.client.js`: client-only CSS variable applicator.
- Create `test/shop-themes.test.js`: frontend helper/plugin contract tests.
- Modify `nuxt.config.js`: register the client plugin.
- Modify `store/shop.js`: keep `shop_theme` in Vuex and hydrate it from private/public shop info.
- Modify `pages/settings.vue`: add theme controls and include `shop_theme` in the existing save payload.
- Modify `pages/menus.vue`: replace priority hardcoded colors with `--se-color-*`.
- Modify `pages/borne.vue`: replace priority hardcoded colors with `--se-color-*`.
- Modify `pages/click-and-collect/_shopId/_shopName.vue`: add theme to computed `shopInfo` fallback if needed and verify themed variables are used.
- Modify `package.json`: add `node test/shop-themes.test.js` to the existing `npm test` chain.

---

### Task 1: Backend Theme Normalization

**Files:**
- Create: `../express-pos/src/helpers/shopTheme.js`
- Create: `../express-pos/test/shop-theme.test.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Produces: `DEFAULT_SHOP_THEME: { preset: string, colors: Record<string, string> }`
- Produces: `SHOP_THEME_PRESETS: Record<string, { preset: string, colors: Record<string, string> }>`
- Produces: `normalizeShopTheme(value: unknown): { preset: string, colors: Record<string, string> }`
- Consumes: no previous task output.

- [ ] **Step 1: Write the failing backend normalization test**

Create `../express-pos/test/shop-theme.test.js`:

```js
const assert = require('assert')
const {
  DEFAULT_SHOP_THEME,
  SHOP_THEME_PRESETS,
  normalizeShopTheme,
} = require('../src/helpers/shopTheme')

assert.strictEqual(DEFAULT_SHOP_THEME.preset, 'default')
assert.strictEqual(DEFAULT_SHOP_THEME.colors.primary, '#1976d2')
assert.strictEqual(DEFAULT_SHOP_THEME.colors.borderSoft, '#e8edf3')
assert.ok(SHOP_THEME_PRESETS.default)

assert.deepStrictEqual(normalizeShopTheme(null), DEFAULT_SHOP_THEME)
assert.deepStrictEqual(normalizeShopTheme(''), DEFAULT_SHOP_THEME)
assert.deepStrictEqual(normalizeShopTheme('{bad json'), DEFAULT_SHOP_THEME)

assert.deepStrictEqual(
  normalizeShopTheme({
    preset: 'unknown',
    colors: {
      primary: '#abc',
      background: 'red',
      custom: '#000000',
    },
    extra: true,
  }),
  {
    preset: 'default',
    colors: {
      ...DEFAULT_SHOP_THEME.colors,
      primary: '#abc',
    },
  }
)

assert.deepStrictEqual(
  normalizeShopTheme(
    JSON.stringify({
      preset: 'default',
      colors: {
        primary: '#123456',
        primaryHover: '#234567',
        danger: '#345678',
      },
    })
  ),
  {
    preset: 'default',
    colors: {
      ...DEFAULT_SHOP_THEME.colors,
      primary: '#123456',
      primaryHover: '#234567',
      danger: '#345678',
    },
  }
)

console.log('shop theme tests passed')
```

- [ ] **Step 2: Run the failing test**

Run from `../express-pos`:

```bash
node test/shop-theme.test.js
```

Expected: FAIL with `Cannot find module '../src/helpers/shopTheme'`.

- [ ] **Step 3: Implement `src/helpers/shopTheme.js`**

Create `../express-pos/src/helpers/shopTheme.js`:

```js
const DEFAULT_SHOP_THEME = {
  preset: 'default',
  colors: {
    primary: '#1976d2',
    primaryHover: '#155fa8',
    primarySoft: '#e8f2ff',
    background: '#f3f5f8',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    border: '#dfe5ee',
    borderSoft: '#e8edf3',
    text: '#121826',
    textBody: '#1f2933',
    textMuted: '#687386',
    success: '#00e676',
    warning: '#ffa014',
    danger: '#d83b3b',
  },
}

const SHOP_THEME_PRESETS = {
  default: DEFAULT_SHOP_THEME,
}

const COLOR_KEYS = Object.keys(DEFAULT_SHOP_THEME.colors)
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const cloneDefaultTheme = () => ({
  preset: DEFAULT_SHOP_THEME.preset,
  colors: { ...DEFAULT_SHOP_THEME.colors },
})

const parseThemeValue = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

const normalizeShopTheme = (value) => {
  const parsed = parseThemeValue(value)
  if (!parsed || typeof parsed !== 'object') return cloneDefaultTheme()

  const preset = Object.prototype.hasOwnProperty.call(
    SHOP_THEME_PRESETS,
    parsed.preset
  )
    ? parsed.preset
    : DEFAULT_SHOP_THEME.preset

  const normalized = {
    preset,
    colors: { ...DEFAULT_SHOP_THEME.colors },
  }

  const colors =
    parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {}

  COLOR_KEYS.forEach((key) => {
    if (HEX_COLOR_PATTERN.test(colors[key])) {
      normalized.colors[key] = colors[key]
    }
  })

  return normalized
}

module.exports = {
  DEFAULT_SHOP_THEME,
  SHOP_THEME_PRESETS,
  normalizeShopTheme,
}
```

- [ ] **Step 4: Run the backend normalization test**

Run from `../express-pos`:

```bash
node test/shop-theme.test.js
```

Expected: PASS and prints `shop theme tests passed`.

- [ ] **Step 5: Add the test to backend `package.json`**

In `../express-pos/package.json`, prepend `node test/shop-theme.test.js &&` to the existing `scripts.test` command so a broken helper fails early.

- [ ] **Step 6: Run the backend test entry**

Run from `../express-pos`:

```bash
npm test
```

Expected: PASS for the full backend suite. If pre-existing unrelated tests fail, record the failing test names and continue only after confirming the failure is unrelated to files in this task.

- [ ] **Step 7: Commit Task 1**

Run from `../express-pos`:

```bash
git add src/helpers/shopTheme.js test/shop-theme.test.js package.json
git commit -m "feat: normalize shop themes"
```

---

### Task 2: Backend Persistence and API Contract

**Files:**
- Create: `../express-pos/db/migrations/20260830090000_add_shop_theme_to_shop.sql`
- Create: `../express-pos/test/shop-theme-contract.test.js`
- Modify: `../express-pos/src/controllers/c_shop.js`
- Modify: `../express-pos/src/modules/m_shop.js`
- Modify: `../express-pos/package.json`

**Interfaces:**
- Consumes: `normalizeShopTheme(value)` and `DEFAULT_SHOP_THEME` from Task 1.
- Produces: API field `shop_theme` on private shop info and public click-and-collect shop info.
- Produces: database column `shop.shop_theme`.

- [ ] **Step 1: Write the failing backend contract test**

Create `../express-pos/test/shop-theme-contract.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8')

const migration = read('db/migrations/20260830090000_add_shop_theme_to_shop.sql')
assert.match(migration, /ADD COLUMN `shop_theme` TEXT NULL/)
assert.match(migration, /UPDATE `shop`/)
assert.match(migration, /DROP COLUMN `shop_theme`/)

const controller = read('src/controllers/c_shop.js')
assert.match(controller, /normalizeShopTheme/)
assert.match(controller, /DEFAULT_SHOP_THEME/)
assert.match(controller, /shop_theme:\s*normalizeShopTheme/)
assert.match(controller, /shop_theme:\s*response\?\.\[0\]\?\.shop_theme/)

const moduleSource = read('src/modules/m_shop.js')
assert.match(moduleSource, /shop_theme:\s*JSON\.stringify\(normalizeShopTheme/)
assert.match(moduleSource, /shop_theme = \?/)
assert.match(moduleSource, /JSON\.stringify\(normalizeShopTheme\(data\.shop_theme\)\)/)

console.log('shop theme backend contract tests passed')
```

- [ ] **Step 2: Run the failing contract test**

Run from `../express-pos`:

```bash
node test/shop-theme-contract.test.js
```

Expected: FAIL because the migration and backend wiring do not exist yet.

- [ ] **Step 3: Add the dbmate migration**

Create `../express-pos/db/migrations/20260830090000_add_shop_theme_to_shop.sql`:

```sql
-- migrate:up
ALTER TABLE `shop`
  ADD COLUMN `shop_theme` TEXT NULL AFTER `shop_profile_image`;

UPDATE `shop`
SET `shop_theme` = '{"preset":"default","colors":{"primary":"#1976d2","primaryHover":"#155fa8","primarySoft":"#e8f2ff","background":"#f3f5f8","surface":"#ffffff","surfaceMuted":"#f8fafc","border":"#dfe5ee","borderSoft":"#e8edf3","text":"#121826","textBody":"#1f2933","textMuted":"#687386","success":"#00e676","warning":"#ffa014","danger":"#d83b3b"}}'
WHERE `shop_theme` IS NULL OR `shop_theme` = '';

-- migrate:down
ALTER TABLE `shop`
  DROP COLUMN `shop_theme`;
```

- [ ] **Step 4: Wire theme creation and updates in `c_shop.js`**

Modify `../express-pos/src/controllers/c_shop.js`:

```js
const {
  DEFAULT_SHOP_THEME,
  normalizeShopTheme,
} = require("../helpers/shopTheme");
```

Add to the `data` object inside `createAndInitializeShop`:

```js
shop_theme: DEFAULT_SHOP_THEME,
```

Add to public `getShopInfoClickAndCollect` data:

```js
shop_theme: response?.[0]?.shop_theme,
```

Add to the `data` object inside `updateShopInfo`:

```js
shop_theme: normalizeShopTheme(
  prefer(req.body.shop_theme, shopInfo.shop_theme),
),
```

- [ ] **Step 5: Wire theme insert and update in `m_shop.js`**

Modify `../express-pos/src/modules/m_shop.js`:

```js
const { normalizeShopTheme } = require("../helpers/shopTheme");
```

Add to `shopPayload`:

```js
shop_theme: JSON.stringify(normalizeShopTheme(data.shop_theme)),
```

Add `shop_theme = ?` to the `UPDATE shop SET` SQL after `shop_profile_image = ?`.

Add the value after `data.shop_profile_image` in the values array:

```js
JSON.stringify(normalizeShopTheme(data.shop_theme)),
```

- [ ] **Step 6: Add the contract test to backend `package.json`**

In `../express-pos/package.json`, add `node test/shop-theme-contract.test.js &&` immediately after `node test/shop-theme.test.js &&` in `scripts.test`.

- [ ] **Step 7: Run backend focused tests**

Run from `../express-pos`:

```bash
node test/shop-theme.test.js
node test/shop-theme-contract.test.js
```

Expected: both PASS.

- [ ] **Step 8: Run migration syntax check if dbmate local env is available**

Run from `../express-pos`:

```bash
npm run db:up:local
```

Expected: migration applies. If `.env.local` or the local database is unavailable, record the exact error and rely on the static migration contract test for this task.

- [ ] **Step 9: Run backend full tests**

Run from `../express-pos`:

```bash
npm test
```

Expected: PASS for the full backend suite, except pre-existing unrelated failures documented with command output.

- [ ] **Step 10: Commit Task 2**

Run from `../express-pos`:

```bash
git add db/migrations/20260830090000_add_shop_theme_to_shop.sql src/controllers/c_shop.js src/modules/m_shop.js test/shop-theme-contract.test.js package.json
git commit -m "feat: persist restaurant shop themes"
```

---

### Task 3: Frontend Theme Helper, Store, and Plugin

**Files:**
- Create: `helpers/shopThemes.js`
- Create: `plugins/shopTheme.client.js`
- Create: `test/shop-themes.test.js`
- Modify: `store/shop.js`
- Modify: `nuxt.config.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: backend `shop_theme` API field from Task 2.
- Produces: `DEFAULT_SHOP_THEME`, `SHOP_THEME_PRESETS`, `SHOP_THEME_COLOR_FIELDS`, `normalizeShopTheme(value)`, `shopThemeToCssVars(theme)`.
- Produces: CSS variables on `document.documentElement`.
- Produces: Vuex state path `shop/shop_theme`.

- [ ] **Step 1: Write the failing frontend helper test**

Create `test/shop-themes.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8')

function loadHelper() {
  const source = read('helpers/shopThemes.js')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/export default[\s\S]*$/, '')

  const module = { exports: {} }
  const wrapped = `${source}
module.exports = {
  DEFAULT_SHOP_THEME,
  SHOP_THEME_PRESETS,
  SHOP_THEME_COLOR_FIELDS,
  normalizeShopTheme,
  shopThemeToCssVars,
}`

  require('vm').runInNewContext(wrapped, { module, exports: module.exports })
  return module.exports
}

const {
  DEFAULT_SHOP_THEME,
  SHOP_THEME_PRESETS,
  SHOP_THEME_COLOR_FIELDS,
  normalizeShopTheme,
  shopThemeToCssVars,
} = loadHelper()

assert.strictEqual(DEFAULT_SHOP_THEME.preset, 'default')
assert.ok(SHOP_THEME_PRESETS.default)
assert.ok(SHOP_THEME_COLOR_FIELDS.find((field) => field.key === 'primary'))
assert.strictEqual(normalizeShopTheme(null).colors.primary, '#1976d2')
assert.strictEqual(
  normalizeShopTheme({ colors: { primary: '#abc', warning: 'orange' } }).colors.warning,
  '#ffa014'
)
assert.deepStrictEqual(
  shopThemeToCssVars({ colors: { ...DEFAULT_SHOP_THEME.colors, primary: '#123456' } })[
    '--se-color-primary'
  ],
  '#123456'
)
assert.strictEqual(
  shopThemeToCssVars(DEFAULT_SHOP_THEME)['--se-color-border-soft'],
  '#e8edf3'
)

const plugin = read('plugins/shopTheme.client.js')
assert.match(plugin, /shopThemeToCssVars/)
assert.match(plugin, /document\.documentElement\.style\.setProperty/)
assert.match(plugin, /\$store\.watch/)

const store = read('store/shop.js')
assert.match(store, /shop_theme/)
assert.match(store, /normalizeShopTheme/)
assert.match(store, /set\/shop_theme/)

const nuxtConfig = read('nuxt.config.js')
assert.match(nuxtConfig, /plugins\/shopTheme\.client\.js/)

console.log('frontend shop theme tests passed')
```

- [ ] **Step 2: Run the failing frontend test**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
```

Expected: FAIL because `helpers/shopThemes.js` and the plugin do not exist yet.

- [ ] **Step 3: Create `helpers/shopThemes.js`**

Create `helpers/shopThemes.js` with ES module exports matching the backend defaults:

```js
export const DEFAULT_SHOP_THEME = {
  preset: 'default',
  colors: {
    primary: '#1976d2',
    primaryHover: '#155fa8',
    primarySoft: '#e8f2ff',
    background: '#f3f5f8',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    border: '#dfe5ee',
    borderSoft: '#e8edf3',
    text: '#121826',
    textBody: '#1f2933',
    textMuted: '#687386',
    success: '#00e676',
    warning: '#ffa014',
    danger: '#d83b3b',
  },
}

export const SHOP_THEME_PRESETS = {
  default: {
    label: 'Default',
    theme: DEFAULT_SHOP_THEME,
  },
}

export const SHOP_THEME_COLOR_FIELDS = [
  { key: 'primary', label: 'Couleur principale' },
  { key: 'primaryHover', label: 'Couleur principale au survol' },
  { key: 'primarySoft', label: 'Fond principal doux' },
  { key: 'background', label: 'Fond de page' },
  { key: 'surface', label: 'Surface' },
  { key: 'surfaceMuted', label: 'Surface secondaire' },
  { key: 'border', label: 'Bordure' },
  { key: 'borderSoft', label: 'Bordure douce' },
  { key: 'text', label: 'Texte fort' },
  { key: 'textBody', label: 'Texte courant' },
  { key: 'textMuted', label: 'Texte discret' },
  { key: 'success', label: 'Succes' },
  { key: 'warning', label: 'Alerte' },
  { key: 'danger', label: 'Erreur' },
]

const CSS_VAR_MAP = {
  primary: '--se-color-primary',
  primaryHover: '--se-color-primary-hover',
  primarySoft: '--se-color-primary-soft',
  background: '--se-color-bg',
  surface: '--se-color-surface',
  surfaceMuted: '--se-color-surface-muted',
  border: '--se-color-border',
  borderSoft: '--se-color-border-soft',
  text: '--se-color-text',
  textBody: '--se-color-text-body',
  textMuted: '--se-color-text-muted',
  success: '--se-color-success',
  warning: '--se-color-warning',
  danger: '--se-color-danger',
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const cloneTheme = (theme) => ({
  preset: theme.preset,
  colors: { ...theme.colors },
})

function parseThemeValue(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

export function normalizeShopTheme(value) {
  const parsed = parseThemeValue(value)
  if (!parsed || typeof parsed !== 'object') return cloneTheme(DEFAULT_SHOP_THEME)

  const preset = SHOP_THEME_PRESETS[parsed.preset]
    ? parsed.preset
    : DEFAULT_SHOP_THEME.preset
  const normalized = {
    preset,
    colors: { ...DEFAULT_SHOP_THEME.colors },
  }
  const colors =
    parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {}

  Object.keys(DEFAULT_SHOP_THEME.colors).forEach((key) => {
    if (HEX_COLOR_PATTERN.test(colors[key])) normalized.colors[key] = colors[key]
  })

  return normalized
}

export function shopThemeToCssVars(theme) {
  const normalized = normalizeShopTheme(theme)
  return Object.keys(CSS_VAR_MAP).reduce((vars, key) => {
    vars[CSS_VAR_MAP[key]] = normalized.colors[key]
    return vars
  }, {})
}
```

- [ ] **Step 4: Create `plugins/shopTheme.client.js`**

Create `plugins/shopTheme.client.js`:

```js
import { normalizeShopTheme, shopThemeToCssVars } from '@/helpers/shopThemes'

function applyTheme(theme) {
  const vars = shopThemeToCssVars(normalizeShopTheme(theme))
  Object.keys(vars).forEach((name) => {
    document.documentElement.style.setProperty(name, vars[name])
  })
}

export default ({ store }) => {
  applyTheme(store.get('shop/shop_theme'))

  store.watch(
    () => store.get('shop/shop_theme'),
    (theme) => applyTheme(theme),
    { deep: true }
  )
}
```

- [ ] **Step 5: Register the plugin in `nuxt.config.js`**

Add to the existing `plugins` array:

```js
{ src: '~/plugins/shopTheme.client.js', ssr: false },
```

- [ ] **Step 6: Hydrate `shop_theme` in `store/shop.js`**

Import the normalizer:

```js
import { normalizeShopTheme } from '../helpers/shopThemes'
```

Add state:

```js
shop_theme: normalizeShopTheme(),
```

In both `getShopInfo` and `getShopInfoClickAndCollect`, dispatch:

```js
dispatch('set/shop_theme', normalizeShopTheme(response.data.data[0].shop_theme))
```

For the public click-and-collect response, use:

```js
dispatch('set/shop_theme', normalizeShopTheme(response.data.data.shop_theme))
```

- [ ] **Step 7: Add the frontend test to `package.json`**

In `package.json`, add `node test/shop-themes.test.js &&` before `node test/design-system.test.js` in `scripts.test`.

- [ ] **Step 8: Run focused frontend test**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
```

Expected: PASS and prints `frontend shop theme tests passed`.

- [ ] **Step 9: Run frontend lint**

Run from `pos-app`:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

Run from `pos-app`:

```bash
git add helpers/shopThemes.js plugins/shopTheme.client.js store/shop.js nuxt.config.js test/shop-themes.test.js package.json
git commit -m "feat: apply restaurant theme tokens"
```

---

### Task 4: Settings Theme Editor

**Files:**
- Modify: `pages/settings.vue`
- Modify: `test/shop-themes.test.js`

**Interfaces:**
- Consumes: `SHOP_THEME_PRESETS`, `SHOP_THEME_COLOR_FIELDS`, `normalizeShopTheme`.
- Produces: editable `formShop.shop_theme`.
- Produces: submitted `shop_theme` in the existing `FormData`.

- [ ] **Step 1: Extend the frontend test for settings wiring**

Append these assertions to `test/shop-themes.test.js`:

```js
const settings = read('pages/settings.vue')
assert.match(settings, /SHOP_THEME_PRESETS/)
assert.match(settings, /SHOP_THEME_COLOR_FIELDS/)
assert.match(settings, /formShop\.shop_theme/)
assert.match(settings, /Theme du restaurant/)
assert.match(settings, /v-select[\s\S]*themePresetOptions/)
assert.match(settings, /v-text-field[\s\S]*type="color"/)
assert.match(settings, /fd\.append\('shop_theme', JSON\.stringify/)
```

- [ ] **Step 2: Run the failing focused test**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
```

Expected: FAIL because `settings.vue` has no theme editor yet.

- [ ] **Step 3: Import theme helpers in `pages/settings.vue`**

Add imports:

```js
import {
  SHOP_THEME_COLOR_FIELDS,
  SHOP_THEME_PRESETS,
  normalizeShopTheme,
} from '@/helpers/shopThemes'
```

Add data fields:

```js
SHOP_THEME_COLOR_FIELDS,
SHOP_THEME_PRESETS,
```

Add `formShop.shop_theme`:

```js
shop_theme: normalizeShopTheme(),
```

- [ ] **Step 4: Add settings computed properties**

Add:

```js
shop_theme() {
  return this.$store.get('shop/shop_theme')
},
themePresetOptions() {
  return Object.keys(SHOP_THEME_PRESETS).map((value) => ({
    value,
    text: SHOP_THEME_PRESETS[value].label,
  }))
},
selectedThemePreset: {
  get() {
    return this.formShop.shop_theme.preset
  },
  set(value) {
    const preset = SHOP_THEME_PRESETS[value] || SHOP_THEME_PRESETS.default
    this.formShop.shop_theme = normalizeShopTheme(preset.theme)
  },
},
```

- [ ] **Step 5: Hydrate the form from the store**

In `mounted()`, after payment/discount hydration, add:

```js
this.formShop.shop_theme = normalizeShopTheme(this.shop_theme)
```

- [ ] **Step 6: Add the settings UI card**

Place this card after the payment/settings cards or before the action bar:

```vue
<v-col cols="12">
  <v-card id="theme" outlined class="pa-4 settings-card">
    <h3 class="mb-4 settings-section-title">
      <v-icon small color="primary">mdi-palette-outline</v-icon>
      Theme du restaurant
    </h3>
    <v-row>
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedThemePreset"
          class="settings-field"
          prepend-inner-icon="mdi-format-color-fill"
          :items="themePresetOptions"
          item-text="text"
          item-value="value"
          label="Theme"
          dense
          outlined
        ></v-select>
      </v-col>
      <v-col
        v-for="field in SHOP_THEME_COLOR_FIELDS"
        :key="field.key"
        cols="12"
        sm="6"
        md="4"
      >
        <v-text-field
          v-model="formShop.shop_theme.colors[field.key]"
          class="settings-field"
          :label="field.label"
          type="color"
          dense
          outlined
        ></v-text-field>
      </v-col>
    </v-row>
  </v-card>
</v-col>
```

- [ ] **Step 7: Include `shop_theme` in the save payload**

In `submitShopEdit()`, before building/sending `FormData`, normalize:

```js
this.formShop.shop_theme = normalizeShopTheme(this.formShop.shop_theme)
```

When appending fields, add:

```js
fd.append('shop_theme', JSON.stringify(this.formShop.shop_theme))
```

- [ ] **Step 8: Run focused frontend tests**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
```

Expected: PASS.

- [ ] **Step 9: Run frontend lint**

Run from `pos-app`:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 10: Commit Task 4**

Run from `pos-app`:

```bash
git add pages/settings.vue test/shop-themes.test.js
git commit -m "feat: edit restaurant theme settings"
```

---

### Task 5: Themed Menu, Click-and-Collect, and Kiosk Surfaces

**Files:**
- Modify: `pages/menus.vue`
- Modify: `pages/borne.vue`
- Modify: `pages/click-and-collect/_shopId/_shopName.vue`
- Modify: `test/shop-themes.test.js`

**Interfaces:**
- Consumes: CSS variables applied by Task 3.
- Produces: themed colors on menu, click-and-collect, and kiosk pages.

- [ ] **Step 1: Extend static tests for themed page variables**

Append these assertions to `test/shop-themes.test.js`:

```js
const menuPage = read('pages/menus.vue')
const kioskPage = read('pages/borne.vue')
const clickCollectPage = read('pages/click-and-collect/_shopId/_shopName.vue')

assert.match(menuPage, /var\(--se-color-primary\)/)
assert.match(menuPage, /var\(--se-color-bg\)/)
assert.match(menuPage, /var\(--se-color-surface\)/)
assert.match(menuPage, /var\(--se-color-border\)/)
assert.match(menuPage, /var\(--se-color-text\)/)

assert.match(kioskPage, /var\(--se-color-primary\)/)
assert.match(kioskPage, /var\(--se-color-bg\)/)
assert.match(kioskPage, /var\(--se-color-surface\)/)
assert.match(kioskPage, /var\(--se-color-border\)/)
assert.match(kioskPage, /var\(--se-color-text\)/)

assert.match(clickCollectPage, /shop_theme/)
assert.match(clickCollectPage, /var\(--se-color-primary\)/)
assert.match(clickCollectPage, /var\(--se-color-bg\)/)
```

- [ ] **Step 2: Run the failing focused test**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
```

Expected: FAIL until all targeted surfaces expose theme usage.

- [ ] **Step 3: Update `pages/menus.vue` priority hardcoded colors**

Replace the priority colors in scoped CSS:

```css
#1976d2 -> var(--se-color-primary)
#155fa8 -> var(--se-color-primary-hover)
#1769bd -> var(--se-color-primary-hover)
#e8f2ff -> var(--se-color-primary-soft)
#ffffff -> var(--se-color-surface)
#f8fafc -> var(--se-color-surface-muted)
#f3f5f8 -> var(--se-color-bg)
#dfe5ee -> var(--se-color-border)
#e8edf3 -> var(--se-color-border-soft)
#121826 -> var(--se-color-text)
#1f2933 -> var(--se-color-text-body)
#687386 -> var(--se-color-text-muted)
#64748b -> var(--se-color-text-muted)
#00e676 -> var(--se-color-success)
#ffa014 -> var(--se-color-warning)
#d83b3b -> var(--se-color-danger)
```

Leave product images and transparent overlays unchanged when they are not direct theme tokens.

- [ ] **Step 4: Update `pages/borne.vue` priority hardcoded colors**

Replace the same priority color set in the kiosk scoped CSS. Also replace active category button color binding:

```vue
:color="category.name === activeCategory ? 'primary' : 'grey lighten-3'"
```

with class-based styling:

```vue
:class="{ 'kiosk-category-button--active': category.name === activeCategory }"
```

Add CSS:

```css
.kiosk-category-button {
  background: var(--se-color-surface-muted) !important;
  color: var(--se-color-text-body) !important;
}

.kiosk-category-button--active {
  background: var(--se-color-primary) !important;
  color: var(--se-color-surface) !important;
}
```

- [ ] **Step 5: Update click-and-collect fallback shop info**

In `pages/click-and-collect/_shopId/_shopName.vue`, include the theme in the flat `shopInfo` computed object:

```js
shop_theme: this.$store.get('shop/shop_theme'),
```

Keep social action colors hardcoded because they are brand colors.

- [ ] **Step 6: Run focused frontend tests**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
node test/click-and-collect-page.test.js
node test/design-system.test.js
```

Expected: all PASS.

- [ ] **Step 7: Run frontend lint**

Run from `pos-app`:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Run a local smoke build**

Run from `pos-app`:

```bash
npm run build-local
```

Expected: PASS. If OpenSSL legacy/provider or local env issues appear, record the exact output.

- [ ] **Step 9: Commit Task 5**

Run from `pos-app`:

```bash
git add pages/menus.vue pages/borne.vue pages/click-and-collect/_shopId/_shopName.vue test/shop-themes.test.js
git commit -m "feat: theme public ordering surfaces"
```

---

### Task 6: End-to-End Verification

**Files:**
- Modify only if previous tasks reveal a bug.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified feature branch with backend and frontend commits.

- [ ] **Step 1: Check both git worktrees**

Run:

```bash
git -C ../express-pos status --short
git status --short
```

Expected: no uncommitted files from this feature. Unrelated pre-existing backend files may still appear if they were present before Task 1; do not modify them.

- [ ] **Step 2: Run backend focused verification**

Run from `../express-pos`:

```bash
node test/shop-theme.test.js
node test/shop-theme-contract.test.js
```

Expected: PASS.

- [ ] **Step 3: Run frontend focused verification**

Run from `pos-app`:

```bash
node test/shop-themes.test.js
node test/click-and-collect-page.test.js
node test/design-system.test.js
```

Expected: PASS.

- [ ] **Step 4: Run frontend lint**

Run from `pos-app`:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Manual browser smoke test**

Start the frontend:

```bash
npm run dev
```

Open the app at the Nuxt dev URL, then verify:

- Settings displays the "Theme du restaurant" card.
- The `Default` preset shows the current blue/white palette.
- Changing `primary` to `#123456` and saving sends `shop_theme` in the update request.
- Reloading settings keeps the saved color.
- `/menus` uses the saved primary color for active filters and checkout actions.
- `/click-and-collect/:shopId/:shopName` uses the saved primary color after public shop info loads.
- `/borne` uses the saved primary color for active categories and primary actions.

- [ ] **Step 6: Final feature commit if verification changes were needed**

If Task 6 required fixes, commit them from the relevant repo:

```bash
git add <changed-files>
git commit -m "fix: verify restaurant theme flow"
```

If Task 6 required no fixes, do not create an empty commit.
