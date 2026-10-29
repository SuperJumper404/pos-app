<template>
  <v-form ref="form" v-model="valid" @submit.prevent="submit">
    <p class="text-subtitle-2 mb-2">Type de choix</p>
    <v-btn-toggle
      v-model="form.choice_type"
      mandatory
      color="primary"
      class="mb-4"
      :disabled="isEditing"
      @change="resetTypeFields"
    >
      <v-btn value="simple" class="text-none" :disabled="isEditing">
        <v-icon left>mdi-image-text</v-icon>
        Choix simple
      </v-btn>
      <v-btn value="linked_product" class="text-none" :disabled="isEditing">
        <v-icon left>mdi-link-variant</v-icon>
        Produit lié
      </v-btn>
    </v-btn-toggle>

    <v-alert v-if="isEditing" dense text type="info" class="mb-4">
      Le type d'un choix existant ne peut pas être remplacé. Créez un nouveau
      choix pour changer de type.
    </v-alert>

    <template v-if="form.choice_type === 'simple'">
      <v-text-field
        v-model="form.name"
        label="Nom du choix"
        :rules="[
          (value) => !!String(value || '').trim() || 'Le nom est requis',
          (value) =>
            String(value || '').trim().length <= 255 ||
            'La longueur maximale est de 255 caractères.',
        ]"
        counter="255"
        maxlength="255"
        required
      ></v-text-field>
      <p class="text-subtitle-2 mb-2">Image carrée (facultative)</p>
      <div class="d-flex justify-end mb-3">
        <v-btn
          outlined
          color="primary"
          class="text-none"
          @click="imageLibraryDialog = true"
        >
          <v-icon left>mdi-image-search-outline</v-icon>
          Bibliothèque
        </v-btn>
      </div>
      <ImageCropper
        ref="choiceImageCropper"
        v-model="image"
        :ratio="1"
        :preview-url-prop="simplePreviewUrl"
      />
    </template>

    <template v-else>
      <v-select
        v-model="form.linked_product_id"
        :items="availableProducts"
        item-value="id"
        item-text="name"
        label="Produit lié"
        :rules="[(value) => !!value || 'Le produit lié est requis']"
        no-data-text="Aucun produit disponible"
        required
      ></v-select>
      <v-card v-if="linkedProduct" outlined class="mb-4 pa-3">
        <div class="d-flex align-center">
          <v-img
            :src="productImageSrc(linkedProduct.image)"
            :aspect-ratio="1"
            max-width="88"
            class="rounded mr-4"
          ></v-img>
          <div>
            <p class="font-weight-bold mb-1">{{ linkedProduct.name }}</p>
            <p class="text-caption mb-0">
              Le nom, l'image et le stock sont hérités de ce produit.
            </p>
          </div>
        </div>
      </v-card>
    </template>

    <v-text-field
      v-model="form.default_extra_price"
      label="Prix par défaut"
      type="number"
      step="0.01"
      suffix="€"
      min="0"
      :rules="[
        (value) =>
          value === '' ||
          Number.isFinite(Number(value)) ||
          'Le prix par défaut est invalide',
      ]"
    ></v-text-field>

    <div class="se-modal-actions mt-4">
      <v-btn class="se-modal-action se-modal-action--secondary text-none" @click="$emit('cancel')">
        <v-icon left>mdi-close</v-icon>
        Annuler
      </v-btn>
      <v-btn
        type="submit"
        color="primary"
        class="se-modal-action se-modal-action--primary text-none"
        :loading="saving"
        :disabled="!valid"
      >
        <v-icon left>mdi-content-save</v-icon>
        Enregistrer
      </v-btn>
    </div>
    <v-dialog v-model="imageLibraryDialog" max-width="980" scrollable>
      <v-card class="se-modal">
        <v-card-title class="se-modal-title">
          <span class="se-modal-title__copy">Bibliothèque d'images</span>
          <v-btn
            class="se-modal-icon"
            icon
            title="Fermer"
            aria-label="Fermer"
            @click="imageLibraryDialog = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <ProductImageLibraryPicker
            v-if="imageLibraryDialog && form.choice_type === 'simple'"
            @select="useLibraryImage"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-form>
</template>

<script>
import ProductImageLibraryPicker from '@/components/products/ProductImageLibraryPicker'

export default {
  name: 'ChoiceEditor',
  components: { ProductImageLibraryPicker },
  props: {
    value: {
      type: Object,
      default: null,
    },
    products: {
      type: Array,
      default: () => [],
    },
    defaultPosition: {
      type: Number,
      default: 0,
    },
    saving: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      valid: false,
      image: null,
      imageLibraryDialog: false,
      form: {
        choice_type: 'simple',
        name: '',
        linked_product_id: null,
        default_extra_price: '0.00',
      },
    }
  },
  computed: {
    isEditing() {
      return !!(this.value && this.value.id)
    },
    persistedActive() {
      return this.value ? this.value.active !== false : true
    },
    staticurl() {
      return String(this.$store.get('staticURL') || '').replace(/\/+$/, '')
    },
    availableProducts() {
      return this.products.filter(
        (product) => ![true, 1, '1'].includes(product.archived)
      )
    },
    linkedProduct() {
      return this.availableProducts.find(
        (product) => String(product.id) === String(this.form.linked_product_id)
      )
    },
    simplePreviewUrl() {
      if (
        !this.value ||
        this.value.choice_type !== 'simple' ||
        !this.value.image
      ) {
        return null
      }
      return `${this.staticurl}/api/v1/imgcustomizations/${this.value.image}`
    },
  },
  watch: {
    value: {
      immediate: true,
      deep: true,
      handler(value) {
        this.image = null
        this.imageLibraryDialog = false
        this.form = {
          choice_type: (value && value.choice_type) || 'simple',
          name: (value && value.name) || '',
          linked_product_id: (value && value.linked_product_id) || null,
          default_extra_price:
            value && value.default_extra_price != null
              ? value.default_extra_price
              : '0.00',
        }
      },
    },
  },
  methods: {
    useLibraryImage(file) {
      if (
        !file ||
        this.form.choice_type !== 'simple' ||
        !this.$refs.choiceImageCropper
      ) return
      this.imageLibraryDialog = false
      this.$refs.choiceImageCropper.loadFile(file)
    },
    productImageSrc(image) {
      return `${this.staticurl}/api/v1/imgproducts/${image || 'default.png'}`
    },
    resetTypeFields() {
      if (this.isEditing) return
      this.image = null
      this.imageLibraryDialog = false
      this.form.name = ''
      this.form.linked_product_id = null
    },
    submit() {
      if (!this.$refs.form.validate()) return
      const data = new FormData()
      data.append('choice_type', this.form.choice_type)
      data.append(
        'default_extra_price',
        this.form.default_extra_price === ''
          ? '0.00'
          : String(this.form.default_extra_price)
      )
      data.append('active', String(this.persistedActive))
      data.append(
        'default_position',
        String(
          this.isEditing ? this.value.default_position : this.defaultPosition
        )
      )

      if (this.form.choice_type === 'simple') {
        data.append('name', this.form.name.trim())
        if (this.image) data.append('image', this.image, 'choice.webp')
      } else {
        data.append('linked_product_id', String(this.form.linked_product_id))
      }

      this.$emit('save', data)
    },
  },
}
</script>
