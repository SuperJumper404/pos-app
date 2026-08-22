<template>
  <v-container>
    <v-form ref="form" v-model="valid" @submit.prevent="submitShopEdit">
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>

    <div class="mt-5 mb-5">
      <h2>Informations & Réglages de votre établissment</h2>
    </div>
    <v-row style="justify-content: space-between">
      <v-col md="4" sm="5" cols="12">
        <v-card outlined class="pa-4 fill-height">
          <h3 class="mb-4">Photo de votre établissement</h3>
          <ImageCropper
            v-model="shopImg"
            :preview-url-prop="imageUrl"
            :ratio="4 / 1"
          />

          <v-row class="mt-8 pt-4 d-flex justify-center">
            <v-btn
              color="primary"
              rounded
              :href="`/click-and-collect/${shopId}/${shop_name}`"
              target="_blank"
            >
              Voir le site de mon restaurant
              <v-icon> mdi-arrow-top-right </v-icon>
            </v-btn>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="6">
        <v-card outlined class="pa-4 fill-height">
          <h3 class="mb-4">Horaires d'ouvertures</h3>
          <div v-for="(day, i) in formShop.shop_hours" :key="i">
            <v-row
              style="
                display: flex;
                justify-content: space-evenly;
                align-items: baseline;
              "
            >
              <h3 style="width: 100px">{{ day.dayName }}</h3>
              <v-switch
                v-model="day.isOpen"
                :label="day.isOpen ? 'Ouvert' : 'Fermé'"
                color="success"
              ></v-switch>
              <v-col cols="6" md="2">
                <v-text-field
                  v-if="day.isOpen"
                  v-model="day.from"
                  style="width: 60px"
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
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field
                  v-if="day.isOpen"
                  v-model="day.to"
                  style="width: 60px"
                  hide-details
                  single-line
                  outlined
                  type="text"
                  suffix="H"
                  dense
                  :disabled="!day.isOpen"
                  label="À"
                ></v-text-field>
              </v-col>
            </v-row>
          </div>
        </v-card>
      </v-col>
    </v-row>

      <v-row>
        <v-col cols="12">
          <v-card outlined class="pa-4 mb-4">
            <h3 class="mb-4">Informations de l'établissement</h3>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_name"
                  label="Nom du restaurant"
                  type="text"
                  :rules="[(v) => !!v || 'Nom du restaurant requis']"
                  placeholder="Insérez le nom du restaurant"
                  required
                  autofocus
                ></v-text-field>
              </v-col>

              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_description"
                  label="Description"
                  :rules="[(v) => !!v || 'Description requise']"
                  placeholder="Insérez la description"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_phone"
                  label="Numéro de téléphone"
                  type="text"
                  :rules="[(v) => !!v || 'Numéro de téléphone requis']"
                  placeholder="Insérez le numéro de téléphone"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_status"
                  label="Statut / Message d'information pour vos clients"
                  type="text"
                  placeholder="Un statut particulier, événements..."
                  required
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_adress"
                  label="Adresse"
                  type="text"
                  :rules="[(v) => !!v || 'Adresse requise']"
                  placeholder="Insérez l'adresse de votre établissement "
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_siret"
                  label="Numéro de SIRET"
                  type="text"
                  :rules="[(v) => !!v || 'Numéro de SIRET requis']"
                  placeholder="Insérez le numéro de SIRET"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="formShop.shop_naf"
                  label="Code NAF"
                  type="text"
                  placeholder="Ex. 5610A"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-card outlined class="pa-4">
            <h3 class="mb-4">Ventes, TVA et paiements</h3>
            <v-row>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formShop.shop_payment_methods"
                  :items="PAYMENT_METHOD_OPTIONS"
                  item-text="text"
                  item-value="value"
                  label="Moyens de paiement disponibles"
                  multiple
                  chips
                ></v-combobox>
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formShop.discount_percentages"
                  :items="DISCOUNT_PERCENTAGE_OPTIONS"
                  label="Remises en pourcentage disponibles"
                  suffix="%"
                  type="number"
                  multiple
                  chips
                  small-chips
                  hint="Ces remises seront proposées au moment de l'encaissement."
                  persistent-hint
                ></v-combobox>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formShop.shop_vat_number"
                  label="Numéro de TVA intracommunautaire"
                  type="text"
                  placeholder="Ex. FR12345678901"
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
        <v-col cols="6">
          <v-card outlined class="pa-4 fill-height">
            <h3 class="mb-4">Réglages de l'imprimante</h3>
            <div class="d-inline-flex">
              <v-text-field
                v-model="formShop.shop_printer_ip"
                label="Adresse IP de l'imprimante"
                type="text"
                :disabled="!formShop.smart_print_app"
                max-width="20%"
                :rules="[(v) => !!v || 'Adresse IP requise']"
                placeholder="Insérez l'adresse IP de l'imprimante"
                required
              ></v-text-field>
              <v-switch
                v-model="formShop.smart_print_app"
                class="ml-8"
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

        <v-col cols="6">
          <v-card outlined class="pa-4 fill-height">
            <h3 class="mb-4">Encaissement à table via mobile</h3>

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
        <v-col cols="6">
          <v-card outlined class="pa-4 fill-height">
            <h3 class="mb-4">Réseaux Sociaux</h3>
            <div class="d-flex justify-center">
              <v-text-field
                v-model="formShop.shop_social_media.instagram"
                prepend-icon="mdi-instagram"
                label="Instagram"
                type="text"
                class="d-inline-flex"
                style="max-width: 50%"
                max-width="50%"
                placeholder="Insérez le lien Instagram"
              ></v-text-field>
            </div>
            <div class="d-flex justify-center">
              <v-text-field
                v-model="formShop.shop_social_media.facebook"
                prepend-icon="mdi-facebook"
                label="Facebook"
                type="text"
                class="d-inline-flex"
                style="max-width: 50%"
                max-width="50%"
                placeholder="Insérez le lien Facebook"
              ></v-text-field>
            </div>
            <div class="d-flex justify-center">
              <v-text-field
                v-model="formShop.shop_social_media.tiktok"
                prepend-icon="mdi-tiktokbvcbcv"
                label="TikTok"
                type="text"
                class="d-inline-flex"
                style="max-width: 50%"
                max-width="50%"
                placeholder="Insérez le lien TikTok"
              >
                <template v-slot:prepend>
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
            </div>
            <div class="d-flex justify-center">
              <v-text-field
                v-model="formShop.shop_social_media.snapchat"
                prepend-icon="mdi-snapchat"
                label="Snapchat"
                type="text"
                class="d-inline-flex"
                style="max-width: 50%"
                max-width="50%"
                placeholder="Insérez le lien Snapchat"
              ></v-text-field>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6">
          <v-card outlined class="pa-4 fill-height">
            <h3 class="mb-4">Avis client sur le ticket de caisse</h3>
            <v-text-field
              v-model="formShop.receipt_review_qr_url"
              label="Lien de l'avis client"
              type="url"
              placeholder="https://..."
              hint="Le QR Code sera imprimé uniquement si ce lien est renseigné."
              persistent-hint
            ></v-text-field>
            <v-text-field
              v-model="formShop.receipt_review_qr_label"
              label="Texte au-dessus du QR Code"
              type="text"
              placeholder="Votre avis nous intéresse"
            ></v-text-field>
            <v-text-field
              v-model="formShop.cash_register_number"
              label="Numéro de caisse"
              type="text"
              placeholder="Ex. Caisse 1"
            ></v-text-field>
          </v-card>
        </v-col>
      </v-row>

      <v-btn
        :disabled="!isValue || !isDirty"
        :loading="loadingBtn"
        class="ml-4 text-none"
        type="submit"
        color="primary"
        >Enregistrer <v-icon small right>mdi-content-save</v-icon></v-btn
      >
      <v-btn
        class="text-none"
        color="warning"
        @click.stop="$router.push('/restaurants')"
        >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
      >
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
export default {
  components: {
    Loading,

    // QrcodeVue,
  },
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  mixins: [formatdate],
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
    PAYMENT_METHOD_OPTIONS,
    DISCOUNT_PERCENTAGE_OPTIONS,
    DEFAULT_DISCOUNT_PERCENTAGES,
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
  },
  watch: {
    formShop: {
      deep: true,
      handler() {
        // Ignore les mutations du pré-remplissage initial (mounted)
        if (this.formReady) this.isDirty = true
      },
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
        console.log(
          ' shop_hours',
          this.shop_hours,
          JSON.stringify(this.shop_hours)
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

        console.log('Form Shop', this.formShop)
        this.imageUrl = `${this.staticURL}/api/v1/imgprofile/${this.formShop.shop_profile_image}`
        console.log(this.imageUrl)

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
