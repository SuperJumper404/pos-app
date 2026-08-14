# Receipt Shop Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional legal and customer-review settings to the shop and use them consistently in the cashier receipt preview and print outputs.

**Architecture:** Keep the existing `shop_adress`, `shop_siret`, printer, and VAT settings. Add only nullable shop fields for NAF, VAT number, and review QR configuration. Extend the shared cashier receipt payload so PDF, SmartPrint ESC/POS, cloud XML, and the settings preview consume the same normalized optional values; missing values produce no empty labels.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Node.js, Express, MySQL/dbmate, jsPDF, ESC/POS and Epson ePOS XML.

## Global Constraints

- Do not use the shop logo on receipts.
- Do not add configurable ticket formats.
- Do not add a footer message setting.
- Optional values must be omitted entirely when empty; never print an empty label.
- VAT rows, totals, item count, sale mode, payment method, order number, date, and seller come from the order/session and are not manually entered in shop settings.
- The cash register identifier uses the existing service point/order context when available; it is not a new shop-wide legal field.

---

### Task 1: Define failing receipt behavior tests

**Files:**
- Create: `test/receipt-settings.test.js`
- Modify: `test/receipt-printing.test.js`

**Interfaces:**
- Tests consume `buildCashierReceiptPayload`, `buildCashierEscPos`, `buildCashierCloudXml`, and the settings source.
- Tests produce the expected field names and omission rules for later implementation tasks.

- [ ] **Step 1: Write tests for optional shop fields and derived order fields**

Assert that the payload exposes `shop_naf`, `shop_vat_number`, `receipt_review_qr_url`, and `receipt_review_qr_label`; derives item count, sale mode, seller, cash register label, and VAT breakdown; and does not create display lines for empty optional values.

- [ ] **Step 2: Write tests for all printer renderers**

Build a payload containing NAF, VAT number, seller, cash register, takeaway mode, two VAT rates, and a review URL. Assert the ESC/POS and ePOS XML outputs contain those values, and assert an empty shop configuration omits `NAF`, `TVA`, `QR`, `Vendeur`, and `Caisse` labels.

- [ ] **Step 3: Run the focused tests and verify the expected failure**

Run `npm.cmd test -- --help` is not valid for this repository; instead run `node test/receipt-settings.test.js` and `node test/receipt-printing.test.js` from `pos-app`. The new test must fail because the receipt payload and settings fields do not exist yet.

---

### Task 2: Persist receipt settings in the backend

**Files:**
- Create: `express-pos/db/migrations/20260813100000_receipt_shop_settings.sql`
- Modify: `express-pos/src/controllers/c_shop.js`
- Modify: `express-pos/src/modules/m_shop.js`
- Create: `express-pos/test/receipt-shop-settings.test.js`

**Interfaces:**
- The API accepts and returns nullable `shop_naf`, `shop_vat_number`, `receipt_review_qr_url`, and `receipt_review_qr_label`.
- Existing shop update behavior remains backward compatible when those fields are absent.

- [ ] **Step 1: Write the backend contract test**

Assert the migration adds four nullable columns and that the controller/module source includes all four fields in create, read, and update mappings without adding logo, footer, postal-code, or city fields.

- [ ] **Step 2: Run the backend contract test and verify it fails**

Run `node test/receipt-shop-settings.test.js` from `express-pos`; it must fail on the missing migration and mappings.

- [ ] **Step 3: Add the dbmate migration**

Add nullable `VARCHAR(255)` columns for `shop_naf`, `shop_vat_number`, `receipt_review_qr_url`, and `receipt_review_qr_label`, with a down migration that drops exactly those columns.

- [ ] **Step 4: Extend shop create/read/update mappings**

Use empty-string-to-null normalization for optional values, preserve existing values when an update omits them, and expose them in the click-and-collect shop response as well.

- [ ] **Step 5: Run the backend focused tests**

Run `node test/receipt-shop-settings.test.js` and the existing shop/migration tests; all must pass.

---

### Task 3: Add the settings form and Vuex mappings

**Files:**
- Modify: `store/shop.js`
- Modify: `pages/settings.vue`
- Create: `test/receipt-settings-page.test.js`

**Interfaces:**
- Vuex exposes the four optional receipt fields through the existing `shop` module.
- Settings form binds and submits those fields through `shop/updateShopInfo`.

- [ ] **Step 1: Write the settings-page test**

Assert the form has inputs for NAF, VAT intracommunautaire, review URL, and review label; initializes them from Vuex; submits them; and contains no logo, footer, postal-code, city, or display-settings receipt controls.

- [ ] **Step 2: Run the test and verify it fails**

Run `node test/receipt-settings-page.test.js` from `pos-app` and confirm the new controls and store mappings are absent.

- [ ] **Step 3: Add Vuex state hydration and form bindings**

Add the four values to the shop state, load them from both shop endpoints, copy them into `formShop`, and submit them with the existing form payload.

- [ ] **Step 4: Add the optional settings UI**

Add a focused “Informations du ticket de caisse” section with four optional text inputs. Keep the existing shop logo uploader unchanged for the application, but do not mention or render it as a receipt setting.

- [ ] **Step 5: Add the direct receipt preview**

Render the normalized receipt preview using the same shared receipt data rules. The preview must update from the current form values and omit lines whose values are empty.

- [ ] **Step 6: Run focused frontend tests**

Run `node test/receipt-settings-page.test.js` and the existing settings/receipt tests.

---

### Task 4: Normalize and render the complete receipt

**Files:**
- Modify: `helpers/cashierReceipt.js`
- Modify: `pages/history/ticket/_id.vue`
- Modify: `pages/orders/detail/_id.vue`
- Modify: `pages/menus.vue`
- Modify: `pages/orders/index.vue` only if its cashier receipt path bypasses the shared helper
- Modify: `test/receipt-printing.test.js`

**Interfaces:**
- `buildCashierReceiptPayload(params)` returns optional `sellerName`, `cashRegisterNumber`, `saleMode`, and `itemCount` in addition to existing totals and VAT breakdown.
- `buildCashierReceiptPreview(payload)` returns printable receipt lines without empty optional labels.
- `buildCashierEscPos(payload)` and `buildCashierCloudXml(payload)` consume the normalized payload and emit the same information.

- [ ] **Step 1: Implement payload normalization**

Derive the seller from `taken_by_name`, `prepared_by_name`, `seller_name`, or `username`; derive item count from detail quantities; map `is_takeaway` to `À emporter` and otherwise use `Sur place`, while preserving `Click & Collect` when the service point is identified as click-collect; use an explicit order/service-point cash register number when available.

- [ ] **Step 2: Implement optional line helpers**

Add a small helper that only returns a labelled line when its value is non-empty. Apply it to shop NAF, VAT number, SIRET, seller, cash register, and QR configuration. Never emit empty labels.

- [ ] **Step 3: Add item count, sale mode, seller, and cash register output**

Place these after the order header and before the product list. Keep VAT breakdown dynamic, with one row per rate.

- [ ] **Step 4: Add QR output**

Emit the configured review label and QR destination for cloud ePOS XML and SmartPrint ESC/POS using the printer’s native QR command. Omit both when the URL is empty.

- [ ] **Step 5: Align history PDF and direct preview**

Use the shared payload values in the history PDF and the settings preview, preserving the existing thermal-ticket dimensions and avoiding any logo/footer output.

- [ ] **Step 6: Run the receipt tests and verify they pass**

Run `node test/receipt-settings.test.js`, `node test/receipt-printing.test.js`, and the existing order/history printing tests.

---

### Task 5: Database and full verification

**Files:**
- Modify: `test/receipt-shop-settings.test.js` if migration assertions need the applied schema contract.

- [ ] **Step 1: Apply the Docker-local migration**

Run `npm.cmd run db:up:docker-local` from `express-pos` and verify the new migration is applied against the Docker database.

- [ ] **Step 2: Run backend verification**

Run `npm.cmd test` from `express-pos`.

- [ ] **Step 3: Run frontend verification**

Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build-local` from `pos-app`.

- [ ] **Step 4: Review the final diff**

Run `git diff --check` in both repositories and verify that no logo, footer, postal-code, city, or receipt-display-settings fields were added.
