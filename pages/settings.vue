<template>
  <v-container fluid class="settings-page">
    <v-form ref="form" v-model="valid" @submit.prevent="submitShopEdit">
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>

    <section class="settings-hero">
      <div class="settings-hero__title">
        <span class="settings-hero__icon" aria-hidden="true">
          <v-icon color="primary">mdi-tune-variant</v-icon>
        </span>
        <div>
          <h1>Informations & Reglages de votre etablissement</h1>
          <p>
            Identite, horaires, paiements, impression et ticket de caisse dans
            une console plus rapide a scanner.
          </p>
        </div>
      </div>
    </section>

    <v-row class="settings-main-grid">
      <v-col cols="12" md="6" lg="6">
        <v-card id="media" outlined class="pa-4 fill-height settings-card">
          <h3 class="mb-4 settings-section-title">
            <v-icon small color="primary">mdi-image-outline</v-icon>
            Photo de votre établissement
          </h3>
          <ImageCropper
            v-model="shopImg"
            :preview-url-prop="imageUrl"
            :ratio="16 / 5"
          />

          <v-row class="mt-6 settings-public-actions">
            <v-btn
              color="primary"
              rounded
              class="settings-site-link text-none"
              :href="clickAndCollectPath"
              target="_blank"
            >
              Voir le site de mon restaurant
              <v-icon small right>mdi-open-in-new</v-icon>
            </v-btn>
            <v-btn
              color="primary"
              outlined
              rounded
              class="settings-site-link text-none"
              @click="copyPublicUrl('site')"
            >
              Copier l'URL du site
              <v-icon small right>
                {{
                  copiedPublicUrlType === 'site'
                    ? 'mdi-check'
                    : 'mdi-content-copy'
                }}
              </v-icon>
            </v-btn>
            <v-btn
              color="primary"
              outlined
              rounded
              class="settings-site-link text-none"
              @click="copyPublicUrl('click-and-collect')"
            >
              Copier l'URL click and collect
              <v-icon small right>
                {{
                  copiedPublicUrlType === 'click-and-collect'
                    ? 'mdi-check'
                    : 'mdi-content-copy'
                }}
              </v-icon>
            </v-btn>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" lg="6">
        <v-card
          id="horaires"
          outlined
          class="pa-4 fill-height settings-card settings-hours-card"
        >
          <h3 class="mb-4 settings-section-title">
            <v-icon small color="primary">mdi-clock-outline</v-icon>
            Horaires d'ouvertures
          </h3>
          <div class="settings-hours-list">
            <div v-for="(day, i) in formShop.shop_hours" :key="i">
              <div class="settings-hours-row">
                <div class="settings-hours-day">{{ day.dayName }}</div>
                <v-switch
                  v-model="day.isOpen"
                  class="settings-hours-switch"
                  :label="day.isOpen ? 'Ouvert' : 'Fermé'"
                  color="success"
                  dense
                  hide-details
                ></v-switch>
                <v-text-field
                  v-if="day.isOpen"
                  v-model="day.from"
                  class="settings-hours-time"
                  hide-details
                  single-line
                  type="text"
                  dense
                  outlined
                  suffix="H"
                  :disabled="!day.isOpen"
                  label="De"
                  @keypress="validateInput"
                ></v-text-field>
                <v-text-field
                  v-if="day.isOpen"
                  v-model="day.to"
                  class="settings-hours-time"
                  hide-details
                  single-line
                  outlined
                  type="text"
                  suffix="H"
                  dense
                  :disabled="!day.isOpen"
                  label="À"
                ></v-text-field>
                <div v-else class="settings-hours-closed"></div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

      <v-row>
        <v-col cols="12">
          <v-card id="identite" outlined class="pa-4 mb-4 settings-card">
            <h3 class="mb-4 settings-section-title">
              <v-icon small color="primary">mdi-storefront-outline</v-icon>
              Informations de l'établissement
            </h3>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_name"
                  class="settings-field"
                  prepend-inner-icon="mdi-store-outline"
                  label="Nom du restaurant"
                  type="text"
                  :rules="[(v) => !!v || 'Nom du restaurant requis']"
                  placeholder="Insérez le nom du restaurant"
                  required
                  autofocus
                  dense
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-textarea
                  v-model="formShop.shop_description"
                  class="settings-field"
                  prepend-inner-icon="mdi-text-box-outline"
                  label="Description"
                  :rules="descriptionRules"
                  placeholder="Insérez la description"
                  rows="3"
                  auto-grow
                  no-resize
                  counter="255"
                  maxlength="255"
                  required
                  dense
                  outlined
                ></v-textarea>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_phone"
                  class="settings-field"
                  prepend-inner-icon="mdi-phone-outline"
                  label="Numéro de téléphone"
                  type="text"
                  :rules="[(v) => !!v || 'Numéro de téléphone requis']"
                  placeholder="Insérez le numéro de téléphone"
                  required
                  dense
                  outlined
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_status"
                  class="settings-field"
                  prepend-inner-icon="mdi-bullhorn-outline"
                  label="Statut / Message d'information pour vos clients"
                  type="text"
                  placeholder="Un statut particulier, événements..."
                  required
                  dense
                  outlined
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_adress"
                  class="settings-field"
                  prepend-inner-icon="mdi-map-marker-outline"
                  label="Adresse"
                  type="text"
                  :rules="[(v) => !!v || 'Adresse requise']"
                  placeholder="Insérez l'adresse de votre établissement "
                  required
                  dense
                  outlined
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_siret"
                  class="settings-field"
                  prepend-inner-icon="mdi-card-account-details-outline"
                  label="Numéro de SIRET"
                  type="text"
                  :rules="[(v) => !!v || 'Numéro de SIRET requis']"
                  placeholder="Insérez le numéro de SIRET"
                  required
                  dense
                  outlined
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_naf"
                  class="settings-field"
                  prepend-inner-icon="mdi-identifier"
                  label="Code NAF"
                  type="text"
                  placeholder="Ex. 5610A"
                  dense
                  outlined
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-card id="paiements" outlined class="pa-4 settings-card">
            <h3 class="mb-4 settings-section-title">
              <v-icon small color="primary">mdi-credit-card-outline</v-icon>
              Ventes, TVA et paiements
            </h3>
            <v-row>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formShop.shop_payment_methods"
                  class="settings-field"
                  prepend-inner-icon="mdi-credit-card-multiple-outline"
                  :items="PAYMENT_METHOD_OPTIONS"
                  item-text="text"
                  item-value="value"
                  label="Moyens de paiement disponibles"
                  multiple
                  chips
                  dense
                  outlined
                ></v-combobox>
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formShop.discount_percentages"
                  class="settings-field"
                  prepend-inner-icon="mdi-percent-outline"
                  :items="DISCOUNT_PERCENTAGE_OPTIONS"
                  label="Remises en pourcentage disponibles"
                  suffix="%"
                  type="number"
                  multiple
                  chips
                  small-chips
                  hint="Ces remises seront proposées au moment de l'encaissement."
                  persistent-hint
                  dense
                  outlined
                ></v-combobox>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_vat_number"
                  class="settings-field"
                  prepend-inner-icon="mdi-receipt-text-outline"
                  label="Numéro de TVA intracommunautaire"
                  type="text"
                  placeholder="Ex. FR12345678901"
                  dense
                  outlined
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="formShop.activate_tva"
                  label="Activer la TVA"
                  color="success"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card id="impression" outlined class="pa-4 fill-height settings-card">
            <h3 class="mb-4 settings-section-title">
              <v-icon small color="primary">mdi-printer-outline</v-icon>
              Réglages de l'imprimante
            </h3>
            <div class="settings-printer-row">
              <v-text-field
                v-model="formShop.shop_printer_ip"
                class="settings-field"
                prepend-inner-icon="mdi-ip-network-outline"
                label="Adresse IP de l'imprimante"
                type="text"
                :disabled="!formShop.smart_print_app"
                :rules="[(v) => !!v || 'Adresse IP requise']"
                placeholder="Insérez l'adresse IP de l'imprimante"
                required
                dense
                outlined
              ></v-text-field>
              <v-switch
                v-model="formShop.smart_print_app"
                class="mt-0"
                label="Imprimer avec Smart Print App"
                color="success"
              ></v-switch>
            </div>
            <v-switch
              v-model="formShop.auto_print_order_tickets"
              :disabled="!formShop.smart_print_app"
              class="mt-0"
              label="Imprimer automatiquement les tickets de commande validés"
              color="success"
            ></v-switch>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card outlined class="pa-4 fill-height settings-card">
            <h3 class="mb-4 settings-section-title">
              <v-icon small color="primary">mdi-cellphone-check</v-icon>
              Encaissement à table via mobile
            </h3>

            <h4 class="mb-3">Encaissement avant la commande</h4>
            <v-switch
              v-model="paymentBeforeOrder"
              color="success"
              class="mt-0"
              label="Encaissement obligatoire avant la commande"
            ></v-switch>
            <v-alert
              v-if="paymentBeforeOrder && !stripeReady"
              dense
              text
              type="warning"
              class="mt-2 mb-0"
            >
              Connectez Stripe afin de pouvoir utiliser l'encaissement à table
              et le paiement par carte. Sans Stripe, vos clients devront payer
              au comptoir.
            </v-alert>

            <v-divider class="my-5"></v-divider>

            <div class="d-flex align-center justify-space-between">
              <div>
                <h4>Paiements Stripe</h4>
                <p class="mb-0 mt-2">
                  {{ stripeStatusLabel }}
                </p>
              </div>
              <v-chip :color="stripeReady ? 'success' : 'warning'" dark small>
                {{ stripeReady ? 'Actif' : 'A configurer' }}
              </v-chip>
            </div>
            <v-btn
              class="mt-4 text-none"
              color="primary"
              :loading="stripeLoading"
              @click="connectStripe"
            >
              Connecter Stripe
              <v-icon small right>mdi-credit-card-check</v-icon>
            </v-btn>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card id="reseaux" outlined class="pa-4 fill-height settings-card">
            <h3 class="mb-4 settings-section-title">
              <v-icon small color="primary">mdi-share-variant-outline</v-icon>
              Réseaux Sociaux
            </h3>
            <div class="settings-social-grid">
              <v-text-field
                v-model="formShop.shop_social_media.instagram"
                class="settings-field"
                prepend-icon="mdi-instagram"
                label="Instagram"
                type="text"
                placeholder="Insérez le lien Instagram"
                dense
                outlined
              ></v-text-field>
              <v-text-field
                v-model="formShop.shop_social_media.facebook"
                class="settings-field"
                prepend-icon="mdi-facebook"
                label="Facebook"
                type="text"
                placeholder="Insérez le lien Facebook"
                dense
                outlined
              ></v-text-field>
              <v-text-field
                v-model="formShop.shop_social_media.tiktok"
                class="settings-field"
                prepend-icon="mdi-music-note"
                label="TikTok"
                type="text"
                placeholder="Insérez le lien TikTok"
                dense
                outlined
              >
                <template #prepend>
                  <div class="mt-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="grey"
                      class="bi bi-tiktok"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"
                      />
                    </svg>
                  </div>
                </template>
              </v-text-field>
              <v-text-field
                v-model="formShop.shop_social_media.snapchat"
                class="settings-field"
                prepend-icon="mdi-snapchat"
                label="Snapchat"
                type="text"
                placeholder="Insérez le lien Snapchat"
                dense
                outlined
              ></v-text-field>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card id="ticket" outlined class="pa-4 fill-height settings-card">
            <h3 class="mb-4 settings-section-title">
              <v-icon small color="primary">mdi-qrcode</v-icon>
              Avis client sur le ticket de caisse
            </h3>
            <v-text-field
              v-model="formShop.receipt_review_qr_url"
              class="settings-field"
              prepend-inner-icon="mdi-link-variant"
              label="Lien de l'avis client"
              type="url"
              placeholder="https://..."
              hint="Le QR Code sera imprimé uniquement si ce lien est renseigné."
              persistent-hint
              dense
              outlined
            ></v-text-field>
            <v-text-field
              v-model="formShop.receipt_review_qr_label"
              class="settings-field"
              prepend-inner-icon="mdi-format-title"
              label="Texte au-dessus du QR Code"
              type="text"
              placeholder="Votre avis nous intéresse"
              dense
              outlined
            ></v-text-field>
            <v-text-field
              v-model="formShop.cash_register_number"
              class="settings-field"
              prepend-inner-icon="mdi-cash-register"
              label="Numéro de caisse"
              type="text"
              placeholder="Ex. Caisse 1"
              dense
              outlined
            ></v-text-field>
          </v-card>
        </v-col>
        <v-col cols="12">
          <v-card
            id="theme"
            outlined
            class="pa-4 settings-card settings-theme-card"
          >
            <h3 class="mb-3 settings-section-title">
              <v-icon small color="primary">mdi-palette-outline</v-icon>
              Theme du restaurant
            </h3>
            <v-row class="settings-theme-controls" no-gutters>
              <v-col cols="12" sm="auto" class="settings-theme-select-col">
                <v-select
                  v-model="selectedThemePreset"
                  class="settings-field settings-theme-select"
                  prepend-inner-icon="mdi-format-color-fill"
                  :items="themePresetOptions"
                  item-text="text"
                  item-value="value"
                  label="Theme"
                  hide-details
                  dense
                  outlined
                ></v-select>
              </v-col>
              <v-col cols="12" sm="auto">
                <div class="settings-theme-json-actions">
                  <v-btn
                    height="40"
                    outlined
                    color="primary"
                    class="settings-theme-edit-button text-none"
                    @click="openThemeJsonDialog"
                  >
                    Edit
                    <v-icon small right>mdi-pencil-outline</v-icon>
                  </v-btn>
                </div>
              </v-col>
            </v-row>
            <v-dialog v-model="themeJsonDialog" max-width="860">
              <v-card class="pa-5 settings-theme-dialog">
                <v-card-title class="settings-theme-dialog-title px-0 pt-0">
                  Modifier le JSON du theme
                </v-card-title>
                <v-textarea
                  v-model="themeJsonDraft"
                  class="settings-field settings-theme-json"
                  prepend-inner-icon="mdi-code-json"
                  label="JSON du theme"
                  :error-messages="themeJsonError ? [themeJsonError] : []"
                  rows="18"
                  spellcheck="false"
                  no-resize
                  outlined
                ></v-textarea>
                <v-card-actions class="px-0 pb-0">
                  <v-spacer></v-spacer>
                  <v-btn text class="text-none" @click="closeThemeJsonDialog">
                    Annuler
                  </v-btn>
                  <v-btn
                    color="primary"
                    depressed
                    class="text-none"
                    @click="applyThemeJsonDraft"
                  >
                    Appliquer
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-card>
        </v-col>
      </v-row>

      <div class="settings-actionbar">
        <div>
          <strong>{{ settingsDirtyLabel }}</strong>
          <span>{{ savebarHint }}</span>
        </div>
        <div class="settings-actionbar__actions">
          <v-btn
            :disabled="!isValue || !isDirty"
            :loading="loadingBtn"
            class="text-none"
            type="submit"
            color="primary"
            depressed
          >
            Enregistrer <v-icon small right>mdi-content-save</v-icon>
          </v-btn>
          <v-btn
            class="text-none"
            color="warning"
            outlined
            @click.stop="$router.push('/restaurants')"
          >
            Annuler <v-icon small right>mdi-close-circle</v-icon>
          </v-btn>
        </div>
      </div>
    </v-form>
    <!-- <pre type="json">{{ formShop }}</pre>
    <pre type="json">{{ staticURL }}</pre>
    <pre type="json">{{ imageUrl }}</pre> -->
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import formatdate from '@/helpers/formatdate'
import {
  PAYMENT_METHOD_OPTIONS,
  normalizePaymentMethods,
} from '@/helpers/paymentMethods'
import {
  DEFAULT_DISCOUNT_PERCENTAGES,
  DISCOUNT_PERCENTAGE_OPTIONS,
  normalizeDiscountPercentages,
} from '@/helpers/discount'
import { SHOP_THEME_PRESETS, normalizeShopTheme } from '@/helpers/shopThemes'
export default {
  components: {
    Loading,

    // QrcodeVue,
  },
  mixins: [formatdate],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  data: () => ({
    errMsg: false,
    editableForm: false,
    loadPage: false,
    loadingBtnImg: false,
    stripeLoading: false,
    isValue: true,
    isDirty: false,
    formReady: false,
    loadingBtn: false,
    shopId: localStorage.getItem('shopid'),
    copiedPublicUrlType: null,
    copyPublicUrlResetTimer: null,
    PAYMENT_METHOD_OPTIONS,
    DISCOUNT_PERCENTAGE_OPTIONS,
    DEFAULT_DISCOUNT_PERCENTAGES,
    SHOP_THEME_PRESETS,
    themeJson: JSON.stringify(normalizeShopTheme(), null, 2),
    themeJsonDialog: false,
    themeJsonDraft: '',
    themeJsonError: '',
    AllPaymentsMethods: ['Chèque', 'Espèces ', 'Tickets Restaurants'],
    shopImg: null,
    imageUrl: null,
    formShop: {
      shop_name: '',
      shop_description: '',
      shop_phone: '',
      shop_naf: '',
      shop_vat_number: '',
      receipt_review_qr_url: '',
      receipt_review_qr_label: '',
      cash_register_number: '',
      shop_status: '',
      shop_hours: [],
      shop_payment_methods: [],
      discount_percentages: [...DEFAULT_DISCOUNT_PERCENTAGES],
      shop_social_media: {
        instagram: '',
        snapchat: '',
        facebook: '',
        tiktok: '',
        twitter: '',
      },
      shop_profile_image: '',
      shop_printer_ip: '',
      smart_print_app: '',
      auto_print_order_tickets: false,
      activate_tva: false,
      qr_payment_mode: 'stripe_before_order',
      shop_theme: normalizeShopTheme(),
    },
    valid: true,
    nameRules: [
      (v) => !!v || 'Le nom est requis',
      (v) =>
        (v && v.length <= 10) || 'Le nom doit être inférieur à 10 caractères',
    ],
    descriptionRules: [
      (v) => !!v || 'La description est requise',
      (v) =>
        (v && v.length <= 255) ||
        'La description doit être inférieure à 255 caractères',
    ],
    phoneNumberRules: [
      (v) => !!v || 'Le numéro de téléphone est requis',
      (v) =>
        (v && v.length <= 10) ||
        'Le numéro de téléphone doit être inférieur à 10 caractères',
    ],
  }),
  computed: {
    shop_name() {
      return this.$store.get('shop/shop_name')
    },
    shop_adress() {
      return this.$store.get('shop/shop_adress')
    },
    shop_phone() {
      return this.$store.get('shop/shop_phone')
    },
    shop_description() {
      return this.$store.get('shop/shop_description')
    },
    shop_hours() {
      return this.$store.get('shop/shop_hours')
    },
    shop_social_media() {
      return this.$store.get('shop/shop_social_media')
    },
    shop_payment_methods() {
      return this.$store.get('shop/shop_payment_methods')
    },
    shop_discount_percentages() {
      return this.$store.get('shop/shop_discount_percentages')
    },
    shop_profile_image() {
      return this.$store.get('shop/shop_profile_image')
    },
    shop_status() {
      return this.$store.get('shop/shop_status')
    },
    shop_printer_ip() {
      return this.$store.get('shop/shop_printer_ip')
    },
    shop_siret() {
      return this.$store.get('shop/shop_siret')
    },
    shop_naf() {
      return this.$store.get('shop/shop_naf')
    },
    shop_vat_number() {
      return this.$store.get('shop/shop_vat_number')
    },
    receipt_review_qr_url() {
      return this.$store.get('shop/receipt_review_qr_url')
    },
    receipt_review_qr_label() {
      return this.$store.get('shop/receipt_review_qr_label')
    },
    cash_register_number() {
      return this.$store.get('shop/cash_register_number')
    },
    smart_print_app() {
      return this.$store.get('shop/smart_print_app')
    },
    auto_print_order_tickets() {
      return this.$store.get('shop/auto_print_order_tickets')
    },
    activate_tva() {
      return this.$store.get('shop/activate_tva')
    },
    qr_payment_mode() {
      return this.$store.get('shop/qr_payment_mode') || 'stripe_before_order'
    },
    shop_theme() {
      return this.$store.get('shop/shop_theme')
    },
    themePresetOptions() {
      const currentPreset =
        this.formShop.shop_theme && this.formShop.shop_theme.preset
          ? this.formShop.shop_theme.preset
          : SHOP_THEME_PRESETS.default.theme.preset
      const options = Object.keys(SHOP_THEME_PRESETS).map((value) => ({
        value,
        text: SHOP_THEME_PRESETS[value].label,
      }))
      return [{ value: currentPreset, text: 'Current theme' }, ...options]
    },
    selectedThemePreset: {
      get() {
        const preset = this.formShop.shop_theme && this.formShop.shop_theme.preset
        return SHOP_THEME_PRESETS[preset]
          ? preset
          : SHOP_THEME_PRESETS.default.theme.preset
      },
      set(value) {
        const preset = SHOP_THEME_PRESETS[value] || SHOP_THEME_PRESETS.default
        this.formShop.shop_theme = normalizeShopTheme(preset.theme)
        this.themeJson = this.formatShopThemeJson(this.formShop.shop_theme)
        this.themeJsonError = ''
      },
    },
    stripeReady() {
      return [true, 1, '1', 'true'].includes(
        this.$store.get('shop/stripe_charges_enabled')
      )
    },
    paymentBeforeOrder: {
      get() {
        return this.formShop.qr_payment_mode === 'stripe_before_order'
      },
      set(val) {
        this.formShop.qr_payment_mode = val
          ? 'stripe_before_order'
          : 'pay_at_counter'
      },
    },
    stripeStatusLabel() {
      if (this.stripeReady) return 'Le restaurant peut recevoir les paiements.'
      if (this.$store.get('shop/stripe_account_id')) {
        return 'Compte créé, intégration Stripe à terminer.'
      }
      return 'Connectez Stripe pour accepter Apple Pay, Google Pay et carte.'
    },
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    publicOrigin() {
      return window.location.origin.replace(/\/+$/, '')
    },
    encodedShopName() {
      return this.shop_name ? encodeURIComponent(this.shop_name) : ''
    },
    clickAndCollectPath() {
      return this.shopId && this.encodedShopName
        ? `/click-and-collect/${this.shopId}/${this.encodedShopName}`
        : '/click-and-collect'
    },
    publicWebsiteUrl() {
      return `${this.publicOrigin}${this.clickAndCollectPath}`
    },
    clickAndCollectUrl() {
      return this.publicWebsiteUrl
    },
    settingsDirtyLabel() {
      return this.isDirty ? 'Modifications non enregistrees' : 'Reglages a jour'
    },
    savebarHint() {
      return this.isDirty
        ? 'Enregistrez avant de quitter cette page.'
        : 'Aucune action necessaire pour le moment.'
    },
  },
  watch: {
    formShop: {
      deep: true,
      handler() {
        // Ignore les mutations du pré-remplissage initial (mounted)
        if (this.formReady) this.isDirty = true
      },
    },
    themeJson() {
      if (this.formReady) this.isDirty = true
    },
    shopImg: {
      immediate: false,
      async handler(newBlob) {
        if (!newBlob || !newBlob.type) return

        try {
          this.loadingBtnImg = true

          const ext = newBlob.type === 'image/png' ? 'png' : 'jpg'
          const filename = `shop_${Date.now()}.${ext}`
          const file = new File([newBlob], filename, { type: newBlob.type })

          this.formShop.shop_profile_image = file
          this.imageRaw = file

          const fd = new FormData()
          fd.append('image', this.imageRaw)

          const res = await this.$store.dispatch('shop/updateShopInfo', {
            id: this.id,
            data: fd,
          })

          this.stsMsg = true

          if (res) {
            this.$router.push('/settings')
          }
        } catch (e) {
          this.stsMsg = true
          // optionnel: afficher l'erreur
          // console.error(e)
        } finally {
          this.loadingBtnImg = false
        }
      },
    },
  },
  beforeDestroy() {
    if (this.copyPublicUrlResetTimer) {
      clearTimeout(this.copyPublicUrlResetTimer)
    }
  },
  mounted() {
    this.loadPage = true
    const calls = [
      this.$store.dispatch('shop/getShopInfo'),
      this.$store.dispatch('shop/getStripeConnectStatus'),
    ]

    Promise.all(calls)
      .then(() => {
        this.formShop.shop_name = this.shop_name
        this.formShop.shop_adress = this.shop_adress
        this.formShop.shop_phone = this.shop_phone
        this.formShop.shop_status = this.shop_status
        this.formShop.shop_description = this.shop_description
        this.formShop.shop_payment_methods = normalizePaymentMethods(
          this.shop_payment_methods
        )
        this.formShop.discount_percentages = normalizeDiscountPercentages(
          this.shop_discount_percentages
        )
        this.formShop.shop_hours = JSON.parse(JSON.stringify(this.shop_hours))
        this.formShop.shop_social_media = JSON.parse(
          JSON.stringify(this.shop_social_media)
        )
        this.formShop.shop_profile_image = this.shop_profile_image
        this.formShop.shop_printer_ip = this.shop_printer_ip
        this.formShop.shop_siret = this.shop_siret
        this.formShop.shop_naf = this.shop_naf
        this.formShop.shop_vat_number = this.shop_vat_number
        this.formShop.receipt_review_qr_url = this.receipt_review_qr_url
        this.formShop.receipt_review_qr_label = this.receipt_review_qr_label
        this.formShop.cash_register_number = this.cash_register_number
        this.formShop.smart_print_app = this.smart_print_app
        this.formShop.auto_print_order_tickets =
          this.auto_print_order_tickets
        this.formShop.activate_tva = this.activate_tva
        this.formShop.qr_payment_mode = this.qr_payment_mode
        this.formShop.shop_theme = normalizeShopTheme(this.shop_theme)
        this.themeJson = this.formatShopThemeJson(this.formShop.shop_theme)
        this.themeJsonDialog = false
        this.themeJsonDraft = ''
        this.themeJsonError = ''

        this.imageUrl = `${this.staticURL}/api/v1/imgprofile/${this.formShop.shop_profile_image}`

        // Active le suivi des modifications une fois le pré-remplissage terminé
        this.$nextTick(() => {
          this.formReady = true
        })
      })
      .finally(() => {
        this.loadPage = false
      })
  },
  methods: {
    async copyPublicUrl(type) {
      const url =
        type === 'click-and-collect'
          ? this.clickAndCollectUrl
          : this.publicWebsiteUrl
      const copied = await this.copyTextToClipboard(url)

      if (!copied) {
        this.$store.dispatch('notifications/error', {
          message: "Impossible de copier l'URL.",
        })
        return
      }

      this.copiedPublicUrlType = type
      if (this.copyPublicUrlResetTimer) {
        clearTimeout(this.copyPublicUrlResetTimer)
      }
      this.copyPublicUrlResetTimer = setTimeout(() => {
        this.copiedPublicUrlType = null
      }, 1400)
      this.$store.dispatch('notifications/success', {
        message: 'URL copiée dans le presse-papiers.',
      })
    },
    async copyTextToClipboard(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch (error) {
        // Fallback ci-dessous pour les navigateurs sans Clipboard API.
      }

      try {
        const input = document.createElement('textarea')
        input.value = text
        document.body.appendChild(input)
        input.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(input)
        return copied
      } catch (error) {
        return false
      }
    },
    async connectStripe() {
      this.stripeLoading = true
      const link = await this.$store.dispatch('shop/createStripeOnboardingLink')
      this.stripeLoading = false
      if (link && link.url) {
        window.location.href = link.url
      }
    },
    async submitShopEdit() {
      if (this.isValue) {
        this.loadingBtn = true
        this.formShop.shop_payment_methods = normalizePaymentMethods(
          this.formShop.shop_payment_methods
        )
        this.formShop.discount_percentages = normalizeDiscountPercentages(
          this.formShop.discount_percentages
        )
        this.formShop.shop_theme = normalizeShopTheme(this.formShop.shop_theme)
        const res = await this.$store.dispatch('shop/updateShopInfo', {
          id: this.id,
          data: this.formShop,
        })
        if (res) {
          this.stsMsg = true
          this.loadingBtn = false
          this.isDirty = false
          this.$store.dispatch('notifications/success', {
            message: 'Réglages enregistrés avec succès.',
          })
          this.$router.push('/settings')
        } else {
          this.stsMsg = true
          this.loadingBtn = false
          this.$store.dispatch('notifications/error', {
            message: "Échec de l'enregistrement des réglages.",
          })
        }
        // logique de soumission ici, par exemple :
        // appel API pour soumettre les données du formulaire
        // puis réinitialiser loadingBtn à false lorsque l'opération est terminée
      }
    },
    submit() {
      this.$refs.form.validate() // will return true if valid
    },
    reset() {
      this.$refs.form.reset()
    },
    openThemeJsonDialog() {
      this.themeJsonDraft = this.themeJson
      this.themeJsonError = ''
      this.themeJsonDialog = true
    },
    closeThemeJsonDialog() {
      this.themeJsonDialog = false
      this.themeJsonDraft = ''
      this.themeJsonError = ''
    },
    formatShopThemeJson(theme) {
      return JSON.stringify(normalizeShopTheme(theme), null, 2)
    },
    applyThemeJsonDraft() {
      try {
        const parsed = JSON.parse(this.themeJsonDraft)
        const normalized = normalizeShopTheme(parsed)
        this.formShop.shop_theme = normalized
        this.themeJson = this.formatShopThemeJson(normalized)
        this.themeJsonError = ''
        this.themeJsonDialog = false
        this.themeJsonDraft = ''
      } catch (error) {
        this.themeJsonError = 'JSON du theme invalide.'
        this.$store.dispatch('notifications/error', {
          message: 'JSON du theme invalide.',
        })
      }
    },
    validateInput(event) {
      const charCode = event.which ? event.which : event.keyCode
      // Permet seulement les chiffres et interdit plus de 2 chiffres
      if (charCode < 48 || charCode > 57 || event.target.value.length >= 2) {
        event.preventDefault()
      }
    },
  },
}
</script>

<style scoped>
.settings-page {
  background: var(--se-color-bg, #f3f5f8);
  color: var(--se-color-text-body, #1f2933);
  padding-bottom: 96px;
}

.settings-loading,
.settings-hero,
.settings-card,
.settings-actionbar {
  border-color: var(--se-color-border, #dfe5ee) !important;
  border-radius: var(--se-radius-md, 8px) !important;
}

.settings-hero {
  align-items: flex-start;
  background: var(--se-color-surface, #fff);
  border: 1px solid var(--se-color-border, #dfe5ee);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  margin: 18px 0 14px;
  padding: 16px 18px;
}

.settings-hero__title {
  align-items: center;
  display: flex;
  gap: 14px;
  min-width: 240px;
}

.settings-hero__icon {
  align-items: center;
  background: var(--se-color-primary-soft, #e8f2ff);
  border-radius: var(--se-radius-md, 8px);
  display: inline-flex;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.settings-hero h1 {
  color: var(--se-color-text, #121826);
  font-size: var(--se-font-page-title, 1.5rem);
  font-weight: var(--se-weight-bold, 700);
  letter-spacing: 0;
  line-height: 1.15;
  margin: 0;
  text-wrap: balance;
}

.settings-hero p {
  color: var(--se-color-text-muted, #687386);
  font-size: var(--se-font-small, 0.875rem);
  line-height: 1.45;
  margin: 4px 0 0;
}

.settings-actionbar__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-card {
  background: var(--se-color-surface, #fff) !important;
  scroll-margin-top: 140px;
  transition:
    border-color var(--se-transition-fast, 150ms ease-out),
    box-shadow var(--se-transition-fast, 150ms ease-out);
}

.settings-card:hover {
  border-color: var(--se-color-border, #dfe5ee) !important;
  box-shadow: var(--se-shadow-panel, 0 2px 8px rgba(25, 39, 52, 0.04));
}

.settings-card h3 {
  color: var(--se-color-text, #121826);
  font-size: var(--se-font-title, 1.25rem);
  font-weight: var(--se-weight-semibold, 600);
  letter-spacing: 0;
  line-height: 1.25;
}

.settings-section-title {
  align-items: center;
  display: flex;
  gap: 8px;
}

.settings-section-title .v-icon {
  background: var(--se-color-primary-soft, #e8f2ff);
  border-radius: var(--se-radius-sm, 6px);
  height: 28px;
  width: 28px;
}

.settings-card ::v-deep .v-input__slot {
  border-radius: var(--se-radius-sm, 6px) !important;
  min-height: 40px !important;
}

.settings-card ::v-deep .v-input__prepend-inner {
  margin-right: 8px;
}

.settings-card ::v-deep .v-input__prepend-inner .v-icon {
  color: var(--se-color-primary, #1976d2) !important;
  opacity: 0.9;
}

.settings-card ::v-deep .v-label {
  color: var(--se-color-text-muted, #687386) !important;
}

.settings-card ::v-deep input,
.settings-card ::v-deep textarea {
  color: var(--se-color-text-body, #1f2933) !important;
}

.settings-field {
  margin-top: 0 !important;
}

.settings-field ::v-deep .v-input__append-inner,
.settings-field ::v-deep .v-input__prepend-inner {
  margin-top: 8px !important;
}

.settings-theme-card {
  min-height: auto;
}

.settings-theme-controls {
  align-items: flex-end;
  display: flex;
  gap: 12px;
}

.settings-theme-select-col {
  flex: 0 1 320px;
  max-width: 320px;
}

.settings-theme-select {
  width: 100%;
}

.settings-theme-json-actions {
  align-items: center;
  display: flex;
  height: 40px;
}

.settings-theme-edit-button {
  min-width: 92px !important;
}

.settings-theme-dialog-title {
  color: var(--se-color-text, #121826);
  font-size: var(--se-font-title, 1.25rem);
  font-weight: var(--se-weight-semibold, 600);
}

.settings-theme-json ::v-deep textarea {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.86rem;
  line-height: 1.5;
}

.settings-site-link {
  min-height: 40px;
  padding: 0 16px !important;
}

.settings-public-actions {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.settings-main-grid {
  align-items: stretch;
}

.settings-hours-card {
  min-height: 100%;
}

.settings-hours-list {
  margin: 0 auto;
  max-width: 620px;
}

.settings-hours-row {
  align-items: center;
  column-gap: 18px;
  display: grid;
  grid-template-columns: 112px 104px 72px 72px;
  min-height: 52px;
}

.settings-hours-day {
  color: var(--se-color-text, #121826);
  font-size: 0.95rem;
  font-weight: var(--se-weight-semibold, 600);
  line-height: 1.2;
  white-space: nowrap;
}

.settings-hours-switch {
  align-items: center;
  display: flex;
}

.settings-hours-time {
  margin-top: 0 !important;
  max-width: 72px;
}

.settings-hours-closed {
  grid-column: span 2;
}

.settings-hours-card ::v-deep .v-input--selection-controls {
  margin-top: 0;
  padding-top: 0;
}

.settings-hours-card ::v-deep .v-input__slot {
  min-height: 36px !important;
}

.settings-hours-card ::v-deep .v-text-field__suffix {
  color: var(--se-color-text, #121826);
  padding-left: 4px;
}

.settings-printer-row {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 0.9fr);
}

.settings-social-grid {
  display: grid;
  gap: 4px 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-actionbar {
  align-items: center;
  background: var(--se-color-surface, #fff);
  border: 1px solid var(--se-color-border, #dfe5ee);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin: 18px 0 0;
  padding: 14px 16px;
}

.settings-actionbar strong {
  color: var(--se-color-text, #121826);
  display: block;
  font-size: var(--se-font-small, 0.875rem);
  line-height: 1.3;
}

.settings-actionbar span {
  color: var(--se-color-text-muted, #687386);
  display: block;
  font-size: var(--se-font-caption, 0.75rem);
  line-height: 1.35;
  margin-top: 2px;
}

@media (max-width: 960px) {
  .settings-printer-row,
  .settings-social-grid {
    grid-template-columns: 1fr;
  }

  .settings-actionbar {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-actionbar__actions .v-btn {
    flex: 1 1 auto;
  }
}

@media (max-width: 720px) {
  .settings-theme-controls,
  .settings-hero,
  .settings-hero__title {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-theme-json-actions {
    align-items: stretch;
    height: auto;
  }

  .settings-theme-edit-button {
    width: 100%;
  }

  .settings-theme-select-col {
    flex-basis: auto;
    max-width: none;
    width: 100%;
  }

  .settings-hours-list {
    max-width: 100%;
  }

  .settings-hours-row {
    column-gap: 6px;
    grid-template-columns: minmax(74px, 1fr) 86px 58px 58px;
  }

  .settings-hours-day {
    font-size: 0.875rem;
  }

  .settings-hours-time {
    max-width: 58px;
  }

  .settings-public-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-public-actions .v-btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-card {
    transition: none;
  }

  .settings-card:hover {
    box-shadow: none;
  }
}
</style>
