<template>
  <v-container>
    <div v-if="stsMsg">
      <p class="red--text">{{ message }}</p>
    </div>

    <Loading v-if="loadPage" />
    <div v-else>
      <v-form v-model="isValue" @submit.prevent="submitEditCategory">
        <v-text-field
          v-model="formcategory.name"
          label="Nom"
          type="text"
          :rules="[(v) => !!v || 'Le nom de la catégorie est requis']"
          placeholder="Saisir le nom de la catégorie"
          required
          autofocus
        ></v-text-field>
        <div class="category-image-field mb-4">
          <v-avatar size="72" class="mr-4 category-avatar-preview">
            <v-img v-if="currentImagePreview" :src="currentImagePreview"></v-img>
            <v-icon v-else>mdi-shape</v-icon>
          </v-avatar>
          <v-file-input
            v-model="formcategory.image"
            accept="image/png,image/jpeg"
            label="Image de la catégorie"
            prepend-icon="mdi-camera"
            show-size
            @change="previewImage"
          ></v-file-input>
        </div>
        <v-btn color="warning" @click.stop="$router.push('/categories')"
          >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
        >
        <v-btn
          :disabled="!isValue"
          :loading="loadingBtn"
          class="ml-4"
          type="submit"
          color="primary"
          >Valider <v-icon small right>mdi-check-circle</v-icon></v-btn
        >
      </v-form>
    </div>
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
export default {
  components: {
    Loading,
  },
  middleware: 'auth',
  data() {
    return {
      isValue: false,
      loadingBtn: false,
      loadPage: false,
      stsMsg: false,
      formcategory: {
        name: '',
        image: null,
      },
      imagePreview: null,
    }
  },

  computed: {
    detailCategory() {
      return this.$store.get('categories/detailCategory')
    },
    message() {
      return this.$store.get('categories/message')
    },
    staticurl() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    currentImagePreview() {
      if (this.imagePreview) return this.imagePreview
      const category = this.detailCategory && this.detailCategory[0]
      return category && category.image
        ? `${this.staticurl}/api/v1/imgcategories/${category.image}`
        : null
    },
  },
  mounted() {
    this.loadPage = true
    this.$store
      .dispatch('categories/getDetailCategory', this.$route.params.id)
      .finally(() => {
        this.loadPage = false
        this.formcategory.name = this.detailCategory[0].name
      })
  },
  beforeDestroy() {
    if (this.imagePreview) URL.revokeObjectURL(this.imagePreview)
  },
  methods: {
    previewImage(file) {
      if (this.imagePreview) URL.revokeObjectURL(this.imagePreview)
      this.imagePreview = file ? URL.createObjectURL(file) : null
    },
    async submitEditCategory() {
      this.loadingBtn = true
      const res = await this.$store.dispatch('categories/patchCategory', {
        id: this.$route.params.id,
        data: this.formcategory,
      })
      if (res) {
        this.loadingBtn = false
        this.stsMsg = true
        this.$router.push('/categories')
      }
    },
  },
}
</script>
<style scoped>
.category-image-field {
  align-items: center;
  display: flex;
  gap: 16px;
}

.category-avatar-preview {
  background: #eef2f7;
}
</style>
