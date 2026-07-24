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
          <v-text-field
            v-model="formeditproduct.stock"
            label="Stock"
            class="d-inline-flex"
            type="number"
            :rules="[(v) => !!v || 'Stock requis']"
            placeholder="Saisir le stock du produit"
            required
          />
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
        image: '',
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
        description: product.description,
        image: product.image,
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
        stock: this.formeditproduct.stock,
        price: this.roundPrice(this.formeditproduct.price),
        categoryid: this.formeditproduct.categoryid,
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
      this.stsMsg = !configurationSaved
      if (configurationSaved) this.$router.push('/products')
    },
  },
}
</script>
