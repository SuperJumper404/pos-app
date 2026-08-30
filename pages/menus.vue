<template>
  <v-container
    :class="{
      'menu-page-container--express': isLargeProductView,
      'menu-page-container--client': isClientMenuView,
    }"
  >
    <v-alert :value="alert" :type="alertType" dismissible>{{
      alertText
    }}</v-alert>
    <v-alert
      v-if="isKitchenClosed && !isOrderEditActive"
      dense
      text
      type="warning"
    >
      La cuisine est fermée. Aucune nouvelle commande possible.
    </v-alert>
    <button
      v-if="isClientMenuView"
      class="client-service-banner"
      type="button"
      @click="openClientServiceDialog"
    >
      <span class="client-service-icon">
        <v-icon color="primary" size="32">
          {{ clientIsTakeaway ? 'mdi-shopping-outline' : 'mdi-table-chair' }}
        </v-icon>
      </span>
      <span class="client-service-copy">
        <strong>{{ clientServiceTitle }}</strong>
        <span v-if="clientServiceSubtitle">{{ clientServiceSubtitle }}</span>
      </span>
      <v-icon color="primary" class="client-service-chevron">
        mdi-chevron-down
      </v-icon>
    </button>
    <v-row
      class="menu-content-row mt-5"
      :class="{ 'menu-content-row--express': isLargeProductView }"
    >
      <v-col v-if="loadPage" sm="7" md="8" cols="12">
        <v-card outlined height="425px" class="overflow-y-auto">
          <Loading />
        </v-card>
      </v-col>
      <v-col v-else sm="7" md="8" cols="12">
        <v-card
          v-if="dataProduct.length === 0"
          outlined
          height="425px"
          class="overflow-y-auto"
        >
          <v-card-text class="text-center" style="margin-top: 25vh">
            <v-icon large>mdi-emoticon-sad-outline</v-icon>
            <p>Menu vide</p>
          </v-card-text>
        </v-card>
        <v-card v-else class="menu-panel-card">
          <div
            v-if="isLargeProductView && !isOrderEditActive"
            class="express-workspace"
          >
            <div v-if="isAdminView" class="express-command-bar">
              <div class="express-filter-row">
                <v-btn
                  depressed
                  class="express-filter-button express-all-chip text-none"
                  :class="{
                    'express-filter-button--active': !activeExpressCategory,
                    'express-all-chip--active': !activeExpressCategory,
                  }"
                  @click="setExpressCategory(null)"
                >
                  All
                </v-btn>
                <v-btn
                  v-for="category in categories"
                  :key="category"
                  depressed
                  class="express-filter-button express-category-btn text-none"
                  :class="{
                    'express-filter-button--active':
                      category === activeExpressCategory,
                  }"
                  @click="setExpressCategory(category)"
                >
                  {{ category }}
                </v-btn>
              </div>
              <div class="express-command-actions">
                <v-tooltip bottom>
                  <template #activator="{ on, attrs }">
                    <v-btn
                      icon
                      outlined
                      class="express-command-button"
                      to="/orders"
                      aria-label="Voir les commandes"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <v-icon class="express-command-icon express-command-icon--orders">
                        mdi-order-bool-descending
                      </v-icon>
                    </v-btn>
                  </template>
                  <span>Commandes</span>
                </v-tooltip>
                <v-tooltip bottom>
                  <template #activator="{ on, attrs }">
                    <v-btn
                      icon
                      outlined
                      class="express-command-button"
                      to="/cashregister"
                      aria-label="Ouvrir le tiroir caisse"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <v-icon class="express-command-icon express-command-icon--cash">
                        mdi-cash-register
                      </v-icon>
                    </v-btn>
                  </template>
                  <span>Tiroir caisse</span>
                </v-tooltip>
              </div>
            </div>
            <div class="express-products-scroll">
              <div class="product-grid product-grid--large">
                <div
                  v-for="items in expressProducts"
                  :key="items.id"
                  class="product-grid-col"
                >
                  <v-card
                    outlined
                    class="
                      d-flex
                      flex-column
                      product-card
                      product-card--compact
                      product-clickable
                    "
                    @click="addToCart(items)"
                  >
                    <v-img
                      :src="productImageSrc(items.image)"
                      :aspect-ratio="1"
                      class="product-card-image rounded-t"
                      @click.stop="addToCart(items)"
                    />

                    <v-card-title class="product-card-title py-2 pb-0 mb-0">
                      <div class="product-card-title-text font-weight-bold">
                        {{ items.name }}
                      </div>
                    </v-card-title>

                    <v-card-text class="product-card-content pt-0 mb-0 pb-2">
                      <div class="product-card-price font-weight-bold">
                        <span
                          v-if="
                            items.minimum_commandable_price != null &&
                            parsePrice(items.minimum_commandable_price) >
                              parsePrice(items.price)
                          "
                        >
                          À partir de
                          {{ formatCurrency(items.minimum_commandable_price) }}
                        </span>
                        <span v-else>{{ formatCurrency(items.price) }}</span>
                      </div>
                      <div
                        v-if="items.customization_available === false"
                        class="error--text text-caption mt-1"
                      >
                        {{ customizationUnavailableReason(items) }}
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </div>
          </div>

          <template v-else>
            <div
              class="mobile-category-view"
              :class="{
                'd-sm-none': !isClientMenuView,
                'client-category-view': isClientMenuView,
              }"
            >
              <div
                class="client-category-nav"
                role="navigation"
                aria-label="Categories du menu"
              >
                <v-btn
                  icon
                  outlined
                  class="client-category-arrow"
                  aria-label="Categorie precedente"
                  @click="scrollMobileCategories(-1)"
                >
                  <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <div ref="mobileCategoryBar" class="mobile-category-bar">
                  <v-chip
                    v-for="category in categories"
                    :key="category"
                    class="mobile-category-chip"
                    :class="{
                      'mobile-category-chip--active':
                        category === activeMobileCategory,
                    }"
                    :outlined="false"
                    :text-color="
                      category === activeMobileCategory ? 'white' : '#121826'
                    "
                    label
                    small
                    @click="scrollToMobileCategory(category)"
                  >
                    <v-avatar
                      v-if="categoryImage(category)"
                      left
                      size="28"
                      class="mobile-category-image"
                    >
                      <v-img
                        :src="categoryImageSrc(categoryImage(category))"
                        :alt="category"
                      />
                    </v-avatar>
                    {{ category }}
                  </v-chip>
                </div>
                <v-btn
                  icon
                  outlined
                  class="client-category-arrow"
                  aria-label="Categorie suivante"
                  @click="scrollMobileCategories(1)"
                >
                  <v-icon>mdi-arrow-right</v-icon>
                </v-btn>
              </div>

              <div ref="mobileCategoryProducts" class="mobile-category-products">
                <section
                  v-for="category in categories"
                  :key="category"
                  :ref="`mobileCategory-${category}`"
                  class="mobile-category-section"
                >
                  <h3 class="mobile-category-title">
                    {{ category }}
                  </h3>
                  <div class="product-grid">
                  <div
                    v-for="items in productsByCategory[category] || []"
                    :key="items.id"
                    class="product-grid-col"
                  >
                    <v-card
                      outlined
                      class="d-flex flex-column product-card product-clickable"
                      :class="{
                        'product-card--client': isClientMenuView,
                        'product-card--in-cart':
                          productCartQuantity(items) > 0,
                      }"
                      @click="openProductPreview(items)"
                    >
                      <!-- Image -->
                      <v-img
                        :src="productImageSrc(items.image)"
                        :aspect-ratio="4 / 3"
                        class="product-card-image rounded-t"
                        @click.stop="openProductPreview(items)"
                      />
                      <div
                        v-if="isClientMenuView && productCartQuantity(items) > 0"
                        class="client-product-quantity"
                      >
                        {{ productCartQuantity(items) }}
                      </div>

                      <!-- Title -->
                      <v-card-title class="product-card-title py-2 pb-0 mb-0">
                        <div class="product-card-title-text font-weight-bold">
                          {{ items.name }}
                        </div>
                      </v-card-title>

                      <!-- Text -->
                      <v-card-text class="product-card-content pt-0 mb-0 pb-1">
                        <div class="text--secondary line-clamp-2">
                          {{ items.description }}
                        </div>

                        <div class="product-card-price font-weight-bold">
                          <span
                            v-if="
                              items.minimum_commandable_price != null &&
                              parsePrice(items.minimum_commandable_price) >
                                parsePrice(items.price)
                            "
                          >
                            À partir de
                            {{
                              formatCurrency(items.minimum_commandable_price)
                            }}
                          </span>
                          <span v-else>{{ formatCurrency(items.price) }}</span>
                        </div>
                        <div
                          v-if="items.customization_available === false"
                          class="error--text text-caption mt-1"
                        >
                          {{ customizationUnavailableReason(items) }}
                        </div>
                      </v-card-text>

                      <!-- Actions always bottom -->
                      <v-card-actions
                        class="product-card-actions px-4 pt-1 pb-3"
                      >
                        <v-btn
                          color="success"
                          small
                          block
                          :disabled="
                            (isKitchenClosed && !isOrderEditActive) ||
                            items.customization_available === false
                          "
                          class="text-none font-weight-bold"
                          @click.stop="addToCart(items)"
                        >
                          <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
                          Ajouter
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </div>
                  </div>
                </section>
              </div>
            </div>

            <v-expansion-panels v-if="!isClientMenuView" class="d-none d-sm-block">
              <v-expansion-panel v-for="(category, i) in categories" :key="i">
                <v-expansion-panel-header
                  ><h3>{{ category }}</h3></v-expansion-panel-header
                >
                <v-expansion-panel-content>
                  <div class="product-grid">
                    <div
                      v-for="items in productsByCategory[category] || []"
                      :key="items.id"
                      class="product-grid-col"
                    >
                      <v-card
                        outlined
                        class="d-flex flex-column product-card product-clickable"
                        @click="openProductPreview(items)"
                      >
                        <!-- Image -->
                        <v-img
                          :src="productImageSrc(items.image)"
                          :aspect-ratio="4 / 3"
                          class="product-card-image rounded-t"
                          @click.stop="openProductPreview(items)"
                        />

                        <!-- Title -->
                        <v-card-title class="product-card-title py-2 pb-0 mb-0">
                          <div class="product-card-title-text font-weight-bold">
                            {{ items.name }}
                          </div>
                        </v-card-title>

                        <!-- Text -->
                        <v-card-text class="product-card-content pt-0 mb-0 pb-1">
                          <div class="text--secondary line-clamp-2">
                            {{ items.description }}
                          </div>

                          <div class="product-card-price font-weight-bold">
                            <span
                              v-if="
                                items.minimum_commandable_price != null &&
                                parsePrice(items.minimum_commandable_price) >
                                  parsePrice(items.price)
                              "
                            >
                              À partir de
                              {{
                                formatCurrency(items.minimum_commandable_price)
                              }}
                            </span>
                            <span v-else>{{
                              formatCurrency(items.price)
                            }}</span>
                          </div>
                          <div
                            v-if="items.customization_available === false"
                            class="error--text text-caption mt-1"
                          >
                            {{ customizationUnavailableReason(items) }}
                          </div>
                        </v-card-text>

                        <!-- Actions always bottom -->
                        <v-card-actions
                          class="product-card-actions px-4 pt-1 pb-3"
                        >
                          <v-btn
                            color="success"
                            small
                            block
                            :disabled="
                              (isKitchenClosed && !isOrderEditActive) ||
                              items.customization_available === false
                            "
                            class="text-none font-weight-bold"
                            @click.stop="addToCart(items)"
                          >
                            <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
                            Ajouter
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </div>
                  </div>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
        </v-card>
        <!-- <pre type="json">{{ dataProduct }}</pre> -->
        <!-- <v-card outlined max-height="150px;">
                    <v-img
                      height="100px"
                      :src="`${staticURL}/api/v1/imgproducts/${items.image}`"
                    ></v-img>
                    <v-card-title class="mb-n5">
                      <h6
                        class="text-truncate"
                        style="font-weight: bold; font-size: large"
                      >
                        {{ items.name }}
                      </h6>
                    </v-card-title>
                    <v-card-text class="mb-n5">
                      <p
                        style="
                          border: none;
                          margin: inherit;
                          height: 50px;
                          overflow: auto;
                          overflow-x: hidden;
                        "
                      >
                        {{ items.description }}
                      </p>
                      <br />
                      <span
                        class="mb-2"
                        style="font-weight: bold; font-size: medium"
                        >{{ formatCurrency(items.price) }}</span
                      >
                    </v-card-text>
                    <v-card-actions>
                      <v-btn
                        color="success"
                        small
                        width="100%"
                        class="text-none"
                        @click="addToCart(items)"
                        >Add</v-btn
                      >
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </div>
          
        </v-card> -->
      </v-col>
      <v-col
        sm="5"
        md="4"
        cols="12"
        :class="{ 'd-none d-sm-block': isClientMenuView }"
      >
        <!-- <v-col md="4" class="d-none d-sm-none d-md-block"> -->
        <v-card v-if="loadPage" outlined height="425px">
          <Loading />
        </v-card>
        <div v-else>
          <v-card
            ref="expressCartCard"
            outlined
            height="100%"
            class="pa-2 menu-panel-card"
            :class="{ 'express-cart-card': isLargeProductView }"
            tabindex="-1"
          >
            <div
              v-if="isLargeProductView && !isOrderEditActive"
              class="express-cart-summary"
            >
              <div class="express-cart-summary-meta">
                {{ idxCart }} article{{ idxCart > 1 ? 's' : '' }}
              </div>
              <div
                v-if="canUseLargeProductView && !isOrderEditActive"
                class="menu-panel-actions"
              >
                <v-btn
                  icon
                  outlined
                  class="menu-panel-cart-button"
                  aria-label="Ouvrir le panier"
                  @click.stop="openCart"
                >
                  <v-icon small>mdi-cart-outline</v-icon>
                </v-btn>
              </div>
            </div>
            <div
              v-if="isClientMenuView && !isOrderEditActive"
              class="client-cart-summary"
            >
              <div>
                <strong>Votre panier</strong>
                <span>
                  {{ idxCart }} article{{ idxCart > 1 ? 's' : '' }}
                </span>
              </div>
              <v-icon color="primary">mdi-cart-outline</v-icon>
            </div>
            <div class="express-cart-items-scroll">
            <div
              v-if="cartItem.length === 0"
              class="express-empty-cart text-center"
            >
              <div>
                <v-icon size="90">mdi-room-service-outline</v-icon>
                <p class="font-weight-bold">Votre assiette est vide !</p>
              </div>
            </div>
            <div v-else height="100%">
              <v-card
                v-for="(itm, itemIndex) in cartItem"
                :key="itm.configurationSignature || `${itm.id}-${itemIndex}`"
                outlined
                class="cart-item-card d-flex mb-2 flex-column"
                rounded="7"
              >
                <v-row
                  class="
                    cart-item-row
                    d-flex
                    align-center
                    flex-nowrap
                    mr-2
                    ml-2
                    mt-2
                  "
                  no-gutters
                >
                  <!-- Left block: avatar + texts -->
                  <v-col
                    class="cart-item-info d-flex align-center"
                    :class="{
                      'cart-item-info--editable': (
                        itm.customization_steps || []
                      ).length,
                    }"
                    :role="
                      (itm.customization_steps || []).length ? 'button' : null
                    "
                    :tabindex="
                      (itm.customization_steps || []).length ? 0 : null
                    "
                    @click="editCartLine(itemIndex)"
                    @keydown.enter.prevent="editCartLine(itemIndex)"
                  >
                    <v-avatar
                      size="64"
                      rounded
                      tile
                      class="cart-item-avatar mr-2"
                    >
                      <v-img
                        class="rounded-lg"
                        :src="productImageSrc(itm.image)"
                      />
                    </v-avatar>

                    <div class="cart-item-text">
                      <div
                        class="cart-item-name text-truncate font-weight-bold"
                      >
                        {{ itm.name }}
                      </div>
                      <div class="cart-item-price font-weight-bold">
                        {{ formatCurrency(itm.price) }}
                      </div>
                    </div>
                  </v-col>

                  <!-- Right block: actions -->
                  <v-col
                    class="cart-item-actions d-flex align-center justify-end"
                    cols="auto"
                  >
                    <v-btn
                      class="cart-action-btn"
                      outlined
                      color="warning"
                      small
                      icon
                      @click="minusBtn(itm, itemIndex)"
                    >
                      <v-icon>mdi-minus</v-icon>
                    </v-btn>

                    <v-btn
                      class="cart-qty-btn mx-1"
                      color="success"
                      fab
                      small
                      dark
                      depressed
                      elevation="0"
                    >
                      {{ itm.qty }}
                    </v-btn>

                    <v-btn
                      class="cart-action-btn"
                      outlined
                      color="success"
                      small
                      icon
                      @click="plusBtn(itm, itemIndex)"
                    >
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>

                <div
                  v-if="cartLineCustomizationGroups(itm).length"
                  class="cart-item-customizations"
                >
                  <div
                    v-for="group in cartLineCustomizationGroups(itm)"
                    :key="group.stepId || group.stepName"
                    class="cart-item-customization-row"
                  >
                    <span class="cart-item-customization-step">
                      {{ group.stepName }}
                    </span>
                    <span class="cart-item-customization-choice">
                      {{
                        group.choices.map((choice) => choice.name).join(', ')
                      }}
                    </span>
                  </div>
                </div>
              </v-card>
            </div>
            </div>
            <div
              v-if="isLargeProductView && !isOrderEditActive && cartItem.length > 0"
              class="express-checkout"
            >
              <div class="express-table-service-row">
                <v-btn
                  class="express-table-button text-none justify-start"
                  color="grey lighten-3"
                  depressed
                  @click="openExpressTableDialog"
                >
                  <v-icon left>mdi-table-chair</v-icon>
                  {{ selectedExpressTableName }}
                </v-btn>
                <v-btn
                  class="express-service-button text-none justify-start"
                  color="grey lighten-3"
                  depressed
                  @click="openExpressServiceDialog"
                >
                  <v-icon left>
                    {{
                      expressIsTakeaway
                        ? 'mdi-shopping-outline'
                        : 'mdi-storefront-outline'
                    }}
                  </v-icon>
                  {{ expressSelectedServiceLabel }}
                </v-btn>
              </div>
              <div class="express-customer-fields">
                <v-text-field
                  v-model="expressCustomer"
                  dense
                  outlined
                  hide-details
                  label="Client"
                  placeholder="Optionnel"
                  prepend-inner-icon="mdi-account-outline"
                />
                <v-text-field
                  v-model="expressPhone"
                  dense
                  outlined
                  hide-details
                  label="Téléphone"
                  placeholder="Optionnel"
                  prepend-inner-icon="mdi-phone-outline"
                />
              </div>
              <v-textarea
                v-model="expressRemark"
                class="express-note-field"
                dense
                outlined
                hide-details
                rows="2"
                auto-grow
                label="Note commande"
                placeholder="Optionnel"
                prepend-inner-icon="mdi-note-text-outline"
              />
              <div class="express-checkout-actions">
                <v-btn
                  color="success"
                  class="express-cashout-button text-none font-weight-bold"
                  :disabled="expressSubmitDisabled"
                  depressed
                  @click="openExpressPaymentDialog"
                >
                  <span class="express-cashout-label">
                    <v-icon left>mdi-cash-register</v-icon>
                    Encaisser
                  </span>
                  <span class="express-cashout-total">
                    {{ formatCurrency(total) }}
                  </span>
                </v-btn>
              </div>
            </div>
            <v-card-actions
              v-if="
                cartItem.length > 0 &&
                (!isLargeProductView ||
                  (embeddedOrderEdit && isOrderEditActive))
              "
              class="cart-order-actions"
            >
              <v-btn
                color="primary"
                class="
                  cart-order-btn cart-order-btn--submit
                  text-none
                  font-weight-bold
                "
                @click="btnOrder"
              >
                <span class="cart-order-btn__label">
                  {{ isClientMenuView ? 'Voir ma commande' : 'Commander' }}
                </span>
                <span
                  v-if="embeddedOrderEdit && isOrderEditActive"
                  class="cart-order-btn__total"
                >
                  {{ formatCurrency(total) }}
                </span>
                <v-icon small right>mdi-silverware-fork-knife</v-icon>
              </v-btn>
              <v-btn
                color="red lighten-1"
                class="cart-order-btn cart-order-btn--cancel text-none"
                dark
                @click="btnCancel"
                >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
              >
            </v-card-actions>
          </v-card>
        </div>
      </v-col>
    </v-row>
    <div
      v-if="isClientMenuView && cartItem.length > 0"
      class="client-mobile-checkout d-sm-none"
    >
      <v-btn
        block
        depressed
        class="client-mobile-checkout-button text-none"
        :class="{ 'client-mobile-checkout-button--pulse': clientCartPulse }"
        :disabled="isKitchenClosed && !isOrderEditActive"
        @click="btnOrder"
      >
        <span class="client-mobile-checkout-count">
          <v-icon color="white">mdi-shopping-outline</v-icon>
          {{ idxCart }}
        </span>
        <span class="client-mobile-checkout-label">Voir ma commande</span>
        <strong>{{ formatCurrency(total) }}</strong>
      </v-btn>
    </div>

    <v-dialog v-model="previewDialog" max-width="620">
      <v-card v-if="previewItem" class="product-preview-card">
        <v-btn
          class="product-preview-close"
          color="white"
          elevation="3"
          fab
          small
          aria-label="Fermer"
          @click="closeProductPreview"
        >
          <v-icon color="grey darken-3">mdi-close</v-icon>
        </v-btn>

        <v-img
          :src="productImageSrc(previewItem.image)"
          max-height="420"
          contain
          class="grey lighten-4"
        />

        <v-card-text class="pt-4">
          <div class="text-h6 font-weight-bold mb-2">
            {{ previewItem.name }}
          </div>
          <div class="text-body-2 text--secondary mb-3">
            {{ previewItem.description }}
          </div>
          <div class="text-h6 font-weight-bold">
            {{ formatCurrency(previewItem.price) }}
          </div>
        </v-card-text>

        <v-card-actions class="justify-center px-4 py-4">
          <v-btn
            color="success"
            class="text-none font-weight-bold"
            :disabled="
              (isKitchenClosed && !isOrderEditActive) ||
              previewItem.customization_available === false
            "
            @click="addPreviewItemToCart"
          >
            <v-icon class="mr-1">mdi-plus-circle-outline</v-icon>
            Ajouter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="!isOrderEditActive"
      v-model="expressPaymentDialog"
      max-width="640"
    >
      <v-card>
        <v-card-title>Encaisser</v-card-title>
        <v-card-text>
          <div class="express-payment-total mb-4">
            <div class="d-flex justify-space-between">
              <span>Total à payer</span>
              <strong>{{ formatCurrency(expressCheckoutTotal) }}</strong>
            </div>
            <div
              v-if="expressDiscountType !== 'none'"
              class="d-flex justify-space-between warning--text"
            >
              <span>Remise appliquée</span>
              <strong>
                - {{ formatCurrency(total - expressCheckoutTotal) }}
              </strong>
            </div>
          </div>
          <div class="express-payment-grid">
            <v-btn
              v-for="method in expressPaymentMethods"
              :key="method.value"
              color="success"
              class="express-payment-tile text-none font-weight-bold"
              :disabled="expressSubmitDisabled"
              :loading="expressPaymentLoading === method.value"
              depressed
              @click="submitExpressPayment(method.value)"
            >
              <v-icon class="mb-2">{{ method.icon }}</v-icon>
              <span>{{ method.text }}</span>
            </v-btn>
            <v-btn
              color="primary"
              class="express-payment-tile text-none font-weight-bold"
              :disabled="expressSubmitDisabled"
              :loading="expressPaymentLoading === 'Paiement au comptoir'"
              depressed
              @click="submitExpressPayLater"
            >
              <v-icon class="mb-2">mdi-clock-outline</v-icon>
              <span>Payer plus tard</span>
            </v-btn>
            <v-btn
              color="warning"
              class="express-payment-tile text-none font-weight-bold"
              :disabled="expressSubmitDisabled"
              depressed
              @click="openExpressDiscountDialog"
            >
              <v-icon class="mb-2">mdi-tag-percent-outline</v-icon>
              <span>{{ expressDiscountLabel }}</span>
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="pt-0">
          <v-spacer />
          <v-btn text class="text-none" @click="expressPaymentDialog = false">
            Retour
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="!isOrderEditActive"
      v-model="expressDiscountDialog"
      max-width="520"
    >
      <v-card>
        <v-card-title>Remise globale</v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-3">
            La remise s'applique à toute la commande.
          </div>
          <v-btn-toggle
            v-model="expressDiscountDraftType"
            mandatory
            color="primary"
            class="d-flex mb-4"
          >
            <v-btn value="percent" class="flex-grow-1 text-none">
              Pourcentage
            </v-btn>
            <v-btn value="amount" class="flex-grow-1 text-none">
              Montant en euros
            </v-btn>
          </v-btn-toggle>
          <div v-if="expressDiscountDraftType === 'percent'" class="d-flex flex-wrap">
            <v-btn
              v-for="percentage in expressDiscountPercentages"
              :key="percentage"
              outlined
              color="primary"
              class="mr-2 mb-2 text-none"
              @click="expressDiscountDraftValue = percentage"
            >
              {{ percentage }} %
            </v-btn>
          </div>
          <v-text-field
            v-model="expressDiscountDraftValue"
            :label="expressDiscountDraftType === 'percent' ? 'Pourcentage' : 'Montant de la remise'"
            :suffix="expressDiscountDraftType === 'percent' ? '%' : '€'"
            type="number"
            min="0"
            step="0.01"
            outlined
            autofocus
          ></v-text-field>
          <div class="express-discount-preview">
            <div class="d-flex justify-space-between">
              <span>Total avant remise</span>
              <strong>{{ formatCurrency(total) }}</strong>
            </div>
            <div class="d-flex justify-space-between warning--text">
              <span>Remise</span>
              <strong>- {{ formatCurrency(expressDiscountPreview.amount) }}</strong>
            </div>
            <div class="d-flex justify-space-between text-h6 mt-2">
              <span>Total à payer</span>
              <strong>{{ formatCurrency(expressDiscountPreview.total) }}</strong>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn text class="text-none" @click="clearExpressDiscount">
            Supprimer
          </v-btn>
          <v-spacer />
          <v-btn
            text
            class="text-none"
            @click="expressPaymentDialog = true; expressDiscountDialog = false"
          >
            Annuler
          </v-btn>
          <v-btn color="primary" class="text-none" @click="applyExpressDiscount">
            Appliquer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="!isOrderEditActive"
      v-model="expressReceiptDialog"
      max-width="560"
      persistent
    >
      <v-card>
        <v-card-title>Ticket de caisse</v-card-title>
        <v-card-text>
          <div class="express-receipt-grid">
            <v-btn
              class="express-receipt-tile text-none"
              color="primary"
              :disabled="expressReceiptPrinting"
              depressed
              dark
              @click="confirmExpressReceipt(true)"
            >
              <template v-if="expressReceiptPrinting">
                <v-icon class="mb-2 mdi-spin">mdi-loading</v-icon>
                <span>Impression...</span>
              </template>
              <template v-else>
                <v-icon class="mb-2">mdi-printer-outline</v-icon>
                <span>Imprimer ticket</span>
              </template>
            </v-btn>
            <v-btn
              class="express-receipt-tile text-none"
              color="grey lighten-3"
              depressed
              @click="confirmExpressReceipt(false)"
            >
              <v-icon class="mb-2">mdi-receipt-text-remove-outline</v-icon>
              <span>Pas de ticket</span>
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="pt-0">
          <v-spacer />
          <v-btn
            text
            class="text-none"
            @click="expressReceiptDialog = false"
          >
            Retour
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="isClientMenuView"
      v-model="clientServiceDialog"
      max-width="520"
      persistent
    >
      <v-card class="client-service-dialog">
        <v-card-title>Sur place ou a emporter</v-card-title>
        <v-card-text>
          <div class="client-service-grid">
            <v-btn
              class="client-service-tile text-none"
              :class="{ 'client-service-tile--active': !clientIsTakeaway }"
              :color="!clientIsTakeaway ? 'primary' : 'grey lighten-3'"
              :dark="!clientIsTakeaway"
              depressed
              @click="selectClientService('dine_in')"
            >
              <v-icon class="mb-2" size="34">mdi-table-chair</v-icon>
              <span>Sur place</span>
            </v-btn>
            <v-btn
              class="client-service-tile text-none"
              :class="{ 'client-service-tile--active': clientIsTakeaway }"
              :color="clientIsTakeaway ? 'primary' : 'grey lighten-3'"
              :dark="clientIsTakeaway"
              depressed
              @click="selectClientService('takeaway')"
            >
              <v-icon class="mb-2" size="34">mdi-shopping-outline</v-icon>
              <span>A emporter</span>
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="expressTableDialog" max-width="720">
      <v-card>
        <v-card-title>Choisir la table</v-card-title>
        <v-card-text>
          <div class="express-table-grid">
            <v-btn
              v-for="table in dataTables"
              :key="table.id"
              class="express-table-tile text-none"
              :color="
                String(expressSelectedTable) === String(table.id)
                  ? 'primary'
                  : 'grey lighten-3'
              "
              :dark="String(expressSelectedTable) === String(table.id)"
              depressed
              @click="selectExpressTable(table)"
            >
              <v-icon class="mb-2">mdi-table-chair</v-icon>
              <span>{{ table.name }}</span>
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="expressServiceDialog" max-width="560">
      <v-card>
        <v-card-title>Sur place ou à emporter</v-card-title>
        <v-card-text>
          <div class="express-service-grid">
            <v-btn
              class="express-service-tile text-none"
              :class="{ 'express-service-tile--active': !expressIsTakeaway }"
              :color="!expressIsTakeaway ? 'primary' : 'grey lighten-3'"
              :dark="!expressIsTakeaway"
              depressed
              @click="selectExpressService(false)"
            >
              <v-icon class="mb-2">mdi-storefront-outline</v-icon>
              <span>
                Sur place
                <small v-if="!expressIsTakeaway" class="express-choice-state">
                  Choisi
                </small>
              </span>
            </v-btn>
            <v-btn
              class="express-service-tile text-none"
              :class="{ 'express-service-tile--active': expressIsTakeaway }"
              :color="expressIsTakeaway ? 'primary' : 'grey lighten-3'"
              :dark="expressIsTakeaway"
              depressed
              @click="selectExpressService(true)"
            >
              <v-icon class="mb-2">mdi-shopping-outline</v-icon>
              <span>
                À emporter
                <small v-if="expressIsTakeaway" class="express-choice-state">
                  Choisi
                </small>
              </span>
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="customizationDialog"
      content-class="customization-dialog"
      max-width="920"
      persistent
    >
      <ProductCustomizationWizard
        v-if="selectedItem"
        v-model="selectedChoiceIds"
        :product="selectedItem"
        @confirm="confirmCustomization"
        @cancel="closeCustomizationWizard"
      />
    </v-dialog>
    <!-- <pre>{{ dataProduct }}</pre> -->
    <!-- <pre>server{{ mainconfig.default.server }}</pre> -->
    <!-- <pre>{{ breakpoint }}</pre> -->
    <!-- <pre>acces :{{ access }}</pre>
    <pre>ici {{ itemDialog }}</pre> -->
    <v-snackbar
      v-model="kitchenClosedSnackbar"
      color="warning"
      timeout="4500"
      top
    >
      {{ kitchenClosedMessage }}
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="kitchenClosedSnackbar = false">
          Fermer
        </v-btn>
      </template>
    </v-snackbar>
    <v-snackbar
      v-model="cartAddSnackbar"
      color="success"
      timeout="2200"
      bottom
    >
      <v-icon left>mdi-cart-check</v-icon>
      {{ cartAddSnackbarText }}
      <template #action="{ attrs }">
        <v-btn text v-bind="attrs" @click="openCart">Voir le panier</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import ProductCustomizationWizard from '@/components/products/ProductCustomizationWizard'
import price from '@/helpers/price'
import {
  groupCustomizationSelections,
  mergeConfiguredCartLine,
  replaceConfiguredCartLine,
} from '@/helpers/customizations'
import {
  buildCashierReceiptPayload,
  sendCashierReceipt,
} from '@/helpers/cashierReceipt'
import { getPaymentMethodOptions } from '@/helpers/paymentMethods'
import { calculateDiscount } from '@/helpers/discount'
// import * as config from '@/nuxt.config'
export default {
  components: {
    Loading,
    ProductCustomizationWizard,
  },
  mixins: [price],
  async beforeRouteLeave(to, from, next) {
    if (
      this.isOrderEditActive &&
      this.orderEditDirty &&
      !this.allowRouteLeave
    ) {
      if (!window.confirm('Quitter sans enregistrer les modifications ?')) {
        next(false)
        return
      }
      await this.$store.dispatch('orderEdit/cancel')
      next()
      return
    }
    next()
  },
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  props: {
    embeddedOrderEdit: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    customizationDialog: false,
    previewDialog: false,
    previewItem: null,
    selectedItem: null,
    selectedChoiceIds: [],
    editingCartIndex: null,
    // config: config,
    alert: null,
    alertType: null,
    alertText: null,
    dialog: false,
    loadPage: false,
    kitchenClosedSnackbar: false,
    kitchenClosedMessage:
      'La cuisine est fermée. Aucune nouvelle commande possible.',
    cartAddSnackbar: false,
    cartAddSnackbarText: 'Produit ajouté au panier',
    cartItem: [],
    total: 0,
    idxCart: 0,
    clientCartPulse: false,
    clientCartPulseTimer: null,
    allowRouteLeave: false,
    productViewMode: 'all',
    activeMobileCategory: null,
    clientServiceDialog: false,
    clientServiceMode: 'dine_in',
    activeExpressCategory: null,
    expressSelectedTable: parseInt(localStorage.getItem('service_point_id')) || null,
    expressCustomer: '',
    expressPhone: '',
    expressRemark: '',
    expressIsTakeaway: false,
    expressPaymentLoading: null,
    expressPaymentDialog: false,
    expressDiscountDialog: false,
    expressDiscountType: 'none',
    expressDiscountValue: 0,
    expressDiscountDraftType: 'percent',
    expressDiscountDraftValue: 0,
    expressReceiptDialog: false,
    expressReceiptPrinting: false,
    expressTableDialog: false,
    expressServiceDialog: false,
    pendingExpressPaymentMethod: null,
  }),

  computed: {
    categories() {
      const items = this.dataProduct
        .map((x) => String(x.category || '').trim())
        .filter(Boolean)
      return [...new Set(items)]
    },
    categoryImages() {
      return this.dataProduct.reduce((images, product) => {
        const category = String(product.category || '').trim()
        if (!category || images[category]) return images
        images[category] = product.category_image || product.categoryImage || ''
        return images
      }, {})
    },
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    dataProduct() {
      return this.$store
        .get('products/dataProduct')
        .filter((x) => x.archived === 0 && !this.isProductHidden(x))
    },
    dataTables() {
      return this.$store.get('servicePoints/items') || []
    },
    productsByCategory() {
      return this.dataProduct.reduce((groups, product) => {
        const category = product.category
        if (!groups[category]) groups[category] = []
        groups[category].push(product)
        return groups
      }, {})
    },
    totalPage() {
      return this.$store.get('products/totalPage')
    },
    stateDialog() {
      return this.$store.get('stateDialog')
    },
    isKitchenClosed() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/kitchen_closed')
      )
    },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_siret: this.$store.get('shop/shop_siret'),
        shop_naf: this.$store.get('shop/shop_naf'),
        shop_vat_number: this.$store.get('shop/shop_vat_number'),
        receipt_review_qr_url: this.$store.get('shop/receipt_review_qr_url'),
        receipt_review_qr_label: this.$store.get('shop/receipt_review_qr_label'),
        cash_register_number: this.$store.get('shop/cash_register_number'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_printer_ip: this.$store.get('shop/shop_printer_ip'),
        smart_print_app: this.$store.get('shop/smart_print_app'),
        activate_tva: this.$store.get('shop/activate_tva'),
      }
    },
    clientOrderStatus() {
      return this.$store.get('cart/clientOrderStatus') || 'idle'
    },
    clientOrderOrderId() {
      return this.$store.get('cart/clientOrderOrderId') || null
    },
    hasUnsafeCheckoutAttempt() {
      return (
        Boolean(this.clientOrderOrderId) ||
        ['pending', 'uncertain', 'stripe_prepared'].includes(
          this.clientOrderStatus
        )
      )
    },
    isOrderEditActive() {
      return this.$store.get('orderEdit/active') === true
    },
    orderEditDirty() {
      return this.$store.get('orderEdit/dirty') === true
    },
    isAdminView() {
      const user = this.$store.get('users/user') || {}
      const storedAccess = process.client ? localStorage.getItem('access') : null
      const access = user.access === undefined ? storedAccess : user.access
      return Number(access) === 0
    },
    isClientMenuView() {
      return !this.isAdminView && !this.isOrderEditActive
    },
    clientIsTakeaway() {
      return this.clientServiceMode === 'takeaway'
    },
    selectedClientTable() {
      const storedTable = process.client
        ? localStorage.getItem('service_point_id')
        : null
      const selectedId =
        (this.$store.get('users/user') || {}).service_point_id || storedTable
      return (
        this.dataTables.find((table) => {
          return String(table.id) === String(selectedId)
        }) || null
      )
    },
    clientServiceTitle() {
      return this.clientIsTakeaway ? 'A emporter' : 'Sur place'
    },
    clientServiceSubtitle() {
      if (this.clientIsTakeaway) return ''
      const tableName =
        (this.selectedClientTable && this.selectedClientTable.name) ||
        (process.client ? localStorage.getItem('service_point_name') : '') ||
        ''
      return tableName ? `Table ${tableName}` : 'Table'
    },
    isLargeProductView() {
      return this.canUseLargeProductView && this.productViewMode === 'all'
    },
    canUseLargeProductView() {
      return this.isAdminView && this.$vuetify.breakpoint.smAndUp
    },
    expressProducts() {
      if (!this.activeExpressCategory) return this.dataProduct
      return this.dataProduct.filter(
        (product) => product.category === this.activeExpressCategory
      )
    },
    selectedExpressTable() {
      return (
        this.dataTables.find((table) => {
          return String(table.id) === String(this.expressSelectedTable)
        }) || null
      )
    },
    selectedExpressTableName() {
      if (this.selectedExpressTable) return this.selectedExpressTable.name
      return 'Choisir une destination'
    },
    expressSelectedServiceLabel() {
      return this.expressIsTakeaway ? 'À emporter' : 'Sur place'
    },
    expressPaymentMethods() {
      return getPaymentMethodOptions(
        this.$store.get('shop/shop_payment_methods')
      )
    },
    expressDiscountPercentages() {
      return (
        this.$store.get('shop/shop_discount_percentages') || [5, 10, 15, 20]
      )
    },
    expressDiscountPreview() {
      return calculateDiscount({
        subtotal: this.total,
        type: this.expressDiscountDraftType,
        value: this.expressDiscountDraftValue,
      })
    },
    expressCheckoutTotal() {
      return calculateDiscount({
        subtotal: this.total,
        type: this.expressDiscountType,
        value: this.expressDiscountValue,
      }).total
    },
    expressDiscountLabel() {
      if (this.expressDiscountType === 'percent') {
        return `Remise ${this.expressDiscountValue} %`
      }
      if (this.expressDiscountType === 'amount') {
        return `Remise ${this.formatCurrency(this.expressDiscountValue)}`
      }
      return 'Remise'
    },
    expressSubmitDisabled() {
      return (
        this.isKitchenClosed ||
        this.expressPaymentLoading !== null ||
        this.cartItem.length === 0 ||
        !this.expressSelectedTable
      )
    },
  },
  watch: {
    dataTables(points) {
      if (!this.expressSelectedTable && Array.isArray(points)) {
        const counter = points.find((point) => point.system_key === 'counter')
        if (counter) this.expressSelectedTable = counter.id
      }
    },
    categories() {
      this.ensureActiveMobileCategory()
      if (typeof this.ensureActiveExpressCategory === 'function') {
        this.ensureActiveExpressCategory()
      }
    },
  },
  async mounted() {
    this.loadPage = true
    if (this.isClientMenuView) {
      if (!this.loadClientServiceChoice()) {
        this.resetClientServiceChoice()
      }
    }

    if (this.isOrderEditActive) {
      this.cartItem = JSON.parse(
        JSON.stringify(this.$store.get('cart/dataCart') || [])
      )
      this.total = Number(this.$store.get('cart/totalCart') || 0)
      this.idxCart = Number(this.$store.get('cart/indexCart') || 0)
      await Promise.all([
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('shop/getCurrentShopInfo'),
        this.$store.dispatch('servicePoints/getAll'),
      ])
      if (typeof this.ensureActiveMobileCategory === 'function') {
        this.ensureActiveMobileCategory()
      }
      if (typeof this.ensureActiveExpressCategory === 'function') {
        this.ensureActiveExpressCategory()
      }
      this.loadPage = false
      return
    }

    if (this.hasUnsafeCheckoutAttempt) {
      this.restorePersistedCheckoutCart()
      this.loadPage = false
      this.$router.replace('/cart')
      return
    }

    const shouldResetRejectedCheckout = [
      'prewrite_rejected',
      'reprice_required',
    ].includes(this.clientOrderStatus)

    if (shouldResetRejectedCheckout) {
      await this.$store.dispatch('cart/abandonCheckout', { safe: true })
    }

    const existingCart = shouldResetRejectedCheckout
      ? null
      : this.$store.get('cart/dataCart')
    if (Array.isArray(existingCart) && existingCart.length > 0) {
      this.restorePersistedCheckoutCart()
    } else {
      this.cartItem = []
    }

    const calls = [
      this.$store.dispatch('products/getProducts'),
      this.$store.dispatch('shop/getCurrentShopInfo'),
      this.$store.dispatch('servicePoints/getAll'),
    ]
    if (!Array.isArray(existingCart) || existingCart.length === 0) {
      calls.push(
        this.$store.dispatch('cart/setTotal', 0),
        this.$store.dispatch('cart/setIndex', 0),
        this.$store.dispatch('cart/setTocart', null)
      )
    }
    Promise.all(calls).finally(() => {
      if (typeof this.ensureActiveMobileCategory === 'function') {
        this.ensureActiveMobileCategory()
      }
      if (typeof this.ensureActiveExpressCategory === 'function') {
        this.ensureActiveExpressCategory()
      }
      this.loadPage = false
    })
  },
  beforeDestroy() {
    if (this.clientCartPulseTimer) {
      clearTimeout(this.clientCartPulseTimer)
    }
  },

  methods: {
    ensureActiveMobileCategory() {
      if (!this.categories.length) {
        this.activeMobileCategory = null
        return
      }
      if (!this.categories.includes(this.activeMobileCategory)) {
        this.activeMobileCategory = this.categories[0]
      }
    },
    setActiveMobileCategory(category) {
      this.activeMobileCategory = category
    },
    resetClientServiceChoice() {
      this.clientServiceMode = 'dine_in'
      this.persistClientServiceChoice()
      this.clientServiceDialog = true
    },
    loadClientServiceChoice() {
      if (!process.client) return false
      const storedMode = localStorage.getItem('client_service_mode')
      if (!['dine_in', 'takeaway'].includes(storedMode)) return false

      this.clientServiceMode = storedMode
      this.clientServiceDialog = false
      return true
    },
    openClientServiceDialog() {
      this.clientServiceDialog = true
    },
    selectClientService(mode) {
      this.clientServiceMode = mode === 'takeaway' ? 'takeaway' : 'dine_in'
      this.persistClientServiceChoice()
      this.clientServiceDialog = false
    },
    persistClientServiceChoice() {
      if (!process.client) return
      localStorage.setItem(
        'client_service_mode',
        this.clientIsTakeaway ? 'takeaway' : 'dine_in'
      )
    },
    scrollMobileCategories(direction) {
      const scroller = this.$refs.mobileCategoryBar
      if (!scroller) return
      const distance = Math.max(160, scroller.clientWidth * 0.7)
      if (typeof scroller.scrollBy === 'function') {
        scroller.scrollBy({
          left: direction * distance,
          behavior: 'smooth',
        })
        return
      }
      scroller.scrollLeft += direction * distance
    },
    scrollToMobileCategory(category) {
      this.setActiveMobileCategory(category)
      this.$nextTick(() => {
        const target = this.$refs[`mobileCategory-${category}`]
        const element = Array.isArray(target) ? target[0] : target
        const scroller = this.$refs.mobileCategoryProducts
        if (!element) {
          return
        }
        if (this.isClientMenuView) {
          const stickyOffset = this.$vuetify.breakpoint.xsOnly ? 74 : 92
          const top =
            element.getBoundingClientRect().top +
            window.pageYOffset -
            stickyOffset
          window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' })
          return
        }
        if (!scroller) {
          return
        }
        const top =
          element.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop
        if (typeof scroller.scrollTo === 'function') {
          scroller.scrollTo({ top, behavior: 'smooth' })
          return
        }
        scroller.scrollTop = top
      })
    },
    cartLineCustomizationGroups(item) {
      return groupCustomizationSelections(
        item && (item.selections || item.customizationList)
      )
    },
    productCartQuantity(product) {
      const productId = product && product.id
      return this.cartItem.reduce((sum, line) => {
        return String(line.id) === String(productId)
          ? sum + Number(line.qty || 0)
          : sum
      }, 0)
    },
    restorePersistedCheckoutCart() {
      const payload = this.$store.get('cart/clientOrderPayload') || {}
      const persistedCart = Array.isArray(payload.dataCart)
        ? payload.dataCart
        : this.$store.get('cart/dataCart')
      this.cartItem = Array.isArray(persistedCart)
        ? JSON.parse(JSON.stringify(persistedCart))
        : []
      this.total = Number(
        payload.expected_total == null
          ? this.$store.get('cart/totalCart') || 0
          : payload.expected_total
      )
      this.idxCart = this.cartItem.reduce(
        (sum, line) => sum + Number(line.qty || line.quantity || 0),
        0
      )
      this.$store.dispatch('cart/setTocart', this.cartItem)
      this.$store.dispatch('cart/setTotal', this.total)
      this.$store.dispatch('cart/setIndex', this.idxCart)
    },
    openProductPreview(item) {
      this.previewItem = item
      this.previewDialog = true
    },
    closeProductPreview() {
      this.previewDialog = false
    },
    productImageSrc(image) {
      const fileName = image || 'default.png'
      return `${this.staticURL}/api/v1/imgproducts/${fileName}`
    },
    categoryImage(category) {
      return this.categoryImages[String(category || '').trim()] || ''
    },
    categoryImageSrc(image) {
      return `${this.staticURL}/api/v1/imgcategories/${image}`
    },
    addPreviewItemToCart() {
      if (!this.previewItem) return

      const item = this.previewItem
      this.previewDialog = false
      this.addToCart(item)
    },
    closeCustomizationWizard() {
      this.customizationDialog = false
      this.selectedItem = null
      this.selectedChoiceIds = []
      this.editingCartIndex = null
    },
    editCartLine(lineIndex) {
      const line = this.cartItem[lineIndex]
      if (!line || !(line.customization_steps || []).length) return

      this.editingCartIndex = lineIndex
      this.selectedItem = { ...line }
      this.selectedChoiceIds = [...(line.selectedChoiceIds || [])]
      this.customizationDialog = true
    },
    confirmCustomization(customization) {
      if (!this.selectedItem) return

      const isEditing = Number.isInteger(this.editingCartIndex)
      const sourceLine = isEditing ? this.cartItem[this.editingCartIndex] : null
      if (isEditing && !sourceLine) {
        this.closeCustomizationWizard()
        return
      }
      const qty = sourceLine ? Number(sourceLine.qty || 1) : 1
      const price = this.roundPrice(customization.unitPrice)
      const selections = (customization.selections || []).map((selection) => ({
        ...selection,
      }))
      const line = {
        ...this.selectedItem,
        selectedChoiceIds: [...(customization.selectedChoiceIds || [])],
        selections,
        customizationList: selections.map((selection) => ({
          ...selection,
          name: selection.choice_name || selection.name,
          price: selection.extra_price,
        })),
        price,
        qty,
        subtotal: this.roundPrice(price * qty),
      }
      this.cartItem = sourceLine
        ? replaceConfiguredCartLine(this.cartItem, this.editingCartIndex, line)
        : mergeConfiguredCartLine(this.cartItem, line)
      this.closeCustomizationWizard()
      this.totalPrice()
      this.indexCart()
      if (!isEditing) {
        this.showCartAddFeedback(line)
      }
    },
    customizationUnavailableReason(product) {
      const reason = product && product.customization_unavailable_reason
      if (typeof reason === 'string' && reason.trim()) return reason
      if (reason && reason.code === 'INSUFFICIENT_AVAILABLE_CHOICES') {
        return `Choix disponibles insuffisants (${Number(
          reason.available_choice_count || 0
        )}/${Number(reason.minimum_choices || 0)}).`
      }
      return 'La personnalisation requise est indisponible.'
    },
    change() {
      this.dialog = this.stateDialog
    },
    toggleProductViewMode() {
      this.productViewMode = this.isLargeProductView ? 'categories' : 'all'
    },
    ensureActiveExpressCategory() {
      if (!this.categories.length) {
        this.activeExpressCategory = null
        return
      }
      if (
        this.activeExpressCategory &&
        !this.categories.includes(this.activeExpressCategory)
      ) {
        this.activeExpressCategory = null
      }
    },
    setExpressCategory(category) {
      this.activeExpressCategory = category
    },
    openExpressTableDialog() {
      this.expressTableDialog = true
    },
    openExpressServiceDialog() {
      this.expressServiceDialog = true
    },
    openExpressPaymentDialog() {
      if (this.isOrderEditActive) return
      if (this.expressSubmitDisabled) return
      this.expressPaymentDialog = true
    },
    openExpressDiscountDialog() {
      if (this.isOrderEditActive) return
      this.expressDiscountDraftType =
        this.expressDiscountType === 'none'
          ? 'percent'
          : this.expressDiscountType
      this.expressDiscountDraftValue =
        this.expressDiscountType === 'none' ? 0 : this.expressDiscountValue
      this.expressPaymentDialog = false
      this.expressDiscountDialog = true
    },
    applyExpressDiscount() {
      if (this.isOrderEditActive) return
      const preview = this.expressDiscountPreview
      if (!preview.value || !preview.amount) {
        this.clearExpressDiscount()
        return
      }
      this.expressDiscountType = preview.type
      this.expressDiscountValue = preview.value
      this.expressDiscountDialog = false
      this.expressPaymentDialog = true
    },
    clearExpressDiscount({ reopenPaymentDialog = true } = {}) {
      this.expressDiscountType = 'none'
      this.expressDiscountValue = 0
      this.expressDiscountDraftValue = 0
      this.expressDiscountDialog = false
      if (reopenPaymentDialog) this.expressPaymentDialog = true
    },
    selectExpressTable(table) {
      if (!table) return
      this.expressSelectedTable = table.id
      this.expressTableDialog = false
    },
    selectExpressService(value) {
      this.setExpressTakeaway(value)
      this.expressServiceDialog = false
    },
    setExpressTakeaway(value) {
      this.expressIsTakeaway = value === true
    },
    isProductHidden(product) {
      return [true, 1, '1'].includes(product.is_hidden)
    },
    totalPrice() {
      this.total = this.cartItem.reduce((sum, el) => {
        return this.roundPrice(sum + this.parsePrice(el.subtotal))
      }, 0)
      this.$store.dispatch('cart/setTotal', this.total)
      this.$store.dispatch(
        'cart/setTocart',
        this.cartItem.length > 0 ? this.cartItem : null
      )
      if (this.isOrderEditActive) {
        this.$store.dispatch('orderEdit/updateDirty', this.cartItem)
      }
    },
    indexCart() {
      this.idxCart = this.cartItem.reduce(
        (total, item) => total + Number(item.qty || 0),
        0
      )
      this.$store.dispatch('cart/setIndex', this.idxCart)
    },
    showAlert(text, type) {
      this.alert = true
      this.alertText = text
      this.alertType = type
      window.scrollTo(0, 0)
      setTimeout(() => {
        this.alert = null
      }, 5000)
    },
    showKitchenClosedSnackbar() {
      this.kitchenClosedSnackbar = true
    },
    showCartAddFeedback() {
      this.cartAddSnackbarText = 'Produit ajouté au panier'
      this.cartAddSnackbar = true
      if (this.isClientMenuView) {
        this.clientCartPulse = false
        if (this.clientCartPulseTimer) clearTimeout(this.clientCartPulseTimer)
        this.$nextTick(() => {
          this.clientCartPulse = true
          this.clientCartPulseTimer = setTimeout(() => {
            this.clientCartPulse = false
          }, 420)
        })
      }
    },
    addToCart(params) {
      if (this.isKitchenClosed && !this.isOrderEditActive) {
        this.showKitchenClosedSnackbar()
        return
      }

      if (params.customization_available === false) {
        this.showAlert(this.customizationUnavailableReason(params), 'error')
        return
      }

      if (Number(params.stock) < 1) {
        this.showAlert('Produit non disponible', 'error')
        return
      }

      if ((params.customization_steps || []).length > 0) {
        this.selectedItem =
          this.dataProduct.find((product) => product.id === params.id) || params
        this.selectedChoiceIds = []
        this.customizationDialog = true
        return
      }

      const price = this.roundPrice(params.price)
      this.cartItem = mergeConfiguredCartLine(this.cartItem, {
        ...params,
        selectedChoiceIds: [],
        selections: [],
        customizationList: [],
        price,
        subtotal: price,
        qty: 1,
      })
      this.totalPrice()
      this.indexCart()
      this.showCartAddFeedback(params)
    },
    minusBtn(params, index) {
      const item = this.cartItem[index]
      if (!item) return

      if (item.qty <= 1) {
        this.cartItem = this.cartItem.filter((_, itemIndex) => {
          return itemIndex !== index
        })
      } else {
        const nextQty = Number(item.qty || 0) - 1
        this.cartItem = this.cartItem.map((cartLine, itemIndex) => {
          if (itemIndex !== index) return cartLine
          return {
            ...cartLine,
            qty: nextQty,
            subtotal: this.roundPrice(nextQty * this.parsePrice(cartLine.price)),
          }
        })
      }

      this.totalPrice()
      this.indexCart()
    },
    plusBtn(params, index) {
      const item = this.cartItem[index]
      if (!item) return

      const nextQty = Number(item.qty || 0) + 1
      this.cartItem = this.cartItem.map((cartLine, itemIndex) => {
        if (itemIndex !== index) return cartLine
        return {
          ...cartLine,
          qty: nextQty,
          subtotal: this.roundPrice(nextQty * this.parsePrice(cartLine.price)),
        }
      })
      // this.cartItem.forEach((e) => {
      //   if (e.id === params.id) {
      //     e.qty += 1
      //     e.subtotal = e.qty * e.price
      //     if (e.qty > e.stock) {
      //       e.qty = e.stock
      //       e.subtotal = e.stock * e.price
      //     }
      //   }
      // })
      this.totalPrice()
      this.indexCart()
    },
    deleteBtn(params) {
      const newData = this.cartItem.filter((item) => {
        return item.id !== params.id
      })
      this.cartItem = newData
      if (this.cartItem.length === 0) {
        this.cartItem = []
        this.$store.dispatch('cart/setTotal', 0)
        this.$store.dispatch('cart/setIndex', 0)
      }
      this.totalPrice()
      this.indexCart()
    },
    openCart() {
      if (this.embeddedOrderEdit && this.isOrderEditActive) {
        this.$emit('show-cart')
        return
      }
      this.$router.push('/cart')
    },
    async btnOrder() {
      if (this.isKitchenClosed && !this.isOrderEditActive) {
        this.showKitchenClosedSnackbar()
        return
      }

      if (this.hasUnsafeCheckoutAttempt) {
        this.restorePersistedCheckoutCart()
        this.openCart()
        return
      }

      if (
        ['prewrite_rejected', 'reprice_required'].includes(
          this.clientOrderStatus
        )
      ) {
        await this.$store.dispatch('cart/abandonCheckout', { safe: true })
      }

      this.$store.dispatch('cart/setTocart', this.cartItem)
      this.allowRouteLeave = true
      this.openCart()
    },
    clearMenuCart() {
      this.cartItem = []
      this.total = 0
      this.idxCart = 0
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
      this.$store.dispatch('cart/setTocart', null)
    },
    submitExpressPayment(paymentMethod) {
      if (this.isOrderEditActive) return
      if (this.expressSubmitDisabled) return
      this.pendingExpressPaymentMethod = paymentMethod
      this.expressPaymentDialog = false
      this.expressReceiptDialog = true
    },
    async submitExpressPayLater() {
      if (this.isOrderEditActive) return
      if (this.expressSubmitDisabled) return
      const paymentMethod = 'Paiement au comptoir'
      this.expressPaymentDialog = false
      this.expressPaymentLoading = paymentMethod
      const result = await this.$store.dispatch('cart/checkoutOrder', {
        customer: String(this.expressCustomer || '').trim() || 'Client comptoir',
        servicePointId: this.expressSelectedTable,
        total: this.roundPrice(this.expressCheckoutTotal),
        discountType: this.expressDiscountType,
        discountValue: this.expressDiscountValue,
        payment: 'Paiement au comptoir',
        remark: this.buildExpressRemark(),
        phone: String(this.expressPhone || '').trim(),
        isTakeaway: this.expressIsTakeaway,
        dataCart: this.cartItem,
        stripe: false,
      })
      this.expressPaymentLoading = null
      if (!result || !result.ok) {
        const message =
          result && result.error && result.error.message
            ? result.error.message
            : 'Impossible d’envoyer la commande.'
        this.showAlert(message, 'error')
        return
      }
      this.clearMenuCart()
      this.expressCustomer = ''
      this.expressPhone = ''
      this.expressRemark = ''
      this.clearExpressDiscount({ reopenPaymentDialog: false })
      this.expressIsTakeaway = false
      this.$store.dispatch(
        'notifications/success',
        'Commande envoyée, paiement à encaisser plus tard.'
      )
    },
    buildExpressRemark() {
      const remarks = []
      const orderNote = String(this.expressRemark || '').trim()
      if (orderNote) remarks.push(orderNote)
      return remarks.join('\n')
    },
    async printExpressReceipt(result, paymentMethod) {
      const orderId = result && result.data && result.data.orderId
      if (!orderId) {
        throw new Error('La commande est introuvable pour l’impression.')
      }

      const [orderLoaded, detailsLoaded] = await Promise.all([
        this.$store.dispatch('orders/getAllOrder'),
        this.$store.dispatch('orders/getDetailOrder', orderId),
      ])
      if (!orderLoaded || !detailsLoaded) {
        throw new Error('Impossible de récupérer les données du ticket.')
      }

      const orders = this.$store.get('orders/dataOrders') || []
      const order = orders.find((item) => String(item.id) === String(orderId))
      if (!order) {
        throw new Error('La commande créée est introuvable.')
      }

      const payload = buildCashierReceiptPayload({
        order,
        details: this.$store.get('orders/detailOrder') || [],
        shopInfo: this.shopInfo,
        fallbackPaymentMethod: paymentMethod,
        fallbackCustomer:
          String(this.expressCustomer || '').trim() || 'Client comptoir',
        fallbackTable: this.selectedExpressTableName,
        fallbackRemark: this.expressRemark,
      })

      return sendCashierReceipt({
        payload,
        smartPrint: this.shopInfo.smart_print_app,
        printerIp: this.shopInfo.shop_printer_ip,
        dispatch: this.$store.dispatch,
      })
    },
    async confirmExpressReceipt(wantsReceipt) {
      if (this.isOrderEditActive) return
      if (this.expressReceiptPrinting) return
      const paymentMethod = this.pendingExpressPaymentMethod
      if (wantsReceipt) {
        this.expressReceiptPrinting = true
      }
      this.expressReceiptDialog = false
      this.pendingExpressPaymentMethod = null
      if (!paymentMethod || this.expressSubmitDisabled) {
        this.expressReceiptPrinting = false
        return
      }
      this.expressPaymentLoading = paymentMethod
      const result = await this.$store.dispatch('cart/checkoutCounterPayBefore', {
        customer: String(this.expressCustomer || '').trim() || 'Client comptoir',
        servicePointId: this.expressSelectedTable,
        total: this.roundPrice(this.expressCheckoutTotal),
        discountType: this.expressDiscountType,
        discountValue: this.expressDiscountValue,
        payment: paymentMethod,
        remark: this.buildExpressRemark(),
        phone: String(this.expressPhone || '').trim(),
        isTakeaway: this.expressIsTakeaway,
        dataCart: this.cartItem,
      })
      if (result && result.ok && wantsReceipt) {
        this.printExpressReceipt(result, paymentMethod).catch(() => {})
      }
      this.expressPaymentLoading = null
      this.expressReceiptPrinting = false
      if (!result || !result.ok) {
        const message =
          result && result.error && result.error.message
            ? result.error.message
            : 'Impossible d’envoyer la commande.'
        this.showAlert(message, 'error')
        return
      }
      this.clearMenuCart()
      this.expressCustomer = ''
      this.expressPhone = ''
      this.expressRemark = ''
      this.clearExpressDiscount({ reopenPaymentDialog: false })
      this.expressIsTakeaway = false
      this.$store.dispatch(
        'notifications/success',
        'Commande encaissée et envoyée en attente.'
      )
    },
    async btnCancel() {
      if (this.isOrderEditActive) {
        if (this.embeddedOrderEdit) {
          this.$emit('request-close')
          return
        }
        if (!window.confirm('Annuler les modifications de cette commande ?')) {
          return
        }
        const orderId = this.$store.get('orderEdit/orderId')
        await this.$store.dispatch('orderEdit/cancel')
        this.allowRouteLeave = true
        this.$router.push(`/orders/detail/${orderId}`)
        return
      }
      this.clearMenuCart()
    },
    pageProduct() {
      this.$store.dispatch('products/getProducts')
    },
  },
}
</script>
<style scoped>
.box {
  border: 1px solid #eeeeee;
}

.line-clamp-2 {
  display: -webkit-box;
  height: 2.7em;
  line-height: 1.35;
  margin-top: 6px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-clickable {
  cursor: pointer;
}

.menu-panel-actions {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-left: auto;
  min-width: 0;
}

.menu-panel-cart-button {
  background: #ffffff !important;
  border-color: #dfe5ee !important;
  color: #121826 !important;
  height: 40px !important;
  min-width: 40px !important;
  width: 40px !important;
}

.menu-panel-cart-button:hover,
.menu-panel-cart-button:focus-visible {
  background: #f8fafc !important;
  border-color: #1976d2 !important;
  color: #1976d2 !important;
}

.product-grid {
  --product-card-min-width: 200px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--product-card-min-width), 1fr)
  );
}

.product-grid--large {
  --product-card-min-width: 150px;
  gap: 12px;
}

.menu-page-container--client {
  background: #f6f8fb;
  max-width: none;
  padding-top: 0 !important;
}

.client-service-banner {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e1e7ef;
  border-radius: 8px;
  color: #121826;
  cursor: pointer;
  display: flex;
  gap: 14px;
  margin: 10px auto 0;
  max-width: 1180px;
  min-height: 72px;
  padding: 12px 18px;
  text-align: left;
  width: 100%;
}

.client-service-banner:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.28);
  outline-offset: 2px;
}

.client-service-icon {
  align-items: center;
  background: #e8f2ff;
  border-radius: 8px;
  display: inline-flex;
  flex: 0 0 auto;
  height: 48px;
  justify-content: center;
  width: 48px;
}

.client-service-copy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.client-service-copy strong {
  font-size: 1.25rem;
  font-weight: 900;
  line-height: 1.15;
  text-transform: uppercase;
}

.client-service-copy span {
  color: rgba(18, 24, 38, 0.68);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
  margin-top: 4px;
}

.client-service-chevron {
  flex: 0 0 auto;
}

.client-cart-summary {
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid #e8edf3;
  color: #121826;
  display: flex;
  justify-content: space-between;
  margin: -8px -8px 12px;
  min-height: 58px;
  padding: 12px 16px;
}

.client-cart-summary div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.client-cart-summary strong {
  font-size: 1.12rem;
  line-height: 1.2;
}

.client-cart-summary span {
  color: rgba(18, 24, 38, 0.62);
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.2;
}

.client-category-nav {
  align-items: center;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #e8edf3;
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  margin: 0 -12px;
  padding: 12px 6vw;
  position: sticky;
  top: 0;
  z-index: 3;
}

.client-category-nav::after {
  background: linear-gradient(
    to bottom,
    rgba(18, 24, 38, 0.08),
    rgba(18, 24, 38, 0)
  );
  bottom: -10px;
  content: '';
  height: 10px;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
}

.client-category-arrow {
  background: #f8fafc !important;
  border-color: #dfe5ee !important;
  border-radius: 999px !important;
  color: #1976d2 !important;
  flex: 0 0 44px;
  height: 44px !important;
  width: 44px !important;
}

.client-category-arrow:hover,
.client-category-arrow:focus-visible {
  background: #e8f2ff !important;
  border-color: #b7d7fb !important;
}

.client-category-view {
  height: auto;
  min-height: 0;
}

.client-category-view .mobile-category-products {
  overflow-y: visible;
  padding: 28px 0;
}

.client-category-view .mobile-category-title {
  color: #123a63;
  font-size: 1.55rem;
  font-weight: 900;
  margin-bottom: 18px;
}

.client-category-view .mobile-category-section {
  margin-left: auto;
  margin-right: auto;
  max-width: 980px;
  padding: 0 8px;
}

.client-product-quantity {
  align-items: center;
  background: #1976d2;
  border: 2px solid #ffffff;
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 900;
  height: 32px;
  justify-content: center;
  min-width: 32px;
  padding: 0 9px;
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 2;
}

.client-mobile-checkout {
  bottom: 16px;
  left: 0;
  padding: 0 14px;
  position: fixed;
  right: 0;
  z-index: 8;
}

.client-mobile-checkout-button {
  background: #ffe9b5 !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 14px rgba(18, 24, 38, 0.18) !important;
  color: #123a63 !important;
  min-height: 64px !important;
  padding: 0 16px !important;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.client-mobile-checkout-button--pulse {
  animation: client-cart-pop 420ms ease-out;
}

.client-mobile-checkout-button ::v-deep .v-btn__content {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
}

.client-mobile-checkout-count {
  align-items: center;
  background: #1976d2;
  border-radius: 8px;
  color: #ffffff;
  display: inline-flex;
  font-size: 1.15rem;
  font-weight: 900;
  gap: 6px;
  justify-content: center;
  min-height: 42px;
  min-width: 58px;
  padding: 0 10px;
}

.client-mobile-checkout-label {
  font-size: 1.02rem;
  font-weight: 900;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-mobile-checkout-button strong {
  font-size: 1rem;
  font-weight: 900;
  white-space: nowrap;
}

.client-service-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.client-service-tile {
  border-radius: 8px !important;
  flex-direction: column;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  height: 118px !important;
  min-width: 0 !important;
}

.client-service-tile--active {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.42) !important;
}

.client-service-tile ::v-deep .v-btn__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  white-space: normal;
}

@keyframes client-cart-pop {
  0% {
    transform: translateY(0) scale(1);
  }
  45% {
    transform: translateY(-4px) scale(1.025);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .client-mobile-checkout-button--pulse {
    animation: none;
  }

  .product-card--client,
  .product-card--client .product-card-image,
  .client-mobile-checkout-button {
    transition: none !important;
  }

  .product-card--client.product-clickable:hover,
  .product-card--client.product-clickable:focus-visible,
  .product-card--client.product-clickable:hover .product-card-image {
    transform: none;
  }
}

.menu-page-container--express {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.menu-content-row--express {
  margin-top: 0 !important;
}

.express-workspace {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 126px);
  min-height: 520px;
  overflow: hidden;
  padding: 12px;
}

.express-filter-row {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  overflow-x: auto;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.express-filter-row::-webkit-scrollbar {
  display: none;
}

.express-command-bar {
  align-items: stretch;
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px;
}

.express-command-actions {
  align-items: center;
  background: #ffffff;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  display: flex;
  flex: 0 1 auto;
  gap: 12px;
  justify-content: flex-end;
  min-width: 0;
  padding: 4px;
}

.express-filter-row {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
}

.express-filter-button {
  background: #ffffff !important;
  border: 1px solid #dfe5ee !important;
  border-radius: 8px !important;
  color: #121826 !important;
  cursor: pointer;
  flex: 0 0 auto;
  font-size: 0.98rem !important;
  font-weight: 700 !important;
  height: 48px !important;
  justify-content: center;
  letter-spacing: 0 !important;
  padding: 0 16px !important;
  transition: background-color 140ms ease, border-color 140ms ease,
    color 140ms ease, transform 120ms ease;
}

.express-all-chip {
  min-width: 76px !important;
}

.express-filter-button:hover,
.express-filter-button:focus-visible {
  background: #f8fafc !important;
  border-color: #b9c8dc !important;
}

.express-filter-button:active {
  transform: scale(0.98);
}

.express-filter-button--active,
.express-all-chip--active {
  background: #1976d2 !important;
  border-color: #1976d2 !important;
  color: #ffffff !important;
}

.express-command-button {
  background: #ffffff !important;
  border-color: transparent !important;
  border-radius: 6px !important;
  color: #121826 !important;
  height: 48px !important;
  min-width: 48px !important;
  width: 48px !important;
}

.express-command-button .express-command-icon {
  font-size: 32px;
}

.express-command-icon--orders {
  color: #1976d2 !important;
}

.express-command-icon--cash {
  color: #00e676 !important;
}

.express-command-button:hover,
.express-command-button:focus-visible {
  background: #e8f2ff !important;
  border-color: #1976d2 !important;
}

.express-products-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.express-category-btn {
  min-height: 48px !important;
  min-width: 112px !important;
}

.express-category-btn:hover,
.express-category-btn:focus-visible {
  background: #f8fafc !important;
  border-color: #b9c8dc !important;
}

.express-category-btn:active {
  transform: scale(0.98);
}

.express-category-btn.primary {
  background: #1976d2 !important;
  border-color: #1976d2 !important;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.18) !important;
  color: #ffffff !important;
}

.express-category-btn.primary:hover,
.express-category-btn.primary:focus-visible {
  background: #1769bd !important;
  border-color: #1769bd !important;
}

.express-filter-button ::v-deep .v-btn__content,
.express-category-btn ::v-deep .v-btn__content {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-grid-col {
  display: flex;
  min-width: 0;
}

.product-card {
  background: #ffffff !important;
  border-color: #e1e7ef !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  transition: border-color 140ms ease, background-color 140ms ease,
    transform 120ms ease;
  width: 100%;
}

.product-card--client {
  position: relative;
  transform: translateZ(0);
}

.product-card--client.product-clickable:hover,
.product-card--client.product-clickable:focus-visible {
  background: #ffffff !important;
  box-shadow: 0 6px 8px rgba(18, 24, 38, 0.08) !important;
  transform: translateY(-2px);
}

.product-card--client.product-card--in-cart {
  border-color: #1976d2 !important;
}

.product-card--client .product-card-image {
  transition: transform 180ms ease, filter 180ms ease;
}

.product-card--client.product-clickable:hover .product-card-image {
  filter: saturate(1.04) contrast(1.02);
  transform: scale(1.015);
}

.menu-panel-card,
.cart-item-card,
.product-clickable:hover,
.product-clickable:focus {
  box-shadow: none !important;
}

.product-clickable:hover,
.product-clickable:focus-visible {
  border-color: #1976d2 !important;
  background: #ffffff !important;
}

.product-clickable:active {
  transform: scale(0.985);
}

.product-card--compact {
  min-height: 208px;
}

.product-card--compact:active {
  transform: scale(0.98);
}

.product-card--compact .product-card-title {
  min-height: 46px;
}

.product-card--compact .product-card-title-text {
  font-size: 0.98rem;
  line-height: 1.2;
}

.product-card--compact .product-card-content {
  min-height: 42px;
}

.product-card--compact ::v-deep .v-card__title {
  padding-left: 10px !important;
  padding-right: 10px !important;
}

.product-card--compact ::v-deep .v-card__text {
  padding-left: 10px !important;
  padding-right: 10px !important;
}

.product-card--compact ::v-deep .v-card__actions {
  padding: 0 8px 8px !important;
}

.product-card--compact ::v-deep .v-btn {
  height: 26px !important;
  font-size: 0.72rem !important;
}

.product-card--compact ::v-deep .v-btn .v-icon {
  font-size: 15px !important;
}

.product-card-image {
  background: #f8fafc;
  border-radius: 6px !important;
  flex: 0 0 auto;
  margin: 6px 6px 0;
  overflow: hidden;
  width: calc(100% - 12px);
}

.product-card-image ::v-deep .v-image__image {
  background-size: cover;
  background-position: center;
}

/* Réserve 2 lignes sur le conteneur ; v-card-title centre déjà son contenu
   verticalement (align-items: center), donc un titre court est centré dans
   l'espace au lieu de laisser un trou avant la description. */
.product-card-title {
  align-items: center;
  min-height: 56px;
}

.product-card-title-text {
  color: #121826;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 1.05rem;
  line-height: 1.25;
  min-width: 0;
  width: 100%;
  word-break: break-word;
}

.product-card-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 72px;
  padding-top: 2px !important;
}

.product-card-actions {
  flex: 0 0 auto;
  margin-top: 0;
}

.product-card-price {
  align-items: center;
  border-top: 1px solid #e8edf3;
  color: #121826;
  display: inline-flex;
  font-size: 1.12rem;
  font-weight: 800;
  justify-content: flex-start;
  line-height: 1.2;
  margin-top: auto;
  margin-bottom: 0px;
  min-height: 1.35em;
  padding: 9px 0 0;
  width: 100%;
}

.product-card--compact .product-card-price {
  font-size: 1.08rem;
  min-height: 34px;
  padding: 8px 0 0;
}

.cart-item-row {
  min-width: 0;
}

.cart-item-info {
  flex: 1 1 auto;
  min-width: 0;
}

.cart-item-info--editable {
  cursor: pointer;
  border-radius: 6px;
}

.cart-item-info--editable:focus-visible {
  outline: 2px solid var(--v-primary-base);
  outline-offset: 2px;
}

.cart-item-avatar {
  flex: 0 0 64px;
}

.cart-item-text {
  min-width: 0;
}

.cart-item-name {
  color: #121826;
  font-size: 1rem !important;
  line-height: 1.2;
  max-width: 100%;
}

.cart-item-price {
  color: rgba(18, 24, 38, 0.78);
  font-size: 0.92rem;
  line-height: 1.2;
  margin-top: 2px;
}

.cart-item-customizations {
  background: #f8fafc;
  border-top: 1px solid #e8edf3;
  display: grid;
  gap: 6px;
  margin-top: 10px;
  padding: 10px 12px 12px;
}

.cart-item-customization-row {
  align-items: baseline;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(88px, 0.42fr) minmax(0, 1fr);
  min-width: 0;
}

.cart-item-customization-step {
  color: rgba(18, 24, 38, 0.58);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item-customization-choice {
  color: #121826;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.25;
  min-width: 0;
  overflow-wrap: anywhere;
}

.cart-item-actions {
  flex: 0 0 auto;
  white-space: nowrap;
}

.cart-action-btn {
  height: 40px !important;
  width: 40px !important;
}

.cart-qty-btn {
  box-shadow: none !important;
  font-size: 1.08rem !important;
  height: 42px !important;
  min-width: 42px !important;
  width: 42px !important;
}

.express-empty-cart {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 360px;
  padding: 28px 12px;
}

.express-cart-card {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 126px) !important;
  min-height: 520px;
  overflow: hidden;
}

.express-cart-summary {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  margin-bottom: 12px;
  min-height: 56px;
  padding: 8px 12px;
}

.express-cart-summary-meta {
  color: #121826;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.express-cart-items-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.cart-order-actions {
  display: flex;
  gap: 8px;
  padding: 12px 8px 8px;
}

.cart-order-btn {
  min-width: 0 !important;
}

.cart-order-btn--submit {
  flex: 1.35 1 0;
}

.cart-order-btn--cancel {
  flex: 1 1 0;
}

.cart-order-btn ::v-deep .v-btn__content {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
  width: 100%;
}

.cart-order-btn__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-order-btn__total {
  font-size: 1.02rem;
  font-weight: 900;
  margin-left: auto;
  white-space: nowrap;
}

.express-checkout {
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  display: grid;
  flex: 0 0 auto;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
}

.express-table-button {
  flex: 1 1 0;
  background: #ffffff !important;
  border: 1px solid #dfe5ee !important;
  min-height: 64px !important;
  min-width: 0 !important;
}

.express-service-button {
  flex: 1 1 0;
  background: #ffffff !important;
  border: 1px solid #dfe5ee !important;
  min-height: 64px !important;
  min-width: 0 !important;
}

.express-table-service-row {
  display: flex;
  gap: 12px;
}

.express-customer-fields {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}

.express-checkout ::v-deep .v-input__slot {
  background: #ffffff !important;
  min-height: 44px !important;
}

.express-note-field ::v-deep textarea {
  line-height: 1.25;
  min-height: 34px;
}

.express-choice-row,
.express-payment-grid {
  display: grid;
  gap: 12px;
}

.express-choice-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.express-choice-row--modal {
  grid-template-columns: minmax(0, 1fr);
}

.express-payment-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.express-choice-btn {
  min-height: 58px !important;
  min-width: 0 !important;
}

.express-choice-btn--active {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.42) !important;
}

.express-choice-state {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.1;
  margin-top: 2px;
  text-transform: uppercase;
}

.express-checkout-actions {
  display: grid;
  gap: 8px;
}

.express-payment-grid ::v-deep .v-btn {
  min-height: 62px !important;
  min-width: 0 !important;
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.express-cashout-button {
  min-height: 68px !important;
  min-width: 0 !important;
}

.express-cashout-button ::v-deep .v-btn__content {
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
}

.express-cashout-label {
  align-items: center;
  display: inline-flex;
  min-width: 0;
}

.express-cashout-total {
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1.1;
  margin-left: 12px;
  white-space: nowrap;
}

.express-payment-tile {
  border-radius: 8px !important;
  flex-direction: column;
  font-size: 1.05rem !important;
  height: 112px !important;
  min-width: 0 !important;
}

.express-payment-tile ::v-deep .v-btn__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  white-space: normal;
}

.express-payment-grid ::v-deep .v-btn__content,
.express-choice-btn ::v-deep .v-btn__content,
.express-service-tile ::v-deep .v-btn__content {
  min-width: 0;
  white-space: normal;
}

.express-table-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
}

.express-service-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.express-service-tile {
  border-radius: 8px !important;
  flex-direction: column;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  height: 118px !important;
  min-width: 0 !important;
}

.express-service-tile--active {
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.42) !important;
}

.express-service-tile ::v-deep .v-btn__content {
  display: flex;
  flex-direction: column;
}

.express-table-tile {
  border-radius: 8px !important;
  flex-direction: column;
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  height: 112px !important;
  min-width: 0 !important;
}

.express-table-tile ::v-deep .v-btn__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  white-space: normal;
}

.express-receipt-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.express-receipt-tile {
  border-radius: 8px !important;
  flex-direction: column;
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  height: 118px !important;
  min-width: 0 !important;
}

.express-receipt-tile ::v-deep .v-btn__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  white-space: normal;
}

.mobile-category-view {
  background: transparent;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  min-height: 0;
}

.mobile-category-bar {
  align-items: center;
  background: transparent;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: flex-start;
  overflow-x: auto;
  padding: 4px 2px;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mobile-category-bar::-webkit-scrollbar {
  display: none;
}

.mobile-category-chip {
  background: #f1f5f9 !important;
  border: 1px solid #e1e7ef !important;
  border-radius: 999px !important;
  color: #121826 !important;
  flex: 0 0 auto;
  font-size: 0.96rem !important;
  font-weight: 800;
  min-height: 40px !important;
  padding: 0 16px !important;
  transition: background-color 160ms ease, border-color 160ms ease,
    color 160ms ease, transform 160ms ease;
}

.mobile-category-chip--active {
  background: #1976d2 !important;
  border-color: #1976d2 !important;
  color: #ffffff !important;
  transform: translateY(-2px);
}

.mobile-category-chip--active ::v-deep .v-chip__content {
  color: #ffffff !important;
}

.mobile-category-image {
  background: #ffffff;
  border: 2px solid #ffffff;
  margin-left: -8px !important;
  margin-right: 9px !important;
}

.mobile-category-image ::v-deep .v-image {
  height: 100%;
  width: 100%;
}

.mobile-category-chip:hover,
.mobile-category-chip:focus-visible {
  background: #e8f2ff !important;
  border-color: #b7d7fb !important;
}

.mobile-category-chip--active:hover,
.mobile-category-chip--active:focus-visible {
  background: #1976d2 !important;
  border-color: #1976d2 !important;
}

.mobile-category-products {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.mobile-category-section {
  scroll-margin-top: 64px;
}

.mobile-category-section + .mobile-category-section {
  margin-top: 18px;
}

.mobile-category-title {
  color: rgba(0, 0, 0, 0.78);
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 2px 0 10px;
}

@media (min-width: 600px) and (max-width: 1263px) {
  .product-grid {
    --product-card-min-width: 185px;
  }

  .product-grid--large {
    --product-card-min-width: 150px;
    gap: 10px;
  }

  .product-card {
    min-height: 296px !important;
  }

  .product-card--compact {
    min-height: 208px !important;
  }

  .product-card ::v-deep .v-card__title {
    padding-top: 7px !important;
    padding-bottom: 2px !important;
  }

  .product-card ::v-deep .v-card__text {
    padding-top: 2px !important;
    padding-bottom: 4px !important;
  }

  .product-card-content {
    min-height: 62px;
  }

  .product-card ::v-deep .v-card__actions {
    padding-bottom: 8px !important;
    padding-top: 0 !important;
  }

  .product-card-title {
    min-height: 50px;
  }

  .product-card-title-text {
    font-size: 0.98rem !important;
  }

  .line-clamp-2 {
    font-size: 0.82rem;
    height: 2.5em;
    line-height: 1.25;
    margin-top: 4px;
  }

  .product-card-price {
    font-size: 1rem;
    margin-top: auto;
    padding: 8px 0 0;
  }

  .product-card ::v-deep .v-btn {
    height: 28px !important;
  }

  .cart-item-avatar {
    flex-basis: 56px;
    height: 56px !important;
    min-width: 56px !important;
    width: 56px !important;
  }

  .cart-item-row {
    margin-left: 4px !important;
    margin-right: 4px !important;
  }

  .cart-item-name {
    font-size: 0.9rem !important;
  }

  .cart-item-actions {
    margin-left: 8px;
  }

  .cart-action-btn {
    height: 40px !important;
    width: 40px !important;
  }

  .cart-qty-btn {
    font-size: 1.08rem !important;
    height: 42px !important;
    min-width: 42px !important;
    width: 42px !important;
  }

  .cart-order-actions {
    padding-left: 4px;
    padding-right: 4px;
  }

  .cart-order-btn {
    font-size: 0.78rem !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .express-command-bar {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .express-command-actions {
    flex: 0 0 auto;
  }

  .express-command-button {
    flex: 0 0 48px;
  }
}

@media (max-width: 599px) {
  .menu-page-container--client {
    padding-bottom: 92px !important;
  }

  .menu-page-container--client .menu-content-row {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .menu-page-container--client .menu-content-row > .col {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .client-service-banner {
    margin: 10px 12px 0;
    min-height: 72px;
    padding: 12px 14px;
    width: auto;
  }

  .client-service-copy strong {
    font-size: 1.06rem;
  }

  .client-service-copy span {
    font-size: 0.92rem;
  }

  .client-category-nav {
    margin: 0;
    padding: 10px 14px;
  }

  .client-category-view .mobile-category-bar {
    gap: 10px;
    padding: 4px 1px;
  }

  .client-category-view .mobile-category-chip {
    font-size: 0.9rem !important;
    min-height: 38px !important;
    padding: 0 14px !important;
  }

  .client-category-view .mobile-category-products {
    padding: 42px 22px 12px;
  }

  .client-category-view .mobile-category-title {
    font-size: 1.75rem;
    margin-bottom: 22px;
  }

  .client-category-view .mobile-category-section {
    padding: 0;
  }

  .menu-content-row {
    margin-top: 0 !important;
  }

  .product-grid {
    --product-card-min-width: 0;
    gap: 28px 22px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .product-card {
    min-height: 270px !important;
  }

  .product-card-content {
    min-height: 56px;
  }

  .product-card-title {
    min-height: 46px;
  }

  .product-card-title-text {
    font-size: 0.92rem !important;
    line-height: 1.2;
  }

  .line-clamp-2 {
    font-size: 0.8rem;
    height: 2.4em;
    line-height: 1.2;
    margin-top: 4px;
  }

  .product-card-price {
    font-size: 0.95rem;
    padding: 8px 0 0;
  }
}

@media (max-width: 420px) {
  .client-service-grid {
    grid-template-columns: 1fr;
  }

  .client-mobile-checkout-button {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .client-mobile-checkout-label {
    font-size: 0.92rem;
  }

  .cart-order-actions {
    flex-direction: column;
  }

  .cart-order-btn {
    width: 100%;
  }

  .express-choice-row,
  .express-payment-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 768px) and (max-width: 1263px) {
  .product-card {
    min-height: 284px !important;
  }

  .product-card--compact {
    min-height: 208px !important;
  }

  .product-card ::v-deep .v-card__title {
    padding-left: 8px !important;
    padding-right: 8px !important;
    padding-top: 7px !important;
  }

  .product-card ::v-deep .v-card__text {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .product-card-content {
    min-height: 56px;
  }

  .product-card-title {
    min-height: 48px;
  }

  .product-card-title-text {
    font-size: 0.95rem !important;
    line-height: 1.2;
  }

  .line-clamp-2 {
    font-size: 0.78rem;
    height: 2.4em;
    line-height: 1.2;
    margin-top: 4px;
  }

  .product-card-price {
    font-size: 0.98rem;
    line-height: 1.12;
    margin-top: auto;
    padding: 8px 0 0;
  }

  .product-card ::v-deep .v-card__actions {
    padding-bottom: 7px !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .product-card ::v-deep .v-btn {
    font-size: 0.78rem !important;
    height: 26px !important;
  }

  .product-card ::v-deep .v-btn .v-icon {
    font-size: 16px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-card,
  .product-card--compact,
  .express-all-chip,
  .express-category-btn {
    transition: none !important;
  }

  .product-clickable:active,
  .product-card--compact:active,
  .express-all-chip:active,
  .express-category-btn:active {
    transform: none !important;
  }
}

.product-preview-card {
  position: relative;
}

.product-preview-close {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 2;
}
</style>
