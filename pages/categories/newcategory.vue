<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>

    <v-form v-model="isValue" @submit.prevent="submitCategory">
      <v-text-field
        v-model="formcategory.name"
        label="Nom de la catégorie"
        type="text"
        :rules="[(v) => !!v || 'Le nom de la catégorie est requis']"
        placeholder="Saisir le nom de la catégorie"
        required
        autofocus
      ></v-text-field>
      <div class="category-image-field mb-4">
        <v-avatar size="72" class="mr-4 category-avatar-preview">
          <v-img v-if="imagePreview" :src="imagePreview"></v-img>
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
      <v-btn
        :disabled="!isValue"
        :loading="loadingBtn"
        class="ml-4 text-none"
        type="submit"
        color="primary"
        >Valider <v-icon small right>mdi-check-circle</v-icon></v-btn
      >
      <v-btn
        color="warning"
        class="text-none"
        @click.stop="$router.push('/categories')"
        >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
      >
    </v-form>
  </v-container>
</template>
<script>
export default {
  components: {},
  middleware: 'auth',
  data() {
    return {
      errMsg: false,
      isValue: false,
      loadingBtn: false,
      message: '',
      formcategory: {
        name: '',
        image: null,
      },
      imagePreview: null,
    }
  },

  beforeDestroy() {
    if (this.imagePreview) URL.revokeObjectURL(this.imagePreview)
  },
  methods: {
    previewImage(file) {
      if (this.imagePreview) URL.revokeObjectURL(this.imagePreview)
      this.imagePreview = file ? URL.createObjectURL(file) : null
    },
    async submitCategory() {
      this.loadingBtn = true
      const res = await this.$store.dispatch(
        'categories/postCategory',
        this.formcategory
      )
      if (res) {
        this.loadingBtn = false
        this.$router.push('/categories')
      } else {
        this.errMsg = true
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
