<template>
  <v-container>
    <v-alert v-if="errMsg" dense text type="error">
      {{ configurationError || message }}
    </v-alert>
    <v-row class="mt-5">
      <v-col md="4" sm="5" cols="12">
        <ImageCropper v-model="productImg" />
      </v-col>
      <v-col>
        <v-form v-model="isValue" @submit.prevent="submitProduct">
          <v-text-field
            v-model="formproduct.name"
            label="Nom du produit"
            type="text"
            :rules="[(v) => !!v || 'Le nom du produit est requis']"
            placeholder="Saisir le nom du produit"
            required
          ></v-text-field>
          <v-text-field
            v-model="formproduct.description"
            label="Description"
            type="text"
            :rules="[(v) => !!v || 'Description du produit requise']"
            placeholder="Saisir la description du produit"
            required
          ></v-text-field>
          <v-switch
            v-model="formproduct.track_stock"
            label="Suivre le stock"
          />
          <div v-if="formproduct.track_stock">
            <v-text-field
              v-model="formproduct.stock"
              label="Stock actuel"
              type="number"
              prepend-icon="mdi-package-variant-closed"
              :rules="[(v) => v !== '' || 'Stock actuel requis']"
              required
            ></v-text-field>
            <v-text-field
              v-model="formproduct.minimum_stock"
              label="Seuil minimum"
              type="number"
              prepend-icon="mdi-alert-outline"
              :rules="[(v) => v !== '' || 'Seuil minimum requis']"
              required
            />
            <v-text-field
              v-model="formproduct.target_stock"
              label="Stock cible"
              type="number"
              prepend-icon="mdi-bullseye-arrow"
              :rules="[(v) => v !== '' || 'Stock cible requis']"
              required
            />
            <v-combobox
              v-model="formproduct.stock_unit"
              :items="['piece', 'paquet', 'bouteille', 'carton', 'bac']"
              label="Unité"
              prepend-icon="mdi-scale"
              :rules="[(v) => !!v || 'Unité requise']"
              required
            />
            <v-select
              v-model="formproduct.stock_zero_behavior"
              :items="[
                { text: 'Bloquer à zéro', value: 'block' },
                { text: 'Autoriser avec alerte', value: 'warn' },
              ]"
              label="À stock zéro"
              prepend-icon="mdi-alert-circle-outline"
              required
            />
          </div>

          <v-text-field
            v-model="formproduct.price"
            label="Prix TTC"
            type="number"
            step="0.01"
            append-outer-icon="mdi-currency-eur"
            :rules="[(v) => !!v || 'Le prix du produit est requis']"
            placeholder="Saisir le prix du produit"
            required
          ></v-text-field>
          <v-radio-group
            v-model="formproduct.vat_rate_dine_in"
            label="TVA sur place"
            row
          >
            <v-radio label="5,5 %" :value="5.5"></v-radio>
            <v-radio label="10 %" :value="10"></v-radio>
            <v-radio label="20 %" :value="20"></v-radio>
          </v-radio-group>
          <v-radio-group
            v-model="formproduct.vat_rate_takeaway"
            label="TVA à emporter"
            row
          >
            <v-radio label="5,5 %" :value="5.5"></v-radio>
            <v-radio label="10 %" :value="10"></v-radio>
            <v-radio label="20 %" :value="20"></v-radio>
          </v-radio-group>
          <div class="text-caption grey--text mb-4">Le prix saisi est TTC.</div>
          <v-select
            v-model="formproduct.categoryid"
            label="Catégorie"
            :items="allCategory"
            :rules="[(v) => !!v || 'La catégorie est requise']"
            item-value="id"
            item-text="name"
            required
          ></v-select>

          <v-divider class="my-6"></v-divider>
          <ProductStepConfigurator
            v-model="customizationConfig"
            :available-steps="availableSteps"
            @validity-change="setConfigurationValidity"
          />

          <v-btn
            :disabled="!isValue || !configurationValid"
            :loading="loadingBtn"
            class="text-none mt-4"
            type="submit"
            color="primary"
          >
            Valider
            <v-icon small right>mdi-check-circle</v-icon>
          </v-btn>

          <v-btn
            class="text-none ml-4 mt-4"
            color="warning"
            @click.stop="$router.push('/products')"
          >
            Annuler
            <v-icon small right>mdi-close-circle</v-icon>
          </v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ProductStepConfigurator from '@/components/customizations/ProductStepConfigurator'
import { serializeProductCustomizationConfig } from '@/helpers/customizations'
import price from '@/helpers/price'

export default {
  components: { ProductStepConfigurator },
  mixins: [price],
  middleware: 'auth',
  data: () => ({
    productImg: null,
    isValue: false,
    loadingBtn: false,
    errMsg: false,
    configurationValid: true,
    configurationError: '',
    customizationConfig: [],
    formproduct: {
      name: '',
      description: '',
      categoryid: '',
      price: '',
      stock: '',
      track_stock: true,
      stock_zero_behavior: 'block',
      minimum_stock: 1,
      target_stock: 1,
      stock_unit: 'piece',
      image: '',
      vat_rate: 10,
      vat_rate_dine_in: 10,
      vat_rate_takeaway: 10,
    },
  }),
  computed: {
    allCategory() {
      return this.$store.get('categories/dataCategories')
    },
    availableSteps() {
      return this.$store.get('customizations/dataSteps') || []
    },
    message() {
      return this.$store.get('products/message')
    },
  },
  watch: {
    productImg(newBlob) {
      if (!newBlob) return
      const ext = newBlob.type === 'image/png' ? 'png' : 'jpg'
      const filename = `product_${Date.now()}.${ext}`
      this.formproduct.image = new File([newBlob], filename, {
        type: newBlob.type,
      })
    },
  },
  mounted() {
    this.$store.dispatch('categories/getAllCategories')
    this.$store.dispatch('customizations/getSteps')
  },
  methods: {
    setConfigurationValidity({ valid, errors }) {
      this.configurationValid = valid
      this.configurationError = valid ? '' : errors[0]
    },
    async submitProduct() {
      if (!this.configurationValid) return

      let serializedConfig
      try {
        serializedConfig = serializeProductCustomizationConfig(
          this.customizationConfig
        )
      } catch (error) {
        this.configurationValid = false
        this.configurationError = error.message
        this.errMsg = true
        return
      }

      const fd = new FormData()
      fd.append('name', this.formproduct.name)
      fd.append('price', this.roundPrice(this.formproduct.price))
      fd.append('vat_rate', this.formproduct.vat_rate_dine_in)
      fd.append('vat_rate_dine_in', this.formproduct.vat_rate_dine_in)
      fd.append('vat_rate_takeaway', this.formproduct.vat_rate_takeaway)
      fd.append('categoryid', this.formproduct.categoryid)
      fd.append('image', this.formproduct.image)
      fd.append('description', this.formproduct.description)
      fd.append('track_stock', this.formproduct.track_stock ? 1 : 0)
      if (this.formproduct.track_stock) {
        fd.append('stock', this.formproduct.stock)
        fd.append('stock_zero_behavior', this.formproduct.stock_zero_behavior)
        fd.append('minimum_stock', this.formproduct.minimum_stock)
        fd.append('target_stock', this.formproduct.target_stock)
        fd.append('stock_unit', this.formproduct.stock_unit)
      }
      fd.append('customization_config', JSON.stringify(serializedConfig))

      this.loadingBtn = true
      const saved = await this.$store.dispatch('products/postProducts', fd)
      this.loadingBtn = false
      this.errMsg = !saved
      if (saved) this.$router.push('/products')
    },
  },
}
</script>
