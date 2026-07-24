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
        ]"
        counter="255"
        required
      ></v-text-field>
      <p class="text-subtitle-2 mb-2">Image carrée (facultative)</p>
      <ImageCropper
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

    <v-switch
      v-if="isEditing"
      v-model="form.active"
      label="Choix actif"
      color="success"
      inset
    ></v-switch>

    <div class="d-flex justify-end mt-4">
      <v-btn text class="text-none mr-2" @click="$emit('cancel')">
        Annuler
      </v-btn>
      <v-btn
        type="submit"
        color="primary"
        class="text-none"
        :loading="saving"
        :disabled="!valid"
      >
        Enregistrer
        <v-icon small right>mdi-content-save</v-icon>
      </v-btn>
    </div>
  </v-form>
</template>

<script>
export default {
  name: 'ChoiceEditor',
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
      form: {
        choice_type: 'simple',
        name: '',
        linked_product_id: null,
        active: true,
      },
    }
  },
  computed: {
    isEditing() {
      return !!(this.value && this.value.id)
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
        this.form = {
          choice_type: (value && value.choice_type) || 'simple',
          name: (value && value.name) || '',
          linked_product_id: (value && value.linked_product_id) || null,
          active: value ? value.active !== false : true,
        }
      },
    },
  },
  methods: {
    productImageSrc(image) {
      return `${this.staticurl}/api/v1/imgproducts/${image || 'default.png'}`
    },
    resetTypeFields() {
      if (this.isEditing) return
      this.image = null
      this.form.name = ''
      this.form.linked_product_id = null
    },
    submit() {
      if (!this.$refs.form.validate()) return
      const data = new FormData()
      data.append('choice_type', this.form.choice_type)
      data.append('active', String(this.form.active))
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
