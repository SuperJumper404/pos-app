const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const menusSource = fs.readFileSync(path.join(root, 'pages', 'menus.vue'), 'utf8')
const historyTicketSource = fs.readFileSync(
  path.join(root, 'pages', 'history', 'ticket', '_id.vue'),
  'utf8'
)
const paymentMethodsSource = fs.readFileSync(
  path.join(root, 'helpers', 'paymentMethods.js'),
  'utf8'
)
const dashboardSource = fs.readFileSync(
  path.join(root, 'helpers', 'listdashboard.js'),
  'utf8'
)
const packageJson = require('../package.json')
const expressStart = menusSource.indexOf('<div v-if="isLargeProductView"')
const expressEnd = menusSource.indexOf('<template v-else>', expressStart)
const expressSource = menusSource.slice(expressStart, expressEnd)
const cartStart = menusSource.indexOf('class="express-checkout"')
const cartEnd = menusSource.indexOf('class="express-payment-grid"', cartStart)
const expressCartSource = menusSource.slice(cartStart, cartEnd)
const tableDialogStart = menusSource.indexOf('v-model="expressTableDialog"')
const tableDialogEnd = menusSource.indexOf(
  'v-model="expressServiceDialog"',
  tableDialogStart
)
const tableDialogSource = menusSource.slice(tableDialogStart, tableDialogEnd)
const serviceDialogStart = menusSource.indexOf('v-model="expressServiceDialog"')
const serviceDialogEnd = menusSource.indexOf(
  'v-model="customizationDialog"',
  serviceDialogStart
)
const serviceDialogSource = menusSource.slice(serviceDialogStart, serviceDialogEnd)
const paymentDialogStart = menusSource.indexOf('v-model="expressPaymentDialog"')
const paymentDialogEnd = menusSource.indexOf(
  'v-model="expressReceiptDialog"',
  paymentDialogStart
)
const paymentDialogSource = menusSource.slice(paymentDialogStart, paymentDialogEnd)

assert.match(
  menusSource,
  /Vue express/,
  'admin menus must expose the express mode through the existing mode button'
)
assert.match(
  menusSource,
  /productViewMode:\s*'all'/,
  'admin menus must open in express mode by default'
)
assert.match(
  menusSource,
  /express-category-bar/,
  'express mode must keep categories as small rectangular choices at the top'
)
assert.match(
  menusSource,
  /express-workspace/,
  'express mode must use a stable workspace so only products scroll'
)
assert.match(
  menusSource,
  /:class="\{ 'menu-page-container--express': isLargeProductView \}"/,
  'express mode must remove container padding that wastes vertical space'
)
assert.match(
  menusSource,
  /:class="\{ 'menu-content-row--express': isLargeProductView \}"/,
  'express mode must remove the classic menu row spacing to use tablet height'
)
assert.match(
  menusSource,
  /\.menu-page-container--express[\s\S]*?padding-top:\s*0 !important[\s\S]*?padding-bottom:\s*0 !important/,
  'express mode must remove top and bottom container padding'
)
assert.match(
  menusSource,
  /\.menu-content-row--express[\s\S]*?margin-top:\s*0 !important/,
  'express mode must not keep top margin above the workspace'
)
assert.match(
  menusSource,
  /express-products-scroll/,
  'express products must have their own scroll area'
)
assert.match(
  menusSource,
  /\.express-products-scroll[\s\S]*?overflow-y:\s*auto/,
  'express product scroll area must scroll vertically by itself'
)
assert.match(
  menusSource,
  /\.express-workspace[\s\S]*?height:\s*calc\(100vh - 126px\)/,
  'express product workspace must use most of the viewport height'
)
assert.match(
  menusSource,
  /express-cart-card/,
  'express cart panel must have a fixed-height structure'
)
assert.match(
  menusSource,
  /express-cart-items-scroll/,
  'express cart items must have their own scroll area'
)
assert.match(
  menusSource,
  /\.express-cart-items-scroll[\s\S]*?overflow-y:\s*auto/,
  'express cart items must scroll without moving checkout actions'
)
assert.match(
  menusSource,
  /\.express-cart-card[\s\S]*?height:\s*calc\(100vh - 126px\) !important/,
  'express cart panel must use the same tall viewport height as products'
)
assert.match(
  menusSource,
  /\.express-checkout[\s\S]*?flex:\s*0 0 auto/,
  'express checkout actions must stay fixed under the cart scroll area'
)
assert.match(
  menusSource,
  /v-for="category in categories"[\s\S]*?setExpressCategory\(category\)/,
  'express mode must let staff jump between categories without accordions'
)
assert.match(
  menusSource,
  /expressTableDialog/,
  'express mode must open a tablet-friendly table picker dialog'
)
assert.match(
  menusSource,
  /openExpressTableDialog/,
  'express mode must expose a direct table picker action'
)
assert.match(
  menusSource,
  /expressServiceDialog/,
  'express mode must open a separate service picker dialog'
)
assert.match(
  menusSource,
  /openExpressServiceDialog/,
  'express mode must expose a direct service picker action'
)
assert.match(
  expressCartSource,
  /express-table-service-row[\s\S]*?selectedExpressTableName[\s\S]*?expressSelectedServiceLabel/,
  'express cart must show selected table and service side by side'
)
assert.match(
  expressCartSource,
  /express-table-button[\s\S]*?@click="openExpressTableDialog"[\s\S]*?express-service-button[\s\S]*?@click="openExpressServiceDialog"/,
  'express table and service buttons must open their own dialogs'
)
assert.match(
  menusSource,
  /expressSelectedServiceLabel\(\)[\s\S]*?expressIsTakeaway[\s\S]*?['"]À emporter['"][\s\S]*?['"]Sur place['"]/,
  'express service button must show the current service choice'
)
assert.match(
  menusSource,
  /selectExpressTable\(table\)[\s\S]*?this\.expressSelectedTable = table\.id[\s\S]*?this\.expressTableDialog = false/,
  'express table picker must select the tapped table immediately'
)
assert.match(
  menusSource,
  /selectExpressService\(value\)[\s\S]*?this\.setExpressTakeaway\(value\)[\s\S]*?this\.expressServiceDialog = false/,
  'express service picker must select the tapped service and close the service dialog'
)
assert.match(
  serviceDialogSource,
  /@click="selectExpressService\(false\)"[\s\S]*?Sur place[\s\S]*?@click="selectExpressService\(true\)"[\s\S]*?emporter/,
  'service choices in the service dialog must close automatically after tap'
)
assert.doesNotMatch(
  tableDialogSource,
  /express-service-tile|Sur place|emporter/,
  'table dialog must only contain table choices'
)
assert.match(
  menusSource,
  /express-table-tile/,
  'express table picker must render tables as large touch tiles'
)
assert.doesNotMatch(
  expressSource,
  /<v-select[\s\S]*?expressSelectedTable/,
  'express table selection must not use a dropdown'
)
assert.match(
  menusSource,
  /v-model="expressPhone"/,
  'express mode must allow optional customer phone entry'
)
assert.match(
  expressCartSource,
  /express-customer-fields[\s\S]*?v-model="expressCustomer"[\s\S]*?v-model="expressPhone"/,
  'express customer and phone fields must be stacked in the checkout panel'
)
assert.match(
  menusSource,
  /\.express-customer-fields[\s\S]*?grid-template-columns:\s*1fr/,
  'express customer and phone fields must use one vertical column'
)
assert.match(
  menusSource,
  /v-model="expressCustomer"[\s\S]*?prepend-inner-icon="mdi-account-outline"/,
  'express customer field must reuse a form-style icon'
)
assert.match(
  menusSource,
  /v-model="expressPhone"[\s\S]*?prepend-inner-icon="mdi-phone-outline"/,
  'express phone field must reuse a form-style icon'
)
assert.match(
  menusSource,
  /v-model="expressRemark"/,
  'express mode must let staff enter an optional order note'
)
assert.match(
  menusSource,
  /v-model="expressRemark"[\s\S]*?prepend-inner-icon="mdi-note-text-outline"/,
  'express order note field must reuse a form-style icon'
)
assert.match(
  menusSource,
  /customer: String\(this\.expressCustomer \|\| ''\)\.trim\(\) \|\| 'Client comptoir'/,
  'express customer name must fall back to Client comptoir instead of being required'
)
assert.match(
  menusSource,
  /buildExpressRemark\(\)/,
  'express checkout must submit the order note with the receipt choice'
)
assert.match(
  menusSource,
  /express-total-row/,
  'express checkout must show the current total before payment'
)
assert.match(
  menusSource,
  /formatCurrency\(total\)/,
  'express checkout total must use the shared currency formatter'
)
assert.match(
  menusSource,
  /checkoutCounterPayBefore/,
  'express mode must submit paid counter orders from the menu page'
)
assert.match(
  expressCartSource,
  /openExpressPaymentDialog[\s\S]*?Encaisser/,
  'express checkout panel must use one main cash-out button'
)
assert.doesNotMatch(
  expressCartSource,
  /submitExpressPayment\('Carte bancaire'\)|submitExpressPayLater/,
  'express checkout panel must not show payment method buttons directly'
)
assert.match(
  paymentDialogSource,
  /express-payment-grid[\s\S]*?v-for="method in expressPaymentMethods"[\s\S]*?submitExpressPayment\(method\.value\)[\s\S]*?submitExpressPayLater/,
  'express payment methods must live together in the cash-out dialog'
)
assert.match(
  paymentDialogSource,
  /Payer plus tard/,
  'express payment dialog must include the pay-later action'
)
assert.match(
  paymentDialogSource,
  /v-for="method in expressPaymentMethods"/,
  'express payment dialog must render configured payment methods'
)
assert.match(
  paymentDialogSource,
  /submitExpressPayment\(method\.value\)/,
  'express payment dialog must submit the configured payment method value'
)
assert.match(
  paymentMethodsSource,
  /Ticket resto/,
  'express mode must support restaurant tickets'
)
assert.match(
  menusSource,
  /selectExpressService\(false\)[\s\S]*?Sur place/,
  'express mode must offer a one-click sur place choice'
)
assert.match(
  menusSource,
  /selectExpressService\(true\)[\s\S]*?À emporter/,
  'express mode must offer a one-click takeaway choice'
)
assert.match(
  paymentMethodsSource,
  /Carte bancaire/,
  'express mode must offer direct card payment'
)
assert.match(
  serviceDialogSource,
  /express-service-grid[\s\S]*?Sur place[\s\S]*?(?:À|Ã€) emporter/,
  'dine-in/takeaway choice must live in the service dialog'
)
assert.doesNotMatch(
  expressCartSource,
  /express-choice-row/,
  'dine-in/takeaway choice must not take space in the checkout cart panel'
)
assert.match(
  paymentMethodsSource,
  /Chèque/,
  'express mode must offer direct cheque payment'
)
assert.match(
  paymentMethodsSource,
  /Espèces/,
  'express mode must offer direct cash payment'
)
assert.match(
  menusSource,
  /Payer plus tard/,
  'express mode must offer a pay-later counter action'
)
assert.match(
  menusSource,
  /submitExpressPayLater/,
  'express pay-later action must use a dedicated submit handler'
)
assert.match(
  menusSource,
  /payment:\s*'Paiement au comptoir'[\s\S]*?stripe:\s*false/,
  'express pay-later action must reuse the existing unpaid counter checkout flow'
)
assert.match(
  menusSource,
  /expressReceiptDialog/,
  'express payment must ask whether to print/give a receipt'
)
assert.match(
  menusSource,
  /express-receipt-grid/,
  'express receipt dialog must use large touch choices'
)
assert.match(
  menusSource,
  /Imprimer ticket/,
  'express receipt dialog must offer an explicit print ticket action'
)
assert.doesNotMatch(
  menusSource,
  /:loading="expressReceiptPrinting"/,
  'print receipt choice must keep its blue button color while the ticket prints'
)
assert.match(
  menusSource,
  /color="primary"[\s\S]*?v-if="expressReceiptPrinting"[\s\S]*?mdi-loading/,
  'print receipt choice must keep the primary button and show a manual spinner'
)
assert.match(
  menusSource,
  /mdi-loading[\s\S]*?Impression/,
  'print receipt choice must show an explicit loading icon and text after tap'
)
assert.doesNotMatch(
  menusSource,
  /waitForReceiptPrint\(\)[\s\S]*?setTimeout\(resolve,\s*5000\)/,
  'print receipt choice must not block the dialog with a five-second timeout'
)
assert.match(
  menusSource,
  /async confirmExpressReceipt\(wantsReceipt\)[\s\S]*?if \(this\.expressReceiptPrinting\) return/,
  'print receipt confirmation must ignore repeated taps while printing'
)
assert.doesNotMatch(
  menusSource,
  /<span>Pas de ticket<\/span>[\s\S]{0,250}:disabled="expressReceiptPrinting"/,
  'no-ticket choice must not be disabled by the print-loading state'
)
assert.doesNotMatch(
  menusSource,
  /Retour[\s\S]{0,250}:disabled="expressReceiptPrinting"/,
  'receipt dialog back action must not be disabled by the print-loading state'
)
assert.match(
  menusSource,
  /Pas de ticket/,
  'express receipt dialog must offer an explicit no-ticket action'
)
assert.match(
  menusSource,
  /confirmExpressReceipt\(true\)/,
  'express receipt dialog must provide a receipt choice'
)
assert.match(
  menusSource,
  /confirmExpressReceipt\(false\)/,
  'express receipt dialog must provide a no-receipt choice'
)
assert.match(
  menusSource,
  /express-choice-state/,
  'express dine-in/takeaway buttons must show which mode is selected'
)
assert.match(
  menusSource,
  /buildCashierReceiptPayload|sendCashierReceipt/,
  'express receipt printing must reuse the shared cashier receipt helper'
)
assert.match(
  menusSource,
  /async printExpressReceipt\(result, paymentMethod\)[\s\S]*?orders\/getAllOrder[\s\S]*?orders\/getDetailOrder/,
  'express receipt printing must reload the created order and its details'
)
assert.match(
  menusSource,
  /confirmExpressReceipt\(wantsReceipt\)[\s\S]*?printExpressReceipt\(result, paymentMethod\)/,
  'express receipt choice must trigger printing after checkout succeeds'
)
assert.doesNotMatch(
  menusSource,
  /Ticket de caisse demandé/,
  'receipt choice must not be stored as a fake order note'
)
assert.match(
  historyTicketSource,
  /buildCashierReceiptPayload|sendCashierReceipt/,
  'history receipt printing must use the shared cashier receipt helper'
)
assert.match(
  serviceDialogSource,
  /express-service-grid[\s\S]*?express-service-tile[\s\S]*?Sur place[\s\S]*?express-service-tile[\s\S]*?(?:À|Ã€|Ãƒâ‚¬) emporter/,
  'dine-in/takeaway choice must reuse the large two-tile modal style'
)
assert.match(
  menusSource,
  /Choisi/,
  'express dine-in/takeaway buttons must use clear selected-state text'
)
assert.match(
  menusSource,
  /@click="addToCart\(items\)"/,
  'express product tile click must add directly to cart'
)
assert.match(
  menusSource,
  /express-empty-cart/,
  'express cart must keep a visible empty-cart state on the side'
)
assert.match(
  menusSource,
  /\.express-category-btn[\s\S]*?min-height:\s*48px/,
  'express category filters must be large enough for tablet use'
)
assert.match(
  menusSource,
  /\.express-payment-grid ::v-deep \.v-btn[\s\S]*?min-height:\s*62px/,
  'express payment buttons must be large enough to avoid fat-finger mistakes'
)
assert.doesNotMatch(
  expressSource,
  /openProductPreview\(items\)/,
  'express product tile must not open the description preview'
)
assert.doesNotMatch(
  dashboardSource,
  /Comptoir express/,
  'Comptoir express must not be a separate admin navigation item'
)
assert.match(packageJson.scripts.test, /test\/admin-menu-express-checkout\.test\.js/)

console.log('admin menu express checkout tests passed')
