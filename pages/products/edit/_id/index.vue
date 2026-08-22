<template>
  <v-container>
    <v-alert v-if="stsMsg" dense text type="error">
      {{ configurationError || message }}
    </v-alert>

    <Loading v-if="loadPage" />
    <v-row v-else class="mt-5">
      <v-col md="4" sm="5" cols="12">
        <v-card outlined>
          <ImageCropper
            v-model="productImg"
            :preview-url-prop="productImageUrl"
          />
        </v-card>
      </v-col>
      <v-col md="8" sm="7" cols="12">
        <v-form v-model="isValue" @submit.prevent="submitEditProduct">
          <v-text-field
            v-model="formeditproduct.name"
            label="Nom du produit"
            type="text"
            :rules="[(v) => !!v || 'Nom du produit requis']"
            placeholder="Saisir le nom du produit"
            required
            autofocus
          />
          <v-text-field
            v-model="formeditproduct.description"
            label="Description"
            type="text"
            :rules="[(v) => !!v || 'Description du produit requise']"
            placeholder="Saisir la description du produit"
            required
          />
          <v-switch
            v-model="formeditproduct.track_stock"
            label="Suivre le stock"
          />
          <div v-if="formeditproduct.track_stock">
            <v-text-field
              v-model="formeditproduct.stock"
              label="Stock actuel"
              type="number"
              :rules="[(v) => v !== '' || 'Stock actuel requis']"
              required
            />
            <v-text-field
              v-model="formeditproduct.minimum_stock"
              label="Seuil minimum"
              type="number"
              :rules="[(v) => v !== '' || 'Seuil minimum requis']"
              required
            />
            <v-text-field
              v-model="formeditproduct.target_stock"
              label="Stock cible"
              type="number"
              :rules="[(v) => v !== '' || 'Stock cible requis']"
              required
            />
            <v-combobox
              v-model="formeditproduct.stock_unit"
              :items="['piece', 'paquet', 'bouteille', 'carton', 'bac']"
              label="Unite"
              :rules="[(v) => !!v || 'Unite requise']"
              required
            />
            <v-select
              v-model="formeditproduct.stock_zero_behavior"
              :items="[
                { text: 'Bloquer a zero', value: 'block' },
                { text: 'Autoriser avec alerte', value: 'warn' },
              ]"
              label="A stock zero"
              required
            />
          </div>
          <br />
          <v-text-field
            v-model="formeditproduct.price"
            label="Prix TTC"
            type="number"
            step="0.01"
            class="d-inline-flex"
            append-outer-icon="mdi-currency-eur"
            :rules="[(v) => !!v || 'Prix requis']"
            placeholder="Saisir le prix du produit"
            required
          />
          <v-radio-group
            v-model="formeditproduct.vat_rate_dine_in"
            label="TVA sur place"
            row
          >
            <v-radio label="5,5 %" :value="5.5"></v-radio>
            <v-radio label="10 %" :value="10"></v-radio>
            <v-radio label="20 %" :value="20"></v-radio>
          </v-radio-group>
          <v-radio-group
            v-model="formeditproduct.vat_rate_takeaway"
            label="TVA à emporter"
            row
          >
            <v-radio label="5,5 %" :value="5.5"></v-radio>
            <v-radio label="10 %" :value="10"></v-radio>
            <v-radio label="20 %" :value="20"></v-radio>
          </v-radio-group>
          <div class="text-caption grey--text mb-4">Le prix saisi est TTC.</div>
          <br />
          <v-select
            v-model="formeditproduct.categoryid"
            :items="allCategory"
            :rules="[(v) => !!v || 'Catégorie requise']"
            item-value="id"
            class="d-inline-flex"
            item-text="name"
            label="Catégorie"
            required
          ></v-select>

          <v-divider class="my-6"></v-divider>
          <ProductStepConfigurator
            v-model="customizationConfig"
            :available-steps="availableSteps"
            @validity-change="setConfigurationValidity"
          />

          <v-btn
            color="warning"
            class="text-none mt-4"
            @click.stop="$router.push('/products')"
          >
            Annuler
            <v-icon small right>mdi-close-circle</v-icon>
          </v-btn>
          <v-btn
            :disabled="!isValue || !configurationValid"
            :loading="loadingBtn"
            class="ml-4 text-none mt-4"
            type="submit"
            color="primary"
          >
            Valider
            <v-icon small right>mdi-check-circle</v-icon>
          </v-btn>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'
import ProductStepConfigurator from '@/components/customizations/ProductStepConfigurator'
import { serializeProductCustomizationConfig } from '@/helpers/customizations'
import price from '@/helpers/price'

const PARTIAL_SAVE_MESSAGE =
  'Le produit a été enregistré, mais sa configuration n’a pas pu être mise à jour.'

export default {
  components: {
    Loading,
    ProductStepConfigurator,
  },
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      id: this.$route.params.id,
      isValue: false,
      productImg: null,
      loadingBtn: false,
      loadPage: false,
      stsMsg: false,
      configurationValid: true,
      configurationError: '',
      customizationConfig: [],
      formeditproduct: {
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
    }
  },
  computed: {
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    productImageUrl() {
      if (!this.formeditproduct.image) return null
      return `${this.staticURL}/api/v1/imgproducts/${this.formeditproduct.image}`
    },
    allCategory() {
      return this.$store.get('categories/dataCategories')
    },
    availableSteps() {
      return this.$store.get('customizations/dataSteps') || []
    },
    detailProduct() {
      return this.$store.get('products/detailProduct')
    },
    message() {
      return this.$store.get('products/message')
    },
  },
  async mounted() {
    this.loadPage = true
    await Promise.all([
      this.$store.dispatch('categories/getAllCategories'),
      this.$store.dispatch('customizations/getSteps'),
      this.$store.dispatch('products/getDetailProduct', this.id),
    ])

    const product = this.detailProduct[0]
    if (product) {
      this.formeditproduct = {
        name: product.name,
        categoryid: product.categoryid,
        price: product.price,
        stock: product.stock,
        track_stock: Number(product.track_stock) !== 0,
        stock_zero_behavior: product.stock_zero_behavior || 'block',
        minimum_stock: product.minimum_stock ?? 1,
        target_stock: product.target_stock ?? product.stock ?? 1,
        stock_unit: product.stock_unit ?? 'piece',
        description: product.description,
        image: product.image,
        vat_rate: Number(product.vat_rate || 10),
        vat_rate_dine_in: Number(
          product.vat_rate_dine_in || product.vat_rate || 10
        ),
        vat_rate_takeaway: Number(
          product.vat_rate_takeaway ||
            product.vat_rate_dine_in ||
            product.vat_rate ||
            10
        ),
      }
      this.customizationConfig = (product.customization_steps || []).map(
        (step, stepIndex) => ({
          step_id: step.step_id,
          name: step.name,
          position: stepIndex,
          minimum_choices: step.minimum_choices,
          maximum_choices: step.maximum_choices,
          active: step.active,
          choices: (step.choices || []).map((choice, choiceIndex) => ({
            step_choice_id: choice.step_choice_id,
            name: choice.name || choice.choice_name,
            choice_type: choice.choice_type,
            position: choiceIndex,
            extra_price: choice.extra_price,
            active: choice.active,
          })),
        })
      )
    } else {
      this.stsMsg = true
    }
    this.loadPage = false
  },
  methods: {
    setConfigurationValidity({ valid, errors }) {
      this.configurationValid = valid
      this.configurationError = valid ? '' : errors[0]
    },
    buildProductPayload() {
      const data = {
        name: this.formeditproduct.name,
        description: this.formeditproduct.description,
        track_stock: this.formeditproduct.track_stock ? 1 : 0,
        price: this.roundPrice(this.formeditproduct.price),
        vat_rate: this.formeditproduct.vat_rate_dine_in,
        vat_rate_dine_in: this.formeditproduct.vat_rate_dine_in,
        vat_rate_takeaway: this.formeditproduct.vat_rate_takeaway,
        categoryid: this.formeditproduct.categoryid,
      }
      if (this.formeditproduct.track_stock) {
        Object.assign(data, {
          stock: this.formeditproduct.stock,
          stock_zero_behavior: this.formeditproduct.stock_zero_behavior,
          minimum_stock: this.formeditproduct.minimum_stock,
          target_stock: this.formeditproduct.target_stock,
          stock_unit: this.formeditproduct.stock_unit,
        })
      }
      if (!this.productImg) return data

      const ext = this.productImg.type === 'image/png' ? 'png' : 'jpg'
      const image = new File(
        [this.productImg],
        `product_${Date.now()}.${ext}`,
        { type: this.productImg.type }
      )
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) =>
        formData.append(key, value)
      )
      formData.append('image', image)
      return formData
    },
    async submitEditProduct() {
      if (!this.configurationValid) return

      let serializedConfig
      try {
        serializedConfig = serializeProductCustomizationConfig(
          this.customizationConfig
        )
      } catch (error) {
        this.configurationValid = false
        this.configurationError = error.message
        this.stsMsg = true
        return
      }

      this.loadingBtn = true
      this.stsMsg = false
      const productSaved = await this.$store.dispatch(
        'products/updateProduct',
        {
          id: this.id,
          data: this.buildProductPayload(),
          refresh: false,
          notify: false,
        }
      )

      if (!productSaved) {
        this.loadingBtn = false
        this.stsMsg = true
        return
      }

      const configurationSaved = await this.$store.dispatch(
        'products/updateProductCustomizationConfig',
        { id: this.id, data: serializedConfig }
      )
      this.loadingBtn = false
      if (!configurationSaved) {
        this.configurationError = PARTIAL_SAVE_MESSAGE
        this.stsMsg = true
        this.$store.dispatch('products/set/message', PARTIAL_SAVE_MESSAGE)
        this.$store.dispatch('notifications/error', PARTIAL_SAVE_MESSAGE)
        return
      }

      this.stsMsg = false
      this.$router.push('/products')
    },
  },
}
</script>
