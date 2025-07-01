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

    <div class="mt-5">
      <h3>Informations & Réglages de votre établissment</h3>
    </div>
    <v-row style="justify-content: space-between">
      <v-col md="4" sm="5" cols="12">
        <v-card outlined style="height: 100%">
          <v-img
            src="https://www.coffeebeancompany.co.uk/app/uploads/2017/04/Coffee-Shop-1024x765.jpg"
          />
          <v-card-actions class="text-center">
            <input
              id="fileImageProfile"
              type="file"
              accept="image/png/jpg"
              class="d-none"
              @input="changeImg"
            />
            <v-btn
              :loading="loadingBtnImg"
              outlined
              color="success"
              rounded
              onclick="document.getElementById('fileImageProfile').click()"
              class="text-capitalize mt-5 mb-5"
              width="100%"
            >
              Change
            </v-btn>
          </v-card-actions>
        </v-card>
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
      </v-row>
      <v-btn color="warning" @click.stop="$router.push('/restaurants')"
        >Annuler</v-btn
      >
      <v-btn
        :disabled="!isValue"
        :loading="loadingBtn"
        class="ml-4"
        type="submit"
        color="primary"
        >Soumettre</v-btn
      >
    </v-form>
    <pre type="json">{{ formShop }}</pre>
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
    AllPaymentsMethods: ['Cheques', 'Especes', 'Tickets Restaurants'],
    image: '',
    formShop: {
      shop_name: '',
      shop_description: '',
      shop_phone: '',
      shop_hours: [],
      shop_payment_methods: [],
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
      return [...this.$store.get('shop/shop_hours')]
    },
    shop_payment_methods() {
      return this.$store.get('shop/shop_payment_methods')
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
        this.formShop.shop_description = this.shop_description
        this.formShop.shop_payment_methods = this.shop_payment_methods
        this.formShop.shop_hours = JSON.parse(JSON.stringify(this.shop_hours))

        console.log('Form Shop', this.formShop)
      })
      .finally(() => {
        this.loadPage = false
      })
  },
  methods: {
    async changeImg(e) {
      const image = e.target.files[0]
      if (image) {
        if (
          image.type !== 'image/jpeg' &&
          image.type !== 'image/png' &&
          image.type !== 'image/JPEG' &&
          image.type !== 'image/PNG'
        ) {
          alert('Please enter a jpg/jpeg/png')
        } else {
          this.imageUrl = ''
          this.imageRaw = ''
          this.imageUrl = URL.createObjectURL(image)
          this.imageRaw = image
          const fd = new FormData()
          fd.append('image', this.imageRaw)

          this.loadingBtnImg = true
          const res = await this.$store.dispatch('products/updateProduct', {
            id: this.id,
            data: fd,
          })
          if (res) {
            this.stsMsg = true
            this.loadingBtnImg = false
            this.$router.push('/settings')
          } else {
            this.stsMsg = true
            this.loadingBtnImg = false
          }
        }
      }
    },
    staticURL() {
      return this.$store.get('staticURL')
    },
    async submitShopEdit() {
      if (this.isValue) {
        this.loadingBtn = true
        const res = await this.$store.dispatch('shop/updateShopInfo', {
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
