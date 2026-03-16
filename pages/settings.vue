<template>
  <v-container>
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
        <div class="mb-5 flex" style="justify-items: center">
          <h3>Photo de votre établissement</h3>
        </div>

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
      </v-col>

      <v-col cols="6">
        <div class="mb-5 flex" style="justify-items: center">
          <h3>Horaires d'ouvertures</h3>
        </div>

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
                label="From"
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
                label="To"
              ></v-text-field>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>

    <v-form v-model="isValue" @submit.prevent="submitShopEdit">
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
            label="Status / Message d'information pour vos client"
            type="text"
            placeholder="Un status particulier, évenements..."
            required
          ></v-text-field>
        </v-col>

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
          <v-combobox
            v-model="formShop.shop_payment_methods"
            :items="AllPaymentsMethods"
            label="Selectionner les moyens de paiements disponible"
            multiple
            chips
          ></v-combobox>
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model="formShop.shop_siret"
            label="Numéro de S.I.R.E.T"
            type="text"
            :rules="[(v) => !!v || 'Numéro de S.I.R.E.T requis']"
            placeholder="Insérez le numéro de S.I.R.E.T"
            required
          ></v-text-field
        ></v-col>
        <v-col cols="6"></v-col>
        <v-col cols="6">
          <div class="mb-5 flex" style="justify-items: center">
            <h3>Réglages de l'imprimante</h3>
          </div>
          <div class="d-inline-flex">
            <v-text-field
              v-model="formShop.shop_printer_ip"
              label="Adresse IP de l'imprimante"
              type="text"
              :disabled="!formShop.smart_print_app"
              max-width="20%"
              :rules="[(v) => !!v || 'Adresse Ip requise']"
              placeholder="Insérez l'adresse Ip de l'imprimante"
              required
            ></v-text-field>
            <v-switch
              v-model="formShop.smart_print_app"
              class="ml-8"
              label="Imprimer avec Smart Print App"
              color="success"
            ></v-switch>
          </div>
        </v-col>
        <v-col cols="6">
          <div class="mb-5 flex" style="justify-items: center">
            <h3>Réseaux Sociaux</h3>
          </div>
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
            >
            </v-text-field>
          </div>
        </v-col>
      </v-row>

      <v-btn
        :disabled="!isValue"
        :loading="loadingBtn"
        class="ml-4 text-none"
        type="submit"
        color="primary"
        >Soumettre</v-btn
      >
      <v-btn
        class="text-none"
        color="warning"
        @click.stop="$router.push('/restaurants')"
        >Annuler</v-btn
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
import Vue from 'vue'
import VueQRCodeComponent from 'vue-qrcode-component/src/QRCode.vue'

// Register the Vue component
// eslint-disable-next-line vue/component-definition-name-casing
Vue.component('qr-code', VueQRCodeComponent)
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
    isValue: true,
    loadingBtn: false,
    shopId: localStorage.getItem('shopid'),
    AllPaymentsMethods: ['Cheques', 'Especes', 'Tickets Restaurants'],
    shopImg: null,
    imageUrl: null,
    formShop: {
      shop_name: '',
      shop_description: '',
      shop_phone: '',
      shop_status: '',
      shop_hours: [],
      shop_payment_methods: [],
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
    smart_print_app() {
      return this.$store.get('shop/smart_print_app')
    },
    staticURL() {
      return this.$store.get('staticURL')
    },
  },
  watch: {
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
    const calls = [this.$store.dispatch('shop/getShopInfo')]

    Promise.all(calls)
      .then(() => {
        this.formShop.shop_name = this.shop_name
        this.formShop.shop_adress = this.shop_adress
        this.formShop.shop_phone = this.shop_phone
        this.formShop.shop_status = this.shop_status
        this.formShop.shop_description = this.shop_description
        this.formShop.shop_payment_methods = JSON.parse(
          JSON.stringify(this.shop_payment_methods)
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
        this.formShop.smart_print_app = this.smart_print_app

        console.log('Form Shop', this.formShop)
        this.imageUrl = `${this.staticURL}api/v1/imgprofile/${this.formShop.shop_profile_image}`
        console.log(this.imageUrl)
      })
      .finally(() => {
        this.loadPage = false
      })
  },
  methods: {
    async submitShopEdit() {
      if (this.isValue) {
        this.loadingBtn = true
        const res = await this.$store.dispatch('shop/updateShopInfo', {
          id: this.id,
          data: this.formShop,
        })
        if (res) {
          this.stsMsg = true
          this.loadingBtn = false
          this.$router.push('/settings')
        } else {
          this.stsMsg = true
          this.loadingBtn = false
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
